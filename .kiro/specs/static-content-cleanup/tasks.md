# Implementation Plan

- [x] 1. Create type definition files and extract interfaces
  - Create `src/lib/types/geography.ts` with all necessary interfaces (Language, Region, CountryData, RegionCategory)
  - Extract interfaces from existing static data files without the static arrays
  - Ensure all interfaces are properly typed and documented
  - _Requirements: 1.2, 4.1, 4.2_

- [x] 2. Create database-compatible utility functions
  - Create `src/lib/utils/geography.ts` with database-compatible utility functions
  - Implement `getCountryByCode`, `getCountriesByRegion`, `getCountriesByLanguage` functions that accept prisma instance
  - Update function signatures to work with database queries instead of static arrays
  - Add proper error handling and return types
  - _Requirements: 1.3, 3.3, 4.3_

- [x] 3. Update component imports to use new type files
  - Update all component files that import types from static data files
  - Replace imports from `@/lib/country-data` and `@/lib/language-data` with `@/lib/types/geography`
  - Verify TypeScript compilation passes after import updates
  - _Requirements: 2.1, 2.2, 3.1_

- [x] 4. Update backend action imports and remove static data dependencies
  - Update `src/backend/regions/actions.ts` to remove static data imports and fallback logic
  - Update `src/backend/languages/actions.ts` to remove static data imports and fallback logic
  - Update `src/backend/countries/actions.ts` to use new utility functions if needed
  - Remove all references to static data arrays in backend actions
  - _Requirements: 2.1, 2.2, 3.2_

- [x] 5. Update seed file to remove static data imports
  - Update `prisma/seed.ts` to remove imports of static data arrays
  - Add comments indicating where manual data entry or database migration is needed
  - Provide example data structures for reference in comments
  - Ensure seed file still compiles and runs without static data
  - _Requirements: 2.3, 4.4_

- [x] 6. Remove static data arrays from existing files
  - Remove static arrays from `src/lib/country-data.ts` while preserving any remaining utility functions
  - Remove static arrays from `src/lib/language-data.ts` while preserving interfaces
  - Remove static arrays from `src/lib/all-countries.ts` while preserving utility function signatures
  - Update these files to re-export types from the new type definition files
  - _Requirements: 1.1, 1.4_

- [x] 7. Remove redundant static data files
  - Delete `src/lib/country-list.ts`, `src/lib/country-list-part2.ts`, `src/lib/country-list-part3.ts`, `src/lib/country-list-part4.ts`
  - Delete `src/lib/country-data-updated.ts` (appears to be duplicate)
  - Update any remaining imports that reference these deleted files
  - _Requirements: 1.4, 4.4_

- [x] 8. Update remaining import statements across codebase
  - Search for and update any remaining imports of deleted files or static data
  - Update imports in test files to use new type definitions
  - Update imports in any utility files or helpers
  - _Requirements: 2.1, 2.2, 4.4_

- [x] 9. Verify TypeScript compilation and fix any errors
  - Run TypeScript compiler to identify any remaining compilation errors
  - Fix any missing imports or type mismatches
  - Ensure all files compile successfully
  - _Requirements: 3.1, 3.2_

- [x] 10. Update and run existing tests
  - Update test files that reference static data or deleted files
  - Modify tests to work with database-sourced data or mock database calls
  - Ensure all existing tests pass or are appropriately updated
  - _Requirements: 3.4_

- [x] 11. Create comprehensive validation tests
  - Write tests to verify type definitions are properly exported
  - Write tests for new database-compatible utility functions
  - Write integration tests to verify components work with new type imports
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 12. Final cleanup and documentation
  - Remove any remaining unused imports or dead code
  - Update any documentation that references static data files
  - Add comments explaining the new structure and where to find types
  - Verify the application runs correctly without static data
  - _Requirements: 3.2, 4.4_