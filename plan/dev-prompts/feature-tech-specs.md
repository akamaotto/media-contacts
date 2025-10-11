# Feature Technical Specifications & Task Planning

## Purpose
This prompt takes a Product Requirements Document (PRD) and conducts detailed technical analysis of the codebase to create comprehensive technical specifications and a detailed task tracking structure for feature implementation.

## Usage
Run this prompt after completing the PRD phase. Use the PRD document as input to generate technical specifications and implementation tasks.

## Input Parameters
- **prd_file_path**: Path to the PRD document (e.g., `plan/{feature-name}/prd.mdc`)
- **technical_depth**: Level of technical detail required (basic/detailed/comprehensive)
- **team_capabilities**: Development team expertise and constraints
- **infrastructure_constraints**: Any technical infrastructure limitations

## Technical Specifications Workflow

### Phase 1: Codebase Analysis
1. **Architecture Review**: Analyze existing system architecture and patterns
2. **Technology Stack Assessment**: Review current technologies in package.json
3. **Code Pattern Analysis**: Identify existing implementation patterns
4. **Database Schema Review**: Check current data models and relationships
5. **API Pattern Analysis**: Review existing API structures and conventions

### Phase 2: Integration Planning
1. **Dependency Analysis**: Identify new dependencies and compatibility
2. **Integration Points**: Map connections with existing systems
3. **Data Flow Design**: Plan how data moves through the system
4. **API Extension Planning**: Design new or modified endpoints
5. **Frontend Integration**: Plan UI component integration and routing

### Phase 3: Technical Design
1. **Component Architecture**: Design component hierarchy and relationships
2. **Database Design**: Create or modify database schemas
3. **API Design**: Specify endpoints, request/response formats
4. **Security Design**: Plan authentication, authorization, and data protection
5. **Performance Design**: Plan caching, optimization, and scaling strategies

### Phase 4: Implementation Planning
1. **Task Breakdown**: Create detailed task list with dependencies
2. **Epic Structure**: Organize tasks into logical epics
3. **Story Creation**: Break epics into implementable user stories
4. **Task Tracking Setup**: Create task-tracker.md with completion checkboxes
5. **Resource Planning**: Assign tasks and estimate effort

## Detailed Analysis Areas

### Codebase Style & Patterns
- **Project Structure**: Analyze src/ organization and conventions
- **Naming Conventions**: Review file, function, and variable naming patterns
- **Code Architecture**: Examine MVC pattern usage and dependency injection
- **Error Handling**: Review existing error handling patterns
- **Testing Patterns**: Analyze current testing approaches and frameworks
- **Documentation Style**: Review code documentation and comment patterns

### Package.json & Dependencies
- **Current Dependencies**: Review existing packages and versions
- **Framework Versions**: Check Next.js, React, TypeScript, and other major versions
- **Development Tools**: Analyze build tools, linters, and testing frameworks
- **Database Libraries**: Review Prisma, database drivers, and related tools
- **UI Libraries**: Check Tailwind CSS, ShadCN UI, and component libraries
- **New Dependencies**: Identify and justify any additional packages needed

### Database & Data Modeling
- **Current Schema**: Review existing tables and relationships
- **Migration Patterns**: Analyze database migration approach
- **Data Validation**: Review validation libraries and patterns
- **Performance Considerations**: Analyze indexing and query optimization
- **Data Security**: Review data protection and privacy measures

### API Architecture
- **Route Patterns**: Analyze API route organization and conventions
- **Controller Patterns**: Review controller structure and inheritance
- **Service Layer**: Examine service architecture and dependency injection
- **Middleware Usage**: Review authentication, validation, and error handling
- **Response Formats**: Analyze API response structure and standards

### Frontend Architecture
- **Component Structure**: Review component organization and hierarchy
- **State Management**: Analyze state handling patterns
- **Routing**: Review Next.js App Router usage and patterns
- **UI Patterns**: Examine ShadCN UI usage and custom components
- **Performance**: Review code splitting, caching, and optimization

## Technical Specifications Document Structure

### Tech Specs Template
```markdown
# Technical Specifications: {Feature Name}

## Overview
- **Feature Name**: [Feature name from PRD]
- **Document Version**: [v1.0, v1.1, etc.]
- **Created Date**: [Current date]
- **Last Updated**: [Date of last update]
- **Technical Lead**: [Lead developer/architect]
- **Status**: [draft/review/approved/implementation]

## System Architecture
### Component Architecture
[Diagram and description of component relationships]

### Data Flow Architecture
[How data flows through the system]

### Integration Architecture
[How this feature integrates with existing systems]

## Technology Stack
### Current Stack Analysis
- **Frontend Framework**: Next.js [version], React [version]
- **Backend**: Next.js API Routes, TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **UI Library**: ShadCN UI, Tailwind CSS
- **Testing**: Jest, Playwright
- **Authentication**: NextAuth.js

### New Dependencies
- [List of new packages with justification]
- [Version compatibility analysis]
- [Security and maintenance considerations]

## Database Design
### Schema Changes
```sql
-- New tables or modifications
CREATE TABLE new_feature_table (
  -- Table definition
);

