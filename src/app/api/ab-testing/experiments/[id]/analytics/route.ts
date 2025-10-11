/**
 * API Routes for A/B Testing Experiment Analytics
 * Provides endpoints for experiment analytics and reporting
 */

import { NextRequest, NextResponse } from 'next/server';
import { abTestingService } from '@/lib/feature-flags/ab-testing-service';
import { abTestingAnalytics } from '@/lib/analytics/ab-testing-analytics';
import { statisticalAnalyzer } from '@/lib/ab-testing/statistical-analysis';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/ab-testing/experiments/[id]/analytics - Get experiment analytics
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const { searchParams } = new URL(request.url);
    const includeReport = searchParams.get('includeReport') === 'true';
    const includeTrends = searchParams.get('includeTrends') === 'true';
    const includeSegments = searchParams.get('includeSegments') === 'true';

    // Check if experiment exists
    const experiment = abTestingService.getExperiment(id);
    if (!experiment) {
      return NextResponse.json({ error: 'Experiment not found' }, { status: 404 });
    }

    // Get basic analytics
    const analytics = await abTestingAnalytics.analyzeExperiment(id);
    
    const response: any = { analytics };

    // Include full report if requested
    if (includeReport) {
      try {
        response.report = await abTestingAnalytics.generateExperimentReport(id);
      } catch (error) {
        console.error(`Failed to generate report for experiment ${id}:`, error);
        response.report = null;
      }
    }

    // Include trends if requested
    if (includeTrends) {
      try {
        response.trends = await analytics.dailyStats;
      } catch (error) {
        console.error(`Failed to get trends for experiment ${id}:`, error);
        response.trends = null;
      }
    }

    // Include segment analysis if requested
    if (includeSegments) {
      try {
        response.segments = analytics.variants.map(variant => ({
          variantId: variant.variantId,
          variantName: variant.variantName,
          segmentMetrics: variant.segmentMetrics
        }));
      } catch (error) {
        console.error(`Failed to get segment analysis for experiment ${id}:`, error);
        response.segments = null;
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to get experiment analytics:', error);
    return NextResponse.json(
      { error: 'Failed to get experiment analytics' },
      { status: 500 }
    );
  }
}

// POST /api/ab-testing/experiments/[id]/analytics/refresh - Refresh experiment analytics
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Check if experiment exists
    const experiment = abTestingService.getExperiment(id);
    if (!experiment) {
      return NextResponse.json({ error: 'Experiment not found' }, { status: 404 });
    }

    // Force recalculation of experiment results
    const metrics = await abTestingService.calculateExperimentResults(id);
    
    // Get updated analytics
    const analytics = await abTestingAnalytics.analyzeExperiment(id);

    return NextResponse.json({ 
      success: true, 
      metrics,
      analytics 
    });
  } catch (error) {
    console.error('Failed to refresh experiment analytics:', error);
    return NextResponse.json(
      { error: 'Failed to refresh experiment analytics' },
      { status: 500 }
    );
  }
}

