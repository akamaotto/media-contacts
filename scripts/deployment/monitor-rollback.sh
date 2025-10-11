#!/bin/bash

# Rollback Monitoring and Alerting System for AI Search Feature
# This script monitors rollback operations and sends alerts when issues are detected

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ROLLBACK_ID="${1:-unknown}"
MONITORING_CONFIG="${2:-/tmp/rollback-monitoring.json}"
LOG_FILE="/tmp/rollback-monitor-${ROLLBACK_ID}.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Monitoring state
MONITORING_START_TIME=$(date +%s)
MONITORING_ACTIVE=true
ALERT_COUNT=0
ISSUES_DETECTED=()

# Default monitoring thresholds
DEFAULT_ERROR_RATE_THRESHOLD=5
DEFAULT_RESPONSE_TIME_THRESHOLD=2000
DEFAULT_DATABASE_CONNECTION_THRESHOLD=80
DEFAULT_CPU_THRESHOLD=80
DEFAULT_MEMORY_THRESHOLD=80

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    ((ALERT_COUNT++))
    ISSUES_DETECTED+=("$1")
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

# Load monitoring configuration
load_monitoring_config() {
    log "Loading monitoring configuration..."
    
    if [[ -f "$MONITORING_CONFIG" ]]; then
        # Read configuration from file
        ERROR_RATE_THRESHOLD=$(jq -r '.alert_thresholds.error_rate // '"$DEFAULT_ERROR_RATE_THRESHOLD"'" "$MONITORING_CONFIG")
        RESPONSE_TIME_THRESHOLD=$(jq -r '.alert_thresholds.response_time // '"$DEFAULT_RESPONSE_TIME_THRESHOLD"'" "$MONITORING_CONFIG")
        DATABASE_CONNECTION_THRESHOLD=$(jq -r '.alert_thresholds.database_connections // '"$DEFAULT_DATABASE_CONNECTION_THRESHOLD"'" "$MONITORING_CONFIG")
        CPU_THRESHOLD=$(jq -r '.alert_thresholds.cpu // '"$DEFAULT_CPU_THRESHOLD"'" "$MONITORING_CONFIG")
        MEMORY_THRESHOLD=$(jq -r '.alert_thresholds.memory // '"$DEFAULT_MEMORY_THRESHOLD"'" "$MONITORING_CONFIG")
        MONITORING_DURATION=$(jq -r '.monitoring_duration // 3600' "$MONITORING_CONFIG")
        
        success "Monitoring configuration loaded from $MONITORING_CONFIG"
    else
        # Use default values
        ERROR_RATE_THRESHOLD=$DEFAULT_ERROR_RATE_THRESHOLD
        RESPONSE_TIME_THRESHOLD=$DEFAULT_RESPONSE_TIME_THRESHOLD
        DATABASE_CONNECTION_THRESHOLD=$DEFAULT_DATABASE_CONNECTION_THRESHOLD
        CPU_THRESHOLD=$DEFAULT_CPU_THRESHOLD
        MEMORY_THRESHOLD=$DEFAULT_MEMORY_THRESHOLD
        MONITORING_DURATION=3600
        
        warning "Using default monitoring configuration"
    fi
    
    log "Monitoring thresholds:"
    log "  - Error rate: ${ERROR_RATE_THRESHOLD}%"
    log "  - Response time: ${RESPONSE_TIME_THRESHOLD}ms"
    log "  - Database connections: ${DATABASE_CONNECTION_THRESHOLD}%"
    log "  - CPU usage: ${CPU_THRESHOLD}%"
    log "  - Memory usage: ${MEMORY_THRESHOLD}%"
    log "  - Duration: ${MONITORING_DURATION}s"
}

# Monitor application health
monitor_application_health() {
    log "Monitoring application health..."
    
    # Check if application is responding
    if curl -f -s http://localhost:3000/api/health > /dev/null; then
        success "Application health endpoint is responding"
        
        # Get detailed health status
        local health_response=$(curl -s http://localhost:3000/api/health)
        local status=$(echo "$health_response" | jq -r '.status // "unknown"')
        
        if [[ "$status" == "healthy" ]]; then
            success "Application status: healthy"
        elif [[ "$status" == "degraded" ]]; then
            warning "Application status: degraded"
            ISSUES_DETECTED+=("Application health is degraded")
        else
            error "Application status: $status"
        fi
    else
        error "Application health endpoint is not responding"
    fi
    
    # Check response time
    local response_time=$(curl -o /dev/null -s -w '%{time_total}' http://localhost:3000/api/health)
    local response_time_ms=$(echo "$response_time * 1000" | bc)
    
    if (( $(echo "$response_time_ms > $RESPONSE_TIME_THRESHOLD" | bc -l) )); then
        error "Application response time is high: ${response_time_ms}ms (threshold: ${RESPONSE_TIME_THRESHOLD}ms)"
    else
        success "Application response time is acceptable: ${response_time_ms}ms"
    fi
    
    # Check error rate (simplified - in production would use actual metrics)
    local error_rate=$(curl -s http://localhost:3000/api/metrics | jq -r '.error_rate // 0' 2>/dev/null || echo "0")
    
    if (( $(echo "$error_rate > $ERROR_RATE_THRESHOLD" | bc -l) )); then
        error "Application error rate is high: ${error_rate}% (threshold: ${ERROR_RATE_THRESHOLD}%)"
    else
        success "Application error rate is acceptable: ${error_rate}%"
    fi
}

# Monitor database health
monitor_database_health() {
    log "Monitoring database health..."
    
    # Check database connectivity
    if psql "$DATABASE_URL" -c "SELECT 1;" &> /dev/null; then
        success "Database is accessible"
    else
        error "Database is not accessible"
        return
    fi
    
    # Check database connection count
    local connection_count=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM pg_stat_activity;")
    local max_connections=$(psql "$DATABASE_URL" -tAc "SELECT setting::int FROM pg_settings WHERE name = 'max_connections';")
    local connection_percentage=$(( (connection_count * 100) / max_connections ))
    
    if [[ "$connection_percentage" -gt "$DATABASE_CONNECTION_THRESHOLD" ]]; then
        error "Database connection usage is high: ${connection_percentage}% (${connection_count}/${max_connections})"
    else
        success "Database connection usage is acceptable: ${connection_percentage}% (${connection_count}/${max_connections})"
    fi
    
    # Check database size
    local db_size=$(psql "$DATABASE_URL" -tAc "SELECT pg_size_pretty(pg_database_size(current_database()));")
    log "Database size: $db_size"
    
    # Check for long-running queries
    local long_queries=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active' AND query_start < NOW() - INTERVAL '5 minutes';")
    
    if [[ "$long_queries" -gt 0 ]]; then
        warning "Found $long_queries long-running queries"
        ISSUES_DETECTED+=("$long_queries long-running database queries detected")
    fi
    
    # Check for AI-related tables (should be gone after rollback)
    local ai_tables=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_name LIKE 'ai_%' AND table_schema = 'public';")
    
    if [[ "$ai_tables" -gt 0 ]]; then
        error "Found $ai_tables AI-related tables still in database"
    else
        success "No AI-related tables found in database (as expected after rollback)"
    fi
}

# Monitor feature flags
monitor_feature_flags() {
    log "Monitoring feature flags..."
    
    if [[ -z "$API_URL" || -z "$API_KEY" ]]; then
        warning "Cannot monitor feature flags - API configuration not available"
        return
    fi
    
    # Check AI search flags
    local ai_flags=(
        "ai-search-enabled"
        "ai-search-advanced-options"
        "ai-search-caching"
        "ai-contact-extraction"
    )
    
    for flag in "${ai_flags[@]}"; do
        local flag_response=$(curl -s -H "Authorization: Bearer $API_KEY" "$API_URL/api/feature-flags/$flag" 2>/dev/null)
        
        if [[ -n "$flag_response" ]]; then
            local is_enabled=$(echo "$flag_response" | jq -r '.enabled // false')
            local rollout=$(echo "$flag_response" | jq -r '.rolloutPercentage // 0')
            
            if [[ "$is_enabled" == "true" ]]; then
                error "Feature flag $flag is still enabled (should be disabled after rollback)"
            elif [[ "$rollout" -gt 0 ]]; then
                error "Feature flag $flag has rollout percentage > 0: $rollout% (should be 0 after rollback)"
            else
                success "Feature flag $flag is properly disabled"
            fi
        else
            warning "Could not retrieve status for feature flag: $flag"
        fi
    done
}

# Monitor external services
monitor_external_services() {
    log "Monitoring external services..."
    
    # Check if external services are being called (should not be after rollback)
    local service_logs=$(grep -r "OpenAI\|Anthropic\|Exa\|Firecrawl" "$PROJECT_ROOT/logs/" 2>/dev/null | tail -10 || echo "")
    
    if [[ -n "$service_logs" ]]; then
        warning "Found recent external service API calls (should not occur after rollback)"
        ISSUES_DETECTED+=("External service API calls detected after rollback")
    else
        success "No recent external service API calls found"
    fi
    
    # Check service configurations
    local config_dir="$PROJECT_ROOT/src/lib/ai/services/config"
    if [[ -d "$config_dir" ]]; then
        local enabled_services=0
        
        for config_file in "$config_dir"/*.json; do
            if [[ -f "$config_file" ]]; then
                local is_enabled=$(jq -r '.enabled // false' "$config_file" 2>/dev/null || echo "false")
                if [[ "$is_enabled" == "true" ]]; then
                    ((enabled_services++))
                    error "Service configuration $(basename "$config_file") is still enabled"
                fi
            fi
        done
        
        if [[ "$enabled_services" -eq 0 ]]; then
            success "All external service configurations are disabled"
        fi
    fi
}

# Monitor system resources
monitor_system_resources() {
    log "Monitoring system resources..."
    
    # Check CPU usage
    if command -v top &> /dev/null; then
        local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
        cpu_usage=${cpu_usage%.*}  # Remove decimal part
        
        if [[ "$cpu_usage" -gt "$CPU_THRESHOLD" ]]; then
            error "CPU usage is high: ${cpu_usage}% (threshold: ${CPU_THRESHOLD}%)"
        else
            success "CPU usage is acceptable: ${cpu_usage}%"
        fi
    fi
    
    # Check memory usage
    if command -v free &> /dev/null; then
        local memory_usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
        
        if [[ "$memory_usage" -gt "$MEMORY_THRESHOLD" ]]; then
            error "Memory usage is high: ${memory_usage}% (threshold: ${MEMORY_THRESHOLD}%)"
        else
            success "Memory usage is acceptable: ${memory_usage}%"
        fi
    fi
    
    # Check disk space
    local disk_usage=$(df "$PROJECT_ROOT" | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [[ "$disk_usage" -gt 90 ]]; then
        error "Disk usage is high: ${disk_usage}%"
    else
        success "Disk usage is acceptable: ${disk_usage}%"
    fi
}

# Monitor application logs for errors
monitor_application_logs() {
    log "Monitoring application logs for errors..."
    
    # Check for recent errors in application logs
    local log_dir="$PROJECT_ROOT/logs"
    if [[ -d "$log_dir" ]]; then
        local error_count=0
        
        for log_file in "$log_dir"/*.log; do
            if [[ -f "$log_file" ]]; then
                local recent_errors=$(grep -c "ERROR\|FATAL" "$log_file" 2>/dev/null || echo "0")
                ((error_count += recent_errors))
            fi
        done
        
        if [[ "$error_count" -gt 0 ]]; then
            error "Found $error_count errors in application logs"
            ISSUES_DETECTED+=("$error_count errors found in application logs")
        else
            success "No errors found in application logs"
        fi
    else
        warning "Application log directory not found: $log_dir"
    fi
}

# Send monitoring alert
send_monitoring_alert() {
    local severity="$1"
    local message="$2"
    local details="$3"
    
    log "Sending monitoring alert: $severity - $message"
    
    # Create alert payload
    local alert_payload=$(cat << EOF
{
    "alert_type": "rollback_monitoring",
    "severity": "$severity",
    "message": "$message",
    "details": "$details",
    "rollback_id": "$ROLLBACK_ID",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "monitoring_duration": "$(($(date +%s) - MONITORING_START_TIME))s",
    "issues_detected": ${#ISSUES_DETECTED[@]},
    "total_alerts": $ALERT_COUNT
}
EOF
)
    
    # Send webhook notification
    if [[ -n "${MONITORING_WEBHOOK_URL}" ]]; then
        curl -X POST "$MONITORING_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "$alert_payload" \
            2>> "$LOG_FILE" || true
    fi
    
    # Email notification for critical alerts
    if [[ "$severity" == "critical" && -n "${OPS_EMAIL}" ]]; then
        mail -s "CRITICAL: Rollback Monitoring Alert - ${ROLLBACK_ID}" "$OPS_EMAIL" << EOF 2>> "$LOG_FILE"
CRITICAL rollback monitoring alert:

Rollback ID: $ROLLBACK_ID
Severity: $severity
Message: $message
Details: $details
Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)
Issues Detected: ${#ISSUES_DETECTED[@]}
Total Alerts: $ALERT_COUNT

Full monitoring log available at: $LOG_FILE
EOF
    fi
}

# Generate monitoring report
generate_monitoring_report() {
    local monitoring_duration=$(($(date +%s) - MONITORING_START_TIME))
    
    cat > "/tmp/rollback-monitoring-report-${ROLLBACK_ID}.md" << EOF
# Rollback Monitoring Report

## Monitoring Information
- **Rollback ID**: $ROLLBACK_ID
- **Monitoring Duration**: ${monitoring_duration} seconds
- **Timestamp**: $(date -u +%Y-%m-%dT%H:%M:%SZ)
- **Total Alerts**: $ALERT_COUNT
- **Issues Detected**: ${#ISSUES_DETECTED[@]}

## Monitoring Results
- **Application Health**: $([ "$MONITORING_ACTIVE" = true ] && echo "Monitored" || echo "Not monitored")
- **Database Health**: $([ "$MONITORING_ACTIVE" = true ] && echo "Monitored" || echo "Not monitored")
- **Feature Flags**: $([ "$MONITORING_ACTIVE" = true ] && echo "Monitored" || echo "Not monitored")
- **External Services**: $([ "$MONITORING_ACTIVE" = true ] && echo "Monitored" || echo "Not monitored")
- **System Resources**: $([ "$MONITORING_ACTIVE" = true ] && echo "Monitored" || echo "Not monitored")

## Issues Detected
$(if [[ ${#ISSUES_DETECTED[@]} -gt 0 ]]; then
    for issue in "${ISSUES_DETECTED[@]}"; do
        echo "- ❌ $issue"
    done
else
    echo "- ✅ No issues detected"
fi)

## Monitoring Thresholds
- **Error Rate**: ${ERROR_RATE_THRESHOLD}%
- **Response Time**: ${RESPONSE_TIME_THRESHOLD}ms
- **Database Connections**: ${DATABASE_CONNECTION_THRESHOLD}%
- **CPU Usage**: ${CPU_THRESHOLD}%
- **Memory Usage**: ${MEMORY_THRESHOLD}%

## Recommendations
$(if [[ ${#ISSUES_DETECTED[@]} -gt 0 ]]; then
    echo "- Review and address the issues detected above"
    echo "- Consider extending monitoring duration"
    echo "- Verify rollback completion"
else
    echo "- Rollback appears to be successful"
    echo "- Continue normal operations"
    echo "- Schedule follow-up checks"
fi)

## Monitoring Log
Full monitoring log available at: $LOG_FILE
EOF
    
    success "Monitoring report generated"
}

# Main monitoring loop
main_monitoring_loop() {
    log "Starting rollback monitoring for rollback ID: $ROLLBACK_ID"
    
    load_monitoring_config
    
    # Set up signal handlers for graceful shutdown
    trap 'MONITORING_ACTIVE=false; log "Monitoring stopped by signal"; exit 0' SIGTERM SIGINT
    
    # Main monitoring loop
    local monitoring_start=$(date +%s)
    
    while [[ "$MONITORING_ACTIVE" == true ]]; do
        local current_time=$(date +%s)
        local elapsed_time=$((current_time - monitoring_start))
        
        # Check if monitoring duration has been reached
        if [[ $elapsed_time -ge $MONITORING_DURATION ]]; then
            log "Monitoring duration reached ($MONITORING_DURATION seconds)"
            MONITORING_ACTIVE=false
            break
        fi
        
        log "Monitoring cycle $(($elapsed_time / 60 + 1)) - Elapsed: ${elapsed_time}s"
        
        # Run monitoring checks
        monitor_application_health
        monitor_database_health
        monitor_feature_flags
        monitor_external_services
        monitor_system_resources
        monitor_application_logs
        
        # Check if critical issues were detected
        if [[ "$ALERT_COUNT" -gt 5 ]]; then
            send_monitoring_alert "critical" "Multiple issues detected during rollback monitoring" "Alert count: $ALERT_COUNT"
        elif [[ ${#ISSUES_DETECTED[@]} -gt 0 ]]; then
            send_monitoring_alert "warning" "Issues detected during rollback monitoring" "Issues: ${#ISSUES_DETECTED[@]}"
        fi
        
        # Wait for next monitoring cycle
        sleep 60  # Monitor every minute
    done
    
    # Generate final report
    generate_monitoring_report
    
    # Send final notification
    if [[ ${#ISSUES_DETECTED[@]} -eq 0 ]]; then
        send_monitoring_alert "info" "Rollback monitoring completed successfully" "No issues detected"
    else
        send_monitoring_alert "warning" "Rollback monitoring completed with issues" "Issues detected: ${#ISSUES_DETECTED[@]}"
    fi
    
    success "Rollback monitoring completed"
}

# Start monitoring
main_monitoring_loop