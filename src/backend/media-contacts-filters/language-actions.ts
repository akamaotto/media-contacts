"use server";

import { languages, Language } from "@/lib/language-data";

/**
 * Server action to fetch all available languages
 * Following Rust-inspired explicit return type and error handling
 * @returns Array of Language objects or fallback data if fetching fails
 */
export async function getAllLanguages(): Promise<Language[]> {
  try {
    console.log('Fetching all languages...');
    
    // Validate language data availability using fail-fast approach
    if (!languages || !Array.isArray(languages) || languages.length === 0) {
      console.warn('Language data is unavailable, using fallback data');
      return generateFallbackLanguages();
    }
    
    console.log(`Successfully fetched ${languages.length} languages`);
    return languages;
  } catch (error) {
    console.error("Error fetching languages:", error);
    // Return fallback data to prevent UI breakage
    return generateFallbackLanguages();
  }
}

/**
 * Generate fallback language data when static data is unavailable
 * @returns Array of common Language objects
 */
function generateFallbackLanguages(): Language[] {
  console.log('Generating fallback languages data');
  
  // Return a small set of common languages as fallback
  return [
    { code: 'en', name: 'English', native: 'English' },
    { code: 'es', name: 'Spanish', native: 'Español' },
    { code: 'fr', name: 'French', native: 'Français' },
    { code: 'de', name: 'German', native: 'Deutsch' },
    { code: 'zh', name: 'Chinese', native: '中文' },
    { code: 'ja', name: 'Japanese', native: '日本語' },
    { code: 'ar', name: 'Arabic', native: 'العربية' },
  ];
}

/**
 * Server action to fetch languages by codes
 * @param codes - Array of language codes to filter by
 * @returns Filtered array of Language objects
 */
export async function getLanguagesByCodes(codes: string[]): Promise<Language[]> {
  try {
    return languages.filter(language => codes.includes(language.code));
  } catch (error) {
    console.error(`Error fetching languages by codes:`, error);
    return [];
  }
}

/**
 * Server action to search languages by name
 * @param searchTerm - Search term to filter languages by name
 * @returns Filtered array of Language objects
 */
export async function searchLanguages(searchTerm: string): Promise<Language[]> {
  try {
    const term = searchTerm.toLowerCase();
    return languages.filter(
      language => 
        language.name.toLowerCase().includes(term) || 
        (language.native && language.native.toLowerCase().includes(term))
    );
  } catch (error) {
    console.error(`Error searching languages:`, error);
    return [];
  }
}
