#!/bin/bash

# Cost Monitoring Script for AI Search Feature
# This script monitors API costs and usage for AI services

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENVIRONMENT="${ENVIRONMENT:-production}"
LOG_FILE="/tmp/cost-monitor-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).log"
REPORT_FILE="/tmp/cost-report-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).json"
ALERT_THRESHOLD_DAILY="${ALERT_THRESHOLD_DAILY:-50}"
ALERT_THRESHOLD_MONTHLY="${ALERT_THRESHOLD_MONTHLY:-1000}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Cost tracking data
declare -A COST_DATA
declare -A USAGE_DATA

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

# Initialize cost monitoring
init_cost_monitoring() {
    log "Initializing cost monitoring for ${ENVIRONMENT} environment..."
    
    cat > "$REPORT_FILE" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "$ENVIRONMENT",
  "services": {
EOF
    
    # Initialize cost data
    COST_DATA["openai_daily"]=0
    COST_DATA["openai_monthly"]=0
    COST_DATA["anthropic_daily"]=0
    COST_DATA["anthropic_monthly"]=0
    COST_DATA["exa_daily"]=0
    COST_DATA["exa_monthly"]=0
    COST_DATA["firecrawl_daily"]=0
    COST_DATA["firecrawl_monthly"]=0
    COST_DATA["total_daily"]=0
    COST_DATA["total_monthly"]=0
    
    # Initialize usage data
    USAGE_DATA["openai_requests_daily"]=0
    USAGE_DATA["openai_tokens_daily"]=0
    USAGE_DATA["anthropic_requests_daily"]=0
    USAGE_DATA["anthropic_tokens_daily"]=0
    USAGE_DATA["exa_searches_daily"]=0
    USAGE_DATA["firecrawl_crawls_daily"]=0
}

# Query OpenAI costs and usage
query_openai_costs() {
    log "Querying OpenAI costs and usage..."
    
    if [[ -z "$OPENAI_API_KEY" ]]; then
        warning "OpenAI API key not configured"
        COST_DATA["openai_daily"]="unknown"
        COST_DATA["openai_monthly"]="unknown"
        return
    fi
    
    # Query OpenAI usage API
    if curl -f -s -m 10 \
        -H "Authorization: Bearer $OPENAI_API_KEY" \
        "https://api.openai.com/v1/usage" > /tmp/openai_usage.json 2>> "$LOG_FILE"; then
        
        # Parse usage data
        if command -v jq &> /dev/null; then
            # Get daily usage (current day)
            daily_usage=$(jq -r '.data[] | select(.timestamp >= (now - 86400)) | .n_generated_tokens_total // 0' /tmp/openai_usage.json | awk '{s+=$1} END {print s}')
            monthly_usage=$(jq -r '.data[] | select(.timestamp >= (now - 2592000)) | .n_generated_tokens_total // 0' /tmp/openai_usage.json | awk '{s+=$1} END {print s}')
            
            # Calculate costs (assuming $0.002 per 1K tokens for GPT-3.5-turbo)
            COST_DATA["openai_daily"]=$(echo "scale=4; $daily_usage * 0.002 / 1000" | bc 2>/dev/null || echo "0")
            COST_DATA["openai_monthly"]=$(echo "scale=4; $monthly_usage * 0.002 / 1000" | bc 2>/dev/null || echo "0")
            
            USAGE_DATA["openai_tokens_daily"]=$daily_usage
            
            log "OpenAI daily usage: $daily_usage tokens, cost: $${COST_DATA[openai_daily]}"
            log "OpenAI monthly usage: $monthly_usage tokens, cost: $${COST_DATA[openai_monthly]}"
        else
            warning "jq not available, cannot parse OpenAI usage data"
            COST_DATA["openai_daily"]="unknown"
            COST_DATA["openai_monthly"]="unknown"
        fi
    else
        warning "Failed to query OpenAI usage API"
        COST_DATA["openai_daily"]="unknown"
        COST_DATA["openai_monthly"]="unknown"
    fi
    
    # Clean up
    rm -f /tmp/openai_usage.json
}

# Query Anthropic costs and usage
query_anthropic_costs() {
    log "Querying Anthropic costs and usage..."
    
    if [[ -z "$ANTHROPIC_API_KEY" ]]; then
        warning "Anthropic API key not configured"
        COST_DATA["anthropic_daily"]="unknown"
        COST_DATA["anthropic_monthly"]="unknown"
        return
    fi
    
    # Anthropic doesn't have a public usage API, so we'll estimate based on our logs
    # Query our database for AI search usage
    if command -v psql &> /dev/null && [[ -n "$DATABASE_URL" ]]; then
        # Get daily token usage from our logs
        daily_tokens=$(psql "$DATABASE_URL" -t -c "
            SELECT COALESCE(SUM((metadata->>'tokens_used')::int), 0)
            FROM ai_performance_logs
            WHERE operation = 'AI_ENHANCEMENT'
            AND created_at >= CURRENT_DATE;
        " 2>> "$LOG_FILE" | xargs)
        
        monthly_tokens=$(psql "$DATABASE_URL" -t -c "
            SELECT COALESCE(SUM((metadata->>'tokens_used')::int), 0)
            FROM ai_performance_logs
            WHERE operation = 'AI_ENHANCEMENT'
            AND created_at >= date_trunc('month', CURRENT_DATE);
        " 2>> "$LOG_FILE" | xargs)
        
        # Calculate costs (assuming $0.003 per 1K tokens for Claude)
        COST_DATA["anthropic_daily"]=$(echo "scale=4; $daily_tokens * 0.003 / 1000" | bc 2>/dev/null || echo "0")
        COST_DATA["anthropic_monthly"]=$(echo "scale=4; $monthly_tokens * 0.003 / 1000" | bc 2>/dev/null || echo "0")
        
        USAGE_DATA["anthropic_tokens_daily"]=$daily_tokens
        
        log "Anthropic daily usage: $daily_tokens tokens, cost: $${COST_DATA[anthropic_daily]}"
        log "Anthropic monthly usage: $monthly_tokens tokens, cost: $${COST_DATA[anthropic_monthly]}"
    else
        warning "Cannot query database for Anthropic usage"
        COST_DATA["anthropic_daily"]="unknown"
        COST_DATA["anthropic_monthly"]="unknown"
    fi
}

# Query Exa costs and usage
query_exa_costs() {
    log "Querying Exa costs and usage..."
    
    if [[ -z "$EXA_API_KEY" ]]; then
        warning "Exa API key not configured"
        COST_DATA["exa_daily"]="unknown"
        COST_DATA["exa_monthly"]="unknown"
        return
    fi
    
    # Query our database for Exa usage
    if command -v psql &> /dev/null && [[ -n "$DATABASE_URL" ]]; then
        # Get daily search count
        daily_searches=$(psql "$DATABASE_URL" -t -c "
            SELECT COUNT(*)
            FROM ai_search_sources
            WHERE sourceType = 'exa_search'
            AND created_at >= CURRENT_DATE;
        " 2>> "$LOG_FILE" | xargs)
        
        monthly_searches=$(psql "$DATABASE_URL" -t -c "
            SELECT COUNT(*)
            FROM ai_search_sources
            WHERE sourceType = 'exa_search'
            AND created_at >= date_trunc('month', CURRENT_DATE);
        " 2>> "$LOG_FILE" | xargs)
        
        # Calculate costs (assuming $0.01 per search)
        COST_DATA["exa_daily"]=$(echo "scale=4; $daily_searches * 0.01" | bc 2>/dev/null || echo "0")
        COST_DATA["exa_monthly"]=$(echo "scale=4; $monthly_searches * 0.01" | bc 2>/dev/null || echo "0")
        
        USAGE_DATA["exa_searches_daily"]=$daily_searches
        
        log "Exa daily usage: $daily_searches searches, cost: $${COST_DATA[exa_daily]}"
        log "Exa monthly usage: $monthly_searches searches, cost: $${COST_DATA[exa_monthly]}"
    else
        warning "Cannot query database for Exa usage"
        COST_DATA["exa_daily"]="unknown"
        COST_DATA["exa_monthly"]="unknown"
    fi
}

# Query Firecrawl costs and usage
query_firecrawl_costs() {
    log "Querying Firecrawl costs and usage..."
    
    if [[ -z "$FIRECRAWL_API_KEY" ]]; then
        warning "Firecrawl API key not configured"
        COST_DATA["firecrawl_daily"]="unknown"
        COST_DATA["firecrawl_monthly"]="unknown"
        return
    fi
    
    # Query our database for Firecrawl usage
    if command -v psql &> /dev/null && [[ -n "$DATABASE_URL" ]]; then
        # Get daily crawl count
        daily_crawls=$(psql "$DATABASE_URL" -t -c "
            SELECT COUNT(*)
            FROM ai_search_sources
            WHERE sourceType = 'firecrawl'
            AND created_at >= CURRENT_DATE;
        " 2>> "$LOG_FILE" | xargs)
        
        monthly_crawls=$(psql "$DATABASE_URL" -t -c "
            SELECT COUNT(*)
            FROM ai_search_sources
            WHERE sourceType = 'firecrawl'
            AND created_at >= date_trunc('month', CURRENT_DATE);
        " 2>> "$LOG_FILE" | xargs)
        
        # Calculate costs (assuming $0.001 per page crawl)
        COST_DATA["firecrawl_daily"]=$(echo "scale=4; $daily_crawls * 0.001" | bc 2>/dev/null || echo "0")
        COST_DATA["firecrawl_monthly"]=$(echo "scale=4; $monthly_crawls * 0.001" | bc 2>/dev/null || echo "0")
        
        USAGE_DATA["firecrawl_crawls_daily"]=$daily_crawls
        
        log "Firecrawl daily usage: $daily_crawls crawls, cost: $${COST_DATA[firecrawl_daily]}"
        log "Firecrawl monthly usage: $monthly_crawls crawls, cost: $${COST_DATA[firecrawl_monthly]}"
    else
        warning "Cannot query database for Firecrawl usage"
        COST_DATA["firecrawl_daily"]="unknown"
        COST_DATA["firecrawl_monthly"]="unknown"
    fi
}

# Calculate total costs
calculate_total_costs() {
    log "Calculating total costs..."
    
    # Calculate daily total
    local daily_total=0
    for service in "openai_daily" "anthropic_daily" "exa_daily" "firecrawl_daily"; do
        local cost=${COST_DATA[$service]}
        if [[ "$cost" != "unknown" && "$cost" =~ ^[0-9]+\.?[0-9]*$ ]]; then
            daily_total=$(echo "scale=4; $daily_total + $cost" | bc 2>/dev/null || echo "$daily_total")
        fi
    done
    COST_DATA["total_daily"]=$daily_total
    
    # Calculate monthly total
    local monthly_total=0
    for service in "openai_monthly" "anthropic_monthly" "exa_monthly" "firecrawl_monthly"; do
        local cost=${COST_DATA[$service]}
        if [[ "$cost" != "unknown" && "$cost" =~ ^[0-9]+\.?[0-9]*$ ]]; then
            monthly_total=$(echo "scale=4; $monthly_total + $cost" | bc 2>/dev/null || echo "$monthly_total")
        fi
    done
    COST_DATA["total_monthly"]=$monthly_total
    
    log "Total daily cost: $${COST_DATA[total_daily]}"
    log "Total monthly cost: $${COST_DATA[total_monthly]}"
}

# Check cost thresholds
check_cost_thresholds() {
    log "Checking cost thresholds..."
    
    local alerts_sent=false
    
    # Check daily threshold
    if [[ "${COST_DATA[total_daily]}" != "unknown" ]]; then
        if (( $(echo "${COST_DATA[total_daily]} > $ALERT_THRESHOLD_DAILY" | bc -l) )); then
            error "Daily cost threshold exceeded: $${COST_DATA[total_daily]} > $${ALERT_THRESHOLD_DAILY}"
            alerts_sent=true
        elif (( $(echo "${COST_DATA[total_daily]} > $(echo "$ALERT_THRESHOLD_DAILY * 0.8" | bc)" | bc -l) )); then
            warning "Daily cost approaching threshold: $${COST_DATA[total_daily]} (80% of $${ALERT_THRESHOLD_DAILY})"
        fi
    fi
    
    # Check monthly threshold
    if [[ "${COST_DATA[total_monthly]}" != "unknown" ]]; then
        if (( $(echo "${COST_DATA[total_monthly]} > $ALERT_THRESHOLD_MONTHLY" | bc -l) )); then
            error "Monthly cost threshold exceeded: $${COST_DATA[total_monthly]} > $${ALERT_THRESHOLD_MONTHLY}"
            alerts_sent=true
        elif (( $(echo "${COST_DATA[total_monthly]} > $(echo "$ALERT_THRESHOLD_MONTHLY * 0.8" | bc)" | bc -l) )); then
            warning "Monthly cost approaching threshold: $${COST_DATA[total_monthly]} (80% of $${ALERT_THRESHOLD_MONTHLY})"
        fi
    fi
    
    # Send alerts if thresholds exceeded
    if [[ "$alerts_sent" == true ]]; then
        send_cost_alert
    fi
}

# Generate cost report
generate_cost_report() {
    log "Generating cost report..."
    
    # Add OpenAI data to report
    cat >> "$REPORT_FILE" << EOF
    "openai": {
      "daily_cost": "${COST_DATA[openai_daily]}",
      "monthly_cost": "${COST_DATA[openai_monthly]}",
      "daily_tokens": "${USAGE_DATA[openai_tokens_daily]}"
    },
EOF
    
    # Add Anthropic data to report
    cat >> "$REPORT_FILE" << EOF
    "anthropic": {
      "daily_cost": "${COST_DATA[anthropic_daily]}",
      "monthly_cost": "${COST_DATA[anthropic_monthly]}",
      "daily_tokens": "${USAGE_DATA[anthropic_tokens_daily]}"
    },
EOF
    
    # Add Exa data to report
    cat >> "$REPORT_FILE" << EOF
    "exa": {
      "daily_cost": "${COST_DATA[exa_daily]}",
      "monthly_cost": "${COST_DATA[exa_monthly]}",
      "daily_searches": "${USAGE_DATA[exa_searches_daily]}"
    },
EOF
    
    # Add Firecrawl data to report
    cat >> "$REPORT_FILE" << EOF
    "firecrawl": {
      "daily_cost": "${COST_DATA[firecrawl_daily]}",
      "monthly_cost": "${COST_DATA[firecrawl_monthly]}",
      "daily_crawls": "${USAGE_DATA[firecrawl_crawls_daily]}"
    },
EOF
    
    # Add totals and close the JSON structure
    cat >> "$REPORT_FILE" << EOF
    "totals": {
      "daily_cost": "${COST_DATA[total_daily]}",
      "monthly_cost": "${COST_DATA[total_monthly]}"
    }
  },
  "thresholds": {
    "daily": "$ALERT_THRESHOLD_DAILY",
    "monthly": "$ALERT_THRESHOLD_MONTHLY"
  }
}
EOF
    
    success "Cost report generated: $REPORT_FILE"
}

# Display cost summary
display_cost_summary() {
    log "Cost Monitoring Summary"
    log "======================="
    
    echo "Daily Costs:" | tee -a "$LOG_FILE"
    echo "  OpenAI: $${COST_DATA[openai_daily]}" | tee -a "$LOG_FILE"
    echo "  Anthropic: $${COST_DATA[anthropic_daily]}" | tee -a "$LOG_FILE"
    echo "  Exa: $${COST_DATA[exa_daily]}" | tee -a "$LOG_FILE"
    echo "  Firecrawl: $${COST_DATA[firecrawl_daily]}" | tee -a "$LOG_FILE"
    echo "  Total: $${COST_DATA[total_daily]}" | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"
    
    echo "Monthly Costs:" | tee -a "$LOG_FILE"
    echo "  OpenAI: $${COST_DATA[openai_monthly]}" | tee -a "$LOG_FILE"
    echo "  Anthropic: $${COST_DATA[anthropic_monthly]}" | tee -a "$LOG_FILE"
    echo "  Exa: $${COST_DATA[exa_monthly]}" | tee -a "$LOG_FILE"
    echo "  Firecrawl: $${COST_DATA[firecrawl_monthly]}" | tee -a "$LOG_FILE"
    echo "  Total: $${COST_DATA[total_monthly]}" | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"
    
    echo "Alert Thresholds:" | tee -a "$LOG_FILE"
    echo "  Daily: $${ALERT_THRESHOLD_DAILY}" | tee -a "$LOG_FILE"
    echo "  Monthly: $${ALERT_THRESHOLD_MONTHLY}" | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"
    
    echo "Usage Summary:" | tee -a "$LOG_FILE"
    echo "  OpenAI tokens today: ${USAGE_DATA[openai_tokens_daily]}" | tee -a "$LOG_FILE"
    echo "  Anthropic tokens today: ${USAGE_DATA[anthropic_tokens_daily]}" | tee -a "$LOG_FILE"
    echo "  Exa searches today: ${USAGE_DATA[exa_searches_daily]}" | tee -a "$LOG_FILE"
    echo "  Firecrawl crawls today: ${USAGE_DATA[firecrawl_crawls_daily]}" | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"
    
    echo "Detailed report available at: $REPORT_FILE" | tee -a "$LOG_FILE"
    echo "Full log available at: $LOG_FILE" | tee -a "$LOG_FILE"
}

# Send cost alert
send_cost_alert() {
    log "Sending cost alert notification..."
    
    # Example webhook notification (customize as needed)
    if [[ -n "${COST_ALERT_WEBHOOK_URL}" ]]; then
        curl -X POST "$COST_ALERT_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{
                \"alert_type\": \"cost_threshold_exceeded\",
                \"environment\": \"$ENVIRONMENT\",
                \"daily_cost\": \"${COST_DATA[total_daily]}\",
                \"monthly_cost\": \"${COST_DATA[total_monthly]}\",
                \"daily_threshold\": \"$ALERT_THRESHOLD_DAILY\",
                \"monthly_threshold\": \"$ALERT_THRESHOLD_MONTHLY\",
                \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
                \"report\": \"$REPORT_FILE\"
            }" \
            2>> "$LOG_FILE" || true
    fi
    
    # Email notification (customize as needed)
    if command -v mail &> /dev/null && [[ -n "${ADMIN_EMAIL}" ]]; then
        mail -s "Cost Alert: AI Search Feature - ${ENVIRONMENT}" "$ADMIN_EMAIL" << EOF 2>> "$LOG_FILE"
Cost threshold exceeded for AI Search feature in ${ENVIRONMENT} environment:

Daily Cost: $${COST_DATA[total_daily]} (Threshold: $${ALERT_THRESHOLD_DAILY})
Monthly Cost: $${COST_DATA[total_monthly]} (Threshold: $${ALERT_THRESHOLD_MONTHLY})

Detailed report available at: $REPORT_FILE
EOF
    fi
}

# Main cost monitoring flow
main() {
    log "Starting cost monitoring for ${ENVIRONMENT} environment..."
    
    init_cost_monitoring
    query_openai_costs
    query_anthropic_costs
    query_exa_costs
    query_firecrawl_costs
    calculate_total_costs
    check_cost_thresholds
    generate_cost_report
    display_cost_summary
    
    success "Cost monitoring completed"
}

# Parse command line arguments
case "${1:-full}" in
    "full")
        main
        ;;
    "openai")
        init_cost_monitoring
        query_openai_costs
        generate_cost_report
        display_cost_summary
        ;;
    "anthropic")
        init_cost_monitoring
        query_anthropic_costs
        generate_cost_report
        display_cost_summary
        ;;
    "exa")
        init_cost_monitoring
        query_exa_costs
        generate_cost_report
        display_cost_summary
        ;;
    "firecrawl")
        init_cost_monitoring
        query_firecrawl_costs
        generate_cost_report
        display_cost_summary
        ;;
    *)
        echo "Usage: $0 {full|openai|anthropic|exa|firecrawl}"
        echo "Environment: Set ENVIRONMENT variable (default: production)"
        echo "Alert thresholds: Set ALERT_THRESHOLD_DAILY and ALERT_THRESHOLD_MONTHLY"
        exit 1
        ;;
