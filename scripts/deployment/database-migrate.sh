#!/bin/bash

# Database Migration Script for AI Search Feature
# This script handles database migrations for production and staging environments

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENVIRONMENT="${1:-production}"
BACKUP_DIR="/tmp/media-contacts-db-backup-$(date +%Y%m%d-%H%M%S)"
LOG_FILE="/tmp/db-migrate-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).log"

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
    log "Checking migration permissions..."
    
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root for security reasons"
    fi
    
    # Check if we can write to the project directory
    if [[ ! -w "$PROJECT_ROOT" ]]; then
        error "Cannot write to project directory: $PROJECT_ROOT"
    fi
    
    success "Permissions check passed"
}

# Validate environment
validate_environment() {
    log "Validating ${ENVIRONMENT} environment for database migration..."
    
    # Check required environment variables
    required_vars=("DATABASE_URL")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            error "Required environment variable $var is not set"
        fi
    done
    
    # Check if database is accessible
    if ! command -v psql &> /dev/null; then
        error "psql command not found. Please install PostgreSQL client."
    fi
    
    if ! psql "$DATABASE_URL" -c "SELECT 1;" &> /dev/null; then
        error "Cannot connect to database. Please check DATABASE_URL."
    fi
    
    success "Environment validation passed"
}

# Create database backup
create_backup() {
    log "Creating database backup before migration..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Full database backup
    log "Creating full database backup..."
    pg_dump "$DATABASE_URL" > "$BACKUP_DIR/full_backup.sql" 2>> "$LOG_FILE"
    
    # Schema-only backup
    log "Creating schema backup..."
    pg_dump --schema-only "$DATABASE_URL" > "$BACKUP_DIR/schema_backup.sql" 2>> "$LOG_FILE"
    
    # Data backup for critical tables
    log "Creating data backup for critical tables..."
    
    critical_tables=(
        "users"
        "media_contacts"
        "ai_searches"
        "ai_search_sources"
        "ai_performance_logs"
        "ai_contact_duplicates"
    )
    
    for table in "${critical_tables[@]}"; do
        log "Backing up table: $table"
        pg_dump --data-only --table="$table" "$DATABASE_URL" > "$BACKUP_DIR/${table}_data.sql" 2>> "$LOG_FILE"
    done
    
    success "Database backup created at $BACKUP_DIR"
}

# Check migration status
check_migration_status() {
    log "Checking current migration status..."
    
    cd "$PROJECT_ROOT"
    
    # Check Prisma migration status
    migration_output=$(npx prisma migrate status 2>> "$LOG_FILE")
    
    if echo "$migration_output" | grep -q "No pending migrations"; then
        log "No pending migrations to apply"
        return 1
    elif echo "$migration_output" | grep -q "Pending migrations"; then
        log "Pending migrations detected:"
        echo "$migration_output" | tee -a "$LOG_FILE"
        return 0
    else
        error "Unable to determine migration status"
    fi
}

# Generate Prisma client
generate_client() {
    log "Generating Prisma client..."
    
    cd "$PROJECT_ROOT"
    
    npx prisma generate 2>> "$LOG_FILE"
    
    success "Prisma client generated"
}

# Apply database migrations
apply_migrations() {
    log "Applying database migrations..."
    
    cd "$PROJECT_ROOT"
    
    # Apply migrations using Prisma
    npx prisma migrate deploy 2>> "$LOG_FILE"
    
    success "Database migrations applied"
}

# Verify migration success
verify_migration() {
    log "Verifying migration success..."
    
    cd "$PROJECT_ROOT"
    
    # Check if migration status shows no pending migrations
    if npx prisma migrate status 2>> "$LOG_FILE" | grep -q "No pending migrations"; then
        success "Migration verification passed"
    else
        error "Migration verification failed - pending migrations still exist"
    fi
    
    # Test database connectivity with new schema
    if psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" &> /dev/null; then
        success "Database connectivity verification passed"
    else
        error "Database connectivity verification failed"
    fi
    
    # Check if critical tables exist
    critical_tables=(
        "users"
        "media_contacts"
        "ai_searches"
        "ai_search_sources"
        "ai_performance_logs"
    )
    
    for table in "${critical_tables[@]}"; do
        if psql "$DATABASE_URL" -c "SELECT 1 FROM $table LIMIT 1;" &> /dev/null; then
            log "Table $table is accessible"
        else
            error "Table $table is not accessible after migration"
        fi
    done
    
    success "Migration verification completed"
}

