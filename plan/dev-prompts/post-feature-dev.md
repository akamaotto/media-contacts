# Post-Feature Development: Product Owner & Technical PM QA

## Purpose
This comprehensive prompt handles final product owner and technical PM level quality assurance for completed features, including end-to-end user testing, data validation, deployment verification, and go-live readiness checks.

## Usage
Run this prompt when a feature has been fully developed and needs:
- Product-level validation from user perspective
- Technical PM verification of deployment readiness
- End-to-end testing with real data scenarios
- Edge case and error handling validation
- Production deployment and monitoring setup
- Go-live readiness assessment

## Input Parameters
- **feature_name**: Name of the completed feature (e.g., "ai-search-service")
- **feature_branch**: Current feature branch (e.g., "feature/ai-search-service")
- **main_branch**: Target main branch (usually "main")
- **deployment_env**: Target deployment environment (staging/production)
- **test_data_sets**: Comma-separated test data categories (e.g., "basic,edge,error")

## Output Workflow

### Phase 1: User Journey Validation

#### 1.1 Primary Use Case Testing
Create and test 2-3 comprehensive user scenarios:

**Scenario 1: Standard User Workflow**
- [ ] **New user onboarding** through the feature
  ```bash
  # Test user registration and first-time feature use
  npm run test:e2e -- --spec="user-workflows/new-user-{feature}.spec.ts"
  ```
- [ ] **Complete feature journey** from start to finish
- [ ] **Data persistence validation** - verify data saves correctly to database
- [ ] **User feedback collection** - confirm analytics events fire
- [ ] **Cross-device consistency** - test mobile and desktop experiences

**Scenario 2: Power User Workflow**
- [ ] **Advanced feature usage** - test all feature options and settings
- [ ] **Bulk operations testing** - if applicable (import/export, batch processing)
- [ ] **Integration testing** - verify feature works with existing system components
- [ ] **Performance under load** - test with realistic user volumes
- [ ] **Data integrity validation** - ensure no corruption during complex operations

**Scenario 3: Edge Case User Workflow**
- [ ] **Error recovery scenarios** - test graceful failure handling
- [ ] **Network interruption testing** - simulate connection issues
- [ ] **Concurrent user testing** - multiple users using feature simultaneously
- [ ] **Data limit testing** - test with maximum allowed data sizes
- [ ] **Permission boundary testing** - verify role-based access controls

#### 1.2 Database Integrity Validation
- [ ] **Data Model Verification**
  ```bash
  # Check database schema and constraints
  npx prisma db validate
  npx prisma migrate deploy --preview-feature
  ```
- [ ] **Data Consistency Checks** - verify referential integrity
- [ ] **Audit Trail Validation** - confirm all operations are logged
- [ ] **Data Retention Testing** - verify cleanup policies work
- [ ] **Backup/Restore Testing** - ensure data can be recovered

#### 1.3 Real Data Simulation
- [ ] **Production-like Data Setup**
  ```bash
  # Seed with realistic test data
  npm run seed:sample -- --feature={feature_name} --count=1000
  ```
- [ ] **Data Volume Testing** - test with expected production volumes
- [ ] **Data Variety Testing** - test with different data types and edge cases
- [ ] **Long-term Data Testing** - simulate data aging and archival

### Phase 2: Technical PM Validation

#### 2.1 API Contract Verification
- [ ] **OpenAPI/Swagger Documentation Validation**
  ```bash
  # Test API documentation completeness
  npm run test:api-docs
  ```
- [ ] **Response Format Consistency** - verify all endpoints return expected formats
- [ ] **Error Code Standardization** - ensure proper HTTP status codes and error messages
- [ ] **Rate Limiting Validation** - test API throttling mechanisms
- [ ] **Authentication/Authorization Testing** - verify security controls

#### 2.2 Performance Benchmarking
- [ ] **Load Testing**
  ```bash
  # Run performance tests
  npm run test:performance -- --feature={feature_name}
  ```
- [ ] **Response Time Validation** - ensure sub-200ms response times
- [ ] **Concurrent User Testing** - validate 100+ simultaneous users
- [ ] **Memory Usage Monitoring** - check for memory leaks
- [ ] **Database Query Optimization** - verify query performance

