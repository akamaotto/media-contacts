# Design Document

## Overview

This design addresses critical issues in the media contacts feature to ensure UI consistency, fix non-functional features, improve performance, and clean up legacy code. The solution involves UI harmonization, database integration fixes, performance optimizations, and code cleanup.

## Architecture

### Current State Analysis

**UI Inconsistencies:**
- Media contacts table has left-aligned action column while other features use right-alignment
- Different styling patterns compared to outlets, publishers, and beats tables

**Non-Functional Features:**
- Author links and social media links are defined in schema and forms but not properly persisting
- TagInput components are implemented but data flow is broken
- Database columns exist but API integration has issues

**Performance Issues:**
- Contact detail sheet loads data before opening, causing perceived delay
- No loading states during data fetching
- Synchronous data loading blocks UI

**Legacy Code:**
- Multiple unused files from previous refactoring
- Duplicate components with similar functionality
- Unused imports and references

## Components and Interfaces

### 1. UI Harmonization Components

#### FastMediaContactsTable Enhancement
```typescript
interface TableActionAlignment {
  actionColumnClass: "text-right" // Match other feature tables
  dropdownMenuAlign: "end" // Consistent with other tables
}
```

#### Consistent Badge and Status Styling
```typescript
interface ConsistentStyling {
  badgeVariants: "outline" | "secondary" // Match other features
  statusIndicators: "consistent-colors" // Use same color scheme
  spacing: "consistent-padding" // Match other table layouts
}
```

### 2. Functional Feature Fixes

#### Enhanced Data Persistence
```typescript
interface AuthorLinksAndSocials {
  authorLinks: string[] // Array of URLs
  socials: string[] // Array of social media URLs
  validation: URLValidation // Proper URL validation
  persistence: DatabasePersistence // Ensure data saves correctly
}

interface URLValidation {
  pattern: RegExp // URL validation regex
  maxLength: number // Maximum URL length
  maxCount: number // Maximum number of links
}
```

#### Database Integration Fix
```typescript
interface DatabaseSchema {
  author_links: string[] // JSON array in database
  socials: string[] // JSON array in database
  serialization: "JSON.stringify" // Proper serialization
  deserialization: "JSON.parse" // Proper deserialization
}
```

### 3. Performance Optimization

#### Immediate Sheet Opening with Loading States
```typescript
interface LoadingStates {
  sheetOpening: "immediate" // Open sheet immediately
  contentLoading: "shimmer" | "spinner" // Show loading states
  dataFetching: "async" // Fetch data after sheet opens
  errorHandling: "graceful" // Handle loading errors
}

interface ShimmerComponents {
  contactInfo: ShimmerContactInfo
  authorLinks: ShimmerLinkList
  socialLinks: ShimmerLinkList
  additionalInfo: ShimmerTextBlocks
}
```

#### Async Data Loading Pattern
```typescript
interface AsyncDataPattern {
  initialState: "loading" // Start with loading state
  dataFetch: "useEffect" // Fetch data after component mounts
  stateTransition: "loading -> loaded | error" // Clear state transitions
  userFeedback: "immediate" // Immediate visual feedback
}
```

### 4. Code Cleanup Strategy

#### Legacy File Identification
```typescript
interface LegacyFiles {
  unused: string[] // Files not imported anywhere
  deprecated: string[] // Files replaced by newer versions
  redundant: string[] // Files with duplicate functionality
}

interface CleanupPlan {
  safeToRemove: string[] // Files confirmed safe to delete
  requiresRefactoring: string[] // Files needing import updates
  testing: string[] // Files requiring functionality verification
}
```

## Data Models

