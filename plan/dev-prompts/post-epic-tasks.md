# Post-Epic Tasks: Completeness, QA, and Deployment Automation

## Purpose
This comprehensive prompt handles all post-development tasks for an epic, including completeness checks, parity validation, QA testing, bug fixes, gap completion, and automated deployment workflows.

## Usage
Run this prompt when you have completed all stories in an epic and need to:
- Validate epic completeness and parity
- Perform comprehensive QA testing
- Fix any identified bugs or gaps
- Automate git operations and deployment
- Create pull requests for review

## Input Parameters
- **epic_folder_path**: Path to the epic folder containing stories (e.g., "plan/{feature}/stories/epic-1-foundation-infrastructure")
- **feature_branch**: Base feature branch name (e.g., "feature/{feature-name}")
- **epic_number**: The epic number for consistent naming (e.g., "1")
- **epic_name**: The epic name for reference (e.g., "foundation-infrastructure")
- **feature_path**: Path to the feature planning directory (e.g., "plan/{feature}")

## Output Workflow

### Phase 1: Epic Analysis and Validation

#### 1.1 Story Discovery and Completeness Check
- [ ] **Inventory all stories** in the epic folder
- [ ] **Validate story structure** matches expected format
- [ ] **Check for missing stories** based on implementation-tasks.mdc
- [ ] **Verify story metadata** (status, assignee, priority, estimated time)
- [ ] **Cross-reference dependencies** between stories
- [ ] **Check task-tracker.md** for epic status and story completion

#### 1.2 Parity Validation
- [ ] **Compare stories against implementation tasks** ensuring 100% coverage
- [ ] **Validate technical specifications** alignment
- [ ] **Check API contract coverage** across all stories
- [ ] **Verify database schema completeness** if applicable
- [ ] **Ensure testing strategy coverage** for all components

#### 1.3 Quality Assurance Analysis
- [ ] **Review acceptance criteria** specificity and measurability
- [ ] **Validate technical requirements** completeness
- [ ] **Check testing requirements** thoroughness
- [ ] **Verify definition of done** clarity and achievability
- [ ] **Assess story sizing** and complexity distribution

### Phase 2: Implementation Validation

#### 2.1 Code Completeness Check
```bash
# Find all story implementation files
find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | grep -E "(story|epic)" | head -20

# Check for test files
find . -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.spec.ts" | grep -E "(story|epic)" | head -20

# Verify database migrations exist (if applicable)
ls -la prisma/migrations/ | grep -E "({feature}|epic|story)"

# Check API routes implementation (if applicable)
ls -la src/app/api/ | grep -E "({feature}|ai|search|epic)"
```

#### 2.2 Testing Coverage Validation
```bash
# Run unit tests for the epic
npm test -- --testPathPattern="story|epic|{feature-specific}" --coverage

# Run integration tests
npm run test:integration -- --testPathPattern="{feature-specific}"

# Run E2E tests if applicable
npm run test:e2e -- --spec="{feature-specific}"
```

#### 2.3 Database and Migration Validation (if applicable)
```bash
# Check database schema changes
npx prisma db pull
npx prisma generate

# Validate migration files
npx prisma migrate deploy --preview-feature

# Test database in staging
npm run db:validate
```

### Phase 3: Bug Detection and Gap Analysis

#### 3.1 Automated Bug Detection
- [ ] **Lint and format checking**
  ```bash
  npm run lint
  npm run format:check
  ```

- [ ] **Type safety validation**
  ```bash
  npx tsc --noEmit
  ```

- [ ] **Security vulnerability scanning**
  ```bash
  npm audit
  ```

- [ ] **Performance regression testing**
  ```bash
  npm run test:performance
  ```

#### 3.2 Gap Identification
- [ ] **Missing error handling** patterns
- [ ] **Incomplete validation logic**
- [ ] **Missing accessibility features**
- [ ] **Incomplete documentation**
- [ ] **Missing monitoring/observability**
- [ ] **Cross-story integration issues**

#### 3.3 Bug Fixing and Gap Completion
For each identified issue:
- [ ] **Create bug ticket** in issue tracker
- [ ] **Assign priority** based on severity
- [ ] **Implement fix** following coding standards
- [ ] **Add regression tests** to prevent recurrence
- [ ] **Update documentation** as needed

### Phase 4: Task Tracker Validation and Updates

