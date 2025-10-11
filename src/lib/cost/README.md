# Comprehensive Cost Monitoring System

A complete cost tracking, monitoring, and optimization system for AI services in the "Find Contacts with AI" feature. This system provides real-time cost tracking, intelligent alerts, automated optimization recommendations, detailed reporting, and interactive dashboards.

## Features

### 📊 Real-time Cost Tracking
- Track costs for all AI services (OpenAI, Anthropic, Exa, Firecrawl)
- Monitor usage by operation type, user, and provider
- Store comprehensive cost data with metadata
- Automatic cost aggregation and metrics calculation

### 🚨 Intelligent Alerting
- Real-time alerts for cost spikes and anomalies
- Configurable budget thresholds with automated actions
- Multi-channel notifications (email, webhook, Slack)
- Alert cooldown periods to prevent spam

### 🔍 Cost Optimization
- Automated optimization recommendations
- Implement suggestions with one click
- Track potential savings and implementation effort
- Priority-based optimization approach

### 📈 Advanced Analytics
- Detailed cost reports with insights
- Cost forecasting using machine learning
- Trend analysis and pattern detection
- Executive summaries for stakeholders

### 🎨 Interactive Dashboard
- Visual cost metrics and trends
- Provider and operation breakdowns
- Alert management and acknowledgment
- Optimization recommendations interface

## Architecture

The system consists of several integrated components:

```
┌─────────────────────────────────────────────────────────────┐
│                    Cost Integration Layer                    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│  │ Real-time       │ │ Cost            │ │ Cost            │ │
│  │ Alerts Service  │ │ Optimization    │ │ Reporting       │ │
│  │                 │ │ Service         │ │ Service         │ │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│              Comprehensive Cost Tracker                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│  │ AI Cost         │ │ Security Cost   │ │ Database        │ │
│  │ Monitor         │ │ Tracker         │ │ Layer           │ │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                    Storage & Caching                        │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Initialize the System

```typescript
import { setupCostMonitoring } from '@/lib/cost';

// Initialize with default configuration
await setupCostMonitoring();

// Or with custom configuration
await setupCostMonitoring({
  thresholds: {
    daily: 100,
    monthly: 2000,
    perOperation: 2.00,
  },
  alerts: {
    email: {
      enabled: true,
      recipients: ['admin@example.com'],
    },
  },
  optimization: {
    autoImplement: false,
    maxPriority: 'high',
  },
});
```

### 2. Record Costs

```typescript
import { recordAIServiceCost } from '@/lib/cost';

// Record a cost for an AI operation
await recordAIServiceCost({
  userId: 'user123',
  operationType: 'search',
  provider: 'openai',
  model: 'gpt-4',
  tokensUsed: 1500,
  cost: 0.045,
  metadata: {
    query: 'journalists in tech',
    resultCount: 25,
    responseTime: 1200,
  },
});
```

### 3. Use the Middleware

```typescript
import { withCostTracking } from '@/lib/cost';

// Wrap your AI service functions
const enhancedSearchFunction = withCostTracking(
  async (data) => {
    // Your existing search logic
    return await aiSearch(data.query);
  },
  {
    operationType: 'search',
    provider: 'openai',
    model: 'gpt-4',
    getTokenCount: (data, result) => result.tokensUsed,
  }
);
```

### 4. Subscribe to Events

```typescript
import { subscribeToCostEvents } from '@/lib/cost';

