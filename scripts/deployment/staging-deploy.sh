#!/bin/bash

# Staging Deployment Script for AI Search Feature
# This script handles the deployment of the Find Contacts with AI feature to staging environment

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENVIRONMENT="staging"
BACKUP_DIR="/tmp/media-contacts-staging-backup-$(date +%Y%m%d-%H%M%S)"
LOG_FILE="/tmp/staging-deploy-$(date +%Y%m%d-%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

# Check if running with appropriate permissions
check_permissions() {
    log "Checking deployment permissions..."
    
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root for security reasons"
    fi
    
    # Check if we can write to the deployment directory
    if [[ ! -w "$PROJECT_ROOT" ]]; then
        error "Cannot write to project directory: $PROJECT_ROOT"
    fi
    
    success "Permissions check passed"
}

# Validate environment
validate_environment() {
    log "Validating staging environment..."
    
    # Check if we're on a valid branch for staging deployment
    current_branch=$(git branch --show-current)
    valid_branches=("main" "develop" "feature/*" "hotfix/*")
    branch_valid=false
    
    for valid_branch in "${valid_branches[@]}"; do
        if [[ "$current_branch" == $valid_branch ]]; then
            branch_valid=true
            break
        fi
    done
    
    if [[ "$branch_valid" == false ]]; then
        error "Branch '$current_branch' is not valid for staging deployment"
    fi
    
    # Check if working directory is clean
    if [[ -n $(git status --porcelain) ]]; then
        warning "Working directory has uncommitted changes. These will be deployed."
    fi
    
    # Check required environment variables
    required_vars=("DATABASE_URL" "AUTH_SECRET" "OPENAI_API_KEY" "ANTHROPIC_API_KEY")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            error "Required environment variable $var is not set"
        fi
    done
    
    success "Environment validation passed"
}

# Create backup of current deployment
create_backup() {
    log "Creating backup of current staging deployment..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup database schema
    if command -v pg_dump &> /dev/null; then
        log "Backing up staging database schema..."
        pg_dump --schema-only "$DATABASE_URL" > "$BACKUP_DIR/database_schema.sql" 2>> "$LOG_FILE"
    else
        warning "pg_dump not found, skipping database schema backup"
    fi
    
    # Backup current application files
    if [[ -d "$PROJECT_ROOT/.next" ]]; then
        log "Backing up application build..."
        cp -r "$PROJECT_ROOT/.next" "$BACKUP_DIR/" 2>> "$LOG_FILE"
    fi
    
    # Backup environment configuration
    if [[ -f "$PROJECT_ROOT/.env.staging" ]]; then
        cp "$PROJECT_ROOT/.env.staging" "$BACKUP_DIR/" 2>> "$LOG_FILE"
    fi
    
    success "Backup created at $BACKUP_DIR"
}

# Run health checks before deployment
pre_deployment_health_check() {
    log "Running pre-deployment health checks..."
    
    # Check if application is currently running
    if pgrep -f "next-server" > /dev/null; then
        log "Application is currently running"
    else
        warning "Application is not currently running"
    fi
    
    # Check database connectivity
    if command -v psql &> /dev/null; then
        log "Checking database connectivity..."
        if psql "$DATABASE_URL" -c "SELECT 1;" &> /dev/null; then
            success "Database connectivity check passed"
        else
            error "Database connectivity check failed"
        fi
    fi
    
    # Check disk space (require at least 1GB free)
    available_space=$(df "$PROJECT_ROOT" | awk 'NR==2 {print $4}')
    if [[ $available_space -lt 1048576 ]]; then  # 1GB in KB
        error "Insufficient disk space. Required: 1GB, Available: $((available_space/1024))MB"
    fi
    
    success "Pre-deployment health checks passed"
}

# Install dependencies and build application
build_application() {
    log "Building application for staging..."
    
    cd "$PROJECT_ROOT"
    
    # Clean previous build
    rm -rf .next
    
    # Install dependencies
    log "Installing dependencies..."
    npm ci 2>> "$LOG_FILE"
    
    # Generate Prisma client
    log "Generating Prisma client..."
    npx prisma generate 2>> "$LOG_FILE"
    
    # Build application
    log "Building Next.js application..."
    npm run build 2>> "$LOG_FILE"
    
    success "Application build completed"
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    
    cd "$PROJECT_ROOT"
    
    # Check if there are pending migrations
    if npx prisma migrate status 2>> "$LOG_FILE" | grep -q "Pending migrations"; then
        log "Applying pending migrations..."
        npx prisma migrate deploy 2>> "$LOG_FILE"
        success "Database migrations applied"
    else
        log "No pending migrations"
    fi
}

