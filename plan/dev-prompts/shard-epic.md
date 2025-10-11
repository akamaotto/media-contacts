# Shard Epic into Development Stories

## Purpose
This prompt breaks down a feature epic into individual development stories, creating detailed story files that can be independently developed and tested.

## Usage
Run this prompt when you have an epic number and name from the implementation plan and need to create detailed development stories.

## Input Parameters
- **epic_number**: The epic number (e.g., "1", "2", "3")
- **epic_name**: The epic name (e.g., "Foundation & Infrastructure", "AI Search Service")
- **feature_path**: Path to the feature planning directory (e.g., "plan/find-contacts")
- **implementation_tasks_file**: Path to the implementation tasks document (optional, defaults to "implementation-tasks.mdc")
- **github_repo**: GitHub repository in format "owner/repo" (e.g., "username/media-contacts")
- **create_github_issues**: Whether to create GitHub issues automatically (true/false)
- **github_labels**: Labels to apply to GitHub issues (comma-separated)

## Output Structure
For each story in the epic, create:
```
{feature_path}/stories/epic-{number}-{name}/story-{number}-{name}.mdc
```

**Important**: Stories must be stored in `plan/{feature-name}/stories/{epic-name}/` directory structure to maintain consistency with the epic planning organization.

## What Each Story Should Contain

### Story Header
```markdown
# Story {number}: {Story Name}
**Epic**: Epic {epic_number}: {epic_name}
**Estimated Time**: {X days}
**Priority**: {Critical|High|Medium|Low}
**Status**: {Pending|In Progress|Completed}
**Assignee**: {Developer Name}
**GitHub Issue**: #{issue_number} (if created)
**Labels**: {labels} (if created)
```

## GitHub CLI Integration

### GitHub Issue Creation
Each story can be automatically converted to a GitHub issue using the GitHub CLI:

```bash
# Create GitHub issue for a story
gh issue create \
  --title "Story {epic_number}.{story_number}: {Story Name}" \
  --body "$(cat <<'EOF'
## Epic
Epic {epic_number}: {epic_name}

## Objective
{Story objective}

## Acceptance Criteria
- [ ] {Criterion 1}
- [ ] {Criterion 2}
- [ ] {Criterion 3}

## Technical Requirements
{Technical requirements summary}

## Definition of Done
- All acceptance criteria met
- Code reviewed and approved
- Tests written and passing
- Documentation updated
- Integration working
- Performance and security requirements met

## Implementation Notes
{Key implementation notes}

## Story File
[View Full Story Details]({relative_path_to_story_file})

---
🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)" \
  --label "epic-{epic_number}" \
  --label "story" \
  --label "{priority_label}" \
  --label "{feature_label}" \
  --assignee "{github_username}"
```

### GitHub CLI Commands for Story Management

#### Bulk Issue Creation
```bash
# Create issues for all stories in an epic
for story_file in plan/{feature}/stories/epic-{number}-{name}/story-*.mdc; do
  story_title=$(grep "^# Story" "$story_file" | sed 's/^# Story //')
  story_body=$(sed -n '/^## Objective$/,/^## /p' "$story_file" | head -n -1)

  gh issue create \
    --title "$story_title" \
    --body "$story_body" \
    --label "epic-{epic_number}" \
    --label "story" \
    --label "enhancement"
done
```

#### Issue Management Commands
```bash
# List all issues for an epic
gh issue list --label "epic-{epic_number}" --state all

# Update issue status
gh issue edit {issue_number} --add-label "in-progress"

# Close completed issue
gh issue close {issue_number} --comment "Story completed and merged"

# Link issue to pull request
gh pr create --body "Closes #{issue_number}"
```

#### Project Board Integration
```bash
# Add issue to project board
gh project item-add {project_number} --issue {issue_number}

# Move issue between columns
gh project item-edit {item_id} --field "Status" --value "In Progress"
```

### Story Format for GitHub CLI Compatibility

When generating stories, include these GitHub CLI-friendly sections:

#### 1. Issue Title Format
```markdown
# Story {epic_number}.{story_number}: {Story Name}
```
This maps directly to GitHub issue titles.