esac

# Enhanced cost monitoring with trend analysis
monitor_cost_trends() {
    log "Analyzing cost trends..."
    
    if command -v psql &> /dev/null && [[ -n "$DATABASE_URL" ]]; then
        # Get hourly cost trends for the last 24 hours
        local hourly_costs=$(psql "$DATABASE_URL" -t -c "
            SELECT
                DATE_TRUNC('hour', created_at) as hour,
                SUM(
                    CASE
                        WHEN operation = 'AI_ENHANCEMENT' THEN (metadata->>'tokens_used')::int * 0.003 / 1000
                        WHEN sourceType = 'exa_search' THEN 0.01
                        WHEN sourceType = 'firecrawl' THEN 0.001
                        ELSE 0
                    END
                ) as hourly_cost
            FROM (
                SELECT created_at, operation, metadata FROM ai_performance_logs
                WHERE created_at >= NOW() - INTERVAL '24 hours'
                UNION ALL
                SELECT created_at, 'search', sourceType FROM ai_search_sources
                WHERE created_at >= NOW() - INTERVAL '24 hours'
            ) combined
            GROUP BY hour
            ORDER BY hour;
        " 2>> "$LOG_FILE")
        
        if [[ -n "$hourly_costs" ]]; then
            log "Hourly cost trends for last 24 hours:"
            echo "$hourly_costs" | while IFS= read -r line; do
                if [[ -n "$line" ]]; then
                    log "  $line"
                fi
            done
        fi
        
        # Get daily cost trends for the last 30 days
        local daily_costs=$(psql "$DATABASE_URL" -t -c "
            SELECT
                DATE(created_at) as day,
                SUM(
                    CASE
                        WHEN operation = 'AI_ENHANCEMENT' THEN (metadata->>'tokens_used')::int * 0.003 / 1000
                        WHEN sourceType = 'exa_search' THEN 0.01
                        WHEN sourceType = 'firecrawl' THEN 0.001
                        ELSE 0
                    END
                ) as daily_cost
            FROM (
                SELECT created_at, operation, metadata FROM ai_performance_logs
                WHERE created_at >= NOW() - INTERVAL '30 days'
                UNION ALL
                SELECT created_at, 'search', sourceType FROM ai_search_sources
                WHERE created_at >= NOW() - INTERVAL '30 days'
            ) combined
            GROUP BY day
            ORDER BY day;
        " 2>> "$LOG_FILE")
        
        if [[ -n "$daily_costs" ]]; then
            log "Daily cost trends for last 30 days (last 10 days):"
            echo "$daily_costs" | tail -10 | while IFS= read -r line; do
                if [[ -n "$line" ]]; then
                    log "  $line"
                fi
            done
        fi
        
        # Calculate cost growth rate
        local last_week_cost=$(psql "$DATABASE_URL" -t -c "
            SELECT SUM(
                CASE
                    WHEN operation = 'AI_ENHANCEMENT' THEN (metadata->>'tokens_used')::int * 0.003 / 1000
                    WHEN sourceType = 'exa_search' THEN 0.01
                    WHEN sourceType = 'firecrawl' THEN 0.001
                    ELSE 0
                END
            )
            FROM (
                SELECT created_at, operation, metadata FROM ai_performance_logs
                WHERE created_at >= NOW() - INTERVAL '7 days'
                UNION ALL
                SELECT created_at, 'search', sourceType FROM ai_search_sources
                WHERE created_at >= NOW() - INTERVAL '7 days'
            ) combined;
        " 2>> "$LOG_FILE" | xargs)
        
        local previous_week_cost=$(psql "$DATABASE_URL" -t -c "
            SELECT SUM(
                CASE
                    WHEN operation = 'AI_ENHANCEMENT' THEN (metadata->>'tokens_used')::int * 0.003 / 1000
                    WHEN sourceType = 'exa_search' THEN 0.01
                    WHEN sourceType = 'firecrawl' THEN 0.001
                    ELSE 0
                END
            )
            FROM (
                SELECT created_at, operation, metadata FROM ai_performance_logs
                WHERE created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days'
                UNION ALL
                SELECT created_at, 'search', sourceType FROM ai_search_sources
                WHERE created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days'
            ) combined;
        " 2>> "$LOG_FILE" | xargs)
        
        if [[ -n "$last_week_cost" && -n "$previous_week_cost" && "$previous_week_cost" != "0" ]]; then
            local growth_rate=$(echo "scale=2; (($last_week_cost - $previous_week_cost) / $previous_week_cost) * 100" | bc 2>/dev/null || echo "0")
            COST_DATA["weekly_growth_rate"]=$growth_rate
            
            if (( $(echo "$growth_rate > 20" | bc -l) )); then
                warning "Weekly cost growth rate is high: ${growth_rate}%"
            elif (( $(echo "$growth_rate < -20" | bc -l) )); then
                success "Weekly cost growth rate is negative: ${growth_rate}% (cost reduction)"
            else
                log "Weekly cost growth rate is stable: ${growth_rate}%"
            fi
        fi
    fi
}

# Cost optimization recommendations
generate_cost_optimization_recommendations() {
    log "Generating cost optimization recommendations..."
    
    local recommendations=()
    
    # Analyze cost by provider
    if [[ -n "${COST_DATA[openai_daily]}" && $(echo "${COST_DATA[openai_daily]} > 20" | bc -l) -eq 1 ]]; then
        recommendations+=("Consider optimizing OpenAI prompts to reduce token usage")
    fi
    
    if [[ -n "${COST_DATA[anthropic_daily]}" && $(echo "${COST_DATA[anthropic_daily]} > 15" | bc -l) -eq 1 ]]; then
        recommendations+=("Consider using Claude Haiku for less complex queries to reduce Anthropic costs")
    fi
    
    if [[ -n "${COST_DATA[exa_daily]}" && $(echo "${COST_DATA[exa_daily]} > 5" | bc -l) -eq 1 ]]; then
        recommendations+=("Implement result caching for Exa searches to reduce duplicate requests")
    fi
    
    if [[ -n "${COST_DATA[firecrawl_daily]}" && $(echo "${COST_DATA[firecrawl_daily]} > 2" | bc -l) -eq 1 ]]; then
        recommendations+=("Optimize Firecrawl usage by implementing selective crawling")
    fi
    
    # Analyze usage patterns
    if [[ -n "${USAGE_DATA[openai_tokens_daily]}" && "${USAGE_DATA[openai_tokens_daily]}" -gt 100000 ]]; then
        recommendations+=("High OpenAI token usage detected - consider implementing token counting and limits")
    fi
    
    if [[ -n "${COST_DATA[total_daily]}" && $(echo "${COST_DATA[total_daily]} > 30" | bc -l) -eq 1 ]]; then
        recommendations+=("Daily cost is high - consider implementing usage quotas or rate limiting")
    fi
    
    # Check for potential cost savings
    if command -v psql &> /dev/null && [[ -n "$DATABASE_URL" ]]; then
        local duplicate_searches=$(psql "$DATABASE_URL" -t -c "
            SELECT COUNT(*) FROM (
                SELECT query, COUNT(*) as search_count
                FROM ai_searches
                WHERE created_at >= CURRENT_DATE
                GROUP BY query
                HAVING search_count > 1
            ) duplicate_queries;
        " 2>> "$LOG_FILE" | xargs)
        
        if [[ "$duplicate_searches" -gt 10 ]]; then
            recommendations+=("Found $duplicate_searches duplicate searches today - implement query caching")
        fi
    fi
    
    if [[ ${#recommendations[@]} -eq 0 ]]; then
        recommendations+=("Cost usage is optimized - continue current patterns")
    fi
    
    log "Cost Optimization Recommendations:"
    for recommendation in "${recommendations[@]}"; do
        log "  • $recommendation"
    done
    
    # Add recommendations to report
    echo "  \"recommendations\": [" >> "$REPORT_FILE"
    local first=true
    for recommendation in "${recommendations[@]}"; do
        if [[ "$first" == true ]]; then
            first=false
        else
            echo "," >> "$REPORT_FILE"
        fi
        echo "    \"$recommendation\"" >> "$REPORT_FILE"
    done
    echo "  ]" >> "$REPORT_FILE"
}

# Cost forecasting
forecast_costs() {
    log "Forecasting future costs..."
    
    if command -v psql &> /dev/null && [[ -n "$DATABASE_URL" ]]; then
        # Get average daily cost for last 7 days
        local avg_daily_cost=$(psql "$DATABASE_URL" -t -c "
            SELECT AVG(daily_cost) FROM (
                SELECT
                    DATE(created_at) as day,
                    SUM(
                        CASE
                            WHEN operation = 'AI_ENHANCEMENT' THEN (metadata->>'tokens_used')::int * 0.003 / 1000
                            WHEN sourceType = 'exa_search' THEN 0.01
                            WHEN sourceType = 'firecrawl' THEN 0.001
                            ELSE 0
                        END
                    ) as daily_cost
                FROM (
                    SELECT created_at, operation, metadata FROM ai_performance_logs
                    WHERE created_at >= NOW() - INTERVAL '7 days'
                    UNION ALL
                    SELECT created_at, 'search', sourceType FROM ai_search_sources
                    WHERE created_at >= NOW() - INTERVAL '7 days'
                ) combined
                GROUP BY day
            ) daily_costs;
        " 2>> "$LOG_FILE" | xargs)
        
        if [[ -n "$avg_daily_cost" ]]; then
            # Calculate forecasts
            local weekly_forecast=$(echo "scale=2; $avg_daily_cost * 7" | bc 2>/dev/null || echo "0")
            local monthly_forecast=$(echo "scale=2; $avg_daily_cost * 30" | bc 2>/dev/null || echo "0")
            
            COST_DATA["weekly_forecast"]=$weekly_forecast
            COST_DATA["monthly_forecast"]=$monthly_forecast
            
            log "Cost Forecasts (based on last 7 days):"
            log "  Weekly forecast: $${weekly_forecast}"
            log "  Monthly forecast: $${monthly_forecast}"
            
            # Check forecasts against thresholds
            local monthly_threshold=${ALERT_THRESHOLD_MONTHLY:-1000}
            if (( $(echo "$monthly_forecast > $monthly_threshold" | bc -l) )); then
                warning "Monthly cost forecast ($${monthly_forecast}) may exceed threshold ($${monthly_threshold})"
            fi
        fi
    fi
}

# Enhanced cost monitoring with all features
enhanced_cost_monitoring() {
    log "Starting enhanced cost monitoring..."
    
    init_cost_monitoring
    query_openai_costs
    query_anthropic_costs
    query_exa_costs
    query_firecrawl_costs
    calculate_total_costs
    monitor_cost_trends
    forecast_costs
    check_cost_thresholds
    generate_cost_optimization_recommendations
    generate_cost_report
    display_cost_summary
    
    success "Enhanced cost monitoring completed"
}

# Add new monitoring options
case "${1:-full}" in
    "trends")
        init_cost_monitoring
        monitor_cost_trends
        generate_cost_report
        display_cost_summary
        ;;
    "forecast")
        init_cost_monitoring
        forecast_costs
        generate_cost_report
        display_cost_summary
        ;;
    "optimize")
        init_cost_monitoring
        query_openai_costs
        query_anthropic_costs
        query_exa_costs
        query_firecrawl_costs
        calculate_total_costs
        generate_cost_optimization_recommendations
        generate_cost_report
        display_cost_summary
        ;;
    "enhanced")
        enhanced_cost_monitoring
        ;;
    *)
        # Keep existing cases
        case "${1:-full}" in
            "full")
                main
                ;;
            "openai")
                init_cost_monitoring
                query_openai_costs
                generate_cost_report
                display_cost_summary
                ;;
            "anthropic")
                init_cost_monitoring
                query_anthropic_costs
                generate_cost_report
                display_cost_summary
                ;;
            "exa")
                init_cost_monitoring
                query_exa_costs
                generate_cost_report
                display_cost_summary
                ;;
            "firecrawl")
                init_cost_monitoring
                query_firecrawl_costs
                generate_cost_report
                display_cost_summary
                ;;
            *)
                echo "Usage: $0 {full|openai|anthropic|exa|firecrawl|trends|forecast|optimize|enhanced}"
                echo "Environment: Set ENVIRONMENT variable (default: production)"
                echo "Alert thresholds: Set ALERT_THRESHOLD_DAILY and ALERT_THRESHOLD_MONTHLY"
                exit 1
                ;;
        esac
        ;;
