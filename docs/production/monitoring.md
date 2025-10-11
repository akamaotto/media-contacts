# Production Monitoring and Alerting Guide

This document outlines the comprehensive monitoring and alerting strategy for the AI Search feature in production.

## Overview

The AI Search feature requires robust monitoring to ensure optimal performance, cost control, and user experience. This guide covers monitoring setup, alerting rules, dashboards, and incident response procedures.

## Monitoring Architecture

### Components Monitored
1. **Application Layer**
   - API endpoints and response times
   - Error rates and status codes
   - Feature flag performance
   - User interaction metrics

2. **AI Service Layer**
   - External AI service health
   - Response latency and throughput
   - Cost tracking and usage
   - Service-specific metrics

3. **Database Layer**
   - Query performance and optimization
   - Connection pool health
   - Cache hit rates
   - Data integrity checks

4. **Infrastructure Layer**
   - Server health and resources
   - Network performance
   - CDN performance
   - Security events

## Monitoring Configuration

### 1. API Health Monitoring

```typescript
// AI Search specific monitoring rules
const aiSearchMonitoringRules = {
  'ai-search-endpoint': {
    responseTime: {
      threshold: 30000, // 30 seconds for AI operations
      window: '5m',
      alertLevel: 'warning'
    },
    errorRate: {
      threshold: 5, // 5% error rate
      window: '5m',
      alertLevel: 'critical'
    },
    throughput: {
      threshold: 10, // minimum 10 requests per minute
      window: '1m',
      alertLevel: 'warning'
    }
  },
  'ai-extraction-endpoint': {
    responseTime: {
      threshold: 10000, // 10 seconds for extraction
      window: '5m',
      alertLevel: 'warning'
    },
    errorRate: {
      threshold: 10, // 10% error rate for extraction
      window: '5m',
      alertLevel: 'critical'
    }
  }
};
```

### 2. AI Service Monitoring

```typescript
// External AI service monitoring
const aiServiceMonitoring = {
  openai: {
    endpoint: 'https://api.openai.com/v1',
    healthCheck: '/engines',
    timeout: 5000,
    expectedResponseTime: 2000,
    costTracking: true
  },
  openrouter: {
    endpoint: 'https://openrouter.ai/api/v1',
    healthCheck: '/models',
    timeout: 5000,
    expectedResponseTime: 3000,
    costTracking: true
  },
  anthropic: {
    endpoint: 'https://api.anthropic.com/v1',
    healthCheck: '/messages',
    timeout: 5000,
    expectedResponseTime: 2500,
    costTracking: true
  }
};
```

### 3. Database Monitoring

```typescript
// Database performance monitoring
const databaseMonitoring = {
  connectionPool: {
    maxConnections: 20,
    warningThreshold: 80, // 80% usage
    criticalThreshold: 95 // 95% usage
  },
  queryPerformance: {
    slowQueryThreshold: 100, // 100ms
    criticalQueryThreshold: 1000, // 1 second
    logSlowQueries: true
  },
  cacheMetrics: {
    hitRateThreshold: 70, // 70% minimum hit rate
    memoryUsageThreshold: 80 // 80% memory usage
  }
};
```

## Alerting Rules

### Critical Alerts (Immediate Action Required)

```yaml
critical_alerts:
  - name: "AI Search Service Down"
    condition: "ai_service_availability == 0"
    duration: "1m"
    action: "immediate_rollback"
    notification: ["pagerduty", "slack", "email"]
    
  - name: "High Error Rate"
    condition: "error_rate > 10%"
    duration: "2m"
    action: "investigate_and_rollback"
    notification: ["pagerduty", "slack"]
    
  - name: "Cost Spike"
    condition: "hourly_cost > budget * 2"
    duration: "15m"
    action: "disable_feature"
    notification: ["slack", "email"]
    
  - name: "Database Connection Exhaustion"
    condition: "connection_pool_usage > 95%"
    duration: "1m"
    action: "scale_or_rollback"
    notification: ["pagerduty", "slack"]
```

