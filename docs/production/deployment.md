# Production Deployment Guide

This document outlines the comprehensive deployment process for the AI Search feature in the Media Contacts application.

## Overview

The AI Search feature requires careful deployment planning to ensure smooth rollout with minimal disruption to existing services. This guide covers pre-deployment requirements, deployment steps, monitoring, and rollback procedures.

## Pre-Deployment Checklist

### Environment Preparation
- [ ] All environment variables are configured in production
- [ ] Database migrations are applied and verified
- [ ] External AI service API keys are valid and have sufficient quotas
- [ ] SSL certificates are valid and renewed
- [ ] CDN configuration is updated if needed
- [ ] Backup procedures are tested and verified

### Testing Requirements
- [ ] All unit tests pass (`npm run test:unit`)
- [ ] Integration tests pass (`npm run test:integration`)
- [ ] E2E tests pass (`npm run test:e2e`)
- [ ] Performance benchmarks meet targets
- [ ] Security scan completed with no critical issues
- [ ] Load testing completed successfully

### Feature Flags
- [ ] AI search feature flags are configured for gradual rollout
- [ ] Internal user segment is configured (1% rollout)
- [ ] Beta user segment is configured (10% rollout)
- [ ] Feature flag monitoring is set up

## Environment Variables

### Required Environment Variables

```bash
# AI Service Configuration
OPENAI_API_KEY=your_openai_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key

# Feature Flags
NEXT_PUBLIC_AI_SEARCH_ENABLED=false
NEXT_PUBLIC_AI_SEARCH_ROLLOUT_PERCENTAGE=0
AI_SEARCH_INTERNAL_USERS=true
AI_SEARCH_BETA_USERS=false

# Monitoring and Logging
ENABLE_AI_SEARCH_MONITORING=true
AI_SEARCH_LOG_LEVEL=info
COST_TRACKING_ENABLED=true

# Performance
AI_SEARCH_CACHE_TTL=3600
AI_SEARCH_MAX_CONCURRENT_REQUESTS=10
AI_SEARCH_TIMEOUT=30000

# Security
AI_SEARCH_RATE_LIMIT=100
AI_SEARCH_MAX_TOKENS_PER_REQUEST=4000
```

## Deployment Steps

### Phase 1: Staging Deployment

1. **Deploy to Staging Environment**
   ```bash
   # Build and deploy to staging
   npm run build
   vercel deploy --env .env.staging
   ```

2. **Run Staging Validation**
   ```bash
   # Run smoke tests
   npm run test:smoke:staging
   
   # Validate AI service connections
   npm run test:ai-services:staging
   
   # Check feature flags
   npm run validate:feature-flags:staging
   ```

3. **Performance Validation**
   ```bash
   # Run performance tests
   npm run test:performance:staging
   
   # Validate response times
   npm run validate:response-times:staging
   ```

### Phase 2: Production Deployment

1. **Deploy with Feature Flags Disabled**
   ```bash
   # Deploy to production with AI search disabled
   vercel deploy --prod --env .env.production
   ```

2. **Verify Deployment**
   ```bash
   # Check application health
   npm run health-check:production
   
   # Verify existing functionality
   npm run test:regression:production
   ```

3. **Enable Internal User Rollout (1%)**
   ```bash
   # Update feature flags
   npm run feature-flag:update --flag=ai-search-enabled --value=true --percentage=1 --segment=internal-users
   ```

4. **Monitor for 24 Hours**
   - Check error rates
   - Monitor AI service costs
   - Validate search functionality
   - Review system performance

5. **Enable Beta User Rollout (10%)**
   ```bash
   # Expand rollout to beta users
   npm run feature-flag:update --flag=ai-search-enabled --percentage=10 --segment=beta-users
   ```

6. **Monitor for 48 Hours**
   - Extended monitoring of all metrics
   - User feedback collection
   - Performance validation

7. **Gradual Full Rollout**
   ```bash
   # Gradual rollout to all users
   npm run feature-flag:update --flag=ai-search-enabled --percentage=25
   # Monitor 24 hours
   
   npm run feature-flag:update --flag=ai-search-enabled --percentage=50
   # Monitor 24 hours
   
   npm run feature-flag:update --flag=ai-search-enabled --percentage=100
   ```