#### 2.3 Security Validation
- [ ] **Vulnerability Scanning**
  ```bash
  # Security audit
  npm audit
  npm run test:security
  ```
- [ ] **Authentication Testing** - verify secure login/logout flows
- [ ] **Data Encryption Validation** - ensure sensitive data is encrypted
- [ ] **Input Sanitization Testing** - prevent XSS and injection attacks
- [ ] **CORS Configuration Testing** - verify cross-origin security

### Phase 3: Deployment Readiness

#### 3.1 Build and Package Validation
- [ ] **Production Build Testing**
  ```bash
  # Build for production
  npm run build
  npm run start:prod &
  ```
- [ ] **Environment Variable Validation** - verify all required env vars
- [ ] **Dependency Security Check** - ensure no vulnerable dependencies
- [ ] **Asset Optimization Validation** - verify proper bundling and compression
- [ ] **Configuration Management** - test environment-specific configs

#### 3.2 Staging Environment Testing
- [ ] **Staging Deployment**
  ```bash
  # Deploy to staging
  git checkout staging
  git merge {feature_branch}
  git push origin staging
  # Trigger staging deployment via CI/CD
  ```
- [ ] **Feature Integration Testing** - verify feature works in staging
- [ ] **Database Migration Testing** - verify migrations run successfully
- [ ] **External Service Integration** - test third-party API connections
- [ ] **Monitoring and Logging Validation** - ensure observability works

#### 3.3 Production Preparation
- [ ] **Rollback Plan Creation**
  ```bash
  # Create rollback migration
  npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > rollback.sql
  ```
- [ ] **Feature Flag Setup** - configure gradual rollout capability
- [ ] **Monitoring Dashboard Setup** - create feature-specific metrics
- [ ] **Alert Configuration** - set up appropriate alerts and notifications
- [ ] **Documentation Updates** - update runbooks and deployment guides

### Phase 4: Edge Case Testing

#### 4.1 Error Handling Validation
- [ ] **Network Error Simulation**
  ```bash
  # Test network failures
  npm run test:e2e -- --spec="edge-cases/network-failures.spec.ts"
  ```
- [ ] **Database Connection Failure Testing**
- [ ] **Third-party Service Outage Testing**
- [ ] **Memory Exhaustion Testing**
- [ ] **File System Error Testing**

#### 4.2 Boundary Condition Testing
- [ ] **Maximum Data Size Testing** - test with largest allowed data
- [ ] **Minimum Data Size Testing** - test with smallest valid data
- [ ] **Null/Empty Value Handling** - verify graceful handling of missing data
- [ ] **Character Encoding Testing** - test with special characters and emojis
- [ ] **Time Zone Testing** - verify proper timezone handling

#### 4.3 Concurrent Access Testing
- [ ] **Race Condition Testing**
  ```bash
  # Test concurrent operations
  npm run test:concurrent -- --feature={feature_name}
  ```
- [ ] **Database Lock Testing** - verify proper transaction handling
- [ ] **Session Management Testing** - test multiple user sessions
- [ ] **Resource Contention Testing** - verify fair resource allocation

### Phase 5: Go-Live Validation

#### 5.1 Pre-Deployment Checklist
- [ ] **Code Review Completion** - ensure all PRs are approved and merged
- [ ] **Test Suite Validation** - all tests passing with >90% coverage
- [ ] **Security Scan Completion** - no high-severity vulnerabilities
- [ ] **Performance Benchmarks Met** - all performance criteria satisfied
- [ ] **Documentation Completeness** - all docs updated and reviewed

#### 5.2 Production Deployment
- [ ] **Database Migration Execution**
  ```bash
  # Execute production migrations
  npx prisma migrate deploy
  ```
- [ ] **Application Deployment**
  ```bash
  # Deploy to production
  git checkout {main_branch}
  git merge {feature_branch}
  git push origin {main_branch}
  # Trigger production deployment via CI/CD
  ```
