# Feature Flags Quick Start Guide

This guide will help you get up and running with the Feature Flag System in just a few minutes.

## Prerequisites

- Node.js 18+ and npm/yarn installed
- A Next.js application (the feature flag system is optimized for Next.js)
- Access to a database (PostgreSQL recommended)

## 1. Installation

First, install the required dependencies:

```bash
npm install @prisma/client prisma
```

## 2. Database Setup

Set up your database schema for feature flags:

```prisma
// prisma/schema.prisma

model FeatureFlag {
  id        String   @id @default(cuid())
  key       String   @unique
  name      String
  description String?
  type      String   // release, experiment, ops, permission
  enabled   Boolean  @default(false)
  rolloutPercentage Int @default(0)
  userSegments Json?
  conditions Json?
  metadata  Json?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  createdBy String?
  updatedBy String?
  
  @@map("feature_flags")
}

model FeatureFlagAudit {
  id          String   @id @default(cuid())
  flagId      String?
  flagKey     String
  action      String
  oldValue    Json?
  newValue    Json?
  performedBy String
  reason      String?
  ipAddress   String?
  userAgent   String?
  metadata    Json?
  createdAt   DateTime @default(now())
  
  @@map("feature_flag_audits")
}

// Add other models as needed for monitoring, rollouts, and A/B testing
```

Run the migration:

```bash
npx prisma migrate dev --name init
```

## 3. Initialize the System

Create an initialization file:

```typescript
// lib/feature-flags/init.ts

import { initializeFeatureFlagSystem } from '@/lib/feature-flags/initialize';

export async function initFeatureFlags() {
  try {
    await initializeFeatureFlagSystem();
    console.log('✅ Feature flags initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize feature flags:', error);
  }
}
```

Call this during app startup:

```typescript
// app/layout.tsx

import { initFeatureFlags } from '@/lib/feature-flags/init';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Initialize feature flags
  await initFeatureFlags();

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

## 4. Create Your First Feature Flag

```typescript
// Create a simple feature flag
import { createFeatureFlag } from '@/lib/feature-flags/feature-flag-service';

const flagId = await createFeatureFlag({
  name: 'New Dashboard',
  description: 'Enable the new dashboard design',
  type: 'release',
  enabled: false,
  rolloutPercentage: 0,
  userSegments: ['internal-users'],
  conditions: [],
  metadata: {
    owner: 'product-team'
  }
}, 'admin-user');

console.log(`Created flag with ID: ${flagId}`);
```

## 5. Use the Feature Flag in a Component

```typescript
// app/components/NewDashboard.tsx

'use client';

import { useFeatureFlag } from '@/hooks/use-feature-flag';

export default function NewDashboard() {
  const { enabled, loading } = useFeatureFlag('new-dashboard', {
    context: { userId: 'user123' }
  });

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!enabled) {
    return <div>Old Dashboard</div>;
  }

  return <div>New Dashboard</div>;
}
```

## 6. Gradually Roll Out the Feature

```typescript
// Roll out to 10% of users
import { updateFeatureFlag } from '@/lib/feature-flags/feature-flag-service';

await updateFeatureFlag(
  'new-dashboard',
  {
    enabled: true,
    rolloutPercentage: 10
  },
  'product-manager',
  'Initial rollout to 10% of users'
);
```

## 7. Monitor the Rollout

Visit the feature flags dashboard at `/feature-flags` to monitor the rollout and check metrics.

## 8. Set Up A/B Testing

```typescript
// Create an A/B test
import { abTestingService } from '@/lib/feature-flags/ab-testing-service';

const experiment = await abTestingService.createExperiment({
  name: 'Button Color Test',
  description: 'Test different button colors',
  flagId: 'new-dashboard',
  flagKey: 'new-dashboard',
  trafficAllocation: 50,
  variants: [
    {
      name: 'Control',
      description: 'Blue button',
      isControl: true,
      trafficWeight: 50,
      config: { color: 'blue' }
    },
    {
      name: 'Variant A',
      description: 'Green button',
      isControl: false,
      trafficWeight: 50,
      config: { color: 'green' }
    }
  ],
  targetMetrics: ['click_rate']
}, 'product-manager');

