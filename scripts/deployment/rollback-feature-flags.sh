#!/bin/bash

# Feature Flag Rollback Script for AI Search Feature
# This script handles feature flag-specific rollback procedures for the AI Search feature

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENVIRONMENT="${ENVIRONMENT:-production}"
BACKUP_DIR="/tmp/media-contacts-ff-rollback-$(date +%Y%m%d-%H%M%S)"
LOG_FILE="/tmp/ff-rollback-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).log"
ROLLBACK_REASON="${1:-Unknown}"
ROLLBACK_SCOPE="${2:-all}"  # all, ai-search, specific

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Rollback tracking
ROLLBACK_ID="ff-rollback-$(date +%Y%m%d-%H%M%S)"
ROLLBACK_SUCCESS=false
ROLLBACK_START_TIME=$(date +%s)

# AI Search feature flags
declare -a AI_SEARCH_FLAGS=(
    "ai-search-enabled"
    "ai-search-advanced-options"
    "ai-search-provider-openai"
    "ai-search-provider-anthropic"
    "ai-search-caching"
    "ai-contact-extraction"
    "ai-content-analysis"
    "ai-search-beta-access"
    "ai-search-power-users"
    "ai-search-internal-only"
)

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

# Check feature flag service permissions
check_ff_permissions() {
    log "Checking feature flag service permissions..."
    
    # Check if curl is available
    if ! command -v curl &> /dev/null; then
        error "curl command not found. Please install curl."
    fi
    
    # Check if jq is available
    if ! command -v jq &> /dev/null; then
        error "jq command not found. Please install jq for JSON parsing."
    fi
    
    # Check if API key is available
    if [[ -z "$API_KEY" ]]; then
        error "API_KEY environment variable not set"
    fi
    
    # Check if API URL is available
    if [[ -z "$API_URL" ]]; then
        error "API_URL environment variable not set"
    fi
    
    # Test API connectivity
    if ! curl -f -s -H "Authorization: Bearer $API_KEY" "$API_URL/api/health" > /dev/null; then
        error "Cannot connect to feature flag API. Please check API_URL and API_KEY."
    fi
    
    success "Feature flag service permissions check passed"
}

# Validate feature flag state
validate_ff_state() {
    log "Validating current feature flag state..."
    
    local enabled_flags=0
    local disabled_flags=0
    
    # Check status of AI search flags
    for flag in "${AI_SEARCH_FLAGS[@]}"; do
        local flag_response=$(curl -s -H "Authorization: Bearer $API_KEY" "$API_URL/api/feature-flags/$flag" 2>> "$LOG_FILE")
        
        if [[ -n "$flag_response" ]]; then
            local is_enabled=$(echo "$flag_response" | jq -r '.enabled // false')
            local rollout=$(echo "$flag_response" | jq -r '.rolloutPercentage // 0')
            
            if [[ "$is_enabled" == "true" ]]; then
                ((enabled_flags++))
                log "Flag $flag: ENABLED ($rollout% rollout)"
            else
                ((disabled_flags++))
                log "Flag $flag: DISABLED"
            fi
        else
            warning "Could not retrieve status for flag: $flag"
        fi
    done
    
    log "Found $enabled_flags enabled AI search flags and $disabled_flags disabled flags"
    
    if [[ "$enabled_flags" -eq 0 ]]; then
        warning "No AI search flags are currently enabled. Rollback may not be necessary."
        return 1
    fi
    
    success "Feature flag state validation completed"
    return 0
}

# Create feature flag backup
create_ff_backup() {
    log "Creating feature flag backup..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup all AI search flags
    local backup_data="{\"flags\": ["
    local first=true
    
    for flag in "${AI_SEARCH_FLAGS[@]}"; do
        local flag_response=$(curl -s -H "Authorization: Bearer $API_KEY" "$API_URL/api/feature-flags/$flag" 2>> "$LOG_FILE")
        
        if [[ -n "$flag_response" ]]; then
            if [[ "$first" == true ]]; then
                first=false
            else
                backup_data+=","
            fi
            backup_data+="$flag_response"
        fi
    done
    
    backup_data+="]}"
    
    # Save backup to file
    echo "$backup_data" | jq . > "$BACKUP_DIR/feature-flags-backup.json"
    
    # Backup flag evaluation logs
    log "Backing up flag evaluation logs..."
    curl -s -H "Authorization: Bearer $API_KEY" \
        "$API_URL/api/feature-flags/evaluations?limit=1000" > "$BACKUP_DIR/flag-evaluations.json" 2>> "$LOG_FILE" || true
    
    # Backup audit logs
    log "Backing up flag audit logs..."
    curl -s -H "Authorization: Bearer $API_KEY" \
        "$API_URL/api/feature-flags/audit-log?limit=500" > "$BACKUP_DIR/flag-audit-log.json" 2>> "$LOG_FILE" || true
    
    # Create backup metadata
    cat > "$BACKUP_DIR/ff-backup-metadata.json" << EOF
{
  "backup_id": "$ROLLBACK_ID",
  "environment": "$ENVIRONMENT",
  "reason": "$ROLLBACK_REASON",
  "scope": "$ROLLBACK_SCOPE",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "api_url": "$API_URL",
  "flags_backed_up": $(echo "$backup_data" | jq '.flags | length'),
  "backup_files": [
    "feature-flags-backup.json",
    "flag-evaluations.json",
    "flag-audit-log.json"
  ]
}
EOF
    
    success "Feature flag backup created at $BACKUP_DIR"
}