- [ ] **Health Check Validation** - verify application is running correctly
- [ ] **Feature Flag Activation** - enable feature for users
- [ ] **Monitoring Verification** - confirm all monitoring is working

#### 5.3 Post-Deployment Validation
- [ ] **Smoke Testing** - run quick validation tests
  ```bash
  # Post-deployment smoke tests
  npm run test:smoke
  ```
- [ ] **User Acceptance Testing** - validate with real users
- [ ] **Performance Monitoring** - watch for performance degradation
- [ ] **Error Rate Monitoring** - ensure no increase in errors
- [ ] **User Feedback Collection** - gather initial user feedback

### Phase 6: Product Marketing Validation

#### 6.1 Feature Documentation
- [ ] **User Guide Creation** - write comprehensive user documentation
- [ ] **API Documentation Update** - update technical documentation
- [ ] **Changelog Preparation** - document what's new and changed
- [ ] **FAQ Creation** - anticipate common user questions
- [ ] **Tutorial Content** - create step-by-step guides

#### 6.2 Marketing Materials
- [ ] **Feature Announcement Preparation** - draft communication materials
- [ ] **Demo Script Creation** - prepare demonstration materials
- [ ] **Screenshot/Video Capture** - create visual materials
- [ ] **Value Proposition Validation** - ensure benefits are clearly communicated
- [ ] **Competitive Analysis Update** - update competitive positioning

#### 6.3 User Communication
- [ ] **Release Notes Preparation** - write clear, user-focused release notes
- [ ] **In-App Messaging Setup** - configure user notifications
- [ ] **Email Campaign Preparation** - prepare user outreach
- [ ] **Support Team Training** - ensure support team is prepared
- [ ] **Feedback Channel Setup** - establish ways for users to provide feedback

### Phase 7: Monitoring and Analytics

#### 7.1 Analytics Setup
- [ ] **Feature Usage Tracking**
  ```bash
  # Verify analytics events
  npm run test:analytics -- --feature={feature_name}
  ```
- [ ] **User Behavior Analytics** - set up funnel tracking
- [ ] **Performance Metrics Collection** - configure performance monitoring
- [ ] **Error Tracking Setup** - ensure errors are properly tracked
- [ ] **Business Metrics Definition** - define success metrics

#### 7.2 Alert Configuration
- [ ] **Performance Alerts** - set up alerts for slow response times
- [ ] **Error Rate Alerts** - configure alerts for increased error rates
- [ ] **Usage Alerts** - set up alerts for unusual usage patterns
- [ ] **Resource Alerts** - monitor CPU, memory, and disk usage
- [ ] **Business Metrics Alerts** - alert on KPI thresholds

#### 7.3 Dashboard Setup
- [ ] **Feature Performance Dashboard** - create feature-specific monitoring
- [ ] **User Adoption Dashboard** - track feature usage and adoption
- [ ] **Business Impact Dashboard** - measure business value delivered
- [ ] **Technical Health Dashboard** - monitor system health
- [ ] **Support Metrics Dashboard** - track support requests and resolutions

## Implementation Instructions for AI

### Step 1: Prepare Test Environment
1. **Set up test data** - create realistic test scenarios
2. **Configure test environments** - ensure staging and production are ready
3. **Set up monitoring tools** - configure all necessary monitoring
4. **Prepare rollback procedures** - ensure you can revert if needed

### Step 2: Execute User Journey Testing
1. **Run primary use cases** - test standard user workflows
2. **Validate data persistence** - ensure data is correctly stored
3. **Test edge cases** - verify error handling and recovery
4. **Document findings** - record all test results and issues

### Step 3: Perform Technical Validation
1. **Run performance tests** - validate performance benchmarks
2. **Execute security scans** - ensure no vulnerabilities
3. **Test integrations** - verify all external connections work
4. **Validate monitoring** - ensure all observability is working

### Step 4: Deploy and Validate
1. **Execute deployment** - follow deployment procedures
2. **Run smoke tests** - verify basic functionality
3. **Monitor health** - watch for issues post-deployment
4. **Collect user feedback** - gather initial user reactions

