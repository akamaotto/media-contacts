# Feature Flag Management Guide

This document outlines the feature flag strategy and implementation for the AI Search feature rollout.

## Overview

Feature flags enable gradual, controlled rollout of the AI Search feature while minimizing risk and allowing for quick rollback if issues arise. This guide covers flag configuration, rollout strategies, and management procedures.

## Feature Flag Architecture

### Flag Types

1. **Release Flags** - Control feature availability
2. **Experiment Flags** - Enable A/B testing
3. **Ops Flags** - Control operational behavior
4. **Permission Flags** - Control user access

### Flag Storage

```typescript
interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  type: 'release' | 'experiment' | 'ops' | 'permission';
  enabled: boolean;
  rolloutPercentage: number;
  userSegments: string[];
  conditions: FlagCondition[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

interface FlagCondition {
  type: 'user_attribute' | 'environment' | 'time' | 'custom';
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  attribute: string;
  value: any;
}
```

## AI Search Feature Flags

### Primary Flags

```typescript
const aiSearchFlags = {
  // Main feature flag
  'ai-search-enabled': {
    name: 'AI Search Enabled',
    description: 'Enable AI-powered contact search functionality',
    type: 'release',
    enabled: false,
    rolloutPercentage: 0,
    userSegments: ['internal-users'],
    conditions: [
      {
        type: 'user_attribute',
        operator: 'contains',
        attribute: 'email',
        value: '@company.com'
      }
    ]
  },

  // Advanced features
  'ai-search-advanced-options': {
    name: 'AI Search Advanced Options',
    description: 'Enable advanced AI search options and filters',
    type: 'release',
    enabled: false,
    rolloutPercentage: 0,
    userSegments: ['beta-users'],
    conditions: []
  },

  // Service provider flags
  'ai-search-provider-openai': {
    name: 'Use OpenAI for AI Search',
    description: 'Use OpenAI as the AI service provider',
    type: 'ops',
    enabled: true,
    rolloutPercentage: 100,
    userSegments: ['all'],
    conditions: []
  },

  'ai-search-provider-openrouter': {
    name: 'Use OpenRouter for AI Search',
    description: 'Use OpenRouter as the AI service provider',
    type: 'ops',
    enabled: false,
    rolloutPercentage: 0,
    userSegments: ['all'],
    conditions: []
  },

  // Performance flags
  'ai-search-caching': {
    name: 'AI Search Caching',
    description: 'Enable caching for AI search results',
    type: 'ops',
    enabled: true,
    rolloutPercentage: 100,
    userSegments: ['all'],
    conditions: []
  },

  'ai-search-batching': {
    name: 'AI Search Request Batching',
    description: 'Enable batching of AI search requests',
    type: 'ops',
    enabled: false,
    rolloutPercentage: 0,
    userSegments: ['all'],
    conditions: []
  },

  // Cost control flags
  'ai-search-cost-tracking': {
    name: 'AI Search Cost Tracking',
    description: 'Enable detailed cost tracking for AI operations',
    type: 'ops',
    enabled: true,
    rolloutPercentage: 100,
    userSegments: ['all'],
    conditions: []
  },

  'ai-search-rate-limiting': {
    name: 'AI Search Rate Limiting',
    description: 'Enable rate limiting for AI search requests',
    type: 'ops',
    enabled: true,
    rolloutPercentage: 100,
    userSegments: ['all'],
    conditions: []
  }
};
```

### User Segments

```typescript
const userSegments = {
  'internal-users': {
    name: 'Internal Users',
    description: 'Company employees and contractors',
    criteria: [
      {
        type: 'user_attribute',
        operator: 'contains',
        attribute: 'email',
        value: '@company.com'
      }
    ]
  },

  'beta-users': {
    name: 'Beta Users',
    description: 'Early adopters and beta testers',
    criteria: [
      {
        type: 'user_attribute',
        operator: 'equals',
        attribute: 'beta_participant',
        value: true
      }
    ]
  },

  'power-users': {
    name: 'Power Users',
    description: 'Users with high usage patterns',
    criteria: [
      {
        type: 'user_attribute',
        operator: 'greater_than',
        attribute: 'search_count_last_30d',
        value: 50
      }
    ]
  },

  'new-users': {
    name: 'New Users',
    description: 'Users who joined in the last 30 days',
    criteria: [
      {
        type: 'user_attribute',
        operator: 'greater_than',
        attribute: 'created_at',
        value: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      }
    ]
  }
};
```

## Rollout Strategy