esac

# Enhanced cost monitoring with real-time alerts
setup_realtime_monitoring() {
    log "Setting up real-time cost monitoring..."
    
    # Create monitoring configuration
    cat > /tmp/cost-monitor-config.json << EOF
{
  "monitoring": {
    "interval_seconds": 300,
    "alert_webhook_url": "${COST_ALERT_WEBHOOK_URL:-}",
    "admin_email": "${ADMIN_EMAIL:-}",
    "slack_channel": "${SLACK_CHANNEL:-#cost-alerts}"
  },
  "thresholds": {
    "daily": ${ALERT_THRESHOLD_DAILY:-50},
    "monthly": ${ALERT_THRESHOLD_MONTHLY:-1000},
    "hourly": ${ALERT_THRESHOLD_HOURLY:-25},
    "per_user_daily": ${ALERT_THRESHOLD_USER_DAILY:-10},
    "cost_spike_multiplier": ${COST_SPIKE_MULTIPLIER:-3}
  },
  "services": {
    "openai": {
      "enabled": ${OPENAI_ENABLED:-true},
      "cost_per_token": ${OPENAI_COST_PER_TOKEN:-0.002}
    },
    "anthropic": {
      "enabled": ${ANTHROPIC_ENABLED:-true},
      "cost_per_token": ${ANTHROPIC_COST_PER_TOKEN:-0.003}
    },
    "exa": {
      "enabled": ${EXA_ENABLED:-true},
      "cost_per_search": ${EXA_COST_PER_SEARCH:-0.01}
    },
    "firecrawl": {
      "enabled": ${FIRECRAWL_ENABLED:-true},
      "cost_per_crawl": ${FIRECRAWL_COST_PER_CRAWL:-0.001}
    }
  }
}
EOF
    
    log "Real-time monitoring configuration created"
}

