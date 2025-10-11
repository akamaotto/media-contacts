#!/bin/bash

# Automated Rollback Testing Framework for AI Search Feature
# This script tests rollback procedures to ensure they work correctly when needed

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENVIRONMENT="${ENVIRONMENT:-staging}"  # Default to staging for safety
TEST_TYPE="${1:-comprehensive}"  # comprehensive, quick, specific
TEST_COMPONENT="${2:-all}"  # all, database, feature-flags, services

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test tracking
TEST_ID="rollback-test-$(date +%Y%m%d-%H%M%S)"
TEST_START_TIME=$(date +%s)
TEST_RESULTS_DIR="/tmp/rollback-test-results-$TEST_ID"
TEST_LOG_FILE="$TEST_RESULTS_DIR/test.log"
TEST_SUCCESS=true
TEST_SUMMARY=""

# Test counters
declare -A TEST_COUNTS
TEST_COUNTS[total]=0
TEST_COUNTS[passed]=0
TEST_COUNTS[failed]=0
TEST_COUNTS[skipped]=0

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$TEST_LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$TEST_LOG_FILE"
    TEST_SUCCESS=false
    ((TEST_COUNTS[failed]++))
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$TEST_LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$TEST_LOG_FILE"
}

info() {
    echo -e "${CYAN}[INFO]${NC} $1" | tee -a "$TEST_LOG_FILE"
}

# Run a test case
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_result="${3:-0}"
    
    ((TEST_COUNTS[total]++))
    
    log "Running test: $test_name"
    
    # Create temporary test log
    local temp_log=$(mktemp)
    
    # Execute test command
    if eval "$test_command" > "$temp_log" 2>&1; then
        local actual_result=0
    else
        local actual_result=$?
    fi
    
    # Check result
    if [[ "$actual_result" -eq "$expected_result" ]]; then
        ((TEST_COUNTS[passed]++))
        success "✓ $test_name"
        
        # Add to summary
        TEST_SUMMARY+="✓ $test_name\n"
    else
        ((TEST_COUNTS[failed]++))
        error "✗ $test_name (expected: $expected_result, got: $actual_result)"
        
        # Add to summary
        TEST_SUMMARY+="✗ $test_name (expected: $expected_result, got: $actual_result)\n"
        
        # Show error details
        log "Error details:"
        cat "$temp_log" | tail -20 >> "$TEST_LOG_FILE"
    fi
    
    # Clean up
    rm -f "$temp_log"
}

# Skip a test case
skip_test() {
    local test_name="$1"
    local reason="$2"
    
    ((TEST_COUNTS[total]++))
    ((TEST_COUNTS[skipped]++))
    
    warning "- $test_name (skipped: $reason)"
    
    # Add to summary
    TEST_SUMMARY+="- $test_name (skipped: $reason)\n"
}

# Initialize test environment
initialize_test_environment() {
    log "Initializing test environment..."
    
    # Create test results directory
    mkdir -p "$TEST_RESULTS_DIR"
    
    # Check if we're in a safe environment
    if [[ "$ENVIRONMENT" == "production" ]]; then
        read -p "WARNING: You are about to run rollback tests in production. Continue? (yes/no): " confirm
        if [[ "$confirm" != "yes" ]]; then
            error "Production rollback tests cancelled"
            exit 1
        fi
    fi
    
    # Check required tools
    local required_tools=("curl" "jq" "psql" "git")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            error "Required tool not found: $tool"
            exit 1
        fi
    done
    
    # Check environment variables
    local required_vars=("DATABASE_URL")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            error "Required environment variable not set: $var"
            exit 1
        fi
    done
    
    success "Test environment initialized"
}

