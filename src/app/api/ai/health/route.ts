/**
 * AI Health Check API Endpoint
 * Provides health status for AI services and dependencies
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAIMiddleware } from '../shared/middleware';
import { AIHealthCheck, AIResponse } from '../shared/types';
import { rateLimiter } from '../shared/rate-limiter';

async function healthHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Check database health (basic check)
    let databaseHealth = 'healthy' as const;
    try {
      // TODO: Implement actual database health check
      // For now, assume healthy
      databaseHealth = 'healthy';
    } catch (error) {
      databaseHealth = 'unhealthy';
    }

    // Check Redis health
    let redisHealth = 'healthy' as const;
    try {
      const redisStats = await rateLimiter.healthCheck();
      redisHealth = redisStats.status === 'healthy' ? 'healthy' : 'unhealthy';
    } catch (error) {
      redisHealth = 'unhealthy';
    }

    // Check external APIs health
    let externalApisHealth = 'healthy' as const;
    try {
      // TODO: Implement health checks for external AI services
      // For now, assume healthy
      externalApisHealth = 'healthy';
    } catch (error) {
      externalApisHealth = 'degraded';
    }

    // Calculate overall status
    const overallStatus =
      databaseHealth === 'unhealthy' || redisHealth === 'unhealthy'
        ? 'unhealthy' as const
        : externalApisHealth === 'degraded'
        ? 'degraded' as const
        : 'healthy' as const;

    const healthCheck: AIHealthCheck = {
      status: overallStatus,
      services: {
        database: databaseHealth,
        redis: redisHealth,
        external_apis: externalApisHealth
      },
      metrics: {
        responseTime: Date.now() - startTime,
        activeSearches: 0, // TODO: Get actual count
        queueSize: 0, // TODO: Get actual queue size
        errorRate: 0 // TODO: Calculate actual error rate
      },
      timestamp: new Date().toISOString()
    };

    const apiResponse: AIResponse = {
      success: true,
      data: healthCheck,
      correlationId: context.correlationId,
      timestamp: new Date().toISOString()
    };

    // Set appropriate status code based on health
    const statusCode = overallStatus === 'healthy' ? 200 :
                      overallStatus === 'degraded' ? 200 : 503;

    return NextResponse.json(apiResponse, { status: statusCode });

  } catch (error) {
    // If health check itself fails, return unhealthy status
    const unhealthyResponse: AIResponse = {
      success: false,
      error: 'Health check failed',
      correlationId: context.correlationId,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(unhealthyResponse, { status: 503 });
  }
}

// Health check should be accessible without authentication
export const GET = withAIMiddleware(healthHandler, {
  skipAuth: true,
  skipRateLimit: true
});