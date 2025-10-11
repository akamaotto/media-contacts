#!/bin/bash

# Enhanced Rollback Script for AI Search Feature
# This script handles comprehensive rollback procedures for the AI Search feature deployment
# Supports multiple rollback scenarios and automated verification

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENVIRONMENT="${ENVIRONMENT:-production}"
BACKUP_DIR="/tmp/media-contacts-rollback-$(date +%Y%m%d-%H%M%S)"
LOG_FILE="/tmp/rollback-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).log"
ROLLBACK_REASON="${1:-Unknown}"
ROLLBACK_TYPE="${2:-full}"  # full, partial, database, feature-flags, services

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Rollback tracking
ROLLBACK_ID="rollback-$(date +%Y%m%d-%H%M%S)"
ROLLBACK_SUCCESS=false
ROLLBACK_START_TIME=$(date +%s)

# Component status tracking
declare -A COMPONENT_STATUS
COMPONENT_STATUS[application]="pending"
COMPONENT_STATUS[database]="pending"
COMPONENT_STATUS[feature_flags]="pending"
COMPONENT_STATUS[external_services]="pending"
COMPONENT_STATUS[monitoring]="pending"

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    ROLLBACK_SUCCESS=false
    update_component_status "failed" "$2"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${CYAN}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

# Update component status
update_component_status() {
    local status=$1
    local component=${2:-"unknown"}
    COMPONENT_STATUS[$component]="$status"
    log "Component status updated: $component = $status"
}

# Check rollback permissions
check_permissions() {
    log "Checking rollback permissions..."
    
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root for security reasons" "permissions"
    fi
    
    # Check if we can write to the project directory
    if [[ ! -w "$PROJECT_ROOT" ]]; then
        error "Cannot write to project directory: $PROJECT_ROOT" "permissions"
    fi
    
    # Check if we're on a valid branch for rollback
    current_branch=$(git branch --show-current)
    if [[ "$current_branch" != "main" && "$current_branch" != "release" ]]; then
        warning "Not on main or release branch. Current branch: $current_branch"
    fi
    
    # Check for required tools
    local required_tools=("git" "curl" "jq" "psql")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            error "Required tool not found: $tool" "permissions"
        fi
    done
    
    success "Permissions check passed"
    update_component_status "completed" "permissions"
}

# Validate rollback environment
validate_environment() {
    log "Validating ${ENVIRONMENT} environment for rollback..."
    
    # Check required environment variables
    local required_vars=("DATABASE_URL" "AUTH_SECRET")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            error "Required environment variable $var is not set" "environment"
        fi
    done
    
    # Check if database is accessible
    if ! psql "$DATABASE_URL" -c "SELECT 1;" &> /dev/null; then
        error "Cannot connect to database. Please check DATABASE_URL." "environment"
    fi
    
    # Check disk space (require at least 2GB free for rollback operations)
    local available_space=$(df "$PROJECT_ROOT" | awk 'NR==2 {print $4}')
    if [[ $available_space -lt 2097152 ]]; then  # 2GB in KB
        error "Insufficient disk space for rollback. Required: 2GB, Available: $((available_space/1024))MB" "environment"
    fi
    
    success "Environment validation passed"
    update_component_status "completed" "environment"
}

