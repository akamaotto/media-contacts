# Develop Documentation Story - AI-Powered Documentation Orchestrator

## Purpose
This prompt orchestrates the development of documentation-focused stories by leveraging Claude Code's tools and the broader development ecosystem to create, review, and validate documentation requirements.

## Usage
Run this prompt when you have a specific documentation story file and need to develop it from start to finish, including content creation, review, and validation.

## Input Parameters
- **story_file**: Path to the story file (e.g., `plan/{feature}/stories/epic-{number}-{name}/story-{number}-{name}.mdc`)
- **feature_context**: Current codebase context and available documentation tools
- **development_mode**: Development approach (sequential, parallel, experimental)

## Development Workflow

### Phase 1: Analysis & Planning
1. **Read Story File**: Parse the story requirements, acceptance criteria, and documentation specifications
2. **Analyze Current Documentation**: Understand existing documentation structure, patterns, and integration points
3. **Create Documentation Plan**: Break down the story into creatable documentation components
4. **Identify Dependencies**: Determine what documentation needs to be created first
5. **Check Cross-Story Coordination**: Verify no conflicts with other documentation stories in development

### Phase 2: Content Creation
1. **Set Up Documentation Environment**: Ensure all templates and style guides are available
2. **Create Core Documentation**: Write the main content following technical requirements
3. **Add Supporting Materials**: Create diagrams, screenshots, and examples as specified
4. **Update Cross-References**: Add necessary links between related documentation
5. **Handle Accessibility**: Ensure all content meets accessibility standards

### Phase 3: Review & Validation
1. **Content Review**: Perform technical accuracy review with subject matter experts
2. **User Testing**: Test documentation with actual users for clarity and effectiveness
3. **Accessibility Testing**: Verify screen reader compatibility and WCAG compliance
4. **Cross-Browser Testing**: Test online documentation across supported browsers
5. **Validate Acceptance Criteria**: Verify all acceptance criteria are met

### Phase 4: Publication & Integration

#### 4.1 Documentation Structure Analysis
1. **Verify Directory Structure**: Ensure documentation follows the expected layout
2. **Check Navigation**: Verify all cross-references and navigation links work
3. **Validate Formatting**: Ensure consistent formatting and style throughout
4. **Review Search Integration**: Test documentation search functionality
5. **Check Version Control**: Ensure documentation changes are properly tracked

#### 4.2 Content Quality Research via Context7
For technical documentation requiring current information:
```typescript
// Use Context7 to get current technical documentation
const techDocs = await mcp__context7__resolve-library-id("technology-name");
const currentDocs = await mcp__context7__get-library-docs(techDocs.id, "latest-best-practices");
```

#### 4.3 Web Search for Current Best Practices
Search for:
- Latest documentation standards and guidelines
- Industry best practices for technical writing
- Current accessibility compliance requirements
- User experience trends in documentation
- Video production best practices (if applicable)

#### 4.4 Content Enhancement and Refinement
Based on research findings:
1. **Update outdated information**: Replace with current industry standards
2. **Leverage new documentation techniques**: Use modern content presentation methods
3. **Address common user issues**: Apply solutions from user feedback research
4. **Improve accessibility**: Apply latest accessibility best practices
5. **Enhance user experience**: Implement proven documentation UX patterns

#### 4.5 Reflection and Learning
Document findings and improvements:
- What documentation standards were outdated?
- What new best practices were identified?
- What user experience improvements were made?
- What accessibility enhancements were applied?
- What content organization changes were implemented?

### Phase 5: Publication & Finalization
1. **Final Review**: Perform comprehensive review against best practices
2. **Accessibility Audit**: Check for accessibility compliance issues
3. **Publication**: Publish documentation in appropriate locations
4. **Team Training**: Train team on new documentation and materials
5. **Update Task Tracker**: Mark story as completed in tasks-tracker.md
6. **Establish Maintenance**: Set up documentation maintenance plan

## Available Tools & Resources

### Documentation Analysis Tools
- **Context7 MCP**: Access up-to-date technical documentation and best practices
- **Web Search**: Research current documentation standards and industry trends
- **File System Operations**: Read existing documentation and analyze structure
- **Content Analysis**: Identify documentation patterns and usage

### Content Creation Tools
- **File System Operations**: Read, write, and navigate documentation files
- **Content Search**: Find existing documentation patterns and similar content
- **Git Operations**: Check status, create branches, commit documentation changes
- **Media Tools**: Create and manage screenshots, diagrams, and videos

