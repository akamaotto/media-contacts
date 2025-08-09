/**
 * Geography type definitions
 * 
 * ⚠️  IMPORTANT: Static geography data (regions, countries) has been removed as part of the static content cleanup.
 * All geography data should now come from the database.
 * 
 * 📍 For type definitions, import from: @/lib/types/geography
 * 🔧 For database operations, use the functions in:
 * - @/backend/regions/actions
 * - @/backend/countries/actions
 * - @/backend/languages/actions
 * 
 * Migration guide:
 * - Old: import { regions, countries } from '@/lib/country-data'
 * - New: import { getAllRegions } from '@/backend/regions/actions'
 * - New: import { getCountries } from '@/backend/countries/actions'
 */

// Re-export types from the new types location
export type { 
  Region, 
  RegionCategory, 
  CountryData, 
  Language 
} from '@/lib/types/geography';

// ❌ REMOVED: The following static arrays have been removed:
// - regions: Use getAllRegions() from @/backend/regions/actions
// - countries: Use getCountries() from @/backend/countries/actions  
// - languages: Use getAllLanguages() from @/backend/languages/actions

// ✅ USE: For utility functions that work with database data, see:
// @/lib/utils/geography