-- Existing table modifications
ALTER TABLE existing_table ADD COLUMN new_column VARCHAR(255);
```

### Data Models
```typescript
// Prisma model definitions
model NewFeature {
  id        String   @id @default(cuid())
  // Model fields
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Migration Strategy
[Database migration approach and rollback plan]

## API Specifications
### New Endpoints
```typescript
// API route definitions
// POST /api/feature/endpoint
export async function POST(request: Request) {
  // Implementation structure
}
```

### Modified Endpoints
[List of existing endpoints that need modification]

### Request/Response Schemas
```typescript
// Zod schemas for validation
const CreateFeatureSchema = z.object({
  // Schema definition
});
```

### Authentication & Authorization
[Security requirements and implementation approach]

## Frontend Implementation
### Component Architecture
```typescript
// Component hierarchy
FeaturePage/
├── FeatureHeader/
├── FeatureForm/
├── FeatureList/
└── FeatureModal/
```

### State Management
```typescript
// State management approach
const [featureState, setFeatureState] = useState<FeatureState>();
```

### Routing Integration
```typescript
// Route definitions
// app/feature/page.tsx
// app/feature/[id]/page.tsx
```

### UI Components
[List of new components needed]
[Integration with existing ShadCN components]

## Security Implementation
### Authentication Requirements
[User authentication and session management]

### Authorization Model
[Role-based access control implementation]

### Data Protection
[Input validation, sanitization, and output encoding]

### API Security
[Rate limiting, CORS, and security headers]

## Performance Considerations
### Database Optimization
[Indexing strategies and query optimization]

### Caching Strategy
[Redis caching implementation]

### Frontend Performance
[Code splitting, lazy loading, and optimization]

### Monitoring & Analytics
[Performance monitoring and error tracking]

## Testing Strategy
### Unit Testing
```typescript
// Jest test examples
describe('Feature Service', () => {
  it('should create feature', async () => {
    // Test implementation
  });
});
```

### Integration Testing
[API endpoint and database integration tests]

### End-to-End Testing
```typescript
// Playwright test examples
test('feature workflow', async ({ page }) => {
  // E2E test implementation
});
```

### Performance Testing
[Load testing and performance benchmarks]

## Deployment Considerations
### Environment Configuration
[Environment variables and configuration]

### Database Migrations
[Migration deployment strategy]

### Feature Flags
[Feature toggle implementation]

### Rollback Strategy
[Rollback procedures and safeguards]

## Maintenance & Monitoring
### Logging Strategy
[Application logging and error tracking]

### Health Checks
[API health monitoring]

### Analytics Integration
[User behavior and feature usage tracking]

### Documentation Requirements
[Code documentation and API documentation]

## Risk Assessment
### Technical Risks
[List of technical risks and mitigation strategies]

### Performance Risks
[Performance-related risks and solutions]

### Security Risks
[Security vulnerabilities and prevention measures]

### Dependency Risks
[Third-party dependency risks and alternatives]
```

## Task Tracking Structure

### tasks-tracker.md Template
```markdown
# Feature Implementation Task Tracker: {Feature Name}

## Overview
- **Feature**: [Feature name]
- **Start Date**: [Date]
- **Target Completion**: [Date]
- **Status**: [planning/in-progress/testing/completed]

## Epic Progress Summary
| Epic | Status | Progress | Stories Completed | Total Stories |
|------|--------|----------|------------------|---------------|
| [Epic 1 Name] | [status] | [X%] | [X/Y] | [Y] |
| [Epic 2 Name] | [status] | [X%] | [X/Y] | [Y] |

## Epic 1: [Epic Title]
### Stories
| Story | Status | Assignee | Completed Date | Notes |
|-------|--------|----------|----------------|-------|
| ☐ [Story 1 Title] | [status] | [name] | [date] | [notes] |
| ☐ [Story 2 Title] | [status] | [name] | [date] | [notes] |
| ☐ [Story 3 Title] | [status] | [name] | [date] | [notes] |

## Epic 2: [Epic Title]
### Stories
| Story | Status | Assignee | Completed Date | Notes |
|-------|--------|----------|----------------|-------|
| ☐ [Story 1 Title] | [status] | [name] | [date] | [notes] |
| ☐ [Story 2 Title] | [status] | [name] | [date] | [notes] |
| ☐ [Story 3 Title] | [status] | [name] | [date] | [notes] |

## Risk Log
| Risk | Impact | Probability | Mitigation | Status |
|------|--------|-------------|------------|--------|
| [Risk description] | [high/medium/low] | [high/medium/low] | [strategy] | [open/mitigated] |

## Dependencies
| Dependency | Type | Status | Target Date | Owner |
|------------|------|--------|-------------|-------|
| [Dependency name] | [technical/business] | [status] | [date] | [name] |

## Change Log
| Date | Change | Impact | Approved By |
|------|--------|--------|-------------|
| [date] | [change description] | [impact] | [name] |
```

## Tools & Resources

### Code Analysis Tools
- **File System Analysis**: Read and analyze existing code patterns
- **Package.json Analysis**: Review dependencies and versions
- **Code Search**: Find similar implementations and patterns
- **Database Schema Analysis**: Review existing data models
- **API Documentation**: Review existing endpoint patterns

### Research Tools
- **Web Search**: Research best practices and implementation approaches
- **Documentation Review**: Analyze framework and library documentation
- **Pattern Libraries**: Review design patterns and architectural approaches
- **Performance Analysis**: Research optimization techniques

### Planning Tools
- **Task Management**: Create structured task lists and dependencies
- **Timeline Planning**: Estimate development effort and create timelines
- **Risk Assessment**: Identify and plan for potential issues
- **Resource Planning**: Assign tasks and allocate resources

## Quality Checks

### Technical Specifications
- [ ] Architecture is consistent with existing patterns
- [ ] Technology choices are justified and compatible
- [ ] Database design is normalized and performant
- [ ] API design follows existing conventions
- [ ] Security requirements are addressed
- [ ] Performance considerations are included
- [ ] Testing strategy is comprehensive
- [ ] Documentation is complete and clear

### Task Planning
- [ ] Epics are logically organized
- [ ] Stories are well-defined and implementable
- [ ] Dependencies are identified and tracked
- [ ] Effort estimates are realistic
- [ ] Risk assessment is thorough
- [ ] Resource allocation is appropriate
- [ ] Timeline is achievable
- [ ] Success criteria are measurable

### Integration Readiness
- [ ] Integration points with existing code are identified
- [ ] Database migrations are planned and safe
- [ ] API changes are backward compatible
- [ ] Frontend components integrate with existing patterns
- [ ] Testing covers integration scenarios
- [ ] Deployment strategy is safe and reversible

## Output Format

The prompt should produce:

### Technical Specifications Document
- Comprehensive tech-specs.mdc file
- Detailed architecture and design decisions
- Database schema and migration plans
- API specifications and security requirements
- Frontend component architecture
- Performance and monitoring strategies

### Task Tracking Structure
- Detailed tasks-tracker.md file
- Epic and story breakdown with checkboxes
- Progress tracking and assignment tables
- Risk log and dependency tracking
- Change log and approval workflow

### Implementation Readiness
- Clear handoff to development team
- All technical questions answered
- Integration approach documented
- Testing strategy defined
- Deployment plan established

## Usage Instructions

1. **Start with PRD**: Use the PRD as foundation for technical analysis
2. **Analyze codebase thoroughly**: Understand existing patterns and constraints
3. **Research best practices**: Ensure modern, maintainable approach
4. **Design comprehensive solution**: Cover all technical aspects
5. **Create detailed task plan**: Break work into manageable pieces
6. **Validate feasibility**: Ensure approach is realistic and achievable

## Success Criteria

The technical specifications phase is successful when:
- Comprehensive technical analysis is completed
- All integration points are identified and planned
- Database design is complete and migration-ready
- API specifications are detailed and consistent
- Frontend architecture is well-designed
- Security and performance requirements are addressed
- Task breakdown is comprehensive and realistic
- Implementation plan is ready for development team
- All technical risks are identified and mitigated
- The feature is ready for epic and story creation

## Integration with Workflow

This technical specifications prompt:
- **Inputs**: Uses PRD from feature-prd-creation.mdc
- **Outputs**: Creates tech-specs.mdc and tasks-tracker.md
- **Feeds**: Provides inputs for create-epic.mdc
- **Coordinates**: Aligns with existing codebase patterns
- **Tracks**: Sets up task tracking for entire feature lifecycle
- **Prepares**: Ensures technical readiness for implementation

The comprehensive technical documentation and task structure ensure smooth implementation and successful feature delivery.