# AI Search Feature Deployment Guide

This guide provides comprehensive instructions for deploying the "Find Contacts with AI" feature to production.

## Overview

The AI Search Feature deployment infrastructure includes:

- Automated CI/CD pipeline with GitHub Actions
- Environment-specific configurations
- Database migration scripts
- Health monitoring and alerting
- Feature flag management for gradual rollout
- Cost monitoring and controls
- Comprehensive rollback procedures
- Secure secrets management

## Prerequisites

Before deploying the AI Search Feature to production, ensure you have:

1. **Access Requirements**:
   - Admin access to the GitHub repository
   - Access to production database and infrastructure
   - Permission to manage GitHub Actions secrets
   - Access to monitoring and alerting systems

2. **Infrastructure Requirements**:
   - PostgreSQL database (version 15+)
   - Redis server (version 7+)
   - Node.js 18+ runtime environment
   - Sufficient server resources (CPU, memory, disk space)

3. **API Keys and Services**:
   - OpenAI API key with appropriate permissions
   - Anthropic API key with appropriate permissions
   - Exa API key for search functionality
   - Firecrawl API key for web crawling
   - Webhook URLs for notifications

## Deployment Process

### 1. Setup Environment Configuration

1. **Generate Secure Secrets**:
   ```bash
   cd scripts/deployment
   ./secure-secrets.sh generate
   ```

2. **Configure Production Environment**:
   - Copy generated secure values to your secret management system
   - Update `.env.production` with actual API keys and configuration
   - Set up GitHub Actions secrets using the provided guide

3. **Validate Configuration**:
   ```bash
   ./secure-secrets.sh validate
   ```

### 2. Database Preparation

1. **Run Database Migrations**:
   ```bash
   ./database-migrate.sh migrate
   ```

2. **Verify Database Schema**:
   ```bash
   ./database-migrate.sh verify
   ```

3. **Run Post-Migration Scripts**:
   ```bash
   psql $DATABASE_URL < scripts/deployment/post-migration.sql
   ```

### 3. Staging Deployment

1. **Deploy to Staging**:
   ```bash
   ./staging-deploy.sh deploy
   ```

2. **Run Staging Tests**:
   ```bash
   npm run test:e2e:smoke
   npm run test:integration:external
   ```

3. **Verify Staging Health**:
   ```bash
   ./scripts/monitoring/health-check.sh full
   ```

### 4. Production Deployment

1. **Automated Deployment via GitHub Actions**:
   - Push to main branch or create a release tag
   - GitHub Actions will automatically trigger the deployment pipeline
   - Monitor the deployment progress in the Actions tab

2. **Manual Deployment (if needed)**:
   ```bash
   ./production-deploy.sh deploy
   ```

3. **Verify Production Health**:
   ```bash
   ./scripts/monitoring/health-check.sh full
   ```

## Feature Flag Management

### Gradual Rollout Strategy

1. **Internal Testing (5% rollout)**:
   ```bash
   ./scripts/feature-flags/manage-flags.sh rollout 5 5 300
   ```

2. **Beta Release (25% rollout)**:
   ```bash
   ./scripts/feature-flags/manage-flags.sh rollout 25 5 300
   ```

3. **Limited Rollout (50% rollout)**:
   ```bash
   ./scripts/feature-flags/manage-flags.sh rollout 50 10 600
   ```

4. **Full Rollout (100% rollout)**:
   ```bash
   ./scripts/feature-flags/manage-flags.sh enable
   ```

### Feature Flag Commands

- **Check Status**:
  ```bash
  ./scripts/feature-flags/manage-flags.sh status
  ```

- **Emergency Disable**:
  ```bash
  ./scripts/feature-flags/manage-flags.sh emergency-disable
  ```

- **Configure A/B Testing**:
  ```bash
  ./scripts/feature-flags/manage-flags.sh configure-ab
  ```

## Monitoring and Alerting

### Health Monitoring

1. **Run Health Checks**:
   ```bash
   ./scripts/monitoring/health-check.sh full
   ```

2. **Monitor Specific Components**:
   ```bash
   ./scripts/monitoring/health-check.sh app    # Application health
   ./scripts/monitoring/health-check.sh db     # Database health
   ./scripts/monitoring/health-check.sh ai     # AI services health
   ```

### Cost Monitoring

1. **Monitor Costs**:
   ```bash
   ./scripts/monitoring/cost-monitor.sh full
   ```

2. **Check Specific Service Costs**:
   ```bash
   ./scripts/monitoring/cost-monitor.sh openai      # OpenAI costs
   ./scripts/monitoring/cost-monitor.sh anthropic   # Anthropic costs
   ```

