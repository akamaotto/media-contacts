# Feature Ideation & Setup

## Purpose
This prompt captures feature ideas from users, explores them through targeted questions, and sets up the foundational project structure including Git branch, feature folder, and initial ideation documentation.

## Usage
Run this prompt when you have a new feature idea that needs to be explored, structured, and prepared for formal specification development.

## Input Parameters
- **feature_idea**: Initial feature concept description
- **user_context**: Current application context and user needs
- **urgency_level**: Feature priority (low/medium/high/critical)
- **stakeholders**: Key stakeholders involved (if known)

## Ideation Workflow

### Phase 1: Discovery & Understanding
1. **Initial Idea Capture**: Document the raw feature concept as provided
2. **Problem Statement**: Clarify what problem this feature solves
3. **User Value Proposition**: Identify who benefits and how
4. **Success Metrics**: Define what success looks like
5. **Exploratory Questions**: Ask targeted questions to flesh out the concept

### Phase 2: Research & Context
1. **Feature Landscape**: Research similar features in competing products
2. **Internal Analysis**: Check for overlap with existing or planned features
3. **Technical Feasibility**: Initial assessment of technical requirements
4. **Resource Estimation**: Rough estimate of development effort
5. **Risk Assessment**: Identify potential blockers and challenges

### Phase 3: Structure & Organization
1. **Create Feature Branch**: Set up dedicated Git branch for the feature
2. **Feature Folder Setup**: Create organized folder structure in plan/
3. **Idea Documentation**: Create comprehensive idea.mdc file
4. **Initial Planning**: Set up foundation for PRD development
5. **Stakeholder Alignment**: Ensure all stakeholders are informed

## Key Questions to Ask

### Problem & Value
- What specific problem does this feature solve for users?
- Who are the primary users of this feature?
- How often would users use this feature?
- What are the current workarounds or alternatives?
- What makes this feature essential vs. nice-to-have?

### Scope & Boundaries
- What is the minimum viable version of this feature?
- What would be the ideal complete version?
- What should this feature NOT do (out of scope)?
- Are there related features that could be impacted?
- Are there legal, compliance, or security considerations?

### Success & Measurement
- How will we know if this feature is successful?
- What metrics or KPIs should we track?
- What user feedback mechanisms are needed?
- What are the performance requirements?
- What accessibility considerations apply?

### Technical Considerations
- Are there specific technology requirements or constraints?
- Does this integrate with existing systems or APIs?
- Are there data storage or processing requirements?
- What browser/device support is needed?
- Are there scalability concerns?

### Timeline & Priority
- Is there a deadline or timeline constraint?
- What are the business drivers for this feature?
- Could this be broken into phases or iterations?
- What would be the impact of delaying this feature?
- Are there dependencies on other features or projects?

## File Structure Creation

### Git Branch Naming Convention
```
feature/{feature-name}
feature/epic-{number}-{feature-name}
feature/{feature-name}-{date}
```

### Feature Folder Structure
```
plan/{feature-name}/
├── idea.mdc                 # Feature ideation document
├── research/               # Research and analysis
│   ├── competitive-analysis.mdc
│   ├── user-research.mdc
│   └── technical-research.mdc
├── assets/                 # Visual assets, mockups, diagrams
├── meetings/               # Meeting notes and decisions
└── archive/                # Previous versions and research
```

### Idea Document Template
```markdown
# Feature Idea: {Feature Name}

## Overview
- **Feature Name**: [Clear, descriptive name]
- **Idea Date**: [Current date]
- **Proposed By**: [User/team name]
- **Priority**: [urgency_level]
- **Status**: [ideation/planning/development/completed]

## Problem Statement
[Clear description of the problem this feature solves]

## User Value Proposition
[How this benefits users and the business]

## Success Metrics
[Specific, measurable outcomes]

## Scope
### In Scope
- [Specific features and capabilities]
### Out of Scope
- [Explicitly excluded items]

## Key Questions & Answers
[Q&A from the ideation process]

## Initial Research Findings
[Competitive analysis, technical considerations, etc.]

## Next Steps
[PRD creation, stakeholder approval, technical investigation]

## Stakeholders
[List of key stakeholders and their roles]
```

## Tools & Resources

### Git Operations
```bash
# Create feature branch
git checkout -b feature/{feature-name}
git push -u origin feature/{feature-name}

# Create feature folder structure
mkdir -p plan/{feature-name}/{research,assets,meetings,archive}
```

### Research Tools
- **Web Search**: Research competing solutions and best practices
- **Codebase Analysis**: Search for related features and patterns
- **Documentation Review**: Check existing technical documentation
- **Stakeholder Interviews**: Schedule and document discussions

### Documentation Tools
- **Markdown**: Structured documentation
- **Diagrams**: Visual representations of workflows
- **Mockups**: UI/UX design sketches
- **Spreadsheets**: Data analysis and planning

## Quality Checks

### Before Completing Ideation
- [ ] Problem statement is clear and compelling
- [ ] User value proposition is well-defined
- [ ] Success metrics are specific and measurable
- [ ] Scope boundaries are clearly defined
- [ ] Key risks and challenges are identified
- [ ] Stakeholders are identified and informed
- [ ] Technical feasibility is assessed
- [ ] Feature branch is created and pushed
- [ ] Folder structure is properly organized
- [ ] Idea documentation is complete and structured

### Documentation Requirements
- [ ] All questions asked and answered
- [ ] Research findings documented
- [ ] Success criteria defined
- [ ] Next steps clearly outlined
- [ ] Contact information for stakeholders included

## Output Format

The prompt should produce:

### Git & File Operations
- New feature branch created and pushed
- Organized feature folder structure
- Comprehensive idea.mdc document

### Documentation
- Complete problem and value proposition
- Detailed scope definition
- Research findings and analysis
- Clear next steps and timeline

### Communication
- Summary of ideation session
- Identified risks and mitigation strategies
- Stakeholder alignment status
- Recommendations for PRD development

## Usage Instructions

1. **Start with the raw idea**: Take the user's initial concept
2. **Ask systematic questions**: Follow the question framework
3. **Document everything**: Create comprehensive records
4. **Set up infrastructure**: Branch, folders, initial docs
5. **Prepare for next phase**: Ensure PRD development can proceed smoothly

## Success Criteria

The ideation phase is successful when:
- The feature idea is fully explored and understood
- Clear problem statement and value proposition exist
- Success metrics and scope boundaries are defined
- Technical feasibility is assessed
- All stakeholders are identified and aligned
- Infrastructure is set up for the next phase
- The idea.mdc document is complete and actionable
- The feature is ready for PRD development

## Integration with Workflow

This ideation prompt feeds directly into:
- **feature-prd-creation.mdc**: Uses the idea.mdc as input
- **feature-tech-specs.mdc**: Later builds on PRD outputs
- **create-epic.mdc**: Uses structured outputs for epic generation
- **develop-story.mdc**: Individual story development
- **task-tracker.md**: Progress tracking throughout development

The structured outputs ensure seamless handoff between development phases while maintaining traceability from initial idea to final implementation.