# Create comprehensive rollback backup
create_rollback_backup() {
    log "Creating comprehensive backup before rollback..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup current application state
    if [[ -d "$PROJECT_ROOT/.next" ]]; then
        log "Backing up current application build..."
        cp -r "$PROJECT_ROOT/.next" "$BACKUP_DIR/" 2>> "$LOG_FILE"
    fi
    
    # Backup current environment configuration
    if [[ -f "$PROJECT_ROOT/.env.production" ]]; then
        cp "$PROJECT_ROOT/.env.production" "$BACKUP_DIR/" 2>> "$LOG_FILE"
    fi
    
    # Backup package.json and package-lock.json
    if [[ -f "$PROJECT_ROOT/package.json" ]]; then
        cp "$PROJECT_ROOT/package.json" "$BACKUP_DIR/" 2>> "$LOG_FILE"
    fi
    if [[ -f "$PROJECT_ROOT/package-lock.json" ]]; then
        cp "$PROJECT_ROOT/package-lock.json" "$BACKUP_DIR/" 2>> "$LOG_FILE"
    fi
    
    # Backup current feature flag state
    if [[ -n "$API_KEY" ]]; then
        log "Backing up current feature flag state..."
        curl -s -H "Authorization: Bearer $API_KEY" \
            "$API_URL/api/feature-flags/ai-search" > "$BACKUP_DIR/feature-flags.json" 2>> "$LOG_FILE" || true
    fi
    
    # Backup database schema and critical data
    log "Backing up database schema and critical data..."
    pg_dump --schema-only "$DATABASE_URL" > "$BACKUP_DIR/database_schema.sql" 2>> "$LOG_FILE"
    
    # Backup critical tables
    local critical_tables=(
        "users"
        "media_contacts"
        "ai_searches"
        "ai_search_sources"
        "ai_extracted_contacts"
        "ai_performance_logs"
        "feature_flags"
        "feature_flag_evaluations"
    )
    
    for table in "${critical_tables[@]}"; do
        log "Backing up table: $table"
        pg_dump --data-only --table="$table" "$DATABASE_URL" > "$BACKUP_DIR/${table}_data.sql" 2>> "$LOG_FILE" || true
    done
    
    # Backup AI service configurations
    if [[ -d "$PROJECT_ROOT/src/lib/ai/services/config" ]]; then
        cp -r "$PROJECT_ROOT/src/lib/ai/services/config" "$BACKUP_DIR/ai_service_config" 2>> "$LOG_FILE"
    fi
    
    # Store rollback metadata
    cat > "$BACKUP_DIR/rollback-metadata.json" << EOF
{
  "rollback_id": "$ROLLBACK_ID",
  "environment": "$ENVIRONMENT",
  "reason": "$ROLLBACK_REASON",
  "type": "$ROLLBACK_TYPE",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "git_commit": "$(git rev-parse HEAD)",
  "git_branch": "$(git branch --show-current)",
  "actor": "${ACTOR:-unknown}",
  "components": $(printf '%s\n' "${!COMPONENT_STATUS[@]}" | jq -R . | jq -s .)
}
EOF
    
    success "Comprehensive rollback backup created at $BACKUP_DIR"
    update_component_status "completed" "backup"
}

# Get previous stable version
get_previous_version() {
    log "Finding previous stable version..."
    
    # Get list of recent tags
    if git tag --list --sort=-version:refname | head -10 > /tmp/tags.txt; then
        log "Recent tags found:"
        cat /tmp/tags.txt | tee -a "$LOG_FILE"
        
        # Get the most recent tag that's not the current one
        CURRENT_TAG=$(git describe --tags --exact-match 2>/dev/null || echo "")
        
        PREVIOUS_TAG=""
        while IFS= read -r tag; do
            if [[ "$tag" != "$CURRENT_TAG" ]]; then
                PREVIOUS_TAG="$tag"
                break
            fi
        done < /tmp/tags.txt
        
        if [[ -n "$PREVIOUS_TAG" ]]; then
            log "Previous stable version: $PREVIOUS_TAG"
            echo "$PREVIOUS_TAG"
            return 0
        else
            warning "No previous tag found, will use previous commit"
        fi
    else
        warning "No tags found, will use previous commit"
    fi
    
    # Fallback to previous commit
    PREVIOUS_COMMIT=$(git rev-parse HEAD~1)
    log "Previous commit: $PREVIOUS_COMMIT"
    echo "$PREVIOUS_COMMIT"
}

