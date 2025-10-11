#!/bin/bash

# Database Rollback Script for AI Search Feature
# This script handles database-specific rollback procedures for the AI Search feature

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENVIRONMENT="${ENVIRONMENT:-production}"
BACKUP_DIR="/tmp/media-contacts-db-rollback-$(date +%Y%m%d-%H%M%S)"
LOG_FILE="/tmp/db-rollback-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).log"
ROLLBACK_REASON="${1:-Unknown}"
ROLLBACK_MODE="${2:-safe}"  # safe, force, point-in-time

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Rollback tracking
ROLLBACK_ID="db-rollback-$(date +%Y%m%d-%H%M%S)"
ROLLBACK_SUCCESS=false
ROLLBACK_START_TIME=$(date +%s)

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

info() {
    echo -e "${CYAN}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

# Check database permissions
check_database_permissions() {
    log "Checking database permissions..."
    
    # Check if psql is available
    if ! command -v psql &> /dev/null; then
        error "psql command not found. Please install PostgreSQL client."
    fi
    
    # Check if database is accessible
    if ! psql "$DATABASE_URL" -c "SELECT 1;" &> /dev/null; then
        error "Cannot connect to database. Please check DATABASE_URL."
    fi
    
    # Check if we have required permissions
    local has_create_table=$(psql "$DATABASE_URL" -tAc "SELECT has_table_privilege('public', 'CREATE TABLE');")
    local has_drop_table=$(psql "$DATABASE_URL" -tAc "SELECT has_table_privilege('public', 'DROP TABLE');")
    
    if [[ "$has_create_table" != "t" || "$has_drop_table" != "t" ]]; then
        error "Insufficient database permissions for rollback operations."
    fi
    
    success "Database permissions check passed"
}

# Validate database state
validate_database_state() {
    log "Validating database state for rollback..."
    
    # Check if AI search tables exist
    local ai_tables_exist=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_name LIKE 'ai_%' AND table_schema = 'public';")
    
    if [[ "$ai_tables_exist" -eq 0 ]]; then
        warning "No AI search tables found. Database may already be in a rolled back state."
        return 1
    fi
    
    # Check for active connections
    local active_connections=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active' AND query NOT LIKE '%pg_stat_activity%';")
    
    if [[ "$active_connections" -gt 0 ]]; then
        warning "Found $active_connections active database connections. Consider stopping the application first."
    fi
    
    # Check database size
    local db_size=$(psql "$DATABASE_URL" -tAc "SELECT pg_size_pretty(pg_database_size(current_database()));")
    log "Current database size: $db_size"
    
    success "Database state validation completed"
    return 0
}

# Create database backup
create_database_backup() {
    log "Creating comprehensive database backup..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Full database backup
    log "Creating full database backup..."
    pg_dump "$DATABASE_URL" --verbose --no-owner --no-privileges > "$BACKUP_DIR/full_backup.sql" 2>> "$LOG_FILE"
    
    # Schema-only backup
    log "Creating schema backup..."
    pg_dump --schema-only --no-owner --no-privileges "$DATABASE_URL" > "$BACKUP_DIR/schema_backup.sql" 2>> "$LOG_FILE"
    
    # Data backup for AI-related tables
    log "Creating data backup for AI-related tables..."
    
    local ai_tables=(
        "ai_searches"
        "ai_search_sources"
        "ai_extracted_contacts"
        "ai_performance_logs"
        "ai_contact_duplicates"
        "ai_extraction_jobs"
        "ai_extraction_cache"
        "ai_search_cache"
        "feature_flags"
        "feature_flag_evaluations"
        "user_segments"
    )
    
    for table in "${ai_tables[@]}"; do
        if psql "$DATABASE_URL" -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '$table');" | grep -q "t"; then
            log "Backing up table: $table"
            pg_dump --data-only --no-owner --no-privileges --table="$table" "$DATABASE_URL" > "$BACKUP_DIR/${table}_data.sql" 2>> "$LOG_FILE"
        fi
    done
    
    # Backup triggers and functions
    log "Backing up triggers and functions..."
    pg_dump --no-owner --no-privileges --trigger-only "$DATABASE_URL" > "$BACKUP_DIR/triggers.sql" 2>> "$LOG_FILE"
    pg_dump --no-owner --no-privileges --function-only "$DATABASE_URL" > "$BACKUP_DIR/functions.sql" 2>> "$LOG_FILE"
    
    # Create backup metadata
    cat > "$BACKUP_DIR/backup-metadata.json" << EOF
{
  "backup_id": "$ROLLBACK_ID",
  "environment": "$ENVIRONMENT",
  "reason": "$ROLLBACK_REASON",
  "mode": "$ROLLBACK_MODE",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "database_url": "${DATABASE_URL:0:20}...",
  "tables_backed_up": $(printf '"%s",' "${ai_tables[@]}" | jq -R . | jq -s . | jq 'map(select(length > 0))'),
  "backup_files": [
    "full_backup.sql",
    "schema_backup.sql",
    "triggers.sql",
    "functions.sql"
  ]
}
EOF
    
    success "Database backup created at $BACKUP_DIR"
}

