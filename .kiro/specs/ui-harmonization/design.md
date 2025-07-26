# UI Harmonization Design Document

## Overview

This design document outlines the technical approach for harmonizing UI patterns and file structures across all feature components. The harmonization will establish consistent Sheet-based UI patterns, standardized file naming conventions, and unified table component behaviors while maintaining all existing functionality.

## Architecture

### Component Hierarchy

```
Feature Directory Structure (Standardized):
src/components/features/{feature}/
├── add-{feature}-sheet.tsx          # Add form in Sheet
├── edit-{feature}-sheet.tsx         # Edit form in Sheet  
├── delete-{feature}-dialog.tsx      # Delete confirmation (Dialog is appropriate)
├── {feature}-table.tsx              # Data table component
├── {feature}-client-view.tsx        # Client-side container
└── {feature}-form.tsx               # Shared form component (if applicable)
```

### UI Component Standards

#### Sheet Component Pattern
All add/edit operations will use the Sheet component with these specifications:

**Simple Forms (Basic CRUD):**
- Width: `w-full sm:max-w-md`
- Used for: Categories, Languages, simple entity forms

**Complex Forms (Multiple sections/relationships):**
- Width: `w-full sm:max-w-2xl` 
- Used for: Countries, Regions, Publishers, Outlets, Beats

**Common Sheet Properties:**
- Overflow: `overflow-y-auto`
- Positioning: Right-side slide-out
- Close behavior: Click outside or ESC key
- Form submission: Prevents close during submission

#### Table Component Pattern
All tables will follow this standardized structure:

```tsx
<div className="space-y-4">
  {/* Search Input */}
  <div className="relative">
    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
    <Input
      placeholder="Search {feature}s..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="pl-10"
    />
  </div>

  {/* Table */}
  <div className="rounded-md border">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{Feature} <Badge className="font-mono text-xs">{count}</Badge></TableHead>
          {/* Other columns */}
          <TableHead className="w-20 text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {/* Table rows with consistent dropdown actions */}
      </TableBody>
    </Table>
  </div>

  {/* Results Summary */}
  {searchTerm && (
    <p className="text-sm text-muted-foreground text-center">
      Showing {filteredCount} of {totalCount} {feature}s
    </p>
  )}
</div>
```

## Components and Interfaces

### Sheet Component Interface

```tsx
interface BaseSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface AddSheetProps extends BaseSheetProps {
  // Add-specific props
}

interface EditSheetProps<T> extends BaseSheetProps {
  item: T;
  // Edit-specific props
}
```

### Table Component Interface

```tsx
interface BaseTableProps<T> {
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
}

interface TableRef {
  refresh: () => void;
}
```

### Form Validation Pattern

All forms will use consistent validation with react-hook-form and zod:

```tsx
const formSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  // Other fields...
});

type FormData = z.infer<typeof formSchema>;
```

## Data Models

### Component State Management

Each feature will maintain consistent state patterns:

```tsx
// Table Component State
const [items, setItems] = useState<T[]>([]);
const [filteredItems, setFilteredItems] = useState<T[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [searchTerm, setSearchTerm] = useState('');

// Sheet Component State  
const [isSubmitting, setIsSubmitting] = useState(false);
const [formData, setFormData] = useState<FormData>(defaultValues);
```

### API Integration Pattern

Consistent API interaction patterns:

```tsx
// Fetch Pattern
const fetchItems = async () => {
  try {
    setLoading(true);
    setError(null);
    const response = await fetch(`/api/${feature}s`);
    if (!response.ok) throw new Error('Failed to fetch');
    const data = await response.json();
    setItems(data);
    setFilteredItems(data);
  } catch (err) {
    setError('Failed to load items');
    toast.error('Failed to load items');
  } finally {
    setLoading(false);
  }
};

// Submit Pattern
const handleSubmit = async (data: FormData) => {
  setIsSubmitting(true);
  try {
    const response = await fetch(`/api/${feature}s`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create');
    toast.success('Created successfully');
    onSuccess();
    onOpenChange(false);
  } catch (error) {
    toast.error('Failed to create');
  } finally {
    setIsSubmitting(false);
  }
};
```

## Error Handling

### Consistent Error Patterns

1. **Form Validation Errors**: Display inline with form fields
2. **API Errors**: Show toast notifications with specific error messages
3. **Loading States**: Consistent loading indicators and disabled states
4. **Network Errors**: Graceful degradation with retry options

### Error Message Standards

```tsx
// Success Messages
toast.success('{Feature} created successfully');
toast.success('{Feature} updated successfully');
toast.success('{Feature} deleted successfully');

// Error Messages
toast.error('Failed to create {feature}');
toast.error('Failed to update {feature}');
toast.error('Failed to delete {feature}');
toast.error('Failed to load {feature}s');
```

## Testing Strategy

### Component Testing Approach

1. **Unit Tests**: Test individual components in isolation
2. **Integration Tests**: Test component interactions and API calls
3. **Visual Regression Tests**: Ensure UI consistency across features
4. **Accessibility Tests**: Verify keyboard navigation and screen reader support

### Testing Priorities

**High Priority:**
- Form submission and validation
- Table search and filtering
- Sheet open/close behavior
- API error handling

**Medium Priority:**
- Responsive design behavior
- Keyboard navigation
- Loading states

**Low Priority:**
- Animation and transitions
- Edge case scenarios

### Migration Testing Strategy

1. **Feature Parity Testing**: Ensure all existing functionality works
2. **Cross-browser Testing**: Verify consistency across browsers
3. **Performance Testing**: Ensure no performance regressions
4. **User Acceptance Testing**: Validate improved user experience

## Implementation Phases

### Phase 1: Core Sheet Components (Week 1)
- Create standardized Sheet components for Publishers, Outlets, Beats, Categories
- Implement consistent form patterns and validation
- Test basic functionality

### Phase 2: File Renaming and Cleanup (Week 1)
- Rename existing files to follow naming conventions
- Update import references
- Mark old files for removal

### Phase 3: Table Harmonization (Week 2)
- Standardize table search and action patterns
- Implement consistent empty states and loading indicators
- Update all table components

### Phase 4: Integration and Testing (Week 2)
- Update client view components
- Comprehensive testing of all features
- Performance optimization

### Phase 5: Cleanup and Documentation (Week 3)
- Remove old modal files
- Update documentation
- Final testing and deployment

## Technical Considerations

### Performance Implications
- Sheet components are lighter than modals for complex forms
- Consistent patterns reduce bundle size through better tree-shaking
- Standardized components improve caching efficiency

### Accessibility Improvements
- Consistent keyboard navigation patterns
- Standardized ARIA labels and roles
- Improved screen reader support

### Maintainability Benefits
- Reduced code duplication
- Easier to add new features following established patterns
- Simplified debugging and troubleshooting

### Browser Compatibility
- All changes maintain existing browser support
- Sheet components work consistently across modern browsers
- Responsive design improvements for mobile devices

## Migration Strategy

### Backward Compatibility
- Maintain all existing API contracts
- Preserve all existing functionality during transition
- Gradual rollout with feature flags if needed

### Rollback Plan
- Keep old components until new ones are fully tested
- Maintain ability to quickly revert changes
- Monitor for any regressions during deployment

### User Communication
- No user-facing changes to functionality
- Improved consistency will be transparent to users
- Internal documentation updates for development team