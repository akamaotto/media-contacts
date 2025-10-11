# Develop Story - AI-Powered Development Orchestrator

## Purpose
This prompt orchestrates the development of an individual story by leveraging Claude Code's tools, MCPs, and the broader development ecosystem to implement, test, and validate the story requirements.

## Usage
Run this prompt when you have a specific story file and need to develop it from start to finish, including implementation, testing, and validation.

## Input Parameters
- **story_file**: Path to the story file (e.g., `plan/{feature}/stories/epic-{number}-{name}/story-{number}-{name}.mdc`)
- **feature_context**: Current codebase context and available tools
- **development_mode**: Development approach (sequential, parallel, experimental)

## Development Workflow

### Phase 1: Analysis & Planning
1. **Read Story File**: Parse the story requirements, acceptance criteria, and technical specifications
2. **Analyze Current Codebase**: Understand existing patterns, dependencies, and integration points
3. **Create Development Plan**: Break down the story into implementable steps
4. **Identify Dependencies**: Determine what needs to be implemented first
5. **Check Cross-Story Coordination**: Verify no conflicts with other stories in development

### Phase 2: Implementation
1. **Set Up Development Environment**: Ensure all dependencies and tools are available
2. **Implement Core Logic**: Write the main functionality following technical requirements
3. **Add Tests**: Create unit tests, integration tests as specified
4. **Update Documentation**: Add necessary code documentation and comments
5. **Handle Error Cases**: Implement comprehensive error handling and logging

### Phase 3: Integration & Testing
1. **Integrate with Existing Code**: Ensure the new code works with the existing system
2. **Run Test Suite**: Execute all tests to ensure nothing is broken
3. **Validate Acceptance Criteria**: Verify all acceptance criteria are met
4. **Performance Testing**: Ensure performance requirements are met
5. **Security Validation**: Ensure security requirements are satisfied

### Phase 4: Package Version Analysis & Self-Reflection

#### 4.1 Package Inventory and Version Analysis
1. **Extract Used Packages**: Identify all dependencies used in the implemented code
2. **Knowledge Cutoff Analysis**: Determine the highest package versions known at training cutoff
3. **Current Version Check**: Compare with versions in project's package.json
4. **Version Gap Analysis**: Identify significant version differences
5. **Migration Research**: Research breaking changes and migration patterns

#### 4.2 Documentation Research via Context7
For packages with version gaps:
```typescript
// Use Context7 to get current package documentation
const packageDocs = await mcp__context7__resolve-library_id("package-name");
const currentDocs = await mcp__context7__get-library-docs(packageDocs.id, "migration-guide");
```

#### 4.3 Web Search for Migration Analysis
Search for:
- Migration guides between versions
- Breaking changes and deprecations
- Common issues and solutions
- Best practices for updated versions
- Performance improvements and new features

#### 4.4 Code Enhancement and Refactoring
Based on research findings:
1. **Update deprecated APIs**: Replace with current recommended approaches
2. **Leverage new features**: Utilize improved functionality in newer versions
3. **Address known issues**: Apply fixes for common problems
4. **Improve performance**: Take advantage of optimizations
5. **Enhance security**: Apply latest security best practices

#### 4.5 Reflection and Learning
Document findings and improvements:
- What package versions were outdated?
- What breaking changes were identified?
- What new features were leveraged?
- What security improvements were made?
- What performance optimizations were applied?

### Phase 5: Review & Finalization
1. **Code Review**: Perform self-code review against best practices
2. **Security Review**: Check for security vulnerabilities
3. **Final Validation**: Ensure story is completely done according to definition
4. **Documentation Updates**: Update any relevant documentation
5. **Update Task Tracker**: Mark story as completed in tasks-tracker.md
6. **Clean Up**: Remove debugging code and optimize implementation

## Available Tools & MCPs

### Package Analysis Tools
- **Context7 MCP**: Access up-to-date package documentation and migration guides
- **Web Search**: Research migration patterns, breaking changes, and best practices
- **File System Operations**: Read package.json and analyze dependency versions
- **Code Analysis**: Identify imported packages and usage patterns

### Code Analysis Tools
- **File System Operations**: Read, write, and navigate codebase files
- **Code Search**: Find existing patterns, dependencies, and similar implementations
- **Git Operations**: Check status, create branches, commit changes
- **Database Tools**: Run migrations, check schema, test queries