// Start the experiment
await abTestingService.startExperiment(experiment.id, 'product-manager');
```

## 9. Use the A/B Test in Your Component

```typescript
// app/components/Button.tsx

'use client';

import { useABTest } from '@/hooks/use-ab-test';

export default function Button() {
  const { variant, recordConversion } = useABTest('button-color-test', {
    userId: 'user123'
  });

  const handleClick = () => {
    // Record conversion when button is clicked
    recordConversion();
  };

  const color = variant?.config.color || 'blue';

  return (
    <button
      style={{ backgroundColor: color }}
      onClick={handleClick}
    >
      Click Me
    </button>
  );
}
```

## 10. Set Up Monitoring

```typescript
// Create an alert rule
import { featureFlagMonitoringService } from '@/lib/feature-flags/monitoring-service';

const alertRule = await featureFlagMonitoringService.createAlertRule({
  name: 'High Error Rate',
  description: 'Alert when error rate exceeds 5%',
  metric: 'error_rate',
  operator: 'greater_than',
  threshold: 5,
  severity: 'warning',
  enabled: true,
  cooldownMinutes: 15,
  notificationChannels: ['email'],
  createdBy: 'admin'
});
```

## Common Use Cases

### 1. Enable a Feature for Internal Users Only

```typescript
const flagId = await createFeatureFlag({
  name: 'Internal Analytics',
  description: 'Advanced analytics for internal users',
  type: 'permission',
  enabled: true,
  rolloutPercentage: 100,
  userSegments: ['internal-users'],
  conditions: [
    {
      type: 'user_attribute',
      operator: 'contains',
      attribute: 'email',
      value: '@company.com'
    }
  ]
}, 'admin');
```

### 2. Gradual Rollout Based on Geography

```typescript
// Create a flag with geographic targeting
const flagId = await createFeatureFlag({
  name: 'EU Features',
  description: 'Features specific to EU users',
  type: 'release',
  enabled: true,
  rolloutPercentage: 100,
  userSegments: [],
  conditions: [
    {
      type: 'environment',
      operator: 'equals',
      attribute: 'region',
      value: 'eu'
    }
  ]
}, 'admin');
```

### 3. Time-Based Feature Release

```typescript
// Create a flag with time-based conditions
const flagId = await createFeatureFlag({
  name: 'Holiday Promotion',
  description: 'Special holiday promotion',
  type: 'release',
  enabled: true,
  rolloutPercentage: 100,
  userSegments: [],
  conditions: [
    {
      type: 'time',
      operator: 'greater_than',
      attribute: 'date',
      value: '2023-12-01'
    },
    {
      type: 'time',
      operator: 'less_than',
      attribute: 'date',
      value: '2024-01-01'
    }
  ]
}, 'admin');
```

## Next Steps

- Read the [complete documentation](./feature-flags.md) for advanced features
- Explore the [dashboard](./feature-flags.md#web-dashboard) to manage flags
- Set up [monitoring and alerting](./feature-flags.md#monitoring-and-alerting)
- Learn about [A/B testing](./feature-flags.md#ab-testing) best practices

## Troubleshooting

### Feature Flag Not Working

1. Check if the flag is enabled in the dashboard
2. Verify the user meets the targeting criteria
3. Check the browser console for errors
4. Review the audit log for recent changes

### Performance Issues

1. Check the cache hit rate
2. Reduce the number of conditions
3. Monitor database query performance

### Rollout Problems

1. Check the monitoring metrics
2. Review system health
3. Consider pausing or rolling back

## Getting Help

- Check the [complete documentation](./feature-flags.md)
- Review the code examples in the repository
- Contact the feature flag team for assistance

Happy flagging! 🚩