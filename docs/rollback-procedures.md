# Rollback Procedures for AI Search Feature

This document provides comprehensive rollback procedures for the "Find Contacts with AI" feature launch. It covers different rollback scenarios, step-by-step instructions, and verification procedures.

## Table of Contents

1. [Overview](#overview)
2. [Rollback Components](#rollback-components)
3. [Rollback Scenarios](#rollback-scenarios)
4. [Quick Reference](#quick-reference)
5. [Detailed Procedures](#detailed-procedures)
6. [Verification Procedures](#verification-procedures)
7. [Communication Templates](#communication-templates)
8. [Post-Rollback Analysis](#post-rollback-analysis)

## Overview

The AI Search feature consists of multiple components that may need to be rolled back independently or together:

- **Application Code**: The Next.js application code
- **Database Schema**: AI-related tables and schema changes
- **Feature Flags**: Configuration flags controlling feature availability
- **External Services**: AI service integrations (OpenAI, Anthropic, Exa, Firecrawl)

### Rollback Objectives

- Minimize user impact during rollback
- Ensure data integrity
- Restore system stability
- Maintain security
- Provide clear communication

### Rollback Principles

1. **Safety First**: Always create backups before making changes
2. **Incremental**: Roll back components in the correct order
3. **Verification**: Verify each step before proceeding
4. **Communication**: Keep stakeholders informed throughout
5. **Documentation**: Record all actions and outcomes

## Rollback Components

### 1. Application Rollback

**Location**: `scripts/deployment/rollback-enhanced.sh`

**Purpose**: Rollback application code to a previous stable version

**Components**:
- Git repository checkout
- Application build
- Service restart
- Health verification

### 2. Database Rollback

**Location**: `scripts/deployment/rollback-database.sh`

**Purpose**: Rollback database schema and data changes

**Components**:
- Database backup
- Schema rollback
- Data integrity verification
- Performance optimization

### 3. Feature Flag Rollback

**Location**: `scripts/deployment/rollback-feature-flags.sh`

**Purpose**: Disable feature flags to control feature availability

**Components**:
- Flag state backup
- Flag disabling
- Cache clearing
- Verification

### 4. External Service Rollback

**Location**: `scripts/deployment/rollback-external-services.sh`

**Purpose**: Disable external AI service integrations

**Components**:
- Service configuration backup
- Service disabling
- API key rotation
- Cache clearing

## Rollback Scenarios

### Scenario 1: Full Emergency Rollback

**When to Use**: Critical issues affecting all users

**Components**: All components

**Impact**: Complete removal of AI Search feature

**Estimated Time**: 15-30 minutes

### Scenario 2: Partial Rollback - Database Issues

**When to Use**: Database-related problems only

**Components**: Database only

**Impact**: AI Search data is lost, application remains

**Estimated Time**: 10-20 minutes

### Scenario 3: Partial Rollback - Feature Flag Issues

**When to Use**: Feature availability problems

**Components**: Feature flags only

**Impact**: AI Search features disabled, data preserved

**Estimated Time**: 5-10 minutes

### Scenario 4: Partial Rollback - External Service Issues

**When to Use**: External service problems (cost, performance, errors)

**Components**: External services only

**Impact**: AI functionality disabled, data preserved

**Estimated Time**: 5-15 minutes

### Scenario 5: Gradual Rollback

**When to Use**: Non-critical issues, minimize disruption

**Components**: Feature flags with gradual reduction

**Impact**: Gradual reduction of AI Search availability

**Estimated Time**: 30-60 minutes

## Quick Reference

### Emergency Rollback Commands

```bash
# Full emergency rollback
./scripts/deployment/rollback-enhanced.sh "Critical performance issues" full production

# Database-only rollback
./scripts/deployment/rollback-database.sh "Data corruption" safe

# Feature flag rollback
./scripts/deployment/rollback-feature-flags.sh "User feedback issues" all

# External service rollback
./scripts/deployment/rollback-external-services.sh "Cost overruns" all
```

### Monitoring Commands

```bash
# Start rollback monitoring
./scripts/deployment/monitor-rollback.sh <rollback_id> /tmp/monitoring-config.json

# Test rollback procedures
./scripts/deployment/test-rollback.sh comprehensive
```

### Key Files

- `scripts/deployment/rollback-enhanced.sh` - Main rollback script
- `scripts/deployment/rollback-database.sh` - Database rollback
- `scripts/deployment/rollback-feature-flags.sh` - Feature flag rollback
- `scripts/deployment/rollback-external-services.sh` - External service rollback
- `scripts/deployment/test-rollback.sh` - Testing framework
- `scripts/deployment/monitor-rollback.sh` - Monitoring system

## Detailed Procedures

### Procedure 1: Full Emergency Rollback

**Prerequisites**:
- Access to production servers
- Database admin privileges
- Feature flag admin access
- Notification channels configured

**Steps**:

1. **Assess Situation**
   - Identify the issue and impact
   - Determine if full rollback is necessary
   - Communicate with stakeholders

2. **Prepare for Rollback**
   ```bash
   # Set environment variables
   export ENVIRONMENT=production
   export DATABASE_URL="your_database_url"
   export API_URL="your_api_url"
   export API_KEY="your_api_key"
   export ACTOR="your_name"
   ```

3. **Execute Rollback**
   ```bash
   # Run full rollback
   ./scripts/deployment/rollback-enhanced.sh "Critical issue - full rollback" full production
   ```

4. **Monitor Rollback**
   ```bash
   # Start monitoring (uses rollback ID from previous step)
   ./scripts/deployment/monitor-rollback.sh <rollback_id>
   ```

5. **Verify Completion**
   - Check application health
   - Verify feature flags are disabled
   - Confirm database state
   - Test key user flows

6. **Communicate Results**
   - Send notification to stakeholders
   - Update incident status
   - Document outcomes

### Procedure 2: Database-Only Rollback

**Prerequisites**:
- Database admin privileges
- Backup of current database
- Application stopped or in maintenance mode

**Steps**:

1. **Create Database Backup**
   ```bash
   # Manual backup (optional, script does this automatically)
   pg_dump "$DATABASE_URL" > /tmp/pre-rollback-backup.sql
   ```

2. **Execute Database Rollback**
   ```bash
   ./scripts/deployment/rollback-database.sh "Schema issues" safe production
   ```

3. **Verify Database State**
   - Check AI tables are removed
   - Verify data integrity
   - Test application connectivity

4. **Restart Application**
   ```bash
   # If application was stopped
   pm2 start media-contacts
   ```

### Procedure 3: Feature Flag Rollback

**Prerequisites**:
- Feature flag admin access
- API credentials

**Steps**:

1. **Execute Feature Flag Rollback**
   ```bash
   ./scripts/deployment/rollback-feature-flags.sh "Performance issues" all production
   ```

2. **Clear Caches**
   ```bash
   # Clear application cache
   pm2 reload media-contacts
   
   # Clear Redis cache if applicable
   redis-cli FLUSHDB
   ```

3. **Verify Feature State**
   - Check AI search is disabled
   - Test API endpoints return appropriate responses
   - Verify user experience

### Procedure 4: External Service Rollback

**Prerequisites**:
- Access to service configurations
- Ability to rotate API keys

**Steps**:

1. **Execute External Service Rollback**
   ```bash
   # Set to rotate API keys if needed
   export ROTATE_API_KEYS=true
   
   ./scripts/deployment/rollback-external-services.sh "Cost issues" all production
   ```

2. **Verify Service State**
   - Check service configurations are disabled
   - Monitor for external API calls
   - Verify cost tracking

3. **Clear Service Caches**
   ```bash
   # Clear AI service cache
   rm -rf .cache/ai-services
   
   # Restart application
   pm2 restart media-contacts
   ```

## Verification Procedures

### Application Health Verification

```bash
# Check application health
curl -f http://localhost:3000/api/health

# Check application version
curl http://localhost:3000/api/version

# Check AI search endpoints (should fail)
curl -f http://localhost:3000/api/ai/search/health
# Expected: Should fail or return disabled status
```

### Database Verification

```bash
# Check AI tables are removed
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name LIKE 'ai_%';"
# Expected: Should return 0

# Check database connectivity
psql "$DATABASE_URL" -c "SELECT 1;"

# Check critical tables exist
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM users;"
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM media_contacts;"
```

### Feature Flag Verification

```bash
# Check AI search flags are disabled
curl -s -H "Authorization: Bearer $API_KEY" "$API_URL/api/feature-flags/ai-search-enabled" | jq -r '.enabled'
# Expected: false

curl -s -H "Authorization: Bearer $API_KEY" "$API_URL/api/feature-flags/ai-search-enabled" | jq -r '.rolloutPercentage'
# Expected: 0
```

### External Service Verification

```bash
# Check service configurations are disabled
cat src/lib/ai/services/config/openai.json | jq -r '.enabled'
# Expected: false

# Monitor for external API calls
tail -f logs/application.log | grep -i "openai\|anthropic\|exa\|firecrawl"
# Expected: No new calls
```

## Communication Templates

### Template 1: Emergency Rollback Notification

**Subject**: 🚨 EMERGENCY ROLLBACK: AI Search Feature - PRODUCTION

**Body**:

Team,

We are executing an emergency rollback of the AI Search feature in production due to: [REASON]

**Rollback Details**:
- Rollback ID: [ROLLBACK_ID]
- Started: [TIMESTAMP]
- Expected Duration: 15-30 minutes
- Impact: AI Search features will be unavailable

**Current Status**:
- [ ] Rollback initiated
- [ ] Application code rolled back
- [ ] Database changes reverted
- [ ] Feature flags disabled
- [ ] External services disabled
- [ ] Verification completed

**User Impact**:
- AI Search functionality is temporarily unavailable
- All other features remain operational
- No data loss is expected

**Next Steps**:
1. Complete rollback procedures
2. Verify system stability
3. Investigate root cause
4. Communicate resolution

We will provide updates every 10 minutes.

Thanks,
[NAME]

### Template 2: Rollback Completion Notification

**Subject**: ✅ Rollback Complete: AI Search Feature - PRODUCTION

**Body**:

Team,

The emergency rollback of the AI Search feature has been completed successfully.

**Rollback Summary**:
- Rollback ID: [ROLLBACK_ID]
- Started: [START_TIME]
- Completed: [END_TIME]
- Duration: [DURATION]
- Reason: [REASON]

**Components Rolled Back**:
- ✅ Application code
- ✅ Database schema
- ✅ Feature flags
- ✅ External services

**Verification Results**:
- ✅ Application is healthy
- ✅ Database is stable
- ✅ Feature flags are disabled
- ✅ External services are disconnected

**User Impact**:
- AI Search functionality is now disabled
- All other features are operational
- No data loss occurred

**Next Steps**:
1. Monitor system stability
2. Investigate root cause
3. Plan for redeployment
4. Share incident report

Rollback logs and reports are available at: [LOCATION]

Thanks,
[NAME]

### Template 3: Incident Report Template

**Subject**: 📋 Incident Report: AI Search Feature Rollback - PRODUCTION

**Body**:

## Executive Summary

- **Incident ID**: [INCIDENT_ID]
- **Service**: AI Search Feature
- **Environment**: Production
- **Severity**: [SEVERITY]
- **Start Time**: [START_TIME]
- **End Time**: [END_TIME]
- **Duration**: [DURATION]
- **Status**: Resolved

## Impact Assessment

- **User Impact**: [DESCRIPTION]
- **Business Impact**: [DESCRIPTION]
- **Affected Users**: [NUMBER/PERCENTAGE]
- **Regions Affected**: [REGIONS]

## Timeline

- [TIME] - Issue detected
- [TIME] - Investigation started
- [TIME] - Rollback initiated
- [TIME] - Rollback completed
- [TIME] - Service restored

## Root Cause

[DESCRIPTION OF ROOT CAUSE]

## Resolution

[DESCRIPTION OF RESOLUTION STEPS TAKEN]

## Lessons Learned

[LESSONS LEARNED AND ACTION ITEMS]

## Attachments

- [LINK TO LOGS]
- [LINK TO REPORTS]
- [LINK TO METRICS]

Thanks,
[NAME]

## Post-Rollback Analysis

### Analysis Checklist

- [ ] Root cause identified
- [ ] Impact assessed
- [ ] Timeline documented
- [ ] Communication reviewed
- [ ] Procedures evaluated
- [ ] Improvements identified

### Analysis Procedure

1. **Collect Data**
   - Gather logs from all components
   - Collect metrics and monitoring data
   - Document timeline of events
   - Record communication logs

2. **Analyze Root Cause**
   - Review error logs and patterns
   - Identify triggering events
   - Analyze system dependencies
   - Document findings

3. **Assess Impact**
   - Measure user impact
   - Calculate business impact
   - Identify affected systems
   - Document data changes

4. **Evaluate Response**
   - Review response time
   - Assess communication effectiveness
   - Evaluate procedure adherence
   - Identify improvement opportunities

5. **Document Lessons**
   - Record key learnings
   - Create action items
   - Update procedures
   - Share knowledge

### Continuous Improvement

- Schedule regular rollback drills
- Update procedures based on lessons learned
- Maintain rollback testing schedule
- Review and improve monitoring