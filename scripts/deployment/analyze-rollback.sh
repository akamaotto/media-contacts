#!/bin/bash

# Post-Rollback Analysis Procedure for AI Search Feature
# This script performs comprehensive analysis after a rollback to identify root causes and improvements

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ROLLBACK_ID="${1:-unknown}"
ANALYSIS_TYPE="${2:-comprehensive}"  # comprehensive, quick, custom
ROLLBACK_DATA_DIR="${3:-/tmp}"  # Directory containing rollback data

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Analysis tracking
ANALYSIS_ID="analysis-$(date +%Y%m%d-%H%M%S)"
ANALYSIS_START_TIME=$(date +%s)
ANALYSIS_OUTPUT_DIR="/tmp/rollback-analysis-$ANALYSIS_ID"
ANALYSIS_LOG_FILE="$ANALYSIS_OUTPUT_DIR/analysis.log"
ANALYSIS_SUCCESS=true

# Analysis results
declare -A ANALYSIS_RESULTS
ISSUES_FOUND=()
RECOMMENDATIONS=()
LESSONS_LEARNED=()

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$ANALYSIS_LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$ANALYSIS_LOG_FILE"
    ANALYSIS_SUCCESS=false
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$ANALYSIS_LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$ANALYSIS_LOG_FILE"
}

info() {
    echo -e "${CYAN}[INFO]${NC} $1" | tee -a "$ANALYSIS_LOG_FILE"
}

# Initialize analysis environment
initialize_analysis() {
    log "Initializing post-rollback analysis environment..."
    
    # Create analysis output directory
    mkdir -p "$ANALYSIS_OUTPUT_DIR"
    
    # Check if rollback data directory exists
    if [[ ! -d "$ROLLBACK_DATA_DIR" ]]; then
        error "Rollback data directory not found: $ROLLBACK_DATA_DIR"
        exit 1
    fi
    
    # Check for required tools
    local required_tools=("jq" "curl" "psql" "git")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            error "Required tool not found: $tool"
            exit 1
        fi
    done
    
    success "Analysis environment initialized"
}

# Collect rollback metadata
collect_rollback_metadata() {
    log "Collecting rollback metadata..."
    
    # Find rollback metadata file
    local metadata_file=$(find "$ROLLBACK_DATA_DIR" -name "rollback-metadata.json" | head -1)
    
    if [[ -f "$metadata_file" ]]; then
        log "Found rollback metadata: $metadata_file"
        
        # Extract metadata
        local environment=$(jq -r '.environment // "unknown"' "$metadata_file")
        local reason=$(jq -r '.reason // "unknown"' "$metadata_file")
        local timestamp=$(jq -r '.timestamp // "unknown"' "$metadata_file")
        local rollback_type=$(jq -r '.type // "unknown"' "$metadata_file")
        local git_commit=$(jq -r '.git_commit // "unknown"' "$metadata_file")
        local git_branch=$(jq -r '.git_branch // "unknown"' "$metadata_file")
        local actor=$(jq -r '.actor // "unknown"' "$metadata_file")
        
        # Store in analysis results
        ANALYSIS_RESULTS[environment]="$environment"
        ANALYSIS_RESULTS[reason]="$reason"
        ANALYSIS_RESULTS[timestamp]="$timestamp"
        ANALYSIS_RESULTS[rollback_type]="$rollback_type"
        ANALYSIS_RESULTS[git_commit]="$git_commit"
        ANALYSIS_RESULTS[git_branch]="$git_branch"
        ANALYSIS_RESULTS[actor]="$actor"
        
        log "Rollback metadata collected:"
        log "  Environment: $environment"
        log "  Reason: $reason"
        log "  Type: $rollback_type"
        log "  Timestamp: $timestamp"
        log "  Actor: $actor"
    else
        warning "Rollback metadata file not found"
        ANALYSIS_RESULTS[environment]="unknown"
        ANALYSIS_RESULTS[reason]="unknown"
        ANALYSIS_RESULTS[timestamp]="unknown"
        ANALYSIS_RESULTS[rollback_type]="unknown"
        ANALYSIS_RESULTS[git_commit]="unknown"
        ANALYSIS_RESULTS[git_branch]="unknown"
        ANALYSIS_RESULTS[actor]="unknown"
    fi
    
    success "Rollback metadata collection completed"
}