#### 2. Issue Body Structure
```markdown
## Epic
Epic {epic_number}: {epic_name}

## Objective
{Concise objective statement}

## Acceptance Criteria
- [ ] {Measurable criterion 1}
- [ ] {Measurable criterion 2}
- [ ] {Measurable criterion 3}

## Technical Requirements
{Bulleted list of technical requirements}

## Definition of Done
- [ ] All acceptance criteria are met and validated
- [ ] Code is reviewed and approved
- [ ] Tests are written and passing
- [ ] Documentation is updated
- [ ] Integration with existing system works
- [ ] Performance and security requirements are met

## Implementation Notes
{Key technical notes and considerations}

## Story File
[View Full Story Details]({relative_path_to_story_file})

---
🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

#### 3. Label Strategy
Standardize labels for better organization:
- `epic-{number}`: Groups stories by epic
- `story`: Identifies story issues
- `priority-critical|priority-high|priority-medium|priority-low`: Priority levels
- `{feature-name}`: Groups by feature
- `frontend|backend|database|testing`: Component type
- `ready-for-dev|in-progress|in-review|done`: Status tracking

#### 4. Assignee Mapping
Map story assignees to GitHub usernames:
```markdown
**Assignee**: {developer_name} (@{github_username})
```

### Story Content
1. **Objective**: Clear statement of what needs to be accomplished
2. **Acceptance Criteria**: Specific, measurable criteria for completion
3. **Technical Requirements**: Detailed technical specifications
4. **Dependencies**: What needs to be completed first
5. **Definition of Done**: When the story is considered complete
6. **Testing Requirements**: What tests need to be written
7. **Implementation Notes**: Technical guidance and best practices

## Instructions for the AI

When you receive an epic breakdown request:

1. **Use Correct Directory Structure**: Always create stories in `plan/{feature-name}/stories/{epic-name}/` directory
2. **Read the Implementation Tasks Document**: Locate the epic in the specified implementation tasks file
3. **Identify All Stories**: Extract each task/subtask within the epic
4. **Create Story Directory**: `{feature_path}/stories/epic-{number}-{name}/`
5. **Generate Story Files**: Create one `.mdc` file per story with comprehensive details
6. **Cross-Reference**: Link to relevant technical specs, API contracts, and component specs
7. **Include Context**: Reference the broader feature documentation where relevant
8. **GitHub CLI Optimization**: Format stories for easy GitHub issue creation
9. **Generate CLI Commands**: Provide `gh` commands for issue creation and management
10. **Label Strategy**: Apply consistent labeling for GitHub organization

### GitHub CLI Integration Steps

If `create_github_issues` is true:

1. **Validate GitHub Repository**: Confirm the `github_repo` parameter is valid
2. **Check GitHub CLI Installation**: Verify `gh` command is available
3. **Generate Issue Creation Scripts**: Create bash scripts for bulk issue creation
4. **Apply Label Strategy**: Use consistent labeling based on epic, priority, and component type
5. **Map Assignees**: Convert developer names to GitHub usernames
6. **Create GitHub Issues**: Execute `gh issue create` commands for each story
7. **Update Story Files**: Add issue numbers and labels back to story files
8. **Generate Management Scripts**: Provide scripts for issue status updates

## Generic Story Structure Template

```markdown
# Story {epic_number}.{story_number}: {Story Name}
**Epic**: Epic {epic_number}: {epic_name}
**Estimated Time**: {X days}
**Priority**: {Critical|High|Medium|Low}
**Status**: Pending
**Assignee**: {Developer Role} (@{github_username})
**GitHub Issue**: #{issue_number} (if created)
**Labels**: epic-{epic_number}, story, priority-{priority}, {feature-label}

