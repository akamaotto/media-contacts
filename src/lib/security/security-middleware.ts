/**
 * Security Middleware
 * Integrates rate limiting, API key validation, audit logging, and cost tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { rateLimiters, rateLimitUtils, RateLimitResult } from './rate-limiter';
import { validateAPIKeyMiddleware, API_PERMISSIONS } from './api-key-manager';
import { auditLogger } from './audit-logger';
import { costTracker } from './cost-tracker';

export interface SecurityConfig {
  requireAuth?: boolean;
  requireAPIKey?: boolean;
  requiredPermission?: string;
  rateLimitType?: 'aiOperations' | 'research' | 'enrichment' | 'duplicateDetection' | 'admin' | 'ipBased';
  skipRateLimit?: boolean;
  skipAuditLog?: boolean;
  allowedMethods?: string[];
  ipWhitelist?: string[];
}

export interface SecurityContext {
  userId?: string;
  apiKeyId?: string;
  ip: string;
  userAgent: string;
  rateLimitInfo?: RateLimitResult;
  permissions: string[];
}

/**
 * Main security middleware function
 */
export async function withSecurity(
  request: NextRequest,
  config: SecurityConfig = {}
): Promise<{ context: SecurityContext; response?: NextResponse }> {
  const startTime = Date.now();
  const ip = rateLimitUtils.getClientIP(request.headers);
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const method = request.method;
  const url = new URL(request.url);
  const endpoint = url.pathname;

  // Initialize security context
  const context: SecurityContext = {
    ip,
    userAgent,
    permissions: []
  };

  try {
    // 1. Method validation
    if (config.allowedMethods && !config.allowedMethods.includes(method)) {
      const response = createErrorResponse(405, 'Method not allowed');
      await logSecurityEvent('method_not_allowed', request, context, { method, endpoint });
      return { context, response };
    }

    // 2. IP whitelist check
    if (config.ipWhitelist && !config.ipWhitelist.includes(ip)) {
      const response = createErrorResponse(403, 'IP address not allowed');
      await logSecurityEvent('ip_blocked', request, context, { ip, endpoint });
      return { context, response };
    }

    // 3. API Key validation (if required)
    if (config.requireAPIKey) {
      const authHeader = request.headers.get('authorization');
      const apiKeyResult = await validateAPIKeyMiddleware(
        authHeader,
        config.requiredPermission,
        ip
      );

      if (!apiKeyResult.valid) {
        const response = createErrorResponse(401, apiKeyResult.error || 'Invalid API key');
        await logSecurityEvent('api_key_invalid', request, context, { 
          error: apiKeyResult.error,
          endpoint 
        });
        return { context, response };
      }

      context.apiKeyId = apiKeyResult.key?.id;
      context.userId = apiKeyResult.key?.userId;
      context.permissions = apiKeyResult.key?.permissions || [];
    }

    // 4. Authentication check (if required and no API key)
    if (config.requireAuth && !context.userId) {
      // This would integrate with your existing auth system
      // For now, we'll assume auth is handled elsewhere
      const response = createErrorResponse(401, 'Authentication required');
      await logSecurityEvent('auth_required', request, context, { endpoint });
      return { context, response };
    }

    // 5. Rate limiting
    if (!config.skipRateLimit) {
      const rateLimitResult = await applyRateLimit(context, config.rateLimitType);
      
      if (!rateLimitResult.allowed) {
        const response = createRateLimitResponse(rateLimitResult);
        await logSecurityEvent('rate_limit_exceeded', request, context, {
          endpoint,
          rateLimitInfo: rateLimitResult
        });
        return { context, response };
      }

      context.rateLimitInfo = rateLimitResult;
    }

    // 6. Permission check
    if (config.requiredPermission && !context.permissions.includes(config.requiredPermission)) {
      const response = createErrorResponse(403, 'Insufficient permissions');
      await logSecurityEvent('permission_denied', request, context, {
        requiredPermission: config.requiredPermission,
        userPermissions: context.permissions,
        endpoint
      });
      return { context, response };
    }

    // 7. Audit logging (successful access)
    if (!config.skipAuditLog) {
      await auditLogger.logAPIAccess({
        userId: context.userId,
        apiKeyId: context.apiKeyId,
        ip,
        userAgent,
        endpoint,
        method,
        statusCode: 200, // Will be updated later if needed
        responseTime: Date.now() - startTime,
        rateLimitHit: false
      });
    }

    return { context };

  } catch (error) {
    console.error('Security middleware error:', error);
    
    const response = createErrorResponse(500, 'Internal security error');
    await logSecurityEvent('security_error', request, context, {
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint
    });
    
    return { context, response };
  }
}

/**
 * Apply rate limiting based on configuration
 */
async function applyRateLimit(
  context: SecurityContext,
  rateLimitType: SecurityConfig['rateLimitType'] = 'aiOperations'
): Promise<RateLimitResult> {
  const identifier = context.userId || context.ip;
  
  let limiter;
  switch (rateLimitType) {
    case 'research':
      limiter = rateLimiters.research;
      break;
    case 'enrichment':
      limiter = rateLimiters.enrichment;
      break;
    case 'duplicateDetection':
      limiter = rateLimiters.duplicateDetection;
      break;
    case 'admin':
      limiter = rateLimiters.admin;
      break;
    case 'ipBased':
      limiter = rateLimiters.ipBased;
      break;
    default:
      limiter = rateLimiters.aiOperations;
  }

  return limiter.checkLimit(identifier);
}

/**
 * Log security events
 */