### Development Tools
- **Package Management**: Install dependencies, update package.json
- **Testing Frameworks**: Run Jest tests, create test files
- **Build Tools**: Compile TypeScript, run builds
- **Linting & Formatting**: ESLint, Prettier integration

### External Services
- **AI Services**: Test OpenAI, Anthropic integrations (if applicable)
- **Database**: PostgreSQL operations, query testing
- **API Testing**: Test endpoints, validate responses
- **Performance Monitoring**: Check metrics and performance

## Development Instructions

### 1. Story Analysis
```typescript
// Parse the story file to extract requirements
const storyAnalysis = {
  objective: "Clear statement of what needs to be accomplished",
  acceptanceCriteria: ["Specific criteria list"],
  technicalRequirements: ["Technical specifications"],
  dependencies: ["Prerequisites"],
  testingRequirements: ["Test requirements"],
  definitionOfDone: ["Completion criteria"]
};
```

### 2. Cross-Story Coordination
Before starting development:
- **Check for concurrent stories** in the same epic
- **Identify shared resources** (database tables, API endpoints, components)
- **Coordinate database schema changes** with other stories
- **Handle potential merge conflicts** proactively

### 3. Implementation Strategy
- **Follow existing patterns**: Use the same architecture and coding style as the existing codebase
- **Incremental development**: Implement in small, testable chunks
- **Test-driven development**: Write tests before or alongside implementation
- **Error handling**: Implement comprehensive error handling and logging
- **Documentation**: Add clear comments and documentation

### 4. Quality Assurance
- **Code coverage**: Ensure adequate test coverage
- **Performance**: Meet performance requirements
- **Security**: Follow security best practices
- **Accessibility**: Ensure WCAG compliance where applicable
- **Cross-browser**: Test on supported browsers

## Implementation Patterns

### Backend Development
```typescript
// Example service implementation pattern
export class NewService {
  constructor(
    private repository: NewRepository,
    private logger: Logger,
    private eventBus: EventBus
  ) {}

  async execute(input: InputType): Promise<ResultType> {
    try {
      // Input validation
      const validatedInput = this.validateInput(input);

      // Business logic
      const result = await this.process(validatedInput);

      // Emit events
      await this.eventBus.publish(new EventCreated(result));

      return result;
    } catch (error) {
      this.logger.error('Service execution failed', error);
      throw new ServiceError(error.message, error.code);
    }
  }

  private validateInput(input: InputType): InputType {
    // Implementation
  }

  private async process(input: InputType): Promise<ResultType> {
    // Implementation
  }
}
```

### Frontend Development
```typescript
// Example component implementation pattern
export function NewComponent({ prop1, prop2 }: Props) {
  const [state, setState] = useState<StateType>(initialState);
  const { data, loading, error } = useDataFetch(prop1);

  useEffect(() => {
    // Side effects
  }, [prop1, prop2]);

  const handleSubmit = useCallback((event: FormEvent) => {
    // Event handling
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div className="new-component">
      {/* Component JSX */}
    </div>
  );
}
```

## Package Version Analysis & Self-Reflection Framework

### Knowledge Cutoff Analysis Process

#### Step 1: Package Extraction
```typescript
// Analyze implemented code to extract used packages
const usedPackages = extractImportsFromCode(implementedCode);
// Example output: ['@next-auth/prisma-adapter', '@prisma/client', 'next-auth', 'react-hook-form']
```

#### Step 2: Version Knowledge Assessment
```typescript
// For each package, assess knowledge based on training cutoff
const packageKnowledge = {
  'next-auth': {
    knownVersion: '4.24.0', // Highest version known at training cutoff
    knowledgeDate: '2024-04',
    features: ['Basic OAuth', 'Session management', 'JWT support']
  },
  '@prisma/client': {
    knownVersion: '5.0.0', // Highest version known at training cutoff
    knowledgeDate: '2024-04',
    features: ['Type-safe queries', 'Relations', 'Migrations']
  }
};
```

#### Step 3: Current Version Analysis
```bash
# Read current package.json versions
npm list --depth=0
# Or read package.json directly
cat package.json | jq '.dependencies'
```

