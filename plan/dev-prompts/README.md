# Development Prompts - Systematic Feature Development Workflow

This directory contains a comprehensive set of prompts designed to orchestrate the entire feature development lifecycle, from initial concept to production deployment. These prompts are generic and can be applied to any feature development project.

## Overview

The development workflow consists of **5 systematic prompts** that guide the complete feature development process:

```
Business Requirements → Epic Creation → Story Validation → Story Development → Epic Completion
```

## The Prompt Ecosystem

### 1. [create-epic.mdc](./create-epic.mdc) 📋
**Purpose**: Transform business requirements into well-structured development epics

**When to Use**:
- You have business requirements or feature ideas
- Need to plan a new feature from scratch
- Want to structure complex features into manageable epics

**Input**: Feature name, description, business requirements
**Output**: Epic definitions, implementation tasks, technical specifications

### 2. [shard-epic.mdc](./shard-epic.mdc) 🔧
**Purpose**: Break down epics into individual, development-ready stories

**When to Use**:
- You have defined epics and need detailed stories
- Want to create story files with comprehensive details
- Need to prepare stories for development team assignment

**Input**: Epic number/name, feature path, implementation tasks
**Output**: Detailed story files with acceptance criteria and technical requirements

### 3. [validate-stories.mdc](./validate-stories.mdc) ✅
**Purpose**: Pre-development quality assurance to ensure stories are ready for development

**When to Use**:
- Stories have been created but development hasn't started
- Need to identify gaps, conflicts, or issues before development
- Want to ensure development team won't be blocked by unclear requirements

**Input**: Epic folder path, validation level, team context
**Output**: Validation report, identified issues, recommended fixes

### 4. [develop-story.mdc](./develop-story.mdc) 🚀
**Purpose**: Orchestrate the complete development of individual stories

**When to Use**:
- Ready to implement a specific story
- Need end-to-end story development (implementation, testing, validation)
- Want systematic development with quality assurance

**Input**: Story file path, development context, mode
**Output**: Implemented story, tests, documentation, integration

### 5. [post-epic-tasks.mdc](./post-epic-tasks.mdc) 🎯
**Purpose**: Complete epic validation, QA, and deployment automation

**When to Use**:
- All stories in an epic are completed
- Need comprehensive epic testing and validation
- Want to automate deployment and pull request creation

**Input**: Epic folder path, feature branch, epic details
**Output**: Epic integration, automated PR, deployment readiness

## Complete Development Workflow

### Phase 1: Feature Planning
```bash
# Step 1: Create epics from business requirements
create-epic.mdc "AI-powered contact discovery"

# Step 2: Break down epics into stories
shard-epic.mdc "epic-2" "ai-search-service" "plan/ai-contact-discovery"

# Step 3: Validate stories are ready for development
validate-stories.mdc "plan/ai-contact-discovery/stories/epic-2-ai-search-service"
```

### Phase 2: Development
```bash
# Step 4: Develop individual stories (can be parallel)
develop-story.mdc "plan/ai-contact-discovery/stories/epic-2-ai-search-service/story-2.1-query-generation-service.mdc"
develop-story.mdc "plan/ai-contact-discovery/stories/epic-2-ai-search-service/story-2.2-contact-extraction-pipeline.mdc"
develop-story.mdc "plan/ai-contact-discovery/stories/epic-2-ai-search-service/story-2.3-search-orchestration-service.mdc"
```

### Phase 3: Integration and Deployment
```bash
# Step 5: Complete epic and deploy
post-epic-tasks.mdc "plan/ai-contact-discovery/stories/epic-2-ai-search-service" "feature/ai-contact-discovery"
```

## Key Benefits

### 🎯 **Systematic Approach**
- Each phase has clear inputs, outputs, and success criteria
- Reduces ambiguity and ensures comprehensive coverage
- Provides consistency across different features and teams

### 🔄 **Iterative Quality Assurance**
- Quality checks built into every phase
- Early identification of issues and gaps
- Continuous validation throughout development

### 🚀 **Automation Integration**
- Git operations automated with proper commit messages
- Pull request creation with comprehensive descriptions
- Testing and validation integrated into workflow

### 📊 **Team Collaboration**
- Clear handoffs between phases
- Standardized documentation and communication
- Reduced dependency on individual expertise

### 🛡️ **Risk Mitigation**
- Early identification of technical and business risks
- Dependency analysis and conflict resolution
- Rollback and recovery procedures documented

## Customization Guidelines

### For Different Team Sizes

**Small Teams (2-4 developers)**
- Use **lenient** validation level to avoid overhead
- Combine smaller stories for better efficiency
- Focus on documentation for knowledge sharing

**Medium Teams (5-15 developers)**
- Use **normal** validation level for balance
- Standard story sizes (2-3 days) work well
- Implement parallel development workflows

**Large Teams (15+ developers)**
- Use **strict** validation level for consistency
- Break stories into smaller chunks (1-2 days)
- Implement formal code review processes

### For Different Project Types

**Backend-Heavy Projects**
- Focus on API contracts and database design
- Emphasize performance and security testing
- Include comprehensive integration testing