// GET /api/ab-testing/experiments/[id]/analytics/statistical-test - Perform statistical test
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const { searchParams } = new URL(request.url);
    const confidenceLevel = parseFloat(searchParams.get('confidenceLevel') || '0.95');

    // Check if experiment exists
    const experiment = abTestingService.getExperiment(id);
    if (!experiment) {
      return NextResponse.json({ error: 'Experiment not found' }, { status: 404 });
    }

    // Get experiment metrics
    const metrics = await abTestingService.calculateExperimentResults(id);
    
    // Find control and test variants
    const controlVariant = experiment.variants.find(v => v.isControl);
    const testVariants = experiment.variants.filter(v => !v.isControl);

    if (!controlVariant) {
      return NextResponse.json(
        { error: 'No control variant found' },
        { status: 400 }
      );
    }

    const results: any = {
      control: {
        variantId: controlVariant.id,
        variantName: controlVariant.name,
        participants: metrics.variantMetrics[controlVariant.id]?.participants || 0,
        conversions: metrics.variantMetrics[controlVariant.id]?.conversions || 0,
        conversionRate: metrics.variantMetrics[controlVariant.id]?.conversionRate || 0
      },
      tests: [],
      multipleComparison: null
    };

    // Perform statistical tests for each variant
    for (const variant of testVariants) {
      const variantMetrics = metrics.variantMetrics[variant.id];
      if (!variantMetrics) continue;

      const controlData = {
        participants: metrics.variantMetrics[controlVariant.id]?.participants || 0,
        conversions: metrics.variantMetrics[controlVariant.id]?.conversions || 0,
        conversionRate: metrics.variantMetrics[controlVariant.id]?.conversionRate || 0
      };

      const variantData = {
        participants: variantMetrics.participants,
        conversions: variantMetrics.conversions,
        conversionRate: variantMetrics.conversionRate
      };

      const testResult = statisticalAnalyzer.twoProportionZTest(controlData, variantData, confidenceLevel);
      
      results.tests.push({
        variantId: variant.id,
        variantName: variant.name,
        participants: variantMetrics.participants,
        conversions: variantMetrics.conversions,
        conversionRate: variantMetrics.conversionRate,
        statisticalTest: testResult
      });
    }

    // Perform multiple comparison correction if more than one variant
    if (testVariants.length > 1) {
      const variantsData: Record<string, any> = {};
      
      variantsData[controlVariant.id] = {
        participants: metrics.variantMetrics[controlVariant.id]?.participants || 0,
        conversions: metrics.variantMetrics[controlVariant.id]?.conversions || 0,
        conversionRate: metrics.variantMetrics[controlVariant.id]?.conversionRate || 0
      };

      for (const variant of testVariants) {
        const variantMetrics = metrics.variantMetrics[variant.id];
        if (variantMetrics) {
          variantsData[variant.id] = {
            participants: variantMetrics.participants,
            conversions: variantMetrics.conversions,
            conversionRate: variantMetrics.conversionRate
          };
        }
      }

      const multipleComparisonResult = statisticalAnalyzer.multipleComparisons(
        variantsData,
        controlVariant.id,
        'bonferroni'
      );
      
      results.multipleComparison = multipleComparisonResult;
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Failed to perform statistical test:', error);
    return NextResponse.json(
      { error: 'Failed to perform statistical test' },
      { status: 500 }
    );
  }
}

// GET /api/ab-testing/experiments/[id]/analytics/report - Generate experiment report
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { format = 'json' } = body;

    // Check if experiment exists
    const experiment = abTestingService.getExperiment(id);
    if (!experiment) {
      return NextResponse.json({ error: 'Experiment not found' }, { status: 404 });
    }

    // Generate report
    const report = await abTestingAnalytics.generateExperimentReport(id);

    if (format === 'json') {
      return NextResponse.json({ report });
    } else if (format === 'csv') {
      // Convert to CSV format (simplified)
      const csvData = convertReportToCSV(report);
      return new NextResponse(csvData, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="experiment_${id}_report.csv"`
        }
      });
    } else {
      return NextResponse.json(
        { error: `Unsupported format: ${format}` },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Failed to generate experiment report:', error);
    return NextResponse.json(
      { error: 'Failed to generate experiment report' },
      { status: 500 }
    );
  }
}

// Helper function to convert report to CSV
function convertReportToCSV(report: any): string {
  const headers = [
    'Metric',
    'Control',
    ...report.experiment.variants
      .filter((v: any) => !v.isControl)
      .map((v: any) => v.variantName),
    'Lift',
    'P-Value',
    'Significant'
  ];

  const rows = [
    headers.join(','),
    `Conversion Rate,${report.experiment.variants.find((v: any) => v.isControl)?.conversionRate || 0},` +
    report.experiment.variants
      .filter((v: any) => !v.isControl)
      .map((v: any) => v.conversionRate || 0)
      .join(',') +
    ',,',
    `Participants,${report.experiment.variants.find((v: any) => v.isControl)?.participants || 0},` +
    report.experiment.variants
      .filter((v: any) => !v.isControl)
      .map((v: any) => v.participants || 0)
      .join(',') +
    ',,',
    `Conversions,${report.experiment.variants.find((v: any) => v.isControl)?.conversions || 0},` +
    report.experiment.variants
      .filter((v: any) => !v.isControl)
      .map((v: any) => v.conversions || 0)
      .join(',') +
    ',,',
    `Winner,${report.detailedAnalysis.statisticalAnalysis.winner?.variantName || 'None'},,,,,`
  ];

  return rows.join('\n');
}