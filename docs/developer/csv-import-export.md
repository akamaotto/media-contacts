# CSV Import/Export Developer Documentation

This document provides technical details about the CSV import/export functionality in the Media Contacts application.

## Architecture Overview

The CSV import/export system is built with a feature-based architecture that separates concerns into distinct modules:

```
/backend/csv/
├── actions.ts       # Server actions for import/export
├── mappers.ts       # Data mapping between CSV and database models
├── optimizations.ts # Performance optimizations for large datasets
├── repository.ts    # Database operations
└── validation.ts    # Schema validation and data integrity
```

## Core Components

### 1. Validation (validation.ts)

The validation module uses Zod to define schemas and validate CSV data:

- `csvContactSchema`: Defines the expected structure and validation rules for CSV rows
- `validateCsvHeaders`: Validates CSV headers against required fields
- `validateCsvRow`: Validates individual CSV rows against the schema

### 2. Mappers (mappers.ts)

The mappers module handles data transformation between formats:

- `mapCsvRowToMediaContact`: Transforms validated CSV data to database model
- `mapMediaContactToCsvRow`: Transforms database model to CSV row format
- `generateCsvHeaders`: Generates user-friendly CSV headers

### 3. Repository (repository.ts)

The repository module handles database operations:

- `createMediaContact`: Creates or updates contacts in the database
- `findMediaContacts`: Retrieves contacts based on filters
- `buildWhereClause`: Builds Prisma query filters

### 4. Optimizations (optimizations.ts)

The optimizations module improves performance for large datasets:

- `processCsvInBatches`: Processes CSV files in memory-efficient batches
- `batchInsertContacts`: Optimized database insertion with controlled concurrency
- `queryContactsInPages`: Cursor-based pagination for efficient data retrieval
- `createCsvWithStreams`: Stream-based CSV generation

### 5. Actions (actions.ts)

The actions module provides the public API for import/export operations:

- `importMediaContactsFromCsv`: Handles CSV file import
- `exportMediaContactsToCsv`: Handles CSV data export

## Data Flow

### Import Flow

1. User uploads CSV file
2. File is saved temporarily to disk
3. Headers are validated against required fields
4. File is processed in batches to minimize memory usage
5. Each row is validated against the schema
6. Valid rows are mapped to database model
7. Contacts are inserted in batches with duplicate handling
8. Progress is reported to the client
9. Temporary file is deleted
10. Result summary is returned to the client

### Export Flow

1. User selects fields and filters
2. Database is queried with pagination
3. Results are mapped to CSV format
4. CSV is generated and streamed to the client

## Performance Considerations

### Import Optimizations

- **Batch Processing**: Files are processed in configurable batch sizes
- **Controlled Concurrency**: Limits parallel operations to prevent database overload
- **Memory Management**: Streams data to minimize memory footprint
- **Progress Reporting**: Provides real-time progress updates

### Export Optimizations

- **Cursor-based Pagination**: Efficient database querying for large datasets
- **Streaming**: Generates CSV in chunks to minimize memory usage
- **Field Selection**: Only exports requested fields to reduce payload size

## Extension Points

### Adding New Fields

To add a new field to the CSV import/export:

1. Update `CsvContactData` interface in `validation.ts`
2. Add field to `csvContactSchema` in `validation.ts`
3. Update mapping functions in `mappers.ts`
4. Update header mapping in `generateCsvHeaders`

### Custom Validation Rules

To add custom validation rules:

1. Modify the field definition in `csvContactSchema`
2. Add custom error messages as needed
3. Update any related mapping logic

### Performance Tuning

To adjust performance settings:

1. Modify `BATCH_CONFIG` in `optimizations.ts`
2. Adjust batch sizes and concurrency limits based on server capacity

## Testing

The CSV functionality includes comprehensive tests:

- **Unit Tests**: Test individual components in isolation
  - `validation.test.ts`: Tests schema validation
  - `mappers.test.ts`: Tests data mapping

- **Integration Tests**: Test component interactions
  - `integration.test.ts`: Tests end-to-end flow with mocks

- **End-to-End Tests**: Test with actual database
  - `e2e.test.ts`: Tests with real database connections

- **Performance Benchmarking**:
  - `benchmark.ts`: Measures performance with different dataset sizes

## Error Handling

The system handles various error scenarios:

- **Validation Errors**: Detailed per-field validation errors
- **File Format Errors**: CSV parsing and format errors
- **Database Errors**: Connection and constraint errors
- **Memory Limits**: Graceful handling of large files

## Future Improvements

Potential areas for enhancement:

1. **Worker Threads**: Offload processing to background workers
2. **Real-time Validation**: Client-side validation before upload
3. **Resumable Uploads**: Support for resuming interrupted uploads
4. **Custom Mappings**: User-defined field mappings
5. **Template Generation**: Generate template CSV files
6. **Data Enrichment**: Integrate with external data sources

## API Reference

### Import API

```typescript
interface ImportProgress {
  percentage: number;
  processed: number;
  total: number;
}

interface ImportResult {
  success: boolean;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: Array<{
    row: Record<string, any>;
    errors: Array<{
      path: string;
      message: string;
    }>;
  }>;
  error?: string;
}

async function importMediaContactsFromCsv({
  filePath,
  onProgress,
}: {
  filePath: string;
  onProgress?: (progress: ImportProgress) => void;
}): Promise<ImportResult>
```

### Export API

```typescript
interface ExportOptions {
  fields: string[];
  filters: Record<string, any>;
}

interface ExportResult {
  success: boolean;
  data?: string;
  error?: string;
}

async function exportMediaContactsToCsv(
  options: ExportOptions
): Promise<ExportResult>
```
