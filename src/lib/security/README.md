# Security System

This module provides comprehensive security measures for the application, including rate limiting, API key management, audit logging, and optional cost tracking for expensive operations.

## Overview

The security system implements multiple layers of protection:

1. **Rate Limiting**: User-based and IP-based request throttling
2. **API Key Management**: Secure API key generation, validation, and rotation
3. **Audit Logging**: Comprehensive security event tracking and alerting
4. **Cost Tracking**: Operation cost monitoring and budget management (optional)
5. **Security Middleware**: Integrated security checks for all API endpoints

## Components

### Rate Limiter (`rate-limiter.ts`)

Implements flexible rate limiting with multiple storage backends:

```typescript
import { rateLimiters, RateLimiter } from '@/lib/security/rate-limiter';

// Use pre-configured limiters
const result = await rateLimiters.admin.checkLimit('user-123');

// Create custom limiter
const customLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 100,
  keyGenerator: (id: string) => `custom:${id}`
});
```

**Features:**
- Multiple rate limit configurations for different operations
- Memory and Redis storage backends
- Custom key generation
- Rate limit headers for HTTP responses
- Automatic cleanup of expired entries

### API Key Manager (`api-key-manager.ts`)

Secure API key lifecycle management:

```typescript
import { apiKeyManager, validateAPIKeyMiddleware } from '@/lib/security/api-key-manager';

// Generate new API key
const { key, apiKey } = apiKeyManager.generateAPIKey({
  name: 'Research API Key',
  userId: 'user-123',
  permissions: ['contacts:read', 'contacts:write'],
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
});

// Validate API key
const result = await apiKeyManager.validateAPIKey(rawKey, 'ai:research', clientIP);
```

**Features:**
- Secure key generation with cryptographic hashing
- Permission-based access control
- IP whitelisting support
- Key rotation and revocation
- Usage statistics and monitoring
- Automatic expiration handling

### Audit Logger (`audit-logger.ts`)

Comprehensive security event logging and alerting:

```typescript
import { auditLogger } from '@/lib/security/audit-logger';

// Log security events
await auditLogger.logAuthentication({
  userId: 'user-123',
  ip: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
  action: 'login_success'
});

await auditLogger.logAPIAccess({
  userId: 'user-123',
  endpoint: '/api/secure-endpoint',
  method: 'POST',
  statusCode: 200,
  responseTime: 500
});

// Get security alerts
const alerts = auditLogger.getAlerts({
  severity: 'high',
  status: 'open'
});
```

**Features:**
- Multiple event types (authentication, API access, data modification, etc.)
- Automatic pattern detection for security threats
- Real-time alerting system
- Statistical analysis and reporting
- Event correlation and threat detection

### Cost Tracker (`cost-tracker.ts`)

Operation cost monitoring and budget management (if you have costly providers):

```typescript
import { costTracker } from '@/lib/security/cost-tracker';

// Record operation cost
await costTracker.recordCost({
  userId: 'user-123',
  operationType: 'export',
  operation: 'bulk_export_csv',
  provider: 'external-service',
  model: 'n/a',
  tokensUsed: 0,
  cost: 0.05
});

// Create budget
await costTracker.createBudget({
  name: 'Monthly Ops Budget',
  userId: 'user-123',
  budgetType: 'monthly',
  amount: 100.00,
  alertThresholds: [50, 75, 90]
});

// Check budget status
const { withinBudget, budgets } = costTracker.isWithinBudget('user-123');
```

**Features:**
- Real-time cost tracking
- Budget creation and monitoring
- Usage alerts and notifications
- Cost predictions and analytics
- Multi-provider cost aggregation

### Security Middleware (`security-middleware.ts`)

Integrated security layer for API endpoints:

```typescript
import { withSecurity, withAIOperationSecurity, createSecureAPIHandler } from '@/lib/security/security-middleware';

// Apply security to API route
export const POST = createSecureAPIHandler(
  async (request, context) => {
    // Your API logic here
    return NextResponse.json({ success: true });
  },
  {
    requireAuth: true,
    rateLimitType: 'research',
    requiredPermission: 'ai:research'
  }
);

// Manual security application
const securityResult = await withAIOperationSecurity(request, 'research');
if (securityResult.response) {
  return securityResult.response; // Security check failed
}
```