### Warning Alerts (Monitor Closely)

```yaml
warning_alerts:
  - name: "Slow AI Search Response"
    condition: "ai_search_p95_response_time > 25s"
    duration: "5m"
    action: "monitor_and_optimize"
    notification: ["slack"]
    
  - name: "Elevated Error Rate"
    condition: "error_rate > 5%"
    duration: "5m"
    action: "investigate"
    notification: ["slack"]
    
  - name: "High Cost Usage"
    condition: "daily_cost > budget * 1.2"
    duration: "1h"
    action: "review_usage"
    notification: ["slack", "email"]
    
  - name: "Low Cache Hit Rate"
    condition: "cache_hit_rate < 60%"
    duration: "30m"
    action: "optimize_cache"
    notification: ["slack"]
```

### Info Alerts (Informational)

```yaml
info_alerts:
  - name: "Feature Flag Change"
    condition: "feature_flag_updated"
    duration: "0m"
    action: "log_change"
    notification: ["slack"]
    
  - name: "High Usage Period"
    condition: "requests_per_minute > baseline * 2"
    duration: "10m"
    action: "monitor_performance"
    notification: ["slack"]
    
  - name: "New User Milestone"
    condition: "active_users_reached_milestone"
    duration: "0m"
    action: "celebrate"
    notification: ["slack"]
```

## Dashboards

### 1. System Overview Dashboard

```typescript
interface SystemOverviewDashboard {
  metrics: {
    overallHealth: 'healthy' | 'degraded' | 'critical';
    uptime: number; // percentage
    totalRequests: number;
    errorRate: number; // percentage
    averageResponseTime: number; // milliseconds
    activeUsers: number;
    dailyCost: number; // USD
  };
  alerts: {
    critical: number;
    warning: number;
    info: number;
  };
  status: {
    api: 'up' | 'down' | 'degraded';
    database: 'up' | 'down' | 'degraded';
    aiServices: Record<string, 'up' | 'down' | 'degraded'>;
    cache: 'up' | 'down' | 'degraded';
  };
}
```

### 2. AI Service Performance Dashboard

```typescript
interface AIServiceDashboard {
  services: {
    [serviceName: string]: {
      availability: number; // percentage
      averageResponseTime: number; // milliseconds
      requestsPerMinute: number;
      errorRate: number; // percentage
      costPerRequest: number; // USD
      totalCost: number; // USD
      lastRequest: Date;
    };
  };
  metrics: {
    totalCost: number;
    totalRequests: number;
    averageResponseTime: number;
    overallErrorRate: number;
  };
  trends: {
    costOverTime: Array<{ time: Date; cost: number }>;
    responseTimeOverTime: Array<{ time: Date; responseTime: number }>;
    requestVolumeOverTime: Array<{ time: Date; requests: number }>;
  };
}
```

### 3. User Experience Dashboard

```typescript
interface UserExperienceDashboard {
  metrics: {
    searchSuccessRate: number; // percentage
    averageSearchTime: number; // milliseconds
    userSatisfactionScore: number; // 1-5
    featureAdoptionRate: number; // percentage
    supportTicketVolume: number;
  };
  segments: {
    internalUsers: {
      count: number;
      satisfactionScore: number;
      featureUsage: number;
    };
    betaUsers: {
      count: number;
      satisfactionScore: number;
      featureUsage: number;
    };
    allUsers: {
      count: number;
      satisfactionScore: number;
      featureUsage: number;
    };
  };
  feedback: {
    positiveComments: number;
    negativeComments: number;
    featureRequests: Array<string>;
    commonIssues: Array<string>;
  };
}
```

## Monitoring Implementation

### 1. Health Check Endpoints