# Check for cost anomalies
detect_cost_anomalies() {
    log "Detecting cost anomalies..."
    
    if command -v psql &> /dev/null && [[ -n "$DATABASE_URL" ]]; then
        # Check for unusual cost spikes in the last hour
        local current_hour_cost=$(psql "$DATABASE_URL" -t -c "
            SELECT COALESCE(SUM(
                CASE
                    WHEN operation = 'AI_ENHANCEMENT' THEN (metadata->>'tokens_used')::int * 0.003 / 1000
                    WHEN sourceType = 'exa_search' THEN 0.01
                    WHEN sourceType = 'firecrawl' THEN 0.001
                    ELSE 0
                END
            ), 0)
            FROM (
                SELECT created_at, operation, metadata FROM ai_performance_logs
                WHERE created_at >= NOW() - INTERVAL '1 hour'
                UNION ALL
                SELECT created_at, 'search', sourceType FROM ai_search_sources
                WHERE created_at >= NOW() - INTERVAL '1 hour'
            ) combined;
        " 2>> "$LOG_FILE" | xargs)
        
        # Get average hourly cost for the last 24 hours (excluding current hour)
        local avg_hourly_cost=$(psql "$DATABASE_URL" -t -c "
            SELECT COALESCE(AVG(hourly_cost), 0) FROM (
                SELECT
                    DATE_TRUNC('hour', created_at) as hour,
                    SUM(
                        CASE
                            WHEN operation = 'AI_ENHANCEMENT' THEN (metadata->>'tokens_used')::int * 0.003 / 1000
                            WHEN sourceType = 'exa_search' THEN 0.01
                            WHEN sourceType = 'firecrawl' THEN 0.001
                            ELSE 0
                        END
                    ) as hourly_cost
                FROM (
                    SELECT created_at, operation, metadata FROM ai_performance_logs
                    WHERE created_at >= NOW() - INTERVAL '25 hours' AND created_at < NOW() - INTERVAL '1 hour'
                    UNION ALL
                    SELECT created_at, 'search', sourceType FROM ai_search_sources
                    WHERE created_at >= NOW() - INTERVAL '25 hours' AND created_at < NOW() - INTERVAL '1 hour'
                ) combined
                GROUP BY hour
            ) hourly_costs;
        " 2>> "$LOG_FILE" | xargs)
        
        # Check for anomaly (current hour cost > 3x average)
        local spike_multiplier=${COST_SPIKE_MULTIPLIER:-3}
        if (( $(echo "$avg_hourly_cost > 0 && $current_hour_cost > ($avg_hourly_cost * $spike_multiplier)" | bc -l) )); then
            error "Cost anomaly detected: Current hour cost ($${current_hour_cost}) is $(echo "scale=1; $current_hour_cost / $avg_hourly_cost" | bc)x the average ($${avg_hourly_cost})"
            send_anomaly_alert "$current_hour_cost" "$avg_hourly_cost"
        fi
        
        # Check for high-frequency usage patterns
        local high_frequency_users=$(psql "$DATABASE_URL" -t -c "
            SELECT
                u.email,
                COUNT(DISTINCT DATE_TRUNC('hour', a.created_at)) as active_hours,
                COUNT(a.id) as total_operations,
                SUM(
                    CASE
                        WHEN a.operation = 'AI_ENHANCEMENT' THEN (a.metadata->>'tokens_used')::int * 0.003 / 1000
                        WHEN s.sourceType = 'exa_search' THEN 0.01
                        WHEN s.sourceType = 'firecrawl' THEN 0.001
                        ELSE 0
                    END
                ) as total_cost
            FROM users u
            JOIN ai_searches a ON u.id = a.userId
            LEFT JOIN ai_search_sources s ON a.id = s.searchId
            WHERE a.created_at >= NOW() - INTERVAL '24 hours'
            GROUP BY u.id, u.email
            HAVING COUNT(a.id) > 50 OR SUM(
                CASE
                    WHEN a.operation = 'AI_ENHANCEMENT' THEN (a.metadata->>'tokens_used')::int * 0.003 / 1000
                    WHEN s.sourceType = 'exa_search' THEN 0.01
                    WHEN s.sourceType = 'firecrawl' THEN 0.001
                    ELSE 0
                END
            ) > 20
            ORDER BY total_cost DESC
            LIMIT 5;
        " 2>> "$LOG_FILE")
        
        if [[ -n "$high_frequency_users" ]]; then
            warning "High-frequency usage detected:"
            echo "$high_frequency_users" | while IFS= read -r line; do
                if [[ -n "$line" ]]; then
                    warning "  $line"
                fi
            done
        fi
    fi
}

# Send anomaly alert
send_anomaly_alert() {
    local current_cost="$1"
    local avg_cost="$2"
    
    log "Sending cost anomaly alert..."
    
    # Webhook notification
    if [[ -n "${COST_ALERT_WEBHOOK_URL}" ]]; then
        curl -X POST "$COST_ALERT_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{
                \"alert_type\": \"cost_anomaly\",
                \"environment\": \"$ENVIRONMENT\",
                \"current_hourly_cost\": \"$current_cost\",
                \"average_hourly_cost\": \"$avg_cost\",
                \"spike_multiplier\": \"$(echo "scale=1; $current_cost / $avg_cost" | bc)\",
                \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
                \"report\": \"$REPORT_FILE\"
            }" \
            2>> "$LOG_FILE" || true
    fi
    
    # Slack notification
    if [[ -n "${SLACK_WEBHOOK_URL}" ]]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{
                \"text\": \"🚨 Cost Anomaly Detected in $ENVIRONMENT\",
                \"attachments\": [{
                    \"color\": \"danger\",
                    \"fields\": [{
                        \"title\": \"Current Hourly Cost\",
                        \"value\": \"\$$current_cost\",
                        \"short\": true
                    }, {
                        \"title\": \"Average Hourly Cost\",
                        \"value\": \"\$$avg_cost\",
                        \"short\": true
                    }, {
                        \"title\": \"Spike Multiplier\",
                        \"value\": \"$(echo "scale=1; $current_cost / $avg_cost" | bc)x\",
                        \"short\": true
                    }],
                    \"footer\": \"Cost Monitor\",
                    \"ts\": $(date +%s)
                }]
            }" \
            2>> "$LOG_FILE" || true
    fi
}

