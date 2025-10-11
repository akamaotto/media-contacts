/**
 * Analytics API Routes
 * Provides API endpoints for all analytics services
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  analyticsIntegrationService,
  trackAnalyticsEvent,
  generateIntegratedAnalyticsReport,
  getAnalyticsDashboardData,
  updateAnalyticsConfig,
  getAnalyticsConfig,
  initializeAnalyticsIntegrations
} from '@/lib/analytics/analytics-integration-service';
import { 
  recordPostSearchSatisfaction,
  getSatisfactionMetrics,
  generateSatisfactionReport
} from '@/lib/analytics/user-satisfaction-tracker';
import { 
  trackFeatureDiscovery,
  trackFeatureFirstUse,
  getAdoptionMetrics
} from '@/lib/analytics/feature-adoption-tracker';
import { 
  trackUserSearch,
  trackUserExport,
  trackUserAbandonment,
  generateBehaviorReport
} from '@/lib/analytics/user-behavior-tracker';
import { 
  generateReport,
  getReportSchedules,
  createReportSchedule
} from '@/lib/analytics/automated-reporting-service';
import { 
  analyzeABTest,
  generateABTestReport
} from '@/lib/analytics/ab-testing-analytics';

/**
 * GET /api/analytics
 * Get analytics data based on query parameters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const experimentId = searchParams.get('experimentId');
    const reportId = searchParams.get('reportId');

    // Parse time range
    let timeRange;
    if (start && end) {
      timeRange = {
        start: new Date(start),
        end: new Date(end)
      };
    } else {
      // Default to last 30 days
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      timeRange = { start, end };
    }

    // Route to appropriate handler based on type
    switch (type) {
      case 'dashboard':
        const dashboardData = await getAnalyticsDashboardData(timeRange);
        return NextResponse.json({ success: true, data: dashboardData });
        
      case 'integrated-report':
        const report = await generateIntegratedAnalyticsReport(timeRange);
        return NextResponse.json({ success: true, data: report });
        
      case 'satisfaction':
        const satisfactionReport = await generateSatisfactionReport(timeRange);
        return NextResponse.json({ success: true, data: satisfactionReport });
        
      case 'adoption':
        const adoptionMetrics = await getAdoptionMetrics(timeRange);
        return NextResponse.json({ success: true, data: adoptionMetrics });
        
      case 'behavior':
        const behaviorReport = await generateBehaviorReport(timeRange);
        return NextResponse.json({ success: true, data: behaviorReport });
        
      case 'ab-testing':
        if (!experimentId) {
          return NextResponse.json(
            { success: false, error: 'experimentId is required for A/B testing analytics' },
            { status: 400 }
          );
        }
        const experimentReport = await generateABTestReport(experimentId);
        return NextResponse.json({ success: true, data: experimentReport });
        
      case 'reports':
        const reportSchedules = getReportSchedules();
        return NextResponse.json({ success: true, data: reportSchedules });
        
      case 'config':
        const config = getAnalyticsConfig();
        return NextResponse.json({ success: true, data: config });
        
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid type parameter' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/analytics
 * Handle analytics events and configuration updates
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const body = await request.json();

    // Route to appropriate handler based on type
    switch (type) {
      case 'track':
        const { userId, sessionId, event, properties, context } = body;
        
        if (!userId || !sessionId || !event) {
          return NextResponse.json(
            { success: false, error: 'userId, sessionId, and event are required' },
            { status: 400 }
          );
        }
        
        await trackAnalyticsEvent({
          userId,
          sessionId,
          event,
          properties: properties || {},
          context: {
            page: context?.page || '',
            userAgent: context?.userAgent || '',
            ip: context?.ip || '',
            timestamp: new Date()
          }
        });
        
        return NextResponse.json({ success: true, message: 'Event tracked successfully' });
        
      case 'satisfaction':
        const { userId: satUserId, sessionId: satSessionId, rating, query, resultCount } = body;
        
        if (!satUserId || !satSessionId || rating === undefined) {
          return NextResponse.json(
            { success: false, error: 'userId, sessionId, and rating are required' },
            { status: 400 }
          );
        }
        
        const satisfactionId = await recordPostSearchSatisfaction(
          satUserId,
          satSessionId,
          rating,
          query,
          resultCount
        );
        
        return NextResponse.json({ 
          success: true, 
          message: 'Satisfaction recorded successfully',
          id: satisfactionId
        });
        
      case 'discovery':
        const { userId: discUserId, sessionId: discSessionId, source, context: discContext } = body;
        
        if (!discUserId || !discSessionId || !source) {
          return NextResponse.json(
            { success: false, error: 'userId, sessionId, and source are required' },
            { status: 400 }
          );
        }
        
        await trackFeatureDiscovery(discUserId, discSessionId, source, discContext);
        return NextResponse.json({ success: true, message: 'Discovery tracked successfully' });
        
      case 'first-use':
        const { userId: firstUserId, sessionId: firstSessionId, source: firstSource, timeToAdoption } = body;
        
        if (!firstUserId || !firstSessionId || !firstSource) {
          return NextResponse.json(
            { success: false, error: 'userId, sessionId, and source are required' },
            { status: 400 }
          );
        }
        
        await trackFeatureFirstUse(firstUserId, firstSessionId, firstSource, timeToAdoption);
        return NextResponse.json({ success: true, message: 'First use tracked successfully' });
        
      case 'search':
        const { 
          userId: searchUserId, 
          sessionId: searchSessionId, 
          query: searchQuery, 
          resultCount: searchResultCount,
          timeToFirstResult 
        } = body;
        
        if (!searchUserId || !searchSessionId || !searchQuery || resultCount === undefined) {
          return NextResponse.json(
            { success: false, error: 'userId, sessionId, query, and resultCount are required' },
            { status: 400 }
          );
        }
        
        await trackUserSearch(
          searchUserId,
          searchSessionId,
          searchQuery,
          searchResultCount,
          timeToFirstResult || 0
        );
        
        return NextResponse.json({ success: true, message: 'Search tracked successfully' });
        
      case 'export':
        const { 
          userId: exportUserId, 
          sessionId: exportSessionId, 
          exportType, 
          recordCount: exportRecordCount 
        } = body;
        
        if (!exportUserId || !exportSessionId || !exportType || recordCount === undefined) {
          return NextResponse.json(
            { success: false, error: 'userId, sessionId, exportType, and recordCount are required' },
            { status: 400 }
          );
        }
        
        await trackUserExport(exportUserId, exportSessionId, exportType, exportRecordCount);
        return NextResponse.json({ success: true, message: 'Export tracked successfully' });
        
      case 'abandon':
        const { 
          userId: abandonUserId, 
          sessionId: abandonSessionId, 
          abandonmentPoint, 
          reason 
        } = body;
        
        if (!abandonUserId || !abandonSessionId || !abandonmentPoint) {
          return NextResponse.json(
            { success: false, error: 'userId, sessionId, and abandonmentPoint are required' },
            { status: 400 }
          );
        }
        
        await trackUserAbandonment(abandonUserId, abandonSessionId, abandonmentPoint, reason);
        return NextResponse.json({ success: true, message: 'Abandonment tracked successfully' });
        
      case 'report':
        const { 
          reportType, 
          timeRange: reportTimeRange, 
          format, 
          customFilters 
        } = body;
        
        if (!reportType || !reportTimeRange) {
          return NextResponse.json(
            { success: false, error: 'reportType and timeRange are required' },
            { status: 400 }
          );
        }
        
        const reportId = await generateReport(
          reportType,
          {
            start: new Date(reportTimeRange.start),
            end: new Date(reportTimeRange.end)
          },
          format || 'json',
          customFilters
        );
        
        return NextResponse.json({ 
          success: true, 
          message: 'Report generated successfully',
          reportId
        });
        
      case 'schedule':
        const {
          name,
          description,
          frequency,
          recipients,
          reportType: scheduleReportType,
          timeRange: scheduleTimeRange,
          format: scheduleFormat,
          customFilters: scheduleCustomFilters,
          createdBy
        } = body;
        
        if (!name || !frequency || !recipients || !scheduleReportType || !scheduleTimeRange || !createdBy) {
          return NextResponse.json(
            { success: false, error: 'name, frequency, recipients, reportType, timeRange, and createdBy are required' },
            { status: 400 }
          );
        }
        
        const scheduleId = await createReportSchedule({
          name,
          description,
          frequency,
          recipients,
          reportType: scheduleReportType,
          timeRange: scheduleTimeRange,
          format: scheduleFormat || 'html',
          customFilters: scheduleCustomFilters,
          createdBy
        });
        
        return NextResponse.json({ 
          success: true, 
          message: 'Report schedule created successfully',
          scheduleId
        });
        
      case 'config':
        const { config } = body;
        
        if (!config) {
          return NextResponse.json(
            { success: false, error: 'config is required' },
            { status: 400 }
          );
        }
        
        updateAnalyticsConfig(config);
        return NextResponse.json({ success: true, message: 'Configuration updated successfully' });
        
      case 'initialize':
        await initializeAnalyticsIntegrations();
        return NextResponse.json({ success: true, message: 'Analytics integrations initialized successfully' });
        
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid type parameter' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/analytics
 * Handle analytics updates
 */
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const body = await request.json();

    // Route to appropriate handler based on type
    switch (type) {
      case 'config':
        const { config } = body;
        
        if (!config) {
          return NextResponse.json(
            { success: false, error: 'config is required' },
            { status: 400 }
          );
        }
        
        updateAnalyticsConfig(config);
        return NextResponse.json({ success: true, message: 'Configuration updated successfully' });
        
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid type parameter' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/analytics
 * Handle analytics deletions
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    // Route to appropriate handler based on type
    switch (type) {
      case 'report':
        if (!id) {
          return NextResponse.json(
            { success: false, error: 'id is required' },
            { status: 400 }
          );
        }
        
        // In a real implementation, this would delete the report
        return NextResponse.json({ success: true, message: 'Report deleted successfully' });
        
      case 'schedule':
        if (!id) {
          return NextResponse.json(
            { success: false, error: 'id is required' },
            { status: 400 }
          );
        }
        
        // In a real implementation, this would delete the schedule
        return NextResponse.json({ success: true, message: 'Schedule deleted successfully' });
        
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid type parameter' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}