#### Step 4: Version Gap Identification
```typescript
const versionGaps = {
  'next-auth': {
    knownVersion: '4.24.0',
    currentVersion: '5.0.0-beta.3', // From package.json
    gap: 'major',
    impact: 'breaking_changes_expected'
  },
  '@prisma/client': {
    knownVersion: '5.0.0',
    currentVersion: '5.7.1',
    gap: 'minor',
    impact: 'new_features_available'
  }
};
```

### Context7 Documentation Research

#### Package Resolution
```typescript
// Use Context7 to get current documentation
const resolvePackage = async (packageName: string) => {
  try {
    const libraryId = await mcp__context7__resolve-library_id(packageName);
    return {
      success: true,
      libraryId: libraryId.id,
      description: libraryId.description
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
```

#### Migration Guide Research
```typescript
// Get migration documentation for version gaps
const getMigrationGuide = async (packageName: string, currentVersion: string) => {
  const libraryId = await mcp__context7__resolve-library_id(packageName);
  if (libraryId) {
    const docs = await mcp__context7__get-library-docs(
      libraryId.id,
      `migration-${currentVersion}`
    );
    return docs;
  }
};
```

### Web Search Integration

#### Breaking Changes Research
```typescript
// Search for breaking changes and migration issues
const searchMigrationInfo = async (packageName: string, fromVersion: string, toVersion: string) => {
  const queries = [
    `${packageName} migration guide ${fromVersion} to ${toVersion}`,
    `${packageName} v${toVersion} breaking changes`,
    `${packageName} v${fromVersion} vs v${toVersion} differences`,
    `${packageName} common migration issues ${toVersion}`,
    `${packageName} best practices ${toVersion}`
  ];

  const results = await Promise.all(
    queries.map(query => mcp__brave_search__brave_web_search({ query }))
  );

  return analyzeSearchResults(results);
};
```

#### Common Issues Analysis
```typescript
// Search for known issues and solutions
const searchCommonIssues = async (packageName: string, version: string) => {
  const searchQuery = `${packageName} v${version} common issues solutions bugs`;
  return await mcp__brave_search__brave_web_search({
    query: searchQuery,
    count: 10
  });
};
```

### Code Enhancement Process

#### Automated Code Refactoring
```typescript
// Example: Update deprecated next-auth v4 patterns to v5
const updateNextAuthPatterns = (code: string) => {
  // Update deprecated imports
  code = code.replace(
    /from "next-auth\/next"/g,
    'from "next-auth"'
  );

  // Update configuration structure
  code = code.replace(
    /NextAuthOptions/g,
    'AuthOptions' // v5 changed the interface name
  );

  // Update callback patterns
  code = code.replace(
    /callbacks: {/g,
    'callbacks: { async session({ session, token }) { /* v5 session handling */ },'
  );

  return code;
};
```

#### Security Enhancement Application
```typescript
// Apply latest security best practices based on research
const applySecurityEnhancements = (code: string, securityFindings: string[]) => {
  securityFindings.forEach(finding => {
    if (finding.includes('session management')) {
      // Update session security based on latest best practices
      code = enhanceSessionSecurity(code);
    }
    if (finding.includes('CSRF protection')) {
      // Add CSRF protection if missing
      code = addCSRFProtection(code);
    }
  });

  return code;
};
```

### Self-Reflection Documentation

#### Reflection Template
```markdown
# Package Version Analysis & Self-Reflection

## Package Inventory
| Package | Known Version | Current Version | Gap | Impact |
|---------|---------------|----------------|-----|---------|
| next-auth | 4.24.0 | 5.0.0-beta.3 | Major | Breaking changes |
| @prisma/client | 5.0.0 | 5.7.1 | Minor | New features |

## Research Findings

### Breaking Changes Identified
- **next-auth v5**: Complete rewrite of configuration structure
- **Session callbacks**: New parameter structure and return types
- **Middleware integration**: Updated patterns for Next.js 15

### New Features Leveraged
- **Prisma 5.7**: Improved query performance optimizations
- **Enhanced type safety**: Better inference for complex queries
- **Connection pooling**: Better resource management

### Security Improvements Applied
- **Session security**: Updated to latest session management practices
- **CSRF protection**: Enhanced protection mechanisms
- **Input validation**: Stricter validation patterns

### Performance Optimizations
- **Query optimization**: Leveraged new Prisma query engine improvements
- **Bundle size**: Reduced through updated import patterns
- **Memory usage**: Optimized session storage patterns

## Code Changes Made
1. Updated next-auth configuration from v4 to v5 patterns
2. Replaced deprecated APIs with current alternatives
3. Enhanced error handling with new error types
4. Improved type safety throughout the implementation

## Lessons Learned
- Package version gaps can introduce significant breaking changes
- Documentation research is crucial before version upgrades
- Migration guides often miss edge cases that need to be discovered through testing
- New versions often provide security and performance benefits that justify migration effort
```