### Review & Testing Tools
- **Accessibility Testing**: Screen reader compatibility and WCAG compliance
- **Cross-Browser Testing**: Verify documentation works across browsers
- **User Testing**: Gather feedback on documentation clarity and effectiveness
- **Content Validation**: Verify technical accuracy and completeness

### Publication Tools
- **Documentation Platforms**: Publish to appropriate documentation systems
- **Version Control**: Track documentation changes and maintain history
- **Search Integration**: Ensure documentation is discoverable and searchable
- **Analytics**: Track documentation usage and effectiveness

## Development Instructions

### 1. Story Analysis
```typescript
// Parse the documentation story to extract requirements
const storyAnalysis = {
  objective: "Clear statement of what documentation needs to be created",
  acceptanceCriteria: ["Specific documentation criteria list"],
  technicalRequirements: ["Documentation specifications"],
  dependencies: ["Prerequisite documentation"],
  testingRequirements: ["Review and testing requirements"],
  definitionOfDone: ["Documentation completion criteria"]
};
```

### 2. Cross-Story Coordination
Before starting development:
- **Check for concurrent documentation stories** in the same epic
- **Identify shared resources** (documentation templates, style guides, components)
- **Coordinate documentation structure changes** with other stories
- **Handle potential content conflicts** proactively

### 3. Content Creation Strategy
- **Follow existing patterns**: Use the same documentation style and structure as existing docs
- **Incremental creation**: Create content in small, reviewable chunks
- **Review-driven development**: Write content with continuous review and feedback
- **Accessibility first**: Ensure all content meets accessibility standards from the start
- **User-focused**: Always write with the end user in mind

### 4. Quality Assurance
- **Technical accuracy**: Ensure all technical content is accurate and up-to-date
- **Clarity and readability**: Use clear, concise language appropriate for the audience
- **Accessibility**: Ensure WCAG compliance where applicable
- **Cross-platform**: Test documentation on all supported platforms and browsers
- **User feedback**: Incorporate user feedback throughout the process

## Implementation Patterns

### User Documentation
```markdown
# User Guide Structure
## Getting Started
- Quick start tutorial
- Prerequisites and setup
- Basic concepts overview

## Feature Reference
- Detailed feature descriptions
- Step-by-step instructions
- Screenshots and examples
- Tips and best practices

## Troubleshooting
- Common issues and solutions
- Error message explanations
- Contact support information
```

### Developer Documentation
```markdown
# API Documentation Structure
## Overview
- API purpose and capabilities
- Authentication and authorization
- Rate limits and quotas

## Endpoints
- Endpoint descriptions
- Request/response examples
- Error handling
- Code samples

## Integration Guide
- Setup instructions
- Integration examples
- Best practices
- Troubleshooting
```

### Video Tutorial Structure
```markdown
# Video Production Plan
## Planning Phase
- Script and storyboard creation
- Recording setup and equipment
- Test recordings and quality checks

## Production Phase
- Content recording
- Screen captures and demonstrations
- Voice recording and narration
- Visual elements and branding

## Post-Production
- Video editing and assembly
- Closed captions and accessibility
- Quality assurance and testing
- Publication and distribution
```

## Documentation Research & Self-Reflection Framework

### Current Standards Analysis Process

#### Step 1: Documentation Standards Extraction
```typescript
// Analyze existing documentation to extract current standards
const existingPatterns = extractDocumentationPatterns(existingDocs);
// Example output: ['markdown-style', 'heading-structure', 'code-example-format']
```

#### Step 2: Industry Standards Assessment
```typescript
// For each documentation type, assess current industry standards
const industryStandards = {
  'technical-documentation': {
    currentStandard: 'Diátaxis framework', // Latest industry standard
    knowledgeDate: '2024-01',
    features: ['User guides', 'Tutorials', 'Reference', 'Explanation']
  },
  'accessibility': {
    currentStandard: 'WCAG 2.2 AA', // Latest accessibility standard
    knowledgeDate: '2023-10',
    features: ['Screen reader support', 'Keyboard navigation', 'Color contrast']
  }
};
```

#### Step 3: Current Documentation Analysis
```bash
# Review existing documentation structure
find docs/ -name "*.md" -exec wc -l {} \;
# Or analyze documentation structure directly
tree docs/ --filelimit=10
```

