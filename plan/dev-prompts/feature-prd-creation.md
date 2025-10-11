# Feature PRD Creation

## Purpose
This prompt takes a feature idea document and conducts comprehensive research and analysis to create a detailed Product Requirements Document (PRD) that serves as the blueprint for feature development.

## Usage
Run this prompt after completing the ideation phase. Use the idea.mdc file as input to generate a comprehensive PRD.

## Input Parameters
- **idea_file_path**: Path to the idea.mdc file (e.g., `plan/{feature-name}/idea.mdc`)
- **research_depth**: Level of research required (basic/comprehensive/deep-dive)
- **stakeholder_input**: Additional stakeholder requirements (if available)
- **timeline_constraints**: Any timeline or deadline considerations

## PRD Creation Workflow

### Phase 1: Research & Analysis
1. **Web Research**: Investigate similar features, best practices, and industry standards
2. **Codebase Analysis**: Search for related patterns, dependencies, and integration points
3. **Feature Plan Review**: Analyze existing features for consistency and potential conflicts
4. **Technical Investigation**: Research implementation approaches and technology options
5. **User Experience Research**: Study UI/UX patterns and user workflows

### Phase 2: Requirements Gathering
1. **Functional Requirements**: Detailed feature capabilities and behaviors
2. **Non-Functional Requirements**: Performance, security, accessibility, etc.
3. **Integration Requirements**: How the feature connects with existing systems
4. **User Stories**: Specific user scenarios and use cases
5. **Acceptance Criteria**: Clear conditions for feature completion

### Phase 3: Specification Development
1. **User Flow Design**: Step-by-step user journey mapping
2. **Interface Requirements**: UI components, interactions, and visual design
3. **Data Requirements**: Information architecture and data models
4. **API Specifications**: Endpoint definitions and data contracts
5. **Technical Architecture**: High-level system design and component relationships

### Phase 4: Validation & Refinement
1. **Stakeholder Review**: Validate requirements with key stakeholders
2. **Technical Feasibility**: Confirm implementation approach with development team
3. **Risk Assessment**: Identify potential risks and mitigation strategies
4. **Resource Planning**: Estimate development effort and timeline
5. **Success Metrics**: Define measurable outcomes and KPIs

## Research Framework

### Web Research Areas
- **Competitive Analysis**: How similar products implement this feature
- **Industry Best Practices**: Standard approaches and patterns
- **User Experience Trends**: Modern UX/UI patterns for this type of feature
- **Technical Documentation**: Implementation guides and architectural patterns
- **Accessibility Standards**: WCAG compliance and inclusive design practices

### Codebase Analysis
- **Existing Patterns**: Search for similar implementations in the codebase
- **Integration Points**: Identify where this feature connects to existing code
- **Dependencies**: Check for potential conflicts with existing features
- **Architecture Patterns**: Ensure consistency with current system design
- **Technology Stack**: Verify compatibility with existing technologies

### Feature Plan Review
- **Related Features**: Check for overlap or synergy with planned features
- **Epic Dependencies**: Identify dependencies on other epics or features
- **Timeline Coordination**: Plan development sequence with other features
- **Resource Allocation**: Coordinate team assignments and availability
- **Risk Mitigation**: Address potential conflicts early

## Additional Questions to Ask

### User Experience
- What are the primary user workflows this feature supports?
- How does this feature integrate with existing user journeys?
- What are the edge cases and error scenarios users might encounter?
- How should the feature behave on different devices and screen sizes?
- What user feedback and help mechanisms are needed?

### Technical Implementation
- Are there specific performance requirements or constraints?
- What data storage and processing needs exist?
- Are there security or compliance requirements to consider?
- How should the feature handle offline scenarios?
- What monitoring and analytics capabilities are needed?

### Business & Operations
- How will this feature be maintained and updated over time?
- What training or documentation will be required?
- How will we measure feature adoption and usage?
- What are the costs of implementation and maintenance?
- How does this feature support business objectives?

### Launch & Rollout
- Should this feature be launched incrementally or all at once?
- What A/B testing or experimentation is planned?
- How will we gather user feedback post-launch?
- What are the rollback procedures if issues arise?
- What communication is needed for internal and external stakeholders?

## PRD Document Structure