## Implementation Instructions for AI

### Self-Reflection Execution Order

1. **After initial code implementation**, pause for package analysis
2. **Extract all imported packages** from the implemented code
3. **Assess knowledge cutoff** for each package vs current versions
4. **Research significant version gaps** (> minor version differences)
5. **Apply code improvements** based on research findings
6. **Document reflection** with all changes and reasoning
7. **Finalize implementation** with enhanced code

### Quality Checks for Package Analysis

- [ ] All imported packages have been identified
- [ ] Version gaps have been assessed for impact
- [ ] Breaking changes have been researched and addressed
- [ ] New features have been leveraged where beneficial
- [ ] Security improvements have been applied
- [ ] Performance optimizations have been implemented
- [ ] Code has been updated to use current best practices
- [ ] Reflection documentation is complete
- [ ] All changes have been tested and validated

## Task Tracker Management

### Updating tasks-tracker.md
When a story is completed, update the tasks-tracker.md file:

1. **Locate the story row** in the appropriate epic table
2. **Update the checkbox** from ☐ to ☑ or from `[ ]` to `[x]`
3. **Update status column** from 'in-progress' to 'completed'
4. **Add completion date** in the Completed Date column
5. **Update epic progress** - recalculate the completion percentage
6. **Add completion notes** if relevant

### Example Task Tracker Update
```markdown
# Before completion
| ☐ Implement user authentication | in-progress | dev-team | | Basic auth system |

# After completion
| ☑ Implement user authentication | completed | dev-team | 2024-01-15 | Basic auth with NextAuth.js |
```

### Epic Progress Calculation
```markdown
# Epic Progress Summary
| Epic | Status | Progress | Stories Completed | Total Stories |
|------|--------|----------|------------------|---------------|
| Authentication | in-progress | 75% | 3/4 | 4 |
```

### Automated Task Tracker Updates
The process should automatically:
- Update story completion status
- Recalculate epic completion percentages
- Update overall feature progress
- Add completion timestamps
- Generate completion summary

## Tool Usage Patterns

### File Operations
```typescript
// Read existing patterns
const existingPattern = await ReadFile('src/lib/similar/SimilarService.ts');

// Create new implementation
await WriteFile('src/lib/new/NewService.ts', implementation);

// Update imports in related files
await EditFile('src/lib/index.ts', {
  oldText: 'export { SimilarService }',
  newText: 'export { SimilarService, NewService }'
});
```

### Database Operations
```typescript
// Run database migrations
await Bash('npm run db:push');

// Test database schema
await mcp__postgres__query(`
  SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_name = 'new_table'
`);

// Verify indexes
await Bash('psql $DATABASE_URL -c "\\d new_table"');
```

### Testing Operations
```typescript
// Run unit tests
await Bash('npm run test -- --testPathPattern=new-service');

// Run integration tests
await Bash('npm run test:integration');

// Run E2E tests
await Bash('npm run test:e2e');
```

### API Testing
```typescript
// Test API endpoints
const response = await mcp__swagger__execute_api_request({
  method: 'POST',
  path: '/api/new-endpoint',
  body: testPayload
});

// Validate response
expect(response.status).toBe(201);
```

## Quality Checkpoints

### Before Implementation
- [ ] Story requirements are clear and complete
- [ ] Dependencies are identified and available
- [ ] Development environment is ready
- [ ] Test data and scenarios are prepared
- [ ] Cross-story conflicts are checked