# Generate database rollback script
generate_rollback_script() {
    log "Generating database rollback script..."
    
    # Analyze current database state
    local ai_tables=$(psql "$DATABASE_URL" -tAc "SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'ai_%' AND table_schema = 'public' ORDER BY table_name;")
    
    # Create rollback script
    cat > "$BACKUP_DIR/database-rollback.sql" << EOF
-- Database Rollback Script for AI Search Feature
-- Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)
-- Rollback ID: $ROLLBACK_ID
-- Mode: $ROLLBACK_MODE
-- Reason: $ROLLBACK_REASON

-- Start transaction
BEGIN;

-- Set session configuration for safe rollback
SET session_replication_role = replica;
SET lock_timeout = '30s';
SET statement_timeout = '10min';

-- Create rollback audit table if it doesn't exist
CREATE TABLE IF NOT EXISTS database_rollback_audit (
    id SERIAL PRIMARY KEY,
    rollback_id VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    environment VARCHAR(20) NOT NULL,
    reason TEXT,
    mode VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'running',
    metadata JSONB
);

-- Insert rollback audit record
INSERT INTO database_rollback_audit (rollback_id, environment, reason, mode, metadata)
VALUES ('$ROLLBACK_ID', '$ENVIRONMENT', '$ROLLBACK_REASON', '$ROLLBACK_MODE', '{"timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"}');

-- Disable foreign key constraints temporarily
SET session_replication_role = replica;

EOF

    # Add DROP statements for AI tables in reverse dependency order
    local drop_order=(
        "ai_extracted_contacts"
        "ai_search_sources"
        "ai_searches"
        "ai_contact_duplicates"
        "ai_performance_logs"
        "ai_extraction_jobs"
        "ai_extraction_cache"
        "ai_search_cache"
        "feature_flag_evaluations"
        "user_segments"
        "feature_flags"
    )
    
    for table in "${drop_order[@]}"; do
        if echo "$ai_tables" | grep -q "^$table$"; then
            echo "-- Drop table: $table" >> "$BACKUP_DIR/database-rollback.sql"
            echo "DROP TABLE IF EXISTS $table CASCADE;" >> "$BACKUP_DIR/database-rollback.sql"
            echo "" >> "$BACKUP_DIR/database-rollback.sql"
        fi
    done
    
    # Add statements to remove AI-related columns
    cat >> "$BACKUP_DIR/database-rollback.sql" << EOF
-- Remove AI-related columns from existing tables
DO \$\$
BEGIN
    -- Check and remove columns from media_contacts table
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'media_contacts' AND column_name = 'ai_extracted') THEN
        ALTER TABLE media_contacts DROP COLUMN IF EXISTS ai_extracted;
        RAISE NOTICE 'Dropped column ai_extracted from media_contacts';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'media_contacts' AND column_name = 'ai_confidence_score') THEN
        ALTER TABLE media_contacts DROP COLUMN IF EXISTS ai_confidence_score;
        RAISE NOTICE 'Dropped column ai_confidence_score from media_contacts';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'media_contacts' AND column_name = 'ai_extraction_metadata') THEN
        ALTER TABLE media_contacts DROP COLUMN IF EXISTS ai_extraction_metadata;
        RAISE NOTICE 'Dropped column ai_extraction_metadata from media_contacts';
    END IF;
    
    -- Check and remove columns from users table
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'ai_search_quota') THEN
        ALTER TABLE users DROP COLUMN IF EXISTS ai_search_quota;
        RAISE NOTICE 'Dropped column ai_search_quota from users';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'ai_search_preferences') THEN
        ALTER TABLE users DROP COLUMN IF EXISTS ai_search_preferences;
        RAISE NOTICE 'Dropped column ai_search_preferences from users';
    END IF;
