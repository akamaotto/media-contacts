#!/bin/bash

# Feature Flag Management Script for AI Search Feature
# This script manages feature flags for gradual rollout of the AI Search feature
# Enhanced with comprehensive rollout strategies, monitoring, and automation

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENVIRONMENT="${ENVIRONMENT:-production}"
LOG_FILE="/tmp/feature-flags-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).log"
API_URL="${API_URL:-http://localhost:3000}"
CONFIG_FILE="$SCRIPT_DIR/flag-config.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Feature flag configuration
FEATURE_NAME="ai-search"
CURRENT_ROLLOUT=0
TARGET_ROLLOUT=0
USER_SEGMENTS=()
ROLLOUT_STRATEGY="gradual"
METRICS_CHECK_INTERVAL=300  # 5 minutes
HEALTH_CHECK_THRESHOLD=5   # Error threshold for health checks

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

# Check dependencies
check_dependencies() {
    log "Checking dependencies..."
    
    if ! command -v curl &> /dev/null; then
        error "curl command not found. Please install curl."
    fi
    
    if ! command -v jq &> /dev/null; then
        error "jq command not found. Please install jq for JSON parsing."
    fi
    
    success "Dependencies check passed"
}

# Authenticate with API
authenticate() {
    if [[ -z "$API_KEY" ]]; then
        error "API_KEY environment variable not set"
    fi
    
    # Test authentication
    if ! curl -f -s -H "Authorization: Bearer $API_KEY" "$API_URL/api/auth/verify" > /dev/null; then
        error "API authentication failed. Please check API_KEY."
    fi
    
    success "API authentication successful"
}

# Get current feature flag status
get_current_status() {
    log "Getting current feature flag status..."
    
    response=$(curl -s -H "Authorization: Bearer $API_KEY" "$API_URL/api/feature-flags/$FEATURE_NAME")
    
    if [[ $? -eq 0 ]]; then
        CURRENT_ROLLOUT=$(echo "$response" | jq -r '.rollout_percentage // 0')
        current_segments=$(echo "$response" | jq -r '.user_segments // []')
        
        # Parse user segments
        IFS=',' read -ra USER_SEGMENTS <<< "$current_segments"
        
        log "Current rollout: $CURRENT_ROLLOUT%"
        log "Current user segments: ${USER_SEGMENTS[*]}"
        
        success "Current status retrieved"
    else
        warning "Feature flag not found or API error. Starting from 0% rollout."
        CURRENT_ROLLOUT=0
        USER_SEGMENTS=()
    fi
}

# Set feature flag configuration
set_feature_flag() {
    local enabled=$1
    local rollout=$2
    local segments=$3
    local description=$4
    
    log "Setting feature flag: enabled=$enabled, rollout=$rollout%, segments=$segments"
    
    payload=$(cat << EOF
{
    "enabled": $enabled,
    "rollout_percentage": $rollout,
    "user_segments": [$segments],
    "description": "$description"
}
EOF
)
    
    response=$(curl -s -X POST \
        -H "Authorization: Bearer $API_KEY" \
        -H "Content-Type: application/json" \
        -d "$payload" \
        "$API_URL/api/feature-flags/$FEATURE_NAME")
    
    if [[ $? -eq 0 ]]; then
        success "Feature flag updated successfully"
        echo "$response" | jq . >> "$LOG_FILE"
    else
        error "Failed to update feature flag"
    fi
}

# Gradual rollout strategy
gradual_rollout() {
    local target_percentage=$1
    local step=${2:-5}
    local delay=${3:-300}  # 5 minutes between steps
    
    log "Starting gradual rollout to $target_percentage% with $step% steps every $delay seconds"
    
    get_current_status
    
    # Convert to integer for comparison
    current_int=$((CURRENT_ROLLOUT))
    target_int=$((target_percentage))
    
    if [[ $current_int -ge $target_int ]]; then
        warning "Current rollout ($current_int%) is already at or above target ($target_int%)"
        return
    fi
    
    while [[ $current_int -lt $target_int ]]; do
        # Calculate next step
        next_int=$((current_int + step))
        if [[ $next_int -gt $target_int ]]; then
            next_int=$target_int
        fi
        
        log "Rolling out from $current_int% to $next_int%..."
        
        # Determine user segments based on rollout percentage
        local segments="\"internal\""
        if [[ $next_int -ge 10 ]]; then
            segments="\"internal\",\"beta_testers\""
        fi
        if [[ $next_int -ge 50 ]]; then
            segments="\"internal\",\"beta_testers\",\"early_adopters\""
        fi
        if [[ $next_int -ge 100 ]]; then
            segments="\"all\""
        fi
        
        # Update feature flag
        set_feature_flag true $next_int "$segments" "AI Search Feature - Rollout to $next_int%"
        
        # Wait for delay (skip on last step)
        if [[ $next_int -lt $target_int ]]; then
            log "Waiting $delay seconds before next rollout step..."
            sleep $delay
            
            # Run health checks between steps
            log "Running health checks..."
            "$PROJECT_ROOT/scripts/monitoring/health-check.sh" ai
            
            # Run cost monitoring
            log "Running cost monitoring..."
            "$PROJECT_ROOT/scripts/monitoring/cost-monitor.sh" full
        fi
        
        current_int=$next_int
    done
    
    success "Gradual rollout completed to $target_percentage%"
}