### Enhanced Contact Model
```typescript
interface EnhancedMediaContact {
  // Existing fields
  id: string
  name: string
  email: string
  title: string
  bio?: string
  email_verified_status: boolean
  
  // Enhanced link fields
  authorLinks: AuthorLink[]
  socials: SocialLink[]
  
  // Relationship fields
  outlets: Outlet[]
  beats: Beat[]
  countries: Country[]
  regions: Region[]
  languages: Language[]
}

interface AuthorLink {
  url: string
  type: "article" | "blog" | "publication" | "portfolio" | "other"
  title?: string // Optional title extraction
  domain: string // Extracted domain for display
}

interface SocialLink {
  url: string
  platform: "twitter" | "linkedin" | "facebook" | "instagram" | "other"
  handle?: string // Extracted handle/username
  verified?: boolean // Platform verification status
}
```

### Loading State Models
```typescript
interface LoadingState {
  isLoading: boolean
  error?: string
  data?: any
}

interface ContactSheetState {
  contact: LoadingState
  authorLinks: LoadingState
  socialLinks: LoadingState
  relatedData: LoadingState
}
```

## Error Handling

### Form Validation Enhancement
```typescript
interface ValidationStrategy {
  urlValidation: {
    pattern: RegExp
    customValidator: (url: string) => boolean
    errorMessages: Record<string, string>
  }
  
  arrayValidation: {
    maxItems: number
    uniqueItems: boolean
    itemValidation: (item: string) => boolean
  }
  
  realTimeValidation: {
    debounceMs: number
    validateOnChange: boolean
    showErrorsImmediately: boolean
  }
}
```

### Database Error Handling
```typescript
interface DatabaseErrorHandling {
  serialization: {
    fallback: "empty array" // If serialization fails
    validation: "pre-save validation" // Validate before saving
    logging: "error logging" // Log serialization issues
  }
  
  deserialization: {
    fallback: "empty array" // If deserialization fails
    validation: "post-load validation" // Validate after loading
    migration: "data migration support" // Handle old data formats
  }
}
```

## Testing Strategy

### UI Consistency Testing
1. **Visual Regression Tests**: Compare media contacts table with other feature tables
2. **Cross-Feature Comparison**: Ensure consistent styling across outlets, publishers, beats, and media contacts
3. **Responsive Design Tests**: Verify consistency across different screen sizes

### Functional Testing
1. **Author Links Testing**: 
   - Add, edit, delete author links
   - URL validation and formatting
   - Data persistence verification
   
2. **Social Media Links Testing**:
   - Platform detection accuracy
   - Link validation and formatting
   - Data persistence verification

3. **Performance Testing**:
   - Sheet opening time measurement
   - Loading state transitions
   - Data fetching performance

### Code Cleanup Testing
1. **Import Analysis**: Verify no broken imports after cleanup
2. **Functionality Verification**: Ensure all features work after file removal
3. **Build Testing**: Confirm application builds successfully
4. **Runtime Testing**: Check for console errors or missing dependencies

## Implementation Phases

### Phase 1: UI Harmonization
- Fix action column alignment in media contacts table
- Standardize badge and status styling
- Ensure consistent spacing and typography
- Update dropdown menu positioning

### Phase 2: Functional Fixes
- Debug and fix author links persistence
- Debug and fix social media links persistence
- Enhance form validation and error handling
- Improve data serialization/deserialization

### Phase 3: Performance Optimization
- Implement immediate sheet opening
- Add shimmer loading states
- Convert to async data loading pattern
- Optimize perceived performance

### Phase 4: Code Cleanup
- Identify and remove unused files
- Clean up imports and references
- Consolidate duplicate functionality
- Update documentation

## Technical Considerations

### Database Schema Verification
- Confirm `author_links` and `socials` columns exist and are properly typed
- Verify JSON serialization/deserialization works correctly
- Test data migration for existing records

### API Integration Points
- Media contacts GET endpoint: Ensure proper data serialization
- Media contacts POST/PUT endpoints: Verify data persistence
- Form submission flow: Debug data transformation issues

### Performance Metrics
- Sheet opening time: Target < 200ms perceived load time
- Data loading time: Target < 500ms for contact details
- User interaction responsiveness: Immediate feedback for all actions

### Backward Compatibility
- Ensure existing contact data remains accessible
- Handle legacy data formats gracefully
- Maintain API compatibility during updates