# Validate Stories - Pre-Development Quality Assurance

## Purpose
This prompt performs comprehensive validation of story files before development begins, ensuring stories are complete, technically feasible, properly sized, and ready for development. It identifies gaps, conflicts, and blockers before teams start implementation.

## Usage
Run this prompt after creating stories with the shard-epic prompt but before starting development with the develop-story prompt. This ensures all stories are development-ready.

## Input Parameters
- **epic_folder_path**: Path to the epic folder containing stories (e.g., "plan/{feature}/stories/epic-1-foundation-infrastructure")
- **feature_path**: Path to the feature planning directory (e.g., "plan/{feature}")
- **validation_level**: Strictness level (strict: all issues must be resolved, normal: minor issues allowed, lenient: critical issues only)
- **team_context**: Team size, skill level, and development constraints (optional)

## Validation Workflow

### Phase 1: Story Discovery and Inventory

#### 1.1 Story File Analysis
- [ ] **Discover all story files** in the epic folder
- [ ] **Validate file naming** follows expected pattern (`story-{number}-{name}.mdc`)
- [ ] **Check for duplicate story numbers** or naming conflicts
- [ ] **Verify story sequence** is logical and consecutive
- [ ] **Identify missing stories** based on implementation tasks

#### 1.2 Story Structure Validation
- [ ] **Validate story headers** contain all required fields
- [ ] **Check story sections** are complete and properly formatted
- [ ] **Verify story metadata** consistency across all stories
- [ ] **Check for broken cross-references** and links
- [ ] **Validate markdown formatting** and structure

### Phase 2: Content Quality Assessment

#### 2.1 Story Objectives and Acceptance Criteria
- [ ] **Validate objectives** are clear, specific, and achievable
- [ ] **Check acceptance criteria** are specific, measurable, and testable
- [ ] **Verify acceptance criteria completeness** (covers all aspects of the story)
- [ ] **Check for ambiguous language** or unclear requirements
- [ ] **Validate acceptance criteria align** with story objectives

#### 2.2 Technical Requirements Validation
- [ ] **Assess technical feasibility** based on current system architecture
- [ ] **Validate technical specifications** are detailed enough for implementation
- [ ] **Check for missing technical requirements** or architectural considerations
- [ ] **Verify integration points** are clearly identified and feasible
- [ ] **Assess complexity** and match against estimated time

#### 2.3 Dependencies and Prerequisites
- [ ] **Validate story dependencies** are correctly identified
- [ ] **Check for circular dependencies** between stories
- [ ] **Verify dependency order** is logical and achievable
- [ ] **Assess external dependencies** and their availability
- [ ] **Check for missing dependencies** that could block development

### Phase 3: Development Readiness Assessment

#### 3.1 Story Sizing and Estimation
- [ ] **Validate time estimates** are realistic for story complexity
- [ ] **Check story size** is appropriate for development (1-5 days ideal)
- [ ] **Identify oversized stories** that need to be split
- [ ] **Identify undersized stories** that could be combined
- [ ] **Assess estimation consistency** across similar stories