### During Implementation
- [ ] Code follows existing patterns and conventions
- [ ] Tests are written alongside implementation
- [ ] Error handling is comprehensive
- [ ] Performance considerations are addressed
- [ ] Security best practices are followed

### After Implementation
- [ ] All acceptance criteria are met
- [ ] All tests pass with adequate coverage
- [ ] Code is properly documented
- [ ] Integration with existing system works
- [ ] Performance requirements are met
- [ ] Security requirements are satisfied
- [ ] No cross-story conflicts introduced
- [ ] **Package version analysis completed**
- [ ] **Breaking changes researched and addressed**
- [ ] **Code updated with current best practices**
- [ ] **Security enhancements applied**
- [ ] **Performance optimizations implemented**
- [ ] **Self-reflection documentation completed**
- [ ] Task tracker is updated with story completion status
- [ ] Epic progress is recalculated and updated
- [ ] Completion notes are added to task tracker

## Error Handling & Recovery

### Common Issues
- **Dependency conflicts**: Resolve package version conflicts
- **Database errors**: Check schema and migrations
- **API failures**: Verify endpoints and authentication
- **Performance issues**: Profile and optimize bottlenecks
- **Test failures**: Debug and fix test cases
- **Cross-story conflicts**: Coordinate with other developers

### Recovery Strategies
- **Rollback changes**: Use git to undo problematic changes
- **Incremental fixes**: Address issues one at a time
- **Seek guidance**: Ask for clarification on complex issues
- **Alternative approaches**: Consider different implementation strategies
- **Coordination**: Communicate with team on blocking issues

## Output Format

The AI should provide a comprehensive development report including:

### Development Summary
- Story objective and approach taken
- Implementation decisions made and rationale
- Challenges encountered and solutions applied
- Files created/modified with brief descriptions
- Cross-story coordination performed

### Package Version Analysis Results
- **Package Inventory**: List of all packages used with version analysis
- **Version Gaps Identified**: Significant differences between known and current versions
- **Breaking Changes Researched**: Analysis of breaking changes and migration requirements
- **Code Improvements Made**: Specific enhancements based on current package versions
- **Security Enhancements**: Applied latest security best practices
- **Performance Optimizations**: Leveraged new features and optimizations

### Testing Results
- Unit tests written and pass/fail status
- Integration tests results
- Manual testing performed and outcomes
- Acceptance criteria validation results
- Performance and security testing outcomes

### Self-Reflection Documentation
- **Lessons Learned**: Key insights about package versions and migration patterns
- **Migration Challenges**: Issues encountered and solutions applied
- **Best Practices Applied**: Current development practices implemented
- **Future Considerations**: Recommendations for ongoing maintenance

### Quality Metrics
- Code coverage percentage
- Performance benchmarks vs requirements
- Security validation results
- Documentation completeness
- Code quality metrics (linting, formatting)

### Final Status
- Whether the story is complete according to definition of done
- Any outstanding items or blockers
- Recommendations for next steps or review
- Impact on other stories or system components

## Usage Instructions

To use this prompt:

1. **Provide the story file path**: Specify which story to develop
2. **Specify development context**: Current codebase state and constraints
3. **Follow the development workflow**: Systematically implement, test, and validate
4. **Use available tools**: Leverage MCPs and Claude Code capabilities
5. **Document progress**: Track development decisions and outcomes
6. **Validate completion**: Ensure all requirements are met before marking complete
7. **Handle cross-story coordination**: Check for conflicts and coordinate as needed

## Notes for AI Implementation

- Always start by thoroughly reading and understanding the story requirements
- Use existing codebase patterns and conventions as much as possible
- Implement incrementally with frequent testing and validation
- Document decisions and trade-offs made during development
- Validate acceptance criteria systematically
- Don't hesitate to ask for clarification on ambiguous requirements
- Consider the broader feature context when implementing individual stories
- Ensure all changes integrate well with the existing system
- Be mindful of other stories that might be in parallel development
- Communicate blockers and dependencies early

## Success Criteria

The story development is successful when:
- All acceptance criteria are met and validated
- All tests pass with adequate coverage (>90% for new code)
- Code integrates seamlessly with existing system
- Performance and security requirements are satisfied
- Documentation is complete and accurate
- No cross-story conflicts or issues introduced
- The story is ready for code review and merge
- Definition of done is fully satisfied