## GitHub CLI Issue Creation
```bash
gh issue create \
  --title "Story {epic_number}.{story_number}: {Story Name}" \
  --body "$(cat <<'EOF'
## Epic
Epic {epic_number}: {epic_name}

## Objective
{Clear statement of what needs to be accomplished}

## Acceptance Criteria
- [ ] {Specific, measurable criterion 1}
- [ ] {Specific, measurable criterion 2}
- [ ] {Specific, measurable criterion 3}
- [ ] Performance requirements met
- [ ] Security requirements satisfied
- [ ] Documentation complete

## Technical Requirements
{Bulleted list of technical requirements}

## Definition of Done
- All acceptance criteria are met and validated
- Code is reviewed and approved
- Tests are written and passing
- Documentation is updated
- Integration with existing system works
- Performance and security requirements are met

## Story File
[View Full Story Details]({relative_path_to_story_file})

---
🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)" \
  --label "epic-{epic_number}" \
  --label "story" \
  --label "priority-{priority}" \
  --label "{feature-label}" \
  --label "{component-type}" \
  --assignee "{github_username}"
```

## Objective
{Clear statement of what needs to be accomplished}

## Acceptance Criteria
- [ ] {Specific, measurable criterion 1}
- [ ] {Specific, measurable criterion 2}
- [ ] {Specific, measurable criterion 3}
- [ ] Performance requirements met
- [ ] Security requirements satisfied
- [ ] Documentation complete

## Technical Requirements

### Core Features
{List of main technical components and features}

### Integration Points
{How this story integrates with existing system}

### Dependencies
{What needs to be completed first}

## Definition of Done
- All acceptance criteria are met and validated
- Code is reviewed and approved
- Tests are written and passing
- Documentation is updated
- Integration with existing system works
- Performance and security requirements are met

## Testing Requirements

### Unit Tests
{Specific unit test requirements}

### Integration Tests
{Integration testing scenarios}

### E2E Tests
{End-to-end testing requirements}

### Performance Tests
{Performance testing criteria}

## Implementation Notes

### Development Guidelines
{Specific guidance for this story}

### Best Practices
{Best practices to follow}

### Security Considerations
{Security requirements and considerations}

### Performance Considerations
{Performance requirements and optimization strategies}

