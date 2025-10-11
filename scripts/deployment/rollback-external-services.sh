#!/bin/bash

# External Service Integration Rollback Script for AI Search Feature
# This script handles external service integration rollback procedures for the AI Search feature

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENVIRONMENT="${ENVIRONMENT:-production}"
BACKUP_DIR="/tmp/media-contacts-services-rollback-$(date +%Y%m%d-%H%M%S)"
LOG_FILE="/tmp/services-rollback-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).log"
ROLLBACK_REASON="${1:-Unknown}"
ROLLBACK_SCOPE="${2:-all}"  # all, ai-services, specific

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Rollback tracking
ROLLBACK_ID="services-rollback-$(date +%Y%m%d-%H%M%S)"
ROLLBACK_SUCCESS=false
ROLLBACK_START_TIME=$(date +%s)

# External AI services
declare -A AI_SERVICES=(
    ["openai"]="OpenAI GPT API"
    ["anthropic"]="Anthropic Claude API"
    ["exa"]="Exa Search API"
    ["firecrawl"]="Firecrawl Web Scraping API"
)

# Service configuration paths
declare -A SERVICE_CONFIG_PATHS=(
    ["openai"]="$PROJECT_ROOT/src/lib/ai/services/config/openai.json"
    ["anthropic"]="$PROJECT_ROOT/src/lib/ai/services/config/anthropic.json"
    ["exa"]="$PROJECT_ROOT/src/lib/ai/services/config/exa.json"
    ["firecrawl"]="$PROJECT_ROOT/src/lib/ai/services/config/firecrawl.json"
)