#### Step 4: Standards Gap Identification
```typescript
const standardsGaps = {
  'technical-documentation': {
    currentStandard: 'Basic markdown',
    industryStandard: 'Diátaxis framework',
    gap: 'major',
    impact: 'user_experience_degraded'
  },
  'accessibility': {
    currentStandard: 'Basic alt-text',
    industryStandard: 'WCAG 2.2 AA',
    gap: 'minor',
    impact: 'accessibility_compliance_needed'
  }
};
```

### Context7 Documentation Research

#### Standards Resolution
```typescript
// Use Context7 to get current documentation standards
const resolveDocumentationStandard = async (standardName: string) => {
  try {
    const standardId = await mcp__context7__resolve-library_id(standardName);
    return {
      success: true,
      standardId: standardId.id,
      description: standardId.description
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
```

#### Best Practices Research
```typescript
// Get best practices for documentation gaps
const getBestPractices = async (documentationType: string, currentStandard: string) => {
  const standardId = await mcp__context7__resolve-library_id(documentationType);
  if (standardId) {
    const docs = await mcp__context7__get-library-docs(
      standardId.id,
      `best-practices-${currentStandard}`
    );
    return docs;
  }
};
```

### Web Search Integration

#### Standards Research
```typescript
// Search for current documentation standards and best practices
const searchDocumentationStandards = async (docType: string, fromStandard: string, toStandard: string) => {
  const queries = [
    `${docType} documentation standards ${fromStandard} vs ${toStandard}`,
    `${docType} ${toStandard} best practices`,
    `${docType} documentation user experience trends ${toStandard}`,
    `${docType} accessibility compliance ${toStandard}`,
    `${docType} documentation metrics ${toStandard}`
  ];

  const results = await Promise.all(
    queries.map(query => mcp__brave_search__brave_web_search({ query }))
  );

  return analyzeSearchResults(results);
};
```

#### User Experience Analysis
```typescript
// Search for documentation user experience insights
const searchUserExperience = async (docType: string, audience: string) => {
  const searchQuery = `${docType} documentation user experience ${audience} best practices`;
  return await mcp__brave_search__brave_web_search({
    query: searchQuery,
    count: 10
  });
};
```

### Content Enhancement Process

#### Documentation Structure Refactoring
```typescript
// Example: Update basic documentation to Diátaxis framework
const updateToDiátaxisFramework = (content: string) => {
  // Reorganize content into four types
  content = reorganizeContent(content, {
    tutorials: 'step-by-step learning',
    howToGuides: 'goal-oriented instructions',
    reference: 'technical information',
    explanation: 'understanding and context'
  });

  // Update navigation structure
  content = updateNavigation(content, 'diátaxis-structure');

  // Add cross-references between types
  content = addCrossReferences(content, 'diátaxis-patterns');

  return content;
};
```

#### Accessibility Enhancement Application
```typescript
// Apply latest accessibility best practices based on research
const applyAccessibilityEnhancements = (content: string, accessibilityFindings: string[]) => {
  accessibilityFindings.forEach(finding => {
    if (finding.includes('screen reader')) {
      // Update content for screen reader compatibility
      content = enhanceScreenReaderSupport(content);
    }
    if (finding.includes('keyboard navigation')) {
      // Add keyboard navigation support
      content = addKeyboardNavigation(content);
    }
    if (finding.includes('color contrast')) {
      // Improve color contrast for visual elements
      content = improveColorContrast(content);
    }
  });

  return content;
};
```

### Self-Reflection Documentation