# Generate feature flag rollback plan
generate_ff_rollback_plan() {
    log "Generating feature flag rollback plan..."
    
    cat > "$BACKUP_DIR/ff-rollback-plan.json" << EOF
{
  "rollback_id": "$ROLLBACK_ID",
  "environment": "$ENVIRONMENT",
  "reason": "$ROLLBACK_REASON",
  "scope": "$ROLLBACK_SCOPE",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "steps": [
EOF

    local first=true
    for flag in "${AI_SEARCH_FLAGS[@]}"; do
        if [[ "$first" == true ]]; then
            first=false
        else
            echo "," >> "$BACKUP_DIR/ff-rollback-plan.json"
        fi
        
        cat >> "$BACKUP_DIR/ff-rollback-plan.json" << EOF
    {
      "flag": "$flag",
      "action": "disable",
      "rollout_percentage": 0,
      "user_segments": [],
      "description": "AI Search Feature - Disabled due to rollback '$ROLLBACK_ID': $ROLLBACK_REASON",
      "priority": "high"
    }
EOF
    done
    
    cat >> "$BACKUP_DIR/ff-rollback-plan.json" << EOF
  ],
  "verification_steps": [
    "Check all flags are disabled",
    "Verify rollout percentage is 0%",
    "Confirm user segments are empty",
    "Validate flag evaluations return false"
  ],
  "rollback_strategy": "immediate"
}
EOF
    
    success "Feature flag rollback plan generated at $BACKUP_DIR/ff-rollback-plan.json"
}

# Execute feature flag rollback
execute_ff_rollback() {
    log "Executing feature flag rollback..."
    
    local disabled_count=0
    local failed_count=0
    
    for flag in "${AI_SEARCH_FLAGS[@]}"; do
        log "Disabling flag: $flag"
        
        # Create disable payload
        local payload=$(cat << EOF
{
    "enabled": false,
    "rolloutPercentage": 0,
    "userSegments": [],
    "description": "AI Search Feature - Disabled due to rollback '$ROLLBACK_ID': $ROLLBACK_REASON"
}
EOF
)
        
        # Execute disable request
        local response=$(curl -s -X POST \
            -H "Authorization: Bearer $API_KEY" \
            -H "Content-Type: application/json" \
            -d "$payload" \
            "$API_URL/api/feature-flags/$flag" 2>> "$LOG_FILE")
        
        if [[ $? -eq 0 ]]; then
            ((disabled_count++))
            success "Flag $flag disabled successfully"
            
            # Log to audit trail
            curl -s -X POST \
                -H "Authorization: Bearer $API_KEY" \
                -H "Content-Type: application/json" \
                -d "{
                    \"flagId\": \"$flag\",
                    \"action\": \"EMERGENCY_ROLLBACK\",
                    \"reason\": \"$ROLLBACK_REASON\",
                    \"rollbackId\": \"$ROLLBACK_ID\",
                    \"performedBy\": \"rollback-script\",
                    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
                }" \
                "$API_URL/api/feature-flags/audit-log" 2>> "$LOG_FILE" || true
        else
            ((failed_count++))
            error "Failed to disable flag $flag"
        fi
        
        # Small delay between requests
        sleep 0.5
    done
    
    log "Disabled $disabled_count flags, $failed_count failures"
    
    if [[ "$failed_count" -gt 0 ]]; then
        error "Some feature flags could not be disabled"
        return 1
    fi
    
    success "All feature flags disabled successfully"
    return 0
}