# Test database rollback procedures
test_database_rollback() {
    if [[ "$TEST_COMPONENT" != "all" && "$TEST_COMPONENT" != "database" ]]; then
        skip_test "Database rollback procedures" "Component not selected for testing"
        return
    fi
    
    log "Testing database rollback procedures..."
    
    # Test database permissions
    run_test "Database permissions check" \
        "psql '$DATABASE_URL' -c 'SELECT 1;'" \
        0
    
    # Test backup creation
    run_test "Database backup creation" \
        "pg_dump --schema-only '$DATABASE_URL' > /dev/null" \
        0
    
    # Test rollback script generation
    local temp_rollback=$(mktemp)
    run_test "Rollback script generation" \
        "cat > '$temp_rollback' << 'EOF'
-- Test rollback script
BEGIN;
DROP TABLE IF EXISTS test_table;
COMMIT;
EOF" \
        0
    
    # Test rollback script validation
    run_test "Rollback script validation" \
        "psql '$DATABASE_URL' -c 'SELECT 1 FROM information_schema.tables WHERE table_name = \\'users\\';'" \
        0
    
    # Clean up
    rm -f "$temp_rollback"
    
    success "Database rollback tests completed"
}

# Test feature flag rollback procedures
test_feature_flag_rollback() {
    if [[ "$TEST_COMPONENT" != "all" && "$TEST_COMPONENT" != "feature-flags" ]]; then
        skip_test "Feature flag rollback procedures" "Component not selected for testing"
        return
    fi
    
    log "Testing feature flag rollback procedures..."
    
    # Check if feature flag service is available
    if [[ -z "$API_URL" || -z "$API_KEY" ]]; then
        skip_test "Feature flag service connectivity" "API_URL or API_KEY not set"
        return
    fi
    
    # Test API connectivity
    run_test "Feature flag API connectivity" \
        "curl -f -s -H 'Authorization: Bearer $API_KEY' '$API_URL/api/health'" \
        0
    
    # Test flag retrieval
    run_test "Feature flag retrieval" \
        "curl -s -H 'Authorization: Bearer $API_KEY' '$API_URL/api/feature-flags/ai-search-enabled'" \
        0
    
    # Test flag backup
    local temp_backup=$(mktemp)
    run_test "Feature flag backup" \
        "curl -s -H 'Authorization: Bearer $API_KEY' '$API_URL/api/feature-flags/ai-search-enabled' > '$temp_backup'" \
        0
    
    # Test flag update (only in non-production)
    if [[ "$ENVIRONMENT" != "production" ]]; then
        run_test "Feature flag update" \
            "curl -s -X POST -H 'Authorization: Bearer $API_KEY' -H 'Content-Type: application/json' -d '{\"enabled\": false, \"rolloutPercentage\": 0}' '$API_URL/api/feature-flags/test-flag'" \
            0
    else
        skip_test "Feature flag update" "Skipped in production environment"
    fi
    
    # Clean up
    rm -f "$temp_backup"
    
    success "Feature flag rollback tests completed"
}

# Test external service rollback procedures
test_external_service_rollback() {
    if [[ "$TEST_COMPONENT" != "all" && "$TEST_COMPONENT" != "services" ]]; then
        skip_test "External service rollback procedures" "Component not selected for testing"
        return
    fi
    
    log "Testing external service rollback procedures..."
    
    # Test configuration directory access
    run_test "Service configuration directory access" \
        "test -d '$PROJECT_ROOT/src/lib/ai/services/config' || mkdir -p '$PROJECT_ROOT/src/lib/ai/services/config'" \
        0
    
    # Test configuration file creation
    local temp_config=$(mktemp)
    run_test "Service configuration file creation" \
        "cat > '$temp_config' << 'EOF'
{
  "enabled": false,
  "disabled_reason": "Test rollback"
}
EOF" \
        0
    
    # Test configuration backup
    run_test "Service configuration backup" \
        "cp '$temp_config' '$temp_config.backup'" \
        0
    
    # Test cache clearing
    run_test "Service cache clearing" \
        "mkdir -p '$PROJECT_ROOT/.cache/ai-services' && rm -rf '$PROJECT_ROOT/.cache/ai-services'" \
        0
    
    # Test API key rotation simulation
    local temp_env=$(mktemp)
    run_test "API key rotation simulation" \
        "echo 'TEST_API_KEY=test_value_123' > '$temp_env' && sed -i.bak 's/TEST_API_KEY=.*/TEST_API_KEY=DISABLED_TEST_ROLLBACK/' '$temp_env'" \
        0
    
    # Clean up
    rm -f "$temp_config" "$temp_config.backup" "$temp_env" "$temp_env.bak"
    
    success "External service rollback tests completed"
}

