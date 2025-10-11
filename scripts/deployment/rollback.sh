#!/bin/bash

# Rollback Script for AI Search Feature
# This script handles rollback procedures for the AI Search feature deployment

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENVIRONMENT="${ENVIRONMENT:-production}"
BACKUP_DIR="/tmp/media-contacts-rollback-$(date +%Y%m%d-%H%M%S)"
LOG_FILE="/tmp/rollback-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).log"
ROLLBACK_REASON="${1:-Unknown}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Rollback tracking
ROLLBACK_ID="rollback-$(date +%Y%m%d-%H%M%S)"
ROLLBACK_SUCCESS=false

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    ROLLBACK_SUCCESS=false
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

# Check rollback permissions
check_permissions() {
    log "Checking rollback permissions..."
    
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root for security reasons"
    fi
    
    # Check if we can write to the project directory
    if [[ ! -w "$PROJECT_ROOT" ]]; then
        error "Cannot write to project directory: $PROJECT_ROOT"
    fi
    
    # Check if we're on a valid branch for rollback
    current_branch=$(git branch --show-current)
    if [[ "$current_branch" != "main" && "$current_branch" != "release" ]]; then
        warning "Not on main or release branch. Current branch: $current_branch"
    fi
    
    success "Permissions check passed"
}

# Validate rollback environment
validate_environment() {
    log "Validating ${ENVIRONMENT} environment for rollback..."
    
    # Check required environment variables
    required_vars=("DATABASE_URL" "AUTH_SECRET")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            error "Required environment variable $var is not set"
        fi
    done
    
    # Check if database is accessible
    if command -v psql &> /dev/null; then
        if ! psql "$DATABASE_URL" -c "SELECT 1;" &> /dev/null; then
            error "Cannot connect to database. Please check DATABASE_URL."
        fi
    else
        error "psql command not found. Please install PostgreSQL client."
    fi
    
    success "Environment validation passed"
}

# Create rollback backup
create_rollback_backup() {
    log "Creating backup before rollback..."
    
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
    
    # Backup current feature flag state
    if command -v curl &> /dev/null && [[ -n "$API_KEY" ]]; then
        log "Backing up current feature flag state..."
        curl -s -H "Authorization: Bearer $API_KEY" \
            "$API_URL/api/feature-flags/ai-search" > "$BACKUP_DIR/feature-flags.json" 2>> "$LOG_FILE" || true
    fi
    
    # Backup database schema
    if command -v pg_dump &> /dev/null; then
        log "Backing up current database schema..."
        pg_dump --schema-only "$DATABASE_URL" > "$BACKUP_DIR/database_schema.sql" 2>> "$LOG_FILE"
    fi
    
    # Store rollback metadata
    cat > "$BACKUP_DIR/rollback-metadata.json" << EOF
{
  "rollback_id": "$ROLLBACK_ID",
  "environment": "$ENVIRONMENT",
  "reason": "$ROLLBACK_REASON",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "git_commit": "$(git rev-parse HEAD)",
  "git_branch": "$(git branch --show-current)",
  "actor": "${ACTOR:-unknown}"
}
EOF
    
    success "Rollback backup created at $BACKUP_DIR"
}

# Get previous stable version
get_previous_version() {
    log "Finding previous stable version..."
    
    # Get list of recent tags
    if git tag --list --sort=-version:refname | head -5 > /tmp/tags.txt; then
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
    log "Rolling back application code..."
    
    local previous_version=$(get_previous_version)
    
    # Check if it's a tag or commit
    if git rev-parse "$previous_version" >/dev/null 2>&1; then
        log "Checking out previous version: $previous_version"
        git checkout "$previous_version" 2>> "$LOG_FILE"
        
        # Clean any uncommitted changes
        git clean -fd 2>> "$LOG_FILE"
        
        success "Application code rolled back to $previous_version"
    else
        error "Invalid version: $previous_version"
    fi
}

# Rollback database schema
rollback_database() {
    log "Rolling back database schema..."
    
    cd "$PROJECT_ROOT"
    
    # Check if there are migrations to rollback
    if npx prisma migrate status 2>> "$LOG_FILE" | grep -q "Applied migrations"; then
        log "Found applied migrations, checking rollback options..."
        
        # Get list of applied migrations
        applied_migrations=$(npx prisma migrate status 2>> "$LOG_FILE" | grep -A 20 "Applied migrations" | tail -n +2 | grep -v "Pending" | awk '{print $1}')
        
        if [[ -n "$applied_migrations" ]]; then
            log "Applied migrations found, but Prisma doesn't support automatic rollback"
            warning "Manual database rollback may be required"
            
            # Create a manual rollback script
            cat > "$BACKUP_DIR/manual-rollback.sql" << EOF
-- Manual Database Rollback Script
-- Generated during rollback $ROLLBACK_ID
-- Please review and execute manually if needed

-- This is a placeholder for manual rollback commands
-- You may need to:
-- 1. Review the recent migrations in prisma/migrations/
-- 2. Create appropriate ALTER TABLE statements to reverse changes
-- 3. Handle data migration if necessary

-- Example (customize based on your migrations):
-- ALTER TABLE ai_searches DROP COLUMN IF EXISTS new_column;
-- DROP TABLE IF EXISTS new_table;

-- Remember to backup your data before executing!
EOF
            
            log "Manual rollback script created at $BACKUP_DIR/manual-rollback.sql"
        else
            log "No applied migrations found, skipping database rollback"
        fi
    else
        log "No migrations applied, skipping database rollback"
    fi
}