**Frontend-Heavy Projects**
- Focus on component specifications and user experience
- Emphasize accessibility and cross-browser testing
- Include design system integration

**Data-Intensive Projects**
- Focus on data modeling and migration strategies
- Emphasize data validation and quality testing
- Include comprehensive data pipeline testing

**Integration Projects**
- Focus on external service contracts and APIs
- Emphasize error handling and resilience testing
- Include comprehensive end-to-end testing

## Quality Standards

### Story Quality Standards
- **Clear Objectives**: Each story has a specific, achievable goal
- **Measurable Criteria**: Acceptance criteria can be objectively validated
- **Technical Feasibility**: Requirements are achievable with available resources
- **Appropriate Size**: Stories can be completed in 1-5 days
- **Complete Documentation**: All necessary information is provided

### Code Quality Standards
- **Type Safety**: Full TypeScript coverage with proper typing
- **Test Coverage**: >90% coverage for new code
- **Error Handling**: Comprehensive error handling and logging
- **Security**: Following security best practices
- **Performance**: Meeting defined performance benchmarks
- **Documentation**: Clear code comments and API documentation

### Process Quality Standards
- **Git Hygiene**: Clean commit history with descriptive messages
- **Review Process**: All code passes through code review
- **Automation**: Automated testing and validation where possible
- **Monitoring**: Proper monitoring and alerting configured
- **Documentation**: User-facing and technical documentation kept current

## Common Workflows

### New Feature Development
```
Business Idea → create-epic → shard-epic → validate-stories → develop-story (parallel) → post-epic-tasks
```

### Feature Enhancement
```
Enhancement Request → shard-epic (existing) → validate-stories → develop-story → post-epic-tasks
```

### Bug Fix Epic
```
Bug Analysis → create-epic (bug-focused) → shard-epic → validate-stories → develop-story → post-epic-tasks
```

### Refactoring Project
```
Technical Debt → create-epic (refactoring) → shard-epic → validate-stories → develop-story → post-epic-tasks
```

## Troubleshooting Guide

### Common Issues and Solutions

**Stories Too Large**
- Use validate-stories to identify oversized stories
- Break down into smaller, focused stories
- Ensure each story delivers independent value

**Dependencies Not Clear**
- Use validate-stories with strict validation level
- Create dependency diagrams
- Sequence stories to handle dependencies properly

**Acceptance Criteria Vague**
- Review story validation reports
- Rewrite criteria to be specific and measurable
- Add examples and expected outcomes

**Integration Issues**
- Use post-epic-tasks for comprehensive integration testing
- Test stories together early in development
- Plan for integration time in estimates

**Quality Issues**
- Use stricter validation levels
- Implement code review checklists
- Add automated quality gates

## Best Practices

### Before Starting
1. **Understand Requirements**: Ensure business requirements are clear
2. **Assess Team Capacity**: Know your team's skills and availability
3. **Set Quality Standards**: Define what "done" means for your team
4. **Plan Infrastructure**: Ensure tools and environments are ready

### During Development
1. **Iterative Validation**: Run validate-stories after each batch of story creation
2. **Parallel Development**: Use develop-story for parallel work when possible
3. **Continuous Integration**: Test and validate frequently
4. **Documentation**: Keep documentation updated as you develop

### After Completion
1. **Comprehensive Testing**: Use post-epic-tasks for thorough validation
2. **Knowledge Sharing**: Document lessons learned
3. **Process Improvement**: Refine prompts and workflows based on experience
4. **Celebrate Success**: Recognize team achievements

## Metrics and Monitoring

### Development Metrics
- **Cycle Time**: Time from story start to completion
- **Throughput**: Number of stories completed per time period
- **Quality**: Number of bugs found after deployment
- **Predictability**: Accuracy of time estimates

### Quality Metrics
- **Test Coverage**: Percentage of code covered by tests
- **Defect Density**: Number of defects per story
- **Customer Satisfaction**: Feedback on delivered features
- **Technical Debt**: Code quality metrics over time

### Process Metrics
- **Story Validation Success**: Percentage of stories passing validation
- **First Pass Success**: Stories completed without rework
- **Integration Success**: Percentage of successful epic integrations
- **Documentation Completeness**: Documentation quality metrics

## Contributing to the Prompts

These prompts are designed to be evolved and improved based on usage. To contribute:

1. **Document Issues**: Record problems or gaps you encounter
2. **Suggest Improvements**: Propose specific enhancements
3. **Share Success Stories**: Document successful use cases
4. **Test Changes**: Validate prompt improvements in real scenarios

## Getting Help

If you encounter issues with these prompts:

1. **Check this README**: Review troubleshooting and best practices
2. **Review Prompt Documentation**: Each prompt has detailed instructions
3. **Examine Validation Reports**: Issues are often clearly documented
4. **Consult Team Members**: Leverage team experience and knowledge

## License and Usage

These prompts are designed for internal development use. They can be adapted and customized to fit specific team needs and project requirements. The core principles and workflow structure can be applied to any software development project following modern development practices.