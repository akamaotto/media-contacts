# Create Epic - Feature Planning and Epic Definition

## Purpose
This prompt transforms business requirements and feature ideas into well-structured epics with clear boundaries, dependencies, and deliverables. It creates the foundation for systematic feature development.

## Usage
Run this prompt when you have business requirements, feature ideas, or high-level feature concepts that need to be structured into development-ready epics.

## Input Parameters
- **feature_name**: Name of the feature to be developed (e.g., "AI-powered contact discovery")
- **feature_description**: High-level description of what the feature should accomplish
- **business_requirements**: Business objectives and user needs (optional)
- **feature_path**: Path where feature planning will be stored (e.g., "plan/ai-contact-discovery")
- **existing_context**: Existing system context and constraints (optional)

## Output Structure

### Epic Structure
For each epic created:
```
{feature_path}/
├── epics/                            # Epic definitions directory
│   ├── epic-{number}-{name}.mdc      # Epic definition document
│   ├── technical-spec.md             # Technical specifications (if needed)
│   ├── api-contracts.mdc             # API contracts (if applicable)
│   ├── component-specifications.mdc  # UI/UX specifications (if applicable)
│   ├── database-migrations.sql       # Database changes (if applicable)
│   ├── testing-strategy.mdc          # Testing approach and requirements
│   └── deployment-monitoring.mdc     # Deployment and monitoring strategy
├── implementation-tasks.mdc          # Detailed breakdown of all epics and tasks
└── stories/                          # User stories directory (optional)
    └── epic-{number}-{name}/         # Stories for each epic (optional)
```

## Epic Definition Template

```markdown
# Epic {number}: {Epic Name}

## Epic Overview
**Objective**: {Clear statement of what this epic accomplishes}
**Business Value**: {Why this epic matters to users/business}
**Success Metrics**: {How success will be measured}

## Epic Boundaries
### In Scope
- {Specific functionality included}
- {User stories covered}
- {Technical components included}

### Out of Scope
- {Functionality explicitly excluded}
- {Future considerations}
- {Dependencies on other features}

## Acceptance Criteria
- [ ] {Epic-level acceptance criterion 1}
- [ ] {Epic-level acceptance criterion 2}
- [ ] {Epic-level acceptance criterion 3}
- [ ] {Performance requirement}
- [ ] {Security requirement}
- [ ] {Accessibility requirement}

## Dependencies
### Prerequisites
- {What must exist before this epic starts}
- {External dependencies}
- {Team dependencies}

### Blockers
- {Potential blockers and mitigation strategies}

## Risk Assessment
### Technical Risks
- {Risk 1}: {Description and mitigation}
- {Risk 2}: {Description and mitigation}

### Business Risks
- {Risk 1}: {Description and mitigation}
- {Risk 2}: {Description and mitigation}

## Timeline and Estimation
**Estimated Duration**: {X weeks}
**Key Milestones**: {Major delivery points}
**Resource Requirements**: {Team composition and skills needed}

## Definition of Done
- [ ] All stories in the epic are complete
- [ ] Epic acceptance criteria are met
- [ ] Integration testing passes
- [ ] Performance requirements are satisfied
- [ ] Documentation is complete
- [ ] Stakeholder approval obtained
```

## Implementation Tasks Template

```markdown
# Implementation Tasks - {Feature Name}

## Epic Breakdown

### Epic 1: {First Epic Name}
**Estimated Duration**: {X days}
**Priority**: {Critical|High|Medium|Low}

#### Story 1.1: {Story Name}
- **Objective**: {What this story accomplishes}
- **Estimated Time**: {X days}
- **Dependencies**: {Prerequisites}

#### Story 1.2: {Story Name}
- **Objective**: {What this story accomplishes}
- **Estimated Time**: {X days}
- **Dependencies**: {Prerequisites}

### Epic 2: {Second Epic Name}
**Estimated Duration**: {X days}
**Priority**: {Critical|High|Medium|Low}

#### Story 2.1: {Story Name}
- **Objective**: {What this story accomplishes}
- **Estimated Time**: {X days}
- **Dependencies**: {Prerequisites}

## Epic Dependencies
- Epic 1 → Epic 2: {Dependency description}
- Epic 2 → Epic 3: {Dependency description}

## Overall Timeline
- Week 1-2: Epic 1 (Foundation)
- Week 3-4: Epic 2 (Core Implementation)
- Week 5-6: Epic 3 (Integration & Testing)
```

## Epic Creation Process

### Phase 1: Requirements Analysis
1. **Parse Business Requirements**: Extract user needs and business objectives
2. **Identify User Personas**: Who will use this feature and their goals
3. **Map User Journeys**: How users will interact with the feature
4. **Define Success Criteria**: How we'll measure the feature's success

### Phase 2: Technical Assessment
1. **Analyze Current System**: Understand existing architecture and constraints
2. **Identify Integration Points**: Where the feature connects to existing systems
3. **Assess Technical Complexity**: Evaluate implementation challenges
4. **Resource Planning**: Determine team composition and timeline