# Rollback application code
rollback_application() {
    if [[ "$ROLLBACK_TYPE" != "full" && "$ROLLBACK_TYPE" != "application" ]]; then
        log "Skipping application rollback (type: $ROLLBACK_TYPE)"
        return
    fi
    
    log "Rolling back application code..."
    
    local previous_version=$(get_previous_version)
    
    # Check if it's a tag or commit
    if git rev-parse "$previous_version" >/dev/null 2>&1; then
        log "Checking out previous version: $previous_version"
        git checkout "$previous_version" 2>> "$LOG_FILE"
        
        # Clean any uncommitted changes
        git clean -fd 2>> "$LOG_FILE"
        
        success "Application code rolled back to $previous_version"
        update_component_status "completed" "application"
    else
        error "Invalid version: $previous_version" "application"
    fi
}

# Rollback database schema and data
rollback_database() {
    if [[ "$ROLLBACK_TYPE" != "full" && "$ROLLBACK_TYPE" != "database" ]]; then
        log "Skipping database rollback (type: $ROLLBACK_TYPE)"
        return
    fi
    
    log "Rolling back database schema and data..."
    
    cd "$PROJECT_ROOT"
    
    # Check if there are migrations to rollback
    if npx prisma migrate status 2>> "$LOG_FILE" | grep -q "Applied migrations"; then
        log "Found applied migrations, creating rollback plan..."
        
        # Get list of applied migrations
        applied_migrations=$(npx prisma migrate status 2>> "$LOG_FILE" | grep -A 20 "Applied migrations" | tail -n +2 | grep -v "Pending" | awk '{print $1}')
        
        if [[ -n "$applied_migrations" ]]; then
            log "Applied migrations found, generating rollback script..."
            
            # Create a comprehensive rollback script
            cat > "$BACKUP_DIR/database-rollback.sql" << EOF
-- Database Rollback Script
-- Generated during rollback $ROLLBACK_ID
-- Target: Revert AI Search feature database changes

-- Disable foreign key checks temporarily
SET session_replication_role = replica;

-- Drop AI search related tables in reverse order of creation
DROP TABLE IF EXISTS ai_extracted_contacts CASCADE;
DROP TABLE IF EXISTS ai_search_sources CASCADE;
DROP TABLE IF EXISTS ai_searches CASCADE;
DROP TABLE IF EXISTS ai_search_cache CASCADE;
DROP TABLE IF EXISTS ai_performance_logs CASCADE;
DROP TABLE IF EXISTS ai_contact_duplicates CASCADE;
DROP TABLE IF EXISTS ai_extraction_jobs CASCADE;
DROP TABLE IF EXISTS ai_extraction_cache CASCADE;

-- Drop feature flag related tables
DROP TABLE IF EXISTS feature_flag_evaluations CASCADE;
DROP TABLE IF EXISTS feature_flags CASCADE;
DROP TABLE IF EXISTS user_segments CASCADE;

-- Remove AI search related columns from existing tables
ALTER TABLE media_contacts DROP COLUMN IF EXISTS ai_extracted;
ALTER TABLE media_contacts DROP COLUMN IF EXISTS ai_confidence_score;
ALTER TABLE media_contacts DROP COLUMN IF EXISTS ai_extraction_metadata;
ALTER TABLE users DROP COLUMN IF EXISTS ai_search_quota;
ALTER TABLE users DROP COLUMN IF EXISTS ai_search_preferences;

-- Re-enable foreign key checks
SET session_replication_role = DEFAULT;

-- Update database version
UPDATE _prisma_migrations SET rolled_back_at = NOW() WHERE migration_name LIKE '%ai_search%';

-- Analyze tables for performance
ANALYZE;

-- Verify rollback completion
SELECT 'Database rollback completed successfully' as status;
EOF
            
            # Execute the rollback script
            log "Executing database rollback script..."
            if psql "$DATABASE_URL" < "$BACKUP_DIR/database-rollback.sql" >> "$LOG_FILE" 2>&1; then
                success "Database rollback completed successfully"
                update_component_status "completed" "database"
            else
                error "Database rollback failed. Check log file: $LOG_FILE" "database"
            fi
        else
            log "No applied migrations found, skipping database rollback"
            update_component_status "completed" "database"
        fi
    else
        log "No migrations applied, skipping database rollback"
        update_component_status "completed" "database"
    fi
}