### Post-Launch Monitoring

1. **Comprehensive Monitoring**:
   ```bash
   ./scripts/monitoring/post-launch-monitor.sh full
   ```

2. **Monitor Specific Areas**:
   ```bash
   ./scripts/monitoring/post-launch-monitor.sh performance
   ./scripts/monitoring/post-launch-monitor.sh usage
   ./scripts/monitoring/post-launch-monitor.sh errors
   ```

## Rollback Procedures

### Emergency Rollback

1. **Immediate Rollback**:
   ```bash
   ./scripts/deployment/rollback.sh "Critical performance issues" production
   ```

2. **Via GitHub Actions**:
   - Go to Actions tab in GitHub
   - Select "Production Deployment" workflow
   - Click "Run workflow"
   - Check "Rollback to previous version" option

### Rollback Verification

1. **Verify Rollback Success**:
   ```bash
   ./scripts/monitoring/health-check.sh full
   ```

2. **Check Feature Flags**:
   ```bash
   ./scripts/feature-flags/manage-flags.sh status
   ```

## Troubleshooting

### Common Issues

1. **Database Connection Issues**:
   - Verify `DATABASE_URL` is correct
   - Check database server is running
   - Ensure network connectivity

2. **API Key Issues**:
   - Verify API keys are correctly set
   - Check API service status
   - Validate API key permissions

3. **Performance Issues**:
   - Check resource utilization
   - Review database query performance
   - Monitor AI service response times

### Debug Commands

1. **Check Application Logs**:
   ```bash
   # If using PM2
   pm2 logs media-contacts
   
   # If using systemd
   journalctl -u media-contacts -f
   ```

2. **Database Debugging**:
   ```bash
   # Check connection
   psql $DATABASE_URL -c "SELECT 1;"
   
   # Check query performance
   psql $DATABASE_URL -c "SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"
   ```

3. **API Debugging**:
   ```bash
   # Test health endpoint
   curl -f http://localhost:3000/api/health
   
   # Test AI search endpoint
   curl -f http://localhost:3000/api/ai/search/health
   ```

## Security Considerations

### Secret Management

1. **Never commit secrets to version control**
2. **Use GitHub Actions secrets for CI/CD**
3. **Rotate secrets regularly**
4. **Limit access to secrets to necessary team members**

### Environment Security

1. **Use HTTPS in production**
2. **Enable security headers**
3. **Implement rate limiting**
4. **Monitor for unusual activity**

## Performance Optimization

### Database Optimization

1. **Monitor query performance**
2. **Optimize slow queries**
3. **Maintain appropriate indexes**
4. **Regular database maintenance**

### Application Optimization

1. **Enable response compression**
2. **Implement caching strategies**
3. **Monitor memory usage**
4. **Optimize AI service calls**

## Maintenance

### Regular Tasks

1. **Daily**:
   - Monitor health checks
   - Review cost metrics
   - Check error rates

2. **Weekly**:
   - Review performance metrics
   - Update feature flags if needed
   - Check backup integrity

3. **Monthly**:
   - Rotate API keys if needed
   - Review and update documentation
   - Perform security audits

### Backup Procedures

1. **Database Backups**:
   - Automated daily backups
   - Verify backup integrity
   - Test restore procedures

2. **Configuration Backups**:
   - Backup environment configurations
   - Document configuration changes
   - Version control infrastructure as code

## Support and Escalation

### Contact Information

- **Technical Lead**: [Contact information]
- **DevOps Team**: [Contact information]
- **Product Manager**: [Contact information]

### Escalation Procedures

1. **Level 1**: Monitor alerts and attempt automated recovery
2. **Level 2**: Notify technical team and begin investigation
3. **Level 3**: Escalate to senior leadership if critical

## Documentation

- **API Documentation**: `/docs/api`
- **Architecture Documentation**: `/docs/architecture`
- **Monitoring Documentation**: `/docs/monitoring`
- **Security Documentation**: `/docs/security`

## Appendix

### Environment Variables Reference

See `.env.production` for a complete list of environment variables and their descriptions.

### Script Reference

All deployment and management scripts are located in the `scripts/` directory:

- `scripts/deployment/` - Deployment and migration scripts
- `scripts/monitoring/` - Health and performance monitoring
- `scripts/feature-flags/` - Feature flag management

### GitHub Actions Workflows

- `.github/workflows/production-deploy.yml` - Production deployment pipeline
- `.github/workflows/integration-tests.yml` - Integration test pipeline
- `.github/workflows/e2e-tests.yml` - End-to-end test pipeline