## Related Documentation
- [Epic Definition](../epics/epic-{epic_number}-{epic_name}.mdc)
- [Technical Specification](../epics/technical-spec.md#{relevant-section})
- [API Contracts](../epics/api-contracts.md#{relevant-section})
- [Component Specifications](../epics/component-specifications.md#{relevant-section})
- [Implementation Tasks](../implementation-tasks.mdc#{epic-section})
```

## Epic Templates (Examples)

### Epic 1: Foundation & Infrastructure
Expected stories:
- Story 1.1: Database Schema Implementation
- Story 1.2: API Infrastructure Setup
- Story 1.3: External Service Integration

### Epic 2: Core Service Development
Expected stories:
- Story 2.1: {Service Name} Implementation
- Story 2.2: {Service Name} Integration
- Story 2.3: {Service Name} Testing & Validation

### Epic 3: Frontend Components
Expected stories:
- Story 3.1: {Component Group} Modal and Form Components
- Story 3.2: {Component Group} Progress Tracking Components
- Story 3.3: {Component Group} Results Display Components

### Epic 4: Integration & Testing
Expected stories:
- Story 4.1: End-to-End Integration
- Story 4.2: Comprehensive Testing Suite
- Story 4.3: Performance Optimization

### Epic 5: Polish & Launch
Expected stories:
- Story 5.1: User Experience Polish
- Story 5.2: Documentation and Training
- Story 5.3: Launch Preparation

## GitHub CLI Automation Scripts

### Bulk Issue Creation Script
Create a script `create-epic-issues.sh` for each epic:

```bash
#!/bin/bash
# create-epic-issues.sh - Create GitHub issues for all stories in an epic

EPIC_NUMBER="{epic_number}"
EPIC_NAME="{epic_name}"
FEATURE_PATH="{feature_path}"
GITHUB_REPO="{github_repo}"

echo "Creating GitHub issues for Epic $EPIC_NUMBER: $EPIC_NAME"

# Create issues for all stories in the epic
for story_file in $FEATURE_PATH/stories/epic-$EPIC_NUMBER-*/story-*.mdc; do
    if [ -f "$story_file" ]; then
        echo "Processing: $story_file"

        # Extract story information
        story_title=$(grep "^# Story" "$story_file" | sed 's/^# Story //')
        epic_line=$(grep "\*\*Epic\*\*:" "$story_file" | sed 's/\*\*Epic\*\*: //')
        objective=$(sed -n '/^## Objective$/,/^## /p' "$story_file" | head -n -1 | tail -n +2)
        acceptance_criteria=$(sed -n '/^## Acceptance Criteria$/,/^## /p' "$story_file" | head -n -1 | tail -n +2)

        # Create GitHub issue
        issue_url=$(gh issue create \
            --repo "$GITHUB_REPO" \
            --title "$story_title" \
            --body "$(cat <<EOF
## Epic
$epic_line

## Objective
$objective

## Acceptance Criteria
$acceptance_criteria

## Definition of Done
- All acceptance criteria are met and validated
- Code is reviewed and approved
- Tests are written and passing
- Documentation is updated
- Integration with existing system works
- Performance and security requirements are met

## Story File
[View Full Story Details]($(git ls-files --full-name "$story_file"))

---
🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)" \
            --label "epic-$EPIC_NUMBER" \
            --label "story" \
            --label "enhancement")

        # Extract issue number from URL
        issue_number=$(echo "$issue_url" | grep -o '[0-9]\+' | head -1)

        # Update story file with issue number
        sed -i.bak "s/\*\*GitHub Issue\*\*: #/\*\*GitHub Issue\*\*: #$issue_number/" "$story_file"

        echo "Created issue: $issue_url"
    fi
done

echo "All issues created for Epic $EPIC_NUMBER"
```

### Issue Status Management Script
Create a script `manage-epic-issues.sh`:

```bash
#!/bin/bash
# manage-epic-issues.sh - Manage GitHub issues for an epic

EPIC_NUMBER="{epic_number}"
GITHUB_REPO="{github_repo}"

case "$1" in
    "list")
        echo "Listing all issues for Epic $EPIC_NUMBER:"
        gh issue list --repo "$GITHUB_REPO" --label "epic-$EPIC_NUMBER" --state all
        ;;
    "start")
        ISSUE_NUMBER="$2"
        if [ -z "$ISSUE_NUMBER" ]; then
            echo "Usage: $0 start <issue_number>"
            exit 1
        fi
        echo "Starting work on issue #$ISSUE_NUMBER"
        gh issue edit "$ISSUE_NUMBER" --repo "$GITHUB_REPO" --add-label "in-progress" --remove-label "ready-for-dev"
        ;;
    "review")
        ISSUE_NUMBER="$2"
        if [ -z "$ISSUE_NUMBER" ]; then
            echo "Usage: $0 review <issue_number>"
            exit 1
        fi
        echo "Moving issue #$ISSUE_NUMBER to review"
        gh issue edit "$ISSUE_NUMBER" --repo "$GITHUB_REPO" --add-label "in-review" --remove-label "in-progress"
        ;;
    "complete")
        ISSUE_NUMBER="$2"
        if [ -z "$ISSUE_NUMBER" ]; then
            echo "Usage: $0 complete <issue_number>"
            exit 1
        fi
        echo "Completing issue #$ISSUE_NUMBER"
        gh issue close "$ISSUE_NUMBER" --repo "$GITHUB_REPO" --comment "Story completed and merged"
        ;;
    "progress")
        echo "Progress for Epic $EPIC_NUMBER:"
        total_issues=$(gh issue list --repo "$GITHUB_REPO" --label "epic-$EPIC_NUMBER" --json number | jq length)
        completed_issues=$(gh issue list --repo "$GITHUB_REPO" --label "epic-$EPIC_NUMBER" --state closed --json number | jq length)
        if [ "$total_issues" -gt 0 ]; then
            progress=$((completed_issues * 100 / total_issues))
            echo "Completed: $completed_issues/$total_issues ($progress%)"
        else
            echo "No issues found for Epic $EPIC_NUMBER"
        fi
        ;;
    *)
        echo "Usage: $0 {list|start|review|complete|progress} [issue_number]"
        echo "Commands:"
        echo "  list     - List all issues for the epic"
        echo "  start    - Start working on an issue"
        echo "  review   - Move an issue to review"
        echo "  complete - Complete an issue"
        echo "  progress - Show epic progress"
        exit 1
        ;;
