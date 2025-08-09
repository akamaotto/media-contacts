# Prisma Connection Guidelines

## Overview

This document outlines the proper patterns for using Prisma in the media-contacts application to ensure optimal database connection health and prevent connection pool exhaustion.

## Connection Pattern: Singleton Only

### ✅ Correct Usage

Always use the singleton Prisma client from `@/lib/prisma`:

```typescript
import { prisma } from '@/lib/prisma';

export async function getUsers() {
  return await prisma.user.findMany();
}
```

### ❌ Incorrect Usage

**Never** create direct PrismaClient instances in production code:

```typescript
// DON'T DO THIS
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
```

## Why Singleton Pattern?

### Connection Pool Management
- Each `PrismaClient` instance creates its own connection pool (default: 5 connections for PostgreSQL)
- Multiple instances can quickly exhaust database connection limits
- Singleton ensures only one connection pool is active

### Next.js Hot Reloading
- Development hot reloads can create multiple client instances
- Singleton pattern prevents connection accumulation during development
- Global variable persists instances across hot reloads

### Resource Efficiency
- Single instance uses fewer system resources
- Better memory management
- Consistent connection lifecycle

## Implementation Details

### Singleton Configuration (`src/lib/prisma.ts`)

```typescript
import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
  var prismaConnected: boolean;
}

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  });
  
  // Explicit connection handling with error recovery
  if (!global.prismaConnected) {
    client.$connect()
      .then(() => {
        console.log('Prisma client connected successfully');
        global.prismaConnected = true;
      })
      .catch((err) => {
        console.error('Failed to connect Prisma client:', err);
        global.prismaConnected = false;
      });
  }
  
  return client;
}

export const prisma = global.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}
```

### Key Features
- **Global Instance**: Persists across hot reloads in development
- **Connection Tracking**: Prevents redundant connection attempts
- **Error Handling**: Graceful fallback for connection failures
- **Environment Logging**: Detailed logs in development, errors only in production

## ESLint Rules

The following ESLint rules prevent direct PrismaClient usage:

```javascript
{
  "no-restricted-imports": [
    "error",
    {
      "paths": [
        {
          "name": "@prisma/client",
          "importNames": ["PrismaClient"],
          "message": "Use singleton from '@/lib/prisma' instead"
        }
      ]
    }
  ],
  "no-restricted-syntax": [
    "error",
    {
      "selector": "NewExpression[callee.name='PrismaClient']",
      "message": "Direct PrismaClient instantiation not allowed. Use singleton."
    }
  ]
}
```

## Exceptions

### Acceptable Direct Usage
- **Test Files**: Mock instances for testing
- **Seed Scripts**: Database initialization scripts
- **Utility Scripts**: One-off database maintenance scripts
- **Migration Scripts**: Schema migration utilities

### Test Example
```typescript
// __tests__/example.test.ts
import { PrismaClient } from '@prisma/client';

describe('Database Tests', () => {
  let prisma: PrismaClient;
  
  beforeAll(async () => {
    prisma = new PrismaClient();
  });
  
  afterAll(async () => {
    await prisma.$disconnect();
  });
});
```

## Connection Monitoring

### Comprehensive Monitoring System

The application includes a complete connection pool monitoring system with real-time metrics, health checks, and alerting.

#### Core Monitoring Features

**Real-time Metrics (`src/lib/prisma-monitoring.ts`)**
- Connection pool usage tracking
- Active/idle/waiting connection counts
- Query performance monitoring
- Automatic status assessment (healthy/warning/critical)
- Historical data collection

**Health Check Endpoints**
```bash
# Basic health check
GET /api/health

# Detailed health check with metrics
GET /api/health?detailed=true

# Connection statistics
GET /api/health?stats=true
```