## Rollback Procedures

### Immediate Rollback (Critical Issues)

1. **Disable Feature Flags**
   ```bash
   # Immediately disable AI search
   npm run feature-flag:update --flag=ai-search-enabled --value=false
   ```

2. **Verify System Stability**
   ```bash
   # Check system health
   npm run health-check:production
   
   # Monitor error rates
   npm run monitor:errors:production
   ```

3. **Investigate Issues**
   - Review logs for error patterns
   - Check AI service status
   - Analyze performance metrics
   - Document root cause

### Full Rollback (Deployment Issues)

1. **Rollback to Previous Deployment**
   ```bash
   # Identify last stable deployment
   vercel ls
   
   # Rollback to previous version
   vercel rollback [deployment-url]
   ```

2. **Validate Rollback**
   ```bash
   # Run regression tests
   npm run test:regression:production
   
   # Verify all functionality
   npm run test:smoke:production
   ```

3. **Communicate with Stakeholders**
   - Notify development team
   - Inform product management
   - Update status dashboards
   - Document rollback reasons

## Monitoring During Deployment

### Key Metrics to Monitor

1. **Error Rates**
   - API error rate should remain < 1%
   - AI service error rate should remain < 5%
   - Database error rate should remain < 0.1%

2. **Response Times**
   - API response time should remain < 200ms
   - AI search response time should remain < 30s
   - Database query time should remain < 100ms

3. **Cost Metrics**
   - AI service costs should remain within budget
   - Cost per search should remain < $0.10
   - Daily cost should not exceed 120% of baseline

4. **User Experience**
   - Search success rate should remain > 90%
   - User satisfaction scores should remain > 4.0/5.0
   - Support ticket volume should not increase significantly

### Alert Thresholds

```yaml
alerts:
  high_error_rate:
    threshold: 5%
    duration: 5m
    action: notify_dev_team
    
  slow_response_time:
    threshold: 2s
    duration: 10m
    action: notify_dev_team
    
  cost_spike:
    threshold: 150% of baseline
    duration: 1h
    action: notify_product_team
    
  ai_service_failure:
    threshold: 10% error rate
    duration: 5m
    action: immediate_rollback
```

## Post-Deployment Tasks

### Verification Checklist
- [ ] All monitoring dashboards are updated
- [ ] Alert configurations are verified
- [ ] Documentation is updated with deployment notes
- [ ] Team is notified of successful deployment
- [ ] User feedback collection is initiated
- [ ] Performance baseline is established

### Documentation Updates
- Update deployment runbook with lessons learned
- Document any configuration changes
- Update monitoring procedures
- Add new alerting rules if needed

## Troubleshooting

### Common Issues and Solutions

1. **AI Service Timeouts**
   - Check API key validity
   - Verify service quotas
   - Increase timeout values
   - Implement retry logic

2. **High Error Rates**
   - Check feature flag configuration
   - Verify AI service availability
   - Review recent code changes
   - Check database connectivity

3. **Performance Degradation**
   - Monitor resource utilization
   - Check cache hit rates
   - Review query performance
   - Analyze bundle size impact

4. **Cost Overruns**
   - Review usage patterns
   - Implement caching strategies
   - Adjust rate limits
   - Optimize search algorithms

## Contact Information

### Emergency Contacts
- **DevOps Lead**: [contact information]
- **Engineering Manager**: [contact information]
- **Product Manager**: [contact information]
- **AI Service Providers**: [support contacts]

### escalation Procedures
1. **Level 1**: On-call engineer (0-30 minutes)
2. **Level 2**: DevOps lead (30-60 minutes)
3. **Level 3**: Engineering manager (1-2 hours)
4. **Level 4**: CTO (critical incidents only)

## Related Documentation

- [Monitoring and Alerting Guide](monitoring.md)
- [Feature Flag Management](feature-flags.md)
- [Launch Checklist](launch-checklist.md)
- [AI Search API Documentation](../developer/ai-search-api.md)
- [Cost Tracking Guide](../operations/cost-tracking.md)