END \$\$;

-- Re-enable foreign key constraints
SET session_replication_role = DEFAULT;

-- Update Prisma migrations to mark AI migrations as rolled back
UPDATE _prisma_migrations 
SET rolled_back_at = NOW() 
WHERE migration_name LIKE '%ai_%' OR migration_name LIKE '%feature_%';

-- Analyze tables for performance
ANALYZE;

-- Verify rollback completion
DO \$\$
DECLARE
    remaining_ai_tables INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_ai_tables
    FROM information_schema.tables
    WHERE table_name LIKE 'ai_%' AND table_schema = 'public';
    
    IF remaining_ai_tables = 0 THEN
        UPDATE database_rollback_audit 
        SET status = 'completed', metadata = metadata || '{"remaining_ai_tables": 0}'
        WHERE rollback_id = '$ROLLBACK_ID';
        
        RAISE NOTICE 'Database rollback completed successfully. No AI tables remain.';
    ELSE
        UPDATE database_rollback_audit 
        SET status = 'partial', metadata = metadata || '{"remaining_ai_tables": ' || remaining_ai_tables || '}'
        WHERE rollback_id = '$ROLLBACK_ID';
        
        RAISE WARNING 'Database rollback partially completed. % AI tables remain.', remaining_ai_tables;
    END IF;
END \$\$;

-- Commit transaction
COMMIT;

-- Final verification query
SELECT 'Database rollback process completed' as status, 
       '$ROLLBACK_ID' as rollback_id,
       NOW() as completion_time;

EOF

    success "Database rollback script generated at $BACKUP_DIR/database-rollback.sql"
}

# Execute database rollback
execute_database_rollback() {
    log "Executing database rollback..."
    
    # Confirm rollback in non-force mode
    if [[ "$ROLLBACK_MODE" != "force" ]]; then
        echo ""
        echo "WARNING: This will permanently delete all AI search related data from the database."
        echo "Rollback ID: $ROLLBACK_ID"
        echo "Backup location: $BACKUP_DIR"
        echo ""
        read -p "Are you sure you want to continue? (yes/no): " confirm
        
        if [[ "$confirm" != "yes" ]]; then
            error "Database rollback cancelled by user"
            exit 1
        fi
    fi
    
    # Execute rollback script
    log "Executing database rollback script..."
    
    if PGPASSWORD="${DATABASE_URL##*@}" psql "${DATABASE_URL%@*}" < "$BACKUP_DIR/database-rollback.sql" >> "$LOG_FILE" 2>&1; then
        success "Database rollback executed successfully"
    else
        error "Database rollback execution failed. Check log file: $LOG_FILE"
        return 1
    fi
}