# Emergency disable
emergency_disable() {
    log "Emergency disable requested - disabling AI Search feature immediately..."
    
    set_feature_flag false 0 "\"\"" "AI Search Feature - Emergency Disable"
    
    success "Feature disabled immediately"
    
    # Send notification
    send_emergency_notification "AI Search feature has been disabled due to emergency"
}

# A/B testing configuration
configure_ab_testing() {
    local enabled=$1
    local test_groups=$2
    local traffic_split=$3
    
    log "Configuring A/B testing: enabled=$enabled, groups=$test_groups, split=$traffic_split"
    
    payload=$(cat << EOF
{
    "ab_testing": {
        "enabled": $enabled,
        "test_groups": [$test_groups],
        "traffic_split": $traffic_split
    }
}
EOF
)
    
    response=$(curl -s -X POST \
        -H "Authorization: Bearer $API_KEY" \
        -H "Content-Type: application/json" \
        -d "$payload" \
        "$API_URL/api/feature-flags/$FEATURE_NAME/ab-testing")
    
    if [[ $? -eq 0 ]]; then
        success "A/B testing configured successfully"
        echo "$response" | jq . >> "$LOG_FILE"
    else
        error "Failed to configure A/B testing"
    fi
}

# Monitor feature usage
monitor_usage() {
    log "Monitoring feature usage..."
    
    response=$(curl -s -H "Authorization: Bearer $API_KEY" "$API_URL/api/analytics/feature-usage/$FEATURE_NAME")
    
    if [[ $? -eq 0 ]]; then
        echo "Feature Usage Report:" | tee -a "$LOG_FILE"
        echo "$response" | jq . | tee -a "$LOG_FILE"
        success "Usage monitoring completed"
    else
        error "Failed to retrieve usage analytics"
    fi
}

# Send notification
send_notification() {
    local message=$1
    local priority=${2:-normal}
    
    log "Sending notification: $message"
    
    # Example webhook notification (customize as needed)
    if [[ -n "${WEBHOOK_URL}" ]]; then
        curl -X POST "$WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{
                \"message\": \"$message\",
                \"priority\": \"$priority\",
                \"feature\": \"$FEATURE_NAME\",
                \"environment\": \"$ENVIRONMENT\",
                \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
            }" \
            2>> "$LOG_FILE" || true
    fi
}

# Send emergency notification
send_emergency_notification() {
    local message=$1
    
    # Send with high priority
    send_notification "$message" "emergency"
    
    # Email notification (customize as needed)
    if command -v mail &> /dev/null && [[ -n "${ADMIN_EMAIL}" ]]; then
        echo "$message" | mail -s "EMERGENCY: AI Search Feature - ${ENVIRONMENT}" "$ADMIN_EMAIL" 2>> "$LOG_FILE" || true
    fi
}

# Load configuration from file
load_config() {
    if [[ -f "$CONFIG_FILE" ]]; then
        log "Loading configuration from $CONFIG_FILE"
        
        # Read configuration using jq
        if command -v jq &> /dev/null; then
            ROLLOUT_STRATEGY=$(jq -r '.rollout_strategy // "gradual"' "$CONFIG_FILE")
            METRICS_CHECK_INTERVAL=$(jq -r '.metrics_check_interval // 300' "$CONFIG_FILE")
            HEALTH_CHECK_THRESHOLD=$(jq -r '.health_check_threshold // 5' "$CONFIG_FILE")
            
            log "Configuration loaded: strategy=$ROLLOUT_STRATEGY, interval=${METRICS_CHECK_INTERVAL}s, threshold=$HEALTH_CHECK_THRESHOLD"
        else
            warning "jq not available, using default configuration"
        fi
    else
        log "No configuration file found, using defaults"
    fi
}

