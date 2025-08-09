# Requirements Document

## Introduction

This specification addresses critical issues with the media contacts feature to ensure UI consistency across the application, fix non-functional features, improve performance, and clean up legacy code. The goal is to harmonize the media contacts interface with other feature UIs and ensure all functionality works as expected.

## Requirements

### Requirement 1: UI Consistency and Harmonization

**User Story:** As a user, I want the media contacts interface to be consistent with other feature interfaces, so that I have a unified experience across the application.

#### Acceptance Criteria

1. WHEN viewing the media contacts table THEN the action column (3 dots menu) SHALL be right-aligned to match outlets, publishers, and beats tables
2. WHEN comparing media contacts UI with other features THEN all visual patterns SHALL be consistent (spacing, colors, typography, button styles)
3. WHEN using dropdown menus and buttons THEN they SHALL follow the same design patterns as other feature tables
4. WHEN viewing badges and status indicators THEN they SHALL use consistent styling across all features

### Requirement 2: Fix Non-Functional Features

**User Story:** As a user, I want to be able to add and edit author links and social media links for media contacts, so that I can maintain complete contact information.

#### Acceptance Criteria

1. WHEN adding author links in the edit/add contact form THEN the links SHALL be saved and displayed correctly
2. WHEN adding social media links in the edit/add contact form THEN the links SHALL be saved and displayed correctly
3. WHEN viewing a contact's details THEN author links and social media links SHALL be displayed as clickable links
4. WHEN editing an existing contact THEN existing author links and social media links SHALL be pre-populated in the form
5. WHEN submitting the form with author/social links THEN the data SHALL persist to the database correctly

### Requirement 3: Improve Contact Detail Loading Performance

**User Story:** As a user, I want contact details to load quickly without delay, so that I can efficiently browse through contact information.

#### Acceptance Criteria

1. WHEN clicking to view a contact's details THEN the sheet SHALL open immediately with loading states
2. WHEN the contact sheet is loading THEN shimmer loading states or spinners SHALL be displayed for each section
3. WHEN contact data arrives THEN the loading states SHALL be replaced with actual content smoothly
4. WHEN opening contact details THEN the perceived loading time SHALL be under 200ms
5. WHEN the API is slow THEN users SHALL see immediate feedback that the action was registered

### Requirement 4: Clean Up Legacy Code

**User Story:** As a developer, I want unused legacy files removed from the media contacts feature, so that the codebase is clean and maintainable.

#### Acceptance Criteria

1. WHEN analyzing the media contacts directory THEN all unused files from previous refactoring SHALL be identified
2. WHEN removing legacy files THEN no active functionality SHALL be broken
3. WHEN legacy files are removed THEN import statements and references SHALL be cleaned up
4. WHEN the cleanup is complete THEN only actively used files SHALL remain in the media contacts directory
5. WHEN running the application THEN no console errors or missing imports SHALL occur

### Requirement 5: Enhance Contact Detail Sheet

**User Story:** As a user, I want the contact detail sheet to display all information clearly and allow easy access to external links, so that I can quickly access relevant contact information.

#### Acceptance Criteria

1. WHEN viewing contact details THEN author links SHALL be displayed as clickable buttons or links
2. WHEN viewing contact details THEN social media links SHALL be displayed with appropriate icons and be clickable
3. WHEN clicking external links THEN they SHALL open in new tabs
4. WHEN the contact has no author/social links THEN appropriate empty states SHALL be shown
5. WHEN viewing contact information THEN the layout SHALL be clean and well-organized

### Requirement 6: Database Schema Verification

**User Story:** As a developer, I want to ensure the database schema supports author links and social media links, so that data persistence works correctly.

#### Acceptance Criteria

1. WHEN examining the database schema THEN author_links and socials columns SHALL exist and be properly typed
2. WHEN saving contact data THEN author links and social media links SHALL be stored as JSON arrays
3. WHEN retrieving contact data THEN author links and social media links SHALL be properly deserialized
4. WHEN updating existing contacts THEN author/social link data SHALL be preserved and updated correctly