# Deploy application
deploy_application() {
    log "Deploying application to staging..."
    
    cd "$PROJECT_ROOT"
    
    # Perform deployment with PM2
    if command -v pm2 &> /dev/null; then
        log "Deploying with PM2..."
        
        # Start or reload application
        if pm2 list | grep -q "media-contacts-staging"; then
            pm2 reload media-contacts-staging 2>> "$LOG_FILE"
        else
            pm2 start npm --name "media-contacts-staging" -- start 2>> "$LOG_FILE"
        fi
        
        # Save PM2 configuration
        pm2 save 2>> "$LOG_FILE"
    else
        # Fallback to simple restart
        log "Restarting application..."
        pkill -f "next-server" || true
        sleep 5
        nohup npm start > /tmp/next-server-staging.log 2>&1 &
    fi
    
    success "Application deployment completed"
}

# Run post-deployment health checks
post_deployment_health_check() {
    log "Running post-deployment health checks..."
    
    # Wait for application to start
    sleep 20
    
    # Check if application is responding
    max_attempts=8
    attempt=1
    
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
        error "Application failed health checks after deployment"
    fi
    
    # Check AI search endpoints
    log "Testing AI search endpoints..."
    if curl -f -s http://localhost:3000/api/ai/search/health > /dev/null; then
        success "AI search endpoints are responding"
    else
        warning "AI search endpoints are not responding correctly"
    fi
    
    success "Post-deployment health checks completed"
}

# Run staging-specific tests
run_staging_tests() {
    log "Running staging-specific tests..."
    
    cd "$PROJECT_ROOT"
    
    # Run smoke tests
    log "Running smoke tests..."
    npm run test:e2e:smoke 2>> "$LOG_FILE"
    
    # Run AI search integration tests
    log "Running AI search integration tests..."
    npm run test:integration:external 2>> "$LOG_FILE"
    
    success "Staging tests completed"
}

# Configure monitoring
configure_monitoring() {
    log "Configuring staging monitoring..."
    
    # Ensure monitoring scripts are executable
    chmod +x "$PROJECT_ROOT/scripts/monitoring/"*.sh 2>> "$LOG_FILE"
    
    success "Monitoring configuration completed"
}

# Send deployment notification
send_notification() {
    local status=$1
    local message=$2
    
    log "Sending staging deployment notification: $status"
    
    # Example webhook notification (customize as needed)
    if [[ -n "${STAGING_WEBHOOK_URL}" ]]; then
        curl -X POST "$STAGING_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{\"status\": \"$status\", \"message\": \"$message\", \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" \
            2>> "$LOG_FILE" || true
    fi
}

# Rollback function
rollback() {
    log "Initiating staging rollback procedure..."
    
    # Stop current application
    if command -v pm2 &> /dev/null; then
        pm2 stop media-contacts-staging 2>> "$LOG_FILE" || true
    else
        pkill -f "next-server" || true
    fi
    
    # Restore from backup
    if [[ -d "$BACKUP_DIR/.next" ]]; then
        log "Restoring application build from backup..."
        rm -rf "$PROJECT_ROOT/.next"
        cp -r "$BACKUP_DIR/.next" "$PROJECT_ROOT/" 2>> "$LOG_FILE"
    fi
    
    # Restore environment configuration
    if [[ -f "$BACKUP_DIR/.env.staging" ]]; then
        cp "$BACKUP_DIR/.env.staging" "$PROJECT_ROOT/" 2>> "$LOG_FILE"
    fi
    
    # Restart application
    if command -v pm2 &> /dev/null; then
        pm2 start media-contacts-staging 2>> "$LOG_FILE"
    else
        nohup npm start > /tmp/next-server-staging.log 2>&1 &
    fi
    
    # Wait for application to start
    sleep 20
    
    # Verify rollback
    if curl -f -s http://localhost:3000/api/health > /dev/null; then
        success "Staging rollback completed successfully"
        send_notification "ROLLBACK_SUCCESS" "Staging deployment has been rolled back successfully"
    else
        error "Staging rollback failed - application is not responding"
    fi
}

# Main deployment flow
main() {
    log "Starting staging deployment for AI Search feature..."
    
    # Set up error handling
    trap 'error "Staging deployment failed at line $LINENO. Check log file: $LOG_FILE"' ERR
    trap 'rollback' EXIT
    
    check_permissions
    validate_environment
    create_backup
    pre_deployment_health_check
    build_application
    run_migrations
    deploy_application
    post_deployment_health_check
    run_staging_tests
    configure_monitoring
    
    # Disable rollback trap since deployment was successful
    trap - EXIT
    
    success "Staging deployment completed successfully!"
    send_notification "SUCCESS" "AI Search feature has been successfully deployed to staging"
    
    log "Deployment log available at: $LOG_FILE"
    log "Backup available at: $BACKUP_DIR"
}

# Parse command line arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "rollback")
        rollback
        ;;
    "health-check")
        post_deployment_health_check
        ;;
    "test")
        run_staging_tests
        ;;
    *)
        echo "Usage: $0 {deploy|rollback|health-check|test}"
        exit 1
        ;;
esac