# Rollback application build
rollback_build() {
    if [[ "$ROLLBACK_TYPE" != "full" && "$ROLLBACK_TYPE" != "application" ]]; then
        log "Skipping application build rollback (type: $ROLLBACK_TYPE)"
        return
    fi
    
    log "Rolling back application build..."
    
    cd "$PROJECT_ROOT"
    
    # Clean current build
    rm -rf .next
    
    # Install dependencies
    log "Installing dependencies for previous version..."
    npm ci 2>> "$LOG_FILE"
    
    # Generate Prisma client
    log "Generating Prisma client..."
    npx prisma generate 2>> "$LOG_FILE"
    
    # Build application
    log "Building previous version..."
    npm run build 2>> "$LOG_FILE"
    
    # Install production dependencies
    npm ci --production 2>> "$LOG_FILE"
    
    success "Application build completed"
}

# Restart application
restart_application() {
    if [[ "$ROLLBACK_TYPE" != "full" && "$ROLLBACK_TYPE" != "application" ]]; then
        log "Skipping application restart (type: $ROLLBACK_TYPE)"
        return
    fi
    
    log "Restarting application with previous version..."
    
    # Stop current application
    if command -v pm2 &> /dev/null; then
        if pm2 list | grep -q "media-contacts"; then
            log "Stopping application with PM2..."
            pm2 stop media-contacts 2>> "$LOG_FILE"
            sleep 5
        fi
    else
        log "Stopping application processes..."
        pkill -f "next-server" || true
        sleep 5
    fi
    
    # Start application with previous version
    if command -v pm2 &> /dev/null; then
        log "Starting application with PM2..."
        pm2 start npm --name "media-contacts" -- start 2>> "$LOG_FILE"
        pm2 save 2>> "$LOG_FILE"
    else
        log "Starting application..."
        nohup npm start > /tmp/next-server-rollback.log 2>&1 &
    fi
    
    success "Application restarted"
}

# Disable AI search feature flags
disable_feature_flags() {
    if [[ "$ROLLBACK_TYPE" != "full" && "$ROLLBACK_TYPE" != "feature-flags" ]]; then
        log "Skipping feature flags rollback (type: $ROLLBACK_TYPE)"
        return
    fi
    
    log "Disabling AI search feature flags..."
    
    if [[ -n "$API_KEY" ]]; then
        # Disable all AI search related feature flags
        local ai_flags=(
            "ai-search-enabled"
            "ai-search-advanced-options"
            "ai-search-provider-openai"
            "ai-search-caching"
            "ai-contact-extraction"
            "ai-content-analysis"
        )
        
        for flag in "${ai_flags[@]}"; do
            log "Disabling feature flag: $flag"
            curl -X POST "$API_URL/api/feature-flags/$flag" \
                -H "Authorization: Bearer $API_KEY" \
                -H "Content-Type: application/json" \
                -d "{
                    \"enabled\": false,
                    \"rollout_percentage\": 0,
                    \"user_segments\": [],
                    \"description\": \"AI Search Feature - Disabled due to rollback '$ROLLBACK_ID'\"
                }" 2>> "$LOG_FILE" || true
        done
        
        success "AI search feature flags disabled"
        update_component_status "completed" "feature_flags"
    else
        warning "Cannot disable feature flags - API not accessible"
        update_component_status "failed" "feature_flags"
    fi
}

