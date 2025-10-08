/**
 * AI Search API Endpoint
 * Main search endpoint for AI-powered contact discovery
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAIMiddleware } from '../shared/middleware';
import { AILogger } from '../shared/logger';
import { AIResponse, AISearchRequest, AISearchResponse } from '../shared/types';
import { randomUUID } from 'crypto';
import aiServiceManager, { AISearchQuery } from '@/lib/ai/services';
import { aiPerformanceMonitor } from '@/lib/ai/services/monitoring';
import { aiSecurityManager } from '@/lib/ai/services/security';

async function searchHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Get validated data from middleware
    const validatedData = (request as any).__validatedData;
    const searchData: AISearchRequest = validatedData.body;

    // Generate search ID
    const searchId = randomUUID();

    // Log the search request
    await AILogger.logBusiness({
      event: 'ai_search_initiated',
      correlationId: context.correlationId,
      userId: context.userId,
      entityType: 'ai_search',
      entityId: searchId,
      changes: {
        query: searchData.query,
        filters: searchData.filters,
        maxResults: searchData.maxResults,
        priority: searchData.priority
      }
    });

    // Convert API request to AI service request
    const aiSearchQuery: AISearchQuery = {
      query: searchData.query,
      filters: {
        beats: searchData.filters?.beats,
        regions: searchData.filters?.regions,
        countries: searchData.filters?.countries,
        languages: searchData.filters?.languages,
        categories: searchData.filters?.categories,
        outletTypes: searchData.filters?.outletTypes,
        domains: searchData.filters?.domains,
        excludeDomains: searchData.filters?.excludeDomains,
        dateRange: searchData.filters?.dateRange,
        safeSearch: searchData.filters?.safeSearch
      },
      options: {
        maxResults: searchData.maxResults || 10,
        priority: searchData.priority || 'normal',
        includeSummaries: true,
        extractContacts: true,
        scrapeContent: searchData.maxResults <= 5 // Only scrape content for small result sets
      }
    };

    // Perform AI-powered search
    const searchResults = await aiServiceManager.searchWeb(aiSearchQuery);

    // Create search response
    const searchResponse: AISearchResponse = {
      searchId,
      status: 'completed',
      progress: 100,
      results: searchResults.map(result => ({
        id: randomUUID(),
        url: result.url,
        title: result.title,
        summary: result.summary,
        content: result.content,
        contacts: result.contacts || [],
        confidence: result.confidence,
        relevanceScore: result.relevanceScore,
        metadata: result.metadata
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Record performance metrics
    aiPerformanceMonitor.recordMetrics({
      service: 'ai_manager',
      operation: 'searchWeb',
      success: true,
      duration: Date.now() - startTime,
      tokensUsed: 0, // Will be updated by individual services
      cost: 0, // Will be calculated by individual services
      cached: false,
      retryCount: 0,
      userId: context.userId,
      correlationId: context.correlationId,
      metadata: {
        searchId,
        queryLength: searchData.query.length,
        filterCount: Object.keys(searchData.filters || {}).length,
        resultsCount: searchResults.length
      }
    });

    // Log performance
    await AILogger.logPerformance({
      operation: 'ai_search_initiation',
      duration: Date.now() - startTime,
      correlationId: context.correlationId,
      userId: context.userId,
      metadata: {
        searchId,
        queryLength: searchData.query.length,
        filterCount: Object.keys(searchData.filters || {}).length,
        resultsCount: searchResults.length
      }
    });

    const apiResponse: AIResponse = {
      success: true,
      data: searchResponse,
      correlationId: context.correlationId,
      timestamp: new Date().toISOString(),
      rateLimit: (request as any).__rateLimitInfo
    };

    return NextResponse.json(apiResponse, { status: 202 });

  } catch (error) {
    await AILogger.logError({
      error: error as Error,
      correlationId: context.correlationId,
      userId: context.userId,
      context: { operation: 'ai_search_initiation' }
    });

    throw error;
  }
}

// Export the middleware-wrapped handler
export const POST = withAIMiddleware(searchHandler);

// GET endpoint for AI services health check and metrics
export const GET = withAIMiddleware(async (request: NextRequest, context: any) => {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'health';

    switch (action) {
      case 'health': {
        // Get service health status
        const healthStatus = await aiServiceManager.getServiceHealth();

        const apiResponse: AIResponse = {
          success: true,
          data: {
            services: healthStatus,
            overall: healthStatus.every(s => s.status === 'healthy') ? 'healthy' :
                   healthStatus.some(s => s.status === 'unhealthy') ? 'unhealthy' : 'degraded',
            timestamp: new Date().toISOString()
          },
          correlationId: context.correlationId,
          timestamp: new Date().toISOString()
        };

        return NextResponse.json(apiResponse);
      }

      case 'metrics': {
        // Get performance metrics
        const timeWindow = parseInt(searchParams.get('timeWindow') || '15'); // minutes
        const dashboardData = aiPerformanceMonitor.getDashboardData();
        const aggregatedMetrics = aiPerformanceMonitor.getAggregatedMetrics(undefined, timeWindow);

        const apiResponse: AIResponse = {
          success: true,
          data: {
            overview: dashboardData.overview,
            services: dashboardData.services,
            metrics: aggregatedMetrics,
            alerts: dashboardData.activeAlerts,
            topOperations: dashboardData.topOperations
          },
          correlationId: context.correlationId,
          timestamp: new Date().toISOString()
        };

        return NextResponse.json(apiResponse);
      }

      case 'alerts': {
        // Get active alerts
        const alerts = aiPerformanceMonitor.getAlerts({
          resolved: false
        });

        const apiResponse: AIResponse = {
          success: true,
          data: {
            alerts,
            total: alerts.length
          },
          correlationId: context.correlationId,
          timestamp: new Date().toISOString()
        };

        return NextResponse.json(apiResponse);
      }

      default: {
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Supported actions: health, metrics, alerts'
        }, { status: 400 });
      }
    }

  } catch (error) {
    await AILogger.logError({
      error: error as Error,
      correlationId: context.correlationId,
      userId: context.userId,
      context: { operation: 'ai_search_get' }
    });

    throw error;
  }
});