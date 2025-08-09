# Implementation Plan

- [x] 1. Set up database models and migrations for dashboard functionality
  - Create Prisma models for ActivityLog and DashboardMetric
  - Generate and run database migrations
  - Create database views for optimized chart data queries
  - _Requirements: 3.1, 3.2, 8.1, 8.2_

- [x] 2. Create core dashboard backend services
  - [x] 2.1 Implement dashboard metrics service
    - Create service to calculate total counts for contacts, publishers, outlets
    - Implement percentage change calculations for metrics
    - Add email verification rate calculation
    - Write unit tests for metrics calculations
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 2.2 Implement chart data service
    - Create service for contacts by country aggregation
    - Implement contacts by beat distribution
    - Add publisher-outlet relationship data
    - Create geographic distribution data service
    - Write unit tests for chart data services
    - _Requirements: 2.1, 2.2, 2.3, 6.1, 6.2_

  - [x] 2.3 Implement activity tracking service
    - Create activity logging service for CRUD operations
    - Implement activity retrieval with pagination
    - Add activity filtering by type and user
    - Write unit tests for activity tracking
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. Create dashboard API endpoints
  - [x] 3.1 Create metrics API endpoint
    - Implement `/api/dashboard/metrics` route
    - Add caching with appropriate cache headers
    - Implement error handling and validation
    - Write integration tests for metrics endpoint
    - _Requirements: 1.1, 1.2, 5.1, 5.5_

  - [x] 3.2 Create charts API endpoint
    - Implement `/api/dashboard/charts` route with time range filtering
    - Add support for different chart types (country, beat, publisher distribution)
    - Implement geographic data endpoint
    - Write integration tests for charts endpoint
    - _Requirements: 2.1, 2.2, 2.4, 6.1, 6.3_

  - [x] 3.3 Create activity feed API endpoint
    - Implement `/api/dashboard/activity` route with pagination
    - Add filtering by activity type and date range
    - Implement real-time activity updates
    - Write integration tests for activity endpoint
    - _Requirements: 3.1, 3.2, 3.4, 3.5_

- [x] 4. Build core dashboard UI components
  - [x] 4.1 Create MetricCard component
    - Build reusable metric card with value, change indicator, and icon
    - Implement loading states and error handling
    - Add responsive design for mobile devices
    - Write unit tests for MetricCard component
    - _Requirements: 1.1, 1.2, 1.3, 5.2, 5.3_

  - [x] 4.2 Create DashboardChart component
    - Build chart component with support for bar, pie, and line charts
    - Implement time range selector functionality
    - Add chart loading states and error boundaries
    - Ensure charts are accessible with proper ARIA labels
    - Write unit tests for chart component
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.2, 5.3_

  - [x] 4.3 Create ActivityFeed component
    - Build activity feed list with proper icons and formatting
    - Implement pagination and "load more" functionality
    - Add activity type filtering and color coding
    - Create empty state for when no activities exist
    - Write unit tests for ActivityFeed component
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 5. Implement geographic visualization
  - [x] 5.1 Create geographic distribution component
    - Build interactive map or chart showing contact distribution by country
    - Implement hover tooltips with detailed contact information
    - Add filtering by beats, categories, or languages
    - Ensure geographic component is responsive on mobile
    - Write unit tests for geographic component
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 6. Build dashboard page layout and integration
  - [x] 6.1 Create dashboard page component
    - Build main dashboard page at `/` route
    - Integrate MetricCard, DashboardChart, and ActivityFeed components
    - Implement server-side data fetching for initial load
    - Add error boundaries and loading states for entire dashboard
    - _Requirements: 1.1, 2.1, 3.1, 5.1, 5.4_

  - [x] 6.2 Implement dashboard sections layout
    - Create responsive grid layout for metrics section
    - Build charts section with proper spacing and organization
    - Implement activity feed section with proper styling
    - Ensure layout works on mobile devices with stacked components
    - _Requirements: 5.2, 5.3, 1.1, 2.1, 3.1_