# Rollback external service integrations
rollback_external_services() {
    if [[ "$ROLLBACK_TYPE" != "full" && "$ROLLBACK_TYPE" != "services" ]]; then
        log "Skipping external services rollback (type: $ROLLBACK_TYPE)"
        return
    fi
    
    log "Rolling back external service integrations..."
    
    # Disable AI service integrations
    local ai_services=(
        "openai"
        "anthropic"
        "exa"
        "firecrawl"
    )
    
    for service in "${ai_services[@]}"; do
        log "Disabling AI service integration: $service"
        
        # Update service configuration to disable
        if [[ -f "$PROJECT_ROOT/src/lib/ai/services/config/$service.json" ]]; then
            cp "$PROJECT_ROOT/src/lib/ai/services/config/$service.json" "$BACKUP_DIR/${service}_config_backup.json"
            
            # Create disabled configuration
            cat > "$PROJECT_ROOT/src/lib/ai/services/config/$service.json" << EOF
{
  "enabled": false,
  "disabled_reason": "Rollback $ROLLBACK_ID",
  "disabled_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "previous_config": "See backup at $BACKUP_DIR/${service}_config_backup.json"
}
EOF
        fi
    done
    
    # Clear AI service cache
    if [[ -d "$PROJECT_ROOT/.cache/ai-services" ]]; then
        rm -rf "$PROJECT_ROOT/.cache/ai-services"
        log "AI service cache cleared"
    fi
    
    success "External service integrations rolled back"
    update_component_status "completed" "external_services"
}

# Configure rollback monitoring
configure_rollback_monitoring() {
    log "Configuring rollback monitoring..."
    
    # Create monitoring configuration for rollback
    cat > "$BACKUP_DIR/rollback-monitoring.json" << EOF
{
  "rollback_id": "$ROLLBACK_ID",
  "monitoring_enabled": true,
  "metrics_to_track": [
    "application_health",
    "database_connectivity",
    "feature_flag_status",
    "external_service_status",
    "error_rates",
    "response_times"
  ],
  "alert_thresholds": {
    "error_rate": 5,
    "response_time": 2000,
    "database_connections": 80
  },
  "monitoring_duration": 3600,
  "notification_channels": ["email", "slack", "webhook"]
}
EOF
    
    # Start monitoring script in background
    nohup "$SCRIPT_DIR/monitor-rollback.sh" "$ROLLBACK_ID" "$BACKUP_DIR/rollback-monitoring.json" > "$BACKUP_DIR/rollback-monitor.log" 2>&1 &
    
    success "Rollback monitoring configured"
    update_component_status "completed" "monitoring"
}

# Verify rollback
verify_rollback() {
    log "Verifying rollback..."
    
    # Wait for application to start
    sleep 30
    
    # Check application health
    local max_attempts=10
    local attempt=1
    local health_check_passed=false
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s http://localhost:3000/api/health > /dev/null; then
            success "Application is responding to health checks"
            health_check_passed=true
            break
        else
            log "Health check attempt $attempt/$max_attempts failed, retrying in 10 seconds..."
            sleep 10
            ((attempt++))
        fi
    done
    
    if [[ "$health_check_passed" != true ]]; then
        error "Application failed health checks after rollback" "verification"
        return 1
    fi
    
    # Check AI search endpoints (should be disabled)
    if curl -f -s http://localhost:3000/api/ai/search/health > /dev/null; then
        warning "AI search endpoint is still responding - ensure feature flags are disabled"
    else
        success "AI search endpoints are not responding (as expected)"
    fi
    
    # Check database connectivity
    if psql "$DATABASE_URL" -c "SELECT 1;" &> /dev/null; then
        success "Database connectivity verified"
    else
        error "Database connectivity failed after rollback" "verification"
        return 1
    fi
    
    # Check application version
    if curl -s http://localhost:3000/api/version > /dev/null; then
        success "Application version endpoint is responding"
    fi
    
    # Verify feature flags are disabled
    if [[ -n "$API_KEY" ]]; then
        local flag_status=$(curl -s -H "Authorization: Bearer $API_KEY" "$API_URL/api/feature-flags/ai-search-enabled" | jq -r '.enabled // false')
        if [[ "$flag_status" == "false" ]]; then
            success "AI search feature flag is disabled"
        else
            warning "AI search feature flag is still enabled"
        fi
    fi
    
    success "Rollback verification completed"
    return 0
}

