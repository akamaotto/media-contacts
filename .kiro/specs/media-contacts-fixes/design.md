# Design Document

## Overview

This design document outlines the technical approach to fix the Media Contacts page issues. The solution focuses on enhancing the existing `FastMediaContactsTable` component and `ApiMediaContactsClientView` to add missing functionality while maintaining the current performance optimizations. The design emphasizes minimal disruption to existing code while providing comprehensive improvements to user experience.

## Architecture

### Component Structure

The current architecture will be enhanced rather than replaced:

```
ApiMediaContactsClientView (main container)
├── AppBrandHeader (enhanced, no duplicates)
├── ApiMediaContactsFilters (enhanced with new filters)
├── FastMediaContactsTable (enhanced with pagination)
│   ├── Table (enhanced badges and row clicks)
│   └── MediaContactsPagination (new component)
├── ViewMediaContactSheet (existing)
└── UpdateMediaContactSheet (existing)
```

### Data Flow

1. **Filter State Management**: Centralized in `ApiMediaContactsClientView`
2. **API Communication**: Single optimized endpoint with enhanced parameters
3. **Pagination State**: Managed at the client level with server-side pagination
4. **Badge Rendering**: Enhanced with responsive design and tooltips

## Components and Interfaces

### Enhanced FastMediaContactsTable Component

**Purpose**: Add pagination controls and improve badge display

**Key Changes**:
- Add `MediaContactsPagination` component at the bottom
- Enhance badge rendering with responsive design
- Improve row click handling
- Add loading states and error handling

**Interface**:
```typescript
interface FastTableProps {
  // Existing props...
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  totalPages: number;
  // Enhanced badge configuration
  badgeConfig?: {
    maxVisible: number;
    showTooltips: boolean;
    responsive: boolean;
  };
}
```

### Enhanced ApiMediaContactsFilters Component

**Purpose**: Add outlet, region, and language filters

**Key Changes**:
- Add outlet filter dropdown with multi-select
- Add region filter dropdown with multi-select  
- Add language filter dropdown with multi-select
- Enhance filter badge display
- Improve responsive layout

**Interface**:
```typescript
interface ApiFiltersProps {
  // Existing props...
  selectedOutletIds: string[];
  onOutletFilterChange: (outletIds: string[]) => void;
  selectedRegionCodes: string[];
  onRegionFilterChange: (regionCodes: string[]) => void;
  selectedLanguageCodes: string[];
  onLanguageFilterChange: (languageCodes: string[]) => void;
  outlets: Array<{ id: string; name: string }>;
  // regions and languages already exist
}
```

### New MediaContactsPagination Component

**Purpose**: Provide comprehensive pagination controls

**Features**:
- First/Previous/Next/Last navigation
- Page size selector
- Current page indicator
- Total count display
- Responsive design

**Interface**:
```typescript
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
}
```

### Enhanced Badge Component

**Purpose**: Improve badge display with responsive behavior

**Features**:
- Dynamic width based on content
- Tooltip support for long text
- Responsive stacking
- "+X more" indicators

**Interface**:
```typescript
interface EnhancedBadgeProps {
  items: Array<{ id: string; name: string }>;
  totalCount: number;
  maxVisible?: number;
  colorClass?: string;
  showTooltips?: boolean;
  onItemClick?: (item: { id: string; name: string }) => void;
}
```

## Data Models

### Enhanced API Response

The existing API response will be extended to include outlet and language data:

```typescript
interface ApiContact {
  // Existing fields...
  outlets: Array<{ id: string; name: string }>;
  languages: Array<{ id: string; name: string; code: string }>;
  regions: Array<{ id: string; name: string; code: string }>; // derived from countries
  outletCount: number;
  languageCount: number;
  regionCount: number;
}

interface ApiResponse {
  contacts: ApiContact[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  performance: {
    queryTime: number;
    totalTime: number;
    contactsReturned: number;
  };
}
```

### Enhanced Filter Parameters

```typescript
interface FilterParams {
  // Existing filters...
  outletIds?: string[];
  regionCodes?: string[];
  languageCodes?: string[];
  page: number;
  pageSize: number;
}
```

## Error Handling

### Client-Side Error Handling

1. **Network Errors**: Display retry button with exponential backoff
2. **Validation Errors**: Show inline error messages
3. **Loading States**: Skeleton loaders matching table structure
4. **Empty States**: Clear messaging when no results found

### Server-Side Error Handling

1. **Database Errors**: Log and return generic error messages
2. **Authentication Errors**: Redirect to login
3. **Validation Errors**: Return specific field errors
4. **Performance Monitoring**: Track query times and optimize slow queries

## Testing Strategy

### Unit Tests

1. **Component Tests**:
   - `MediaContactsPagination` component behavior
   - Enhanced badge rendering logic
   - Filter state management
   - Row click event handling

2. **API Tests**:
   - Enhanced endpoint with new filter parameters
   - Pagination logic validation
   - Performance benchmarks

### Integration Tests

1. **Filter Integration**:
   - Multiple filter combinations
   - Filter clearing functionality
   - URL state synchronization

2. **Pagination Integration**:
   - Page navigation accuracy
   - Page size changes
   - Filter + pagination combinations

### End-to-End Tests

1. **User Workflows**:
   - Complete filtering and pagination flow
   - Row click to detail view
   - Contact management operations

2. **Performance Tests**:
   - Large dataset handling
   - Filter response times
   - Memory usage optimization

## Implementation Approach

### Phase 1: Core Infrastructure
- Enhance API endpoint with new filter parameters
- Add outlet and language data to database queries
- Create `MediaContactsPagination` component
- Update type definitions

### Phase 2: UI Enhancements
- Enhance `FastMediaContactsTable` with pagination
- Improve badge rendering with responsive design
- Add new filter controls to `ApiMediaContactsFilters`
- Fix row click handling

### Phase 3: Polish and Optimization
- Add loading states and error handling
- Implement tooltips for truncated content
- Remove duplicate headers
- Performance optimization and testing

### Migration Strategy

1. **Backward Compatibility**: Maintain existing API contract while adding new features
2. **Gradual Rollout**: Implement features incrementally to minimize risk
3. **Fallback Handling**: Graceful degradation if new features fail
4. **Performance Monitoring**: Track metrics before and after changes

## Performance Considerations

### Database Optimization

1. **Query Optimization**: 
   - Add indexes for new filter columns
   - Optimize JOIN operations for outlets and languages
   - Use efficient counting queries

2. **Caching Strategy**:
   - Cache reference data (outlets, regions, languages)
   - Implement query result caching for common filters
   - Use stale-while-revalidate for better UX

### Frontend Optimization

1. **Component Optimization**:
   - Memoize expensive calculations
   - Debounce filter changes
   - Virtualize large lists if needed

2. **Bundle Optimization**:
   - Code splitting for large components
   - Lazy loading for detail views
   - Optimize bundle size

## Security Considerations

1. **Input Validation**: Sanitize all filter parameters
2. **SQL Injection Prevention**: Use parameterized queries
3. **Rate Limiting**: Prevent excessive API calls
4. **Data Access Control**: Ensure users only see authorized contacts

## Accessibility Considerations

1. **Keyboard Navigation**: Full keyboard support for pagination and filters
2. **Screen Reader Support**: Proper ARIA labels and descriptions
3. **Color Contrast**: Ensure badge colors meet accessibility standards
4. **Focus Management**: Proper focus handling in modals and sheets