#### Reflection Template
```markdown
# Documentation Standards Analysis & Self-Reflection

## Standards Inventory
| Documentation Type | Current Standard | Industry Standard | Gap | Impact |
|-------------------|------------------|-------------------|-----|---------|
| Technical Docs | Basic markdown | Diátaxis framework | Major | User experience degraded |
| Accessibility | Basic alt-text | WCAG 2.2 AA | Minor | Compliance needed |

## Research Findings

### Standards Gaps Identified
- **Documentation structure**: Current docs lack clear user journey organization
- **Content types**: Missing dedicated tutorials and explanation content
- **Navigation**: Inconsistent cross-references and linking structure

### New Best Practices Leveraged
- **Diátaxis framework**: Clear separation of tutorials, how-to guides, reference, and explanation
- **Accessibility 2.2**: Enhanced screen reader support and keyboard navigation
- **User experience metrics**: Improved content discoverability and task completion

### User Experience Improvements Applied
- **Content organization**: Restructured documentation to follow user journeys
- **Navigation**: Enhanced cross-references and related content links
- **Search optimization**: Improved metadata and tagging for better discoverability

### Accessibility Enhancements Applied
- **Screen reader support**: Enhanced alt-text descriptions and ARIA labels
- **Keyboard navigation**: Improved tab order and focus management
- **Color contrast**: Updated visual elements to meet WCAG standards

### Content Quality Improvements
- **Technical accuracy**: Updated all technical content with latest information
- **User feedback**: Incorporated user testing feedback and suggestions
- **Maintainability**: Established clear documentation maintenance processes

## Content Changes Made
1. Restructured documentation to follow Diátaxis framework
2. Enhanced accessibility features throughout all content
3. Improved cross-references and navigation between sections
4. Updated technical content with current industry standards

## Lessons Learned
- Documentation standards evolve rapidly and require regular review
- User experience is as important in documentation as in applications
- Accessibility compliance is essential for inclusive documentation
- Content maintenance is as important as initial creation
```

## Implementation Instructions for AI

### Self-Reflection Execution Order

1. **After initial content creation**, pause for standards analysis
2. **Extract all documentation patterns** from the created content
3. **Assess current standards** for each documentation type vs industry standards
4. **Research significant standards gaps** (major framework or compliance differences)
5. **Apply content improvements** based on research findings
6. **Document reflection** with all changes and reasoning
7. **Finalize documentation** with enhanced content

### Quality Checks for Documentation Analysis

- [ ] All documentation types have been identified
- [ ] Standards gaps have been assessed for impact
- [ ] Industry best practices have been researched and applied
- [ ] User experience improvements have been implemented
- [ ] Accessibility enhancements have been applied
- [ ] Content quality improvements have been implemented
- [ ] Documentation has been updated to use current best practices
- [ ] Reflection documentation is complete
- [ ] All changes have been reviewed and validated

## Task Tracker Management

### Updating tasks-tracker.md
When a documentation story is completed, update the tasks-tracker.md file:

1. **Locate the story row** in the appropriate epic table
2. **Update the checkbox** from ☐ to ☑ or from `[ ]` to `[x]`
3. **Update status column** from 'in-progress' to 'completed'
4. **Add completion date** in the Completed Date column
5. **Update epic progress** - recalculate the completion percentage
6. **Add completion notes** if relevant

### Example Task Tracker Update
```markdown
# Before completion
| ☐ Create user documentation | in-progress | technical-writer | | User guides and tutorials |

# After completion
| ☑ Create user documentation | completed | technical-writer | 2024-01-15 | Complete user guides with accessibility compliance |
```

### Epic Progress Calculation
```markdown
# Epic Progress Summary
| Epic | Status | Progress | Stories Completed | Total Stories |
|------|--------|----------|------------------|---------------|
| Documentation | in-progress | 75% | 3/4 | 4 |
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
// Read existing documentation patterns
const existingPattern = await ReadFile('docs/user/existing-guide.md');

// Create new documentation
await WriteFile('docs/user/new-guide.md', content);

// Update navigation in related files
await EditFile('docs/user/README.md', {
  oldText: '- [Existing Guide](existing-guide.md)',
  newText: '- [Existing Guide](existing-guide.md)\n- [New Guide](new-guide.md)'
});
```

### Documentation Structure Operations
```typescript
// Create documentation structure
await Bash('mkdir -p docs/user docs/developer docs/support');

// Verify documentation structure
await Bash('tree docs/ --filelimit=5');

// Check for broken links
await Bash('find docs/ -name "*.md" -exec grep -l "broken-link" {} \;');
```

### Review Operations
```typescript
// Run accessibility tests
await Bash('pa11y docs/user/new-guide.md');

// Check for spelling and grammar
await Bash('cspell docs/user/new-guide.md');

// Validate markdown formatting
await Bash('markdownlint docs/user/new-guide.md');
```

### Publication Operations
```typescript
// Publish documentation to platform
await Bash('npm run docs:publish');

// Update search index
await Bash('npm run docs:index');

// Generate documentation metrics
await Bash('npm run docs:metrics');
```

## Quality Checkpoints

### Before Content Creation
- [ ] Story requirements are clear and complete
- [ ] Documentation templates and style guides are available
- [ ] Content creation environment is ready
- [ ] Review process is established
- [ ] Cross-story conflicts are checked