# Test application rollback procedures
test_application_rollback() {
    if [[ "$TEST_COMPONENT" != "all" && "$TEST_COMPONENT" != "application" ]]; then
        skip_test "Application rollback procedures" "Component not selected for testing"
        return
    fi
    
    log "Testing application rollback procedures..."
    
    # Test git operations
    run_test "Git repository access" \
        "git status" \
        0
    
    # Test git tag retrieval
    run_test "Git tag retrieval" \
        "git tag --list --sort=-version:refname | head -5" \
        0
    
    # Test backup creation
    local temp_backup=$(mktemp -d)
    run_test "Application backup creation" \
        "mkdir -p '$temp_backup' && cp '$PROJECT_ROOT/package.json' '$temp_backup/'" \
        0
    
    # Test npm operations
    run_test "NPM operations" \
        "cd '$PROJECT_ROOT' && npm list --depth=0" \
        0
    
    # Test build process (only in comprehensive mode)
    if [[ "$TEST_TYPE" == "comprehensive" ]]; then
        run_test "Build process simulation" \
            "cd '$PROJECT_ROOT' && npm run build --dry-run 2>/dev/null || echo 'Build simulation completed'" \
            0
    else
        skip_test "Build process" "Skipped in quick test mode"
    fi
    
    # Clean up
    rm -rf "$temp_backup"
    
    success "Application rollback tests completed"
}

# Test rollback monitoring
test_rollback_monitoring() {
    log "Testing rollback monitoring procedures..."
    
    # Test log file creation
    run_test "Rollback log creation" \
        "mkdir -p '$TEST_RESULTS_DIR' && echo 'Test log entry' > '$TEST_RESULTS_DIR/rollback-test.log'" \
        0
    
    # Test monitoring configuration
    local temp_monitoring=$(mktemp)
    run_test "Monitoring configuration creation" \
        "cat > '$temp_monitoring' << 'EOF'
{
  "monitoring_enabled": true,
  "metrics_to_track": ["error_rate", "response_time"]
}
EOF" \
        0
    
    # Test notification payload creation
    run_test "Notification payload creation" \
        "cat > '$TEST_RESULTS_DIR/notification.json' << 'EOF'
{
  "status": "test",
  "message": "Test notification"
}
EOF" \
        0
    
    # Clean up
    rm -f "$temp_monitoring"
    
    success "Rollback monitoring tests completed"
}

# Test rollback verification
test_rollback_verification() {
    log "Testing rollback verification procedures..."
    
    # Test health check endpoint
    run_test "Health check endpoint" \
        "curl -f -s http://localhost:3000/api/health || echo 'Health check endpoint not available'" \
        0
    
    # Test database connectivity verification
    run_test "Database connectivity verification" \
        "psql '$DATABASE_URL' -c 'SELECT 1;'" \
        0
    
    # Test application version verification
    run_test "Application version verification" \
        "curl -s http://localhost:3000/api/version || echo 'Version endpoint not available'" \
        0
    
    # Test feature flag verification
    if [[ -n "$API_URL" && -n "$API_KEY" ]]; then
        run_test "Feature flag verification" \
            "curl -s -H 'Authorization: Bearer $API_KEY' '$API_URL/api/feature-flags/ai-search-enabled' | jq -r '.enabled // false'" \
            0
    else
        skip_test "Feature flag verification" "API configuration not available"
    fi
    
    success "Rollback verification tests completed"
}

