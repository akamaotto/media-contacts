# Implementation Plan

- [x] 1. Create standardized Sheet components for Publishers feature
  - Convert Dialog components to Sheet components in add-publisher-modal.tsx
  - Convert Dialog components to Sheet components in edit-publisher-modal.tsx
  - Implement consistent form validation and error handling patterns
  - Apply standardized sheet sizing (w-full sm:max-w-md for publisher forms)
  - Test form submission and validation functionality
  - _Requirements: 1.1, 4.1, 4.2, 6.1, 6.2, 7.1, 7.2_

- [x] 2. Create standardized Sheet components for Outlets feature
  - Convert Dialog components to Sheet components in add-outlet-modal.tsx
  - Convert Dialog components to Sheet components in edit-outlet-modal.tsx
  - Implement consistent form validation and error handling patterns
  - Apply standardized sheet sizing (w-full sm:max-w-2xl for complex outlet forms)
  - Test category selection and publisher assignment functionality
  - _Requirements: 1.1, 4.1, 4.2, 6.1, 6.2, 7.1, 7.2_

- [x] 3. Create standardized Sheet components for Beats feature
  - Convert Dialog components to Sheet components in add-beat-modal.tsx
  - Convert Dialog components to Sheet components in edit-beat-modal.tsx
  - Implement consistent form validation and error handling patterns
  - Apply standardized sheet sizing (w-full sm:max-w-md for beat forms)
  - Test category selection functionality with consistent UI patterns
  - _Requirements: 1.1, 4.1, 4.2, 6.1, 6.2, 7.1, 7.2_

- [x] 4. Create standardized Sheet components for Categories feature
  - Convert Dialog components to Sheet components in add-category-modal.tsx
  - Convert Dialog components to Sheet components in edit-category-modal.tsx
  - Implement consistent form validation and error handling patterns
  - Apply standardized sheet sizing (w-full sm:max-w-md for category forms)
  - Test color picker functionality and form submission
  - _Requirements: 1.1, 4.1, 4.2, 6.1, 6.2, 7.1, 7.2_

- [x] 5. Rename existing Sheet files for consistency
  - Rename add-country-modal.tsx to add-country-sheet.tsx
  - Rename edit-country-modal.tsx to edit-country-sheet.tsx
  - Rename add-region-modal.tsx to add-region-sheet.tsx
  - Rename edit-region-modal.tsx to edit-region-sheet.tsx
  - Rename add-language-modal.tsx to add-language-sheet.tsx
  - Rename edit-language-modal.tsx to edit-language-sheet.tsx
  - Update component names and exports to match new file names
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 6. Standardize table search patterns across all features
  - Update countries-table.tsx to use consistent search input styling and positioning
  - Update regions-table.tsx to use consistent search input styling and positioning
  - Update publishers-table.tsx to use consistent search input styling and positioning
  - Update beats-table.tsx to use consistent search input styling and positioning
  - Update outlets-table.tsx to use consistent search input styling and positioning
  - Implement consistent search placeholder text patterns across all tables
  - _Requirements: 3.1, 3.2, 6.3_

- [x] 7. Standardize table action patterns with dropdown menus
  - Convert countries-table.tsx individual action buttons to dropdown menu pattern
  - Ensure publishers-table.tsx, beats-table.tsx, and outlets-table.tsx use consistent dropdown styling
  - Implement consistent action button positioning (right-aligned) across all tables
  - Add consistent tooltips and accessibility labels for all action buttons
  - Test keyboard navigation for all dropdown menus
  - _Requirements: 3.3, 6.4, 7.5_

- [x] 8. Implement consistent table headers and empty states
  - Standardize count badge display in table headers across all features
  - Implement consistent empty state messages for all tables
  - Standardize loading state indicators across all table components
  - Ensure consistent error handling and display patterns in all tables
  - Test responsive behavior of table headers on different screen sizes
  - _Requirements: 3.4, 3.5, 3.6, 6.5, 8.2, 8.3_

- [x] 9. Update Publishers client view and import references
  - Update publishers client view to import new Sheet components
  - Update component instantiation to use new Sheet component names
  - Test add/edit functionality with new Sheet components
  - Verify all existing functionality is preserved
  - Update any other files that import publisher modal components
  - _Requirements: 5.1, 5.2, 5.3, 6.1_

- [x] 10. Update Outlets client view and import references
  - Update outlets client view to import new Sheet components
  - Update component instantiation to use new Sheet component names
  - Test add/edit functionality with new Sheet components
  - Verify category selection and publisher assignment still work correctly
  - Update any other files that import outlet modal components
  - _Requirements: 5.1, 5.2, 5.3, 6.1_

- [x] 11. Update Beats client view and import references
  - Update beats client view to import new Sheet components
  - Update component instantiation to use new Sheet component names
  - Test add/edit functionality with new Sheet components
  - Verify category selection functionality works with new Sheet UI
  - Update any other files that import beat modal components
  - _Requirements: 5.1, 5.2, 5.3, 6.1_

- [x] 12. Update Categories client view and import references
  - Update categories client view to import new Sheet components
  - Update component instantiation to use new Sheet component names
  - Test add/edit functionality with new Sheet components
  - Verify color picker functionality works correctly in Sheet format
  - Update any other files that import category modal components
  - _Requirements: 5.1, 5.2, 5.3, 6.1_

- [x] 13. Update Countries and Regions import references
  - Update countries client view to import renamed Sheet components
  - Update regions client view to import renamed Sheet components
  - Update any page components that import the renamed country/region components
  - Test all functionality to ensure no regressions from file renaming
  - Verify complex forms (countries, regions) maintain their advanced features
  - _Requirements: 5.1, 5.2, 5.3, 6.1_

- [x] 14. Update Languages import references
  - Update languages client view to import renamed Sheet components
  - Update any page components that import the renamed language components
  - Test add/edit functionality with renamed components
  - Verify country assignment functionality still works correctly
  - Ensure no broken imports or missing component references
  - _Requirements: 5.1, 5.2, 5.3, 6.1_

- [x] 15. Implement consistent responsive design patterns
  - Test all Sheet components on mobile devices and ensure consistent behavior
  - Verify table overflow handling is consistent across all features on small screens
  - Test touch interactions on all Sheet components for mobile compatibility
  - Ensure consistent scrolling behavior when content exceeds viewport height
  - Validate that all components adapt predictably when browser is resized
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 16. Comprehensive testing and validation
  - Test all CRUD operations across all features to ensure functionality is preserved
  - Validate form submission and error handling works consistently across all sheets
  - Test keyboard navigation and accessibility features on all new Sheet components
  - Verify search and filtering capabilities work correctly in all updated tables
  - Test loading states and error scenarios across all components
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 17. Clean up and remove old modal files
  - Mark old modal files for removal: add-publisher-modal.tsx, edit-publisher-modal.tsx
  - Mark old modal files for removal: add-outlet-modal.tsx, edit-outlet-modal.tsx
  - Mark old modal files for removal: add-beat-modal.tsx, edit-beat-modal.tsx
  - Mark old modal files for removal: add-category-modal.tsx, edit-category-modal.tsx
  - Verify no active references remain to old modal components
  - Remove old modal files after confirming new Sheet implementations work correctly
  - _Requirements: 2.5, 5.4_

- [x] 18. Final integration testing and performance validation
  - Perform end-to-end testing of all features with new harmonized UI patterns
  - Validate that no performance regressions have been introduced
  - Test cross-browser compatibility of all new Sheet components
  - Verify consistent behavior across all features and components
  - Conduct final accessibility audit of all updated components
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_