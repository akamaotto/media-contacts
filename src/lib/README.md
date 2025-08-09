# Geography Data Structure

This document explains the new geography data structure after the static content cleanup.

## Overview

The geography data system has been refactored to remove static content and rely entirely on database-sourced data. This provides better data consistency, easier maintenance, and eliminates the risk of static/database data mismatches.

## Directory Structure

```
src/lib/
├── types/
│   └── geography.ts          # Type definitions for geography data
├── utils/
│   └── geography.ts          # Database-compatible utility functions
├── country-data.ts           # Re-exports types (no static data)
├── language-data.ts          # Re-exports types (no static data)
└── all-countries.ts          # Re-exports utility functions (no static data)
```

## Type Definitions

### Location: `src/lib/types/geography.ts`

This file contains all geography-related type definitions:

- **`Language`** - Interface for language data
- **`Region`** - Interface for region data  
- **`CountryData`** - Interface for country data
- **`RegionCategory`** - Union type for region categories
- **`Country`** - Extended interface for database records

### Usage

```typescript
import { Language, Region, CountryData } from '@/lib/types/geography';

const language: Language = {
  code: 'en',
  name: 'English',
  native: 'English',
  rtl: false
};
```

## Utility Functions

### Location: `src/lib/utils/geography.ts`

Database-compatible utility functions that replace the old static data functions:

- **`getCountryByCode(code, prisma)`** - Find country by ISO code
- **`getCountryByName(name, prisma)`** - Find country by name
- **`getCountriesByRegion(regionCode, prisma)`** - Get countries in a region
- **`getCountriesByLanguage(languageCode, prisma)`** - Get countries by language
- **`getAllCountries(prisma)`** - Get all countries
- **`validateGeographyData(prisma)`** - Validate database data integrity

### Usage

```typescript
import { getCountryByCode } from '@/lib/utils/geography';
import { prisma } from '@/lib/prisma';

const country = await getCountryByCode('US', prisma);
```

## Backend Actions

Geography data is managed through backend actions:

- **Regions**: `src/backend/regions/actions.ts`
- **Languages**: `src/backend/languages/actions.ts`  
- **Countries**: `src/backend/countries/actions.ts`

These actions provide database-only operations with proper error handling.

## Migration from Static Data

### Before (Static Data)
```typescript
// ❌ Old way - static data
import { languages, countries, regions } from '@/lib/country-data';

const englishLanguage = languages.find(l => l.code === 'en');
```

### After (Database Data)
```typescript
// ✅ New way - database data
import { getAllLanguages } from '@/backend/languages/actions';

const languages = await getAllLanguages();
const englishLanguage = languages.find(l => l.code === 'en');
```

## Backward Compatibility

The old import paths still work through re-exports:

```typescript
// These still work for type imports
import { Language } from '@/lib/language-data';
import { Region, CountryData } from '@/lib/country-data';
import { getCountryByCode } from '@/lib/all-countries';
```

However, static data arrays are no longer available:
- `languages` array - removed
- `regions` array - removed  
- `countries` array - removed
- `allCountriesComplete` array - removed

## Data Management

### Adding New Data

Use the admin interface or database operations to add new geography data:

1. **Through Admin Interface**: Navigate to the regions/languages/countries sections
2. **Through Database**: Use Prisma operations directly
3. **Through Backend Actions**: Use the provided action functions

### Data Seeding

The seed file (`prisma/seed.ts`) no longer includes static geography data. To seed geography data:

1. Import from an existing database
2. Use the admin interface to manually add data
3. Create a separate migration script with your specific data

### Example Data Structures

```typescript
// Language
{
  code: 'en',
  name: 'English',
  native: 'English',
  rtl: false
}

// Region  
{
  code: 'NA',
  name: 'North America',
  category: 'continent',
  description: 'North American continent'
}

// Country
{
  name: 'United States',
  code: 'US',
  phone_code: '+1',
  capital: 'Washington, D.C.',
  region: ['NA'],
  continent_code: 'NA',
  languages: ['en'],
  flag_emoji: '🇺🇸',
  latitude: 39.8283,
  longitude: -98.5795
}
```

## Error Handling

All utility functions and backend actions include proper error handling:

- Database connection failures return empty arrays or null
- Invalid parameters are validated and logged
- No static data fallbacks (ensures database consistency)

## Testing

Comprehensive tests are available:

- **Type Tests**: `__tests__/lib/types/geography.test.ts`
- **Utility Tests**: `__tests__/lib/utils/geography.test.ts`
- **Integration Tests**: `__tests__/integration/geography-types.test.ts`

## Performance Considerations

- Database queries are optimized with proper includes and filters
- Consider implementing caching for frequently accessed data
- Use database indexes for common query patterns (code, name lookups)

## Troubleshooting

### Common Issues

1. **Empty Data**: Ensure geography data is seeded in the database
2. **Type Errors**: Use the new import paths from `@/lib/types/geography`
3. **Missing Functions**: Import utility functions from `@/lib/utils/geography`

### Debugging

Use the validation function to check data integrity:

```typescript
import { validateGeographyData } from '@/lib/utils/geography';
import { prisma } from '@/lib/prisma';

const validation = await validateGeographyData(prisma);
console.log('Data validation:', validation);
```

## Future Enhancements

- Implement caching layer for better performance
- Add data synchronization with external sources
- Create automated data validation and cleanup tools
- Add support for additional geography metadata