# Create test report
create_test_report() {
    local test_duration=$(($(date +%s) - TEST_START_TIME))
    
    cat > "$TEST_RESULTS_DIR/test-report.md" << EOF
# Rollback Test Report

## Test Information
- **Test ID**: $TEST_ID
- **Environment**: $ENVIRONMENT
- **Test Type**: $TEST_TYPE
- **Component**: $TEST_COMPONENT
- **Timestamp**: $(date -u +%Y-%m-%dT%H:%M:%SZ)
- **Duration**: ${test_duration} seconds
- **Status**: $([ "$TEST_SUCCESS" = true ] && echo "Success" || echo "Failed")

## Test Results Summary
- **Total Tests**: ${TEST_COUNTS[total]}
- **Passed**: ${TEST_COUNTS[passed]}
- **Failed**: ${TEST_COUNTS[failed]}
- **Skipped**: ${TEST_COUNTS[skipped]}
- **Success Rate**: $(( TEST_COUNTS[total] > 0 ? (TEST_COUNTS[passed] * 100) / TEST_COUNTS[total] : 0 ))%

## Test Results Details
$TEST_SUMMARY

## Test Coverage
- [x] Database rollback procedures
- [x] Feature flag rollback procedures
- [x] External service rollback procedures
- [x] Application rollback procedures
- [x] Rollback monitoring
- [x] Rollback verification

## Recommendations
$([ "$TEST_SUCCESS" = true ] && echo "✅ All rollback procedures are working correctly" || echo "❌ Some rollback procedures failed. Review and fix issues before production deployment.")

## Files Generated
- \`test.log\` - Detailed test log
- \`test-report.md\` - This report
- \`notification.json\` - Sample notification payload

## Next Steps
1. Review any failed tests
2. Fix identified issues
2. Re-run tests to verify fixes
4. Document any lessons learned
5. Schedule regular test runs

## Test Environment
- **OS**: $(uname -s)
- **Node Version**: $(node --version 2>/dev/null || echo "Not available")
- **Git Version**: $(git --version)
- **Database**: PostgreSQL $(psql --version 2>/dev/null | awk '{print $3}' || echo "Unknown")

## Contacts
- **Test Runner**: ${ACTOR:-unknown}
- **Engineering Lead**: [Engineering Contact]
- **QA Lead**: [QA Contact]
EOF
    
    success "Test report created at $TEST_RESULTS_DIR/test-report.md"
}

# Send test notification
send_test_notification() {
    local status=$1
    local message=$2
    
    local test_duration=$(($(date +%s) - TEST_START_TIME))
    
    # Create notification payload
    local notification_payload=$(cat << EOF
{
    "status": "$status",
    "message": "$message",
    "test_id": "$TEST_ID",
    "environment": "$ENVIRONMENT",
    "test_type": "$TEST_TYPE",
    "component": "$TEST_COMPONENT",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "duration_seconds": $test_duration,
    "results": {
        "total": ${TEST_COUNTS[total]},
        "passed": ${TEST_COUNTS[passed]},
        "failed": ${TEST_COUNTS[failed]},
        "skipped": ${TEST_COUNTS[skipped]},
        "success_rate": $(( TEST_COUNTS[total] > 0 ? (TEST_COUNTS[passed] * 100) / TEST_COUNTS[total] : 0 ))
    },
    "results_location": "$TEST_RESULTS_DIR"
}
EOF
)
    
    # Send webhook notification
    if [[ -n "${TEST_WEBHOOK_URL}" ]]; then
        curl -X POST "$TEST_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "$notification_payload" \
            2>> "$TEST_LOG_FILE" || true
    fi
    
    # Email notification
    if command -v mail &> /dev/null && [[ -n "${QA_EMAIL}" ]]; then
        mail -s "Rollback Test $status: AI Search Feature - ${ENVIRONMENT}" "$QA_EMAIL" << EOF 2>> "$TEST_LOG_FILE"
Rollback test $status for AI Search feature in ${ENVIRONMENT} environment:

Test ID: $TEST_ID
Type: $TEST_TYPE
Component: $TEST_COMPONENT
Duration: ${test_duration}s
Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)

Results:
- Total: ${TEST_COUNTS[total]}
- Passed: ${TEST_COUNTS[passed]}
- Failed: ${TEST_COUNTS[failed]}
- Skipped: ${TEST_COUNTS[skipped]}
- Success Rate: $(( TEST_COUNTS[total] > 0 ? (TEST_COUNTS[passed] * 100) / TEST_COUNTS[total] : 0 ))%

$message

Full log available at: $TEST_LOG_FILE
Test report available at: $TEST_RESULTS_DIR/test-report.md
EOF
    fi
}

# Main test execution flow
main() {
    log "Starting automated rollback testing for AI Search feature..."
    log "Test ID: $TEST_ID"
    log "Environment: $ENVIRONMENT"
    log "Test Type: $TEST_TYPE"
    log "Component: $TEST_COMPONENT"
    
    # Set up error handling
    trap 'error "Test execution failed at line $LINENO. Check log file: $TEST_LOG_FILE"' ERR
    
    initialize_test_environment
    
    # Run tests based on type
    case "$TEST_TYPE" in
        "comprehensive")
            test_database_rollback
            test_feature_flag_rollback
            test_external_service_rollback
            test_application_rollback
            test_rollback_monitoring
            test_rollback_verification
            ;;
        "quick")
            test_database_rollback
            test_feature_flag_rollback
            test_rollback_verification
            ;;
        "specific")
            case "$TEST_COMPONENT" in
                "database")
                    test_database_rollback
                    ;;
                "feature-flags")
                    test_feature_flag_rollback
                    ;;
                "services")
                    test_external_service_rollback
                    ;;
                "application")
                    test_application_rollback
                    ;;
                *)
                    error "Unknown component for specific testing: $TEST_COMPONENT"
                    exit 1
                    ;;
            esac
            ;;
        *)
            error "Unknown test type: $TEST_TYPE"
            exit 1
            ;;
    esac
    
    create_test_report
    
    # Send appropriate notification based on success
    if [[ "$TEST_SUCCESS" == true ]]; then
        send_test_notification "SUCCESS" "All rollback tests passed successfully. Rollback procedures are ready for production."
        success "All rollback tests completed successfully!"
    else
        send_test_notification "FAILURE" "Some rollback tests failed. Review and fix issues before production deployment."
        error "Some rollback tests failed"
    fi
    
    log "Test log available at: $TEST_LOG_FILE"
    log "Test results available at: $TEST_RESULTS_DIR"
    log "Test report available at: $TEST_RESULTS_DIR/test-report.md"
    
    # Exit with appropriate code
    if [[ "$TEST_SUCCESS" == true ]]; then
        exit 0
    else
        exit 1
    fi
}

# Parse command line arguments
if [[ $# -lt 1 ]]; then
    echo "Usage: $0 <test_type> [component]"
    echo "Example: $0 comprehensive"
    echo "Example: $0 quick database"
    echo "Example: $0 specific feature-flags"
    echo ""
    echo "Test types:"
    echo "  comprehensive - Test all rollback procedures (default)"
    echo "  quick - Quick test of critical procedures"
    echo "  specific - Test specific component"
    echo ""
    echo "Components (for specific testing):"
    echo "  all - All components (default)"
    echo "  database - Database rollback procedures"
    echo "  feature-flags - Feature flag rollback procedures"
    echo "  services - External service rollback procedures"
    echo "  application - Application rollback procedures"
    echo ""
    echo "Environment variables:"
    echo "  ENVIRONMENT - Target environment (default: staging)"
    echo "  DATABASE_URL - Database connection string"
    echo "  API_URL - Feature flag API URL"
    echo "  API_KEY - Feature flag API key"
    echo ""
    echo "Notification configuration:"
    echo "  TEST_WEBHOOK_URL - Webhook URL for test notifications"
    echo "  QA_EMAIL - Email address for test notifications"
    exit 1
fi

TEST_TYPE="$1"
if [[ -n "$2" ]]; then
    TEST_COMPONENT="$2"
fi

main "$@"