### Phase 1: Internal Testing (1% of users)

```typescript
const rolloutPhase1 = {
  name: 'Internal Testing',
  duration: '7 days',
  targetPercentage: 1,
  userSegments: ['internal-users'],
  successCriteria: {
    errorRate: '< 5%',
    averageResponseTime: '< 30s',
    userSatisfaction: '> 4.0/5.0',
    costPerSearch: '< $0.10'
  },
  monitoring: {
    metrics: ['error_rate', 'response_time', 'cost', 'user_feedback'],
    alertThresholds: {
      errorRate: 10,
      responseTime: 45000,
      costSpike: 200
    }
  }
};
```

### Phase 2: Beta Testing (10% of users)

```typescript
const rolloutPhase2 = {
  name: 'Beta Testing',
  duration: '14 days',
  targetPercentage: 10,
  userSegments: ['internal-users', 'beta-users'],
  successCriteria: {
    errorRate: '< 3%',
    averageResponseTime: '< 25s',
    userSatisfaction: '> 4.2/5.0',
    costPerSearch: '< $0.08'
  },
  monitoring: {
    metrics: ['error_rate', 'response_time', 'cost', 'user_feedback', 'adoption_rate'],
    alertThresholds: {
      errorRate: 7,
      responseTime: 35000,
      costSpike: 150
    }
  }
};
```

### Phase 3: Gradual Rollout (25% → 50% → 100%)

```typescript
const rolloutPhase3 = {
  name: 'Gradual Rollout',
  phases: [
    {
      name: '25% Rollout',
      duration: '7 days',
      targetPercentage: 25,
      userSegments: ['all'],
      successCriteria: {
        errorRate: '< 2%',
        averageResponseTime: '< 20s',
        userSatisfaction: '> 4.3/5.0',
        adoptionRate: '> 60%'
      }
    },
    {
      name: '50% Rollout',
      duration: '7 days',
      targetPercentage: 50,
      userSegments: ['all'],
      successCriteria: {
        errorRate: '< 2%',
        averageResponseTime: '< 20s',
        userSatisfaction: '> 4.3/5.0',
        adoptionRate: '> 70%'
      }
    },
    {
      name: '100% Rollout',
      duration: 'ongoing',
      targetPercentage: 100,
      userSegments: ['all'],
      successCriteria: {
        errorRate: '< 1%',
        averageResponseTime: '< 15s',
        userSatisfaction: '> 4.4/5.0',
        adoptionRate: '> 80%'
      }
    }
  ]
};
```

## Flag Implementation

### 1. Flag Service

```typescript
class FeatureFlagService {
  private flags: Map<string, FeatureFlag> = new Map();
  private userSegments: Map<string, UserSegment> = new Map();

  constructor() {
    this.loadFlags();
    this.loadUserSegments();
  }

  async isFlagEnabled(
    flagName: string, 
    userId: string, 
    context?: Record<string, any>
  ): Promise<boolean> {
    const flag = this.flags.get(flagName);
    if (!flag || !flag.enabled) {
      return false;
    }

    // Check user segment eligibility
    const user = await this.getUser(userId);
    if (!this.isUserInSegment(user, flag.userSegments)) {
      return false;
    }

    // Check rollout percentage
    if (!this.isInRolloutPercentage(user, flag.rolloutPercentage)) {
      return false;
    }

    // Check custom conditions
    if (!this.evaluateConditions(flag.conditions, user, context)) {
      return false;
    }

    return true;
  }

  async updateFlag(
    flagName: string, 
    updates: Partial<FeatureFlag>,
    updatedBy: string
  ): Promise<void> {
    const flag = this.flags.get(flagName);
    if (!flag) {
      throw new Error(`Flag ${flagName} not found`);
    }

    const updatedFlag = {
      ...flag,
      ...updates,
      updatedAt: new Date(),
      updatedBy
    };

    this.flags.set(flagName, updatedFlag);
    await this.persistFlag(updatedFlag);
    
    // Log the change
    await this.logFlagChange(flagName, flag, updatedFlag, updatedBy);
    
    // Notify subscribers
    this.notifyFlagChange(flagName, updatedFlag);
  }

  private isUserInSegment(user: User, segments: string[]): boolean {
    return segments.some(segmentName => {
      const segment = this.userSegments.get(segmentName);
      if (!segment) return false;
      
      return segment.criteria.every(criteria => 
        this.evaluateCondition(criteria, user)
      );
    });
  }

  private isInRolloutPercentage(user: User, percentage: number): boolean {
    if (percentage >= 100) return true;
    if (percentage <= 0) return false;
    
    // Use consistent hash based on user ID
    const hash = this.hashUserId(user.id);
    const bucket = hash % 100;
    
    return bucket < percentage;
  }

  private evaluateConditions(
    conditions: FlagCondition[], 
    user: User, 
    context?: Record<string, any>
  ): boolean {
    return conditions.every(condition => 
      this.evaluateCondition(condition, user, context)
    );
  }

  private evaluateCondition(
    condition: FlagCondition, 
    user: User, 
    context?: Record<string, any>
  ): boolean {
    const value = this.getAttributeValue(condition.attribute, user, context);
    
    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'not_equals':
        return value !== condition.value;
      case 'contains':
        return String(value).includes(String(condition.value));
      case 'greater_than':
        return Number(value) > Number(condition.value);
      case 'less_than':
        return Number(value) < Number(condition.value);
      default:
        return false;
    }
  }
}
```