#### 3.2 Testing Requirements Validation
- [ ] **Validate testing requirements** are comprehensive and appropriate
- [ ] **Check for missing test types** (unit, integration, E2E, performance)
- [ ] **Verify test scenarios** cover acceptance criteria
- [ ] **Assess testing feasibility** with available tools and resources
- [ **Check for testing dependencies** on external systems or data

#### 3.3 Definition of Done Assessment
- [ ] **Validate definition of done** is specific and measurable
- [ ] **Check definition completeness** (covers all aspects of completion)
- [ ] **Verify definition aligns** with team standards and practices
- [ ] **Assess definition feasibility** within the story context
- [ ] **Check for subjective criteria** that can't be objectively measured

### Phase 4: Cross-Story Analysis

#### 4.1 Epic-Level Consistency
- [ ] **Validate story objectives** align with epic objectives
- [ ] **Check for overlap** or redundancy between stories
- [ ] **Identify gaps** in epic coverage across all stories
- [ ] **Validate story sequence** creates a logical development flow
- [ ] **Check epic acceptance criteria** coverage across stories

#### 4.2 Integration and Dependencies
- [ ] **Validate shared resources** are properly coordinated
- [ ] **Check for database schema conflicts** between stories
- [ ] **Identify API endpoint conflicts** or overlaps
- [ ] **Validate UI component coordination** across stories
- [ ] **Check for parallel development conflicts**

#### 4.3 Resource and Skill Assessment
- [ ] **Validate skill requirements** match team capabilities
- [ ] **Check for specialized knowledge** requirements
- [ ] **Assess tool and infrastructure needs**
- [ ] **Identify training or knowledge gaps**
- [ ] **Validate resource availability** for story completion

### Phase 5: Risk and Issue Identification

#### 5.1 Risk Assessment
- [ ] **Identify technical risks** for each story
- [ ] **Assess business risks** related to story implementation
- [ ] **Check for external dependencies** that create risk
- [ ] **Identify knowledge gaps** that could impact development
- [ ] **Assess timeline risks** and mitigation strategies

#### 5.2 Blocker Identification
- [ ] **Identify current blockers** to story development
- [ ] **Check for missing prerequisites** or dependencies
- [ ] **Assess environment or tool constraints**
- [ ] **Identify external factors** that could delay development
- [ ] **Check for team availability** constraints

## Validation Criteria and Standards

### Story Quality Standards

#### Critical Issues (Must Fix)
- Missing or unclear objectives
- No acceptance criteria or untestable criteria
- Infeasible technical requirements
- Missing critical dependencies
- Undefined or unrealistic time estimates
- Missing definition of done

#### Major Issues (Should Fix)
- Overly broad or vague acceptance criteria
- Incomplete technical specifications
- Unrealistic time estimates
- Missing testing requirements
- Incomplete definition of done
- Story size too large (>5 days) or too small (<0.5 days)

#### Minor Issues (Could Fix)
- Slightly ambiguous language
- Minor formatting inconsistencies
- Could improve cross-references
- Could enhance documentation
- Minor estimation discrepancies

### Validation Outputs

#### Validation Report Structure
```markdown
# Story Validation Report - Epic {epic_number}: {epic_name}

## Executive Summary
- Stories analyzed: {number}
- Critical issues: {number}
- Major issues: {number}
- Minor issues: {number}
- Overall readiness: {Ready|Needs Work|Not Ready}

## Story-by-Story Analysis

### Story {epic_number}.{story_number}: {story_name}
**Status**: {Valid|Needs Work|Invalid}
**Issues Found**: {number} critical, {number} major, {number} minor

#### Critical Issues
- {Issue description and location}
- {Recommended fix}

#### Major Issues
- {Issue description and location}
- {Recommended fix}

#### Minor Issues
- {Issue description and location}
- {Recommended fix}

#### Recommendations
- {Specific recommendations for improvement}

## Epic-Level Analysis

### Cross-Story Issues
- {Issue affecting multiple stories}
- {Recommended resolution approach}

### Epic Completeness
- {Coverage analysis}
- {Gap identification}

### Development Readiness
- {Overall assessment}
- {Blocking issues}

## Recommendations

### Immediate Actions (Required Before Development)
- {Action item 1}
- {Action item 2}

### Suggested Improvements
- {Improvement suggestion 1}
- {Improvement suggestion 2}

### Development Considerations
- {Consideration 1}
- {Consideration 2}
```

## Automated Validation Checks

### File Structure Validation
```bash
# Check story file naming pattern
find {epic_folder_path} -name "story-*.mdc" | sort

# Validate markdown syntax
for file in {epic_folder_path}/*.mdc; do
  echo "Validating $file"
  markdownlint "$file"
done

# Check for broken internal links
for file in {epic_folder_path}/*.mdc; do
  echo "Checking links in $file"
  markdown-link-check "$file"
done
```

### Content Pattern Validation
```bash
# Check for required sections in each story
for file in {epic_folder_path}/*.mdc; do
  echo "Checking sections in $(basename $file)"
  grep -E "^## (Objective|Acceptance Criteria|Technical Requirements|Definition of Done|Testing Requirements)" "$file" | wc -l
done

# Validate acceptance criteria format
grep -r "^\- \[ \]" {epic_folder_path}/ | wc -l

# Check for story header format
grep -r "^# Story [0-9]" {epic_folder_path}/ | wc -l
```

## Resolution Strategies

### Critical Issue Resolution
1. **Missing Objectives**: Work with stakeholders to define clear story objectives
2. **Unclear Acceptance Criteria**: Rewrite criteria to be specific and measurable
3. **Infeasible Requirements**: Re-scope or find alternative approaches
4. **Missing Dependencies**: Identify and document all prerequisites
5. **Undefined Estimates**: Break down story or research requirements better

### Major Issue Resolution
1. **Vague Requirements**: Add specific details and examples
2. **Incomplete Specs**: Research and add missing technical details
3. **Unrealistic Estimates**: Re-estimate based on better analysis
4. **Missing Testing**: Add comprehensive testing requirements
5. **Size Issues**: Split large stories or combine small ones

### Minor Issue Resolution
1. **Language Clarity**: Improve wording and remove ambiguity
2. **Formatting**: Apply consistent markdown formatting
3. **Documentation**: Add missing or improve existing documentation
4. **Cross-references**: Add or improve links to related content

## Usage Instructions

To use this prompt:

1. **Specify Epic Location**: Provide the path to the epic folder
2. **Set Validation Level**: Choose strictness level based on team needs
3. **Provide Team Context**: Include team size, skill level, and constraints
4. **Review Validation Report**: Analyze identified issues and recommendations
5. **Address Critical Issues**: Fix all critical issues before development
6. **Plan for Major Issues**: Schedule time to address major issues
7. **Document Minor Issues**: Track minor issues for future improvement

## Expected Output

The AI should provide:
1. **Validation Summary**: Overall readiness assessment and issue counts
2. **Detailed Story Analysis**: Issues found for each story with specific locations
3. **Epic-Level Assessment**: Cross-story issues and completeness analysis
4. **Actionable Recommendations**: Specific fixes and improvements needed
5. **Development Readiness Score**: Quantitative assessment of readiness
6. **Next Steps**: What needs to be done before development can begin

Example:
```
✅ Story Validation Complete: Epic 1 - Foundation & Infrastructure
Stories analyzed: 3
Critical issues: 0
Major issues: 2
Minor issues: 5
Overall readiness: Ready (with minor improvements recommended)

Story 1.1: Database Schema Implementation - Valid
Story 1.2: API Infrastructure Setup - Needs Work (missing testing requirements)
Story 1.3: External Service Integration - Valid

Recommendations:
- Add integration testing requirements to Story 1.2
- Improve acceptance criteria specificity in Story 1.2
- Add performance testing scenarios across all stories

Development can begin after addressing the testing requirements in Story 1.2.
```

## Success Metrics

- **Completeness**: All required story sections are present and complete
- **Clarity**: Story requirements are specific, measurable, and unambiguous
- **Feasibility**: Technical requirements are achievable with available resources
- **Testability**: All acceptance criteria can be objectively tested
- **Readiness**: Stories are ready for development without requiring clarification
- **Consistency**: Stories follow consistent structure and quality standards