# Implement automated cost control measures
implement_cost_control() {
    log "Implementing automated cost control measures..."
    
    if command -v psql &> /dev/null && [[ -n "$DATABASE_URL" ]]; then
        # Check if daily threshold is exceeded
        local daily_usage=$(psql "$DATABASE_URL" -t -c "
            SELECT COALESCE(SUM(
                CASE
                    WHEN operation = 'AI_ENHANCEMENT' THEN (metadata->>'tokens_used')::int * 0.003 / 1000
                    WHEN sourceType = 'exa_search' THEN 0.01
                    WHEN sourceType = 'firecrawl' THEN 0.001
                    ELSE 0
                END
            ), 0)
            FROM (
                SELECT created_at, operation, metadata FROM ai_performance_logs
                WHERE created_at >= CURRENT_DATE
                UNION ALL
                SELECT created_at, 'search', sourceType FROM ai_search_sources
                WHERE created_at >= CURRENT_DATE
            ) combined;
        " 2>> "$LOG_FILE" | xargs)
        
        # If daily usage exceeds 90% of threshold, implement restrictions
        local threshold_90_percent=$(echo "$ALERT_THRESHOLD_DAILY * 0.9" | bc)
        if (( $(echo "$daily_usage > $threshold_90_percent" | bc -l) )); then
            warning "Daily cost usage ($${daily_usage}) exceeds 90% of threshold ($${threshold_90_percent})"
            
            # Enable cost-saving feature flags
            enable_cost_saving_flags
            
            # Send notification about restrictions
            send_restriction_alert "$daily_usage"
        fi
    fi
}

# Enable cost-saving feature flags
enable_cost_saving_flags() {
    log "Enabling cost-saving feature flags..."
    
    # Update feature flags in database
    if command -v psql &> /dev/null && [[ -n "$DATABASE_URL" ]]; then
        psql "$DATABASE_URL" -c "
            UPDATE feature_flags
            SET enabled = true, updatedBy = 'cost-monitor', updatedAt = NOW()
            WHERE key IN (
                'ai-search-caching',
                'ai-search-batching',
                'ai-search-rate-limiting',
                'ai-search-query-optimization'
            );
        " 2>> "$LOG_FILE"
        
        # Disable expensive features
        psql "$DATABASE_URL" -c "
            UPDATE feature_flags
            SET enabled = false, updatedBy = 'cost-monitor', updatedAt = NOW()
            WHERE key IN (
                'ai-search-premium-models',
                'ai-search-real-time-enhancement'
            );
        " 2>> "$LOG_FILE"
        
        success "Cost-saving feature flags updated"
    fi
}

# Send restriction alert
send_restriction_alert() {
    local daily_usage="$1"
    
    log "Sending cost restriction alert..."
    
    if [[ -n "${COST_ALERT_WEBHOOK_URL}" ]]; then
        curl -X POST "$COST_ALERT_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{
                \"alert_type\": \"cost_restrictions_enabled\",
                \"environment\": \"$ENVIRONMENT\",
                \"daily_usage\": \"$daily_usage\",
                \"daily_threshold\": \"$ALERT_THRESHOLD_DAILY\",
                \"utilization\": \"$(echo "scale=1; ($daily_usage / $ALERT_THRESHOLD_DAILY) * 100" | bc)%\",
                \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
                \"actions_taken\": [\"enabled_caching\", \"enabled_batching\", \"enabled_rate_limiting\", \"disabled_premium_features\"]
            }" \
            2>> "$LOG_FILE" || true
    fi
}