### 2. Client-side Integration

```typescript
// React hook for feature flags
export function useFeatureFlag(flagName: string, context?: Record<string, any>) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    async function checkFlag() {
      if (!user) {
        setIsEnabled(false);
        setLoading(false);
        return;
      }

      try {
        const enabled = await featureFlagService.isFlagEnabled(
          flagName, 
          user.id, 
          context
        );
        setIsEnabled(enabled);
      } catch (error) {
        console.error(`Error checking flag ${flagName}:`, error);
        setIsEnabled(false);
      } finally {
        setLoading(false);
      }
    }

    checkFlag();
  }, [flagName, user, context]);

  return { isEnabled, loading };
}

// Usage in components
export function AISearchComponent() {
  const { isEnabled: aiSearchEnabled } = useFeatureFlag('ai-search-enabled');
  const { isEnabled: advancedOptions } = useFeatureFlag('ai-search-advanced-options');

  if (!aiSearchEnabled) {
    return <div>AI Search is not available</div>;
  }

  return (
    <div>
      <AISearchInterface />
      {advancedOptions && <AdvancedSearchOptions />}
    </div>
  );
}
```

### 3. Server-side Integration

```typescript
// Middleware for feature flag checking
export function featureFlagMiddleware(flagName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = await getUserFromRequest(req);
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const isEnabled = await featureFlagService.isFlagEnabled(
        flagName, 
        user.id, 
        {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date()
        }
      );

      if (!isEnabled) {
        return res.status(403).json({ error: 'Feature not available' });
      }

      // Add flag info to request for downstream use
      (req as any).featureFlags = {
        ...(req as any).featureFlags,
        [flagName]: true
      };

      next();
    } catch (error) {
      console.error(`Feature flag check failed for ${flagName}:`, error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

// Usage in API routes
export async function GET(req: Request) {
  // Check if AI search is enabled for this user
  const isEnabled = await featureFlagService.isFlagEnabled(
    'ai-search-enabled', 
    req.user.id
  );

  if (!isEnabled) {
    return Response.json({ error: 'AI Search not available' }, { status: 403 });
  }

  // Process the request
  const results = await processAISearch(req);
  return Response.json(results);
}
```

## Flag Management Operations

### 1. Rollout Commands

```bash
# Enable flag for internal users (1%)
npm run feature-flag:update --flag=ai-search-enabled --enabled=true --percentage=1 --segment=internal-users

# Expand to beta users (10%)
npm run feature-flag:update --flag=ai-search-enabled --percentage=10 --segment=beta-users

# Gradual rollout to all users
npm run feature-flag:update --flag=ai-search-enabled --percentage=25
npm run feature-flag:update --flag=ai-search-enabled --percentage=50
npm run feature-flag:update --flag=ai-search-enabled --percentage=100

# Emergency rollback
npm run feature-flag:update --flag=ai-search-enabled --enabled=false
```

### 2. Monitoring Commands

```bash
# Check flag status
npm run feature-flag:status --flag=ai-search-enabled

# Get flag usage statistics
npm run feature-flag:stats --flag=ai-search-enabled --period=24h

# List all flags
npm run feature-flag:list

# Get user segment information
npm run feature-flag:segments --segment=beta-users
```

### 3. Testing Commands

```bash
# Test flag for specific user
npm run feature-flag:test --flag=ai-search-enabled --user=user@example.com

# Test rollout percentage
npm run feature-flag:test-rollout --flag=ai-search-enabled --percentage=25

# Validate flag configuration
npm run feature-flag:validate --flag=ai-search-enabled
```

