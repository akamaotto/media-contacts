/**
 * API Routes for A/B Testing Experiment Control
 * Provides endpoints for starting, stopping, pausing, and managing experiments
 */

import { NextRequest, NextResponse } from 'next/server';
import { abTestingService } from '@/lib/feature-flags/ab-testing-service';
import { experimentLifecycleService } from '@/lib/ab-testing/experiment-lifecycle-service';
import { abTestingAnalytics } from '@/lib/analytics/ab-testing-analytics';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface RouteParams {
  params: {
    id: string;
  };
}

// POST /api/ab-testing/experiments/[id]/control/start - Start an experiment
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { useLifecycle = false } = body;

    // Check if experiment exists
    const experiment = abTestingService.getExperiment(id);
    if (!experiment) {
      return NextResponse.json({ error: 'Experiment not found' }, { status: 404 });
    }

    // Check if experiment can be started
    if (experiment.status !== 'draft') {
      return NextResponse.json(
        { error: `Cannot start experiment with status: ${experiment.status}` },
        { status: 400 }
      );
    }

    // Start experiment
    if (useLifecycle) {
      await experimentLifecycleService.startExperiment(id, 'user');
    } else {
      await abTestingService.startExperiment(id, session.user?.email || 'unknown');
    }

    return NextResponse.json({ success: true, status: 'started' });
  } catch (error) {
    console.error('Failed to start experiment:', error);
    return NextResponse.json(
      { error: 'Failed to start experiment' },
      { status: 500 }
    );
  }
}

// PUT /api/ab-testing/experiments/[id]/control/pause - Pause an experiment
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { reason = 'Manual pause', useLifecycle = false } = body;

    // Check if experiment exists
    const experiment = abTestingService.getExperiment(id);
    if (!experiment) {
      return NextResponse.json({ error: 'Experiment not found' }, { status: 404 });
    }

    // Check if experiment can be paused
    if (experiment.status !== 'running') {
      return NextResponse.json(
        { error: `Cannot pause experiment with status: ${experiment.status}` },
        { status: 400 }
      );
    }

    // Pause experiment
    if (useLifecycle) {
      await experimentLifecycleService.pauseExperiment(id, reason, 'user');
    } else {
      await abTestingService.pauseExperiment(id, session.user?.email || 'unknown');
    }

    return NextResponse.json({ success: true, status: 'paused' });
  } catch (error) {
    console.error('Failed to pause experiment:', error);
    return NextResponse.json(
      { error: 'Failed to pause experiment' },
      { status: 500 }
    );
  }
}

// PUT /api/ab-testing/experiments/[id]/control/resume - Resume a paused experiment
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { useLifecycle = false } = body;

    // Check if experiment exists
    const experiment = abTestingService.getExperiment(id);
    if (!experiment) {
      return NextResponse.json({ error: 'Experiment not found' }, { status: 404 });
    }

    // Check if experiment can be resumed
    if (experiment.status !== 'paused') {
      return NextResponse.json(
        { error: `Cannot resume experiment with status: ${experiment.status}` },
        { status: 400 }
      );
    }

    // Resume experiment
    if (useLifecycle) {
      await experimentLifecycleService.startExperiment(id, 'user');
    } else {
      await abTestingService.resumeExperiment(id, session.user?.email || 'unknown');
    }

    return NextResponse.json({ success: true, status: 'resumed' });
  } catch (error) {
    console.error('Failed to resume experiment:', error);
    return NextResponse.json(
      { error: 'Failed to resume experiment' },
      { status: 500 }
    );
  }
}

// POST /api/ab-testing/experiments/[id]/control/stop - Stop an experiment
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { reason = 'Manual stop', useLifecycle = false } = body;

    // Check if experiment exists
    const experiment = abTestingService.getExperiment(id);
    if (!experiment) {
      return NextResponse.json({ error: 'Experiment not found' }, { status: 404 });
    }

    // Check if experiment can be stopped
    if (experiment.status !== 'running') {
      return NextResponse.json(
        { error: `Cannot stop experiment with status: ${experiment.status}` },
        { status: 400 }
      );
    }

    // Stop experiment
    if (useLifecycle) {
      await experimentLifecycleService.stopExperiment(id, reason, 'user');
    } else {
      await abTestingService.completeExperiment(id, session.user?.email || 'unknown');
    }

    return NextResponse.json({ success: true, status: 'completed' });
  } catch (error) {
    console.error('Failed to stop experiment:', error);
    return NextResponse.json(
      { error: 'Failed to stop experiment' },
      { status: 500 }
    );
  }
}

// POST /api/ab-testing/experiments/[id]/control/rollback - Rollback an experiment
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { reason = 'Manual rollback', useLifecycle = false } = body;

    // Check if experiment exists
    const experiment = abTestingService.getExperiment(id);
    if (!experiment) {
      return NextResponse.json({ error: 'Experiment not found' }, { status: 404 });
    }

    // Rollback experiment
    if (useLifecycle) {
      await experimentLifecycleService.rollbackExperiment(id, reason, 'user');
    } else {
      // Manual rollback would be implemented here
      // For now, just complete the experiment
      await abTestingService.completeExperiment(id, session.user?.email || 'unknown');
    }

    return NextResponse.json({ success: true, status: 'rolled_back' });
  } catch (error) {
    console.error('Failed to rollback experiment:', error);
    return NextResponse.json(
      { error: 'Failed to rollback experiment' },
      { status: 500 }
    );
  }
}

// POST /api/ab-testing/experiments/[id]/control/record-conversion - Record a conversion
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { userId, sessionId, value } = body;

    // Check if experiment exists
    const experiment = abTestingService.getExperiment(id);
    if (!experiment) {
      return NextResponse.json({ error: 'Experiment not found' }, { status: 404 });
    }

    // Record conversion
    await abTestingService.recordConversion(id, userId, sessionId, value);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to record conversion:', error);
    return NextResponse.json(
      { error: 'Failed to record conversion' },
      { status: 500 }
    );
  }
}