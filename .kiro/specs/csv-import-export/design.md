# Design Document for CSV Import/Export

## Overview

This design document outlines the architectural approach for implementing robust CSV import and export functionality in the Media Contacts Management System. The solution addresses performance considerations, data validation, user experience, and integration with the existing system architecture.

The design follows the established feature-based backend structure and leverages the modern dashboard UI components already implemented in the system.

## Architecture

### Current System Context

The existing system uses:
- **Frontend**: Next.js 15 with App Router, React 19, TypeScript, Tailwind CSS, ShadCN UI
- **Backend**: Next.js API Routes with Server Actions
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js 5 with Prisma Adapter
- **UI Components**: ShadCN UI library with custom dashboard components
- **Project Structure**: Feature-based backend organization with consolidated actions

### CSV Import/Export Architecture

#### 1. Backend Structure

Following the established feature-based pattern, we'll create a new feature directory:

```
/backend/csv/
├── actions.ts       # Server actions for CSV operations
├── repository.ts    # Data access layer for CSV operations
├── validation.ts    # Zod schemas for CSV validation
└── mappers.ts       # Mapping functions between CSV and database models
```

#### 2. CSV Processing Pipeline

**Import Pipeline:**
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  File       │     │  CSV        │     │  Data       │     │  Validation │     │  Database   │
│  Upload     │────▶│  Parsing    │────▶│  Mapping    │────▶│  & Error    │────▶│  Insertion  │
│             │     │             │     │             │     │  Handling   │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                                                  │
                                                                  ▼
                                                           ┌─────────────┐
                                                           │  Error      │
                                                           │  Report     │
                                                           │  Generation │
                                                           └─────────────┘
```

**Export Pipeline:**
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Query      │     │  Data       │     │  CSV        │     │  File       │
│  Execution  │────▶│  Streaming  │────▶│  Generation │────▶│  Download   │
│             │     │             │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

#### 3. Component Architecture

**Import Components:**
```tsx
// Main import modal component
<CSVImportModal
  isOpen={isOpen}
  onClose={onClose}
  onComplete={handleImportComplete}
/>

// Multi-step import wizard
<ImportWizard
  steps={[
    { id: 'upload', component: <FileUploadStep /> },
    { id: 'mapping', component: <ColumnMappingStep /> },
    { id: 'validation', component: <ValidationResultsStep /> },
    { id: 'confirmation', component: <ImportConfirmationStep /> },
    { id: 'progress', component: <ImportProgressStep /> },
    { id: 'complete', component: <ImportCompleteStep /> }
  ]}
/>

// Progress tracking component
<ImportProgress 
  current={processedRows}
  total={totalRows}
  errors={errorCount}
  status={importStatus}
/>
```

**Export Components:**
```tsx
// Export dialog component
<CSVExportDialog
  isOpen={isOpen}
  onClose={onClose}
  filters={currentFilters}
  onExport={handleExport}
/>

// Field selection component
<FieldSelectionList
  availableFields={availableFields}
  selectedFields={selectedFields}
  onSelectionChange={setSelectedFields}
/>

// Export progress component
<ExportProgress
  current={processedRows}
  total={totalRows}
  status={exportStatus}
/>
```

#### 4. Data Validation Strategy

**CSV Schema Validation:**
```typescript
// Zod schema for CSV validation
const csvContactSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email format"),
  title: z.string().optional(),
  outlet: z.string().optional(),
  beats: z.string().optional().transform(str => str?.split(',').map(s => s.trim())),
  countries: z.string().optional().transform(str => str?.split(',').map(s => s.trim())),
  regions: z.string().optional().transform(str => str?.split(',').map(s => s.trim())),
  languages: z.string().optional().transform(str => str?.split(',').map(s => s.trim())),
  twitterHandle: z.string().optional(),
  instagramHandle: z.string().optional(),
  linkedinUrl: z.string().optional(),
  bio: z.string().optional(),
  notes: z.string().optional(),
  authorLinks: z.string().optional().transform(str => str?.split(',').map(s => s.trim())),
});
```

**Error Handling Strategy:**
- Collect all validation errors rather than failing on first error
- Group errors by row number and field name
- Provide specific error messages for each validation failure
- Allow partial imports with error skipping options

#### 5. Performance Optimization

**Import Optimizations:**
- Process CSV files in chunks (1000 rows at a time)
- Use Web Workers for client-side parsing of large files
- Implement batch database operations with Prisma
- Use streaming for file uploads exceeding 5MB

**Export Optimizations:**
- Stream database results directly to CSV generation
- Implement pagination for large exports
- Use HTTP response streaming for immediate download start
- Optimize queries with proper indexing and field selection

#### 6. User Experience Design

**Import UX Flow:**
1. User clicks "Upload CSV" button in dashboard header
2. Modal opens with drag-and-drop area and file selection button
3. After upload, system analyzes CSV structure and presents column mapping interface
4. User maps CSV columns to database fields (with smart auto-mapping)
5. System validates data and shows preview with any validation errors
6. User confirms import and sees real-time progress indicator
7. On completion, summary shows successful imports and any errors

**Export UX Flow:**
1. User clicks "Export CSV" button in dashboard header
2. Dialog opens with field selection options and format choices
3. User selects desired fields and export options
4. System shows progress indicator during export generation
5. File download begins automatically when ready
6. Success notification confirms export completion

#### 7. Integration Points

**Dashboard Integration:**
- Add CSV import/export buttons to the DashboardActionButtons component
- Extend button configurations in dashboard-button-configs.ts
- Register new server actions in the consolidated actions exports

**Database Integration:**
- Leverage existing media-contacts repository for database operations
- Extend repository with specialized bulk operations
- Implement transaction support for atomic operations

**Error Handling Integration:**
- Integrate with the application's toast notification system
- Provide downloadable error reports for failed imports
- Use consistent error formatting across the application