# Analyze rollback logs
analyze_rollback_logs() {
    log "Analyzing rollback logs..."
    
    # Find rollback log files
    local log_files=$(find "$ROLLBACK_DATA_DIR" -name "*.log" | head -5)
    
    if [[ -n "$log_files" ]]; then
        # Create log analysis script
        cat > "$ANALYSIS_OUTPUT_DIR/analyze-logs.sh" << 'EOF'
#!/bin/bash

# Analyze rollback logs for patterns and issues

LOG_FILES="$@"
ERROR_PATTERNS=("ERROR" "FAILED" "CRITICAL" "EXCEPTION")
WARNING_PATTERNS=("WARNING" "DEGRADED" "TIMEOUT")
SUCCESS_PATTERNS=("SUCCESS" "COMPLETED" "PASSED")

echo "Log Analysis Results"
echo "==================="

for log_file in $LOG_FILES; do
    if [[ -f "$log_file" ]]; then
        echo ""
        echo "Analyzing: $(basename $log_file)"
        echo "-------------------------"
        
        # Count error patterns
        error_count=0
        for pattern in "${ERROR_PATTERNS[@]}"; do
            count=$(grep -c "$pattern" "$log_file" 2>/dev/null || echo "0")
            error_count=$((error_count + count))
        done
        echo "Errors: $error_count"
        
        # Count warning patterns
        warning_count=0
        for pattern in "${WARNING_PATTERNS[@]}"; do
            count=$(grep -c "$pattern" "$log_file" 2>/dev/null || echo "0")
            warning_count=$((warning_count + count))
        done
        echo "Warnings: $warning_count"
        
        # Count success patterns
        success_count=0
        for pattern in "${SUCCESS_PATTERNS[@]}"; do
            count=$(grep -c "$pattern" "$log_file" 2>/dev/null || echo "0")
            success_count=$((success_count + count))
        done
        echo "Success: $success_count"
        
        # Extract key error messages
        echo "Key Issues:"
        grep -E "${ERROR_PATTERNS[*]}" "$log_file" 2>/dev/null | head -3 | sed 's/^/  - /'
        
        # Extract timing information
        echo "Timing:"
        grep -E "started|completed|duration" "$log_file" 2>/dev/null | head -3 | sed 's/^/  - /'
    fi
done
EOF
        
        chmod +x "$ANALYSIS_OUTPUT_DIR/analyze-logs.sh"
        
        # Run log analysis
        log "$($ANALYSIS_OUTPUT_DIR/analyze-logs.sh $log_files | tee -a "$ANALYSIS_LOG_FILE")"
        
        # Store key findings
        local total_errors=$(grep "Errors:" "$ANALYSIS_OUTPUT_DIR/analyze-logs.sh" | awk '{sum+=$2} END {print sum}')
        local total_warnings=$(grep "Warnings:" "$ANALYSIS_OUTPUT_DIR/analyze-logs.sh" | awk '{sum+=$2} END {print sum}')
        
        ANALYSIS_RESULTS[log_errors]="$total_errors"
        ANALYSIS_RESULTS[log_warnings]="$total_warnings"
        
        if [[ "$total_errors" -gt 0 ]]; then
            ISSUES_FOUND+=("Rollback logs contain $total_errors error messages")
        fi
        
        if [[ "$total_warnings" -gt 5 ]]; then
            ISSUES_FOUND+=("Rollback logs contain $total_warnings warning messages")
            RECOMMENDATIONS+=("Review and address warning conditions in rollback procedures")
        fi
    else
        warning "No rollback log files found for analysis"
    fi
    
    success "Rollback log analysis completed"
}