## Emergency Procedures

### 1. Immediate Rollback

```typescript
// Emergency rollback function
export async function emergencyRollback(flagName: string, reason: string) {
  try {
    // Disable the flag immediately
    await featureFlagService.updateFlag(flagName, {
      enabled: false,
      rolloutPercentage: 0
    }, 'emergency_rollback');

    // Log the rollback
    await logEmergencyRollback(flagName, reason);

    // Notify stakeholders
    await notifyEmergencyRollback(flagName, reason);

    // Create incident
    await createIncident({
      type: 'feature_flag_rollback',
      flagName,
      reason,
      timestamp: new Date()
    });

    console.log(`Emergency rollback completed for flag: ${flagName}`);
  } catch (error) {
    console.error(`Emergency rollback failed for flag ${flagName}:`, error);
    throw error;
  }
}
```

### 2. Gradual Rollback

```typescript
// Gradual rollback function
export async function gradualRollback(flagName: string, steps: number[]) {
  const currentFlag = await featureFlagService.getFlag(flagName);
  
  for (const percentage of steps) {
    try {
      await featureFlagService.updateFlag(flagName, {
        rolloutPercentage: percentage
      }, 'gradual_rollback');

      // Wait and monitor
      await new Promise(resolve => setTimeout(resolve, 15 * 60 * 1000)); // 15 minutes

      // Check if rollback should continue
      const metrics = await getFlagMetrics(flagName);
      if (metrics.errorRate > 10) {
        console.log(`High error rate detected, continuing rollback`);
        continue;
      } else {
        console.log(`Error rate acceptable, stopping rollback at ${percentage}%`);
        break;
      }
    } catch (error) {
      console.error(`Rollback step failed for ${percentage}%:`, error);
      // Continue with next step
    }
  }
}
```

## Analytics and Reporting

### 1. Flag Usage Metrics

```typescript
interface FlagMetrics {
  flagName: string;
  totalUsers: number;
  enabledUsers: number;
  enabledPercentage: number;
  userSegments: {
    [segment: string]: {
      total: number;
      enabled: number;
      percentage: number;
    };
  };
  performance: {
    averageResponseTime: number;
    errorRate: number;
    userSatisfaction: number;
  };
  cost: {
    totalCost: number;
    costPerUser: number;
    costPerRequest: number;
  };
  trends: {
    dailyUsage: Array<{ date: string; users: number; requests: number }>;
    errorRates: Array<{ date: string; rate: number }>;
    satisfactionScores: Array<{ date: string; score: number }>;
  };
}
```

### 2. A/B Testing Integration

```typescript
// Experiment configuration
const abTestConfig = {
  'ai-search-provider-comparison': {
    name: 'AI Search Provider Comparison',
    description: 'Compare performance between OpenAI and OpenRouter',
    flagName: 'ai-search-provider-openrouter',
    variants: [
      { name: 'control', weight: 50, provider: 'openai' },
      { name: 'variant', weight: 50, provider: 'openrouter' }
    ],
    successMetrics: [
      'response_time',
      'user_satisfaction',
      'cost_efficiency',
      'search_success_rate'
    ],
    duration: '14 days',
    sampleSize: 1000
  }
};
```

## Best Practices

### 1. Flag Design Principles

- **Clear Naming**: Use descriptive, consistent naming conventions
- **Documentation**: Maintain comprehensive flag documentation
- **Lifecycle Management**: Plan for flag creation, usage, and cleanup
- **Security**: Implement proper access controls for flag management
- **Testing**: Test flag configurations before production deployment

### 2. Rollout Best Practices

- **Gradual Rollout**: Start small and gradually increase percentage
- **Monitoring**: Monitor metrics closely during rollout
- **Rollback Planning**: Have clear rollback procedures
- **Communication**: Keep stakeholders informed during rollout
- **User Feedback**: Collect and analyze user feedback

### 3. Operational Best Practices

- **Regular Audits**: Audit flag usage and cleanup old flags
- **Performance Monitoring**: Monitor flag evaluation performance
- **Backup Systems**: Have backup systems for flag service
- **Documentation**: Keep documentation up to date
- **Training**: Train team on flag management procedures

## Related Documentation

- [Deployment Guide](deployment.md)
- [Monitoring Guide](monitoring.md)
- [Launch Checklist](launch-checklist.md)
- [Incident Response Runbook](../operations/incident-response.md)
- [A/B Testing Guide](../experiments/ab-testing.md)