# Generate comprehensive cost report
generate_comprehensive_report() {
    log "Generating comprehensive cost report..."
    
    local report_file="/tmp/comprehensive-cost-report-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).json"
    
    cat > "$report_file" << EOF
{
  "report_metadata": {
    "generated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "environment": "$ENVIRONMENT",
    "report_type": "comprehensive_cost_analysis"
  },
EOF
    
    # Add current metrics
    cat >> "$report_file" << EOF
  "current_metrics": {
    "daily_cost": "${COST_DATA[total_daily]}",
    "monthly_cost": "${COST_DATA[total_monthly]}",
    "weekly_growth_rate": "${COST_DATA[weekly_growth_rate]:-0}",
    "projected_monthly_cost": "${COST_DATA[monthly_forecast]:-0}"
  },
EOF
    
    # Add service breakdown
    cat >> "$report_file" << EOF
  "service_breakdown": {
    "openai": {
      "daily_cost": "${COST_DATA[openai_daily]}",
      "monthly_cost": "${COST_DATA[openai_monthly]}",
      "daily_tokens": "${USAGE_DATA[openai_tokens_daily]}"
    },
    "anthropic": {
      "daily_cost": "${COST_DATA[anthropic_daily]}",
      "monthly_cost": "${COST_DATA[anthropic_monthly]}",
      "daily_tokens": "${USAGE_DATA[anthropic_tokens_daily]}"
    },
    "exa": {
      "daily_cost": "${COST_DATA[exa_daily]}",
      "monthly_cost": "${COST_DATA[exa_monthly]}",
      "daily_searches": "${USAGE_DATA[exa_searches_daily]}"
    },
    "firecrawl": {
      "daily_cost": "${COST_DATA[firecrawl_daily]}",
      "monthly_cost": "${COST_DATA[firecrawl_monthly]}",
      "daily_crawls": "${USAGE_DATA[firecrawl_crawls_daily]}"
    }
  },
EOF
    
    # Add database analytics
    if command -v psql &> /dev/null && [[ -n "$DATABASE_URL" ]]; then
        # User breakdown
        local user_breakdown=$(psql "$DATABASE_URL" -t -c "
            SELECT json_agg(json_build_object(
                'user_email', u.email,
                'daily_operations', COUNT(a.id),
                'daily_cost', COALESCE(SUM(
                    CASE
                        WHEN a.operation = 'AI_ENHANCEMENT' THEN (a.metadata->>'tokens_used')::int * 0.003 / 1000
                        WHEN s.sourceType = 'exa_search' THEN 0.01
                        WHEN s.sourceType = 'firecrawl' THEN 0.001
                        ELSE 0
                    END
                ), 0)
            ))
            FROM users u
            JOIN ai_searches a ON u.id = a.userId
            LEFT JOIN ai_search_sources s ON a.id = s.searchId
            WHERE a.created_at >= CURRENT_DATE
            GROUP BY u.id, u.email
            ORDER BY daily_cost DESC
            LIMIT 10;
        " 2>> "$LOG_FILE")
        
        # Operation efficiency
        local operation_efficiency=$(psql "$DATABASE_URL" -t -c "
            SELECT json_agg(json_build_object(
                'operation_type', operation,
                'total_operations', COUNT(*),
                'average_duration_ms', AVG(durationMs),
                'success_rate', ROUND(COUNT(*) FILTER (WHERE status = 'success') * 100.0 / COUNT(*), 2),
                'average_cost_per_operation', COALESCE(SUM(
                    CASE
                        WHEN operation = 'AI_ENHANCEMENT' THEN (metadata->>'tokens_used')::int * 0.003 / 1000
                        ELSE 0
                    END
                ) / COUNT(*), 0)
            ))
            FROM ai_performance_logs
            WHERE created_at >= CURRENT_DATE
            GROUP BY operation;
        " 2>> "$LOG_FILE")
        
        cat >> "$report_file" << EOF
  "database_analytics": {
    "top_users": $user_breakdown,
    "operation_efficiency": $operation_efficiency
  },
EOF
    fi
    
    # Add recommendations
    cat >> "$report_file" << EOF
  "recommendations": [
EOF
    
    # Add recommendations based on current usage
    if [[ -n "${COST_DATA[openai_daily]}" && $(echo "${COST_DATA[openai_daily]} > 20" | bc -l) -eq 1 ]]; then
        cat >> "$report_file" << EOF
    {
      "type": "optimization",
      "category": "openai",
      "description": "Optimize OpenAI prompts to reduce token usage",
      "potential_savings": "30-50%",
      "priority": "high"
    },
EOF
    fi
    
    if [[ -n "${COST_DATA[total_daily]}" && $(echo "${COST_DATA[total_daily]} > 30" | bc -l) -eq 1 ]]; then
        cat >> "$report_file" << EOF
    {
      "type": "control",
      "category": "budget",
      "description": "Implement user-level budget controls",
      "potential_savings": "20-40%",
      "priority": "high"
    },
EOF
    fi
    
    # Close recommendations and report
    cat >> "$report_file" << EOF
    {
      "type": "monitoring",
      "category": "general",
      "description": "Continue current monitoring practices",
      "potential_savings": "0%",
      "priority": "low"
    }
  ],
  "alert_status": {
    "daily_threshold_exceeded": $([ "${COST_DATA[total_daily]}" != "unknown" ] && echo $(echo "${COST_DATA[total_daily]} > $ALERT_THRESHOLD_DAILY" | bc -l) || echo "false"),
    "monthly_threshold_exceeded": $([ "${COST_DATA[total_monthly]}" != "unknown" ] && echo $(echo "${COST_DATA[total_monthly]} > $ALERT_THRESHOLD_MONTHLY" | bc -l) || echo "false"),
    "cost_anomaly_detected": "false"
  }
}
EOF
    
    success "Comprehensive cost report generated: $report_file"
    REPORT_FILE="$report_file"
}

# Add enhanced monitoring options
case "${1:-full}" in
    "realtime")
        setup_realtime_monitoring
        detect_cost_anomalies
        implement_cost_control
        ;;
    "comprehensive")
        enhanced_cost_monitoring
        detect_cost_anomalies
        implement_cost_control
        generate_comprehensive_report
        ;;
    "anomaly")
        detect_cost_anomalies
        ;;
    "control")
        implement_cost_control
        ;;
    "report")
        generate_comprehensive_report
        ;;
    *)
        # Keep existing cases
        case "${1:-full}" in
            "full")
                main
                ;;
            "openai")
                init_cost_monitoring
                query_openai_costs
                generate_cost_report
                display_cost_summary
                ;;
            "anthropic")
                init_cost_monitoring
                query_anthropic_costs
                generate_cost_report
                display_cost_summary
                ;;
            "exa")
                init_cost_monitoring
                query_exa_costs
                generate_cost_report
                display_cost_summary
                ;;
            "firecrawl")
                init_cost_monitoring
                query_firecrawl_costs
                generate_cost_report
                display_cost_summary
                ;;
            "trends")
                init_cost_monitoring
                monitor_cost_trends
                generate_cost_report
                display_cost_summary
                ;;
            "forecast")
                init_cost_monitoring
                forecast_costs
                generate_cost_report
                display_cost_summary
                ;;
            "optimize")
                init_cost_monitoring
                query_openai_costs
                query_anthropic_costs
                query_exa_costs
                query_firecrawl_costs
                calculate_total_costs
                generate_cost_optimization_recommendations
                generate_cost_report
                display_cost_summary
                ;;
            "enhanced")
                enhanced_cost_monitoring
                ;;
            *)
                echo "Usage: $0 {full|openai|anthropic|exa|firecrawl|trends|forecast|optimize|enhanced|realtime|comprehensive|anomaly|control|report}"
                echo "Environment: Set ENVIRONMENT variable (default: production)"
                echo "Alert thresholds: Set ALERT_THRESHOLD_DAILY and ALERT_THRESHOLD_MONTHLY"
                echo "Additional options:"
                echo "  - ALERT_THRESHOLD_HOURLY: Hourly cost threshold (default: 25)"
                echo "  - ALERT_THRESHOLD_USER_DAILY: User daily threshold (default: 10)"
                echo "  - COST_SPIKE_MULTIPLIER: Anomaly detection multiplier (default: 3)"
                echo "  - COST_ALERT_WEBHOOK_URL: Webhook URL for alerts"
                echo "  - SLACK_WEBHOOK_URL: Slack webhook URL for notifications"
                exit 1
                ;;
        esac
        ;;
esac