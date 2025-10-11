/**
 * API Routes for Individual A/B Testing Experiment Management
 * Provides RESTful endpoints for managing individual experiments
 */

import { NextRequest, NextResponse } from 'next/server';
import { abTestingService, type Experiment } from '@/lib/feature-flags/ab-testing-service';
import { experimentConfigService } from '@/lib/ab-testing/experiment-config-service';
import { abTestingAnalytics } from '@/lib/analytics/ab-testing-analytics';
import { experimentLifecycleService } from '@/lib/ab-testing/experiment-lifecycle-service';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/ab-testing/experiments/[id] - Get a specific experiment
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const experiment = abTestingService.getExperiment(id);

    if (!experiment) {
      return NextResponse.json({ error: 'Experiment not found' }, { status: 404 });
    }

    // Get additional data if requested
    const { searchParams } = new URL(request.url);
    const includeAnalytics = searchParams.get('includeAnalytics') === 'true';
    const includeConfig = searchParams.get('includeConfig') === 'true';
    const includeLifecycle = searchParams.get('includeLifecycle') === 'true';

    const response: any = { experiment };

    if (includeAnalytics) {
      try {
        response.analytics = await abTestingAnalytics.analyzeExperiment(id);
      } catch (error) {
        console.error(`Failed to load analytics for experiment ${id}:`, error);
        response.analytics = null;
      }
    }

    if (includeConfig) {
      try {
        response.config = experimentConfigService.getExperiment(id);
      } catch (error) {
        console.error(`Failed to load config for experiment ${id}:`, error);
        response.config = null;
      }
    }

    if (includeLifecycle) {
      try {
        response.lifecycle = experimentLifecycleService.getLifecycleState(id);
      } catch (error) {
        console.error(`Failed to load lifecycle state for experiment ${id}:`, error);
        response.lifecycle = null;
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to get experiment:', error);
    return NextResponse.json(
      { error: 'Failed to get experiment' },
      { status: 500 }
    );
  }
}

// PUT /api/ab-testing/experiments/[id] - Update an experiment
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { name, description, status, trafficAllocation, variants } = body;

    // Check if experiment exists
    const existingExperiment = abTestingService.getExperiment(id);
    if (!existingExperiment) {
      return NextResponse.json({ error: 'Experiment not found' }, { status: 404 });
    }

    // Update experiment configuration
    if (name || description || variants) {
      await experimentConfigService.updateExperiment(id, {
        name: name || existingExperiment.name,
        description: description || existingExperiment.description,
        variants: variants ? variants.map((variant: any, index: number) => ({
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
        })) : undefined
      }, session.user?.email || 'unknown');
    }

    // Update A/B test experiment
    const updatedExperiment = await abTestingService.updateExperiment(
      id,
      {
        name: name || existingExperiment.name,
        description: description || existingExperiment.description,
        trafficAllocation: trafficAllocation !== undefined ? trafficAllocation : existingExperiment.trafficAllocation,
        variants: variants ? variants.map((variant: any) => ({
          name: variant.name,
          description: variant.description || `${variant.name} variant`,
          isControl: variant.isControl || false,
          trafficWeight: variant.trafficWeight,
          config: variant.config || {}
        })) : undefined
      },
      session.user?.email || 'unknown',
      body.reason
    );

    return NextResponse.json({ experiment: updatedExperiment });
  } catch (error) {
    console.error('Failed to update experiment:', error);
    return NextResponse.json(
      { error: 'Failed to update experiment' },
      { status: 500 }
    );
  }
}

// DELETE /api/ab-testing/experiments/[id] - Delete an experiment
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Check if experiment exists
    const existingExperiment = abTestingService.getExperiment(id);
    if (!existingExperiment) {
      return NextResponse.json({ error: 'Experiment not found' }, { status: 404 });
    }

    // Check if experiment is running
    if (existingExperiment.status === 'running') {
      return NextResponse.json(
        { error: 'Cannot delete a running experiment. Stop it first.' },
        { status: 400 }
      );
    }

    // Delete experiment
    await abTestingService.deleteExperiment(id, session.user?.email || 'unknown');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete experiment:', error);
    return NextResponse.json(
      { error: 'Failed to delete experiment' },
      { status: 500 }
    );
  }
}