async function logSecurityEvent(
  eventType: string,
  request: NextRequest,
  context: SecurityContext,
  details: Record<string, any>
): Promise<void> {
  const url = new URL(request.url);
  
  await auditLogger.logSecurityViolation({
    userId: context.userId,
    ip: context.ip,
    userAgent: context.userAgent,
    violationType: eventType,
    severity: getSeverityForEvent(eventType),
    details: {
      ...details,
      endpoint: url.pathname,
      method: request.method,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Get severity level for security events
 */
function getSeverityForEvent(eventType: string): 'medium' | 'high' | 'critical' {
  switch (eventType) {
    case 'rate_limit_exceeded':
    case 'method_not_allowed':
      return 'medium';
    case 'api_key_invalid':
    case 'permission_denied':
    case 'ip_blocked':
      return 'high';
    case 'security_error':
      return 'critical';
    default:
      return 'medium';
  }
}

/**
 * Create error response
 */
function createErrorResponse(status: number, message: string): NextResponse {
  return NextResponse.json(
    { error: message },
    { status }
  );
}

/**
 * Create rate limit response with headers
 */
function createRateLimitResponse(rateLimitResult: RateLimitResult): NextResponse {
  const headers = rateLimitUtils.formatRateLimitHeaders(rateLimitResult);
  const errorData = rateLimitUtils.createRateLimitError(rateLimitResult);
  
  return NextResponse.json(errorData, {
    status: 429,
    headers
  });
}

/**
 * Middleware for AI operations with cost tracking
 */
export async function withAIOperationSecurity(
  request: NextRequest,
  operationType: 'research' | 'enrichment' | 'duplicate_detection',
  config: Omit<SecurityConfig, 'rateLimitType'> = {}
): Promise<{ context: SecurityContext; response?: NextResponse }> {
  // Map operation type to rate limiter key
  const mappedRateType: SecurityConfig['rateLimitType'] =
    operationType === 'duplicate_detection' ? 'duplicateDetection' : operationType;

  const securityResult = await withSecurity(request, {
    ...config,
    rateLimitType: mappedRateType,
    requiredPermission: config.requiredPermission || getPermissionForOperation(operationType)
  });

  // If security check failed, return early
  if (securityResult.response) {
    return securityResult;
  }

  // Check budget constraints for the user
  if (securityResult.context.userId) {
    const budgetStatus = costTracker.isWithinBudget(securityResult.context.userId);
    
    if (!budgetStatus.withinBudget) {
      const exceededBudgets = budgetStatus.budgets.filter(b => b.percentUsed >= 100);
      
      const response = NextResponse.json({
        error: 'Budget exceeded',
        message: `You have exceeded your budget limits. Please contact support or increase your budget.`,
        exceededBudgets: exceededBudgets.map(b => ({
          name: b.budget.name,
          spent: b.budget.spent,
          limit: b.budget.amount,
          percentUsed: b.percentUsed
        }))
      }, { status: 402 }); // Payment Required

      await auditLogger.logSecurityViolation({
        userId: securityResult.context.userId,
        ip: securityResult.context.ip,
        userAgent: securityResult.context.userAgent,
        violationType: 'budget_exceeded',
        severity: 'high',
        details: {
          operationType,
          exceededBudgets: exceededBudgets.length
        }
      });

      return { context: securityResult.context, response };
    }
  }

  return securityResult;
}

// Deprecated: AI-specific permissions removed; default to ADMIN when required
function getPermissionForOperation(_operationType: string): string {
  return API_PERMISSIONS.ADMIN;
}

/**
 * Record AI operation cost after completion
 */
export async function recordAIOperationCost(
  context: SecurityContext,
  operationType: string,
  operation: string,
  provider: string,
  model: string,
  tokensUsed: number,
  cost: number,
  metadata?: Record<string, any>
): Promise<void> {
  if (!context.userId) return;

  await costTracker.recordCost({
    userId: context.userId,
    operationType,
    operation,
    provider,
    model,
    tokensUsed,
    cost,
    metadata: {
      ...metadata,
      apiKeyId: context.apiKeyId,
      ip: context.ip
    }
  });

  // Log the AI operation for audit purposes
  await auditLogger.logAIOperation({
    userId: context.userId,
    ip: context.ip,
    userAgent: context.userAgent,
    operationType,
    operation,
    success: true,
    cost,
    tokensUsed,
    details: metadata
  });
}

/**
 * Helper function to create secure API route handler
 */
export function createSecureAPIHandler(
  handler: (request: NextRequest, context: SecurityContext) => Promise<NextResponse>,
  config: SecurityConfig = {}
) {
  return async (request: NextRequest, routeParams?: any) => {
    const securityResult = await withSecurity(request, config);
    
    if (securityResult.response) {
      return securityResult.response;
    }

    try {
      const handlerStart = Date.now();
      const response = await handler(request, securityResult.context);
      
      // Update audit log with final status code
      if (!config.skipAuditLog && securityResult.context.userId) {
        await auditLogger.logAPIAccess({
          userId: securityResult.context.userId,
          apiKeyId: securityResult.context.apiKeyId,
          ip: securityResult.context.ip,
          userAgent: securityResult.context.userAgent,
          endpoint: new URL(request.url).pathname,
          method: request.method,
          statusCode: response.status,
          responseTime: Date.now() - handlerStart,
          rateLimitHit: false
        });
      }

      return response;
    } catch (error) {
      console.error('API handler error:', error);
      
      await auditLogger.logSecurityViolation({
        userId: securityResult.context.userId,
        ip: securityResult.context.ip,
        userAgent: securityResult.context.userAgent,
        violationType: 'api_error',
        severity: 'high',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          endpoint: new URL(request.url).pathname
        }
      });

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}