- [x] 7. Create dedicated Media Contacts page
  - [x] 7.1 Move Media Contacts to dedicated route
    - Create new `/media-contacts` page route
    - Move existing MediaContactsClientView to new page
    - Ensure all existing functionality is preserved (search, filters, CRUD, CSV)
    - Update any hardcoded references to home page
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 7.2 Test Media Contacts page functionality
    - Verify all existing features work (search, filters, CRUD operations)
    - Test CSV import/export functionality
    - Ensure responsive design and error handling
    - Validate authentication and authorization
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 8. Update navigation and routing
  - [x] 8.1 Update sidebar navigation to reflect new structure
    - Add Dashboard as home page
    - Add Media Contacts as dedicated page
    - Ensure proper active states and routing
    - _Requirements: 4.1, 4.2_

  - [x] 8.2 Update breadcrumb navigation
    - Configure proper breadcrumbs for dashboard vs media contacts
    - Update page titles and descriptions
    - Ensure consistent navigation patterns
    - _Requirements: 4.1, 4.2_

  - [x] 8.2 Add quick access links
    - Add navigation links from dashboard to Media Contacts page
    - Implement breadcrumb navigation updates
    - Create quick action buttons on dashboard for common tasks
    - _Requirements: 4.3_

- [x] 9. Implement activity logging integration
  - [x] 9.1 Add activity logging to existing CRUD operations
    - Integrate activity logging into media contacts CRUD operations
    - Add logging to publisher, outlet, beat, and category operations
    - Implement logging for CSV import/export operations
    - Ensure activity logs capture user information and timestamps
    - _Requirements: 3.1, 3.2, 8.1, 8.2_

  - [x] 9.2 Test activity logging functionality
    - Verify activities are logged correctly for all operations
    - Test activity feed displays recent activities properly
    - Ensure activity statistics are calculated properly
    - _Requirements: 3.1, 3.2_

- [x] 10. Implement caching and performance optimizations
  - [x] 10.1 Add caching for dashboard metrics
    - Implement Redis caching for aggregated metrics
    - Add cache invalidation when data changes
    - Set appropriate cache expiration times
    - Write tests for caching functionality
    - _Requirements: 5.1, 5.4_

  - [x] 10.2 Optimize database queries
    - Add database indexes for dashboard queries
    - Implement query batching for multiple metrics
    - Optimize chart data aggregation queries
    - Write performance tests for dashboard queries
    - _Requirements: 5.1, 5.4_

- [x] 11. Add responsive design and mobile support
  - [x] 11.1 Implement mobile-responsive dashboard layout
    - Ensure metric cards stack properly on mobile devices
    - Make charts responsive and touch-friendly
    - Implement collapsible sections for mobile
    - Test dashboard on various screen sizes
    - _Requirements: 5.2, 5.3_

  - [x] 11.2 Add mobile-specific interactions
    - Implement touch gestures for chart navigation
    - Add pull-to-refresh functionality for dashboard
    - Optimize activity feed for mobile scrolling
    - Write mobile-specific tests
    - _Requirements: 5.2, 5.3_

- [x] 12. Implement error handling and loading states
  - [x] 12.1 Add comprehensive error boundaries
    - Create error boundaries for each dashboard section
    - Implement fallback components for failed data loads
    - Add retry functionality for failed requests
    - Write tests for error handling scenarios
    - _Requirements: 1.4, 2.5, 3.5, 5.5_

  - [x] 12.2 Create loading state components
    - Build skeleton loaders for metrics, charts, and activity feed
    - Implement progressive loading for dashboard sections
    - Add loading indicators for user interactions
    - Write tests for loading state components
    - _Requirements: 5.1, 5.4_

- [x] 13. Add admin-specific dashboard features
  - [x] 13.1 Implement admin metrics and system health indicators
    - Add admin-only metrics for active users and database size
    - Implement system performance indicators
    - Create admin-specific dashboard sections
    - Add role-based access control for admin features
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 14. Write comprehensive tests
  - [x] 14.1 Create end-to-end tests
    - Write E2E tests for complete dashboard flow
    - Test navigation between dashboard and media contacts
    - Verify responsive behavior on different devices
    - Test dashboard performance and loading times
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 14.2 Add integration tests
    - Test dashboard API endpoints with realistic data
    - Verify database queries and aggregations
    - Test activity logging integration
    - Write tests for caching functionality
    - _Requirements: 1.1, 2.1, 3.1, 5.1_