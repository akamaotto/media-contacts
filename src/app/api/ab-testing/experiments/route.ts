/**
 * API Routes for A/B Testing Experiment Management
 * Provides RESTful endpoints for managing A/B test experiments
 */

import { NextRequest, NextResponse } from 'next/server';
import { abTestingService, type Experiment, type ExperimentConfig } from '@/lib/feature-flags/ab-testing-service';
import { experimentConfigService, type ExperimentConfig as FullExperimentConfig } from '@/lib/ab-testing/experiment-config-service';
import { abTestingAnalytics } from '@/lib/analytics/ab-testing-analytics';
import { experimentLifecycleService } from '@/lib/ab-testing/experiment-lifecycle-service';
import { userSegmentationService } from '@/lib/ab-testing/user-segmentation-service';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/ab-testing/experiments - Get all experiments
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const includeAnalytics = searchParams.get('includeAnalytics') === 'true';
    const includeConfig = searchParams.get('includeConfig') === 'true';

    let experiments = abTestingService.getAllExperiments();

    // Filter by status if provided
    if (status) {
      experiments = experiments.filter(exp => exp.status === status);
    }

    // Enrich with additional data if requested
    if (includeAnalytics || includeConfig) {
      const enrichedExperiments = await Promise.all(
        experiments.map(async (experiment) => {
          const enrichedExperiment: any = { ...experiment };

          if (includeAnalytics) {
            try {
              enrichedExperiment.analytics = await abTestingAnalytics.analyzeExperiment(experiment.id);
            } catch (error) {
              console.error(`Failed to load analytics for experiment ${experiment.id}:`, error);
              enrichedExperiment.analytics = null;
            }
          }

          if (includeConfig) {
            try {
              enrichedExperiment.config = experimentConfigService.getExperiment(experiment.id);
            } catch (error) {
              console.error(`Failed to load config for experiment ${experiment.id}:`, error);
              enrichedExperiment.config = null;
            }
          }

          return enrichedExperiment;
        })
      );

      return NextResponse.json({ experiments: enrichedExperiments });
    }

    return NextResponse.json({ experiments });
  } catch (error) {
    console.error('Failed to get experiments:', error);
    return NextResponse.json(
      { error: 'Failed to get experiments' },
      { status: 500 }
    );
  }
}

// POST /api/ab-testing/experiments - Create a new experiment
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, flagId, flagKey, trafficAllocation, variants, targetMetrics } = body;

    // Validate required fields
    if (!name || !flagId || !variants || variants.length < 2) {
      return NextResponse.json(
        { error: 'Missing required fields: name, flagId, variants (min 2)' },
        { status: 400 }
      );
    }

    // Create experiment configuration first
    const config = await experimentConfigService.createExperiment({
      name,
      description: description || '',
      hypothesis: body.hypothesis || '',
      successMetrics: [
        {
          id: 'primary_metric',
          name: targetMetrics?.[0] || 'Conversion Rate',
          type: 'conversion',
          description: 'Primary conversion metric',
          isPrimary: true,
          calculationMethod: 'rate',
          eventTriggers: ['conversion', 'page_view']
        }
      ],
      targetingRules: body.targetingRules || [
        {
          id: 'all_users',
          name: 'All Users',
          type: 'include',
          conditions: []
        }
      ],
      variants: variants.map((variant: any, index: number) => ({
        id: `variant_${index}`,
        name: variant.name,
        description: variant.description || `${variant.name} variant`,
        isControl: variant.isControl || false,
        trafficWeight: variant.trafficWeight,
        config: variant.config || {},
        overrides: {},
        triggers: [],
        customizations: [],
        implementationStatus: 'ready'
      })),
      trafficAllocation: trafficAllocation || 100,
      duration: body.duration || { type: 'fixed', minimumDuration: 14 },
      status: 'draft',
      priority: body.priority || 'medium',
      tags: body.tags || [],
      owner: session.user?.email || 'unknown',
      createdBy: session.user?.email || 'unknown',
      updatedBy: session.user?.email || 'unknown',
      metadata: body.metadata || {}
    }, session.user?.email || 'unknown');

    // Create A/B test experiment
    const experiment = await abTestingService.createExperiment({
      name,
      description: description || '',
      flagId,
      flagKey: flagKey || flagId,
      trafficAllocation: trafficAllocation || 100,
      variants: variants.map((variant: any) => ({
        name: variant.name,
        description: variant.description || `${variant.name} variant`,
        isControl: variant.isControl || false,
        trafficWeight: variant.trafficWeight,
        config: variant.config || {}
      })),
      targetMetrics: targetMetrics || ['conversion_rate']
    }, session.user?.email || 'unknown');

    // Create lifecycle configuration if provided
    if (body.lifecycleConfig) {
      await experimentLifecycleService.createLifecycleConfig(experiment.id, {
        ...body.lifecycleConfig,
        experimentId: experiment.id
      });
    }

    return NextResponse.json({ experiment }, { status: 201 });
  } catch (error) {
    console.error('Failed to create experiment:', error);
    return NextResponse.json(
      { error: 'Failed to create experiment' },
      { status: 500 }
    );
  }
}