# Save configuration to file
save_config() {
    log "Saving configuration to $CONFIG_FILE"
    
    cat > "$CONFIG_FILE" << EOF
{
    "rollout_strategy": "$ROLLOUT_STRATEGY",
    "metrics_check_interval": $METRICS_CHECK_INTERVAL,
    "health_check_threshold": $HEALTH_CHECK_THRESHOLD,
    "last_updated": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "environment": "$ENVIRONMENT"
}
EOF
    
    success "Configuration saved"
}

# Check feature flag health metrics
check_health_metrics() {
    log "Checking health metrics for feature $FEATURE_NAME..."
    
    # Get error rate
    error_response=$(curl -s -H "Authorization: Bearer $API_KEY" "$API_URL/api/analytics/error-rate/$FEATURE_NAME")
    error_rate=$(echo "$error_response" | jq -r '.error_rate // 0')
    
    # Get response time
    response_time_response=$(curl -s -H "Authorization: Bearer $API_KEY" "$API_URL/api/analytics/response-time/$FEATURE_NAME")
    avg_response_time=$(echo "$response_time_response" | jq -r '.avg_response_time // 0')
    
    # Get user satisfaction
    satisfaction_response=$(curl -s -H "Authorization: Bearer $API_KEY" "$API_URL/api/analytics/satisfaction/$FEATURE_NAME")
    satisfaction_score=$(echo "$satisfaction_response" | jq -r '.satisfaction_score // 0')
    
    log "Health Metrics:"
    log "  - Error Rate: ${error_rate}%"
    log "  - Avg Response Time: ${avg_response_time}ms"
    log "  - Satisfaction Score: ${satisfaction_score}/100"
    
    # Determine health status
    health_status="healthy"
    if (( $(echo "$error_rate > $HEALTH_CHECK_THRESHOLD" | bc -l) )); then
        health_status="unhealthy"
        warning "High error rate detected: ${error_rate}%"
    fi
    
    if (( $(echo "$avg_response_time > 2000" | bc -l) )); then
        health_status="degraded"
        warning "High response time detected: ${avg_response_time}ms"
    fi
    
    if (( $(echo "$satisfaction_score < 70" | bc -l) )); then
        health_status="degraded"
        warning "Low satisfaction score: ${satisfaction_score}/100"
    fi
    
    case "$health_status" in
        "healthy")
            success "Feature health is good"
            return 0
            ;;
        "degraded")
            warning "Feature health is degraded"
            return 1
            ;;
        "unhealthy")
            error "Feature health is critical"
            return 2
            ;;
    esac
}

