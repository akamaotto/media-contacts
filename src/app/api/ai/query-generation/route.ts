/**
 * AI Query Generation API Endpoint
 * Generates intelligent search queries based on user criteria
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAIMiddleware } from '../shared/middleware';
import { AILogger } from '../shared/logger';
import { AIResponse } from '../shared/types';
import { randomUUID } from 'crypto';
import { QueryGenerationService } from '@/lib/ai/query-generation';
import { PrismaClient } from '@prisma/client';
import {
  QueryGenerationRequest,
  QueryGenerationResult,
  QueryGenerationError
} from '@/lib/ai/query-generation/types';

const prisma = new PrismaClient();
let queryGenerationService: QueryGenerationService | null = null;

async function getQueryGenerationService(): Promise<QueryGenerationService> {
  if (!queryGenerationService) {
    queryGenerationService = new QueryGenerationService(prisma);
    await queryGenerationService.initialize();
  }
  return queryGenerationService;
}

async function generateQueriesHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Get validated data from middleware
    const validatedData = (request as any).__validatedData;
    const requestData = validatedData.body;

    // Generate unique batch ID
    const batchId = randomUUID();

    // Create query generation request
    const queryRequest: QueryGenerationRequest = {
      searchId: requestData.searchId || randomUUID(),
      batchId,
      originalQuery: requestData.query,
      criteria: {
        countries: requestData.criteria?.countries,
        categories: requestData.criteria?.categories,
        beats: requestData.criteria?.beats,
        languages: requestData.criteria?.languages,
        topics: requestData.criteria?.topics,
        outlets: requestData.criteria?.outlets,
        regions: requestData.criteria?.regions,
        dateRange: requestData.criteria?.dateRange
      },
      options: {
        maxQueries: requestData.options?.maxQueries || 10,
        diversityThreshold: requestData.options?.diversityThreshold || 0.7,
        minRelevanceScore: requestData.options?.minRelevanceScore || 0.3,
        enableAIEnhancement: requestData.options?.enableAIEnhancement !== false,
        fallbackStrategies: requestData.options?.fallbackStrategies !== false,
        cacheEnabled: requestData.options?.cacheEnabled !== false,
        priority: requestData.options?.priority || 'medium'
      },
      userId: context.userId
    };

    // Log the query generation request
    await AILogger.logBusiness({
      event: 'ai_query_generation_initiated',
      correlationId: context.correlationId,
      userId: context.userId,
      entityType: 'ai_query_generation',
      entityId: batchId,
      changes: {
        originalQuery: requestData.query,
        criteria: requestData.criteria,
        options: requestData.options
      }
    });

    // Get query generation service and generate queries
    const service = await getQueryGenerationService();
    const result: QueryGenerationResult = await service.generateQueries(queryRequest);

    // Log successful completion
    await AILogger.logBusiness({
      event: 'ai_query_generation_completed',
      correlationId: context.correlationId,
      userId: context.userId,
      entityType: 'ai_query_generation',
      entityId: batchId,
      changes: {
        totalGenerated: result.metrics.totalGenerated,
        totalDuplicates: result.metrics.totalDuplicates,
        averageScore: result.metrics.averageScore,
        processingTimeMs: result.metrics.processingTimeMs,
        status: result.status
      }
    });

    // Log performance
    await AILogger.logPerformance({
      operation: 'ai_query_generation',
      duration: Date.now() - startTime,
      correlationId: context.correlationId,
      userId: context.userId,
      metadata: {
        batchId,
        totalQueries: result.metrics.totalGenerated,
        uniqueQueries: result.queries.length,
        averageScore: result.metrics.averageScore
      }
    });

    const apiResponse: AIResponse = {
      success: true,
      data: {
        searchId: result.searchId,
        batchId: result.batchId,
        originalQuery: result.originalQuery,
        queries: result.queries.map(query => ({
          id: query.id,
          query: query.generatedQuery,
          type: query.queryType,
          scores: query.scores,
          metadata: query.metadata,
          criteria: query.criteria
        })),
        metrics: result.metrics,
        status: result.status,
        errors: result.errors
      },
      correlationId: context.correlationId,
      timestamp: new Date().toISOString(),
      rateLimit: (request as any).__rateLimitInfo
    };

    return NextResponse.json(apiResponse, { status: 200 });

  } catch (error) {
    await AILogger.logError({
      error: error as Error,
      correlationId: context.correlationId,
      userId: context.userId,
      context: { operation: 'ai_query_generation' }
    });

    // Handle specific errors
    if (error instanceof QueryGenerationError) {
      const apiResponse: AIResponse = {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          type: error.type,
          details: error.details
        },
        correlationId: context.correlationId,
        timestamp: new Date().toISOString()
      };

      return NextResponse.json(apiResponse, { status: 400 });
    }

    // Generic error
    const apiResponse: AIResponse = {
      success: false,
      error: {
        code: 'QUERY_GENERATION_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        type: 'INTERNAL_ERROR'
      },
      correlationId: context.correlationId,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(apiResponse, { status: 500 });
  }
}

// GET endpoint for service status and statistics
async function statusHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'health';

    switch (action) {
      case 'health': {
        const service = await getQueryGenerationService();
        const stats = await service.getStats();

        const apiResponse: AIResponse = {
          success: true,
          data: {
            service: 'query-generation',
            status: 'healthy',
            version: '1.0.0',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            statistics: stats
          },
          correlationId: context.correlationId,
          timestamp: new Date().toISOString()
        };

        return NextResponse.json(apiResponse);
      }

      case 'templates': {
        const service = await getQueryGenerationService();
        const stats = await service.getStats();

        const apiResponse: AIResponse = {
          success: true,
          data: {
            templates: stats.templateStats
          },
          correlationId: context.correlationId,
          timestamp: new Date().toISOString()
        };

        return NextResponse.json(apiResponse);
      }

      case 'config': {
        const service = await getQueryGenerationService();
        const config = service.getConfig();

        const apiResponse: AIResponse = {
          success: true,
          data: {
            config
          },
          correlationId: context.correlationId,
          timestamp: new Date().toISOString()
        };

        return NextResponse.json(apiResponse);
      }

      default: {
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Supported actions: health, templates, config'
        }, { status: 400 });
      }
    }

  } catch (error) {
    await AILogger.logError({
      error: error as Error,
      correlationId: context.correlationId,
      userId: context.userId,
      context: { operation: 'ai_query_generation_status' }
    });

    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve service status'
    }, { status: 500 });
  }
}

// POST endpoint for generating queries
export const POST = withAIMiddleware(generateQueriesHandler, {
  schema: {
    type: 'object',
    required: ['query'],
    properties: {
      query: {
        type: 'string',
        minLength: 1,
        maxLength: 1000,
        description: 'The base search query'
      },
      searchId: {
        type: 'string',
        description: 'Optional search ID to associate with queries'
      },
      criteria: {
        type: 'object',
        properties: {
          countries: {
            type: 'array',
            items: { type: 'string' },
            description: 'Target countries for query generation'
          },
          categories: {
            type: 'array',
            items: { type: 'string' },
            description: 'Media categories to focus on'
          },
          beats: {
            type: 'array',
            items: { type: 'string' },
            description: 'Journalistic beats to target'
          },
          languages: {
            type: 'array',
            items: { type: 'string' },
            description: 'Languages to generate queries for'
          },
          topics: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific topics to include'
          },
          outlets: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific media outlets to target'
          },
          regions: {
            type: 'array',
            items: { type: 'string' },
            description: 'Geographic regions to target'
          },
          dateRange: {
            type: 'object',
            properties: {
              startDate: { type: 'string', format: 'date' },
              endDate: { type: 'string', format: 'date' }
            }
          }
        }
      },
      options: {
        type: 'object',
        properties: {
          maxQueries: {
            type: 'integer',
            minimum: 1,
            maximum: 50,
            default: 10,
            description: 'Maximum number of queries to generate'
          },
          diversityThreshold: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            default: 0.7,
            description: 'Minimum diversity threshold for queries'
          },
          minRelevanceScore: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            default: 0.3,
            description: 'Minimum relevance score for queries'
          },
          enableAIEnhancement: {
            type: 'boolean',
            default: true,
            description: 'Enable AI-powered query enhancement'
          },
          fallbackStrategies: {
            type: 'boolean',
            default: true,
            description: 'Enable fallback strategies for edge cases'
          },
          cacheEnabled: {
            type: 'boolean',
            default: true,
            description: 'Enable query generation caching'
          },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high'],
            default: 'medium',
            description: 'Processing priority'
          }
        }
      }
    }
  }
});

// GET endpoint for service status and statistics
export const GET = withAIMiddleware(statusHandler);