#### 4.1 Task Tracker Analysis
- [ ] **Read tasks-tracker.md** from the feature directory
- [ ] **Verify epic status** reflects current completion state
- [ ] **Check story completion checkboxes** match actual implementation status
- [ ] **Validate progress percentages** are calculated correctly
- [ ] **Review completion dates** for finished stories
- [ ] **Check for orphaned stories** not assigned to epics

#### 4.2 Task Tracker Synchronization
For each story in the epic:
- [ ] **Update story status** from 'in-progress' to 'completed'
- [ ] **Mark completion checkbox** (☐ → ☑ or [ ] → [x])
- [ ] **Add completion date** if not already present
- [ ] **Update completion notes** with implementation details
- [ ] **Verify assignee information** is correct

#### 4.3 Epic Progress Recalculation
- [ ] **Count completed stories** for the epic
- [ ] **Calculate completion percentage** (completed/total × 100)
- [ ] **Update epic status** in progress summary table
- [ ] **Review overall feature progress** impact
- [ ] **Validate consistency** across all metrics

#### 4.4 Task Tracker Validation
```bash
# Example task-tracker.md update process
# Before completion:
| ☐ Story 1.1: Implement API endpoints | in-progress | dev-team | | Basic CRUD operations |
| ☐ Story 1.2: Add data validation | in-progress | dev-team | | Input sanitization |
| ☐ Story 1.3: Write tests | completed | dev-team | 2024-01-15 | Unit and integration tests |

# After epic completion:
| ☑ Story 1.1: Implement API endpoints | completed | dev-team | 2024-01-16 | Full REST API with validation |
| ☑ Story 1.2: Add data validation | completed | dev-team | 2024-01-16 | Comprehensive validation pipeline |
| ☑ Story 1.3: Write tests | completed | dev-team | 2024-01-15 | 95% code coverage achieved |

# Epic progress update:
| Epic 1: Backend Infrastructure | completed | 100% | 3/3 | 3 |
```

#### 4.5 Commit Task Tracker Updates
```bash
# Commit task tracker changes
git add plan/{feature}/tasks-tracker.md
git commit -m "feat(epic-{epic_number}): update task-tracker.md with epic completion

- Mark all stories in Epic {epic_number} as completed
- Update epic status to 'completed'
- Recalculate progress percentages
- Add completion dates and notes
- Update overall feature progress

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Phase 5: Epic Integration Testing

#### 5.1 Cross-Story Integration
- [ ] **Test all stories working together** as a complete epic
- [ ] **Validate epic-level acceptance criteria**
- [ ] **Test data flow** between stories/components
- [ ] **Verify shared resources** work correctly

#### 5.2 Performance Testing
- [ ] **Load testing** for epic-level functionality
- [ ] **Memory usage validation**
- [ ] **Database query optimization** verification
- [ ] **API response time** benchmarks

#### 5.3 Security Testing
- [ ] **Authentication and authorization** across the epic
- [ ] **Data validation and sanitization**
- [ ] **Rate limiting and throttling**
- [ ] **Cross-site scripting (XSS)** protection
- [ ] **SQL injection** prevention

### Phase 6: Automated Git Operations

#### 6.1 Git Status and Preparation
```bash
# Check current git status
git status

# Create epic-specific branch
git checkout -b "epic-{epic_number}-{epic_name}-complete"

# Stage all changes
git add .
```

#### 6.2 Comprehensive Commit Strategy
```bash
# Commit database changes (if applicable)
git add prisma/migrations/ prisma/schema.prisma
git commit -m "feat(epic-{epic_number}): database schema updates

- Add {feature} tables and functions
- Implement RLS policies
- Add performance indexes
- Update relevant tables with {feature} fields

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Commit API implementations (if applicable)
git add src/app/api/{feature}/
git commit -m "feat(epic-{epic_number}): {feature} API endpoints

- Implement {service_name} orchestration
- Add {data_type} extraction pipeline
- Add query generation service
- Implement rate limiting and validation

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Commit frontend components (if applicable)
git add src/components/features/{feature}/
git commit -m "feat(epic-{epic_number}): {feature} frontend components

- Add {feature} modal and forms
- Implement progress tracking
- Add results display components
- Integrate with existing UI

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Commit tests
git add __tests__/ src/lib/**/__tests__/
git commit -m "test(epic-{epic_number}): comprehensive test suite

- Add unit tests for all components
- Add integration tests for API endpoints
- Add E2E tests for user workflows
- Add performance benchmarks

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Commit configuration and docs
git add package.json .env.example README.md {feature_path}/README.md
git commit -m "docs(epic-{epic-number}): update configuration and documentation

