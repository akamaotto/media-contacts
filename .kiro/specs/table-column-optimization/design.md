# Table Column Optimization Design Document

## Overview

This design document outlines the technical approach for optimizing table column layouts across all data tables in the application. The optimization focuses on improving information hierarchy, visual balance, and responsive behavior while maintaining existing functionality and performance.

## Architecture

### Column Priority Framework

All tables will follow a standardized column priority system:

```
Priority 1: Primary Entity (Name + Key Info)
Priority 2: Geographic/Scope Data (Countries, Regions)
Priority 3: Relationship Data (Publisher, Categories)
Priority 4: Metrics (Contact Counts, Usage Stats)
Priority 5: Actions (Always Last)
```

### Optimized Table Layouts

#### Publishers Table (New Layout)
```
1. Publisher (Name + Description) - Flexible width
2. Countries (Flag + Code badges) - w-48
3. Website (Compact URL display) - w-32
4. Outlets (Name badges) - w-44
5. Actions (Dropdown menu) - w-20
```

#### Outlets Table (Optimized Layout)
```
1. Outlet Name (Name + Website + Description) - Flexible width
2. Countries (Flag + Code badges) - w-40
3. Publisher (Publisher badge) - w-36
4. Categories (Color + Name badges) - w-44
5. Contacts (Count badge) - w-24
6. Actions (Dropdown menu) - w-20
```

#### Beats Table (Optimized Layout)
```
1. Beat Name - Flexible width
2. Countries (Flag + Code badges) - w-40
3. Description - w-48
4. Categories (Color + Name badges) - w-44
5. Contacts (Count badge) - w-24
6. Actions (Dropdown menu) - w-20
```

#### Categories Table (Optimized Layout)
```
1. Category (Color + Name) - Flexible width
2. Description - w-48
3. Beats (Count badge) - w-24
4. Outlets (Count badge) - w-24
5. Actions (Dropdown menu) - w-20
```

## Components and Interfaces

### Column Width Standards

```tsx
// Standard column width classes
const COLUMN_WIDTHS = {
  // Flexible widths for primary content
  PRIMARY: 'min-w-0 flex-1',
  
  // Fixed widths for specific content types
  COUNTRIES_WIDE: 'w-48',      // Publishers (more countries)
  COUNTRIES_MEDIUM: 'w-40',    // Outlets, Beats
  WEBSITE: 'w-32',             // Compact URL display
  PUBLISHER: 'w-36',           // Publisher badge
  CATEGORIES: 'w-44',          // Category badges
  DESCRIPTION: 'w-48',         // Description text
  COUNT_BADGE: 'w-24',         // Numeric badges
  ACTIONS: 'w-20',             // Action dropdown
} as const;
```

### Badge Display Standards

```tsx
// Country badge component
const CountryBadge = ({ country, showTooltip = true }) => (
  <Tooltip>
    <TooltipTrigger>
      <Badge variant="outline" className="text-xs">
        {country.flag_emoji} {country.code}
      </Badge>
    </TooltipTrigger>
    {showTooltip && (
      <TooltipContent>
        <p>{country.name}</p>
      </TooltipContent>
    )}
  </Tooltip>
);

// Category badge with color indicator
const CategoryBadge = ({ category, showTooltip = true }) => (
  <Tooltip>
    <TooltipTrigger>
      <Badge 
        variant="outline" 
        className="text-xs flex items-center gap-1"
        style={category.color ? { borderColor: category.color } : {}}
      >
        {category.color && (
          <div 
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: category.color }}
          />
        )}
        {category.name}
      </Badge>
    </TooltipTrigger>
    {showTooltip && (
      <TooltipContent>
        <p>{category.description || category.name}</p>
      </TooltipContent>
    )}
  </Tooltip>
);

// Count badge component
const CountBadge = ({ count, variant = "secondary", className = "" }) => (
  <Badge variant={variant} className={`text-xs ${className}`}>
    {count || 0}
  </Badge>
);
```

### Responsive Behavior Patterns

```tsx
// Responsive table wrapper
const ResponsiveTable = ({ children, className = "" }) => (
  <div className={`overflow-x-auto ${className}`}>
    <div className="min-w-full inline-block align-middle">
      <div className="overflow-hidden border rounded-lg">
        {children}
      </div>
    </div>
  </div>
);

// Mobile-first column visibility
const useResponsiveColumns = () => {
  const [screenSize, setScreenSize] = useState('desktop');
  
  const getVisibleColumns = (tableType: string) => {
    switch (screenSize) {
      case 'mobile':
        return ['primary', 'actions']; // Only essential columns
      case 'tablet':
        return ['primary', 'countries', 'metrics', 'actions'];
      default:
        return 'all'; // All columns visible
    }
  };
  
  return { screenSize, getVisibleColumns };
};
```

## Data Models

