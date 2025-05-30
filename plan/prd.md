### Key Points
- It seems likely that the current plan can be improved to better follow Next.js best practices for handling large datasets.
- Research suggests focusing on database optimization, efficient data fetching, and frontend performance for scalability.
- The evidence leans toward implementing server-side pagination, virtualization, and chunked CSV processing for better performance.

---

### Direct Answer

#### Overview
The plan for the Media Contacts Table App can be enhanced to align with Next.js best practices, especially for managing large datasets (100k+ contacts). Here are key areas to improve for better performance, scalability, and maintainability.

#### Database Optimization
Ensure the database is optimized for large datasets by adding a unique index on the `email` field and using GIN indexes for array fields like `countries` and `beats`. This will improve query performance for filtering and sorting.

#### Efficient Data Fetching
Implement server-side pagination, filtering, and sorting, using cursor-based pagination for efficiency. Use PostgreSQL's full-text search for global search to handle large datasets without overloading the client.

#### CSV Import and Export
For CSV imports, process large files in chunks or use streaming to avoid memory issues, ensuring imports of 5k+ entries complete within 30 seconds. Stream CSV exports to handle large datasets efficiently.

#### Frontend Performance
Use TanStack Table with React Virtual for rendering only visible rows, and debounce search and filter inputs to reduce server requests. This will keep the app responsive for large contact lists.

#### Error Handling and Testing
Add robust error handling for operations like CSV imports and CRUD actions, and include performance tests for large datasets to ensure responsiveness.