# Run post-migration scripts
run_post_migration_scripts() {
    log "Running post-migration scripts..."
    
    cd "$PROJECT_ROOT"
    
    # Run any post-migration data updates if they exist
    if [[ -f "scripts/deployment/post-migration.sql" ]]; then
        log "Executing post-migration SQL script..."
        psql "$DATABASE_URL" < scripts/deployment/post-migration.sql 2>> "$LOG_FILE"
        success "Post-migration SQL script executed"
    fi
    
    # Run TypeScript post-migration script if it exists
    if [[ -f "scripts/deployment/post-migration.ts" ]]; then
        log "Executing post-migration TypeScript script..."
        npx ts-node scripts/deployment/post-migration.ts 2>> "$LOG_FILE"
        success "Post-migration TypeScript script executed"
    fi
    
    # Update statistics for better query performance
    log "Updating database statistics..."
    psql "$DATABASE_URL" -c "ANALYZE;" 2>> "$LOG_FILE"
    
    success "Post-migration scripts completed"
}

# Rollback migration
rollback_migration() {
    log "Initiating migration rollback..."
    
    cd "$PROJECT_ROOT"
    
    # Get the latest migration to rollback
    latest_migration=$(ls -t prisma/migrations/ | head -n 1)
    
    if [[ -z "$latest_migration" ]]; then
        error "No migrations found to rollback"
    fi
    
    log "Rolling back migration: $latest_migration"
    
    # Restore database from backup
    if [[ -f "$BACKUP_DIR/full_backup.sql" ]]; then
        log "Restoring database from backup..."
        psql "$DATABASE_URL" < "$BACKUP_DIR/full_backup.sql" 2>> "$LOG_FILE"
        success "Database restored from backup"
    else
        error "No backup file found for rollback"
    fi
    
    # Regenerate Prisma client
    npx prisma generate 2>> "$LOG_FILE"
    
    success "Migration rollback completed"
}

# Send migration notification
send_notification() {
    local status=$1
    local message=$2
    
    log "Sending migration notification: $status"
    
    # Example webhook notification (customize as needed)
    if [[ -n "${MIGRATION_WEBHOOK_URL}" ]]; then
        curl -X POST "$MIGRATION_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{\"status\": \"$status\", \"message\": \"$message\", \"environment\": \"$ENVIRONMENT\", \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" \
            2>> "$LOG_FILE" || true
    fi
}

# Create migration for new feature
create_migration() {
    local migration_name=$1
    
    if [[ -z "$migration_name" ]]; then
        error "Migration name is required. Usage: $0 create <migration_name>"
    fi
    
    log "Creating new migration: $migration_name"
    
    cd "$PROJECT_ROOT"
    
    npx prisma migrate dev --name "$migration_name" 2>> "$LOG_FILE"
    
    success "Migration created: $migration_name"
}

# Reset database (development only)
reset_database() {
    if [[ "$ENVIRONMENT" == "production" ]]; then
        error "Database reset is not allowed in production environment"
    fi
    
    log "Resetting database..."
    
    cd "$PROJECT_ROOT"
    
    npx prisma migrate reset --force 2>> "$LOG_FILE"
    
    success "Database reset completed"
}

# Main migration flow
main() {
    log "Starting database migration for ${ENVIRONMENT} environment..."
    
    # Set up error handling
    trap 'error "Database migration failed at line $LINENO. Check log file: $LOG_FILE"' ERR
    
    check_permissions
    validate_environment
    create_backup
    
    # Check if there are pending migrations
    if check_migration_status; then
        generate_client
        apply_migrations
        verify_migration
        run_post_migration_scripts
        
        # Disable rollback trap since migration was successful
        trap - ERR
        
        success "Database migration completed successfully!"
        send_notification "SUCCESS" "Database migration completed successfully in ${ENVIRONMENT} environment"
    else
        log "No migrations to apply"
        send_notification "NO_MIGRATIONS" "No pending migrations found in ${ENVIRONMENT} environment"
    fi
    
    log "Migration log available at: $LOG_FILE"
    log "Backup available at: $BACKUP_DIR"
}

# Parse command line arguments
case "${1:-migrate}" in
    "migrate")
        main
        ;;
    "rollback")
        check_permissions
        validate_environment
        rollback_migration
        send_notification "ROLLBACK_SUCCESS" "Database migration rollback completed in ${ENVIRONMENT} environment"
        ;;
    "status")
        check_permissions
        validate_environment
        check_migration_status
        ;;
    "create")
        create_migration "$2"
        ;;
    "reset")
        reset_database
        ;;
    "verify")
        check_permissions
        validate_environment
        verify_migration
        ;;
    *)
        echo "Usage: $0 {migrate|rollback|status|create <migration_name>|reset|verify}"
        echo "Environment: Set ENVIRONMENT variable (default: production)"
        exit 1
        ;;
esac