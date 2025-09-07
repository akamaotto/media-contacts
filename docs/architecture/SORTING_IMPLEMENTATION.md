# Table Sorting Implementation

This document describes the implementation of table sorting functionality across the Media Contacts application.

## Overview

The sorting implementation provides consistent, accessible, and efficient sorting across all data tables in the application. It supports both server-side sorting for large datasets and client-side sorting for smaller datasets.

## Architecture

### Components

1. **SortableHeader** - A reusable UI component for table headers with sorting indicators
2. **Sort Utilities** - Helper functions for parsing, serializing, and comparing sort parameters
3. **API Integration** - Server-side sorting support in API endpoints
4. **Client Integration** - Client-side state management for sorting

### Data Flow

1. User clicks on a sortable column header
2. Sort state is updated in the client component
3. For server-paginated tables, API request is made with sort parameters
4. For client-side tables, data is sorted locally
5. UI updates to reflect new sort state

## Implementation Details

### Sort Parameters

Sort parameters are represented as objects with the following structure:

```typescript
interface SortColumn {
  key: string;      // The field to sort by
  dir: 'asc' | 'desc'; // Sort direction
}
```

Multiple sort columns can be specified, allowing for complex sorting scenarios.

### URL Integration

Sort state is persisted in the URL using the `sort` query parameter:

```
?sort=name:asc,email:desc
```

This enables deep linking and preserves sort state during navigation.

### Server-Side Sorting

For server-paginated tables (like Media Contacts), sorting is implemented at the database level:

1. Sort parameters are parsed from the request
2. Validated against an allowlist to prevent injection
3. Converted to Prisma orderBy clauses
4. Applied to database queries

### Client-Side Sorting

For smaller datasets, sorting is implemented using JavaScript:

1. Specialized comparison functions for different data types
2. Locale-aware string comparison using Intl.Collator
3. Stable sorting with consistent tie-breaking

## Supported Data Types

The implementation includes specialized sorting functions for:

- **Strings** - Locale-aware comparison with numeric collation
- **Dates** - Proper date comparison with null handling
- **Emails** - Domain-first sorting with local part as secondary
- **Tags/Arrays** - First item comparison with length as tiebreaker
- **Numbers** - Numeric comparison

## Accessibility

The sorting implementation follows accessibility best practices:

- Keyboard navigation support (Enter/Space to toggle sort)
- ARIA attributes for screen readers (`aria-sort`)
- Visual indicators for sort state
- Proper focus management

## Performance

Performance optimizations include:

- Debouncing for server-side sorting
- Caching of sorted results
- Efficient comparison functions
- Minimal re-renders

## Testing

The implementation includes comprehensive tests:

- Unit tests for sorting functions
- Component tests for SortableHeader
- Integration tests for API endpoints
- E2E tests for user interactions

## Usage

### Adding Sorting to a New Table

1. Import the SortableHeader component
2. Wrap sortable column headers with SortableHeader
3. Manage sort state in the component
4. Pass sort parameters to data fetching functions
5. Implement sorting in the data layer (server or client)

### Example

```tsx
<TableHeader>
  <SortableHeader
    columnKey="name"
    currentSort={currentSort}
    onSort={handleSortChange}
  >
    Name
  </SortableHeader>
</TableHeader>
```

## Future Improvements

- Multi-column sorting with modifier keys
- User preferences for default sort orders
- Sort analytics and usage tracking
- Advanced sorting options (case sensitivity, etc.)