### Phase 3: Epic Structuring
1. **Define Epic Boundaries**: Determine logical groupings of functionality
2. **Create Epic Sequence**: Order epics based on dependencies and value
3. **Estimate Effort**: Provide realistic time estimates
4. **Risk Assessment**: Identify and plan for potential risks

### Phase 4: Documentation Creation
1. **Create Epic Directory**: Ensure epics are created in `plan/{feature-name}/epics/`
2. **Generate Epic Documents**: Create detailed epic definitions in the epics directory
3. **Create Implementation Tasks**: Break down epics into actionable stories
4. **Technical Specifications**: Add technical details as needed
5. **Review and Refine**: Validate epic structure and completeness

## Common Epic Patterns

### Pattern 1: Foundation → Core → Integration
```
Epic 1: Foundation & Infrastructure
- Database schema
- API scaffolding
- Basic UI components

Epic 2: Core Feature Implementation
- Main functionality
- User workflows
- Data processing

Epic 3: Integration & Polish
- System integration
- Performance optimization
- User experience polish
```

### Pattern 2: MVP → Enhancement → Advanced
```
Epic 1: Minimum Viable Product
- Core functionality only
- Basic user interface
- Essential features

Epic 2: Feature Enhancement
- Additional functionality
- Improved user experience
- Performance improvements

Epic 3: Advanced Features
- Power user features
- Advanced integrations
- Analytics and reporting
```

### Pattern 3: Backend → Frontend → Integration
```
Epic 1: Backend Services
- API development
- Database implementation
- Service architecture

Epic 2: Frontend Development
- User interface components
- User interactions
- Client-side logic

Epic 3: Integration & Testing
- Frontend-backend integration
- End-to-end testing
- Performance optimization
```

## Quality Criteria for Epic Creation

### Epic Completeness Checklist
- [ ] Clear business value and objectives
- [ ] Well-defined boundaries and scope
- [ ] Measurable success criteria
- [ ] Comprehensive risk assessment
- [ ] Realistic timeline and resource estimates
- [ ] Clear dependencies identified
- [ ] Definition of done is specific
- [ ] Stakeholder requirements addressed

### Implementation Tasks Checklist
- [ ] All epics are logically sequenced
- [ ] Stories are appropriately sized (1-5 days)
- [ ] Dependencies are clearly identified
- [ ] Effort estimates are realistic
- [ ] Technical requirements are detailed
- [ ] Testing requirements are specified
- [ ] Documentation requirements are included

## Epic Creation Instructions for AI

When creating epics:

1. **Use Correct Directory Structure**: Always create epics in `plan/{feature-name}/epics/` directory
2. **Start with Requirements**: Thoroughly analyze the business requirements
3. **Consider User Experience**: Map out how users will interact with the feature
4. **Think Incrementally**: Plan for incremental delivery of value
5. **Identify Dependencies**: Understand what needs to exist before starting
6. **Assess Risks**: Identify potential technical and business risks
7. **Plan for Testing**: Consider testing and quality assurance needs
8. **Define Success**: Establish clear criteria for epic completion

## Usage Instructions

To use this prompt:

1. **Provide Feature Context**: Give a clear description of the feature to be built
2. **Specify Business Requirements**: Include user needs and business objectives
3. **Set Technical Context**: Describe existing system constraints
4. **Define Timeline Constraints**: Specify any timeline or resource limitations
5. **Review Epic Structure**: Validate that the epic breakdown makes sense
6. **Adjust as Needed**: Refine epic boundaries based on feedback

## Example Usage

```
Create an epic for "AI-powered contact discovery" with the following requirements:
- Users should be able to search for media contacts using natural language
- The system should use AI to find relevant contacts from various sources
- Results should be ranked by relevance and confidence scores
- Users should be able to import found contacts into their database
- The feature should integrate with existing contact management system
```

## Expected Output

The AI should provide:
1. **Epic Structure Overview**: Number of epics and their focus areas
2. **Detailed Epic Definitions**: Complete epic documents with all sections
3. **Implementation Tasks**: Breakdown of all epics into stories
4. **Timeline and Dependencies**: Visual representation of the development plan
5. **Risk Assessment**: Analysis of potential challenges and mitigation strategies
6. **Next Steps**: What needs to be done to start development

Example:
```
✅ Feature Analysis Complete: AI-powered contact discovery
Created 3 epics with 12 total stories:
- Epic 1: Foundation & Infrastructure (4 stories, 8 days)
- Epic 2: AI Search Service (5 stories, 12 days)
- Epic 3: Frontend & Integration (3 stories, 6 days)

Total estimated duration: 26 days
Key dependencies identified: Database schema → API development → Frontend integration
Risk assessment completed with mitigation strategies
```

## Success Metrics

- **Clarity**: Epic objectives and boundaries are clear and unambiguous
- **Completeness**: All requirements are addressed in the epic structure
- **Feasibility**: Timeline and resource estimates are realistic
- **Alignment**: Epics align with business objectives and user needs
- **Actionability**: Implementation tasks are specific and actionable
- **Risk Awareness**: Major risks are identified and planned for