**Features:**
- Unified security checks for all endpoints
- Rate limiting integration
- API key validation
- Budget enforcement
- Audit logging
- Error handling and response formatting

## API Endpoints

### Security Audit (`/api/security/audit`)

```typescript
// Get audit events
GET /api/security/audit?eventType=authentication&severity=high&limit=100

// Get audit statistics
GET /api/security/audit/stats?timeRange=24h
```

### Security Alerts (`/api/security/alerts`)

```typescript
// Get security alerts
GET /api/security/alerts?status=open&severity=critical

// Resolve alert
POST /api/security/alerts
{
  "alertId": "alert-123",
  "status": "resolved",
  "notes": "False positive - legitimate traffic spike"
}
```

### Cost Tracking (`/api/security/cost-tracking`)

```typescript
// Get cost summary
GET /api/security/cost-tracking?timeRange=30d&systemWide=false

// Create budget
POST /api/security/cost-tracking/budget
{
  "name": "Weekly Research Budget",
  "budgetType": "weekly",
  "amount": 25.00,
  "alertThresholds": [75, 90]
}
```

### API Keys (`/api/security/api-keys`)

```typescript
// List user's API keys
GET /api/security/api-keys

// Create new API key
POST /api/security/api-keys
{
  "name": "Research API Key",
  "permissions": ["ai:research", "ai:enrichment"],
  "expiresAt": "2024-12-31T23:59:59Z"
}

// Rotate API key
POST /api/security/api-keys/{keyId}/rotate

// Revoke API key
DELETE /api/security/api-keys/{keyId}

// Get usage statistics
GET /api/security/api-keys/{keyId}/usage?timeRange=7d
```

## Security Dashboard

The security dashboard provides a comprehensive view of system security:

```typescript
import { SecurityDashboard } from '@/components/features/security/security-dashboard';

function SecurityPage() {
  return <SecurityDashboard />;
}
```

**Features:**
- Real-time security metrics
- Active alert management
- Cost tracking and budget monitoring
- API key usage statistics
- Audit event visualization
- Security configuration interface

## Configuration

### Rate Limiting Configuration

```typescript
// Pre-configured rate limiters
export const rateLimiters = {
  aiOperations: new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 100
  }),
  research: new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20 // More restrictive for expensive operations
  }),
  // ... other configurations
};
```

### API Permissions (example)

```typescript
export const API_PERMISSIONS = {
  ADMIN: 'admin',
  READ_CONTACTS: 'contacts:read',
  WRITE_CONTACTS: 'contacts:write'
} as const;
```

## Integration Examples

### Securing an API Endpoint

```typescript
import { withSecurity } from '@/lib/security/security-middleware';

export async function POST(request: NextRequest) {
  const securityResult = await withSecurity(request, {
    requireAuth: true,
    rateLimitType: 'admin',
    requiredPermission: 'admin'
  });
  if (securityResult.response) return securityResult.response;
  // Your handler...
}
```

### Custom Rate Limiting

```typescript
import { RateLimiter } from '@/lib/security/rate-limiter';

// Create custom rate limiter for specific endpoint
const uploadLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 uploads per 15 minutes
  keyGenerator: (userId: string) => `upload:${userId}`
});

export async function POST(request: NextRequest) {
  const userId = await getUserId(request);
  
  const rateLimitResult = await uploadLimiter.checkLimit(userId);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Upload rate limit exceeded' },
      { 
        status: 429,
        headers: rateLimitUtils.formatRateLimitHeaders(rateLimitResult)
      }
    );
  }

  // Process upload...
}
```

### Budget Enforcement

```typescript
import { costTracker } from '@/lib/security/cost-tracker';

export async function POST(request: NextRequest) {
  const userId = await getUserId(request);
  
  // Check budget before expensive operation
  const { withinBudget } = costTracker.isWithinBudget(userId);
  
  if (!withinBudget) {
    return NextResponse.json(
      { error: 'Budget exceeded. Please increase your budget or wait for the next billing period.' },
      { status: 402 } // Payment Required
    );
  }

  // Proceed with operation...
}
```

## Security Best Practices

### API Key Security

1. **Never log raw API keys** - Always use hashed versions
2. **Implement key rotation** - Regular rotation reduces exposure risk
3. **Use least privilege** - Grant minimal required permissions
4. **Monitor usage** - Track and alert on unusual patterns
5. **Set expiration dates** - Automatic expiration reduces long-term risk