const unsubscribe = subscribeToCostEvents({
  onAlert: (alert) => {
    console.log(`Cost alert: ${alert.title}`);
  },
  onBudgetExceeded: (data) => {
    console.log(`Budget exceeded for user ${data.userId}`);
  },
});
```

## Configuration Options

### Thresholds
- `daily`: Maximum daily cost limit
- `monthly`: Maximum monthly cost limit
- `perOperation`: Maximum cost for a single operation
- `anomalyMultiplier`: Multiplier for anomaly detection

### Alerts
- `email`: Email notification settings
- `webhook`: Webhook notification settings
- `slack`: Slack integration settings

### Optimization
- `autoImplement`: Automatically implement recommendations
- `maxPriority`: Maximum priority for auto-implementation

### Reporting
- `schedule`: Automated report generation schedule
- `recipients`: Report recipients list

## Database Schema

The system uses several tables to store cost data:

- `ai_cost_entries`: Individual cost entries with full metadata
- `ai_cost_budgets`: User and system budget configurations
- `ai_cost_alerts`: Alert history and status
- `ai_cost_optimizations`: Optimization recommendations
- `ai_cost_metrics_daily`: Daily aggregated metrics
- `ai_cost_metrics_user_daily`: User-specific daily metrics
- `ai_cost_forecasts`: Cost forecasting data

## API Reference

### Main Functions

#### `setupCostMonitoring(config?)`
Initialize the cost monitoring system with optional configuration.

#### `recordAIServiceCost(data)`
Record a cost for an AI service operation.

#### `getCostOverview()`
Get a complete overview of cost monitoring status.

#### `generateCostReport(options)`
Generate a detailed cost report.

#### `implementCostOptimizations(priority?)`
Implement optimization recommendations.

### Services

#### `comprehensiveCostTracker`
Core cost tracking and analytics service.

#### `realTimeCostAlerts`
Real-time alerting and budget control service.

#### `costOptimizationService`
Cost optimization and recommendation service.

#### `costReportingService`
Report generation and analytics service.

## Dashboard Components

The system includes a comprehensive React dashboard component:

```typescript
import CostDashboard from '@/components/cost/cost-dashboard';

function App() {
  return <CostDashboard />;
}
```

The dashboard provides:
- Cost overview with key metrics
- Interactive charts and visualizations
- Alert management interface
- Optimization recommendations
- Cost forecasting

## Monitoring Script

The enhanced shell script provides command-line cost monitoring:

```bash
# Full cost analysis
./scripts/monitoring/cost-monitor.sh enhanced

# Real-time monitoring
./scripts/monitoring/cost-monitor.sh realtime

# Generate comprehensive report
./scripts/monitoring/cost-monitor.sh comprehensive

# Check for anomalies
./scripts/monitoring/cost-monitor.sh anomaly
```

## Best Practices

### 1. Consistent Cost Recording
- Always record costs for AI operations
- Include relevant metadata for better analysis
- Use the middleware for automatic tracking

### 2. Configure Appropriate Thresholds
- Set realistic thresholds based on usage patterns
- Use different thresholds for different environments
- Regularly review and adjust thresholds

### 3. Monitor Alerts
- Set up appropriate notification channels
- Acknowledge alerts promptly
- Investigate and resolve issues

### 4. Implement Optimizations
- Review recommendations regularly
- Prioritize high-impact optimizations
- Track savings from implemented changes

### 5. Use Reports
- Schedule regular reports for stakeholders
- Use insights for budget planning
- Track cost trends over time

## Troubleshooting

### Common Issues

#### "Cost monitoring system not initialized"
- Ensure you've called `setupCostMonitoring()` before using other functions
- Check for initialization errors in console logs

#### "High number of alerts"
- Review and adjust alert thresholds
- Check for legitimate cost increases
- Implement cooldown periods

#### "Missing cost data"
- Verify cost recording is implemented
- Check database connectivity
- Review error logs

### Debug Mode

Enable debug logging by setting the environment variable:
```bash
export COST_MONITORING_DEBUG=true
```

## Performance Considerations

- Cost recording is designed to be non-blocking
- Database operations are batched where possible
- Caching is used for frequently accessed data
- Background processes handle analytics and reporting

## Security

- All cost data is stored securely
- User access is properly isolated
- Alert configurations are validated
- Webhook endpoints should be secured

## Future Enhancements

- Machine learning for more accurate predictions
- Advanced anomaly detection algorithms
- Additional provider integrations
- Mobile app for cost monitoring
- API for external integrations

## Support

For issues or questions:
1. Check the console logs for error messages
2. Review the troubleshooting section
3. Check the health status using `getCostMonitoringStatus()`
4. Create an issue with detailed information

## License

This cost monitoring system is part of the "Find Contacts with AI" feature and follows the same license terms.