# Analyze database state
analyze_database_state() {
    log "Analyzing database state..."
    
    if [[ -z "$DATABASE_URL" ]]; then
        warning "DATABASE_URL not set, skipping database analysis"
        return
    fi
    
    # Check database connectivity
    if psql "$DATABASE_URL" -c "SELECT 1;" &> /dev/null; then
        success "Database is accessible"
        
        # Check for remaining AI tables
        local ai_tables=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_name LIKE 'ai_%' AND table_schema = 'public';")
        
        if [[ "$ai_tables" -gt 0 ]]; then
            error "Found $ai_tables AI tables still in database"
            ISSUES_FOUND+=("Database rollback incomplete - $ai_tables AI tables remain")
            RECOMMENDATIONS+=("Complete database rollback by removing remaining AI tables")
        else
            success "No AI tables found in database (as expected after rollback)"
        fi
        
        # Check for AI-related columns
        local ai_columns=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM information_schema.columns WHERE column_name LIKE 'ai_%' AND table_schema = 'public';")
        
        if [[ "$ai_columns" -gt 0 ]]; then
            error "Found $ai_columns AI-related columns still in database"
            ISSUES_FOUND+=("Database rollback incomplete - $ai_columns AI columns remain")
            RECOMMENDATIONS+=("Complete database rollback by removing remaining AI columns")
        else
            success "No AI-related columns found in database (as expected after rollback)"
        fi
        
        # Check database performance
        local db_size=$(psql "$DATABASE_URL" -tAc "SELECT pg_size_pretty(pg_database_size(current_database()));")
        local connection_count=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM pg_stat_activity;")
        
        log "Database metrics:"
        log "  Size: $db_size"
        log "  Connections: $connection_count"
        
        ANALYSIS_RESULTS[db_size]="$db_size"
        ANALYSIS_RESULTS[db_connections]="$connection_count"
        
        # Store findings
        if [[ "$connection_count" -gt 80 ]]; then
            ISSUES_FOUND+=("High database connection count: $connection_count")
            RECOMMENDATIONS+=("Investigate and optimize database connection usage")
        fi
    else
        error "Database is not accessible"
        ISSUES_FOUND+=("Database connectivity issues detected")
        RECOMMENDATIONS+=("Restore database connectivity and investigate connection issues")
    fi
    
    success "Database state analysis completed"
}

