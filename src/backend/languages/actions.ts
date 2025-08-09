"use server";

import { prisma } from "@/lib/prisma";
import { Language } from "@/lib/types/geography";

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
    // Return empty array instead of static fallback
    return [];
  }
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
    // Return empty array instead of static fallback
    return [];
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
    // Return empty array instead of static fallback
    return [];
  }
}