# Verify database rollback
verify_database_rollback() {
    log "Verifying database rollback..."
    
    local verification_errors=0
    
    # Check if AI tables still exist
    local remaining_ai_tables=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_name LIKE 'ai_%' AND table_schema = 'public';")
    
    if [[ "$remaining_ai_tables" -gt 0 ]]; then
        error "Found $remaining_ai_tables AI tables still remaining after rollback"
        ((verification_errors++))
    else
        success "All AI tables have been successfully removed"
    fi
    
    # Check if AI-related columns still exist
    local ai_columns_exist=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM information_schema.columns WHERE column_name LIKE 'ai_%' AND table_schema = 'public';")
    
    if [[ "$ai_columns_exist" -gt 0 ]]; then
        error "Found $ai_columns_exist AI-related columns still remaining after rollback"
        ((verification_errors++))
    else
        success "All AI-related columns have been successfully removed"
    fi
    
    # Check database connectivity
    if psql "$DATABASE_URL" -c "SELECT 1;" &> /dev/null; then
        success "Database connectivity verified"
    else
        error "Database connectivity failed after rollback"
        ((verification_errors++))
    fi
    
    # Check basic application tables
    local critical_tables=("users" "media_contacts" "categories" "countries" "regions")
    for table in "${critical_tables[@]}"; do
        if psql "$DATABASE_URL" -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '$table');" | grep -q "t"; then
            success "Critical table $table exists and is accessible"
        else
            error "Critical table $table is missing or inaccessible"
            ((verification_errors++))
        fi
    done
    
    if [[ "$verification_errors" -eq 0 ]]; then
        success "Database rollback verification completed successfully"
        return 0
    else
        error "Database rollback verification failed with $verification_errors errors"
        return 1
    fi
}

# Point-in-time recovery (if available)
point_in_time_recovery() {
    local target_time="$1"
    
    if [[ -z "$target_time" ]]; then
        error "Target time required for point-in-time recovery"
        return 1
    fi
    
    log "Initiating point-in-time recovery to: $target_time"
    
    # This would require PostgreSQL's point-in-time recovery capabilities
    # Implementation depends on your database setup and backup strategy
    
    warning "Point-in-time recovery requires additional configuration"
    warning "Please ensure you have:
    1. Continuous WAL archiving enabled
    2. Base backup available
    3. Recovery configuration in place
    4. Sufficient maintenance window"
    
    # Create recovery configuration
    cat > "$BACKUP_DIR/recovery.conf" << EOF
# Point-in-time recovery configuration
restore_command = 'cp /path/to/wal_archive/%f %p'
recovery_target_time = '$target_time'
recovery_target_inclusive = true
EOF
    
    info "Recovery configuration created at $BACKUP_DIR/recovery.conf"
    info "Manual intervention required to complete point-in-time recovery"
}