# Automated rollout based on metrics
automated_rollout() {
    local target_percentage=$1
    local step=${2:-5}
    local auto_adjust=${3:-true}
    
    log "Starting automated rollout to $target_percentage% with auto-adjustment: $auto_adjust"
    
    get_current_status
    
    # Convert to integer for comparison
    current_int=$((CURRENT_ROLLOUT))
    target_int=$((target_percentage))
    
    if [[ $current_int -ge $target_int ]]; then
        warning "Current rollout ($current_int%) is already at or above target ($target_int%)"
        return
    fi
    
    while [[ $current_int -lt $target_int ]]; do
        # Calculate next step
        next_int=$((current_int + step))
        if [[ $next_int -gt $target_int ]]; then
            next_int=$target_int
        fi
        
        log "Rolling out from $current_int% to $next_int%..."
        
        # Determine user segments based on rollout percentage
        local segments="\"internal-users\""
        if [[ $next_int -ge 10 ]]; then
            segments="\"internal-users\",\"beta-users\""
        fi
        if [[ $next_int -ge 25 ]]; then
            segments="\"internal-users\",\"beta-users\",\"power-users\""
        fi
        if [[ $next_int -ge 50 ]]; then
            segments="\"internal-users\",\"beta-users\",\"power-users\",\"early-adopters\""
        fi
        if [[ $next_int -ge 100 ]]; then
            segments="\"all\""
        fi
        
        # Update feature flag
        set_feature_flag true $next_int "$segments" "AI Search Feature - Automated Rollout to $next_int%"
        
        # Wait for metrics to stabilize
        log "Waiting for metrics to stabilize (${METRICS_CHECK_INTERVAL}s)..."
        sleep $METRICS_CHECK_INTERVAL
        
        # Check health metrics
        check_health_metrics
        health_result=$?
        
        # Auto-adjust based on health if enabled
        if [[ "$auto_adjust" == "true" ]]; then
            case $health_result in
                0)  # Healthy - continue
                    log "Health check passed, continuing rollout"
                    ;;
                1)  # Degraded - pause and consider rollback
                    warning "Health degraded, pausing rollout for further monitoring"
                    sleep $((METRICS_CHECK_INTERVAL * 2))
                    
                    # Re-check health
                    check_health_metrics
                    if [[ $? -eq 2 ]]; then
                        log "Health still degraded, performing partial rollback"
                        rollback_int=$((next_int - step))
                        if [[ $rollback_int -lt 0 ]]; then
                            rollback_int=0
                        fi
                        set_feature_flag true $rollback_int "$segments" "AI Search Feature - Auto Rollback to $rollback_int%"
                        send_notification "Auto rollback performed due to degraded health" "warning"
                        break
                    fi
                    ;;
                2)  # Unhealthy - immediate rollback
                    log "Health critical, performing immediate rollback to previous safe state"
                    rollback_int=$((current_int))
                    if [[ $rollback_int -lt 0 ]]; then
                        rollback_int=0
                    fi
                    set_feature_flag true $rollback_int "$segments" "AI Search Feature - Emergency Auto Rollback"
                    send_emergency_notification "Emergency auto rollback performed due to critical health issues"
                    break
                    ;;
            esac
        fi
        
        current_int=$next_int
    done
    
    if [[ $current_int -eq $target_int ]]; then
        success "Automated rollout completed to $target_percentage%"
        send_notification "Automated rollout completed successfully"
    fi
}

# Display feature flag status
display_status() {
    log "Feature Flag Status Report"
    log "========================="
    
    get_current_status
    
    echo -e "${CYAN}Feature:${NC} $FEATURE_NAME" | tee -a "$LOG_FILE"
    echo -e "${CYAN}Environment:${NC} $ENVIRONMENT" | tee -a "$LOG_FILE"
    echo -e "${CYAN}Current Rollout:${NC} $CURRENT_ROLLOUT%" | tee -a "$LOG_FILE"
    echo -e "${CYAN}User Segments:${NC} ${USER_SEGMENTS[*]}" | tee -a "$LOG_FILE"
    echo -e "${CYAN}Rollout Strategy:${NC} $ROLLOUT_STRATEGY" | tee -a "$LOG_FILE"
    echo -e "${CYAN}API URL:${NC} $API_URL" | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"
    
    # Get additional status information
    response=$(curl -s -H "Authorization: Bearer $API_KEY" "$API_URL/api/feature-flags/$FEATURE_NAME/status")
    
    if [[ $? -eq 0 ]]; then
        echo -e "${CYAN}Detailed Status:${NC}" | tee -a "$LOG_FILE"
        echo "$response" | jq . | tee -a "$LOG_FILE"
    fi
    
    # Display health metrics
    echo "" | tee -a "$LOG_FILE"
    echo -e "${CYAN}Health Metrics:${NC}" | tee -a "$LOG_FILE"
    check_health_metrics | tee -a "$LOG_FILE"
}