### During Content Creation
- [ ] Content follows existing documentation patterns and conventions
- [ ] Accessibility is considered throughout the creation process
- [ ] User feedback is incorporated continuously
- [ ] Technical accuracy is verified with subject matter experts
- [ ] Cross-references are maintained and updated

### After Content Creation
- [ ] All acceptance criteria are met
- [ ] Content is reviewed and approved by stakeholders
- [ ] Documentation is properly structured and formatted
- [ ] Accessibility requirements are satisfied
- [ ] No cross-story conflicts introduced
- [ ] **Documentation standards analysis completed**
- [ ] **Industry best practices researched and applied**
- [ ] **Content updated with current standards**
- [ ] **Accessibility enhancements applied**
- [ ] **User experience improvements implemented**
- [ ] **Self-reflection documentation completed**
- [ ] Task tracker is updated with story completion status
- [ ] Epic progress is recalculated and updated
- [ ] Completion notes are added to task tracker

## Error Handling & Recovery

### Common Issues
- **Content accuracy issues**: Review with subject matter experts
- **Accessibility compliance failures**: Test with accessibility tools and users
- **User experience problems**: Gather user feedback and iterate
- **Technical documentation errors**: Verify with technical experts
- **Cross-story conflicts**: Coordinate with other documentation writers

### Recovery Strategies
- **Content revision**: Update content based on feedback and testing
- **Incremental improvements**: Address issues one at a time
- **Seek expert review**: Consult subject matter experts for technical accuracy
- **User testing**: Test documentation with actual users
- **Coordination**: Communicate with team on documentation dependencies

## Output Format

The AI should provide a comprehensive development report including:

### Development Summary
- Story objective and approach taken
- Content creation decisions made and rationale
- Challenges encountered and solutions applied
- Files created/modified with brief descriptions
- Cross-story coordination performed

### Documentation Standards Analysis Results
- **Standards Inventory**: List of all documentation types with standards analysis
- **Standards Gaps Identified**: Significant differences between current and industry standards
- **Best Practices Researched**: Analysis of current documentation standards and requirements
- **Content Improvements Made**: Specific enhancements based on current standards
- **Accessibility Enhancements**: Applied latest accessibility best practices
- **User Experience Improvements**: Leveraged proven documentation UX patterns

### Review Results
- Content review results and approvals
- User testing feedback and outcomes
- Accessibility testing results
- Cross-browser testing outcomes
- Acceptance criteria validation results

### Self-Reflection Documentation
- **Lessons Learned**: Key insights about documentation standards and user experience
- **Standards Challenges**: Issues encountered and solutions applied
- **Best Practices Applied**: Current documentation practices implemented
- **Future Considerations**: Recommendations for ongoing documentation maintenance

### Quality Metrics
- Content completeness percentage
- Accessibility compliance results
- User satisfaction scores
- Documentation usage metrics
- Review completion status

### Final Status
- Whether the story is complete according to definition of done
- Any outstanding items or blockers
- Recommendations for next steps or review
- Impact on other documentation or system components

## Usage Instructions

To use this prompt:

1. **Provide the story file path**: Specify which documentation story to develop
2. **Specify development context**: Current documentation state and constraints
3. **Follow the development workflow**: Systematically create, review, and validate
4. **Use available tools**: Leverage available documentation tools and capabilities
5. **Document progress**: Track creation decisions and outcomes
6. **Validate completion**: Ensure all requirements are met before marking complete
7. **Handle cross-story coordination**: Check for conflicts and coordinate as needed

## Notes for AI Implementation

- Always start by thoroughly reading and understanding the documentation story requirements
- Use existing documentation patterns and conventions as much as possible
- Create incrementally with frequent review and validation
- Document decisions and trade-offs made during content creation
- Validate acceptance criteria systematically
- Don't hesitate to ask for clarification on ambiguous requirements
- Consider the broader documentation context when creating individual stories
- Ensure all changes integrate well with the existing documentation structure
- Be mindful of other documentation stories that might be in parallel development
- Communicate blockers and dependencies early

## Success Criteria

The documentation story development is successful when:
- All acceptance criteria are met and validated
- All content reviews are completed and approved
- Documentation integrates seamlessly with existing structure
- Accessibility and user experience requirements are satisfied
- Documentation is complete and accurate
- No cross-story conflicts or issues introduced
- The documentation is ready for publication and use
- Definition of done is fully satisfied