**Admin Monitoring Dashboard API**
```bash
# Current connection metrics (admin only)
GET /api/monitoring/connections?action=current

# Connection history (admin only)
GET /api/monitoring/connections?action=history

# Comprehensive statistics (admin only)
GET /api/monitoring/connections?action=stats

# Detailed health check (admin only)
GET /api/monitoring/connections?action=health
```

#### Monitoring Implementation

**Connection Metrics Interface**
```typescript
interface ConnectionMetrics {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingConnections: number;
  connectionPoolSize: number;
  timestamp: Date;
  status: 'healthy' | 'warning' | 'critical';
}
```

**Automatic Monitoring**
```typescript
// Auto-starts in production
import { initializeMonitoring } from '@/lib/monitoring-startup';

// Manual control
import { startConnectionMonitoring } from '@/lib/prisma-monitoring';
const interval = startConnectionMonitoring(60000); // 1-minute intervals
```

#### Alert Thresholds

- **Healthy**: < 70% pool usage
- **Warning**: 70-90% pool usage (logged as warning)
- **Critical**: > 90% pool usage (logged as error)

#### Production Setup

**Environment Variables**
```bash
# Enable monitoring in development
ENABLE_DB_MONITORING=true

# Monitoring runs automatically in production
NODE_ENV=production
```

**Startup Integration**
```typescript
// Automatically initializes when imported
import '@/lib/monitoring-startup';
```

#### Monitoring Dashboard Integration

**Example Usage**
```typescript
// Get current connection status
const response = await fetch('/api/monitoring/connections?action=current');
const { data } = await response.json();

console.log(`Connections: ${data.totalConnections}/${data.connectionPoolSize}`);
console.log(`Status: ${data.status}`);
```

**Statistics Dashboard**
```typescript
// Get 24-hour statistics
const stats = await fetch('/api/monitoring/connections?action=stats');
const { data } = await stats.json();

console.log(`Average connections: ${data.stats.avgConnections}`);
console.log(`Critical events: ${data.stats.criticalEvents}`);
```

#### Logging and Alerts

**Automatic Logging**
- Warning logs when connection usage > 70%
- Error logs when connection usage > 90%
- Slow query detection and logging
- Connection failure alerts

**Log Examples**
```
WARNING: Connection pool usage is high {
  totalConnections: 4,
  poolSize: 5,
  usage: "80.0%",
  timestamp: "2024-01-01T12:00:00.000Z"
}

CRITICAL: Connection pool usage is critical {
  totalConnections: 5,
  poolSize: 5,
  usage: "100.0%",
  timestamp: "2024-01-01T12:00:00.000Z"
}
```

## Migration from Direct Usage

### Before (Problematic)
```typescript
import { PrismaClient } from '@prisma/client';

export async function importData() {
  const prisma = new PrismaClient();
  
  try {
    // Process data
    await prisma.mediaContact.createMany({ data });
  } finally {
    await prisma.$disconnect();
  }
}
```

### After (Correct)
```typescript
import { prisma } from '@/lib/prisma';

export async function importData() {
  // Process data - no connection management needed
  await prisma.mediaContact.createMany({ data });
}
```

## Troubleshooting

### Common Issues
1. **Connection Pool Exhausted**: Check for direct PrismaClient instantiation
2. **Memory Leaks**: Ensure no lingering client instances
3. **Hot Reload Issues**: Verify global variable persistence

### Debug Commands
```bash
# Check for direct PrismaClient usage
grep -r "new PrismaClient" src/ --exclude-dir=node_modules

# Lint check for violations
npm run lint

# Database connection test
curl http://localhost:3000/api/health
```

## Best Practices Summary

1. ✅ Always import `{ prisma }` from `@/lib/prisma`
2. ✅ Never create `new PrismaClient()` in production code
3. ✅ Use ESLint rules to enforce patterns
4. ✅ Monitor connection health in production
5. ✅ Handle connection errors gracefully
6. ✅ Test connection patterns in development

Following these guidelines ensures optimal database performance, prevents connection exhaustion, and maintains code consistency across the application.
