"use server";

import { prisma } from "@/lib/prisma";
import { languages, Language } from "@/lib/language-data";

/**
 * Server action to fetch all available languages from database
 * Following Rust-inspired explicit return type and error handling
 * @returns Array of Language objects from database, with static fallback
 */
export async function getAllLanguages(): Promise<Language[]> {
  try {
    console.log('Fetching all languages from database...');
    
    // Fetch languages from database with associated countries
    const dbLanguages = await prisma.language.findMany({
      include: {
        countries: {
          select: {
            id: true,
            name: true,
            code: true,
            flag_emoji: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    // If no languages in database, seed from static data
    if (!dbLanguages || dbLanguages.length === 0) {
      console.log('No languages found in database, seeding from static data...');
      await seedLanguagesFromStaticData();
      // Recursively call to get the seeded data
      return getAllLanguages();
    }
    
    // Format database languages to match expected interface
    const formattedLanguages: Language[] = dbLanguages.map(lang => ({
      id: lang.id,
      code: lang.code,
      name: lang.name,
      native: lang.name, // Using name as native for now
      countries: lang.countries
    }));
    
    console.log(`Successfully fetched ${formattedLanguages.length} languages from database`);
    return formattedLanguages;
  } catch (error) {
    console.error("Error fetching languages from database:", error);
    // Return static data as fallback
    console.log('Falling back to static language data');
    return languages || generateFallbackLanguages();
  }
}

/**
 * Seed languages from static data into database
 * @returns Promise that resolves when seeding is complete
 */
async function seedLanguagesFromStaticData(): Promise<void> {
  try {
    console.log('Seeding languages from static data...');
    
    if (!languages || languages.length === 0) {
      console.warn('No static language data available for seeding');
      return;
    }
    
    // Create languages in database from static data
    for (const language of languages) {
      await prisma.language.upsert({
        where: { code: language.code },
        update: {
          name: language.name,
        },
        create: {
          code: language.code,
          name: language.name,
        }
      });
    }
    
    console.log(`Successfully seeded ${languages.length} languages into database`);
  } catch (error) {
    console.error('Error seeding languages from static data:', error);
    throw error;
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
 * Server action to create a new language in database
 * @param languageData - Language data to create
 * @returns Created Language object
 */
export async function createLanguage(languageData: { name: string; code: string }): Promise<Language> {
  try {
    console.log('Creating new language:', languageData);
    
    const newLanguage = await prisma.language.create({
      data: {
        name: languageData.name,
        code: languageData.code,
      },
      include: {
        countries: {
          select: {
            id: true,
            name: true,
            code: true,
            flag_emoji: true
          }
        }
      }
    });
    
    console.log('Successfully created language:', newLanguage.id);
    return {
      id: newLanguage.id,
      code: newLanguage.code,
      name: newLanguage.name,
      native: newLanguage.name,
      countries: newLanguage.countries
    };
  } catch (error) {
    console.error('Error creating language:', error);
    throw error;
  }
}

/**
 * Server action to update an existing language in database
 * @param id - Language ID to update
 * @param languageData - Updated language data
 * @param countryIds - Optional array of country IDs to assign to this language
 * @returns Updated Language object
 */
export async function updateLanguage(id: string, languageData: { name: string; code: string }, countryIds?: string[]): Promise<Language> {
  try {
    console.log('Updating language:', id, languageData, 'with countries:', countryIds);
    
    const updateData: any = {
      name: languageData.name,
      code: languageData.code,
    };
    
    // If country IDs are provided, update the country relationships
    if (countryIds !== undefined) {
      updateData.countries = {
        set: countryIds.map(countryId => ({ id: countryId }))
      };
    }
    
    const updatedLanguage = await prisma.language.update({
      where: { id },
      data: updateData,
      include: {
        countries: {
          select: {
            id: true,
            name: true,
            code: true,
            flag_emoji: true
          }
        }
      }
    });
    
    console.log('Successfully updated language:', updatedLanguage.id);
    return {
      id: updatedLanguage.id,
      code: updatedLanguage.code,
      name: updatedLanguage.name,
      native: updatedLanguage.name,
      countries: updatedLanguage.countries
    };
  } catch (error) {
    console.error('Error updating language:', error);
    throw error;
  }
}

/**
 * Server action to delete a language from database
 * @param id - Language ID to delete
 * @returns Promise that resolves when deletion is complete
 */
export async function deleteLanguage(id: string): Promise<void> {
  try {
    console.log('Deleting language:', id);
    
    await prisma.language.delete({
      where: { id }
    });
    
    console.log('Successfully deleted language:', id);
  } catch (error) {
    console.error('Error deleting language:', error);
    throw error;
  }
}

/**
 * Server action to fetch languages by codes from database
 * @param codes - Array of language codes to filter by
 * @returns Filtered array of Language objects
 */
export async function getLanguagesByCodes(codes: string[]): Promise<Language[]> {
  try {
    console.log('Fetching languages by codes:', codes);
    
    const dbLanguages = await prisma.language.findMany({
      where: {
        code: {
          in: codes
        }
      },
      include: {
        countries: {
          select: {
            id: true,
            name: true,
            code: true,
            flag_emoji: true
          }
        }
      }
    });
    
    return dbLanguages.map(lang => ({
      id: lang.id,
      code: lang.code,
      name: lang.name,
      native: lang.name,
      countries: lang.countries
    }));
  } catch (error) {
    console.error(`Error fetching languages by codes:`, error);
    // Fallback to static data
    return languages.filter(language => codes.includes(language.code));
  }
}

/**
 * Server action to search languages by name from database
 * @param searchTerm - Search term to filter languages by name
 * @returns Filtered array of Language objects
 */
export async function searchLanguages(searchTerm: string): Promise<Language[]> {
  const term = searchTerm.toLowerCase(); // Move outside try-catch for scope access
  
  try {
    console.log('Searching languages by term:', searchTerm);
    
    const dbLanguages = await prisma.language.findMany({
      where: {
        OR: [
          {
            name: {
              contains: term,
              mode: 'insensitive'
            }
          },
          {
            code: {
              contains: term,
              mode: 'insensitive'
            }
          }
        ]
      },
      include: {
        countries: {
          select: {
            id: true,
            name: true,
            code: true,
            flag_emoji: true
          }
        }
      }
    });
    
    return dbLanguages.map(lang => ({
      id: lang.id,
      code: lang.code,
      name: lang.name,
      native: lang.name,
      countries: lang.countries
    }));
  } catch (error) {
    console.error(`Error searching languages:`, error);
    // Fallback to static data
    return languages.filter(
      language => 
        language.name.toLowerCase().includes(term) || 
        (language.native && language.native.toLowerCase().includes(term))
    );
  }
}