# Create rollback summary
create_rollback_summary() {
    local rollback_duration=$(($(date +%s) - ROLLBACK_START_TIME))
    
    cat > "$BACKUP_DIR/rollback-summary.md" << EOF
# Database Rollback Summary

## Rollback Information
- **Rollback ID**: $ROLLBACK_ID
- **Environment**: $ENVIRONMENT
- **Reason**: $ROLLBACK_REASON
- **Mode**: $ROLLBACK_MODE
- **Timestamp**: $(date -u +%Y-%m-%dT%H:%M:%SZ)
- **Duration**: ${rollback_duration} seconds
- **Status**: $([ "$ROLLBACK_SUCCESS" = true ] && echo "Success" || echo "Failed")

## Database State
- **Database URL**: ${DATABASE_URL:0:20}...
- **Backup Location**: $BACKUP_DIR
- **Tables Removed**: AI search related tables
- **Columns Removed**: AI-related columns from existing tables

## Files Created
- \`full_backup.sql\` - Complete database backup
- \`schema_backup.sql\` - Schema-only backup
- \`database-rollback.sql\` - Rollback execution script
- \`rollback-summary.md\` - This summary file
- \`backup-metadata.json\` - Backup metadata

## Verification Results
$([ "$ROLLBACK_SUCCESS" = true ] && echo "✅ All verifications passed" || echo "❌ Some verifications failed")

## Next Steps
1. Verify application functionality
2. Monitor database performance
3. Update documentation
4. Review rollback procedure

## Recovery Instructions
If you need to restore from the backup:
\`\`\`bash
psql $DATABASE_URL < $BACKUP_DIR/full_backup.sql
\`\`\`

## Contacts
- **Database Administrator**: [DBA Contact]
- **Engineering Lead**: [Engineering Contact]
- **Product Manager**: [Product Contact]
EOF
    
    success "Rollback summary created at $BACKUP_DIR/rollback-summary.md"
}

# Send database rollback notification
send_database_notification() {
    local status=$1
    local message=$2
    
    log "Sending database rollback notification: $status"
    
    local rollback_duration=$(($(date +%s) - ROLLBACK_START_TIME))
    
    # Create notification payload
    local notification_payload=$(cat << EOF
{
    "status": "$status",
    "message": "$message",
    "rollback_id": "$ROLLBACK_ID",
    "environment": "$ENVIRONMENT",
    "reason": "$ROLLBACK_REASON",
    "mode": "$ROLLBACK_MODE",
    "type": "database",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "duration_seconds": $rollback_duration,
    "backup_location": "$BACKUP_DIR"
}
EOF
)
    
    # Send webhook notification
    if [[ -n "${DB_ROLLBACK_WEBHOOK_URL}" ]]; then
        curl -X POST "$DB_ROLLBACK_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "$notification_payload" \
            2>> "$LOG_FILE" || true
    fi
    
    # Email notification
    if command -v mail &> /dev/null && [[ -n "${DB_ADMIN_EMAIL}" ]]; then
        mail -s "Database Rollback $status: AI Search Feature - ${ENVIRONMENT}" "$DB_ADMIN_EMAIL" << EOF 2>> "$LOG_FILE"
Database rollback $status for AI Search feature in ${ENVIRONMENT} environment:

Rollback ID: $ROLLBACK_ID
Reason: $ROLLBACK_REASON
Mode: $ROLLBACK_MODE
Duration: ${rollback_duration}s
Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)
Backup Location: $BACKUP_DIR

$message

Full log available at: $LOG_FILE
Rollback summary available at: $BACKUP_DIR/rollback-summary.md
EOF
    fi
}

# Main database rollback flow
main() {
    log "Starting database rollback for AI Search feature in ${ENVIRONMENT} environment..."
    log "Rollback reason: $ROLLBACK_REASON"
    log "Rollback mode: $ROLLBACK_MODE"
    
    # Set up error handling
    trap 'error "Database rollback failed at line $LINENO. Check log file: $LOG_FILE"' ERR
    
    check_database_permissions
    
    # Validate database state (may exit early if no AI tables exist)
    if ! validate_database_state; then
        warning "Database appears to already be in a rolled back state"
        exit 0
    fi
    
    create_database_backup
    generate_rollback_script
    
    # Handle different rollback modes
    case "$ROLLBACK_MODE" in
        "point-in-time")
            if [[ -n "$3" ]]; then
                point_in_time_recovery "$3"
            else
                error "Point-in-time recovery requires a target timestamp"
                exit 1
            fi
            ;;
        "force"|"safe")
            execute_database_rollback
            ;;
        *)
            error "Unknown rollback mode: $ROLLBACK_MODE"
            exit 1
            ;;
    esac
    
    # Verify rollback and update status
    if verify_database_rollback; then
        ROLLBACK_SUCCESS=true
    fi
    
    create_rollback_summary
    
    # Send appropriate notification based on success
    if [[ "$ROLLBACK_SUCCESS" == true ]]; then
        send_database_notification "SUCCESS" "Database rollback completed successfully. All AI search related data has been removed."
        success "Database rollback completed successfully!"
    else
        send_database_notification "FAILURE" "Database rollback failed or verification failed. Manual intervention may be required."
        error "Database rollback failed or verification failed"
    fi
    
    log "Database rollback log available at: $LOG_FILE"
    log "Backup available at: $BACKUP_DIR"
    log "Rollback summary available at: $BACKUP_DIR/rollback-summary.md"
}

# Parse command line arguments
if [[ $# -lt 1 ]]; then
    echo "Usage: $0 <rollback_reason> [rollback_mode] [target_time]"
    echo "Example: $0 \"Performance issues\" safe"
    echo "Example: $0 \"Data corruption\" point-in-time \"2024-01-15 10:30:00 UTC\""
    echo ""
    echo "Rollback modes:"
    echo "  safe - Interactive mode with confirmation (default)"
    echo "  force - Non-interactive mode"
    echo "  point-in-time - Recover to specific timestamp"
    echo ""
    echo "Environment: Set ENVIRONMENT variable"
    exit 1
fi

ROLLBACK_REASON="$1"
if [[ -n "$2" ]]; then
    ROLLBACK_MODE="$2"
fi

main "$@"