```typescript
// /api/health/ai-search
export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      openai: await checkOpenAIHealth(),
      openrouter: await checkOpenRouterHealth(),
      anthropic: await checkAnthropicHealth()
    },
    metrics: {
      responseTime: await getAverageResponseTime(),
      errorRate: await getErrorRate(),
      costToday: await getTodayCost()
    },
    featureFlags: await getFeatureFlagStatus()
  };
  
  return Response.json(health);
}

// /api/health/detailed
export async function GET() {
  const detailedHealth = {
    ...basicHealth,
    database: await getDatabaseHealth(),
    cache: await getCacheHealth(),
    performance: await getPerformanceMetrics(),
    alerts: await getActiveAlerts()
  };
  
  return Response.json(detailedHealth);
}
```

### 2. Metrics Collection

```typescript
// Custom metrics for AI search
const aiSearchMetrics = {
  // Counter for search requests
  searchRequests: new Counter({
    name: 'ai_search_requests_total',
    help: 'Total number of AI search requests',
    labelNames: ['service', 'status', 'user_segment']
  }),
  
  // Histogram for response times
  searchDuration: new Histogram({
    name: 'ai_search_duration_seconds',
    help: 'AI search request duration in seconds',
    labelNames: ['service', 'operation'],
    buckets: [1, 5, 10, 15, 30, 60, 120]
  }),
  
  // Gauge for costs
  searchCost: new Gauge({
    name: 'ai_search_cost_dollars',
    help: 'Cost of AI search requests in dollars',
    labelNames: ['service', 'user_id']
  }),
  
  // Counter for errors
  searchErrors: new Counter({
    name: 'ai_search_errors_total',
    help: 'Total number of AI search errors',
    labelNames: ['service', 'error_type', 'user_segment']
  })
};
```

### 3. Alert Integration

```typescript
// Alert manager integration
class AISearchAlertManager {
  async checkAndSendAlerts() {
    const metrics = await this.collectMetrics();
    const alerts = this.evaluateAlertRules(metrics);
    
    for (const alert of alerts) {
      await this.sendAlert(alert);
    }
  }
  
  private evaluateAlertRules(metrics: any): Alert[] {
    const alerts: Alert[] = [];
    
    // Check error rates
    if (metrics.errorRate > 10) {
      alerts.push({
        type: 'critical',
        message: `High error rate detected: ${metrics.errorRate}%`,
        metric: 'error_rate',
        value: metrics.errorRate,
        threshold: 10
      });
    }
    
    // Check response times
    if (metrics.averageResponseTime > 25000) {
      alerts.push({
        type: 'warning',
        message: `Slow response time detected: ${metrics.averageResponseTime}ms`,
        metric: 'response_time',
        value: metrics.averageResponseTime,
        threshold: 25000
      });
    }
    
    // Check costs
    if (metrics.hourlyCost > this.budgetThreshold) {
      alerts.push({
        type: 'critical',
        message: `Cost spike detected: $${metrics.hourlyCost}/hour`,
        metric: 'hourly_cost',
        value: metrics.hourlyCost,
        threshold: this.budgetThreshold
      });
    }
    
    return alerts;
  }
}
```

## Incident Response

### 1. Alert Triage Process

```typescript
interface IncidentResponse {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'performance' | 'availability' | 'cost' | 'security';
  status: 'new' | 'investigating' | 'resolved' | 'closed';
  assignee?: string;
  timeline: Array<{
    timestamp: Date;
    action: string;
    performer: string;
  }>;
  resolution?: {
    rootCause: string;
    correctiveAction: string;
    preventiveAction: string;
  };
}
```

### 2. Escalation Rules

```yaml
escalation_rules:
  critical:
    level_1: # 0-5 minutes
      - on_call_engineer
      - devops_lead
    level_2: # 5-15 minutes
      - engineering_manager
      - product_manager
    level_3: # 15-30 minutes
      - cto
      - vp_engineering
      
  high:
    level_1: # 0-15 minutes
      - on_call_engineer
      - devops_lead
    level_2: # 15-60 minutes
      - engineering_manager
      
  medium:
    level_1: # 0-60 minutes
      - on_call_engineer
    level_2: # 1-4 hours
      - team_lead
```