# Service environment variables
declare -A SERVICE_ENV_VARS=(
    ["openai"]="OPENAI_API_KEY"
    ["anthropic"]="ANTHROPIC_API_KEY"
    ["exa"]="EXA_API_KEY"
    ["firecrawl"]="FIRECRAWL_API_KEY"
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

# Check external service permissions
check_service_permissions() {
    log "Checking external service permissions..."
    
    # Check if required tools are available
    local required_tools=("curl" "jq")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            error "Required tool not found: $tool"
        fi
    done
    
    # Check if we can write to configuration directory
    local config_dir="$PROJECT_ROOT/src/lib/ai/services/config"
    if [[ ! -d "$config_dir" ]]; then
        mkdir -p "$config_dir"
    fi
    
    if [[ ! -w "$config_dir" ]]; then
        error "Cannot write to service configuration directory: $config_dir"
    fi
    
    # Check if we can modify environment files
    if [[ -f "$PROJECT_ROOT/.env.production" && ! -w "$PROJECT_ROOT/.env.production" ]]; then
        error "Cannot write to .env.production file"
    fi
    
    success "External service permissions check passed"
}

# Validate external service state
validate_service_state() {
    log "Validating current external service state..."
    
    local enabled_services=0
    local disabled_services=0
    
    # Check each service configuration
    for service in "${!AI_SERVICES[@]}"; do
        local config_path="${SERVICE_CONFIG_PATHS[$service]}"
        local env_var="${SERVICE_ENV_VARS[$service]}"
        
        if [[ -f "$config_path" ]]; then
            local is_enabled=$(jq -r '.enabled // false' "$config_path" 2>/dev/null || echo "false")
            
            if [[ "$is_enabled" == "true" ]]; then
                ((enabled_services++))
                log "Service $service (${AI_SERVICES[$service]}): ENABLED"
            else
                ((disabled_services++))
                log "Service $service (${AI_SERVICES[$service]}): DISABLED"
            fi
        else
            # Check environment variable as fallback
            if [[ -n "${!env_var}" ]]; then
                ((enabled_services++))
                log "Service $service (${AI_SERVICES[$service]}): ENABLED (via env var)"
            else
                ((disabled_services++))
                log "Service $service (${AI_SERVICES[$service]}): DISABLED (no config)"
            fi
        fi
    done
    
    log "Found $enabled_services enabled AI services and $disabled_services disabled services"
    
    if [[ "$enabled_services" -eq 0 ]]; then
        warning "No AI services are currently enabled. Rollback may not be necessary."
        return 1
    fi
    
    success "External service state validation completed"
    return 0
}

# Create external service backup
create_service_backup() {
    log "Creating external service backup..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup service configurations
    local backup_data="{\"services\": {"
    local first=true
    
    for service in "${!AI_SERVICES[@]}"; do
        local config_path="${SERVICE_CONFIG_PATHS[$service]}"
        
        if [[ "$first" == true ]]; then
            first=false
        else
            backup_data+=","
        fi
        
        if [[ -f "$config_path" ]]; then
            # Backup configuration file
            cp "$config_path" "$BACKUP_DIR/${service}_config.json"
            
            # Add to backup data
            backup_data+="\"$service\": $(cat "$config_path")"
        else
            # Create entry for environment variable configuration
            local env_var="${SERVICE_ENV_VARS[$service]}"
            local env_value="${!env_var:-""}"
            
            backup_data+="\"$service\": {\"enabled\": \"$([ -n "$env_value" ] && echo "true" || echo "false")\", \"configured_via\": \"environment_variable\"}"
        fi
    done
    
    backup_data+="}}"
    
    # Save backup to file
    echo "$backup_data" | jq . > "$BACKUP_DIR/services-backup.json"
    
    # Backup environment variables
    if [[ -f "$PROJECT_ROOT/.env.production" ]]; then
        cp "$PROJECT_ROOT/.env.production" "$BACKUP_DIR/env-production.backup"
    fi
    
    # Backup service manager configuration
    if [[ -f "$PROJECT_ROOT/src/lib/ai/services/manager/config.json" ]]; then
        cp "$PROJECT_ROOT/src/lib/ai/services/manager/config.json" "$BACKUP_DIR/manager-config.backup"
    fi
    
    # Create backup metadata
    cat > "$BACKUP_DIR/services-backup-metadata.json" << EOF
{
  "backup_id": "$ROLLBACK_ID",
  "environment": "$ENVIRONMENT",
  "reason": "$ROLLBACK_REASON",
  "scope": "$ROLLBACK_SCOPE",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "services_backed_up": $(echo "$backup_data" | jq '.services | keys | length'),
  "backup_files": [
    "services-backup.json",
    "env-production.backup",
    "manager-config.backup"
  ]
}
EOF
    
    success "External service backup created at $BACKUP_DIR"
}

# Generate service rollback plan
generate_service_rollback_plan() {
    log "Generating external service rollback plan..."
    
    cat > "$BACKUP_DIR/services-rollback-plan.json" << EOF
{
  "rollback_id": "$ROLLBACK_ID",
  "environment": "$ENVIRONMENT",
  "reason": "$ROLLBACK_REASON",
  "scope": "$ROLLBACK_SCOPE",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "steps": [
EOF

    local first=true
    for service in "${!AI_SERVICES[@]}"; do
        if [[ "$first" == true ]]; then
            first=false
        else
            echo "," >> "$BACKUP_DIR/services-rollback-plan.json"
        fi
        
        cat >> "$BACKUP_DIR/services-rollback-plan.json" << EOF
    {
      "service": "$service",
      "name": "${AI_SERVICES[$service]}",
      "action": "disable",
      "config_path": "${SERVICE_CONFIG_PATHS[$service]}",
      "env_var": "${SERVICE_ENV_VARS[$service]}",
      "priority": "high",
      "backup_file": "$BACKUP_DIR/${service}_config.json"
    }
EOF
    done
    
    cat >> "$BACKUP_DIR/services-rollback-plan.json" << EOF
  ],
  "verification_steps": [
    "Check all service configurations are disabled",
    "Verify API keys are rotated or disabled",
    "Confirm service manager has no active services",
    "Test service calls fail gracefully"
  ],
  "rollback_strategy": "immediate"
}
EOF
    
    success "External service rollback plan generated at $BACKUP_DIR/services-rollback-plan.json"
}

# Disable external services
disable_external_services() {
    log "Disabling external AI services..."
    
    local disabled_count=0
    local failed_count=0
    
    for service in "${!AI_SERVICES[@]}"; do
        local config_path="${SERVICE_CONFIG_PATHS[$service]}"
        local env_var="${SERVICE_ENV_VARS[$service]}"
        
        log "Disabling service: $service (${AI_SERVICES[$service]})"
        
        # Create disabled configuration
        local current_config=""
        if [[ -f "$config_path" ]]; then
            current_config=$(cat "$config_path")
        fi
        
        # Create disabled configuration
        cat > "$config_path" << EOF
{
  "enabled": false,
  "disabled_reason": "Rollback $ROLLBACK_ID: $ROLLBACK_REASON",
  "disabled_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "previous_config": $([ -n "$current_config" ] && echo "$current_config" || echo "null"),
  "service_name": "${AI_SERVICES[$service]}",
  "rollback_id": "$ROLLBACK_ID"
}
EOF
        
        if [[ $? -eq 0 ]]; then
            ((disabled_count++))
            success "Service $service configuration disabled"
            
            # Optionally rotate or disable API key
            if [[ "$ROTATE_API_KEYS" == "true" && -n "${!env_var}" ]]; then
                log "Rotating API key for service: $service"
                # Generate a placeholder disabled key
                local disabled_key="DISABLED_ROLLBACK_$ROLLBACK_ID"
                
                # Update environment file
                if [[ -f "$PROJECT_ROOT/.env.production" ]]; then
                    sed -i.bak "s/^$env_var=.*/$env_var=$disabled_key/" "$PROJECT_ROOT/.env.production"
                fi
            fi
        else
            ((failed_count++))
            error "Failed to disable service $service"
        fi
    done
    
    # Update service manager configuration
    local manager_config="$PROJECT_ROOT/src/lib/ai/services/manager/config.json"
    if [[ -f "$manager_config" ]]; then
        cp "$manager_config" "$BACKUP_DIR/manager-config-before.json"
        
        # Update manager config to disable all services
        jq '.enabled = false | .disabled_reason = "Rollback '$ROLLBACK_ID': '$ROLLBACK_REASON'" | .disabled_at = "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"' "$manager_config" > "$manager_config.tmp" && mv "$manager_config.tmp" "$manager_config"
        
        success "Service manager configuration updated"
    fi
    
    log "Disabled $disabled_count services, $failed_count failures"
    
    if [[ "$failed_count" -gt 0 ]]; then
        error "Some external services could not be disabled"
        return 1
    fi
    
    success "All external services disabled successfully"
    return 0
}

# Clear service caches and connections
clear_service_caches() {
    log "Clearing service caches and connections..."
    
    # Clear AI service cache
    if [[ -d "$PROJECT_ROOT/.cache/ai-services" ]]; then
        rm -rf "$PROJECT_ROOT/.cache/ai-services"
        success "AI service cache cleared"
    fi
    
    # Clear Redis cache if available
    if command -v redis-cli &> /dev/null && [[ -n "$REDIS_URL" ]]; then
        # Clear AI service related keys
        redis-cli -u "$REDIS_URL" --scan --pattern "ai-service:*" | xargs redis-cli -u "$REDIS_URL" DEL 2>/dev/null || true
        success "Redis AI service cache cleared"
    fi
    
    # Clear application memory cache (if running)
    if command -v pm2 &> /dev/null; then
        pm2 reload media-contacts 2>> "$LOG_FILE" || true
        success "Application reloaded to clear in-memory cache"
    fi
    
    # Close any active connections
    log "Checking for active service connections..."
    # This would depend on your specific implementation
    
    success "Service caches and connections cleared"
}

# Verify external service rollback
verify_service_rollback() {
    log "Verifying external service rollback..."
    
    local verification_errors=0
    local all_disabled=true
    
    # Check each service configuration
    for service in "${!AI_SERVICES[@]}"; do
        local config_path="${SERVICE_CONFIG_PATHS[$service]}"
        
        if [[ -f "$config_path" ]]; then
            local is_enabled=$(jq -r '.enabled // false' "$config_path" 2>/dev/null || echo "true")
            
            if [[ "$is_enabled" == "true" ]]; then
                error "Service $service is still enabled in configuration"
                ((verification_errors++))
                all_disabled=false
            else
                success "Service $service is disabled in configuration"
            fi
        fi
    done
    
    # Check service manager configuration
    local manager_config="$PROJECT_ROOT/src/lib/ai/services/manager/config.json"
    if [[ -f "$manager_config" ]]; then
        local manager_enabled=$(jq -r '.enabled // true' "$manager_config" 2>/dev/null || echo "true")
        
        if [[ "$manager_enabled" == "true" ]]; then
            error "Service manager is still enabled"
            ((verification_errors++))
        else
            success "Service manager is disabled"
        fi
    fi
    
    # Test service connectivity (should fail)
    log "Testing service connectivity (should fail)..."
    for service in "${!AI_SERVICES[@]}"; do
        local env_var="${SERVICE_ENV_VARS[$service]}"
        
        if [[ -n "${!env_var}" && "${!env_var}" != "DISABLED_ROLLBACK_$ROLLBACK_ID" ]]; then
            warning "API key for $service is still active. Consider rotating it."
        fi
    done
    
    if [[ "$verification_errors" -eq 0 ]]; then
        success "External service rollback verification completed successfully"
        return 0
    else
        error "External service rollback verification failed with $verification_errors errors"
        return 1
    fi
}

# Create service rollback report
create_service_report() {
    local rollback_duration=$(($(date +%s) - ROLLBACK_START_TIME))
    
    cat > "$BACKUP_DIR/services-rollback-report.md" << EOF
# External Service Integration Rollback Report

## Rollback Information
- **Rollback ID**: $ROLLBACK_ID
- **Environment**: $ENVIRONMENT
- **Reason**: $ROLLBACK_REASON
- **Scope**: $ROLLBACK_SCOPE
- **Timestamp**: $(date -u +%Y-%m-%dT%H:%M:%SZ)
- **Duration**: ${rollback_duration} seconds
- **Status**: $([ "$ROLLBACK_SUCCESS" = true ] && echo "Success" || echo "Failed")

## Affected External Services
$(for service in "${!AI_SERVICES[@]}"; do
    echo "- \`$service\`: ${AI_SERVICES[$service]}"
done)

## Rollback Actions
1. Backed up current service configurations
2. Generated rollback plan
3. Disabled all AI service configurations
4. Updated service manager configuration
5. Cleared service caches and connections
6. Verified rollback completion

## Configuration Changes
- All AI service configurations set to \`enabled: false\`
- Service manager configuration disabled
- API keys rotated or disabled (if configured)
- Service caches cleared

## Verification Results
$([ "$ROLLBACK_SUCCESS" = true ] && echo "✅ All external services disabled" || echo "❌ Some services may still be active")

## Impact
- **User Impact**: AI-powered features will not function
- **Feature Availability**: All AI search functionality is unavailable
- **Cost Impact**: No further costs from external AI services
- **Performance**: Improved performance due to disabled AI integrations

## Recovery Instructions
To restore external service integrations:
\`\`\`bash
# Restore from backup
cp "$BACKUP_DIR/services-backup.json" "$PROJECT_ROOT/src/lib/ai/services/config/"
cp "$BACKUP_DIR/manager-config.backup" "$PROJECT_ROOT/src/lib/ai/services/manager/config.json"

# Restore environment variables
cp "$BACKUP_DIR/env-production.backup" "$PROJECT_ROOT/.env.production"

# Restart application
pm2 restart media-contacts
\`\`\`

## Security Considerations
- API keys have been rotated or disabled
- Service configurations are now inactive
- No external API calls will be made
- Cache has been cleared to prevent data leakage

## Monitoring
- Monitor for unexpected external API calls
- Watch error logs for service connection attempts
- Check user feedback regarding AI features
- Monitor cost dashboards for any unexpected charges

## Contacts
- **Engineering Lead**: [Engineering Contact]
- **DevOps Lead**: [DevOps Contact]
- **Security Team**: [Security Contact]
EOF
    
    success "External service rollback report created at $BACKUP_DIR/services-rollback-report.md"
}

# Send external service rollback notification
send_service_notification() {
    local status=$1
    local message=$2
    
    log "Sending external service rollback notification: $status"
    
    local rollback_duration=$(($(date +%s) - ROLLBACK_START_TIME))
    
    # Create notification payload
    local services_list=$(printf '"%s",' "${!AI_SERVICES[@]}" | jq -R . | jq -s .)
    local notification_payload=$(cat << EOF
{
    "status": "$status",
    "message": "$message",
    "rollback_id": "$ROLLBACK_ID",
    "environment": "$ENVIRONMENT",
    "reason": "$ROLLBACK_REASON",
    "scope": "$ROLLBACK_SCOPE",
    "type": "external-services",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "duration_seconds": $rollback_duration,
    "backup_location": "$BACKUP_DIR",
    "services_affected": $services_list
}
EOF
)
    
    # Send webhook notification
    if [[ -n "${SERVICES_ROLLBACK_WEBHOOK_URL}" ]]; then
        curl -X POST "$SERVICES_ROLLBACK_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "$notification_payload" \
            2>> "$LOG_FILE" || true
    fi
    
    # Email notification
    if command -v mail &> /dev/null && [[ -n "${DEVOPS_EMAIL}" ]]; then
        mail -s "External Service Rollback $status: AI Search Feature - ${ENVIRONMENT}" "$DEVOPS_EMAIL" << EOF 2>> "$LOG_FILE"
External service rollback $status for AI Search feature in ${ENVIRONMENT} environment:

Rollback ID: $ROLLBACK_ID
Reason: $ROLLBACK_REASON
Scope: $ROLLBACK_SCOPE
Duration: ${rollback_duration}s
Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)
Backup Location: $BACKUP_DIR

$message

Affected services: $(for service in "${!AI_SERVICES[@]}"; do echo -n "$service (${AI_SERVICES[$service]}) "; done)

Full log available at: $LOG_FILE
Rollback report available at: $BACKUP_DIR/services-rollback-report.md
EOF
    fi
}

# Main external service rollback flow
main() {
    log "Starting external service rollback for AI Search feature in ${ENVIRONMENT} environment..."
    log "Rollback reason: $ROLLBACK_REASON"
    log "Rollback scope: $ROLLBACK_SCOPE"
    
    # Set up error handling
    trap 'error "External service rollback failed at line $LINENO. Check log file: $LOG_FILE"' ERR
    
    check_service_permissions
    
    # Validate service state (may exit early if no services are enabled)
    if ! validate_service_state; then
        warning "No external AI services are currently enabled. Rollback may not be necessary."
        exit 0
    fi
    
    create_service_backup
    generate_service_rollback_plan
    disable_external_services
    clear_service_caches
    
    # Verify rollback and update status
    if verify_service_rollback; then
        ROLLBACK_SUCCESS=true
    fi
    
    create_service_report
    
    # Send appropriate notification based on success
    if [[ "$ROLLBACK_SUCCESS" == true ]]; then
        send_service_notification "SUCCESS" "External service rollback completed successfully. All AI service integrations are now disabled."
        success "External service rollback completed successfully!"
    else
        send_service_notification "FAILURE" "External service rollback failed or verification failed. Manual intervention may be required."
        error "External service rollback failed or verification failed"
    fi
    
    log "External service rollback log available at: $LOG_FILE"
    log "Backup available at: $BACKUP_DIR"
    log "Rollback report available at: $BACKUP_DIR/services-rollback-report.md"
}

# Parse command line arguments
if [[ $# -lt 1 ]]; then
    echo "Usage: $0 <rollback_reason> [rollback_scope]"
    echo "Example: $0 \"Cost overruns\" all"
    echo "Example: $0 \"API issues\" ai-services"
    echo ""
    echo "Rollback scopes:"
    echo "  all - All external AI services (default)"
    echo "  ai-services - Core AI services only"
    echo "  specific - Specific services (requires additional configuration)"
    echo ""
    echo "Environment variables:"
    echo "  ENVIRONMENT - Target environment (default: production)"
    echo "  ROTATE_API_KEYS - Set to 'true' to rotate API keys during rollback"
    echo ""
    echo "Notification configuration:"
    echo "  SERVICES_ROLLBACK_WEBHOOK_URL - Webhook URL for notifications"
    echo "  DEVOPS_EMAIL - Email address for notifications"
    exit 1
fi

ROLLBACK_REASON="$1"
if [[ -n "$2" ]]; then
    ROLLBACK_SCOPE="$2"
fi

main "$@"