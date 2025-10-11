# Feature Flag System Documentation

## Overview

The Feature Flag System provides a comprehensive solution for managing feature flags, gradual rollouts, A/B testing, and monitoring in your application. It consists of several integrated components that work together to give you full control over your feature releases.

## Table of Contents

1. [Architecture](#architecture)
2. [Core Components](#core-components)
3. [Getting Started](#getting-started)
4. [Feature Flag Management](#feature-flag-management)
5. [Gradual Rollouts](#gradual-rollouts)
6. [A/B Testing](#ab-testing)
7. [Monitoring and Alerting](#monitoring-and-alerting)
8. [Audit Logging](#audit-logging)
9. [API Reference](#api-reference)
10. [React Integration](#react-integration)
11. [Server-Side Integration](#server-side-integration)
12. [Best Practices](#best-practices)
13. [Troubleshooting](#troubleshooting)

## Architecture

The Feature Flag System is built with a modular architecture that separates concerns and allows for easy extension:

```
┌─────────────────────────────────────────────────────────────┐
│                    Web Dashboard                              │
├─────────────────────────────────────────────────────────────┤
│                    API Layer                                  │
├─────────────────────────────────────────────────────────────┤
│  Feature Flag Service  │  Monitoring Service  │  A/B Testing │
├─────────────────────────────────────────────────────────────┤
│                Database Layer                                 │
├─────────────────────────────────────────────────────────────┤
│              Application Code                                │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Feature Flag Service (`src/lib/feature-flags/feature-flag-service.ts`)

The core service that manages feature flags, their evaluation, and basic operations.

**Key Features:**
- Flag creation, updating, and deletion
- User segment targeting
- Rollout percentage management
- Condition-based evaluation
- In-memory caching for performance

### 2. Database Service (`src/lib/feature-flags/feature-flag-db.ts`)

Handles all database operations for feature flags, audits, and related data.

**Key Features:**
- Persistent storage for flags
- Audit logging
- Statistics tracking
- Rollout history

### 3. Monitoring Service (`src/lib/feature-flags/monitoring-service.ts`)

Provides monitoring, metrics collection, and alerting for feature flags.

**Key Features:**
- Real-time metrics collection
- Custom alert rules
- Notification channels (email, Slack, SMS)
- System health monitoring

### 4. Automated Rollout Service (`src/lib/feature-flags/automated-rollout-service.ts`)

Manages automated rollout strategies based on metrics and health indicators.

**Key Features:**
- Predefined rollout strategies (conservative, standard, aggressive)
- Metrics-based decision making
- Automatic pause and rollback
- Health threshold monitoring

### 5. A/B Testing Service (`src/lib/feature-flags/ab-testing-service.ts`)

Provides A/B testing functionality integrated with the feature flag system.

**Key Features:**
- Experiment creation and management
- Variant assignment and tracking
- Conversion tracking
- Statistical significance calculation

### 6. Audit Log Service (`src/lib/feature-flags/audit-log-service.ts`)

Comprehensive audit logging for all feature flag changes.

**Key Features:**
- Detailed change tracking
- User activity logging
- Export functionality
- Analytics and reporting

## Getting Started

### 1. Initialization

First, initialize the feature flag system in your application:

```typescript
import { initializeFeatureFlagSystem } from '@/lib/feature-flags/initialize';

// Initialize during app startup
await initializeFeatureFlagSystem();
```

### 2. Database Setup

Ensure you have the required database tables:

```sql
-- Feature flags table
CREATE TABLE feature_flags (
  id VARCHAR(255) PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type ENUM('release', 'experiment', 'ops', 'permission'),
  enabled BOOLEAN DEFAULT FALSE,
  rollout_percentage INT DEFAULT 0,
  user_segments JSON,
  conditions JSON,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by VARCHAR(255),
  updated_by VARCHAR(255)
);

-- Audit log table
CREATE TABLE feature_flag_audits (
  id VARCHAR(255) PRIMARY KEY,
  flag_id VARCHAR(255),
  flag_key VARCHAR(255),
  action VARCHAR(255),
  old_value JSON,
  new_value JSON,
  performed_by VARCHAR(255),
  reason TEXT,
  ip_address VARCHAR(255),
  user_agent TEXT,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Additional tables for monitoring, rollouts, and A/B testing...
```

### 3. Default Flags

The system comes with several default feature flags for AI search functionality:

- `ai-search-enabled`: Controls whether AI search is available
- `ai-search-advanced-options`: Enables advanced search options
- `ai-search-provider-openai`: Uses OpenAI as the AI provider
- `ai-search-caching`: Enables caching for search results

## Feature Flag Management

### Creating a Feature Flag

```typescript
import { createFeatureFlag } from '@/lib/feature-flags/feature-flag-service';

const flagId = await createFeatureFlag(
  {
    name: 'New Dashboard',
    description: 'Enable the new dashboard design',
    type: 'release',
    enabled: false,
    rolloutPercentage: 0,
    userSegments: ['beta-users', 'internal-users'],
    conditions: [
      {
        type: 'user_attribute',
        operator: 'contains',
        attribute: 'email',
        value: '@company.com'
      }
    ],
    metadata: {
      owner: 'product-team',
      launchDate: '2023-12-01'
    }
  },
  'admin-user'
);
```

### Updating a Feature Flag

```typescript
import { updateFeatureFlag } from '@/lib/feature-flags/feature-flag-service';

await updateFeatureFlag(
  flagId,
  {
    enabled: true,
    rolloutPercentage: 25
  },
  'product-manager',
  'Gradual rollout to 25%'
);
```

### Checking if a Flag is Enabled

```typescript
import { isFeatureEnabled } from '@/lib/feature-flags/feature-flag-service';

const enabled = await isFeatureEnabled('new-dashboard', {
  userId: 'user123',
  ip: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
  timestamp: new Date()
});
```

## Gradual Rollouts

### Manual Gradual Rollout

```typescript
import { gradualRolloutFeatureFlag } from '@/lib/feature-flags/feature-flag-service';

await gradualRolloutFeatureFlag(
  flagId,
  [5, 10, 25, 50, 100], // Rollout percentages
  15 * 60 * 1000 // 15 minutes between steps
);
```

### Automated Rollout with Strategy

```typescript
import { automatedRolloutService } from '@/lib/feature-flags/automated-rollout-service';

// Start an automated rollout with the standard strategy
const rolloutPlan = await automatedRolloutService.startRolloutPlan(
  flagId,
  'standard', // Strategy ID
  'product-manager'
);

// Pause the rollout if needed
await automatedRolloutService.pauseRolloutPlan(
  rolloutPlan.id,
  'High error rate detected'
);

// Resume the rollout
await automatedRolloutService.resumeRolloutPlan(rolloutPlan.id);
```

### Predefined Rollout Strategies

1. **Conservative**: Slow rollout with small steps (1%, 5%, 10%, 25%, 50%, 100%)
2. **Standard**: Balanced rollout (5%, 10%, 25%, 50%, 100%)
3. **Aggressive**: Fast rollout (10%, 25%, 50%, 100%)

## A/B Testing

### Creating an Experiment

```typescript
import { abTestingService } from '@/lib/feature-flags/ab-testing-service';

const experiment = await abTestingService.createExperiment(
  {
    name: 'Homepage Button Color',
    description: 'Test different button colors for conversion rate',
    flagId: 'homepage-redesign',
    flagKey: 'homepage-redesign',
    trafficAllocation: 50, // 50% of traffic to this experiment
    variants: [
      {
        name: 'Control',
        description: 'Current blue button',
        isControl: true,
        trafficWeight: 50,
        config: { color: '#3b82f6' }
      },
      {
        name: 'Variant A',
        description: 'Green button',
        isControl: false,
        trafficWeight: 50,
        config: { color: '#10b981' }
      }
    ],
    targetMetrics: ['conversion_rate', 'click_through_rate']
  },
  'product-manager'
);
```

### Starting an Experiment

```typescript
await abTestingService.startExperiment(experiment.id, 'product-manager');
```

### Using the React Hook

```typescript
import { useABTest } from '@/hooks/use-ab-test';

function HomepageButton() {
  const { variant, recordConversion } = useABTest(experimentId, {
    userId: 'user123'
  });

  if (!variant) {
    return <button className="bg-blue-500">Sign Up</button>;
  }

  const handleClick = () => {
    // Record conversion when user clicks
    recordConversion();
  };

  return (
    <button
      className={`bg-${variant.config.color}-500`}
      onClick={handleClick}
    >
      Sign Up
    </button>
  );
}
```

## Monitoring and Alerting

### Creating Alert Rules

```typescript
import { featureFlagMonitoringService } from '@/lib/feature-flags/monitoring-service';

const alertRule = await featureFlagMonitoringService.createAlertRule({
  name: 'High Error Rate Alert',
  description: 'Alert when error rate exceeds 10%',
  metric: 'error_rate',
  operator: 'greater_than',
  threshold: 10,
  severity: 'warning',
  enabled: true,
  cooldownMinutes: 15,
  notificationChannels: ['email', 'slack'],
  createdBy: 'admin'
});
```

### Getting Monitoring Dashboard

```typescript
const dashboard = await featureFlagMonitoringService.getMonitoringDashboard();

console.log(dashboard.overview.totalFlags);
console.log(dashboard.overview.activeAlerts);
console.log(dashboard.systemHealth.status);
```

## Audit Logging

### Getting Audit Logs

```typescript
import { featureFlagAuditLog } from '@/lib/feature-flags/audit-log-service';

// Get audit logs for a specific flag
const logs = await featureFlagAuditLog.getFlagAuditLog(flagId);

// Get all audit logs
const allLogs = await featureFlagAuditLog.getAllAuditLogs();

// Get audit log analytics
const analytics = await featureFlagAuditLog.getAuditLogAnalytics();
```

### Exporting Audit Logs

```typescript
const csvContent = await featureFlagAuditLog.exportAuditLogToCSV({
  flagId: 'ai-search-enabled',
  startDate: new Date('2023-11-01'),
  endDate: new Date('2023-11-30')
});
```

## API Reference

### REST API Endpoints

#### Feature Flags

- `GET /api/feature-flags` - Get all feature flags
- `GET /api/feature-flags/[id]` - Get a specific feature flag
- `POST /api/feature-flags` - Create a new feature flag
- `PUT /api/feature-flags/[id]` - Update a feature flag
- `DELETE /api/feature-flags/[id]` - Delete a feature flag

#### Rollouts

- `GET /api/feature-flags/rollout` - Get rollout strategies or active plans
- `POST /api/feature-flags/[id]/automated-rollout` - Start automated rollout
- `POST /api/feature-flags/rollout/[planId]/pause` - Pause a rollout
- `POST /api/feature-flags/rollout/[planId]/resume` - Resume a rollout
- `POST /api/feature-flags/rollout/[planId]/cancel` - Cancel a rollout

#### A/B Testing

- `GET /api/feature-flags/experiments` - Get all experiments
- `GET /api/feature-flags/experiments/[id]` - Get a specific experiment
- `POST /api/feature-flags/experiments` - Create a new experiment
- `POST /api/feature-flags/experiments/[id]/start` - Start an experiment
- `POST /api/feature-flags/experiments/[id]/complete` - Complete an experiment

#### Audit Logs

- `GET /api/feature-flags/audit` - Get audit logs
- `GET /api/feature-flags/audit?analytics=true` - Get audit analytics
- `GET /api/feature-flags/audit?export=true` - Export audit logs

### Programmatic API

```typescript
import { 
  featureFlagService,
  automatedRolloutService,
  abTestingService,
  featureFlagMonitoringService
} from '@/lib/feature-flags';

// Use the services directly
const flags = await featureFlagService.getAllFlags();
const activeRollouts = automatedRolloutService.getActiveRolloutPlans();
const experiments = abTestingService.getAllExperiments();
const dashboard = await featureFlagMonitoringService.getMonitoringDashboard();
```

## React Integration

### Using the Feature Flag Hook

```typescript
import { useFeatureFlag } from '@/hooks/use-feature-flag';

function NewFeature() {
  const { enabled, loading, error } = useFeatureFlag('new-feature', {
    context: { userId: 'user123' }
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!enabled) return null;

  return <div>New Feature Content</div>;
}
```

### Using the Feature Flag Component

```typescript
import { FeatureFlag } from '@/hooks/use-feature-flag';

function ConditionalComponent() {
  return (
    <FeatureFlag flagName="new-feature">
      <div>This content is shown when the flag is enabled</div>
    </FeatureFlag>
  );
}
```

### Using the A/B Testing Hook

```typescript
import { useABTest } from '@/hooks/use-ab-test';

function TestableComponent() {
  const { variant, experiment, recordConversion } = useABTest(experimentId, {
    userId: 'user123'
  });

  const handleAction = () => {
    // Perform the action
    doSomething();
    
    // Record the conversion
    recordConversion();
  };

  if (!variant) {
    return <DefaultComponent />;
  }

  return (
    <div style={{ backgroundColor: variant.config.backgroundColor }}>
      <button onClick={handleAction}>Action</button>
    </div>
  );
}
```

## Server-Side Integration

### API Route with Feature Flags

```typescript
import { withFeatureFlag } from '@/lib/feature-flags/server-utils';

const handler = async (req: NextRequest, res: NextResponse) => {
  // Your API logic here
  return NextResponse.json({ data: 'Success' });
};

// Wrap with feature flag check
export const POST = withFeatureFlag('new-api-endpoint')(handler);
```

### Checking Flags in Server Components

```typescript
import { isServerFeatureEnabled } from '@/lib/feature-flags/server-utils';

async function ServerComponent() {
  const enabled = await isServerFeatureEnabled('new-feature', {
    userId: 'user123'
  });

  if (!enabled) {
    return <div>Feature not available</div>;
  }

  return <div>Feature Content</div>;
}
```

## Best Practices

### 1. Flag Naming

- Use descriptive, consistent names
- Use kebab-case for flag names (e.g., `ai-search-enabled`)
- Include the feature or component name in the flag name
- Avoid using temporary or dates in flag names

### 2. Flag Types

- Use `release` for features being rolled out to users
- Use `experiment` for A/B tests
- Use `ops` for operational toggles
- Use `permission` for access control

### 3. Rollout Strategy

- Start with internal users before expanding to broader audiences
- Use gradual rollouts for high-risk features
- Monitor metrics closely during rollouts
- Have a rollback plan ready

### 4. A/B Testing

- Always have a control variant
- Ensure sufficient traffic for statistical significance
- Define clear success metrics before starting
- Run tests for an appropriate duration

### 5. Monitoring

- Set up alert rules for critical flags
- Monitor error rates and response times
- Track flag usage and performance
- Regularly review and clean up old flags

## Troubleshooting

### Common Issues

#### Flag Not Working

1. Check if the flag is enabled
2. Verify the user meets the targeting criteria
3. Check the rollout percentage
4. Review any custom conditions
5. Check the audit log for recent changes

#### Performance Issues

1. Check the cache hit rate
2. Review flag evaluation complexity
3. Monitor database query performance
4. Consider reducing the number of conditions

#### Rollout Problems

1. Check monitoring metrics
2. Review system health
3. Check for error spikes
4. Consider pausing or rolling back

### Debug Mode

Enable debug logging to troubleshoot issues:

```typescript
// Enable debug mode
process.env.FEATURE_FLAG_DEBUG = 'true';
```

### Getting Help

- Check the console for error messages
- Review the audit log for recent changes
- Monitor the system health dashboard
- Contact the feature flag team for assistance

## Advanced Usage

### Custom Conditions

Create complex targeting conditions:

```typescript
const flag = await createFeatureFlag({
  name: 'Advanced Feature',
  description: 'Feature with complex targeting',
  type: 'release',
  enabled: true,
  rolloutPercentage: 100,
  userSegments: ['premium-users'],
  conditions: [
    {
      type: 'user_attribute',
      operator: 'greater_than',
      attribute: 'account_age_days',
      value: 30
    },
    {
      type: 'environment',
      operator: 'equals',
      attribute: 'region',
      value: 'us-east-1'
    },
    {
      type: 'custom',
      operator: 'equals',
      attribute: 'beta_feature_access',
      value: true
    }
  ]
}, 'admin');
```

### Dynamic Configuration

Use feature flags to dynamically configure components:

```typescript
function DynamicComponent() {
  const { variant } = useABTestVariant('ui-config-experiment', [
    'compact',
    'standard',
    'detailed'
  ]);

  const config = {
    layout: variant || 'standard',
    showAdvancedOptions: variant === 'detailed',
    compactMode: variant === 'compact'
  };

  return <Component config={config} />;
}
```

### Integration with Third-Party Tools

```typescript
// Example: Integration with analytics
import { useFeatureFlag } from '@/hooks/use-feature-flag';

function AnalyticsWrapper() {
  const { enabled } = useFeatureFlag('advanced-analytics', {
    context: { userId: 'user123' }
  });

  useEffect(() => {
    if (enabled) {
      // Initialize advanced analytics
      analytics.init('advanced');
    } else {
      // Initialize basic analytics
      analytics.init('basic');
    }
  }, [enabled]);

  return <div>App Content</div>;
}
```

## Conclusion

The Feature Flag System provides a powerful and flexible solution for managing feature releases, A/B tests, and monitoring in your application. By following the best practices and using the components effectively, you can safely and efficiently release new features to your users.

For more information or assistance, please refer to the code documentation or contact the feature flag team.