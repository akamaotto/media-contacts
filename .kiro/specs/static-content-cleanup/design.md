# Design Document

## Overview

This design outlines the systematic removal of static data arrays from the codebase while preserving essential types, interfaces, and utility functions. The cleanup will ensure the application relies entirely on database-sourced content, reducing code bloat and eliminating potential inconsistencies between static and database data.

## Architecture

### Current State Analysis

The codebase currently contains:

1. **Static Data Files:**
   - `src/lib/country-data.ts` - Contains regions array and imports languages
   - `src/lib/language-data.ts` - Contains comprehensive languages array
   - `src/lib/all-countries.ts` - Contains consolidated countries array and utility functions
   - `src/lib/country-list*.ts` (4 files) - Contains country data split across multiple files
   - `src/lib/country-data-updated.ts` - Duplicate/alternative country data file

2. **Dependencies:**
   - Seed file (`prisma/seed.ts`) imports static data for database initialization
   - Backend actions use static data as fallbacks when database queries fail
   - Components import types and interfaces from static data files
   - Various utility functions operate on static data arrays

### Target State

After cleanup:

1. **Preserved Elements:**
   - TypeScript interfaces (`Language`, `Region`, `CountryData`, `RegionCategory`)
   - Utility functions that can work with database-sourced data
   - Type definitions needed by components and backend actions

2. **Removed Elements:**
   - All static data arrays (`languages`, `regions`, `countries`, etc.)
   - Redundant/duplicate files
   - Static data imports in seed files and backend actions

3. **Refactored Elements:**
   - Backend actions will rely solely on database queries
   - Seed files will use alternative data sources or require manual data entry
   - Import statements updated to reference new type-only files

## Components and Interfaces

### Type Definition Files

**`src/lib/types/geography.ts`**
```typescript
export interface Language {
  id?: string;
  code: string;
  name: string;
  native?: string;
  rtl?: boolean;
  countries?: any[];
}

export type RegionCategory = 'continent' | 'subregion' | 'economic' | 'political' | 'organization' | 'trade_agreement' | 'geographical' | 'other';

export interface Region {
  code: string;
  name: string;
  category: RegionCategory;
  parentCode?: string;
  description?: string;
  countries?: Array<{
    id: string;
    name: string;
    code: string;
    flag_emoji?: string;
  }>;
}

export interface CountryData {
  id?: string;
  name: string;
  code: string;
  continent_code?: string;
  region_codes?: string[];
  language_codes?: string[];
  latitude?: number;
  longitude?: number;
  flag_emoji?: string;
}
```

**`src/lib/utils/geography.ts`**
```typescript
import { CountryData } from '../types/geography';

// Database-compatible utility functions
export async function getCountryByCode(code: string, prisma: any): Promise<CountryData | null> {
  // Implementation using database query
}

export async function getCountriesByRegion(regionCode: string, prisma: any): Promise<CountryData[]> {
  // Implementation using database query
}

export async function getCountriesByLanguage(languageCode: string, prisma: any): Promise<CountryData[]> {
  // Implementation using database query
}
```

### Backend Actions Refactoring

Backend actions will be updated to:
1. Remove static data imports
2. Remove fallback logic that uses static arrays
3. Implement proper error handling for database failures
4. Use database queries exclusively

### Seed File Strategy

The seed file will be updated to:
1. Remove static data imports
2. Add comments indicating where manual data entry or alternative data sources are needed
3. Provide example data structures for reference
4. Include instructions for data migration from existing database

## Data Models

### Database Schema Validation

Ensure the existing database schema supports all required operations:
- Countries table with proper relationships to regions and languages
- Regions table with category and parent relationships
- Languages table with country associations
- Proper foreign key constraints and indexes

### Migration Strategy

1. **Phase 1: Type Extraction**
   - Extract interfaces and types to dedicated files
   - Update imports across codebase
   - Verify TypeScript compilation

2. **Phase 2: Utility Function Refactoring**
   - Move utility functions to dedicated files
   - Update functions to work with database queries
   - Update function signatures to accept database connection

3. **Phase 3: Static Data Removal**
   - Remove static data arrays
   - Update backend actions to remove fallback logic
   - Update seed files

4. **Phase 4: File Cleanup**
   - Remove redundant files
   - Consolidate remaining functionality
   - Update import paths

## Error Handling

### Database Connection Failures

When database queries fail:
1. Log appropriate error messages
2. Return empty arrays or null values as appropriate
3. Do not fall back to static data
4. Provide clear error responses to frontend

### Missing Data Scenarios

When expected data is not found in database:
1. Return appropriate empty states
2. Log warnings for missing critical data
3. Provide user-friendly error messages
4. Suggest data seeding if database is empty

## Testing Strategy

### Unit Tests

1. **Type Definition Tests**
   - Verify interfaces are properly exported
   - Test type compatibility with existing code

2. **Utility Function Tests**
   - Test database-compatible utility functions
   - Mock database connections for testing
   - Verify error handling

3. **Backend Action Tests**
   - Test database-only query logic
   - Verify proper error handling
   - Test empty database scenarios

### Integration Tests

1. **Database Integration**
   - Test with actual database connections
   - Verify data retrieval works correctly
   - Test relationship queries

2. **Component Integration**
   - Verify components work with new type imports
   - Test data flow from database to UI
   - Verify error states are handled properly

### Migration Validation

1. **Before/After Comparison**
   - Compare application behavior before and after cleanup
   - Verify no functionality is lost
   - Test all affected features

2. **Performance Testing**
   - Ensure database queries perform adequately
   - Compare performance with previous static data access
   - Identify any performance regressions

## Implementation Phases

### Phase 1: Preparation and Analysis
- Catalog all static data usage
- Identify all import dependencies
- Create comprehensive test coverage

### Phase 2: Type System Refactoring
- Extract types to dedicated files
- Update all import statements
- Verify TypeScript compilation

### Phase 3: Utility Function Migration
- Create database-compatible utility functions
- Update function signatures and implementations
- Test utility functions in isolation

### Phase 4: Backend Action Updates
- Remove static data imports from backend actions
- Remove fallback logic
- Update error handling

### Phase 5: Seed File Updates
- Remove static data imports from seed files
- Add documentation for manual data entry
- Provide migration scripts if needed

### Phase 6: File Cleanup and Validation
- Remove static data files
- Remove redundant files
- Final testing and validation

## Risk Mitigation

### Data Loss Prevention
- Ensure database contains all necessary data before removing static fallbacks
- Create backup of static data files before deletion
- Provide rollback plan if issues are discovered

### Functionality Preservation
- Comprehensive testing at each phase
- Gradual migration approach
- Maintain backward compatibility during transition

### Performance Considerations
- Monitor database query performance
- Implement appropriate caching if needed
- Optimize database indexes for common queries