# Generate rollout report
generate_report() {
    local report_file="/tmp/feature-flag-report-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).html"
    
    log "Generating rollout report: $report_file"
    
    # Get current status
    get_current_status
    
    # Get health metrics
    check_health_metrics > /tmp/health-metrics.txt
    
    # Get usage analytics
    monitor_usage > /tmp/usage-analytics.txt
    
    # Create HTML report
    cat > "$report_file" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Feature Flag Report - $FEATURE_NAME</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background-color: #f0f0f0; padding: 10px; border-radius: 5px; }
        .section { margin: 20px 0; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
        .metric { display: inline-block; margin: 10px; padding: 10px; background-color: #f9f9f9; border-radius: 3px; }
        .healthy { color: green; }
        .degraded { color: orange; }
        .unhealthy { color: red; }
        pre { background-color: #f5f5f5; padding: 10px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Feature Flag Report: $FEATURE_NAME</h1>
        <p><strong>Environment:</strong> $ENVIRONMENT</p>
        <p><strong>Generated:</strong> $(date)</p>
    </div>
    
    <div class="section">
        <h2>Current Status</h2>
        <div class="metric"><strong>Rollout:</strong> $CURRENT_ROLLOUT%</div>
        <div class="metric"><strong>Segments:</strong> ${USER_SEGMENTS[*]}</div>
        <div class="metric"><strong>Strategy:</strong> $ROLLOUT_STRATEGY</div>
    </div>
    
    <div class="section">
        <h2>Health Metrics</h2>
        <pre>$(cat /tmp/health-metrics.txt)</pre>
    </div>
    
    <div class="section">
        <h2>Usage Analytics</h2>
        <pre>$(cat /tmp/usage-analytics.txt)</pre>
    </div>
    
    <div class="section">
        <h2>Recent Changes</h2>
        <pre>$(tail -20 "$LOG_FILE")</pre>
    </div>
</body>
</html>
EOF
    
    success "Report generated: $report_file"
    
    # Clean up temp files
    rm -f /tmp/health-metrics.txt /tmp/usage-analytics.txt
    
    # Open report if on macOS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        open "$report_file"
    fi
}

# Main function
main() {
    log "Starting feature flag management for ${ENVIRONMENT} environment..."
    
    # Load configuration
    load_config
    
    check_dependencies
    authenticate
    
    case "${1:-status}" in
        "status")
            display_status
            ;;
        "enable")
            set_feature_flag true "${2:-100}" "\"all\"" "AI Search Feature - Fully Enabled"
            send_notification "AI Search feature has been enabled"
            save_config
            ;;
        "disable")
            set_feature_flag false 0 "\"\"" "AI Search Feature - Disabled"
            send_notification "AI Search feature has been disabled"
            save_config
            ;;
        "emergency-disable")
            emergency_disable
            save_config
            ;;
        "rollout")
            gradual_rollout "${2:-100}" "${3:-5}" "${4:-300}"
            send_notification "AI Search feature rollout completed"
            save_config
            ;;
        "auto-rollout")
            automated_rollout "${2:-100}" "${3:-5}" "${4:-true}"
            save_config
            ;;
        "configure-ab")
            configure_ab_testing true "${2:-\"control\",\"treatment\"}" "${3:-50}"
            save_config
            ;;
        "monitor")
            monitor_usage
            ;;
        "health")
            check_health_metrics
            ;;
        "report")
            generate_report
            ;;
        "config")
            if [[ "${2}" == "show" ]]; then
                echo "Current Configuration:"
                cat "$CONFIG_FILE" 2>/dev/null || echo "No configuration file found"
            elif [[ "${2}" == "set" ]]; then
                ROLLOUT_STRATEGY="${3:-gradual}"
                METRICS_CHECK_INTERVAL="${4:-300}"
                HEALTH_CHECK_THRESHOLD="${5:-5}"
                save_config
                success "Configuration updated"
            else
                error "Invalid config command. Use 'show' or 'set'"
            fi
            ;;
        *)
            echo "Usage: $0 {status|enable|disable|emergency-disable|rollout [percentage] [step] [delay]|auto-rollout [percentage] [step] [auto-adjust]|configure-ab [groups] [split]|monitor|health|report|config [show|set]}"
            echo ""
            echo "Commands:"
            echo "  status                    - Display current feature flag status"
            echo "  enable [percentage]       - Enable feature (default: 100%)"
            echo "  disable                   - Disable feature completely"
            echo "  emergency-disable         - Emergency disable with notifications"
            echo "  rollout [target] [step] [delay] - Gradual rollout with manual steps"
            echo "  auto-rollout [target] [step] [auto-adjust] - Automated rollout with health checks"
            echo "  configure-ab [groups] [split] - Configure A/B testing"
            echo "  monitor                   - Monitor feature usage"
            echo "  health                    - Check health metrics"
            echo "  report                    - Generate HTML report"
            echo "  config show               - Show current configuration"
            echo "  config set [strategy] [interval] [threshold] - Set configuration"
            echo ""
            echo "Environment: Set ENVIRONMENT variable (default: production)"
            echo "API URL: Set API_URL variable (default: http://localhost:3000)"
            echo "API Key: Set API_KEY variable"
            exit 1
            ;;
    esac
    
    success "Feature flag management completed"
}

# Parse command line arguments
main "$@"