### Table Configuration Interface

```tsx
interface TableColumnConfig {
  key: string;
  header: string;
  width: string;
  align: 'left' | 'center' | 'right';
  priority: 1 | 2 | 3 | 4 | 5;
  responsive: {
    mobile: boolean;
    tablet: boolean;
    desktop: boolean;
  };
  sortable?: boolean;
  searchable?: boolean;
}

interface OptimizedTableProps<T> {
  data: T[];
  columns: TableColumnConfig[];
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
  searchTerm: string;
  loading?: boolean;
  error?: string | null;
}
```

### Badge Collection Interface

```tsx
interface BadgeCollectionProps<T> {
  items: T[];
  maxVisible: number;
  renderBadge: (item: T) => React.ReactNode;
  getTooltipContent?: (items: T[]) => React.ReactNode;
  className?: string;
}

const BadgeCollection = <T,>({ 
  items, 
  maxVisible, 
  renderBadge, 
  getTooltipContent,
  className = "" 
}: BadgeCollectionProps<T>) => {
  const visibleItems = items.slice(0, maxVisible);
  const hiddenItems = items.slice(maxVisible);
  
  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {visibleItems.map((item, index) => (
        <React.Fragment key={index}>
          {renderBadge(item)}
        </React.Fragment>
      ))}
      {hiddenItems.length > 0 && (
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="outline" className="text-xs cursor-pointer">
              +{hiddenItems.length}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            {getTooltipContent ? getTooltipContent(hiddenItems) : (
              <div className="space-y-1">
                {hiddenItems.map((item, index) => (
                  <div key={index}>{renderBadge(item)}</div>
                ))}
              </div>
            )}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
};
```

## Implementation Strategy

### Phase 1: Publishers Table Optimization
- Reorder columns: Publisher → Countries → Website → Outlets → Actions
- Implement new column widths and responsive behavior
- Enhance badge display patterns
- Test functionality and performance

### Phase 2: Outlets Table Enhancement
- Optimize column order: Outlet → Countries → Publisher → Categories → Contacts → Actions
- Improve badge collections for categories and countries
- Enhance responsive behavior
- Test complex data scenarios

### Phase 3: Beats and Categories Tables
- Apply optimized layouts to remaining tables
- Standardize badge display patterns
- Implement consistent responsive behavior
- Comprehensive cross-table testing

### Phase 4: Advanced Features
- Implement column sorting where beneficial
- Add advanced responsive features
- Performance optimization
- Accessibility enhancements

## Technical Considerations

### Performance Optimization
- Virtualization for large datasets (if needed)
- Efficient badge rendering with memoization
- Optimized tooltip rendering
- Minimal re-renders on responsive changes

### Accessibility Improvements
- Proper ARIA labels for all interactive elements
- Keyboard navigation support for all badges and actions
- Screen reader friendly table structure
- High contrast support for color indicators

### Browser Compatibility
- CSS Grid and Flexbox fallbacks
- Consistent badge rendering across browsers
- Touch-friendly interactions on mobile devices
- Proper responsive behavior on all screen sizes

### Responsive Design Strategy

```css
/* Mobile-first responsive approach */
.table-container {
  @apply overflow-x-auto;
}

.table-responsive {
  @apply min-w-full;
}

/* Column visibility classes */
.col-mobile-hidden {
  @apply hidden sm:table-cell;
}

.col-tablet-hidden {
  @apply hidden lg:table-cell;
}

/* Badge responsive behavior */
.badge-collection {
  @apply flex flex-wrap gap-1;
}

.badge-responsive {
  @apply text-xs;
}

@media (max-width: 640px) {
  .badge-responsive {
    @apply text-[10px] px-1 py-0.5;
  }
}
```

## Testing Strategy

### Visual Regression Testing
- Screenshot comparisons for all table layouts
- Badge display consistency across different data scenarios
- Responsive behavior validation
- Cross-browser compatibility testing

### Functional Testing
- All CRUD operations maintain functionality
- Search and filtering work with new layouts
- Badge interactions and tooltips function correctly
- Keyboard navigation works properly

### Performance Testing
- Table rendering performance with large datasets
- Badge collection rendering efficiency
- Responsive layout change performance
- Memory usage optimization validation

### Accessibility Testing
- Screen reader compatibility
- Keyboard navigation completeness
- Color contrast compliance
- Touch target size validation

## Migration Strategy

### Gradual Rollout
1. Implement Publishers table optimization first
2. Gather user feedback and iterate
3. Roll out to remaining tables progressively
4. Monitor performance and user experience

### Rollback Plan
- Maintain current table components during transition
- Feature flag system for easy rollback
- Performance monitoring and alerting
- User feedback collection and response system

### Success Metrics
- Improved user task completion times
- Reduced support requests about table usability
- Better mobile usage analytics
- Positive user feedback on table improvements