By making these improvements, the app will better handle large datasets while following Next.js best practices for performance and user experience. For more details, see [Data Fetching Patterns and Best Practices | Next.js](https://nextjs.org/docs/14/app/building-your-application/data-fetching/patterns) and [Optimizing Server-Side Rendering for Large Datasets in Next.js](https://codemax.app/snippet/optimizing-server-side-rendering-for-large-datasets-in-next-js/).

---

### Survey Note: Detailed Analysis and Recommendations

The provided plan for the Media Contacts Table App, designed as an internal tool for managing large datasets (100k+ journalists, bloggers, and media contacts), outlines functional and technical requirements, including CSV import/export, CRUD operations, and a table UI with search, filters, and pagination. However, the user notes that the plan does not fully follow Next.js best practices, particularly for handling large datasets. This section provides a comprehensive analysis and recommendations to enhance the plan, ensuring scalability, performance, and maintainability, while aligning with Next.js best practices as of May 30, 2025.

#### Background and Context
The app is built using Next.js 15+ App Router, Prisma with PostgreSQL, ShadCN UI, TanStack Table v8 with React Virtual, and Zod for validation. It aims to support 100k+ contacts with smooth interaction, complete CSV imports within 30 seconds for 5k entries, and ensure CRUD operations take less than 1 second roundtrip. Given these goals, the plan must address performance bottlenecks, especially for large datasets, and leverage Next.js features for server-side rendering and data fetching.

#### Analysis of Current Plan
The current plan includes a solid foundation, such as server-side pagination, virtualization, and feature-first DDD structure. However, several areas can be improved to align with Next.js best practices:

- **Database Optimization:** The plan specifies a `MediaContact` model with fields like `email` (unique), `countries` (array), and `beats` (array). While uniqueness is noted, there is no explicit mention of indexing for performance, which is critical for large datasets.
- **Data Fetching Efficiency:** The plan includes server-side pagination and filtering, which is good, but does not specify cursor-based pagination, which is more efficient for large datasets compared to offset-based pagination.
- **CSV Import/Export:** For large CSV files, the plan mentions streaming for exports but lacks details on handling large imports efficiently, which could lead to memory issues.
- **Frontend Performance:** While TanStack Table with React Virtual is planned, ensuring debouncing for search and filters is not explicitly mentioned, which could impact server load.
- **Error Handling and Logging:** The plan lacks details on error handling for operations like CSV imports and logging for debugging, which are essential for an internal tool.
- **Testing:** Performance testing for large datasets is not explicitly included, which is crucial for meeting success metrics.

#### Recommendations for Improvement
To address these gaps and ensure the plan follows Next.js best practices, the following enhancements are recommended:

##### 1. Database Optimization
For large datasets, database performance is critical. The plan should include:
- **Unique Index on Email:** Ensure the `email` field has a unique index to enforce uniqueness efficiently and speed up queries. This is a standard practice for ensuring data integrity and query performance.
- **Indexing for Filters and Sorts:** Create indexes on fields frequently used in filters and sorts, such as `countries` and `beats`. Since these are array fields, use PostgreSQL's GIN indexes for optimized array containment queries, which will improve filtering performance.
- **Separate Tables for Related Data:** The plan notes that having separate tables for `outlets`, `beats`, and `countries` would be great. This is a best practice for normalization, reducing redundancy, and improving query efficiency. Ensure these tables are linked via foreign keys for relational integrity.

##### 2. Efficient Data Fetching
Next.js emphasizes server-side data fetching for better performance and security, especially for large datasets. The following improvements are recommended:
- **Server-Side Pagination, Filtering, and Sorting:** The plan already includes these, which is excellent. However, implement cursor-based pagination instead of offset-based, as it is more efficient for large datasets. Cursor-based pagination uses a unique identifier (e.g., `id`) and ordering to fetch the next page, reducing the performance degradation seen with offset-based pagination for large offsets.
- **Full-Text Search for Global Search:** For the global search feature, leverage PostgreSQL's full-text search capabilities. This allows efficient searching across multiple fields (e.g., `name`, `title`, `bio`) without loading all data into memory, aligning with Next.js's recommendation for server-side data processing.
- **Query Optimization:** Ensure that queries in the `getMediaContacts` use case are optimized by leveraging indexes and limiting fetched fields to only those necessary for the current view, reducing data transfer and processing time.

##### 3. CSV Import and Export Optimization
Handling large CSV files is a key requirement, with a success metric of completing 5k entry imports within 30 seconds. To achieve this:
- **Chunked Processing for Imports:** Implement a chunked or streaming approach for CSV imports. Use libraries like `csv-parser` in Node.js, which supports streaming and processes files in chunks, avoiding memory exhaustion for large files. This ensures the app can handle imports of 100k+ contacts efficiently.
- **Deduplication Preview (Optional):** Consider adding a preview step before importing to identify and handle duplicates based on email, improving data quality and user experience. This could be a stretch task but aligns with best practices for data management.
- **Streaming for Exports:** The plan already mentions streaming for CSV exports, which is good. Ensure the streaming implementation uses Node.js streams to handle large datasets without overwhelming server memory, meeting the success metric for accurate and streamable exports.

##### 4. Frontend Performance
The frontend must remain responsive for large datasets, and the plan's use of TanStack Table with React Virtual is a strong start. Additional enhancements include:
- **Virtualization Configuration:** Ensure TanStack Table is configured with React Virtual to render only visible rows, minimizing DOM manipulation and improving rendering performance. This is critical for handling 100k+ contacts without performance degradation.
- **Debouncing for Search and Filters:** Implement debouncing on search and filter inputs to reduce the number of server requests. For example, delay requests by 300ms after the user stops typing, reducing server load and improving responsiveness, especially for large datasets.
- **Lazy Loading (If Applicable):** If the app includes images (e.g., contact profile pictures, though not specified in the model), use Next.js's `Image` component with lazy loading to optimize initial page load times, aligning with performance best practices.

##### 5. Error Handling and Logging
For an internal tool, robust error handling and logging are essential for debugging and user experience:
- **Comprehensive Error Handling:** Add robust error handling for all operations, particularly CSV import and CRUD actions. For example, handle malformed CSV files gracefully, validate data using Zod, and provide clear feedback for validation errors (e.g., missing required fields). This ensures users are informed of issues without the app crashing.
- **Logging:** Implement logging for critical operations (e.g., import/export, CRUD) and errors. Even for an internal tool, logging can aid in debugging and monitoring, especially if usage patterns reveal performance issues. Consider using tools like Winston or Bunyan for Node.js logging, integrated with the backend.

##### 6. User Feedback
Enhance user experience by providing feedback during operations:
- **Progress Indicators:** For time-consuming operations like CSV imports, provide progress indicators or notifications (e.g., "Importing X of Y rows") to keep users informed. This can be implemented using ShadCN UI components for toast notifications.
- **Toast Notifications:** Use ShadCN's UI components to display success or error messages after operations like import, export, or CRUD actions, improving user feedback and interaction.

##### 7. Testing
Testing is crucial for ensuring the app meets success metrics, especially for large datasets:
- **Performance Testing:** Include performance tests for scenarios involving large datasets (e.g., loading 100k+ contacts with pagination, filtering, and sorting). This ensures the app remains responsive under heavy loads, meeting the success metric of smooth interaction for 100k+ contacts.
- **E2E Testing for Large Data:** Extend E2E tests to cover scenarios with large datasets, ensuring operations like CSV import/export and table interactions work smoothly. For example, test CSV import with 5k rows to verify the 30-second completion time.

##### 8. Additional Best Practices
To further align with Next.js best practices:
- **Code Organization:** The plan mentions a "Feature-First DDD Structure," which is excellent for maintainability. Ensure new features (e.g., chunked CSV import, debounced search) are added in a way that aligns with this structure, keeping code modular and scalable.
- **API Route Optimization:** Since the app uses API routes (structured by PREP → AVID → SAVIOR → P-STERM, as noted), ensure they are optimized for large data requests. For example, use streaming responses for CSV exports and implement caching for frequently accessed routes (e.g., `getMediaContacts`) to reduce database load. While rate limiting is out of scope, consider basic caching using Next.js's built-in caching mechanisms.
- **Monitoring and Profiling:** Regularly monitor and profile the application to identify performance bottlenecks. Tools like Next.js's built-in performance monitoring or third-party services (e.g., Sentry) can be useful, even for an internal tool, to ensure ongoing optimization.

#### Updated Task Breakdown
To incorporate these improvements, the following tasks can be added or adjusted in the existing Jira-ready task breakdown:

| **Category** | **Task ID** | **Summary**                                                                 | **Assignee**   | **Estimate** |
|--------------|-------------|-----------------------------------------------------------------------------|----------------|--------------|
| Backend      | BE-1        | Add unique index on `email` and GIN indexes for array fields (`countries`, `beats`). | `@backend`     | 2h           |
| Backend      | BE-5        | Update `getMediaContacts` use case with cursor-based pagination and full-text search. | `@backend`     | 5h           |
| Backend      | BE-8        | Implement chunked or streaming CSV import for large files.                   | `@backend`     | 6h           |
| Frontend     | FE-3        | Add debouncing to search and filter inputs for better performance.           | `@frontend`    | 2h           |
| Frontend     | FE-6        | Enhance CSV import with progress indicators and error feedback.              | `@frontend`    | 4h           |
| QA & Testing | QA-5        | Add performance tests for large datasets (e.g., 100k+ contacts).             | `@qa`          | 4h           |

These tasks build on the existing plan, ensuring alignment with Next.js best practices for large datasets.

#### Conclusion
By implementing these enhancements, the Media Contacts Table App will be better equipped to handle large datasets efficiently, meeting success metrics like smooth interaction for 100k+ contacts and fast CSV imports/exports. The improvements focus on database optimization, efficient data fetching, frontend performance, and robust error handling, aligning with Next.js best practices as of May 30, 2025.

---

### ShadCN Rules
---
description: "Use shadcn/ui components as needed for any UI code"
patterns: "*.tsx"
---

# Shadcn UI Components

This project uses @shadcn/ui for UI components. These are beautifully designed, accessible components that you can copy and paste into your apps.

## Finding and Using Components

Components are available in the `src/components/ui` directory, following the aliases configured in `components.json`

## Using Components

Import components from the ui directory using the configured aliases:

```tsx
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
```

Example usage:

```tsx
<Button variant="outline">Click me</Button>

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card Description</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card Content</p>
  </CardContent>
  <CardFooter>
    <p>Card Footer</p>
  </CardFooter>
</Card>
```

## Installing Additional Components

Many more components are available but not currently installed. You can view the complete list at https://ui.shadcn.com/r

To install additional components, use the Shadcn CLI:


```bash
npx shadcn@latest add [component-name]
```

For example, to add the Accordion component:

```bash
npx shadcn@latest add accordion
```

Note: `npx shadcn-ui@latest` is deprecated, use `npx shadcn@latest` instead

Some commonly used components are

- Accordion
- Alert
- AlertDialog
- AspectRatio
- Avatar
- Calendar
- Checkbox
- Collapsible
- Command
- ContextMenu
- DataTable
- DatePicker
- Dropdown Menu
- Form
- Hover Card
- Menubar
- Navigation Menu
- Popover
- Progress
- Radio Group
- ScrollArea
- Select
- Separator
- Sheet
- Skeleton
- Slider
- Switch
- Table
- Textarea
- Toast
- Toggle
- Tooltip

## Component Styling

This project uses the "new-york" style variant with the "neutral" base color and CSS variables for theming, as configured in `components.json`.
@akamaotto
Comment