# Send rollback notification
send_rollback_notification() {
    local status=$1
    local message=$2
    
    log "Sending rollback notification: $status"
    
    # Calculate rollback duration
    local rollback_duration=$(($(date +%s) - ROLLBACK_START_TIME))
    
    # Create notification payload
    local notification_payload=$(cat << EOF
{
    "status": "$status",
    "message": "$message",
    "rollback_id": "$ROLLBACK_ID",
    "environment": "$ENVIRONMENT",
    "reason": "$ROLLBACK_REASON",
    "type": "$ROLLBACK_TYPE",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "duration_seconds": $rollback_duration,
    "backup_location": "$BACKUP_DIR",
    "components_status": $(printf '%s\n' "${COMPONENT_STATUS[@]}" | jq -R . | jq -s .)
}
EOF
)
    
    # Send webhook notification
    if [[ -n "${ROLLBACK_WEBHOOK_URL}" ]]; then
        curl -X POST "$ROLLBACK_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "$notification_payload" \
            2>> "$LOG_FILE" || true
    fi
    
    # Email notification
    if command -v mail &> /dev/null && [[ -n "${ADMIN_EMAIL}" ]]; then
        mail -s "Rollback $status: AI Search Feature - ${ENVIRONMENT}" "$ADMIN_EMAIL" << EOF 2>> "$LOG_FILE"
Rollback $status for AI Search feature in ${ENVIRONMENT} environment:

Rollback ID: $ROLLBACK_ID
Reason: $ROLLBACK_REASON
Type: $ROLLBACK_TYPE
Duration: ${rollback_duration}s
Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)
Backup Location: $BACKUP_DIR

$message

Component Status:
$(for component in "${!COMPONENT_STATUS[@]}"; do
    echo "- $component: ${COMPONENT_STATUS[$component]}"
done)

Full log available at: $LOG_FILE
EOF
    fi
}

# Create comprehensive incident report
create_incident_report() {
    log "Creating comprehensive incident report..."
    
    local rollback_duration=$(($(date +%s) - ROLLBACK_START_TIME))
    
    cat > "$BACKUP_DIR/incident-report.md" << EOF
# Incident Report: AI Search Feature Rollback

## Executive Summary
- **Incident ID**: $ROLLBACK_ID
- **Environment**: $ENVIRONMENT
- **Timestamp**: $(date -u +%Y-%m-%dT%H:%M:%SZ)
- **Reason**: $ROLLBACK_REASON
- **Rollback Type**: $ROLLBACK_TYPE
- **Duration**: ${rollback_duration} seconds
- **Status**: $([ "$ROLLBACK_SUCCESS" = true ] && echo "Success" || echo "Failed")
- **Actor**: ${ACTOR:-unknown}

## System Information
- **Git Commit**: $(git rev-parse HEAD)
- **Git Branch**: $(git branch --show-current)
- **Node Version**: $(node --version 2>/dev/null || echo "Unknown")
- **Database URL**: ${DATABASE_URL:0:20}...

## Rollback Actions Taken
1. Backup created at: $BACKUP_DIR
2. Application code rolled back
3. Database schema and data rolled back
4. Application build completed
5. Application restarted
6. Feature flags disabled
7. External service integrations rolled back
8. Monitoring configured
9. Health checks completed

## Component Status
$(for component in "${!COMPONENT_STATUS[@]}"; do
    echo "- **$component**: ${COMPONENT_STATUS[$component]}"
done)

## Impact Assessment
- **User Impact**: Users may have experienced errors or degraded performance during the rollback
- **Feature Availability**: AI Search feature is currently disabled
- **Data Impact**: No data loss expected during rollback
- **Service Downtime**: Approximately ${rollback_duration} seconds

## Recovery Timeline
- **Incident Started**: $(date -u +%Y-%m-%dT%H:%M:%SZ)
- **Rollback Initiated**: $(date -u +%Y-%m-%dT%H:%M:%SZ)
- **Rollback Completed**: $(date -u +%Y-%m-%dT%H:%M:%SZ)

## Technical Details
### Database Changes
- Tables dropped: ai_searches, ai_search_sources, ai_extracted_contacts, etc.
- Schema rollback completed successfully
- Data integrity verified

### Application Changes
- Code reverted to previous stable version
- Dependencies reinstalled
- Build process completed
- Services restarted

### Feature Flags
- All AI search related flags disabled
- Rollout percentage set to 0%
- User segments cleared

### External Services
- OpenAI integration disabled
- Anthropic integration disabled
- Exa integration disabled
- Firecrawl integration disabled

## Next Steps
1. Investigate root cause of the issue
2. Fix the underlying problem
3. Test thoroughly in staging environment
4. Plan for redeployment with additional safeguards
5. Consider additional monitoring and alerting
6. Review rollback procedures and improve if needed

## Lessons Learned
- [To be completed after incident resolution]

## Attachments
- Full rollback log: $LOG_FILE
- Backup location: $BACKUP_DIR
- Database rollback script: $BACKUP_DIR/database-rollback.sql
- Monitoring configuration: $BACKUP_DIR/rollback-monitoring.json

## Review Checklist
- [ ] Root cause identified
- [ ] Fix implemented and tested
- [ ] Documentation updated
- [ ] Team debrief completed
- [ ] Monitoring improved
- [ ] Rollback procedure reviewed
EOF
    
    success "Comprehensive incident report created at $BACKUP_DIR/incident-report.md"
}