### PRD Template
```markdown
# Product Requirements Document: {Feature Name}

## Executive Summary
- **Feature Name**: [Clear, descriptive name]
- **Document Version**: [v1.0, v1.1, etc.]
- **Created Date**: [Current date]
- **Last Updated**: [Date of last update]
- **Author**: [Team member responsible]
- **Status**: [draft/review/approved/development]

## Overview
### Problem Statement
[Detailed description of the problem being solved]

### Solution Summary
[High-level overview of the proposed solution]

### Success Metrics
[Specific, measurable outcomes and KPIs]

## User Stories & Requirements
### Primary User Stories
- **As a [user type], I want to [action] so that [benefit]**
- [List of primary user stories with acceptance criteria]

### Secondary User Stories
- [List of secondary user stories]

### Functional Requirements
- [Detailed list of feature capabilities]
- [Input/output specifications]
- [Business rules and logic]

### Non-Functional Requirements
- **Performance**: [Response time, throughput requirements]
- **Security**: [Security requirements and constraints]
- **Accessibility**: [WCAG compliance requirements]
- **Scalability**: [Growth and capacity requirements]
- **Reliability**: [Uptime and error handling requirements]

## User Experience Design
### User Flows
[Step-by-step user journey mapping]

### Wireframes & Mockups
[Visual design specifications and layouts]

### Interaction Design
[Detailed interaction patterns and behaviors]

### Error States & Edge Cases
[Handling of errors, edge cases, and unexpected scenarios]

## Technical Specifications
### System Architecture
[High-level technical architecture and component relationships]

### API Specifications
[Endpoint definitions, request/response formats]

### Data Models
[Database schema and data structures]

### Integration Points
[Connections with existing systems and APIs]

### Technology Stack
[Technologies and frameworks to be used]

## Implementation Plan
### Development Phases
[Breakdown of development into manageable phases]

### Dependencies
[Technical and business dependencies]

### Risk Assessment
[Identified risks and mitigation strategies]

### Resource Requirements
[Team roles and effort estimates]

### Timeline
[Development timeline and key milestones]

## Testing & Quality Assurance
### Test Strategy
[Unit, integration, and end-to-end testing approach]

### User Acceptance Testing
[UAT plan and criteria]

### Performance Testing
[Load testing and performance validation]

### Security Testing
[Security validation and compliance checks]

## Launch & Rollout
### Launch Strategy
[Phased rollout or big bang approach]

### Success Metrics & Monitoring
[How success will be measured and monitored]

### Rollback Plan
[Procedures for rolling back if issues arise]

### Communication Plan
[Internal and external communication strategy]

## Appendices
### Glossary
[Definitions of terms and acronyms]

### References
[Links to research, competitors, and resources]

### Change Log
[History of document changes and decisions]
```

## Tools & Resources

### Research Tools
- **Web Search**: Competitive analysis and best practices research
- **Codebase Search**: Pattern analysis and integration point identification
- **Documentation Review**: Technical specification and API analysis
- **User Research**: Interview users and analyze usage patterns

### Analysis Tools
- **Spreadsheet Analysis**: Data modeling and requirements tracking
- **Diagram Tools**: Architecture diagrams and user flow mapping
- **Mockup Tools**: Wireframe and prototype creation
- **Project Management**: Timeline and resource planning

### Validation Tools
- **Stakeholder Reviews**: Requirements validation sessions
- **Technical Feasibility**: Architecture and implementation review
- **User Testing**: Concept validation and feedback gathering
- **Risk Assessment**: Risk identification and mitigation planning

## Quality Checks

### Research Completeness
- [ ] Competitive analysis completed
- [ ] Best practices researched
- [ ] Technical feasibility assessed
- [ ] User experience patterns analyzed
- [ ] Integration points identified

### Requirements Quality
- [ ] User stories are complete and testable
- [ ] Acceptance criteria are specific and measurable
- [ ] Functional requirements cover all capabilities
- [ ] Non-functional requirements are comprehensive
- [ ] Edge cases and error scenarios are addressed

### Technical Soundness
- [ ] Architecture is well-designed and scalable
- [ ] Integration approach is feasible
- [ ] Data models are appropriate
- [ ] Performance requirements are realistic
- [ ] Security considerations are addressed

### Documentation Standards
- [ ] Document is well-structured and readable
- [ ] All sections are complete
- [ ] Diagrams and visuals are clear
- [ ] References and sources are documented
- [ ] Version control is maintained

## Output Format

The prompt should produce:

### PRD Document
- Comprehensive PRD in markdown format
- Clear problem statement and solution overview
- Detailed user stories and acceptance criteria
- Technical specifications and architecture
- Implementation plan and timeline
- Testing and quality assurance strategy

### Supporting Materials
- Research findings and analysis
- Competitive analysis summary
- Technical feasibility assessment
- Risk assessment and mitigation strategies
- Stakeholder feedback and validation results

### Next Steps
- Clear handoff to technical specifications phase
- Identified dependencies and prerequisites
- Recommendations for implementation approach
- Success metrics and monitoring plan

## Usage Instructions

1. **Start with idea.mdc**: Use the ideation document as foundation
2. **Conduct comprehensive research**: Follow the research framework
3. **Ask clarifying questions**: Fill gaps through stakeholder input
4. **Document everything**: Create detailed PRD with all sections
5. **Validate and refine**: Review with stakeholders and technical team
6. **Prepare for next phase**: Ensure smooth handoff to tech specs

## Success Criteria

The PRD creation is successful when:
- Comprehensive research is completed and documented
- All user stories and requirements are clearly defined
- Technical approach is validated and feasible
- Stakeholders have reviewed and approved the requirements
- Implementation plan is realistic and well-defined
- Success metrics are established and measurable
- The PRD is complete and ready for technical specification
- Risk assessment is thorough with mitigation strategies
- The feature is ready for technical specification development

## Integration with Workflow

This PRD creation prompt:
- **Inputs**: Uses idea.mdc from feature-ideation.mdc
- **Outputs**: Feeds PRD to feature-tech-specs.mdc
- **Coordinates**: Aligns with existing feature plans and codebase
- **Prepares**: Sets foundation for epic and story creation
- **Tracks**: Provides basis for task-tracker.md updates

The structured PRD ensures all aspects of the feature are thoroughly analyzed and specified before technical implementation begins.