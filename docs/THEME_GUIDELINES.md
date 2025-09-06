# Pastel Theme Guidelines

## Overview

This document outlines the pastel theme implementation for the media-contacts application, including design principles, token usage, and compliance standards.

## Design Principles

- **Pastel Palette**: Soft, muted colors that reduce eye strain
- **WCAG AA Compliance**: All color combinations meet accessibility standards
- **Theme Consistency**: Identical token names across light and dark modes
- **Performance**: No hard-coded colors, CSS variables only
- **Accessibility**: Proper focus states and keyboard navigation

## Color Tokens

### Light Mode
- **Background**: `hsl(210 20% 98%)` - Soft off-white
- **Foreground**: `hsl(222 47% 12%)` - Deep charcoal
- **Primary**: `hsl(222 60% 22%)` - Muted navy
- **Secondary**: `hsl(220 30% 94%)` - Light gray-blue
- **Accent**: `hsl(210 85% 94%)` - Soft sky blue
- **Muted**: `hsl(220 25% 95%)` - Very light gray

### Dark Mode
- **Background**: `hsl(222 22% 12%)` - Soft blue-charcoal
- **Foreground**: `hsl(210 25% 92%)` - Light indigo
- **Primary**: `hsl(210 30% 88%)` - Soft white-blue
- **Secondary**: `hsl(222 18% 20%)` - Dark blue-gray
- **Accent**: `hsl(220 22% 22%)` - Muted blue
- **Muted**: `hsl(222 16% 18%)` - Dark gray-blue

## Usage Guidelines

### CSS Variables
Always use CSS variables instead of hard-coded colors:

```css
/* Correct */
.class {
  color: hsl(var(--foreground));
  background-color: hsl(var(--background));
}

/* Incorrect */
.class {
  color: #000000;
  background-color: #ffffff;
}
```

### Tailwind Classes
Use shadcn/ui utility classes:

```tsx
// Correct
<div className="text-muted-foreground bg-background border-border">

// Incorrect
<div className="text-gray-700 bg-white border-gray-300">
```

### Pagination Components
All pagination components should use:
- `border-border` for borders
- `bg-background` for backgrounds
- `text-muted-foreground` for secondary text
- `buttonVariants` with appropriate states
- `aria-current="page"` for active pages

## Accessibility Requirements

### WCAG AA Standards
- **Normal text**: ≥ 4.5:1 contrast ratio
- **Large text**: ≥ 3:1 contrast ratio
- **UI components**: ≥ 3:1 contrast ratio

### Focus States
- Visible focus rings using `ring` token
- Keyboard navigation support
- Proper tab order

### Screen Reader Support
- `aria-current="page"` for active pagination
- `aria-label` for navigation buttons
- Semantic HTML structure

## Testing

### Contrast Validation
```bash
npm test __tests__/utils/contrast.test.ts
```

### Component Testing
```bash
npm test __tests__/components/pagination.test.tsx
```

### Manual Testing
1. Toggle between light/dark themes
2. Verify no light leaks in dark mode
3. Test keyboard navigation
4. Check focus rings visibility

## Rollback Instructions

If issues arise, revert changes by:

1. **Restore original CSS variables**:
   ```bash
   git checkout HEAD~1 -- src/app/globals.css
   ```

2. **Revert pagination component changes**:
   ```bash
   git checkout HEAD~1 -- src/components/features/*/publishers-table.tsx
   git checkout HEAD~1 -- src/components/features/*/beats-table.tsx
   git checkout HEAD~1 -- src/components/features/*/languages-table.tsx
   git checkout HEAD~1 -- src/components/features/*/countries-table.tsx
   git checkout HEAD~1 -- src/components/features/*/categories-table.tsx
   ```

3. **Remove test files** (optional):
   ```bash
   rm __tests__/utils/contrast.test.ts
   rm __tests__/components/pagination.test.tsx
   ```

## Migration Checklist

- [x] Update global CSS variables with pastel tokens
- [x] Refactor pagination components to use shadcn tokens
- [x] Remove hard-coded colors from table components
- [x] Add accessibility improvements (aria attributes, focus rings)
- [x] Apply consistent styling across all pages (except Dashboard)
- [x] Add contrast testing and validation
- [x] Create component tests for theme compliance
- [x] Document theme usage guidelines

## Future Considerations

- Monitor contrast ratios as design evolves
- Consider user preference for theme intensity
- Evaluate additional pastel color variations
- Plan for high contrast mode support
