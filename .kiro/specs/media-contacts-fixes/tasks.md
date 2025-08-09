# Implementation Plan

- [x] 1. Enhance API endpoint with missing filter parameters
  - Update the media contacts API route to support outlet, region, and language filtering
  - Add database queries for outlet and language relationships
  - Ensure proper indexing for performance
  - Test API response with new filter combinations
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 2. Create MediaContactsPagination component
  - Build reusable pagination component with first/previous/next/last navigation
  - Add page size selector with common options (10, 25, 50, 100)
  - Include current page indicator and total count display
  - Implement responsive design for mobile devices
  - Add proper accessibility attributes and keyboard navigation
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 3. Enhance FastMediaContactsTable with pagination controls
  - Integrate MediaContactsPagination component at the bottom of the table
  - Connect pagination state to API calls
  - Handle page changes and page size changes
  - Maintain current page position when filters change appropriately
  - Add loading states during pagination transitions
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 7.1, 7.3_

- [x] 4. Fix badge text truncation with responsive design
  - Create enhanced badge rendering function with dynamic width
  - Implement tooltip support for long badge text
  - Add "+X more" indicators when there are many items
  - Ensure badges adapt to different screen sizes
  - Handle empty states with clear indicators
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 5. Add outlet filter to ApiMediaContactsFilters
  - Create outlet filter dropdown with multi-select functionality
  - Connect outlet filter to API calls and state management
  - Add outlet filter badges to active filters display
  - Implement outlet filter clearing functionality
  - Ensure outlet filter works with other filters using AND logic
  - _Requirements: 2.1, 2.5, 2.6, 2.7_

- [x] 6. Add region filter to ApiMediaContactsFilters
  - Create region filter dropdown with multi-select functionality
  - Connect region filter to API calls and state management
  - Add region filter badges to active filters display
  - Implement region filter clearing functionality
  - Ensure region filter works with other filters using AND logic
  - _Requirements: 2.2, 2.5, 2.6, 2.7_

- [x] 7. Add language filter to ApiMediaContactsFilters
  - Create language filter dropdown with multi-select functionality
  - Connect language filter to API calls and state management
  - Add language filter badges to active filters display
  - Implement language filter clearing functionality
  - Ensure language filter works with other filters using AND logic
  - _Requirements: 2.3, 2.5, 2.6, 2.7_

- [x] 8. Fix table row click navigation
  - Ensure clicking on any part of a contact row opens the detail view
  - Prevent row click events when clicking on action buttons
  - Test row click functionality with keyboard navigation
  - Maintain proper focus management when detail view opens
  - Preserve table state (filters, page) when returning from detail view
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 9. Remove duplicate page headers
  - Identify and remove redundant header components
  - Ensure single, clean page header with title and description
  - Update header to show dynamic contact count based on filters
  - Maintain consistent spacing and visual hierarchy
  - Test responsive behavior of the unified header
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 10. Enhance email verification display
  - Improve visual indicators for email verification status
  - Use clear icons and colors for verified/unverified states
  - Ensure email verification filter works accurately
  - Add email verification status to filter badges when active
  - Test accessibility of verification status indicators
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 11. Add comprehensive loading states and error handling
  - Implement skeleton loaders that match table structure
  - Add debouncing to filter changes to prevent excessive API calls
  - Create clear error messages with retry functionality
  - Add loading indicators for pagination transitions
  - Include optional performance metrics display for debugging
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 12. Update type definitions and interfaces
  - Add new filter parameters to TypeScript interfaces
  - Update API response types to include outlet and language data
  - Create enhanced badge component interface
  - Update pagination component interface
  - Ensure type safety across all enhanced components
  - _Requirements: All requirements - supporting infrastructure_

- [x] 13. Write comprehensive tests for new functionality
  - Create unit tests for MediaContactsPagination component
  - Test enhanced badge rendering logic
  - Write integration tests for new filter combinations
  - Test API endpoint with all filter parameters
  - Add end-to-end tests for complete user workflows
  - _Requirements: All requirements - quality assurance_

- [x] 14. Fix email uniqueness validation bug in contact updates
  - Fix the `upsertMediaContactInDb` function to exclude the current contact from email uniqueness checks during updates
  - Ensure the update operation properly identifies existing contacts by ID
  - Add proper error handling for update vs create operations
  - Test that updating a contact with the same email no longer throws P2002 errors
  - Verify that email uniqueness is still enforced for new contacts and different existing contacts
  - _Requirements: Backend bug fix - contact update functionality_