/**
 * Language type definitions
 * 
 * ⚠️  IMPORTANT: Static language data has been removed as part of the static content cleanup.
 * All language data should now come from the database.
 * 
 * 📍 For type definitions, import from: @/lib/types/geography
 * 🔧 For database operations, use the functions in: @/backend/languages/actions
 * 
 * Migration guide:
 * - Old: import { languages } from '@/lib/language-data'
 * - New: import { getAllLanguages } from '@/backend/languages/actions'
 */

// Re-export the Language interface from the new types location
export type { Language } from '@/lib/types/geography';

// ❌ REMOVED: The static languages array has been removed.
// ✅ USE: getAllLanguages() from @/backend/languages/actions to get language data from the database.