### 3. Runbooks

```markdown
# High Error Rate Runbook

## Symptoms
- Error rate > 10% for more than 2 minutes
- User complaints about search failures
- Dashboard shows red status

## Immediate Actions
1. Check feature flag status
2. Verify AI service availability
3. Review recent deployments
4. Check database connectivity

## Investigation Steps
1. Review error logs
2. Check AI service quotas
3. Monitor system resources
4. Analyze user impact

## Resolution Steps
1. If AI service issue: switch to backup provider
2. If database issue: trigger failover
3. If application issue: rollback deployment
4. If resource issue: scale infrastructure

## Prevention
1. Implement better error handling
2. Add more comprehensive monitoring
3. Improve backup systems
4. Update alert thresholds
```

## Monitoring Tools and Integration

### 1. Tool Stack

```yaml
monitoring_stack:
  metrics:
    - prometheus
    - grafana
    - custom_metrics_collector
    
  logging:
    - elk_stack
    - structured_logging
    - log_aggregation
    
  alerting:
    - pagerduty
    - slack
    - email_notifications
    - custom_alert_manager
    
  tracing:
    - jaeger
    - opentelemetry
    - distributed_tracing
    
  uptime:
    - pingdom
    - uptime_robot
    - custom_health_checks
```

### 2. Integration Configuration

```typescript
// Prometheus configuration
const prometheusConfig = {
  scrapeInterval: '15s',
  evaluationInterval: '15s',
  rules: [
    {
      alert: 'AISearchHighErrorRate',
      expr: 'rate(ai_search_errors_total[5m]) > 0.1',
      for: '2m',
      labels: { severity: 'critical' },
      annotations: {
        summary: 'AI search error rate is high',
        description: 'AI search error rate is {{ $value }} errors per second'
      }
    }
  ]
};

// Grafana dashboard configuration
const grafanaDashboard = {
  title: 'AI Search Monitoring',
  panels: [
    {
      title: 'Request Rate',
      type: 'graph',
      targets: [
        {
          expr: 'rate(ai_search_requests_total[5m])',
          legendFormat: '{{ service }}'
        }
      ]
    },
    {
      title: 'Error Rate',
      type: 'graph',
      targets: [
        {
          expr: 'rate(ai_search_errors_total[5m]) / rate(ai_search_requests_total[5m])',
          legendFormat: 'Error Rate'
        }
      ]
    }
  ]
};
```

## Performance Baselines

### 1. Expected Performance Metrics

```typescript
const performanceBaselines = {
  api: {
    responseTime: {
      p50: 200, // milliseconds
      p95: 500,
      p99: 1000
    },
    errorRate: 1, // percentage
    throughput: 100 // requests per minute
  },
  aiServices: {
    responseTime: {
      p50: 5000, // milliseconds
      p95: 20000,
      p99: 30000
    },
    errorRate: 5, // percentage
    costPerRequest: 0.05 // USD
  },
  database: {
    queryTime: {
      p50: 50, // milliseconds
      p95: 100,
      p99: 200
    },
    connectionPoolUsage: 70, // percentage
    cacheHitRate: 80 // percentage
  }
};
```

### 2. Monitoring SLOs

```yaml
service_level_objectives:
  availability:
    target: 99.9%
    measurement: "uptime_percentage"
    window: "30d"
    
  performance:
    target: 95%
    measurement: "requests_under_30s"
    window: "7d"
    
  cost_efficiency:
    target: "$0.10 per search"
    measurement: "cost_per_search"
    window: "1d"
    
  user_satisfaction:
    target: 4.0/5.0
    measurement: "satisfaction_score"
    window: "7d"
```

## Related Documentation

- [Deployment Guide](deployment.md)
- [Feature Flag Management](feature-flags.md)
- [Cost Tracking Guide](../operations/cost-tracking.md)
- [Incident Response Runbook](../operations/incident-response.md)
- [AI Search API Documentation](../developer/ai-search-api.md)