- Add {feature} dependencies
- Update environment configuration
- Update deployment documentation
- Add feature README

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Phase 7: Build and Validation

#### 7.1 Build Validation
```bash
# Clean build
npm run build

# Verify build output
ls -la .next/

# Test production build locally
npm run start &
sleep 5
curl http://localhost:3000/api/health
pkill -f "npm run start"
```

#### 7.2 Final Testing Suite
```bash
# Run full test suite
npm run test:ci

# Run accessibility tests (if applicable)
npm run test:a11y

# Run security tests
npm run test:security

# Run performance tests
npm run test:performance
```

### Phase 8: Deployment Automation

#### 8.1 Branch Push and Preparation
```bash
# Push to remote
git push -u origin "epic-{epic_number}-{epic_name}-complete"

# Merge to feature branch
git checkout "{feature_branch}"
git merge "epic-{epic_number}-{epic_name}-complete"
git push origin "{feature_branch}"
```

#### 8.2 Pull Request Creation
```bash
# Create PR using GitHub CLI
gh pr create \
  --title "Epic {epic_number}: {epic_name} - Complete Implementation" \
  --body "$(cat <<'EOF'
## Summary
This PR implements the complete Epic {epic_number}: {epic_name} for the {feature-description} feature.

### Stories Completed
- [ ] Story {epic_number}.1: [Story Name]
- [ ] Story {epic_number}.2: [Story Name]
- [ ] Story {epic_number}.3: [Story Name]
*(Add all stories based on epic folder)*

### Implementation Highlights
- **Database**: New tables, indexes, and RLS policies (if applicable)
- **API**: Complete REST endpoints with validation (if applicable)
- **Frontend**: React components with state management (if applicable)
- **Testing**: Comprehensive test coverage (unit, integration, E2E)
- **Security**: Authentication, authorization, and validation
- **Performance**: Optimized queries and caching

### Quality Assurance
- [ ] All acceptance criteria met
- [ ] 100% test coverage implemented
- [ ] Security audit passed
- [ ] Performance benchmarks met
- [ ] Accessibility standards met (if applicable)
- [ ] Documentation complete

### Testing
- Unit tests: `npm run test`
- Integration tests: `npm run test:integration`
- E2E tests: `npm run test:e2e`
- Performance tests: `npm run test:performance`

### Breaking Changes
- List any breaking changes and migration steps

### Deployment Checklist
- [ ] Database migrations tested in staging (if applicable)
- [ ] Environment variables configured
- [ ] External service credentials set (if applicable)
- [ ] Monitoring and alerting configured
- [ ] Rollback plan documented

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)" \
  --base "main" \
  --head "{feature_branch}" \
  --label "feature/{feature}" \
  --label "epic-{epic_number}" \
  --label "ready-for-review"
```

## Implementation Instructions for AI

### Step 1: Analyze Epic Structure
1. **Read the epic folder** and list all story files
2. **Extract story metadata** (numbers, names, status)
3. **Cross-reference with implementation-tasks.mdc** for completeness
4. **Identify any missing stories** or gaps

### Step 2: Validate Implementation
1. **Search for code files** related to each story
2. **Check for test files** and coverage
3. **Verify database migrations** if applicable
4. **Run automated checks** (lint, type checking, tests)
5. **Check task-tracker.md** for current story completion status

### Step 3: Fix Issues
1. **Identify bugs and gaps** through analysis
2. **Implement fixes** following project patterns
3. **Add missing tests** or documentation
4. **Ensure all stories meet acceptance criteria**

### Step 4: Update Task Tracker
1. **Read tasks-tracker.md** from feature directory
2. **Update story statuses** from 'in-progress' to 'completed'
3. **Mark completion checkboxes** for all finished stories
4. **Recalculate epic progress percentages**
5. **Update epic status** to 'completed'
6. **Add completion dates and notes**

### Step 5: Epic Integration Testing
1. **Test cross-story functionality**
2. **Validate epic-level requirements**
3. **Run performance and security tests**
4. **Ensure system integration works**

### Step 6: Git Operations
1. **Create epic-specific branch**
2. **Stage and commit changes** with detailed messages
3. **Push to remote repository**
4. **Merge to feature branch**

### Step 7: Pull Request
1. **Generate comprehensive PR description**
2. **Include all stories completed**
3. **Add testing instructions**
4. **Submit for review**

## Quality Checklists

