/**
 * Country utility functions
 * 
 * ⚠️  IMPORTANT: Static country data has been removed as part of the static content cleanup.
 * All country data should now come from the database.
 * 
 * 📍 For type definitions, import from: @/lib/types/geography
 * 🔧 For database operations, use the functions in: @/backend/countries/actions
 * 🛠️  For utility functions, use: @/lib/utils/geography
 * 
 * Migration guide:
 * - Old: import { allCountriesComplete } from '@/lib/all-countries'
 * - New: import { getAllCountries } from '@/lib/utils/geography'
 */

// Re-export types from the new types location
export type { CountryData } from '@/lib/types/geography';

// Re-export utility functions from the new utils location
export {
  getCountryByCode,
  getCountryByName,
  getCountriesByRegion,
  getCountriesByLanguage,
  getAllCountries,
  validateGeographyData
} from '@/lib/utils/geography';

// ❌ REMOVED: The following static arrays and functions have been removed:
// - allCountriesComplete: Use getAllCountries() from @/lib/utils/geography
// - Static utility functions: Now available as database-compatible functions in @/lib/utils/geography
// - countriesByContinent: Calculate from database data using region relationships

// ✅ USE: For database operations, use:
// - getCountries() from @/backend/countries/actions
// - getAllCountries(prisma) from @/lib/utils/geography