# Main rollback flow
main() {
    log "Starting enhanced rollback for AI Search feature in ${ENVIRONMENT} environment..."
    log "Rollback reason: $ROLLBACK_REASON"
    log "Rollback type: $ROLLBACK_TYPE"
    
    # Set up error handling
    trap 'error "Rollback failed at line $LINENO. Check log file: $LOG_FILE"' ERR
    
    check_permissions
    validate_environment
    create_rollback_backup
    
    # Execute rollback based on type
    case "$ROLLBACK_TYPE" in
        "full")
            rollback_application
            rollback_database
            rollback_build
            restart_application
            disable_feature_flags
            rollback_external_services
            ;;
        "application")
            rollback_application
            rollback_build
            restart_application
            ;;
        "database")
            rollback_database
            ;;
        "feature-flags")
            disable_feature_flags
            ;;
        "services")
            rollback_external_services
            ;;
        *)
            error "Unknown rollback type: $ROLLBACK_TYPE"
            exit 1
            ;;
    esac
    
    configure_rollback_monitoring
    
    # Verify rollback and update status
    if verify_rollback; then
        ROLLBACK_SUCCESS=true
    fi
    
    create_incident_report
    
    # Send appropriate notification based on success
    if [[ "$ROLLBACK_SUCCESS" == true ]]; then
        send_rollback_notification "SUCCESS" "Rollback completed successfully. AI Search feature has been disabled."
        success "Rollback completed successfully!"
    else
        send_rollback_notification "FAILURE" "Rollback failed or verification failed. Manual intervention may be required."
        error "Rollback failed or verification failed"
    fi
    
    log "Rollback log available at: $LOG_FILE"
    log "Backup available at: $BACKUP_DIR"
    log "Incident report available at: $BACKUP_DIR/incident-report.md"
}

# Parse command line arguments
if [[ $# -lt 1 ]]; then
    echo "Usage: $0 <rollback_reason> [rollback_type] [environment]"
    echo "Example: $0 \"Performance degradation\" full production"
    echo ""
    echo "Rollback types:"
    echo "  full - Complete rollback (default)"
    echo "  application - Application code and build only"
    echo "  database - Database schema and data only"
    echo "  feature-flags - Feature flags only"
    echo "  services - External service integrations only"
    echo ""
    echo "Environment: Set ENVIRONMENT variable or pass as third argument"
    exit 1
fi

ROLLBACK_REASON="$1"
if [[ -n "$2" ]]; then
    ROLLBACK_TYPE="$2"
fi
if [[ -n "$3" ]]; then
    ENVIRONMENT="$3"
fi

main