#!/bin/bash

# Health Check Script for AI Search Feature
# This script performs comprehensive health checks for the application and its dependencies

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENVIRONMENT="${ENVIRONMENT:-production}"
LOG_FILE="/tmp/health-check-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).log"
REPORT_FILE="/tmp/health-report-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Health check results
declare -A HEALTH_RESULTS

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    HEALTH_RESULTS["overall"]="unhealthy"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
    HEALTH_RESULTS["overall"]="degraded"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

# Initialize health report
init_health_report() {
    log "Initializing health check for ${ENVIRONMENT} environment..."
    
    cat > "$REPORT_FILE" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "$ENVIRONMENT",
  "checks": {
EOF
    
    HEALTH_RESULTS["overall"]="healthy"
}

# Check application health
check_application_health() {
    log "Checking application health..."
    
    local app_healthy=true
    local response_time=0
    local status_code=0
    
    # Check if application is running
    if pgrep -f "next-server" > /dev/null; then
        log "Application process is running"
        HEALTH_RESULTS["app_process"]="healthy"
    else
        error "Application process is not running"
        HEALTH_RESULTS["app_process"]="unhealthy"
        app_healthy=false
    fi
    
    # Check HTTP health endpoint
    if command -v curl &> /dev/null; then
        start_time=$(date +%s%N)
        
        if curl -f -s -m 10 http://localhost:3000/api/health > /dev/null; then
            end_time=$(date +%s%N)
            response_time=$(( (end_time - start_time) / 1000000 ))  # Convert to milliseconds
            
            if [[ $response_time -lt 1000 ]]; then
                success "Application health endpoint responded in ${response_time}ms"
                HEALTH_RESULTS["app_http"]="healthy"
                HEALTH_RESULTS["app_response_time"]=$response_time
            else
                warning "Application health endpoint responded slowly (${response_time}ms)"
                HEALTH_RESULTS["app_http"]="degraded"
                HEALTH_RESULTS["app_response_time"]=$response_time
            fi
        else
            error "Application health endpoint is not responding"
            HEALTH_RESULTS["app_http"]="unhealthy"
            app_healthy=false
        fi
    else
        warning "curl not available, skipping HTTP health check"
        HEALTH_RESULTS["app_http"]="unknown"
    fi
    
    # Update overall health
    if [[ "$app_healthy" == false ]]; then
        HEALTH_RESULTS["overall"]="unhealthy"
    fi
}

# Check database health
check_database_health() {
    log "Checking database health..."
    
    local db_healthy=true
    
    # Check database connectivity
    if command -v psql &> /dev/null && [[ -n "$DATABASE_URL" ]]; then
        # Test basic connectivity
        if psql "$DATABASE_URL" -c "SELECT 1;" &> /dev/null; then
            success "Database is accessible"
            HEALTH_RESULTS["db_connection"]="healthy"
        else
            error "Database is not accessible"
            HEALTH_RESULTS["db_connection"]="unhealthy"
            db_healthy=false
        fi
        
        # Check database size and connections
        if [[ "$db_healthy" == true ]]; then
            # Get database stats
            db_stats=$(psql "$DATABASE_URL" -t -c "
                SELECT 
                    pg_size_pretty(pg_database_size(current_database())) as size,
                    count(*) as connection_count
                FROM pg_stat_activity 
                WHERE datname = current_database();
            " 2>> "$LOG_FILE")
            
            if [[ -n "$db_stats" ]]; then
                log "Database stats: $db_stats"
                HEALTH_RESULTS["db_stats"]=$(echo "$db_stats" | xargs)
            fi
            
            # Check for long-running queries
            long_queries=$(psql "$DATABASE_URL" -t -c "
                SELECT count(*) 
                FROM pg_stat_activity 
                WHERE state = 'active' 
                AND query_start < now() - interval '5 minutes'
                AND query != '<IDLE>';
            " 2>> "$LOG_FILE")
            
            if [[ "$long_queries" -gt 0 ]]; then
                warning "Found $long_queries long-running queries"
                HEALTH_RESULTS["db_long_queries"]="degraded"
            else
                HEALTH_RESULTS["db_long_queries"]="healthy"
            fi
        fi
        
        # Check critical tables
        critical_tables=("users" "media_contacts" "ai_searches")
        for table in "${critical_tables[@]}"; do
            if psql "$DATABASE_URL" -c "SELECT 1 FROM $table LIMIT 1;" &> /dev/null; then
                log "Table $table is accessible"
            else
                error "Table $table is not accessible"
                HEALTH_RESULTS["db_table_$table"]="unhealthy"
                db_healthy=false
            fi
        done
    else
        warning "PostgreSQL client not available or DATABASE_URL not set"
        HEALTH_RESULTS["db_connection"]="unknown"
    fi
    
    # Update overall health
    if [[ "$db_healthy" == false ]]; then
        HEALTH_RESULTS["overall"]="unhealthy"
    fi
}

# Check AI services health
check_ai_services_health() {
    log "Checking AI services health..."
    
    local ai_services_healthy=true
    
    # Check OpenAI API
    if [[ -n "$OPENAI_API_KEY" ]]; then
        if curl -f -s -m 10 \
            -H "Authorization: Bearer $OPENAI_API_KEY" \
            https://api.openai.com/v1/models > /dev/null; then
            success "OpenAI API is accessible"
            HEALTH_RESULTS["openai_api"]="healthy"
        else
            error "OpenAI API is not accessible"
            HEALTH_RESULTS["openai_api"]="unhealthy"
            ai_services_healthy=false
        fi
    else
        warning "OpenAI API key not configured"
        HEALTH_RESULTS["openai_api"]="unknown"
    fi
    
    # Check Anthropic API
    if [[ -n "$ANTHROPIC_API_KEY" ]]; then
        if curl -f -s -m 10 \
            -H "x-api-key: $ANTHROPIC_API_KEY" \
            https://api.anthropic.com/v1/messages > /dev/null; then
            success "Anthropic API is accessible"
            HEALTH_RESULTS["anthropic_api"]="healthy"
        else
            error "Anthropic API is not accessible"
            HEALTH_RESULTS["anthropic_api"]="unhealthy"
            ai_services_healthy=false
        fi
    else
        warning "Anthropic API key not configured"
        HEALTH_RESULTS["anthropic_api"]="unknown"
    fi
    
    # Check Exa API
    if [[ -n "$EXA_API_KEY" ]]; then
        if curl -f -s -m 10 \
            -H "Authorization: Bearer $EXA_API_KEY" \
            https://api.exa.ai/search -d '{"query":"test","numResults":1}' > /dev/null; then
            success "Exa API is accessible"
            HEALTH_RESULTS["exa_api"]="healthy"
        else
            warning "Exa API is not accessible"
            HEALTH_RESULTS["exa_api"]="degraded"
        fi
    else
        warning "Exa API key not configured"
        HEALTH_RESULTS["exa_api"]="unknown"
    fi
    
    # Check Firecrawl API
    if [[ -n "$FIRECRAWL_API_KEY" ]]; then
        if curl -f -s -m 10 \
            -H "Authorization: Bearer $FIRECRAWL_API_KEY" \
            https://api.firecrawl.dev/v1/status > /dev/null; then
            success "Firecrawl API is accessible"
            HEALTH_RESULTS["firecrawl_api"]="healthy"
        else
            warning "Firecrawl API is not accessible"
            HEALTH_RESULTS["firecrawl_api"]="degraded"
        fi
    else
        warning "Firecrawl API key not configured"
        HEALTH_RESULTS["firecrawl_api"]="unknown"
    fi
    
    # Update overall health
    if [[ "$ai_services_healthy" == false ]]; then
        HEALTH_RESULTS["overall"]="degraded"
    fi
}

# Check system resources
check_system_resources() {
    log "Checking system resources..."
    
    # Check disk space
    disk_usage=$(df "$PROJECT_ROOT" | awk 'NR==2 {print $5}' | sed 's/%//')
    if [[ $disk_usage -lt 80 ]]; then
        success "Disk usage is at ${disk_usage}%"
        HEALTH_RESULTS["disk_usage"]="healthy"
        HEALTH_RESULTS["disk_usage_percent"]=$disk_usage
    elif [[ $disk_usage -lt 90 ]]; then
        warning "Disk usage is high at ${disk_usage}%"
        HEALTH_RESULTS["disk_usage"]="degraded"
        HEALTH_RESULTS["disk_usage_percent"]=$disk_usage
    else
        error "Disk usage is critical at ${disk_usage}%"
        HEALTH_RESULTS["disk_usage"]="unhealthy"
        HEALTH_RESULTS["disk_usage_percent"]=$disk_usage
    fi
    
    # Check memory usage
    if command -v free &> /dev/null; then
        memory_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
        if [[ $memory_usage -lt 80 ]]; then
            success "Memory usage is at ${memory_usage}%"
            HEALTH_RESULTS["memory_usage"]="healthy"
            HEALTH_RESULTS["memory_usage_percent"]=$memory_usage
        elif [[ $memory_usage -lt 90 ]]; then
            warning "Memory usage is high at ${memory_usage}%"
            HEALTH_RESULTS["memory_usage"]="degraded"
            HEALTH_RESULTS["memory_usage_percent"]=$memory_usage
        else
            error "Memory usage is critical at ${memory_usage}%"
            HEALTH_RESULTS["memory_usage"]="unhealthy"
            HEALTH_RESULTS["memory_usage_percent"]=$memory_usage
        fi
    else
        warning "Cannot check memory usage - free command not available"
        HEALTH_RESULTS["memory_usage"]="unknown"
    fi
    
    # Check CPU load
    if command -v uptime &> /dev/null; then
        load_average=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
        log "CPU load average: $load_average"
        HEALTH_RESULTS["cpu_load"]=$load_average
        
        # Compare load average to number of CPU cores
        if command -v nproc &> /dev/null; then
            cpu_cores=$(nproc)
            if (( $(echo "$load_average < $cpu_cores" | bc -l) )); then
                HEALTH_RESULTS["cpu_load_status"]="healthy"
            else
                HEALTH_RESULTS["cpu_load_status"]="degraded"
            fi
        fi
    else
        warning "Cannot check CPU load - uptime command not available"
        HEALTH_RESULTS["cpu_load_status"]="unknown"
    fi
}

# Check AI search feature specifically
check_ai_search_feature() {
    log "Checking AI search feature health..."
    
    # Check AI search endpoint
    if curl -f -s -m 10 http://localhost:3000/api/ai/search/health > /dev/null; then
        success "AI search health endpoint is responding"
        HEALTH_RESULTS["ai_search_endpoint"]="healthy"
    else
        error "AI search health endpoint is not responding"
        HEALTH_RESULTS["ai_search_endpoint"]="unhealthy"
        HEALTH_RESULTS["overall"]="unhealthy"
    fi
    
    # Check AI search configuration
    if [[ -n "$OPENAI_API_KEY" && -n "$ANTHROPIC_API_KEY" ]]; then
        success "AI search is properly configured"
        HEALTH_RESULTS["ai_search_config"]="healthy"
    else
        error "AI search is missing required API keys"
        HEALTH_RESULTS["ai_search_config"]="unhealthy"
        HEALTH_RESULTS["overall"]="unhealthy"
    fi
    
    # Check feature flag status
    if curl -f -s -m 5 http://localhost:3000/api/feature-flags/ai-search > /dev/null; then
        success "AI search feature flag is accessible"
        HEALTH_RESULTS["ai_search_feature_flag"]="healthy"
    else
        warning "AI search feature flag is not accessible"
        HEALTH_RESULTS["ai_search_feature_flag"]="degraded"
    fi
}

# Generate health report
generate_health_report() {
    log "Generating health report..."
    
    # Add all health results to the report
    local first=true
    for key in "${!HEALTH_RESULTS[@]}"; do
        if [[ "$first" == true ]]; then
            first=false
        else
            echo "," >> "$REPORT_FILE"
        fi
        
        # Escape quotes in values
        value=${HEALTH_RESULTS[$key]}
        value=$(echo "$value" | sed 's/"/\\"/g')
        
        echo "    \"$key\": \"$value\"" >> "$REPORT_FILE"
    done
    
    # Close the JSON structure
    cat >> "$REPORT_FILE" << EOF
  },
  "overall_status": "${HEALTH_RESULTS[overall]}"
}
EOF
    
    success "Health report generated: $REPORT_FILE"
}

# Display health summary
display_health_summary() {
    log "Health Check Summary"
    log "===================="
    
    echo "Overall Status: ${HEALTH_RESULTS[overall]}" | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"
    
    # Display failed checks
    local has_failures=false
    for key in "${!HEALTH_RESULTS[@]}"; do
        if [[ "${HEALTH_RESULTS[$key]}" == "unhealthy" ]]; then
            echo "❌ $key: ${HEALTH_RESULTS[$key]}" | tee -a "$LOG_FILE"
            has_failures=true
        fi
    done
    
    # Display warnings
    for key in "${!HEALTH_RESULTS[@]}"; do
        if [[ "${HEALTH_RESULTS[$key]}" == "degraded" ]]; then
            echo "⚠️  $key: ${HEALTH_RESULTS[$key]}" | tee -a "$LOG_FILE"
        fi
    done
    
    if [[ "$has_failures" == false ]]; then
        success "All critical health checks passed"
    fi
    
    echo "" | tee -a "$LOG_FILE"
    echo "Detailed report available at: $REPORT_FILE" | tee -a "$LOG_FILE"
    echo "Full log available at: $LOG_FILE" | tee -a "$LOG_FILE"
}

# Send health notification
send_health_notification() {
    local status=${HEALTH_RESULTS[overall]}
    
    # Only send notifications for unhealthy or degraded status
    if [[ "$status" != "healthy" ]]; then
        log "Sending health notification: $status"
        
        # Example webhook notification (customize as needed)
        if [[ -n "${HEALTH_WEBHOOK_URL}" ]]; then
            curl -X POST "$HEALTH_WEBHOOK_URL" \
                -H "Content-Type: application/json" \
                -d "{\"status\": \"$status\", \"environment\": \"$ENVIRONMENT\", \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\", \"report\": \"$REPORT_FILE\"}" \
                2>> "$LOG_FILE" || true
        fi
    fi
}

# Main health check flow
main() {
    log "Starting comprehensive health check for ${ENVIRONMENT} environment..."
    
    init_health_report
    check_application_health
    check_database_health
    check_ai_services_health
    check_system_resources
    check_ai_search_feature
    generate_health_report
    display_health_summary
    send_health_notification
    
    # Exit with appropriate code based on overall health
    case ${HEALTH_RESULTS[overall]} in
        "healthy")
            exit 0
            ;;
        "degraded")
            exit 1
            ;;
        "unhealthy")
            exit 2
            ;;
        *)
            exit 3
            ;;
    esac
    
    # Enhanced AI service monitoring with detailed metrics
    monitor_ai_service_detailed() {
        log "Performing detailed AI service monitoring..."
        
        # Test each AI service with actual requests
        local services_healthy=true
        
        # Test OpenAI with a simple completion
        if [[ -n "$OPENAI_API_KEY" ]]; then
            log "Testing OpenAI API with actual request..."
            local start_time=$(date +%s%N)
            local openai_response=$(curl -s -m 15 \
                -H "Authorization: Bearer $OPENAI_API_KEY" \
                -H "Content-Type: application/json" \
                -d '{"model":"gpt-3.5-turbo","messages":[{"role":"user","content":"test"}],"max_tokens":5}' \
                "https://api.openai.com/v1/chat/completions" 2>> "$LOG_FILE")
            local end_time=$(date +%s%N)
            local response_time=$(( (end_time - start_time) / 1000000 ))
            
            if echo "$openai_response" | jq -e '.choices[0].message.content' > /dev/null 2>&1; then
                success "OpenAI API test successful (${response_time}ms)"
                HEALTH_RESULTS["openai_detailed_test"]="healthy"
                HEALTH_RESULTS["openai_response_time"]=$response_time
            else
                error "OpenAI API test failed"
                HEALTH_RESULTS["openai_detailed_test"]="unhealthy"
                services_healthy=false
            fi
        fi
        
        # Test Anthropic with a simple completion
        if [[ -n "$ANTHROPIC_API_KEY" ]]; then
            log "Testing Anthropic API with actual request..."
            local start_time=$(date +%s%N)
            local anthropic_response=$(curl -s -m 15 \
                -H "x-api-key: $ANTHROPIC_API_KEY" \
                -H "Content-Type: application/json" \
                -d '{"model":"claude-3-haiku-20240307","messages":[{"role":"user","content":"test"}],"max_tokens":5}' \
                "https://api.anthropic.com/v1/messages" 2>> "$LOG_FILE")
            local end_time=$(date +%s%N)
            local response_time=$(( (end_time - start_time) / 1000000 ))
            
            if echo "$anthropic_response" | jq -e '.content[0].text' > /dev/null 2>&1; then
                success "Anthropic API test successful (${response_time}ms)"
                HEALTH_RESULTS["anthropic_detailed_test"]="healthy"
                HEALTH_RESULTS["anthropic_response_time"]=$response_time
            else
                error "Anthropic API test failed"
                HEALTH_RESULTS["anthropic_detailed_test"]="unhealthy"
                services_healthy=false
            fi
        fi
        
        # Test Exa with a search request
        if [[ -n "$EXA_API_KEY" ]]; then
            log "Testing Exa API with search request..."
            local start_time=$(date +%s%N)
            local exa_response=$(curl -s -m 15 \
                -H "Authorization: Bearer $EXA_API_KEY" \
                -H "Content-Type: application/json" \
                -d '{"query":"test search","numResults":1}' \
                "https://api.exa.ai/search" 2>> "$LOG_FILE")
            local end_time=$(date +%s%N)
            local response_time=$(( (end_time - start_time) / 1000000 ))
            
            if echo "$exa_response" | jq -e '.results[0].title' > /dev/null 2>&1; then
                success "Exa API test successful (${response_time}ms)"
                HEALTH_RESULTS["exa_detailed_test"]="healthy"
                HEALTH_RESULTS["exa_response_time"]=$response_time
            else
                error "Exa API test failed"
                HEALTH_RESULTS["exa_detailed_test"]="unhealthy"
                services_healthy=false
            fi
        fi
        
        # Test Firecrawl with a scrape request
        if [[ -n "$FIRECRAWL_API_KEY" ]]; then
            log "Testing Firecrawl API with scrape request..."
            local start_time=$(date +%s%N)
            local firecrawl_response=$(curl -s -m 15 \
                -H "Authorization: Bearer $FIRECRAWL_API_KEY" \
                -H "Content-Type: application/json" \
                -d '{"url":"https://example.com"}' \
                "https://api.firecrawl.dev/v1/scrape" 2>> "$LOG_FILE")
            local end_time=$(date +%s%N)
            local response_time=$(( (end_time - start_time) / 1000000 ))
            
            if echo "$firecrawl_response" | jq -e '.content' > /dev/null 2>&1; then
                success "Firecrawl API test successful (${response_time}ms)"
                HEALTH_RESULTS["firecrawl_detailed_test"]="healthy"
                HEALTH_RESULTS["firecrawl_response_time"]=$response_time
            else
                error "Firecrawl API test failed"
                HEALTH_RESULTS["firecrawl_detailed_test"]="unhealthy"
                services_healthy=false
            fi
        fi
        
        # Update overall health
        if [[ "$services_healthy" == false ]]; then
            HEALTH_RESULTS["overall"]="unhealthy"
        fi
    }
    
    # Database performance monitoring
    monitor_database_performance() {
        log "Monitoring database performance..."
        
        if command -v psql &> /dev/null && [[ -n "$DATABASE_URL" ]]; then
            # Check slow queries
            local slow_queries=$(psql "$DATABASE_URL" -t -c "
                SELECT COUNT(*)
                FROM pg_stat_statements
                WHERE mean_exec_time > 1000
                AND calls > 10;
            " 2>> "$LOG_FILE" | xargs)
            
            HEALTH_RESULTS["db_slow_queries"]=$slow_queries
            
            if [[ $slow_queries -gt 5 ]]; then
                warning "Found $slow_queries slow queries"
                HEALTH_RESULTS["db_performance"]="degraded"
            elif [[ $slow_queries -gt 0 ]]; then
                log "Found $slow_queries slow queries"
                HEALTH_RESULTS["db_performance"]="healthy"
            else
                success "No slow queries detected"
                HEALTH_RESULTS["db_performance"]="healthy"
            fi
            
            # Check connection pool usage
            local pool_usage=$(psql "$DATABASE_URL" -t -c "
                SELECT COUNT(*)
                FROM pg_stat_activity
                WHERE state = 'active';
            " 2>> "$LOG_FILE" | xargs)
            
            local max_connections=$(psql "$DATABASE_URL" -t -c "
                SELECT setting::int
                FROM pg_settings
                WHERE name = 'max_connections';
            " 2>> "$LOG_FILE" | xargs)
            
            local usage_percentage=$((pool_usage * 100 / max_connections))
            HEALTH_RESULTS["db_connection_usage"]=$usage_percentage
            
            if [[ $usage_percentage -gt 80 ]]; then
                error "Database connection usage is critical: ${usage_percentage}%"
                HEALTH_RESULTS["db_connection_status"]="unhealthy"
            elif [[ $usage_percentage -gt 60 ]]; then
                warning "Database connection usage is high: ${usage_percentage}%"
                HEALTH_RESULTS["db_connection_status"]="degraded"
            else
                success "Database connection usage is normal: ${usage_percentage}%"
                HEALTH_RESULTS["db_connection_status"]="healthy"
            fi
            
            # Check table sizes
            local large_tables=$(psql "$DATABASE_URL" -t -c "
                SELECT COUNT(*)
                FROM (
                    SELECT schemaname, tablename,
                           pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
                    FROM pg_tables
                    WHERE schemaname = 'public'
                    AND pg_total_relation_size(schemaname||'.'||tablename) > 100000000 -- 100MB
                ) large_tables;
            " 2>> "$LOG_FILE" | xargs)
            
            HEALTH_RESULTS["db_large_tables"]=$large_tables
            
            if [[ $large_tables -gt 0 ]]; then
                log "Found $large_tables large tables (>100MB)"
            fi
        fi
    }
    
    # System resource monitoring
    monitor_system_resources_detailed() {
        log "Performing detailed system resource monitoring..."
        
        # Check disk I/O
        if command -v iostat &> /dev/null; then
            local io_wait=$(iostat -x 1 2 | tail -n +4 | awk '{print $10}' | grep -v '^$' | tail -1)
            if [[ -n "$io_wait" ]]; then
                HEALTH_RESULTS["disk_io_wait"]=$io_wait
                if (( $(echo "$io_wait > 20" | bc -l) )); then
                    warning "High disk I/O wait: ${io_wait}%"
                    HEALTH_RESULTS["disk_io_status"]="degraded"
                else
                    success "Disk I/O wait is normal: ${io_wait}%"
                    HEALTH_RESULTS["disk_io_status"]="healthy"
                fi
            fi
        fi
        
        # Check network connectivity
        local test_hosts=("8.8.8.8" "1.1.1.1" "google.com")
        local network_healthy=true
        
        for host in "${test_hosts[@]}"; do
            if ping -c 1 -W 5 "$host" &> /dev/null; then
                log "Network connectivity to $host: OK"
            else
                warning "Network connectivity to $host: FAILED"
                network_healthy=false
            fi
        done
        
        if [[ "$network_healthy" == true ]]; then
            HEALTH_RESULTS["network_connectivity"]="healthy"
        else
            HEALTH_RESULTS["network_connectivity"]="degraded"
        fi
        
        # Check process health
        local critical_processes=("next-server" "node")
        for process in "${critical_processes[@]}"; do
            if pgrep -f "$process" > /dev/null; then
                log "Process $process is running"
                HEALTH_RESULTS["process_$process"]="running"
            else
                warning "Process $process is not running"
                HEALTH_RESULTS["process_$process"]="stopped"
            fi
        done
    }
    
    # Add new monitoring options
    case "${1:-full}" in
        "ai-detailed")
            init_health_report
            monitor_ai_service_detailed
            generate_health_report
            display_health_summary
            ;;
        "db-performance")
            init_health_report
            monitor_database_performance
            generate_health_report
            display_health_summary
            ;;
        "system-detailed")
            init_health_report
            monitor_system_resources_detailed
            generate_health_report
            display_health_summary
            ;;
        *)
            # Keep existing cases
            case "${1:-full}" in
                "full")
                    main
                    ;;
                "app")
                    init_health_report
                    check_application_health
                    generate_health_report
                    display_health_summary
                    ;;
                "db")
                    init_health_report
                    check_database_health
                    monitor_database_performance
                    generate_health_report
                    display_health_summary
                    ;;
                "ai")
                    init_health_report
                    check_ai_services_health
                    monitor_ai_service_detailed
                    generate_health_report
                    display_health_summary
                    ;;
                "system")
                    init_health_report
                    check_system_resources
                    monitor_system_resources_detailed
                    generate_health_report
                    display_health_summary
                    ;;
                *)
                    echo "Usage: $0 {full|app|db|ai|system|ai-detailed|db-performance|system-detailed}"
                    echo "Environment: Set ENVIRONMENT variable (default: production)"
                    exit 1
                    ;;
            esac
            ;;
    esac
}

# Parse command line arguments
case "${1:-full}" in
    "full")
        main
        ;;
    "app")
        init_health_report
        check_application_health
        generate_health_report
        display_health_summary
        ;;
    "db")
        init_health_report
        check_database_health
        generate_health_report
        display_health_summary
        ;;
    "ai")
        init_health_report
        check_ai_services_health
        check_ai_search_feature
        generate_health_report
        display_health_summary
        ;;
    "system")
        init_health_report
        check_system_resources
        generate_health_report
        display_health_summary
        ;;
    *)
        echo "Usage: $0 {full|app|db|ai|system}"
        echo "Environment: Set ENVIRONMENT variable (default: production)"
        exit 1
        ;;
esac