# Analyze application state
analyze_application_state() {
    log "Analyzing application state..."
    
    # Check application health
    if curl -f -s http://localhost:3000/api/health > /dev/null; then
        success "Application is responding to health checks"
        
        # Get application metrics
        local health_response=$(curl -s http://localhost:3000/api/health)
        local app_status=$(echo "$health_response" | jq -r '.status // "unknown"')
        local uptime=$(echo "$health_response" | jq -r '.uptime // "unknown"')
        local version=$(echo "$health_response" | jq -r '.version // "unknown"')
        
        log "Application metrics:"
        log "  Status: $app_status"
        log "  Uptime: $uptime"
        log "  Version: $version"
        
        ANALYSIS_RESULTS[app_status]="$app_status"
        ANALYSIS_RESULTS[app_uptime]="$uptime"
        ANALYSIS_RESULTS[app_version]="$version"
        
        if [[ "$app_status" != "healthy" ]]; then
            ISSUES_FOUND+=("Application health status is $app_status")
            RECOMMENDATIONS+=("Investigate and resolve application health issues")
        fi
    else
        error "Application is not responding to health checks"
        ISSUES_FOUND+=("Application health check failures")
        RECOMMENDATIONS+=("Restore application health and investigate startup issues")
    fi
    
    # Check application logs for errors
    local app_log_dir="$PROJECT_ROOT/logs"
    if [[ -d "$app_log_dir" ]]; then
        local recent_errors=$(find "$app_log_dir" -name "*.log" -exec grep -l "ERROR\|FATAL" {} \; | wc -l)
        
        if [[ "$recent_errors" -gt 0 ]]; then
            warning "Found $recent_errors log files with recent errors"
            ISSUES_FOUND+=("Application logs contain $recent_errors error files")
            RECOMMENDATIONS+=("Investigate and resolve application errors")
        fi
    fi
    
    success "Application state analysis completed"
}

# Analyze feature flag state
analyze_feature_flag_state() {
    log "Analyzing feature flag state..."
    
    if [[ -z "$API_URL" || -z "$API_KEY" ]]; then
        warning "API_URL or API_KEY not set, skipping feature flag analysis"
        return
    fi
    
    # Check AI search flags
    local ai_flags=(
        "ai-search-enabled"
        "ai-search-advanced-options"
        "ai-search-caching"
        "ai-contact-extraction"
    )
    
    local enabled_flags=0
    local flags_with_rollout=0
    
    for flag in "${ai_flags[@]}"; do
        local flag_response=$(curl -s -H "Authorization: Bearer $API_KEY" "$API_URL/api/feature-flags/$flag" 2>/dev/null)
        
        if [[ -n "$flag_response" ]]; then
            local is_enabled=$(echo "$flag_response" | jq -r '.enabled // false')
            local rollout=$(echo "$flag_response" | jq -r '.rolloutPercentage // 0')
            
            if [[ "$is_enabled" == "true" ]]; then
                ((enabled_flags++))
                error "Feature flag $flag is still enabled (should be disabled after rollback)"
                ISSUES_FOUND+=("Feature flag $flag is still enabled after rollback")
            fi
            
            if [[ "$rollout" -gt 0 ]]; then
                ((flags_with_rollout++))
                error "Feature flag $flag has rollout percentage > 0: $rollout% (should be 0 after rollback)"
                ISSUES_FOUND+=("Feature flag $flag has non-zero rollout after rollback")
            fi
        else
            warning "Could not retrieve status for feature flag: $flag"
        fi
    done
    
    if [[ "$enabled_flags" -eq 0 && "$flags_with_rollout" -eq 0 ]]; then
        success "All AI search feature flags are properly disabled"
        LESSONS_LEARNED+=("Feature flag rollback was successful")
    else
        RECOMMENDATIONS+=("Complete feature flag rollback by disabling all AI flags")
    fi
    
    ANALYSIS_RESULTS[enabled_flags]="$enabled_flags"
    ANALYSIS_RESULTS[flags_with_rollout]="$flags_with_rollout"
    
    success "Feature flag state analysis completed"
}

# Analyze external service state
analyze_external_service_state() {
    log "Analyzing external service state..."
    
    # Check service configurations
    local config_dir="$PROJECT_ROOT/src/lib/ai/services/config"
    local enabled_services=0
    
    if [[ -d "$config_dir" ]]; then
        for config_file in "$config_dir"/*.json; do
            if [[ -f "$config_file" ]]; then
                local service_name=$(basename "$config_file" .json)
                local is_enabled=$(jq -r '.enabled // false' "$config_file" 2>/dev/null || echo "false")
                
                if [[ "$is_enabled" == "true" ]]; then
                    ((enabled_services++))
                    error "Service configuration $service_name is still enabled (should be disabled after rollback)"
                    ISSUES_FOUND+=("External service $service_name is still enabled after rollback")
                else
                    success "External service $service_name is properly disabled"
                fi
            fi
        done
    else
        warning "Service configuration directory not found: $config_dir"
    fi
    
    # Check for recent external API calls
    local service_logs=$(find "$PROJECT_ROOT/logs" -name "*.log" -exec grep -l "OpenAI\|Anthropic\|Exa\|Firecrawl" {} \; 2>/dev/null | wc -l)
    
    if [[ "$service_logs" -gt 0 ]]; then
        warning "Found $service_logs log files with recent external service calls"
        ISSUES_FOUND+=("External service API calls detected after rollback")
        RECOMMENDATIONS+=("Investigate why external services are still being called after rollback")
    else
        success "No recent external service API calls found"
        LESSONS_LEARNED+=("External service rollback was successful")
    fi
    
    ANALYSIS_RESULTS[enabled_services]="$enabled_services"
    ANALYSIS_RESULTS[service_logs]="$service_logs"
    
    success "External service state analysis completed"
}

# Analyze rollback performance
analyze_rollback_performance() {
    log "Analyzing rollback performance..."
    
    # Find rollback metadata file
    local metadata_file=$(find "$ROLLBACK_DATA_DIR" -name "rollback-metadata.json" | head -1)
    
    if [[ -f "$metadata_file" ]]; then
        # Extract timing information if available
        local rollback_start=$(jq -r '.start_time // "unknown"' "$metadata_file")
        local rollback_end=$(jq -r '.end_time // "unknown"' "$metadata_file")
        
        if [[ "$rollback_start" != "unknown" && "$rollback_end" != "unknown" ]]; then
            local rollback_duration=$((rollback_end - rollback_start))
            
            log "Rollback performance metrics:"
            log "  Duration: ${rollback_duration} seconds"
            
            ANALYSIS_RESULTS[rollback_duration]="$rollback_duration"
            
            # Evaluate rollback performance
            if [[ "$rollback_duration" -gt 1800 ]]; then  # 30 minutes
                ISSUES_FOUND+=("Rollback took longer than expected: ${rollback_duration} seconds")
                RECOMMENDATIONS+=("Optimize rollback procedures to reduce duration")
            elif [[ "$rollback_duration" -gt 900 ]]; then  # 15 minutes
                warning("Rollback duration was longer than ideal: ${rollback_duration} seconds")
                RECOMMENDATIONS+=("Consider optimizing rollback procedures")
            else
                success("Rollback completed within acceptable time: ${rollback_duration} seconds")
                LESSONS_LEARNED+=("Rollback procedures are efficient")
            fi
        else
            warning "Rollback timing information not available in metadata"
        fi
    else
        warning "Rollback metadata file not found for performance analysis"
    fi
    
    success "Rollback performance analysis completed"
}

# Generate lessons learned
generate_lessons_learned() {
    log "Generating lessons learned..."
    
    # Add default lessons based on analysis results
    if [[ ${#ISSUES_FOUND[@]} -eq 0 ]]; then
        LESSONS_LEARNED+=("Rollback procedures are effective and reliable")
        LESSONS_LEARNED+=("System recovered successfully without issues")
    else
        LESSONS_LEARNED+=("Rollback procedures need improvement to address identified issues")
    fi
    
    if [[ -n "${ANALYSIS_RESULTS[log_errors]}" && "${ANALYSIS_RESULTS[log_errors]}" -gt 0 ]]; then
        LESSONS_LEARNED+=("Rollback procedures generate error messages that need investigation")
    fi
    
    if [[ -n "${ANALYSIS_RESULTS[enabled_flags]}" && "${ANALYSIS_RESULTS[enabled_flags]}" -gt 0 ]]; then
        LESSONS_LEARNED+=("Feature flag rollback procedures need improvement")
    fi
    
    if [[ -n "${ANALYSIS_RESULTS[enabled_services]}" && "${ANALYSIS_RESULTS[enabled_services]}" -gt 0 ]]; then
        LESSONS_LEARNED+=("External service rollback procedures need improvement")
    fi
    
    success "Lessons learned generated"
}

# Generate analysis report
generate_analysis_report() {
    log "Generating comprehensive analysis report..."
    
    local analysis_duration=$(($(date +%s) - ANALYSIS_START_TIME))
    
    cat > "$ANALYSIS_OUTPUT_DIR/analysis-report.md" << EOF
# Post-Rollback Analysis Report

## Analysis Information
- **Analysis ID**: $ANALYSIS_ID
- **Rollback ID**: $ROLLBACK_ID
- **Analysis Type**: $ANALYSIS_TYPE
- **Timestamp**: $(date -u +%Y-%m-%dT%H:%M:%SZ)
- **Duration**: ${analysis_duration} seconds
- **Status**: $([ "$ANALYSIS_SUCCESS" = true ] && echo "Success" || echo "Failed")

## Rollback Summary
- **Environment**: ${ANALYSIS_RESULTS[environment]:-Unknown}
- **Reason**: ${ANALYSIS_RESULTS[reason]:-Unknown}
- **Type**: ${ANALYSIS_RESULTS[rollback_type]:-Unknown}
- **Timestamp**: ${ANALYSIS_RESULTS[timestamp]:-Unknown}
- **Actor**: ${ANALYSIS_RESULTS[actor]:-Unknown}

## Analysis Results

### Application State
- **Status**: ${ANALYSIS_RESULTS[app_status]:-Unknown}
- **Uptime**: ${ANALYSIS_RESULTS[app_uptime]:-Unknown}
- **Version**: ${ANALYSIS_RESULTS[app_version]:-Unknown}

### Database State
- **Size**: ${ANALYSIS_RESULTS[db_size]:-Unknown}
- **Connections**: ${ANALYSIS_RESULTS[db_connections]:-Unknown}

### Feature Flag State
- **Enabled Flags**: ${ANALYSIS_RESULTS[enabled_flags]:-0}
- **Flags with Rollout**: ${ANALYSIS_RESULTS[flags_with_rollout]:-0}

### External Service State
- **Enabled Services**: ${ANALYSIS_RESULTS[enabled_services]:-0}
- **Service Logs**: ${ANALYSIS_RESULTS[service_logs]:-0}

### Rollback Performance
- **Duration**: ${ANALYSIS_RESULTS[rollback_duration]:-Unknown} seconds

### Log Analysis
- **Errors**: ${ANALYSIS_RESULTS[log_errors]:-0}
- **Warnings**: ${ANALYSIS_RESULTS[log_warnings]:-0}

## Issues Found
$(if [[ ${#ISSUES_FOUND[@]} -gt 0 ]]; then
    for issue in "${ISSUES_FOUND[@]}"; do
        echo "- ❌ $issue"
    done
else
    echo "- ✅ No issues found"
fi)

## Recommendations
$(if [[ ${#RECOMMENDATIONS[@]} -gt 0 ]]; then
    for recommendation in "${RECOMMENDATIONS[@]}"; do
        echo "- 📋 $recommendation"
    done
else
    echo "- ✅ No recommendations at this time"
fi)

## Lessons Learned
$(if [[ ${#LESSONS_LEARNED[@]} -gt 0 ]]; then
    for lesson in "${LESSONS_LEARNED[@]}"; do
        echo "- 💡 $lesson"
    done
else
    echo "- 📝 Document lessons learned from this rollback"
fi)

## Action Items
1. [ ] Address all identified issues
2. [ ] Implement all recommendations
3. [ ] Update rollback procedures based on lessons learned
4. [ ] Schedule follow-up analysis
5. [ ] Share findings with relevant teams

## Files Generated
- \`analysis.log\` - Detailed analysis log
- \`analysis-report.md\` - This report
- \`analyze-logs.sh\` - Log analysis script

## Next Steps
1. Review and approve action items
2. Assign owners to each action item
3. Set deadlines for completion
4. Schedule follow-up meeting
5. Update documentation

## Contacts
- **Analysis Lead**: ${ACTOR:-unknown}
- **Engineering Lead**: [Engineering Contact]
- **Product Lead**: [Product Contact]
- **QA Lead**: [QA Contact]
EOF
    
    success "Analysis report generated at $ANALYSIS_OUTPUT_DIR/analysis-report.md"
}

# Send analysis notification
send_analysis_notification() {
    local status=$1
    local message=$2
    
    local analysis_duration=$(($(date +%s) - ANALYSIS_START_TIME))
    
    # Create notification payload
    local notification_payload=$(cat << EOF
{
    "status": "$status",
    "message": "$message",
    "analysis_id": "$ANALYSIS_ID",
    "rollback_id": "$ROLLBACK_ID",
    "analysis_type": "$ANALYSIS_TYPE",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "duration_seconds": $analysis_duration,
    "issues_found": ${#ISSUES_FOUND[@]},
    "recommendations": ${#RECOMMENDATIONS[@]},
    "results_location": "$ANALYSIS_OUTPUT_DIR"
}
EOF
)
    
    # Send webhook notification
    if [[ -n "${ANALYSIS_WEBHOOK_URL}" ]]; then
        curl -X POST "$ANALYSIS_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "$notification_payload" \
            2>> "$ANALYSIS_LOG_FILE" || true
    fi
    
    # Email notification
    if command -v mail &> /dev/null && [[ -n "${ANALYSIS_EMAIL}" ]]; then
        mail -s "Post-Rollback Analysis $status: AI Search Feature" "$ANALYSIS_EMAIL" << EOF 2>> "$ANALYSIS_LOG_FILE"
Post-rollback analysis $status for AI Search feature:

Analysis ID: $ANALYSIS_ID
Rollback ID: $ROLLBACK_ID
Type: $ANALYSIS_TYPE
Duration: ${analysis_duration}s
Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)

Issues Found: ${#ISSUES_FOUND[@]}
Recommendations: ${#RECOMMENDATIONS[@]}

$message

Full analysis report available at: $ANALYSIS_OUTPUT_DIR/analysis-report.md
EOF
    fi
}

# Main analysis flow
main() {
    log "Starting post-rollback analysis for rollback ID: $ROLLBACK_ID"
    log "Analysis ID: $ANALYSIS_ID"
    log "Analysis Type: $ANALYSIS_TYPE"
    
    # Set up error handling
    trap 'error "Analysis failed at line $LINENO. Check log file: $ANALYSIS_LOG_FILE"' ERR
    
    initialize_analysis
    collect_rollback_metadata
    
    # Run analysis based on type
    case "$ANALYSIS_TYPE" in
        "comprehensive")
            analyze_rollback_logs
            analyze_database_state
            analyze_application_state
            analyze_feature_flag_state
            analyze_external_service_state
            analyze_rollback_performance
            ;;
        "quick")
            analyze_application_state
            analyze_feature_flag_state
            analyze_external_service_state
            ;;
        "custom")
            # Add custom analysis steps here
            analyze_application_state
            ;;
        *)
            error "Unknown analysis type: $ANALYSIS_TYPE"
            exit 1
            ;;
    esac
    
    generate_lessons_learned
    generate_analysis_report
    
    # Send appropriate notification based on success
    if [[ "$ANALYSIS_SUCCESS" == true ]]; then
        send_analysis_notification "SUCCESS" "Post-rollback analysis completed successfully"
        success "Post-rollback analysis completed successfully!"
    else
        send_analysis_notification "FAILURE" "Post-rollback analysis failed or encountered issues"
        error "Post-rollback analysis failed or encountered issues"
    fi
    
    log "Analysis log available at: $ANALYSIS_LOG_FILE"
    log "Analysis report available at: $ANALYSIS_OUTPUT_DIR/analysis-report.md"
    
    # Exit with appropriate code
    if [[ "$ANALYSIS_SUCCESS" == true ]]; then
        exit 0
    else
        exit 1
    fi
}

# Parse command line arguments
if [[ $# -lt 1 ]]; then
    echo "Usage: $0 <rollback_id> [analysis_type] [rollback_data_dir]"
    echo "Example: $0 rollback-20240115-143022 comprehensive /tmp/media-contacts-rollback-20240115-143022"
    echo ""
    echo "Analysis types:"
    echo "  comprehensive - Analyze all components (default)"
    echo "  quick - Quick analysis of key components"
    echo "  custom - Custom analysis steps"
    echo ""
    echo "Environment variables:"
    echo "  DATABASE_URL - Database connection string"
    echo "  API_URL - Feature flag API URL"
    echo "  API_KEY - Feature flag API key"
    echo ""
    echo "Notification configuration:"
    echo "  ANALYSIS_WEBHOOK_URL - Webhook URL for analysis notifications"
    echo "  ANALYSIS_EMAIL - Email address for analysis notifications"
    exit 1
fi

ROLLBACK_ID="$1"
if [[ -n "$2" ]]; then
    ANALYSIS_TYPE="$2"
fi
if [[ -n "$3" ]]; then
    ROLLBACK_DATA_DIR="$3"
fi

main "$@"