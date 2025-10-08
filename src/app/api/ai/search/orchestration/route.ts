/**
 * AI Search Orchestration API Endpoint
 * Provides REST API for the search orchestration service
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAIMiddleware } from '../../shared/middleware';
import { AILogger } from '../../shared/logger';
import { AIResponse } from '../../shared/types';
import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { SearchOrchestrationService } from '@/lib/ai/search-orchestration';
import { SearchConfiguration, SearchRequest, SearchStage } from '@/lib/ai/search-orchestration/types';

// Initialize services
const prisma = new PrismaClient();
let orchestrationService: SearchOrchestrationService;

// Initialize the orchestration service
async function initializeService() {
  if (!orchestrationService) {
    orchestrationService = new SearchOrchestrationService(prisma);
    await orchestrationService.initialize();
  }
  return orchestrationService;
}

// POST endpoint - Submit new search
async function submitSearchHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Get validated data from middleware
    const validatedData = (request as any).__validatedData;
    const searchRequest: any = validatedData.body;

    // Initialize service
    const service = await initializeService();

    // Validate search configuration
    const configuration: SearchConfiguration = {
      query: searchRequest.query,
      criteria: {
        countries: searchRequest.countries || [],
        categories: searchRequest.categories || [],
        beats: searchRequest.beats || [],
        languages: searchRequest.languages || [],
        domains: searchRequest.domains || [],
        excludeDomains: searchRequest.excludeDomains || [],
        dateRange: searchRequest.dateRange,
        safeSearch: searchRequest.safeSearch
      },
      options: {
        maxResults: searchRequest.maxResults || 50,
        maxContactsPerSource: searchRequest.maxContactsPerSource || 10,
        confidenceThreshold: searchRequest.confidenceThreshold || 0.5,
        enableAIEnhancement: searchRequest.enableAIEnhancement ?? true,
        enableContactExtraction: searchRequest.enableContactExtraction ?? true,
        enableContentScraping: searchRequest.enableContentScraping ?? true,
        enableCaching: searchRequest.enableCaching ?? true,
        strictValidation: searchRequest.strictValidation ?? false,
        processingTimeout: searchRequest.processingTimeout || 300000,
        priority: searchRequest.priority || 'normal'
      }
    };

    // Create search request
    const searchRequestObj: SearchRequest = {
      userId: context.userId,
      configuration,
      priority: searchRequest.priority,
      timeout: searchRequest.timeout
    };

    // Submit search
    const response = await service.submitSearch(searchRequestObj);

    // Log search submission
    await AILogger.logBusiness({
      event: 'ai_search_orchestration_submitted',
      correlationId: context.correlationId,
      userId: context.userId,
      entityType: 'ai_search_orchestration',
      entityId: response.searchId,
      changes: {
        query: configuration.query,
        criteria: configuration.criteria,
        options: configuration.options
      }
    });

    // Create API response
    const apiResponse: AIResponse = {
      success: true,
      data: {
        searchId: response.searchId,
        status: response.status,
        progress: response.progress,
        createdAt: response.createdAt,
        estimatedDuration: {
          min: 30000, // 30 seconds
          max: 300000, // 5 minutes
          average: 120000 // 2 minutes
        }
      },
      correlationId: context.correlationId,
      timestamp: new Date().toISOString(),
      rateLimit: (request as any).__rateLimitInfo
    };

    // Set up progress tracking if requested
    if (searchRequest.trackProgress) {
      // Set up SSE or WebSocket for real-time progress updates
      // This would be implemented based on the chosen real-time communication method
    }

    return NextResponse.json(apiResponse, { status: 202 });

  } catch (error) {
    await AILogger.logError({
      error: error as Error,
      correlationId: context.correlationId,
      userId: context.userId,
      context: { operation: 'ai_search_orchestration_submit' }
    });

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      correlationId: context.correlationId,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// GET endpoint - Get search status and progress
async function getSearchStatusHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const searchId = searchParams.get('searchId');

    if (!searchId) {
      return NextResponse.json({
        success: false,
        error: 'searchId is required',
        correlationId: context.correlationId,
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    const service = await initializeService();
    const status = await service.getSearchStatus(searchId, context.userId);

    if (!status) {
      return NextResponse.json({
        success: false,
        error: 'Search not found',
        correlationId: context.correlationId,
        timestamp: new Date().toISOString()
      }, { status: 404 });
    }

    const apiResponse: AIResponse = {
      success: true,
      data: {
        searchId: status.searchId,
        status: status.status,
        progress: status.progress,
        results: status.results,
        contacts: status.contacts,
        metrics: status.metrics,
        createdAt: status.createdAt,
        updatedAt: status.updatedAt
      },
      correlationId: context.correlationId,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(apiResponse);

  } catch (error) {
    await AILogger.logError({
      error: error as Error,
      correlationId: context.correlationId,
      userId: context.userId,
      context: { operation: 'ai_search_orchestration_status' }
    });

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      correlationId: context.correlationId,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// DELETE endpoint - Cancel search
async function cancelSearchHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const searchId = searchParams.get('searchId');
    const reason = searchParams.get('reason') || 'User cancellation';

    if (!searchId) {
      return NextResponse.json({
        success: false,
        error: 'searchId is required',
        correlationId: context.correlationId,
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    const service = await initializeService();
    const response = await service.cancelSearch(searchId, context.userId, reason);

    await AILogger.logBusiness({
      event: 'ai_search_orchestration_cancelled',
      correlationId: context.correlationId,
      userId: context.userId,
      entityType: 'ai_search_orchestration',
      entityId: searchId,
      changes: { reason, success: response.success }
    });

    const apiResponse: AIResponse = {
      success: response.success,
      data: {
        searchId: response.searchId,
        cancelled: response.success,
        message: response.message,
        cancelledAt: response.cancelledAt
      },
      correlationId: context.correlationId,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(apiResponse);

  } catch (error) {
    await AILogger.logError({
      error: error as Error,
      correlationId: context.correlationId,
      userId: context.userId,
      context: { operation: 'ai_search_orchestration_cancel' }
    });

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      correlationId: context.correlationId,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// GET endpoint - Search statistics
async function getStatisticsHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange');
    const includeDetails = searchParams.get('includeDetails') === 'true';

    const service = await initializeService();
    const statistics = await service.getSearchStatistics(context.userId);

    // Filter by time range if specified
    let filteredStats = statistics;
    if (timeRange) {
      // Apply time range filtering logic
      // This would be implemented based on requirements
    }

    const apiResponse: AIResponse = {
      success: true,
      data: {
        ...filteredStats,
        ...(includeDetails && {
          // Include additional detailed statistics
          recentSearches: [], // Would fetch recent searches
          performanceMetrics: {}, // Would include detailed performance metrics
          errorAnalysis: {} // Would include error analysis
        })
      },
      correlationId: context.correlationId,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(apiResponse);

  } catch (error) {
    await AILogger.logError({
      error: error as Error,
      correlationId: context.correlationId,
      userId: context.userId,
      context: { operation: 'ai_search_orchestration_statistics' }
    });

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      correlationId: context.correlationId,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// GET endpoint - Health check
async function healthCheckHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  try {
    const service = await initializeService();
    const health = await service.getHealthStatus();

    const apiResponse: AIResponse = {
      success: true,
      data: {
        orchestration: {
          status: health.status,
          timestamp: health.timestamp,
          activeSearches: health.activeSearches,
          queueSize: health.queueSize,
          errorRate: health.errorRate,
          averageResponseTime: health.averageResponseTime
        },
        services: health.services,
        metrics: health.metrics
      },
      correlationId: context.correlationId,
      timestamp: new Date().toISOString()
    };

    const statusCode = health.status === 'healthy' ? 200 :
                       health.status === 'degraded' ? 200 : 503;

    return NextResponse.json(apiResponse, { status: statusCode });

  } catch (error) {
    await AILogger.logError({
      error: error as Error,
      correlationId: context.correlationId,
      userId: context.userId,
      context: { operation: 'ai_search_orchestration_health' }
    });

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      correlationId: context.correlationId,
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}

// GET endpoint - Active searches
async function getActiveSearchesHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const stage = searchParams.get('stage') as SearchStage;

    const service = await initializeService();

    // This would need to be implemented in the orchestration service
    // For now, return a placeholder response
    const activeSearches = {
      searches: [],
      total: 0,
      limit,
      stage
    };

    const apiResponse: AIResponse = {
      success: true,
      data: activeSearches,
      correlationId: context.correlationId,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(apiResponse);

  } catch (error) {
    await AILogger.logError({
      error: error as Error,
      correlationId: context.correlationId,
      userId: context.userId,
      context: { operation: 'ai_search_orchestration_active' }
    });

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      correlationId: context.correlationId,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Main request handler
async function searchOrchestrationHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'submit';

  switch (request.method) {
    case 'POST':
      if (action === 'submit') {
        return submitSearchHandler(request, context);
      }
      break;

    case 'GET':
      switch (action) {
        case 'status':
          return getSearchStatusHandler(request, context);
        case 'statistics':
          return getStatisticsHandler(request, context);
        case 'health':
          return healthCheckHandler(request, context);
        case 'active':
          return getActiveSearchesHandler(request, context);
        default:
          if (searchParams.get('searchId')) {
            return getSearchStatusHandler(request, context);
          } else if (searchParams.get('action') === 'statistics') {
            return getStatisticsHandler(request, context);
          } else if (searchParams.get('action') === 'health') {
            return healthCheckHandler(request, context);
          }
      }
      break;

    case 'DELETE':
      if (action === 'cancel') {
        return cancelSearchHandler(request, context);
      }
      break;

    default:
      return NextResponse.json({
        success: false,
        error: `Method ${request.method} not allowed`,
        correlationId: context.correlationId,
        timestamp: new Date().toISOString()
      }, { status: 405 });
  }

  return NextResponse.json({
    success: false,
    error: 'Invalid request. Supported actions: submit, status, cancel, statistics, health, active',
    correlationId: context.correlationId,
    timestamp: new Date().toISOString()
  }, { status: 400 });
}

// Export the middleware-wrapped handlers
export const POST = withAIMiddleware(searchOrchestrationHandler);
export const GET = withAIMiddleware(searchOrchestrationHandler);
export const DELETE = withAIMiddleware(searchOrchestrationHandler);