# Clear feature flag cache
clear_ff_cache() {
    log "Clearing feature flag cache..."
    
    # Clear application cache
    if [[ -n "$API_URL" ]]; then
        curl -s -X POST \
            -H "Authorization: Bearer $API_KEY" \
            "$API_URL/api/feature-flags/cache/clear" 2>> "$LOG_FILE" || true
        
        success "Feature flag cache cleared"
    else
        warning "Could not clear feature flag cache - API URL not available"
    fi
    
    # Clear Redis cache if available
    if command -v redis-cli &> /dev/null && [[ -n "$REDIS_URL" ]]; then
        redis-cli -u "$REDIS_URL" FLUSHDB 2>> "$LOG_FILE" || true
        success "Redis cache cleared"
    fi
    
    # Clear local application cache
    if [[ -d "$PROJECT_ROOT/.next/cache" ]]; then
        rm -rf "$PROJECT_ROOT/.next/cache"
        success "Local application cache cleared"
    fi
}

# Verify feature flag rollback
verify_ff_rollback() {
    log "Verifying feature flag rollback..."
    
    local verification_errors=0
    local all_disabled=true
    
    # Check each flag status
    for flag in "${AI_SEARCH_FLAGS[@]}"; do
        local flag_response=$(curl -s -H "Authorization: Bearer $API_KEY" "$API_URL/api/feature-flags/$flag" 2>> "$LOG_FILE")
        
        if [[ -n "$flag_response" ]]; then
            local is_enabled=$(echo "$flag_response" | jq -r '.enabled // false')
            local rollout=$(echo "$flag_response" | jq -r '.rolloutPercentage // 0')
            local segments=$(echo "$flag_response" | jq -r '.userSegments | length // 0')
            
            if [[ "$is_enabled" == "true" ]]; then
                error "Flag $flag is still enabled"
                ((verification_errors++))
                all_disabled=false
            else
                success "Flag $flag is disabled"
            fi
            
            if [[ "$rollout" -gt 0 ]]; then
                error "Flag $flag has rollout percentage > 0: $rollout%"
                ((verification_errors++))
            fi
            
            if [[ "$segments" -gt 0 ]]; then
                error "Flag $flag has user segments configured"
                ((verification_errors++))
            fi
        else
            error "Could not verify status for flag: $flag"
            ((verification_errors++))
        fi
    done
    
    # Test flag evaluation
    log "Testing flag evaluation..."
    local test_response=$(curl -s -H "Authorization: Bearer $API_KEY" \
        -X POST \
        -H "Content-Type: application/json" \
        -d '{
            "flagName": "ai-search-enabled",
            "context": {
                "userId": "test-user",
                "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
            }
        }' \
        "$API_URL/api/feature-flags/evaluate" 2>> "$LOG_FILE")
    
    if [[ -n "$test_response" ]]; then
        local evaluation_result=$(echo "$test_response" | jq -r '.enabled // false')
        if [[ "$evaluation_result" == "false" ]]; then
            success "Flag evaluation returns false as expected"
        else
            error "Flag evaluation returns true - flags may not be properly disabled"
            ((verification_errors++))
        fi
    fi
    
    if [[ "$verification_errors" -eq 0 ]]; then
        success "Feature flag rollback verification completed successfully"
        return 0
    else
        error "Feature flag rollback verification failed with $verification_errors errors"
        return 1
    fi
}