### Story Completeness Checklist
For each story in the epic:
- [ ] Story file exists with proper structure
- [ ] Acceptance criteria are specific and measurable
- [ ] Technical requirements are detailed
- [ ] Dependencies are identified
- [ ] Testing requirements are comprehensive
- [ ] Definition of done is clear
- [ ] Implementation code exists and follows patterns
- [ ] Tests are written and passing
- [ ] Documentation is updated

### Task Tracker Checklist
- [ ] Task tracker file exists and is accessible
- [ ] All story statuses are updated to 'completed'
- [ ] Completion checkboxes are marked (☑ or [x])
- [ ] Completion dates are added for all finished stories
- [ ] Epic progress percentage is recalculated (100%)
- [ ] Epic status is updated to 'completed'
- [ ] Overall feature progress is updated
- [ ] Completion notes are added with implementation details
- [ ] Task tracker changes are committed to git

### Epic Integration Checklist
- [ ] All stories work together without conflicts
- [ ] Cross-story data flow is correct
- [ ] Shared resources function properly
- [ ] Epic-level acceptance criteria are met
- [ ] Performance requirements are satisfied for the complete epic
- [ ] Security measures work across the entire epic
- [ ] Task tracker reflects epic completion status

### Code Quality Checklist
- [ ] Code follows project coding standards
- [ ] TypeScript types are properly defined
- [ ] Error handling is comprehensive
- [ ] Security best practices are followed
- [ ] Performance considerations are addressed
- [ ] Accessibility standards are met (if applicable)
- [ ] Code is properly commented where needed
- [ ] No TODOs or FIXMEs left in production code

### Testing Checklist
- [ ] Unit tests cover all critical paths
- [ ] Integration tests verify component interactions
- [ ] E2E tests cover user workflows
- [ ] Performance tests validate benchmarks
- [ ] Security tests verify protections
- [ ] Accessibility tests validate compliance (if applicable)
- [ ] Test data is properly managed
- [ ] Tests are maintainable and readable

### Deployment Checklist
- [ ] Database migrations are tested (if applicable)
- [ ] Environment variables are documented
- [ ] Configuration is externalized
- [ ] Monitoring is configured
- [ ] Rollback plan exists
- [ ] Documentation is updated
- [ ] Team is notified of changes

## Error Handling and Recovery

### Common Issues and Solutions
1. **Test Failures**: Fix implementation or update tests
2. **Build Errors**: Resolve TypeScript or dependency issues
3. **Git Conflicts**: Resolve merge conflicts carefully
4. **PR Validation Failures**: Address CI/CD pipeline issues
5. **Missing Stories**: Create missing story files
6. **Integration Issues**: Fix cross-story dependencies
7. **Performance Problems**: Optimize bottlenecks

### Rollback Procedures
1. **Git Reset**: Use `git reset --hard HEAD~1` if needed
2. **Branch Recovery**: Restore from main if branch becomes corrupted
3. **Database Recovery**: Use database backups if migrations fail
4. **Configuration Recovery**: Restore from version control

## Customization Guidelines

### For Different Feature Types
- **Backend-heavy features**: Focus on API, database, and service testing
- **Frontend-heavy features**: Include UI testing, accessibility checks
- **Data-intensive features**: Add data validation and migration testing
- **Integration features**: Include external service testing and monitoring

### For Different Deployment Environments
- **Staging**: Include comprehensive testing and validation
- **Production**: Add monitoring, alerting, and rollback procedures
- **Development**: Focus on developer experience and debugging tools

## Expected Output

The AI should provide:
1. **Epic Analysis Summary**: Number of stories, completeness status
2. **Validation Results**: What passed/failed QA checks
3. **Bug Fixes Applied**: List of issues found and fixed
4. **Git Operations Summary**: Commits made and branches created
5. **Pull Request Details**: PR URL and status
6. **Next Steps**: What needs to be done by the team

Example:
```
✅ Epic {epic_number} ({epic_name}) Analysis Complete
- {number} stories found and validated
- 100% implementation coverage confirmed
- {test_count} tests passing, 0 failures
- {bug_count} minor bugs fixed, {gap_count} gap completed
- Git operations completed successfully
- PR #{pr_number} created: https://github.com/org/repo/pull/{pr_number}
```

## Success Metrics

- **Epic Completeness**: 100% of stories implemented and tested
- **Code Quality**: 0 lint errors, 0 security vulnerabilities
- **Test Coverage**: >90% coverage for all new code
- **Documentation**: 100% of new features documented
- **Deployment Ready**: All deployment checks pass
- **PR Quality**: PR passes all automated validations
- **Integration Success**: All stories work together seamlessly