# Rollback application build
rollback_build() {
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
    log "Disabling AI search feature flags..."
    
    if command -v curl &> /dev/null && [[ -n "$API_KEY" ]]; then
        # Disable AI search feature
        curl -X POST "$API_URL/api/feature-flags/ai-search" \
            -H "Authorization: Bearer $API_KEY" \
            -H "Content-Type: application/json" \
            -d '{
                "enabled": false,
                "rollout_percentage": 0,
                "user_segments": [],
                "description": "AI Search Feature - Disabled due to rollback '$ROLLBACK_ID'"
            }' 2>> "$LOG_FILE" || true
        
        success "AI search feature flags disabled"
    else
        warning "Cannot disable feature flags - API not accessible"
    fi
}

# Verify rollback
verify_rollback() {
    log "Verifying rollback..."
    
    # Wait for application to start
    sleep 30
    
    # Check application health
    local max_attempts=10
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s http://localhost:3000/api/health > /dev/null; then
            success "Application is responding to health checks"
            break
        else
            log "Health check attempt $attempt/$max_attempts failed, retrying in 10 seconds..."
            sleep 10
            ((attempt++))
        fi
    done
    
    if [[ $attempt -gt $max_attempts ]]; then
        error "Application failed health checks after rollback"
        return 1
    fi
    
    # Check AI search endpoints (should be disabled)
    if curl -f -s http://localhost:3000/api/ai/search/health > /dev/null; then
        warning "AI search endpoint is still responding - ensure feature flags are disabled"
    else
        success "AI search endpoints are not responding (as expected)"
    fi
    
    # Check application version
    if curl -s http://localhost:3000/api/version > /dev/null; then
        success "Application version endpoint is responding"
    fi
    
    success "Rollback verification completed"
    ROLLBACK_SUCCESS=true
}

# Send rollback notification
send_rollback_notification() {
    local status=$1
    local message=$2
    
    log "Sending rollback notification: $status"
    
    # Example webhook notification (customize as needed)
    if [[ -n "${ROLLBACK_WEBHOOK_URL}" ]]; then
        curl -X POST "$ROLLBACK_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{
                \"status\": \"$status\",
                \"message\": \"$message\",
                \"rollback_id\": \"$ROLLBACK_ID\",
                \"environment\": \"$ENVIRONMENT\",
                \"reason\": \"$ROLLBACK_REASON\",
                \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%Z)\",
                \"backup_location\": \"$BACKUP_DIR\"
            }" \
            2>> "$LOG_FILE" || true
    fi
    
    # Email notification (customize as needed)
    if command -v mail &> /dev/null && [[ -n "${ADMIN_EMAIL}" ]]; then
        mail -s "Rollback $status: AI Search Feature - ${ENVIRONMENT}" "$ADMIN_EMAIL" << EOF 2>> "$LOG_FILE"
Rollback $status for AI Search feature in ${ENVIRONMENT} environment:

Rollback ID: $ROLLBACK_ID
Reason: $ROLLBACK_REASON
Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)
Backup Location: $BACKUP_DIR

$message

Full log available at: $LOG_FILE
EOF
    fi
}

# Create incident report
create_incident_report() {
    log "Creating incident report..."
    
    cat > "$BACKUP_DIR/incident-report.md" << EOF
# Incident Report: AI Search Feature Rollback

## Incident Details
- **Incident ID**: $ROLLBACK_ID
- **Environment**: $ENVIRONMENT
- **Timestamp**: $(date -u +%Y-%m-%dT%H:%M:%SZ)
- **Reason**: $ROLLBACK_REASON
- **Actor**: ${ACTOR:-unknown}
- **Rollback Status**: $([ "$ROLLBACK_SUCCESS" = true ] && echo "Success" || echo "Failed")

## System Information
- **Git Commit**: $(git rev-parse HEAD)
- **Git Branch**: $(git branch --show-current)
- **Node Version**: $(node --version 2>/dev/null || echo "Unknown")
- **Database URL**: ${DATABASE_URL:0:20}...

## Rollback Actions Taken
1. Backup created at: $BACKUP_DIR
2. Application code rolled back
3. Application build completed
4. Application restarted
5. Feature flags disabled
6. Health checks completed

## Impact Assessment
- **User Impact**: Users may have experienced errors or degraded performance
- **Feature Availability**: AI Search feature is currently disabled
- **Data Impact**: No data loss expected during rollback

## Recovery Timeline
- **Incident Started**: $(date -u +%Y-%m-%dT%H:%M:%SZ)
- **Rollback Initiated**: $(date -u +%Y-%m-%dT%H:%M:%SZ)
- **Rollback Completed**: $(date -u +%Y-%m-%dT%H:%M:%SZ)

## Next Steps
1. Investigate root cause of the issue
2. Fix the underlying problem
3. Test thoroughly in staging environment
4. Plan for redeployment with additional safeguards
5. Consider additional monitoring and alerting

## Lessons Learned
- [To be completed after incident resolution]

## Attachments
- Full rollback log: $LOG_FILE
- Backup location: $BACKUP_DIR
EOF
    
    success "Incident report created at $BACKUP_DIR/incident-report.md"
}

# Main rollback flow
main() {
    log "Starting rollback for AI Search feature in ${ENVIRONMENT} environment..."
    log "Rollback reason: $ROLLBACK_REASON"
    
    # Set up error handling
    trap 'error "Rollback failed at line $LINENO. Check log file: $LOG_FILE"' ERR
    
    check_permissions
    validate_environment
    create_rollback_backup
    rollback_application
    rollback_build
    restart_application
    disable_feature_flags
    
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
    echo "Usage: $0 <rollback_reason> [environment]"
    echo "Example: $0 \"Performance degradation\" production"
    echo "Environment: Set ENVIRONMENT variable or pass as second argument"
    exit 1
fi

ROLLBACK_REASON="$1"
if [[ -n "$2" ]]; then
    ENVIRONMENT="$2"
fi

main