# Create feature flag rollback report
create_ff_report() {
    local rollback_duration=$(($(date +%s) - ROLLBACK_START_TIME))
    
    cat > "$BACKUP_DIR/ff-rollback-report.md" << EOF
# Feature Flag Rollback Report

## Rollback Information
- **Rollback ID**: $ROLLBACK_ID
- **Environment**: $ENVIRONMENT
- **Reason**: $ROLLBACK_REASON
- **Scope**: $ROLLBACK_SCOPE
- **Timestamp**: $(date -u +%Y-%m-%dT%H:%M:%SZ)
- **Duration**: ${rollback_duration} seconds
- **Status**: $([ "$ROLLBACK_SUCCESS" = true ] && echo "Success" || echo "Failed")

## Affected Feature Flags
$(for flag in "${AI_SEARCH_FLAGS[@]}"; do
    echo "- \`$flag\`"
done)

## Rollback Actions
1. Backed up current feature flag configurations
2. Generated rollback plan
3. Disabled all AI search related feature flags
4. Cleared feature flag cache
5. Verified rollback completion

## Verification Results
$([ "$ROLLBACK_SUCCESS" = true ] && echo "✅ All feature flags disabled" || echo "❌ Some flags may still be enabled")

## Impact
- **User Impact**: AI Search features are now disabled for all users
- **Feature Availability**: All AI Search functionality is unavailable
- **Performance**: Improved performance due to disabled AI features

## Recovery Instructions
To restore AI Search functionality:
\`\`\`bash
# Restore from backup
curl -X POST "\$API_URL/api/feature-flags/restore" \
  -H "Authorization: Bearer \$API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"backup_file\": \"$BACKUP_DIR/feature-flags-backup.json\"}"
\`\`\`

## Monitoring
- Monitor flag evaluation logs
- Watch for unexpected AI search API calls
- Check user feedback regarding missing features

## Contacts
- **Product Manager**: [Product Contact]
- **Engineering Lead**: [Engineering Contact]
- **Feature Flag Owner**: [Owner Contact]
EOF
    
    success "Feature flag rollback report created at $BACKUP_DIR/ff-rollback-report.md"
}

# Send feature flag rollback notification
send_ff_notification() {
    local status=$1
    local message=$2
    
    log "Sending feature flag rollback notification: $status"
    
    local rollback_duration=$(($(date +%s) - ROLLBACK_START_TIME))
    
    # Create notification payload
    local notification_payload=$(cat << EOF
{
    "status": "$status",
    "message": "$message",
    "rollback_id": "$ROLLBACK_ID",
    "environment": "$ENVIRONMENT",
    "reason": "$ROLLBACK_REASON",
    "scope": "$ROLLBACK_SCOPE",
    "type": "feature-flags",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "duration_seconds": $rollback_duration,
    "backup_location": "$BACKUP_DIR",
    "flags_affected": $(printf '"%s",' "${AI_SEARCH_FLAGS[@]}" | jq -R . | jq -s .)
}
EOF
)
    
    # Send webhook notification
    if [[ -n "${FF_ROLLBACK_WEBHOOK_URL}" ]]; then
        curl -X POST "$FF_ROLLBACK_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "$notification_payload" \
            2>> "$LOG_FILE" || true
    fi
    
    # Email notification
    if command -v mail &> /dev/null && [[ -n "${PRODUCT_EMAIL}" ]]; then
        mail -s "Feature Flag Rollback $status: AI Search Feature - ${ENVIRONMENT}" "$PRODUCT_EMAIL" << EOF 2>> "$LOG_FILE"
Feature flag rollback $status for AI Search feature in ${ENVIRONMENT} environment:

Rollback ID: $ROLLBACK_ID
Reason: $ROLLBACK_REASON
Scope: $ROLLBACK_SCOPE
Duration: ${rollback_duration}s
Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)
Backup Location: $BACKUP_DIR

$message

Affected flags: $(IFS=', '; echo "${AI_SEARCH_FLAGS[*]}")

Full log available at: $LOG_FILE
Rollback report available at: $BACKUP_DIR/ff-rollback-report.md
EOF
    fi
}

# Main feature flag rollback flow
main() {
    log "Starting feature flag rollback for AI Search feature in ${ENVIRONMENT} environment..."
    log "Rollback reason: $ROLLBACK_REASON"
    log "Rollback scope: $ROLLBACK_SCOPE"
    
    # Set up error handling
    trap 'error "Feature flag rollback failed at line $LINENO. Check log file: $LOG_FILE"' ERR
    
    check_ff_permissions
    
    # Validate feature flag state (may exit early if no flags are enabled)
    if ! validate_ff_state; then
        warning "No AI search flags are currently enabled. Rollback may not be necessary."
        exit 0
    fi
    
    create_ff_backup
    generate_ff_rollback_plan
    execute_ff_rollback
    clear_ff_cache
    
    # Verify rollback and update status
    if verify_ff_rollback; then
        ROLLBACK_SUCCESS=true
    fi
    
    create_ff_report
    
    # Send appropriate notification based on success
    if [[ "$ROLLBACK_SUCCESS" == true ]]; then
        send_ff_notification "SUCCESS" "Feature flag rollback completed successfully. All AI Search features are now disabled."
        success "Feature flag rollback completed successfully!"
    else
        send_ff_notification "FAILURE" "Feature flag rollback failed or verification failed. Manual intervention may be required."
        error "Feature flag rollback failed or verification failed"
    fi
    
    log "Feature flag rollback log available at: $LOG_FILE"
    log "Backup available at: $BACKUP_DIR"
    log "Rollback report available at: $BACKUP_DIR/ff-rollback-report.md"
}

# Parse command line arguments
if [[ $# -lt 1 ]]; then
    echo "Usage: $0 <rollback_reason> [rollback_scope]"
    echo "Example: $0 \"Performance issues\" all"
    echo "Example: $0 \"User feedback\" ai-search"
    echo ""
    echo "Rollback scopes:"
    echo "  all - All AI search related flags (default)"
    echo "  ai-search - Core AI search flags only"
    echo "  specific - Specific flags (requires additional configuration)"
    echo ""
    echo "Environment: Set ENVIRONMENT variable"
    echo "API Configuration: Set API_URL and API_KEY variables"
    exit 1
fi

ROLLBACK_REASON="$1"
if [[ -n "$2" ]]; then
    ROLLBACK_SCOPE="$2"
fi

main "$@"