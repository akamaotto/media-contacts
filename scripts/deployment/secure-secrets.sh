#!/bin/bash

# Secure Secrets Management Script for AI Search Feature
# This script handles secure management of API keys and credentials for production

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENVIRONMENT="${ENVIRONMENT:-production}"
LOG_FILE="/tmp/secure-secrets-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).log"
SEED_FILE="/tmp/secrets-seed-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).txt"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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
    
    if ! command -v openssl &> /dev/null; then
        error "OpenSSL command not found. Please install OpenSSL."
    fi
    
    if ! command -v jq &> /dev/null; then
        error "jq command not found. Please install jq for JSON parsing."
    fi
    
    success "Dependencies check passed"
}

# Generate secure random string
generate_secure_string() {
    local length=${1:-32}
    openssl rand -hex $((length / 2))
}

# Generate secure random base64 string
generate_secure_base64() {
    local length=${1:-32}
    openssl rand -base64 $length | tr -d "=+/" | cut -c1-$length
}

# Validate secret strength
validate_secret_strength() {
    local secret=$1
    local secret_name=$2
    
    if [[ ${#secret} -lt 16 ]]; then
        error "$secret_name is too short (minimum 16 characters)"
    fi
    
    if [[ "$secret" =~ ^(.)\1+$ ]]; then
        error "$secret_name cannot consist of repeated characters"
    fi
    
    if [[ "$secret" =~ ^(password|secret|key|admin|test|123|abc) ]]; then
        error "$secret_name cannot use common patterns"
    fi
    
    success "$secret_name strength validation passed"
}

# Generate encryption key
generate_encryption_key() {
    log "Generating encryption key..."
    
    local encryption_key=$(generate_secure_string 32)
    validate_secret_strength "$encryption_key" "Encryption key"
    
    echo "$encryption_key"
}

# Generate NextAuth secret
generate_auth_secret() {
    log "Generating NextAuth secret..."
    
    local auth_secret=$(generate_secure_base64 32)
    validate_secret_strength "$auth_secret" "NextAuth secret"
    
    echo "$auth_secret"
}

# Generate database password
generate_db_password() {
    log "Generating database password..."
    
    local db_password=$(generate_secure_base64 24)
    validate_secret_strength "$db_password" "Database password"
    
    echo "$db_password"
}

# Generate API key placeholders
generate_api_key_placeholders() {
    log "Generating API key placeholders..."
    
    cat << EOF
# API Keys - Replace with actual production keys
# These should be stored in a secure vault or secret management system

# OpenAI Configuration
OPENAI_API_KEY=sk-your-production-openai-api-key-here
OPENAI_ORGANIZATION=org-your-production-organization-id

# Anthropic Configuration
ANTHROPIC_API_KEY=sk-ant-your-production-anthropic-api-key-here

# Exa API Configuration
EXA_API_KEY=your-production-exa-api-key-here

# Firecrawl Configuration
FIRECRAWL_API_KEY=fc-your-production-firecrawl-api-key-here

# Webhook URLs (replace with actual URLs)
DEPLOYMENT_WEBHOOK_URL=https://your-webhook-url.com/deployments
HEALTH_WEBHOOK_URL=https://your-webhook-url.com/health
COST_ALERT_WEBHOOK_URL=https://your-webhook-url.com/cost-alerts
ROLLBACK_WEBHOOK_URL=https://your-webhook-url.com/rollback
MONITORING_WEBHOOK_URL=https://your-webhook-url.com/monitoring

# Admin Configuration
ADMIN_EMAIL=admin@your-domain.com
EOF
}

# Create secure environment file
create_secure_env_file() {
    log "Creating secure environment file..."
    
    local env_file="$PROJECT_ROOT/.env.${ENVIRONMENT}.secure"
    
    cat > "$env_file" << EOF
# Secure Environment Configuration for ${ENVIRONMENT}
# This file contains sensitive information and should be protected
# Generated on: $(date -u +%Y-%m-%dT%H:%M:%SZ)

# Encryption Configuration
AI_ENCRYPTION_KEY=$(generate_encryption_key)

# Authentication Configuration
AUTH_SECRET=$(generate_auth_secret)

# Database Configuration
# Note: Replace the username/password with your actual database credentials
# DATABASE_URL=postgresql://username:$(generate_db_password)@hostname:port/database_name

# API Keys (to be replaced with actual keys)
$(generate_api_key_placeholders)

# Security Headers
ENABLE_SECURITY_HEADERS=true
ENABLE_CSP=true
ENABLE_HSTS=true

# Session Security
SESSION_MAX_AGE=86400
SESSION_UPDATE_AGE=3600
SESSION_SECRET=$(generate_secure_base64 24)

# Rate Limiting
ENABLE_API_RATE_LIMITING=true
API_RATE_LIMIT_REQUESTS_PER_MINUTE=100

# CORS Configuration
CORS_ORIGIN=https://your-production-domain.com
CORS_CREDENTIALS=true

# Logging Security
ENABLE_STRUCTURED_LOGGING=true
ENABLE_REQUEST_LOGGING=false
LOG_LEVEL=info
LOG_REDACT_SECRETS=true

# Feature Flag Security
AI_SEARCH_FEATURE_ENABLED=false
AI_SEARCH_ROLLOUT_PERCENTAGE=0
AI_SEARCH_ALLOWED_USER_SEGMENTS=internal

# Backup Security
ENABLE_AUTOMATIC_BACKUPS=true
BACKUP_ENCRYPTION=true
BACKUP_RETENTION_DAYS=30

# Maintenance Mode
MAINTENANCE_MODE=false
EOF
    
    chmod 600 "$env_file"
    success "Secure environment file created: $env_file"
    log "File permissions set to 600 (read/write for owner only)"
}

# Create Docker secrets file
create_docker_secrets() {
    log "Creating Docker secrets file..."
    
    local secrets_dir="$PROJECT_ROOT/.docker/secrets"
    mkdir -p "$secrets_dir"
    
    # Create individual secret files
    echo "$(generate_encryption_key)" > "$secrets_dir/ai_encryption_key.txt"
    echo "$(generate_auth_secret)" > "$secrets_dir/auth_secret.txt"
    echo "$(generate_secure_base64 24)" > "$secrets_dir/session_secret.txt"
    
    # Set secure permissions
    chmod 600 "$secrets_dir"/*
    
    success "Docker secrets created in $secrets_dir"
}

# Create Kubernetes secrets manifest
create_kubernetes_secrets() {
    log "Creating Kubernetes secrets manifest..."
    
    local k8s_dir="$PROJECT_ROOT/.k8s/secrets"
    mkdir -p "$k8s_dir"
    
    cat > "$k8s_dir/ai-search-secrets.yaml" << EOF
apiVersion: v1
kind: Secret
metadata:
  name: ai-search-secrets
  namespace: media-contacts
  labels:
    app: media-contacts
    component: ai-search
type: Opaque
data:
  # Base64 encoded values - replace with actual encoded values
  ai-encryption-key: $(generate_encryption_key | base64)
  auth-secret: $(generate_auth_secret | base64)
  session-secret: $(generate_secure_base64 24 | base64)
  # Add other secrets as needed
  # openai-api-key: $(echo -n "sk-your-production-openai-api-key-here" | base64)
  # anthropic-api-key: $(echo -n "sk-ant-your-production-anthropic-api-key-here" | base64)
---
apiVersion: v1
kind: Secret
metadata:
  name: ai-search-webhooks
  namespace: media-contacts
  labels:
    app: media-contacts
    component: ai-search
type: Opaque
data:
  # Base64 encoded webhook URLs
  deployment-webhook: $(echo -n "https://your-webhook-url.com/deployments" | base64)
  health-webhook: $(echo -n "https://your-webhook-url.com/health" | base64)
  cost-alert-webhook: $(echo -n "https://your-webhook-url.com/cost-alerts" | base64)
  rollback-webhook: $(echo -n "https://your-webhook-url.com/rollback" | base64)
  monitoring-webhook: $(echo -n "https://your-webhook-url.com/monitoring" | base64)
EOF
    
    success "Kubernetes secrets manifest created: $k8s_dir/ai-search-secrets.yaml"
}

# Create GitHub Actions secrets guide
create_github_secrets_guide() {
    log "Creating GitHub Actions secrets guide..."
    
    local guide_file="$PROJECT_ROOT/docs/github-secrets-guide.md"
    mkdir -p "$(dirname "$guide_file")"
    
    cat > "$guide_file" << EOF
# GitHub Actions Secrets Guide

This guide outlines the required secrets for the AI Search Feature deployment in GitHub Actions.

## Required Secrets

### Database and Authentication
- \`PROD_DATABASE_URL\`: Production database connection string
- \`PROD_REDIS_URL\`: Production Redis connection string
- \`PROD_AUTH_SECRET\`: Production NextAuth secret
- \`PROD_AUTH_URL\`: Production application URL

### AI Service API Keys
- \`OPENAI_API_KEY\`: OpenAI API key
- \`OPENAI_ORGANIZATION\`: OpenAI organization ID
- \`ANTHROPIC_API_KEY\`: Anthropic API key
- \`EXA_API_KEY\`: Exa API key
- \`FIRECRAWL_API_KEY\`: Firecrawl API key

### Security and Encryption
- \`AI_ENCRYPTION_KEY\`: 32-character hex encryption key
- \`PROD_API_KEY\`: Production API key for internal services

### Webhook URLs
- \`DEPLOYMENT_WEBHOOK_URL\`: Deployment notification webhook
- \`HEALTH_WEBHOOK_URL\`: Health check notification webhook
- \`COST_ALERT_WEBHOOK_URL\`: Cost alert notification webhook
- \`ROLLBACK_WEBHOOK_URL\`: Rollback notification webhook
- \`MONITORING_WEBHOOK_URL\`: Monitoring notification webhook

### Configuration
- \`ADMIN_EMAIL\`: Administrator email for notifications
- \`PROD_API_URL\`: Production API base URL

## Setting Up Secrets

### Using GitHub CLI
\`\`\`bash
# Set individual secrets
gh secret set PROD_DATABASE_URL --body "postgresql://user:pass@host:5432/db"
gh secret set OPENAI_API_KEY --body "sk-your-openai-key"
gh secret set AI_ENCRYPTION_KEY --body "your-32-character-hex-key"

# Set secrets from file
gh secret set PROD_AUTH_SECRET < auth-secret.txt
\`\`\`

### Using GitHub Web UI
1. Go to your repository settings
2. Click on "Secrets and variables" > "Actions"
3. Click "New repository secret"
4. Enter the name and value
5. Click "Add secret"

## Generating Secure Values

### Encryption Key
\`\`\`bash
openssl rand -hex 32
\`\`\`

### Auth Secret
\`\`\`bash
openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
\`\`\`

### Database Password
\`\`\`bash
openssl rand -base64 24 | tr -d "=+/" | cut -c1-24
\`\`\`

## Security Best Practices

1. **Never commit secrets to version control**
2. **Use different secrets for different environments**
3. **Rotate secrets regularly**
4. **Use strong, randomly generated values**
5. **Limit access to secrets to necessary team members**
6. **Monitor for secret exposure**
7. **Use GitHub's audit log to track secret access**

## Environment-Specific Secrets

### Production
- All secrets with \`PROD_\` prefix
- Use production API keys and URLs
- Enable all security features

### Staging
- All secrets with \`STAGING_\` prefix
- Use staging/test API keys
- Can enable debug features

## Secret Rotation

1. Generate new secret values
2. Update the secret in GitHub
3. Redeploy the application
4. Verify functionality
5. Delete old secret values

## Troubleshooting

### Common Issues
- **Secret not found**: Ensure the secret is set in the correct repository/environment
- **Invalid format**: Check that secret values don't contain special characters that need escaping
- **Permission denied**: Ensure the workflow has permission to access the secret

### Debugging
Add steps to your workflow to display secret names (not values):
\`\`\`yaml
- name: Debug secrets
  run: |
    echo "Available secrets:"
    echo "\${{ secrets.PROD_DATABASE_URL && 'PROD_DATABASE_URL is set' || 'PROD_DATABASE_URL is not set' }}"
    echo "\${{ secrets.OPENAI_API_KEY && 'OPENAI_API_KEY is set' || 'OPENAI_API_KEY is not set' }}"
\`\`\`
EOF
    
    success "GitHub Actions secrets guide created: $guide_file"
}

# Create secret validation script
create_secret_validation_script() {
    log "Creating secret validation script..."
    
    local validation_script="$PROJECT_ROOT/scripts/deployment/validate-secrets.sh"
    
    cat > "$validation_script" << 'EOF'
#!/bin/bash

# Secret Validation Script
# Validates that all required secrets are properly configured

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Required secrets
REQUIRED_SECRETS=(
    "DATABASE_URL"
    "AUTH_SECRET"
    "OPENAI_API_KEY"
    "ANTHROPIC_API_KEY"
    "AI_ENCRYPTION_KEY"
)

# Optional but recommended secrets
RECOMMENDED_SECRETS=(
    "EXA_API_KEY"
    "FIRECRAWL_API_KEY"
    "DEPLOYMENT_WEBHOOK_URL"
    "HEALTH_WEBHOOK_URL"
    "COST_ALERT_WEBHOOK_URL"
)

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Validate secret format
validate_secret_format() {
    local secret_name=$1
    local secret_value=$2
    
    case $secret_name in
        "DATABASE_URL")
            if [[ ! "$secret_value" =~ ^postgresql:// ]]; then
                error "$secret_name must be a valid PostgreSQL connection string"
                return 1
            fi
            ;;
        "AUTH_SECRET")
            if [[ ${#secret_value} -lt 16 ]]; then
                error "$secret_name must be at least 16 characters long"
                return 1
            fi
            ;;
        "OPENAI_API_KEY")
            if [[ ! "$secret_value" =~ ^sk- ]]; then
                error "$secret_name must start with 'sk-'"
                return 1
            fi
            ;;
        "ANTHROPIC_API_KEY")
            if [[ ! "$secret_value" =~ ^sk-ant- ]]; then
                error "$secret_name must start with 'sk-ant-'"
                return 1
            fi
            ;;
        "AI_ENCRYPTION_KEY")
            if [[ ! "$secret_value" =~ ^[a-f0-9]{32}$ ]]; then
                error "$secret_name must be a 32-character hex string"
                return 1
            fi
            ;;
    esac
    
    return 0
}

# Check required secrets
check_required_secrets() {
    log "Checking required secrets..."
    
    local all_valid=true
    
    for secret in "${REQUIRED_SECRETS[@]}"; do
        if [[ -z "${!secret}" ]]; then
            error "Required secret $secret is not set"
            all_valid=false
        else
            if validate_secret_format "$secret" "${!secret}"; then
                success "$secret is properly configured"
            else
                all_valid=false
            fi
        fi
    done
    
    return $([[ "$all_valid" == true ]] && echo 0 || echo 1)
}

# Check recommended secrets
check_recommended_secrets() {
    log "Checking recommended secrets..."
    
    for secret in "${RECOMMENDED_SECRETS[@]}"; do
        if [[ -z "${!secret}" ]]; then
            warning "Recommended secret $secret is not set"
        else
            success "$secret is configured"
        fi
    done
}

# Test API connectivity
test_api_connectivity() {
    log "Testing API connectivity..."
    
    # Test OpenAI API
    if [[ -n "$OPENAI_API_KEY" ]]; then
        if curl -f -s -H "Authorization: Bearer $OPENAI_API_KEY" \
            https://api.openai.com/v1/models > /dev/null; then
            success "OpenAI API is accessible"
        else
            error "OpenAI API is not accessible"
        fi
    fi
    
    # Test Anthropic API
    if [[ -n "$ANTHROPIC_API_KEY" ]]; then
        if curl -f -s -H "x-api-key: $ANTHROPIC_API_KEY" \
            https://api.anthropic.com/v1/messages > /dev/null; then
            success "Anthropic API is accessible"
        else
            error "Anthropic API is not accessible"
        fi
    fi
}

# Main validation
main() {
    log "Starting secret validation..."
    
    local validation_passed=true
    
    if ! check_required_secrets; then
        validation_passed=false
    fi
    
    check_recommended_secrets
    test_api_connectivity
    
    if [[ "$validation_passed" == true ]]; then
        success "All required secrets are properly configured"
        exit 0
    else
        error "Some required secrets are missing or invalid"
        exit 1
    fi
}

# Run validation
main
EOF
    
    chmod +x "$validation_script"
    success "Secret validation script created: $validation_script"
}

# Create seed file for manual reference
create_seed_file() {
    log "Creating seed file for manual reference..."
    
    cat > "$SEED_FILE" << EOF
# Secure Secrets Seed File for AI Search Feature
# Generated on: $(date -u +%Y-%m-%dT%H:%M:%SZ)
# Environment: $ENVIRONMENT
# 
# IMPORTANT: This file contains generated secrets for reference only.
# Store these values in a secure vault or password manager.
# Do not commit this file to version control.

# Encryption Key (32-character hex)
AI_ENCRYPTION_KEY=$(generate_encryption_key)

# NextAuth Secret (32-character base64)
AUTH_SECRET=$(generate_auth_secret)

# Session Secret (24-character base64)
SESSION_SECRET=$(generate_secure_base64 24)

# Database Password (24-character base64)
DB_PASSWORD=$(generate_db_password)

# Additional Secure Keys (as needed)
BACKUP_KEY=$(generate_secure_base64 32)
WEBHOOK_SECRET=$(generate_secure_base64 24)
EOF
    
    chmod 600 "$SEED_FILE"
    success "Seed file created: $SEED_FILE"
    warning "This file contains sensitive information. Store it securely and delete when no longer needed."
}

# Main function
main() {
    log "Starting secure secrets management for ${ENVIRONMENT} environment..."
    
    check_dependencies
    create_secure_env_file
    create_docker_secrets
    create_kubernetes_secrets
    create_github_secrets_guide
    create_secret_validation_script
    create_seed_file
    
    success "Secure secrets management completed"
    log ""
    log "Next steps:"
    log "1. Store the generated secrets in your preferred secret management system"
    log "2. Update the placeholder values in the secure environment file with actual API keys"
    log "3. Configure GitHub Actions secrets using the provided guide"
    log "4. Test the secret validation script before deployment"
    log "5. Store the seed file securely and delete when no longer needed"
    log ""
    log "Files created:"
    log "- Secure environment file: .env.${ENVIRONMENT}.secure"
    log "- Docker secrets: .docker/secrets/"
    log "- Kubernetes secrets: .k8s/secrets/ai-search-secrets.yaml"
    log "- GitHub Actions guide: docs/github-secrets-guide.md"
    log "- Validation script: scripts/deployment/validate-secrets.sh"
    log "- Seed file: $SEED_FILE"
}

# Parse command line arguments
case "${1:-generate}" in
    "generate")
        main
        ;;
    "validate")
        if [[ -f "$PROJECT_ROOT/scripts/deployment/validate-secrets.sh" ]]; then
            "$PROJECT_ROOT/scripts/deployment/validate-secrets.sh"
        else
            error "Validation script not found. Run generate first."
        fi
        ;;
    "rotate")
        log "Secret rotation not implemented yet. Please run generate and update manually."
        ;;
    *)
        echo "Usage: $0 {generate|validate|rotate}"
        echo "Environment: Set ENVIRONMENT variable (default: production)"
        exit 1
        ;;
esac