### Rate Limiting Strategy

1. **Layer multiple limits** - User-based, IP-based, and operation-specific
2. **Use appropriate windows** - Match window size to operation cost
3. **Implement graceful degradation** - Provide meaningful error messages
4. **Monitor effectiveness** - Track blocked vs allowed requests
5. **Adjust based on usage** - Regular review and tuning

### Audit Logging

1. **Log security-relevant events** - Authentication, authorization, data access
2. **Include sufficient context** - IP, user agent, timestamps, request details
3. **Implement real-time alerting** - Immediate notification of critical events
4. **Regular log analysis** - Periodic review for patterns and trends
5. **Secure log storage** - Protect audit logs from tampering

### Cost Management

1. **Set realistic budgets** - Based on historical usage and business needs
2. **Implement multiple alert thresholds** - Early warning system
3. **Monitor cost trends** - Identify unusual spending patterns
4. **Regular budget reviews** - Adjust based on changing needs
5. **Cost attribution** - Track costs by user, operation, and time period

## Testing

The security system includes comprehensive tests:

```bash
# Run all security tests
npm test src/lib/security

# Run specific test suites
npm test src/lib/security/__tests__/rate-limiter.test.ts
npm test src/lib/security/__tests__/api-key-manager.test.ts
npm test src/lib/security/__tests__/audit-logger.test.ts
npm test src/lib/security/__tests__/cost-tracker.test.ts
```

## Monitoring and Alerting

### Key Metrics to Monitor

1. **Rate Limit Hit Rate** - Percentage of requests blocked
2. **API Key Usage** - Active keys, expired keys, usage patterns
3. **Security Alert Volume** - Number and severity of alerts
4. **Cost Trends** - Spending patterns and budget utilization
5. **Audit Event Patterns** - Security violations and suspicious activity

### Alert Thresholds

- **Critical**: Security breaches, budget exceeded, system failures
- **High**: Repeated unauthorized access, unusual spending patterns
- **Medium**: Rate limit abuse, expired API keys, policy violations
- **Low**: Normal operational events, informational alerts

## Production Deployment

### Environment Variables

```bash
# Redis configuration (optional, falls back to memory)
REDIS_URL=redis://localhost:6379

# Security settings
SECURITY_RATE_LIMIT_ENABLED=true
SECURITY_API_KEYS_ENABLED=true
SECURITY_AUDIT_LOGGING_ENABLED=true
SECURITY_COST_TRACKING_ENABLED=true

# Alert thresholds
SECURITY_ALERT_EMAIL=security@company.com
SECURITY_BUDGET_ALERT_THRESHOLD=90
```

### Database Schema

For production deployment, implement persistent storage:

```sql
-- API Keys table
CREATE TABLE api_keys (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) NOT NULL UNIQUE,
  prefix VARCHAR(8) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  permissions JSON NOT NULL,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP NULL,
  last_used_at TIMESTAMP NULL,
  usage_count INTEGER DEFAULT 0,
  metadata JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Audit Events table
CREATE TABLE audit_events (
  id VARCHAR(255) PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  user_id VARCHAR(255) NULL,
  session_id VARCHAR(255) NULL,
  ip VARCHAR(45) NOT NULL,
  user_agent TEXT NULL,
  resource VARCHAR(255) NULL,
  action VARCHAR(255) NOT NULL,
  details JSON NULL,
  metadata JSON NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_event_type (event_type),
  INDEX idx_severity (severity),
  INDEX idx_user_id (user_id),
  INDEX idx_timestamp (timestamp)
);

-- Cost Entries table
CREATE TABLE cost_entries (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  operation_type VARCHAR(50) NOT NULL,
  operation VARCHAR(255) NOT NULL,
  provider VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  tokens_used INTEGER NOT NULL,
  cost DECIMAL(10, 6) NOT NULL,
  metadata JSON NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_operation_type (operation_type),
  INDEX idx_timestamp (timestamp)
);

-- Budgets table
CREATE TABLE budgets (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  budget_type VARCHAR(20) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  spent DECIMAL(10, 2) DEFAULT 0,
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  alert_thresholds JSON NOT NULL,
  alerts_sent JSON NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  metadata JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_budget_type (budget_type),
  INDEX idx_is_active (is_active)
);
```

This comprehensive security system provides enterprise-grade protection for AI operations while maintaining usability and performance.
