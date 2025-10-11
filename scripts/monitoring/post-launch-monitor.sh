#!/bin/bash

# Post-Launch Monitoring Script for AI Search Feature
# This script provides comprehensive monitoring after the AI Search feature launch

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENVIRONMENT="${ENVIRONMENT:-production}"
LOG_FILE="/tmp/post-launch-monitor-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).log"
REPORT_FILE="/tmp/post-launch-report-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).json"
METRICS_FILE="/tmp/post-launch-metrics-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).csv"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Monitoring data
declare -A PERFORMANCE_METRICS
declare -A USAGE_METRICS
declare -A ERROR_METRICS
declare -A COST_METRICS

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

# Initialize monitoring
init_monitoring() {
    log "Initializing post-launch monitoring for ${ENVIRONMENT} environment..."
    
    # Create CSV header for metrics
    echo "timestamp,metric_name,metric_value,metric_type" > "$METRICS_FILE"
    
    # Initialize JSON report
    cat > "$REPORT_FILE" << EOF
{
  "monitoring_session": {
    "id": "monitor-$(date +%Y%m%d-%H%M%S)",
    "environment": "$ENVIRONMENT",
    "start_time": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "feature": "ai-search"
  },
  "metrics": {
EOF
    
    success "Monitoring initialized"
}

# Monitor application performance
monitor_performance() {
    log "Monitoring application performance..."
    
    # Response time metrics
    if command -v curl &> /dev/null; then
        # Measure API response times
        local endpoints=(
            "/api/health"
            "/api/ai/search/health"
            "/api/feature-flags/ai-search"
        )
        
        for endpoint in "${endpoints[@]}"; do
            local start_time=$(date +%s%N)
            if curl -f -s -m 10 "http://localhost:3000$endpoint" > /dev/null; then
                local end_time=$(date +%s%N)
                local response_time=$(( (end_time - start_time) / 1000000 ))  # Convert to milliseconds
                
                PERFORMANCE_METRICS["${endpoint}_response_time"]=$response_time
                echo "$(date -u +%Y-%m-%dT%H:%M:%SZ),${endpoint}_response_time,$response_time,performance" >> "$METRICS_FILE"
                
                if [[ $response_time -lt 500 ]]; then
                    log "Response time for $endpoint: ${response_time}ms (Good)"
                elif [[ $response_time -lt 1000 ]]; then
                    log "Response time for $endpoint: ${response_time}ms (Acceptable)"
                else
                    warning "Response time for $endpoint: ${response_time}ms (Slow)"
                fi
            else
                error "Failed to reach $endpoint"
                PERFORMANCE_METRICS["${endpoint}_response_time"]="failed"
            fi
        done
    fi
    
    # Memory usage
    if command -v free &> /dev/null; then
        local memory_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
        PERFORMANCE_METRICS["memory_usage_percent"]=$memory_usage
        echo "$(date -u +%Y-%m-%dT%H:%M:%SZ),memory_usage_percent,$memory_usage,performance" >> "$METRICS_FILE"
        
        if [[ $memory_usage -lt 80 ]]; then
            log "Memory usage: ${memory_usage}% (Good)"
        elif [[ $memory_usage -lt 90 ]]; then
            warning "Memory usage: ${memory_usage}% (High)"
        else
            error "Memory usage: ${memory_usage}% (Critical)"
        fi
    fi
    
    # CPU load
    if command -v uptime &> /dev/null; then
        local load_average=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
        PERFORMANCE_METRICS["cpu_load"]=$load_average
        echo "$(date -u +%Y-%m-%dT%H:%M:%SZ),cpu_load,$load_average,performance" >> "$METRICS_FILE"
        
        log "CPU load average: $load_average"
    fi
    
    # Database query performance
    if command -v psql &> /dev/null && [[ -n "$DATABASE_URL" ]]; then
        local slow_queries=$(psql "$DATABASE_URL" -t -c "
            SELECT COUNT(*)
            FROM pg_stat_statements
            WHERE mean_exec_time > 1000
            AND calls > 10;
        " 2>> "$LOG_FILE" | xargs)
        
        PERFORMANCE_METRICS["slow_queries_count"]=$slow_queries
        echo "$(date -u +%Y-%m-%dT%H:%M:%SZ),slow_queries_count,$slow_queries,performance" >> "$METRICS_FILE"
        
        if [[ $slow_queries -gt 0 ]]; then
            warning "Found $slow_queries slow queries"
        else
            log "No slow queries detected"
        fi
    fi
    
    success "Performance monitoring completed"
}

# Monitor feature usage
monitor_usage() {
    log "Monitoring AI Search feature usage..."
    
    # Get usage statistics from database
    if command -v psql &> /dev/null && [[ -n "$DATABASE_URL" ]]; then
        # Daily usage metrics
        local daily_searches=$(psql "$DATABASE_URL" -t -c "
            SELECT COUNT(*)
            FROM ai_searches
            WHERE created_at >= CURRENT_DATE;
        " 2>> "$LOG_FILE" | xargs)
        
        USAGE_METRICS["daily_searches"]=$daily_searches
        echo "$(date -u +%Y-%m-%dT%H:%M:%SZ),daily_searches,$daily_searches,usage" >> "$METRICS_FILE"
        
        local weekly_searches=$(psql "$DATABASE_URL" -t -c "
            SELECT COUNT(*)
            FROM ai_searches
            WHERE created_at >= CURRENT_DATE - INTERVAL '7 days';
        " 2>> "$LOG_FILE" | xargs)
        
        USAGE_METRICS["weekly_searches"]=$weekly_searches
        echo "$(date -u +%Y-%m-%dT%H:%M:%SZ),weekly_searches,$weekly_searches,usage" >> "$METRICS_FILE"
        
        # Success rate
        local successful_searches=$(psql "$DATABASE_URL" -t -c "
            SELECT COUNT(*)
            FROM ai_searches
            WHERE status = 'COMPLETED'
            AND created_at >= CURRENT_DATE;
        " 2>> "$LOG_FILE" | xargs)
        
        local success_rate=0
        if [[ $daily_searches -gt 0 ]]; then
            success_rate=$(echo "scale=2; $successful_searches * 100 / $daily_searches" | bc 2>/dev/null || echo "0")
        fi
        
        USAGE_METRICS["success_rate"]=$success_rate
        echo "$(date -u +%Y-%m-%dT%H:%M:%SZ),success_rate,$success_rate,usage" >> "$METRICS_FILE"
        
        # Average contacts found per search
        local avg_contacts=$(psql "$DATABASE_URL" -t -c "
            SELECT AVG(contacts_found)
            FROM ai_searches
            WHERE status = 'COMPLETED'
            AND created_at >= CURRENT_DATE;
        " 2>> "$LOG_FILE" | xargs)
        
        USAGE_METRICS["avg_contacts_per_search"]=$avg_contacts
        echo "$(date -u +%Y-%m-%dT%H:%M:%SZ),avg_contacts_per_search,$avg_contacts,usage" >> "$METRICS_FILE"
        
        # Feature flag usage
        local feature_flag_enabled=$(curl -s -H "Authorization: Bearer $API_KEY" \
            "$API_URL/api/feature-flags/ai-search" | jq -r '.enabled // false' 2>/dev/null || echo "false")
        
        USAGE_METRICS["feature_flag_enabled"]=$feature_flag_enabled
        echo "$(date -u +%Y-%m-%dT%H:%M:%SZ),feature_flag_enabled,$feature_flag_enabled,usage" >> "$METRICS_FILE"
        
        log "Daily searches: $daily_searches"
        log "Weekly searches: $weekly_searches"
        log "Success rate: ${success_rate}%"
        log "Average contacts per search: $avg_contacts"
        log "Feature flag enabled: $feature_flag_enabled"
    fi
    
    success "Usage monitoring completed"
}

# Monitor errors and exceptions
monitor_errors() {
    log "Monitoring errors and exceptions..."
    
    # Get error metrics from database
    if command -v psql &> /dev/null && [[ -n "$DATABASE_URL" ]]; then
        # Failed searches today
        local failed_searches=$(psql "$DATABASE_URL" -t -c "
            SELECT COUNT(*)
            FROM ai_searches
            WHERE status = 'FAILED'
            AND created_at >= CURRENT_DATE;
        " 2>> "$LOG_FILE" | xargs)
        
        ERROR_METRICS["failed_searches_today"]=$failed_searches
        echo "$(date -u +%Y-%m-%dT%H:%M:%SZ),failed_searches_today,$failed_searches,error" >> "$METRICS_FILE"
        
        # Failed extractions today
        local failed_extractions=$(psql "$DATABASE_URL" -t -c "
            SELECT COUNT(*)
            FROM ai_extraction_jobs
            WHERE status = 'FAILED'
            AND created_at >= CURRENT_DATE;
        " 2>> "$LOG_FILE" | xargs)
        
        ERROR_METRICS["failed_extractions_today"]=$failed_extractions
        echo "$(date -u +%Y-%m-%dT%H:%M:%SZ),failed_extractions_today,$failed_extractions,error" >> "$METRICS_FILE"
        
        # Application errors from logs (if available)
        local app_errors=0
        if [[ -f "/var/log/media-contacts/app.log" ]]; then
            app_errors=$(grep -c "ERROR" /var/log/media-contacts/app.log 2>/dev/null || echo "0")
        fi
        
        ERROR_METRICS["application_errors"]=$app_errors
        echo "$(date -u +%Y-%m-%dT%H:%M:%SZ),application_errors,$app_errors,error" >> "$METRICS_FILE"
        
        log "Failed searches today: $failed_searches"
        log "Failed extractions today: $failed_extractions"
        log "Application errors: $app_errors"
    fi
    
    # Check API error rates
    if command -v curl &> /dev/null; then
        # Test error endpoints
        local error_endpoints=(
            "/api/ai/search/invalid-endpoint"
            "/api/ai/search/test-error"
        )
        
        for endpoint in "${error_endpoints[@]}"; do
            local status_code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$endpoint" || echo "000")
            
            if [[ "$status_code" == "404" || "$status_code" == "500" ]]; then
                log "Error endpoint $endpoint returned expected status: $status_code"
            else
                warning "Error endpoint $endpoint returned unexpected status: $status_code"
            fi
        done
    fi
    
    success "Error monitoring completed"
}

# Monitor costs
monitor_costs() {
    log "Monitoring AI service costs..."
    
    # Run cost monitoring script if available
    if [[ -f "$PROJECT_ROOT/scripts/monitoring/cost-monitor.sh" ]]; then
        chmod +x "$PROJECT_ROOT/scripts/monitoring/cost-monitor.sh"
        "$PROJECT_ROOT/scripts/monitoring/cost-monitor.sh" full > /tmp/cost-monitor-output.json 2>> "$LOG_FILE"
        
        # Parse cost monitoring output
        if command -v jq &> /dev/null && [[ -f "/tmp/cost-monitor-output.json" ]]; then
            local daily_cost=$(jq -r '.services.totals.daily_cost' /tmp/cost-monitor-output.json 2>/dev/null || echo "0")
            local monthly_cost=$(jq -r '.services.totals.monthly_cost' /tmp/cost-monitor-output.json 2>/dev/null || echo "0")
            
            COST_METRICS["daily_cost"]=$daily_cost
            COST_METRICS["monthly_cost"]=$monthly_cost
            
            echo "$(date -u +%Y-%m-%dT%H:%M:%SZ),daily_cost,$daily_cost,cost" >> "$METRICS_FILE"
            echo "$(date -u +%Y-%m-%dT%H:%M:%SZ),monthly_cost,$monthly_cost,cost" >> "$METRICS_FILE"
            
            log "Daily cost: $${daily_cost}"
            log "Monthly cost: $${monthly_cost}"
            
            # Check against thresholds
            local daily_threshold=${ALERT_THRESHOLD_DAILY:-50}
            local monthly_threshold=${ALERT_THRESHOLD_MONTHLY:-1000}
            
            if (( $(echo "$daily_cost > $daily_threshold" | bc -l) )); then
                error "Daily cost threshold exceeded: $${daily_cost} > $${daily_threshold}"
            elif (( $(echo "$daily_cost > $(echo "$daily_threshold * 0.8" | bc)" | bc -l) )); then
                warning "Daily cost approaching threshold: $${daily_cost}"
            fi
            
            if (( $(echo "$monthly_cost > $monthly_threshold" | bc -l) )); then
                error "Monthly cost threshold exceeded: $${monthly_cost} > $${monthly_threshold}"
            elif (( $(echo "$monthly_cost > $(echo "$monthly_threshold * 0.8" | bc)" | bc -l) )); then
                warning "Monthly cost approaching threshold: $${monthly_cost}"
            fi
        fi
    else
        warning "Cost monitoring script not found"
    fi
    
    success "Cost monitoring completed"
}

# Monitor user satisfaction
monitor_user_satisfaction() {
    log "Monitoring user satisfaction metrics..."
    
    # Get user feedback from database (if available)
    if command -v psql &> /dev/null && [[ -n "$DATABASE_URL" ]]; then
        # User ratings (if feedback table exists)
        local avg_rating=0
        if psql "$DATABASE_URL" -c "\dt user_feedback" &>/dev/null; then
            avg_rating=$(psql "$DATABASE_URL" -t -c "
                SELECT AVG(rating)
                FROM user_feedback
                WHERE feature = 'ai-search'
                AND created_at >= CURRENT_DATE - INTERVAL '7 days';
            " 2>> "$LOG_FILE" | xargs)
            
            USAGE_METRICS["user_rating"]=$avg_rating
            echo "$(date -u +%Y-%m-%dT%H:%M:%SZ),user_rating,$avg_rating,satisfaction" >> "$METRICS_FILE"
            
            if [[ -n "$avg_rating" && "$avg_rating" != "" ]]; then
                log "Average user rating: $avg_rating/5"
            fi
        fi
        
        # Repeat usage (users who used the feature multiple times)
        local repeat_users=$(psql "$DATABASE_URL" -t -c "
            SELECT COUNT(DISTINCT userId)
            FROM ai_searches
            WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
            GROUP BY userId
            HAVING COUNT(*) > 1;
        " 2>> "$LOG_FILE" | wc -l | xargs)
        
        USAGE_METRICS["repeat_users"]=$repeat_users
        echo "$(date -u +%Y-%m-%dT%H:%M:%SZ),repeat_users,$repeat_users,satisfaction" >> "$METRICS_FILE"
        
        log "Repeat users (last 7 days): $repeat_users"
    fi
    
    success "User satisfaction monitoring completed"
}

# Generate comprehensive report
generate_report() {
    log "Generating comprehensive monitoring report..."
    
    # Add performance metrics to report
    cat >> "$REPORT_FILE" << EOF
    "performance": {
EOF
    
    local first=true
    for key in "${!PERFORMANCE_METRICS[@]}"; do
        if [[ "$first" == true ]]; then
            first=false
        else
            echo "," >> "$REPORT_FILE"
        fi
        echo "      \"$key\": \"${PERFORMANCE_METRICS[$key]}\"" >> "$REPORT_FILE"
    done
    
    cat >> "$REPORT_FILE" << EOF
    },
    "usage": {
EOF
    
    # Add usage metrics to report
    first=true
    for key in "${!USAGE_METRICS[@]}"; do
        if [[ "$first" == true ]]; then
            first=false
        else
            echo "," >> "$REPORT_FILE"
        fi
        echo "      \"$key\": \"${USAGE_METRICS[$key]}\"" >> "$REPORT_FILE"
    done
    
    cat >> "$REPORT_FILE" << EOF
    },
    "errors": {
EOF
    
    # Add error metrics to report
    first=true
    for key in "${!ERROR_METRICS[@]}"; do
        if [[ "$first" == true ]]; then
            first=false
        else
            echo "," >> "$REPORT_FILE"
        fi
        echo "      \"$key\": \"${ERROR_METRICS[$key]}\"" >> "$REPORT_FILE"
    done
    
    cat >> "$REPORT_FILE" << EOF
    },
    "costs": {
EOF
    
    # Add cost metrics to report
    first=true
    for key in "${!COST_METRICS[@]}"; do
        if [[ "$first" == true ]]; then
            first=false
        else
            echo "," >> "$REPORT_FILE"
        fi
        echo "      \"$key\": \"${COST_METRICS[$key]}\"" >> "$REPORT_FILE"
    done
    
    # Close the JSON structure
    cat >> "$REPORT_FILE" << EOF
    }
  },
  "summary": {
    "overall_health": "$(determine_overall_health)",
    "recommendations": [
      $(generate_recommendations)
    ],
    "next_monitoring": "$(date -u -d '+1 hour' +%Y-%m-%dT%H:%M:%SZ)"
  },
  "end_time": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
    
    success "Monitoring report generated: $REPORT_FILE"
}

# Determine overall health status
determine_overall_health() {
    local health_score=100
    
    # Check for critical issues
    if [[ "${ERROR_METRICS[failed_searches_today]}" -gt 10 ]]; then
        health_score=$((health_score - 30))
    fi
    
    if [[ "${PERFORMANCE_METRICS[memory_usage_percent]}" -gt 90 ]]; then
        health_score=$((health_score - 20))
    fi
    
    # Check for warnings
    if [[ "${USAGE_METRICS[success_rate]}" != "" && $(echo "${USAGE_METRICS[success_rate]} < 80" | bc -l) -eq 1 ]]; then
        health_score=$((health_score - 15))
    fi
    
    if [[ "${PERFORMANCE_METRICS[memory_usage_percent]}" -gt 80 ]]; then
        health_score=$((health_score - 10))
    fi
    
    # Determine health status
    if [[ $health_score -ge 80 ]]; then
        echo "healthy"
    elif [[ $health_score -ge 60 ]]; then
        echo "degraded"
    else
        echo "unhealthy"
    fi
}

# Generate recommendations
generate_recommendations() {
    local recommendations=()
    
    # Performance recommendations
    if [[ "${PERFORMANCE_METRICS[memory_usage_percent]}" -gt 80 ]]; then
        recommendations+=("\"Consider scaling up memory resources\"")
    fi
    
    # Usage recommendations
    if [[ "${USAGE_METRICS[success_rate]}" != "" && $(echo "${USAGE_METRICS[success_rate]} < 90" | bc -l) -eq 1 ]]; then
        recommendations+=("\"Investigate low success rate and improve error handling\"")
    fi
    
    # Error recommendations
    if [[ "${ERROR_METRICS[failed_searches_today]}" -gt 5 ]]; then
        recommendations+=("\"Review and fix common search failure patterns\"")
    fi
    
    # Cost recommendations
    if [[ "${COST_METRICS[daily_cost]}" != "" && $(echo "${COST_METRICS[daily_cost]} > 40" | bc -l) -eq 1 ]]; then
        recommendations+=("\"Monitor costs closely and consider optimization strategies\"")
    fi
    
    # Default recommendation if no specific issues
    if [[ ${#recommendations[@]} -eq 0 ]]; then
        recommendations+=("\"System is performing well, continue monitoring\"")
    fi
    
    # Join recommendations with commas
    local IFS=","
    echo "${recommendations[*]}"
}

# Display monitoring summary
display_summary() {
    log "Post-Launch Monitoring Summary"
    log "=============================="
    
    echo "Overall Health: $(determine_overall_health)" | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"
    
    echo "Performance Metrics:" | tee -a "$LOG_FILE"
    echo "  Memory Usage: ${PERFORMANCE_METRICS[memory_usage_percent]}%" | tee -a "$LOG_FILE"
    echo "  CPU Load: ${PERFORMANCE_METRICS[cpu_load]}" | tee -a "$LOG_FILE"
    echo "  Slow Queries: ${PERFORMANCE_METRICS[slow_queries_count]}" | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"
    
    echo "Usage Metrics:" | tee -a "$LOG_FILE"
    echo "  Daily Searches: ${USAGE_METRICS[daily_searches]}" | tee -a "$LOG_FILE"
    echo "  Weekly Searches: ${USAGE_METRICS[weekly_searches]}" | tee -a "$LOG_FILE"
    echo "  Success Rate: ${USAGE_METRICS[success_rate]}%" | tee -a "$LOG_FILE"
    echo "  Feature Flag Enabled: ${USAGE_METRICS[feature_flag_enabled]}" | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"
    
    echo "Error Metrics:" | tee -a "$LOG_FILE"
    echo "  Failed Searches Today: ${ERROR_METRICS[failed_searches_today]}" | tee -a "$LOG_FILE"
    echo "  Failed Extractions Today: ${ERROR_METRICS[failed_extractions_today]}" | tee -a "$LOG_FILE"
    echo "  Application Errors: ${ERROR_METRICS[application_errors]}" | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"
    
    echo "Cost Metrics:" | tee -a "$LOG_FILE"
    echo "  Daily Cost: $${COST_METRICS[daily_cost]}" | tee -a "$LOG_FILE"
    echo "  Monthly Cost: $${COST_METRICS[monthly_cost]}" | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"
    
    echo "Recommendations:" | tee -a "$LOG_FILE"
    generate_recommendations | sed 's/"//g' | sed 's/,/\n  /g' | sed 's/^/  /' | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"
    
    echo "Detailed report available at: $REPORT_FILE" | tee -a "$LOG_FILE"
    echo "Metrics data available at: $METRICS_FILE" | tee -a "$LOG_FILE"
    echo "Full log available at: $LOG_FILE" | tee -a "$LOG_FILE"
}

# Send monitoring report
send_report() {
    local overall_health=$(determine_overall_health)
    
    log "Sending monitoring report..."
    
    # Example webhook notification (customize as needed)
    if [[ -n "${MONITORING_WEBHOOK_URL}" ]]; then
        curl -X POST "$MONITORING_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{
                \"monitoring_type\": \"post_launch\",
                \"environment\": \"$ENVIRONMENT\",
                \"feature\": \"ai-search\",
                \"overall_health\": \"$overall_health\",
                \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
                \"report\": \"$REPORT_FILE\",
                \"metrics\": \"$METRICS_FILE\"
            }" \
            2>> "$LOG_FILE" || true
    fi
    
    # Send email report if critical
    if [[ "$overall_health" == "unhealthy" ]]; then
        if command -v mail &> /dev/null && [[ -n "${ADMIN_EMAIL}" ]]; then
            mail -s "CRITICAL: Post-Launch Monitoring Alert - AI Search Feature" "$ADMIN_EMAIL" << EOF 2>> "$LOG_FILE"
Post-launch monitoring has detected critical issues with the AI Search feature in ${ENVIRONMENT} environment:

Overall Health: $overall_health

Key Metrics:
- Memory Usage: ${PERFORMANCE_METRICS[memory_usage_percent]}%
- Daily Searches: ${USAGE_METRICS[daily_searches]}
- Success Rate: ${USAGE_METRICS[success_rate]}%
- Failed Searches Today: ${ERROR_METRICS[failed_searches_today]}

Detailed report available at: $REPORT_FILE
Full log available at: $LOG_FILE

Please investigate immediately.
EOF
        fi
    fi
}

# Main monitoring flow
main() {
    log "Starting post-launch monitoring for AI Search feature..."
    
    init_monitoring
    monitor_performance
    monitor_usage
    monitor_errors
    monitor_costs
    monitor_user_satisfaction
    generate_report
    display_summary
    send_report
    
    success "Post-launch monitoring completed"
}

# Parse command line arguments
case "${1:-full}" in
    "full")
        main
        ;;
    "performance")
        init_monitoring
        monitor_performance
        generate_report
        display_summary
        ;;
    "usage")
        init_monitoring
        monitor_usage
        generate_report
        display_summary
        ;;
    "errors")
        init_monitoring
        monitor_errors
        generate_report
        display_summary
        ;;
    "costs")
        init_monitoring
        monitor_costs
        generate_report
        display_summary
        ;;
    *)
        echo "Usage: $0 {full|performance|usage|errors|costs}"
        echo "Environment: Set ENVIRONMENT variable (default: production)"
        exit 1
        ;;
esac

# User experience monitoring
monitor_user_experience() {
    log "Monitoring user experience metrics..."
    
    if command -v psql &> /dev/null && [[ -n "$DATABASE_URL" ]]; then
        # User engagement metrics
        local avg_session_duration=$(psql "$DATABASE_URL" -t -c "
            SELECT AVG(EXTRACT(EPOCH FROM (last_activity - session_start)))
            FROM user_sessions
            WHERE session_start >= CURRENT_DATE;
        " 2>> "$LOG_FILE" | xargs)
        
        USAGE_METRICS["avg_session_duration"]=$avg_session_duration
        
        # Search abandonment rate
        local total_searches=$(psql "$DATABASE_URL" -t -c "
            SELECT COUNT(*)
            FROM ai_searches
            WHERE created_at >= CURRENT_DATE;
        " 2>> "$LOG_FILE" | xargs)
        
        local abandoned_searches=$(psql "$DATABASE_URL" -t -c "
            SELECT COUNT(*)
            FROM ai_searches
            WHERE status = 'ABANDONED'
            AND created_at >= CURRENT_DATE;
        " 2>> "$LOG_FILE" | xargs)
        
        local abandonment_rate=0
        if [[ $total_searches -gt 0 ]]; then
            abandonment_rate=$(echo "scale=2; $abandoned_searches * 100 / $total_searches" | bc 2>/dev/null || echo "0")
        fi
        
        USAGE_METRICS["search_abandonment_rate"]=$abandonment_rate
        echo "$(date -u +%Y-%m-%dT%H:%M:%SZ),search_abandonment_rate,$abandonment_rate,experience" >> "$METRICS_FILE"
        
        # Feature adoption rates
        local feature_adoption=$(psql "$DATABASE_URL" -t -c "
            SELECT
                feature_name,
                COUNT(DISTINCT user_id) as adopters,
                (COUNT(DISTINCT user_id) * 100.0 / (SELECT COUNT(DISTINCT user_id) FROM user_sessions WHERE session_start >= CURRENT_DATE)) as adoption_rate
            FROM feature_usage
            WHERE used_at >= CURRENT_DATE
            GROUP BY feature_name;
        " 2>> "$LOG_FILE")
        
        log "Feature adoption rates:"
        echo "$feature_adoption" | while IFS= read -r line; do
            if [[ -n "$line" ]]; then
                log "  $line"
            fi
        done
        
        # User satisfaction metrics
        local feedback_scores=$(psql "$DATABASE_URL" -t -c "
            SELECT
                AVG(rating) as avg_rating,
                COUNT(*) as feedback_count
            FROM user_feedback
            WHERE feature = 'ai-search'
            AND created_at >= CURRENT_DATE - INTERVAL '7 days';
        " 2>> "$LOG_FILE")
        
        if [[ -n "$feedback_scores" ]]; then
            local avg_rating=$(echo "$feedback_scores" | awk 'NR==1 {print $1}')
            local feedback_count=$(echo "$feedback_scores" | awk 'NR==1 {print $2}')
            
            USAGE_METRICS["user_satisfaction_rating"]=$avg_rating
            USAGE_METRICS["feedback_count"]=$feedback_count
            
            echo "$(date -u +%Y-%m-%dT%H:%M:%SZ),user_satisfaction_rating,$avg_rating,experience" >> "$METRICS_FILE"
            
            log "User satisfaction rating: $avg_rating/5 ($feedback_count reviews)"
        fi
        
        # Error impact on users
        local users_affected_by_errors=$(psql "$DATABASE_URL" -t -c "
            SELECT COUNT(DISTINCT user_id)
            FROM ai_searches
            WHERE status = 'FAILED'
            AND created_at >= CURRENT_DATE;
        " 2>> "$LOG_FILE" | xargs)
        
        USAGE_METRICS["users_affected_by_errors"]=$users_affected_by_errors
        echo "$(date -u +%Y-%m-%dT%H:%M:%SZ),users_affected_by_errors,$users_affected_by_errors,experience" >> "$METRICS_FILE"
        
        log "Users affected by errors today: $users_affected_by_errors"
    fi
    
    success "User experience monitoring completed"
}

# Business metrics monitoring
monitor_business_metrics() {
    log "Monitoring business metrics..."
    
    if command -v psql &> /dev/null && [[ -n "$DATABASE_URL" ]]; then
        # Contact discovery efficiency
        local total_contacts_found=$(psql "$DATABASE_URL" -t -c "
            SELECT SUM(contacts_found)
            FROM ai_searches
            WHERE status = 'COMPLETED'
            AND created_at >= CURRENT_DATE;
        " 2>> "$LOG_FILE" | xargs)
        
        local cost_per_contact=0
        if [[ -n "${COST_METRICS[daily_cost]}" && "$total_contacts_found" -gt 0 ]]; then
            cost_per_contact=$(echo "scale=4; ${COST_METRICS[daily_cost]} / $total_contacts_found" | bc 2>/dev/null || echo "0")
        fi
        
        USAGE_METRICS["cost_per_contact"]=$cost_per_contact
        echo "$(date -u +%Y-%m-%dT%H:%M:%SZ),cost_per_contact,$cost_per_contact,business" >> "$METRICS_FILE"
        
        # Time savings calculation
        local avg_manual_search_time=300  # 5 minutes in seconds
        local total_ai_search_time=$(psql "$DATABASE_URL" -t -c "
            SELECT AVG(EXTRACT(EPOCH FROM (completed_at - created_at)))
            FROM ai_searches
            WHERE status = 'COMPLETED'
            AND created_at >= CURRENT_DATE;
        " 2>> "$LOG_FILE" | xargs)
        
        local successful_searches=$(psql "$DATABASE_URL" -t -c "
            SELECT COUNT(*)
            FROM ai_searches
            WHERE status = 'COMPLETED'
            AND created_at >= CURRENT_DATE;
        " 2>> "$LOG_FILE" | xargs)
        
        local time_saved=0
        if [[ -n "$total_ai_search_time" && "$successful_searches" -gt 0 ]]; then
            local time_per_search=$(echo "$total_ai_search_time" | awk '{print int($1)}')
            local savings_per_search=$((avg_manual_search_time - time_per_search))
            time_saved=$((successful_searches * savings_per_search))
        fi
        
        USAGE_METRICS["time_saved_seconds"]=$time_saved
        USAGE_METRICS["time_saved_hours"]=$(echo "scale=2; $time_saved / 3600" | bc 2>/dev/null || echo "0")
        echo "$(date -u +%Y-%m-%dT%H:%M:%SZ),time_saved_hours,${USAGE_METRICS[time_saved_hours]},business" >> "$METRICS_FILE"
        
        # Productivity metrics
        local productivity_gain=0
        if [[ $successful_searches -gt 0 ]]; then
            productivity_gain=$(echo "scale=2; ($time_saved / ($successful_searches * $avg_manual_search_time)) * 100" | bc 2>/dev/null || echo "0")
        fi
        
        USAGE_METRICS["productivity_gain_percent"]=$productivity_gain
        echo "$(date -u +%Y-%m-%dT%H:%M:%SZ),productivity_gain_percent,$productivity_gain,business" >> "$METRICS_FILE"
        
        # ROI calculation
        local hourly_rate=50  # $50/hour assumption
        local monetary_savings=$(echo "scale=2; (${USAGE_METRICS[time_saved_hours]} * $hourly_rate) - ${COST_METRICS[daily_cost]}" | bc 2>/dev/null || echo "0")
        
        USAGE_METRICS["roi_daily"]=$monetary_savings
        echo "$(date -u +%Y-%m-%dT%H:%M:%SZ),roi_daily,$monetary_savings,business" >> "$METRICS_FILE"
        
        # User acquisition and retention
        local new_users_today=$(psql "$DATABASE_URL" -t -c "
            SELECT COUNT(*)
            FROM users
            WHERE DATE(created_at) = CURRENT_DATE;
        " 2>> "$LOG_FILE" | xargs)
        
        local active_users_today=$(psql "$DATABASE_URL" -t -c "
            SELECT COUNT(DISTINCT user_id)
            FROM ai_searches
            WHERE created_at >= CURRENT_DATE;
        " 2>> "$LOG_FILE" | xargs)
        
        USAGE_METRICS["new_users_today"]=$new_users_today
        USAGE_METRICS["active_users_today"]=$active_users_today
        
        echo "$(date -u +%Y-%m-%dT%H:%M:%SZ),new_users_today,$new_users_today,business" >> "$METRICS_FILE"
        echo "$(date -u +%Y-%m-%dT%H:%M:%SZ),active_users_today,$active_users_today,business" >> "$METRICS_FILE"
        
        log "Business Metrics Summary:"
        log "  Total contacts found: $total_contacts_found"
        log "  Cost per contact: $${cost_per_contact}"
        log "  Time saved: ${USAGE_METRICS[time_saved_hours]} hours"
        log "  Productivity gain: ${productivity_gain}%"
        log "  Daily ROI: $${monetary_savings}"
        log "  New users today: $new_users_today"
        log "  Active users today: $active_users_today"
    fi
    
    success "Business metrics monitoring completed"
}

# Real-time alerting system
check_real_time_alerts() {
    log "Checking real-time alert conditions..."
    
    local alerts_sent=false
    local alert_messages=()
    
    # Performance alerts
    if [[ "${PERFORMANCE_METRICS[memory_usage_percent]}" -gt 85 ]]; then
        alert_messages+=("CRITICAL: Memory usage is ${PERFORMANCE_METRICS[memory_usage_percent]}%")
        alerts_sent=true
    fi
    
    if [[ "${PERFORMANCE_METRICS[cpu_load]}" != "" && $(echo "${PERFORMANCE_METRICS[cpu_load]} > 2.0" | bc -l) -eq 1 ]]; then
        alert_messages+=("WARNING: CPU load is ${PERFORMANCE_METRICS[cpu_load]}")
        alerts_sent=true
    fi
    
    # Usage alerts
    if [[ "${USAGE_METRICS[success_rate]}" != "" && $(echo "${USAGE_METRICS[success_rate]} < 85" | bc -l) -eq 1 ]]; then
        alert_messages+=("CRITICAL: Search success rate is ${USAGE_METRICS[success_rate]}%")
        alerts_sent=true
    fi
    
    if [[ "${USAGE_METRICS[daily_searches]}" -gt 1000 ]]; then
        alert_messages+=("INFO: High search volume - ${USAGE_METRICS[daily_searches]} searches today")
    fi
    
    # Error alerts
    if [[ "${ERROR_METRICS[failed_searches_today]}" -gt 20 ]]; then
        alert_messages+=("CRITICAL: ${ERROR_METRICS[failed_searches_today]} failed searches today")
        alerts_sent=true
    fi
    
    # Cost alerts
    if [[ "${COST_METRICS[daily_cost]}" != "" && $(echo "${COST_METRICS[daily_cost]} > 40" | bc -l) -eq 1 ]]; then
        alert_messages+=("WARNING: Daily cost is $${COST_METRICS[daily_cost]}")
        alerts_sent=true
    fi
    
    # User experience alerts
    if [[ "${USAGE_METRICS[search_abandonment_rate]}" != "" && $(echo "${USAGE_METRICS[search_abandonment_rate]} > 30" | bc -l) -eq 1 ]]; then
        alert_messages+=("WARNING: Search abandonment rate is ${USAGE_METRICS[search_abandonment_rate]}%")
        alerts_sent=true
    fi
    
    # Send alerts if any
    if [[ "$alerts_sent" == true ]]; then
        log "🚨 SENDING REAL-TIME ALERTS:"
        for message in "${alert_messages[@]}"; do
            log "  $message"
        done
        
        send_real_time_alerts "${alert_messages[@]}"
    else
        log "✅ No real-time alerts triggered"
    fi
}

# Send real-time alerts
send_real_time_alerts() {
    local alert_messages=("$@")
    
    # Console notification
    log "📢 REAL-TIME ALERT NOTIFICATION:"
    for message in "${alert_messages[@]}"; do
        error "$message"
    done
    
    # Webhook notification
    if [[ -n "${REAL_TIME_ALERT_WEBHOOK_URL}" ]]; then
        local alert_payload=$(cat << EOF
{
    "alert_type": "real_time",
    "environment": "$ENVIRONMENT",
    "feature": "ai-search",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "alerts": [
$(printf '        "%s"' "${alert_messages[@]}" | paste -sd ',' -)
    ],
    "metrics": {
        "performance": ${PERFORMANCE_METRICS[memory_usage_percent]:-0},
        "success_rate": ${USAGE_METRICS[success_rate]:-0},
        "failed_searches": ${ERROR_METRICS[failed_searches_today]:-0},
        "daily_cost": "${COST_METRICS[daily_cost]:-0}"
    }
}
EOF
)
        
        curl -X POST "$REAL_TIME_ALERT_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "$alert_payload" \
            2>> "$LOG_FILE" || true
    fi
    
    # Email notification for critical alerts
    local critical_alerts=()
    for message in "${alert_messages[@]}"; do
        if [[ "$message" == *"CRITICAL"* ]]; then
            critical_alerts+=("$message")
        fi
    done
    
    if [[ ${#critical_alerts[@]} -gt 0 && -n "${ADMIN_EMAIL}" ]] && command -v mail &> /dev/null; then
        local email_content=$(cat << EOF
CRITICAL ALERTS detected for AI Search feature in ${ENVIRONMENT} environment:

$(printf '%s\n' "${critical_alerts[@]}")

Current Metrics:
- Memory Usage: ${PERFORMANCE_METRICS[memory_usage_percent]:-0}%
- Search Success Rate: ${USAGE_METRICS[success_rate]:-0}%
- Failed Searches: ${ERROR_METRICS[failed_searches_today]:-0}
- Daily Cost: $${COST_METRICS[daily_cost]:-0}

Time: $(date -u +%Y-%m-%dT%H:%M:%SZ)

Please investigate immediately.
EOF
)
        
        mail -s "CRITICAL: Real-time Alerts - AI Search Feature" "$ADMIN_EMAIL" <<< "$email_content" 2>> "$LOG_FILE"
    fi
}

# Enhanced post-launch monitoring with all features
enhanced_post_launch_monitoring() {
    log "Starting enhanced post-launch monitoring..."
    
    init_monitoring
    monitor_performance
    monitor_usage
    monitor_errors
    monitor_costs
    monitor_user_satisfaction
    monitor_user_experience
    monitor_business_metrics
    check_real_time_alerts
    generate_report
    display_summary
    send_report
    
    success "Enhanced post-launch monitoring completed"
}

# Add new monitoring options
case "${1:-full}" in
    "experience")
        init_monitoring
        monitor_user_experience
        generate_report
        display_summary
        ;;
    "business")
        init_monitoring
        monitor_business_metrics
        generate_report
        display_summary
        ;;
    "alerts")
        init_monitoring
        monitor_performance
        monitor_usage
        monitor_errors
        monitor_costs
        check_real_time_alerts
        generate_report
        display_summary
        ;;
    "enhanced")
        enhanced_post_launch_monitoring
        ;;
    *)
        # Keep existing cases
        case "${1:-full}" in
            "full")
                main
                ;;
            "performance")
                init_monitoring
                monitor_performance
                generate_report
                display_summary
                ;;
            "usage")
                init_monitoring
                monitor_usage
                generate_report
                display_summary
                ;;
            "errors")
                init_monitoring
                monitor_errors
                generate_report
                display_summary
                ;;
            "costs")
                init_monitoring
                monitor_costs
                generate_report
                display_summary
                ;;
            *)
                echo "Usage: $0 {full|performance|usage|errors|costs|experience|business|alerts|enhanced}"
                echo "Environment: Set ENVIRONMENT variable (default: production)"
                exit 1
                ;;
        esac
        ;;
esac

# Post-launch success metrics evaluation
evaluate_success_criteria() {
    log "Evaluating post-launch success criteria..."
    
    local success_score=0
    local total_criteria=0
    local evaluation_results=()
    
    # Technical success criteria
    if [[ "${USAGE_METRICS[success_rate]}" != "" && $(echo "${USAGE_METRICS[success_rate]} >= 90" | bc -l) -eq 1 ]]; then
        ((success_score++))
        evaluation_results+=("✅ Search success rate >= 90%: ${USAGE_METRICS[success_rate]}%")
    else
        evaluation_results+=("❌ Search success rate < 90%: ${USAGE_METRICS[success_rate]}%")
    fi
    ((total_criteria++))
    
    if [[ "${PERFORMANCE_METRICS[memory_usage_percent]}" -lt 85 ]]; then
        ((success_score++))
        evaluation_results+=("✅ Memory usage < 85%: ${PERFORMANCE_METRICS[memory_usage_percent]}%")
    else
        evaluation_results+=("❌ Memory usage >= 85%: ${PERFORMANCE_METRICS[memory_usage_percent]}%")
    fi
    ((total_criteria++))
    
    if [[ "${PERFORMANCE_METRICS[slow_queries_count]}" -lt 5 ]]; then
        ((success_score++))
        evaluation_results+=("✅ Slow queries < 5: ${PERFORMANCE_METRICS[slow_queries_count]}")
    else
        evaluation_results+=("❌ Slow queries >= 5: ${PERFORMANCE_METRICS[slow_queries_count]}")
    fi
    ((total_criteria++))
    
    # User adoption criteria
    if [[ "${USAGE_METRICS[daily_searches]}" -gt 50 ]]; then
        ((success_score++))
        evaluation_results+=("✅ Daily searches > 50: ${USAGE_METRICS[daily_searches]}")
    else
        evaluation_results+=("❌ Daily searches <= 50: ${USAGE_METRICS[daily_searches]}")
    fi
    ((total_criteria++))
    
    if [[ "${USAGE_METRICS[repeat_users]}" -gt 10 ]]; then
        ((success_score++))
        evaluation_results+=("✅ Repeat users > 10: ${USAGE_METRICS[repeat_users]}")
    else
        evaluation_results+=("❌ Repeat users <= 10: ${USAGE_METRICS[repeat_users]}")
    fi
    ((total_criteria++))
    
    # Business impact criteria
    if [[ "${USAGE_METRICS[avg_contacts_per_search]}" != "" && $(echo "${USAGE_METRICS[avg_contacts_per_search]} >= 3" | bc -l) -eq 1 ]]; then
        ((success_score++))
        evaluation_results+=("✅ Avg contacts per search >= 3: ${USAGE_METRICS[avg_contacts_per_search]}")
    else
        evaluation_results+=("❌ Avg contacts per search < 3: ${USAGE_METRICS[avg_contacts_per_search]}")
    fi
    ((total_criteria++))
    
    if [[ "${COST_METRICS[daily_cost]}" != "" && $(echo "${COST_METRICS[daily_cost]} <= 100" | bc -l) -eq 1 ]]; then
        ((success_score++))
        evaluation_results+=("✅ Daily cost <= \$100: \$${COST_METRICS[daily_cost]}")
    else
        evaluation_results+=("❌ Daily cost > \$100: \$${COST_METRICS[daily_cost]}")
    fi
    ((total_criteria++))
    
    # Error rate criteria
    if [[ "${ERROR_METRICS[failed_searches_today]}" -lt 10 ]]; then
        ((success_score++))
        evaluation_results+=("✅ Failed searches < 10: ${ERROR_METRICS[failed_searches_today]}")
    else
        evaluation_results+=("❌ Failed searches >= 10: ${ERROR_METRICS[failed_searches_today]}")
    fi
    ((total_criteria++))
    
    # Calculate success percentage
    local success_percentage=0
    if [[ $total_criteria -gt 0 ]]; then
        success_percentage=$((success_score * 100 / total_criteria))
    fi
    
    # Log evaluation results
    log "Success Criteria Evaluation Results:"
    for result in "${evaluation_results[@]}"; do
        log "  $result"
    done
    
    log "Overall Success Score: $success_score/$total_criteria ($success_percentage%)"
    
    # Add to metrics file
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ),success_criteria_score,$success_score,success" >> "$METRICS_FILE"
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ),success_criteria_percentage,$success_percentage,success" >> "$METRICS_FILE"
    
    # Determine success level
    local success_level="FAILED"
    if [[ $success_percentage -ge 80 ]]; then
        success_level="EXCELLENT"
    elif [[ $success_percentage -ge 70 ]]; then
        success_level="GOOD"
    elif [[ $success_percentage -ge 50 ]]; then
        success_level="NEEDS_IMPROVEMENT"
    fi
    
    log "Post-launch Success Level: $success_level"
    
    # Generate success evaluation report
    local success_report_file="/tmp/post-launch-success-evaluation-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).json"
    cat > "$success_report_file" << EOF
{
  "evaluation_timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "$ENVIRONMENT",
  "feature": "ai-search",
  "success_level": "$success_level",
  "success_score": $success_score,
  "total_criteria": $total_criteria,
  "success_percentage": $success_percentage,
  "criteria_results": [
$(printf '    {"criterion": "%s", "passed": %s},\n' "${evaluation_results[@]}" | sed 's/✅ /"/g' | sed 's/❌ /"/g' | sed 's/: /": "/g' | sed 's/$/"/' | sed '$ s/,$//')
  ],
  "recommendations": [
    $(generate_success_recommendations "$success_percentage")
  ]
}
EOF
    
    log "Success evaluation report saved to: $success_report_file"
}

# Generate success-based recommendations
generate_success_recommendations() {
    local success_percentage=$1
    local recommendations=()
    
    if [[ $success_percentage -lt 50 ]]; then
        recommendations+=("\"Immediate attention required: Multiple critical failures detected\"")
        recommendations+=("\"Conduct emergency review of all system components\"")
        recommendations+=("\"Consider temporary feature rollback if issues persist\"")
    elif [[ $success_percentage -lt 70 ]]; then
        recommendations+=("\"Focus on improving underperforming metrics\"")
        recommendations+=("\"Increase monitoring frequency and alert sensitivity\"")
        recommendations+=("\"Schedule urgent performance optimization sprint\"")
    elif [[ $success_percentage -lt 80 ]]; then
        recommendations+=("\"Continue monitoring and gradual optimization\"")
        recommendations+=("\"Address remaining minor issues\"")
        recommendations+=("\"Prepare for feature expansion once stable\"")
    else
        recommendations+=("\"Excellent performance:准备 for feature expansion\"")
        recommendations+=("\"Document success factors and best practices\"")
        recommendations+=("\"Plan next phase of feature development\"")
    fi
    
    # Join recommendations with commas
    local IFS=","
    echo "${recommendations[*]}"
}

# Incident response assessment
assess_incident_response_readiness() {
    log "Assessing incident response readiness..."
    
    local readiness_score=0
    local total_checks=0
    local readiness_checks=()
    
    # Check monitoring coverage
    if [[ "${PERFORMANCE_METRICS[memory_usage_percent]}" != "" ]]; then
        ((readiness_score++))
        readiness_checks+=("✅ Performance monitoring active")
    else
        readiness_checks+=("❌ Performance monitoring missing")
    fi
    ((total_checks++))
    
    if [[ "${ERROR_METRICS[failed_searches_today]}" != "" ]]; then
        ((readiness_score++))
        readiness_checks+=("✅ Error monitoring active")
    else
        readiness_checks+=("❌ Error monitoring missing")
    fi
    ((total_checks++))
    
    if [[ "${COST_METRICS[daily_cost]}" != "" ]]; then
        ((readiness_score++))
        readiness_checks+=("✅ Cost monitoring active")
    else
        readiness_checks+=("❌ Cost monitoring missing")
    fi
    ((total_checks++))
    
    # Check alerting configuration
    if [[ -n "${MONITORING_WEBHOOK_URL}" || -n "${ADMIN_EMAIL}" ]]; then
        ((readiness_score++))
        readiness_checks+=("✅ Alert channels configured")
    else
        readiness_checks+=("❌ No alert channels configured")
    fi
    ((total_checks++))
    
    # Check reporting capabilities
    if [[ -f "$REPORT_FILE" ]]; then
        ((readiness_score++))
        readiness_checks+=("✅ Report generation working")
    else
        readiness_checks+=("❌ Report generation failed")
    fi
    ((total_checks++))
    
    # Calculate readiness percentage
    local readiness_percentage=0
    if [[ $total_checks -gt 0 ]]; then
        readiness_percentage=$((readiness_score * 100 / total_checks))
    fi
    
    # Log readiness results
    log "Incident Response Readiness Assessment:"
    for check in "${readiness_checks[@]}"; do
        log "  $check"
    done
    
    log "Readiness Score: $readiness_score/$total_checks ($readiness_percentage%)"
    
    # Determine readiness level
    local readiness_level="NOT_READY"
    if [[ $readiness_percentage -ge 90 ]]; then
        readiness_level="FULLY_READY"
    elif [[ $readiness_percentage -ge 70 ]]; then
        readiness_level="MOSTLY_READY"
    elif [[ $readiness_percentage -ge 50 ]]; then
        readiness_level="PARTIALLY_READY"
    fi
    
    log "Incident Response Readiness Level: $readiness_level"
    
    # Add to metrics file
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ),incident_readiness_score,$readiness_score,readiness" >> "$METRICS_FILE"
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ),incident_readiness_percentage,$readiness_percentage,readiness" >> "$METRICS_FILE"
}

# Continuous improvement recommendations
generate_improvement_recommendations() {
    log "Generating continuous improvement recommendations..."
    
    local recommendations=()
    
    # Performance-based recommendations
    if [[ "${PERFORMANCE_METRICS[memory_usage_percent]}" -gt 75 ]]; then
        recommendations+=("PERFORMANCE: Implement memory optimization strategies")
        recommendations+=("PERFORMANCE: Consider scaling up memory resources")
    fi
    
    if [[ "${PERFORMANCE_METRICS[slow_queries_count]}" -gt 0 ]]; then
        recommendations+=("DATABASE: Optimize slow queries with proper indexing")
        recommendations+=("DATABASE: Implement query result caching")
    fi
    
    # Usage-based recommendations
    if [[ "${USAGE_METRICS[success_rate]}" != "" && $(echo "${USAGE_METRICS[success_rate]} < 95" | bc -l) -eq 1 ]]; then
        recommendations+=("RELIABILITY: Investigate and fix search failure patterns")
        recommendations+=("RELIABILITY: Implement better error handling and retry logic")
    fi
    
    if [[ "${USAGE_METRICS[daily_searches]}" -lt 100 ]]; then
        recommendations+=("ADOPTION: Enhance user onboarding and feature discovery")
        recommendations+=("ADOPTION: Implement user education and tutorials")
    fi
    
    # Cost-based recommendations
    if [[ "${COST_METRICS[daily_cost]}" != "" && $(echo "${COST_METRICS[daily_cost]} > 50" | bc -l) -eq 1 ]]; then
        recommendations+=("COST: Optimize AI service usage and implement caching")
        recommendations+=("COST: Negotiate better rates with AI service providers")
    fi
    
    # User experience recommendations
    if [[ "${USAGE_METRICS[search_abandonment_rate]}" != "" && $(echo "${USAGE_METRICS[search_abandonment_rate]} > 20" | bc -l) -eq 1 ]]; then
        recommendations+=("UX: Improve search interface and user feedback")
        recommendations+=("UX: Reduce search complexity and improve performance")
    fi
    
    # Add general recommendations if none specific
    if [[ ${#recommendations[@]} -eq 0 ]]; then
        recommendations+=("GENERAL: System performing well, continue current monitoring")
        recommendations+=("GENERAL: Plan for feature expansion and enhancements")
        recommendations+=("GENERAL: Document successful patterns and best practices")
    fi
    
    # Log recommendations
    log "Continuous Improvement Recommendations:"
    for i in "${!recommendations[@]}"; do
        log "  $((i+1)). ${recommendations[i]}"
    done
    
    # Save recommendations to file
    local recommendations_file="/tmp/post-launch-recommendations-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).json"
    cat > "$recommendations_file" << EOF
{
  "generated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "$ENVIRONMENT",
  "feature": "ai-search",
  "recommendations": [
$(printf '    "%s",\n' "${recommendations[@]}" | sed '$ s/,$//')
  ],
  "priority_implementation": [
    "${recommendations[0]:-No high-priority items}",
    "${recommendations[1]:-No high-priority items}",
    "${recommendations[2]:-No high-priority items}"
  ]
}
EOF
    
    log "Recommendations saved to: $recommendations_file"
}

# Comprehensive post-launch assessment
comprehensive_assessment() {
    log "Running comprehensive post-launch assessment..."
    
    # Run all monitoring functions
    init_monitoring
    monitor_performance
    monitor_usage
    monitor_errors
    monitor_costs
    monitor_user_satisfaction
    monitor_user_experience
    monitor_business_metrics
    check_real_time_alerts
    
    # Run assessment functions
    evaluate_success_criteria
    assess_incident_response_readiness
    generate_improvement_recommendations
    
    # Generate final report
    generate_report
    display_summary
    send_report
    
    success "Comprehensive post-launch assessment completed"
}

# Add comprehensive assessment option
case "${1:-full}" in
    "assessment")
        comprehensive_assessment
        ;;
    "success-criteria")
        init_monitoring
        monitor_performance
        monitor_usage
        monitor_errors
        monitor_costs
        monitor_user_satisfaction
        evaluate_success_criteria
        display_summary
        ;;
    "incident-readiness")
        init_monitoring
        monitor_performance
        monitor_usage
        monitor_errors
        monitor_costs
        assess_incident_response_readiness
        display_summary
        ;;
    "improvements")
        init_monitoring
        monitor_performance
        monitor_usage
        monitor_errors
        monitor_costs
        monitor_user_satisfaction
        monitor_user_experience
        monitor_business_metrics
        generate_improvement_recommendations
        display_summary
        ;;
    *)
        # Keep existing cases
        case "${1:-full}" in
            "full")
                main
                ;;
            "performance")
                init_monitoring
                monitor_performance
                generate_report
                display_summary
                ;;
            "usage")
                init_monitoring
                monitor_usage
                generate_report
                display_summary
                ;;
            "errors")
                init_monitoring
                monitor_errors
                generate_report
                display_summary
                ;;
            "costs")
                init_monitoring
                monitor_costs
                generate_report
                display_summary
                ;;
            "experience")
                init_monitoring
                monitor_user_experience
                generate_report
                display_summary
                ;;
            "business")
                init_monitoring
                monitor_business_metrics
                generate_report
                display_summary
                ;;
            "alerts")
                init_monitoring
                monitor_performance
                monitor_usage
                monitor_errors
                monitor_costs
                check_real_time_alerts
                generate_report
                display_summary
                ;;
            "enhanced")
                enhanced_post_launch_monitoring
                ;;
            *)
                echo "Usage: $0 {full|performance|usage|errors|costs|experience|business|alerts|enhanced|assessment|success-criteria|incident-readiness|improvements}"
                echo "Environment: Set ENVIRONMENT variable (default: production)"
                exit 1
                ;;
        esac
        ;;
esac