esac
```

## Usage Instructions

To use this prompt:

1. **Open the implementation tasks document**: `{feature_path}/{implementation_tasks_file}`
2. **Identify the epic**: Find the epic section with the specified number and name
3. **Extract all tasks**: Get all tasks/subtasks within that epic
4. **Create stories**: Generate a detailed story file for each task
5. **Use Correct Directory Structure**: Create stories in `plan/{feature-name}/stories/{epic-name}/`
6. **Organize by structure**: Create the directory structure and file naming
7. **Cross-reference**: Link to relevant documentation
8. **Validate completeness**: Ensure each story has all required sections
9. **GitHub CLI Integration**: If enabled, create GitHub issues automatically
10. **Generate Management Scripts**: Provide scripts for issue lifecycle management

## Quality Checklist

For each generated story, ensure:
- [ ] Clear, measurable acceptance criteria
- [ ] Technical requirements are specific
- [ ] Dependencies are properly identified
- [ ] Testing requirements are comprehensive
- [ ] Definition of done is unambiguous
- [ ] Implementation notes are helpful
- [ ] Cross-references are accurate
- [ ] Story size is appropriate (1-5 days)
- [ ] Priority is correctly assigned
- [ ] Dependencies are logically ordered

### GitHub CLI Compatibility
- [ ] Story title follows GitHub issue format
- [ ] Issue body is properly structured for GitHub
- [ ] Labels are consistent with strategy
- [ ] Assignee mapping is correct
- [ ] CLI commands are syntactically correct
- [ ] Automation scripts are executable
- [ ] GitHub repository is valid and accessible
- [ ] Issue creation script handles errors gracefully
- [ ] Management scripts cover all issue states
- [ ] Bulk operations are efficient

## Output Format

The AI should respond with:
1. **Confirmation** of which epic is being broken down
2. **Directory structure** that will be created
3. **List of stories** to be generated
4. **GitHub CLI status** (if enabled)
5. **Automation scripts generated** (if applicable)
6. **Completion confirmation** when all stories are created

Example response:
```
I'm breaking down Epic 2: {Epic Name} into individual development stories.

Creating directory structure:
{feature_path}/stories/epic-2-{epic-name}/

Stories to create:
- Story 2.1: {Story Name 1}
- Story 2.2: {Story Name 2}
- Story 2.3: {Story Name 3}

GitHub CLI Integration: ✅ Enabled
- Repository: {github_repo}
- Issues will be created with labels: epic-2, story, enhancement
- Automation scripts generated:
  * create-epic-issues.sh
  * manage-epic-issues.sh

All stories have been created with comprehensive details including acceptance criteria, technical requirements, testing needs, GitHub CLI compatibility, and cross-references to the broader feature documentation.
```

## Notes for AI Implementation

- Always reference the specific sections in the implementation tasks document
- Extract technical details from relevant specification documents
- Ensure stories are appropriately sized for development
- Maintain consistency in story structure and formatting
- Include relevant cross-references to other documentation
- Consider the overall feature context when writing individual stories
- Adapt story complexity and scope to match team capabilities
- Include both functional and non-functional requirements
- Ensure stories are independent enough for parallel development where possible

### GitHub CLI Considerations
- Validate GitHub repository format before issue creation
- Test GitHub CLI commands for syntax and validity
- Ensure assignee GitHub usernames are valid
- Apply consistent labeling strategy across all stories
- Generate automation scripts that are robust and error-handling
- Include relative paths to story files in GitHub issues
- Update story files with created issue numbers
- Consider GitHub API rate limits for bulk operations
- Test automation scripts before providing them to users
- Provide clear usage instructions for generated scripts

## Customization Guidelines

### For Different Feature Types
- **Backend-heavy features**: Focus on API, database, and service stories
- **Frontend-heavy features**: Focus on UI components, user flows, and interactions
- **Data-intensive features**: Include data migration, processing, and validation stories
- **Integration features**: Focus on external service integration and data synchronization

### For Different Team Sizes
- **Small teams**: Create larger, more comprehensive stories
- **Large teams**: Break into smaller, more focused stories for parallel work
- **Distributed teams**: Include more detailed documentation and coordination requirements

### For Different Complexity Levels
- **Simple features**: Fewer stories with broader scope
- **Complex features**: More granular stories with specific focus areas
- **High-risk features**: Include additional validation and testing stories