### Step 5: Complete Documentation
1. **Update all documentation** - ensure docs are current
2. **Prepare communication materials** - get marketing materials ready
3. **Train support team** - ensure support is prepared
4. **Finalize go-live decision** - make final deployment decision

## Quality Checklists

### Product Owner Validation Checklist
- [ ] User journeys are complete and intuitive
- [ ] Feature meets business requirements
- [ ] User experience is consistent with brand standards
- [ ] Data accuracy and integrity are validated
- [ ] Performance meets user expectations
- [ ] Security and privacy requirements are met
- [ ] Documentation is user-friendly and complete
- [ ] Support processes are established

### Technical PM Validation Checklist
- [ ] Technical requirements are fully implemented
- [ ] Performance benchmarks are achieved
- [ ] Security scanning shows no critical issues
- [ ] Monitoring and alerting are properly configured
- [ ] Deployment procedures are tested and documented
- [ ] Rollback procedures are validated
- [ ] Scalability requirements are met
- [ ] Integration with existing systems is verified

### Deployment Readiness Checklist
- [ ] All code is reviewed and approved
- [ ] Test suite passes with required coverage
- [ ] Security scan shows no high-severity issues
- [ ] Performance benchmarks are met
- [ ] Documentation is complete and reviewed
- [ ] Monitoring and alerting are configured
- [ ] Rollback procedures are tested
- [ ] Stakeholder approval is obtained

### Go-Live Checklist
- [ ] Production deployment is successful
- [ ] Health checks are passing
- [ ] Monitoring shows normal system behavior
- [ ] Initial user testing is successful
- [ ] Support team is ready and trained
- [ ] Communication materials are distributed
- [ ] Feature flags are properly configured
- [ ] Business metrics are being tracked

## Error Handling and Recovery

### Common Deployment Issues
1. **Database Migration Failures**: Rollback migrations and investigate
2. **Application Startup Failures**: Check logs and configuration
3. **Performance Degradation**: Scale resources or optimize queries
4. **Integration Failures**: Verify external service connections
5. **User Experience Issues**: Monitor feedback and fix quickly

### Post-Deployment Monitoring
1. **Error Rate Monitoring**: Watch for increased error rates
2. **Performance Monitoring**: Track response times and throughput
3. **User Adoption Tracking**: Monitor feature usage patterns
4. **Business Metrics**: Track KPIs and success metrics
5. **Support Tickets**: Monitor and respond to user issues

## Success Metrics

### Product Success Metrics
- **User Adoption Rate**: % of users actively using the feature
- **User Satisfaction Score**: Feedback ratings from users
- **Task Completion Rate**: % of users successfully completing intended tasks
- **Feature Usage Frequency**: How often users interact with the feature
- **Business Impact**: Measurable business value delivered

### Technical Success Metrics
- **System Uptime**: >99.9% availability
- **Response Time**: <200ms average response time
- **Error Rate**: <0.1% error rate
- **Test Coverage**: >90% code coverage
- **Security Score**: No high-severity vulnerabilities

### Deployment Success Metrics
- **Deployment Time**: <30 minutes for complete deployment
- **Rollback Success**: 100% successful rollback when needed
- **Zero-Downtime**: No service interruption during deployment
- **Monitoring Coverage**: 100% of critical components monitored
- **Alert Effectiveness**: <5% false positive rate

## Expected Output

The AI should provide:
1. **Test Results Summary**: All test scenarios executed and results
2. **Deployment Status**: Current deployment state and health
3. **Issue Resolution**: Any issues found and how they were resolved
4. **Go-Live Decision**: Final recommendation on production readiness
5. **Post-Launch Monitoring**: Initial performance and user feedback data
6. **Next Steps**: Recommendations for continued improvement

Example:
```
✅ Feature {feature_name} Go-Live Validation Complete
- 15 user scenarios tested, all passing
- 5 edge cases validated, 2 minor issues resolved
- Performance benchmarks met (avg response time: 145ms)
- Security scan: 0 high-severity vulnerabilities
- Production deployment successful
- Initial user feedback: 4.6/5 stars from 50 users
- Monitoring: All systems healthy, alerts configured
- Recommendation: PROCEED WITH FULL ROLLOUT
```