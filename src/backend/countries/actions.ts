"use server";

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from "@/lib/prisma";

export interface Country {
  id: string;
  name: string;
  code?: string | null;
  phone_code?: string | null;
  capital?: string | null;
  flag_emoji?: string | null;
  regions?: {
    id: string;
    name: string;
    code: string;
    category: string;
  }[];
  languages?: {
    id: string;
    name: string;
    code: string;
  }[];
  _count?: {
    mediaContacts: number;
  };
}

/**
 * Server action to fetch all regions from database for country forms
 * @returns Array of regions with id, name, code, category
 */
export async function getRegionsForCountryForm(): Promise<Array<{id: string, name: string, code: string, category: string}>> {
  try {
    const regions = await prisma.region.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        category: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
    
    return regions;
  } catch (error) {
    console.error("Failed to fetch regions for country form:", error);
    return [];
  }
}

/**
 * Server action to fetch all languages from database for country forms
 * @returns Array of languages with id, name, code
 */
export async function getLanguagesForCountryForm(): Promise<Array<{id: string, name: string, code: string}>> {
  try {
    const languages = await prisma.language.findMany({
      select: {
        id: true,
        name: true,
        code: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
    
    return languages;
  } catch (error) {
    console.error("Failed to fetch languages for country form:", error);
    return [];
  }
}

/**
 * Server action to fetch all countries from the database
 * Following Rust-inspired explicit return type and error handling
 * @returns Array of Country objects, or fallback data if the database query fails
 */
export async function getCountries(): Promise<Country[]> {
  try {
    console.log('Fetching countries from database...');
    
    // Validate Prisma client availability using fail-fast approach
    if (!prisma) {
      throw new Error('Prisma client is not available');
    }
    
    const countries = await prisma.country.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        phone_code: true,
        capital: true,
        flag_emoji: true,
        regions: {
          select: {
            id: true,
            name: true,
            code: true,
            category: true,
          },
        },
        languages: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        _count: {
          select: {
            mediaContacts: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
    
    console.log(`Successfully fetched ${countries.length} countries from database`);
    
    // Validate the returned data
    if (!countries || !Array.isArray(countries)) {
      console.warn('Country data is not in expected format, using fallback data');
      return generateFallbackCountries();
    }
    
    return countries;
  } catch (error) {
    console.error("Failed to fetch countries:", error);
    // Return fallback data to prevent UI breakage
    return generateFallbackCountries(); 
  }
}

/**
 * Generate fallback country data when database query fails
 * @returns Array of sample Country objects
 */
function generateFallbackCountries(): Country[] {
  console.log('Generating fallback countries data');
  
  // Return a small set of common countries as fallback
  return [
    { 
      id: 'us', name: 'United States', code: 'US', phone_code: '+1', capital: 'Washington, D.C.', flag_emoji: '🇺🇸', 
      regions: [{ id: 'na', name: 'North America', code: 'NA', category: 'continent' }],
      languages: [{ id: 'en', name: 'English', code: 'en' }],
      _count: { mediaContacts: 0 } 
    },
    { 
      id: 'ca', name: 'Canada', code: 'CA', phone_code: '+1', capital: 'Ottawa', flag_emoji: '🇨🇦', 
      regions: [{ id: 'na', name: 'North America', code: 'NA', category: 'continent' }],
      languages: [{ id: 'en', name: 'English', code: 'en' }, { id: 'fr', name: 'French', code: 'fr' }],
      _count: { mediaContacts: 0 } 
    },
    { 
      id: 'uk', name: 'United Kingdom', code: 'GB', phone_code: '+44', capital: 'London', flag_emoji: '🇬🇧', 
      regions: [{ id: 'eu', name: 'Europe', code: 'EU', category: 'continent' }],
      languages: [{ id: 'en', name: 'English', code: 'en' }],
      _count: { mediaContacts: 0 } 
    },
    { 
      id: 'de', name: 'Germany', code: 'DE', phone_code: '+49', capital: 'Berlin', flag_emoji: '🇩🇪', 
      regions: [{ id: 'eu', name: 'Europe', code: 'EU', category: 'continent' }],
      languages: [{ id: 'de', name: 'German', code: 'de' }],
      _count: { mediaContacts: 0 } 
    },
    { 
      id: 'fr', name: 'France', code: 'FR', phone_code: '+33', capital: 'Paris', flag_emoji: '🇫🇷', 
      regions: [{ id: 'eu', name: 'Europe', code: 'EU', category: 'continent' }],
      languages: [{ id: 'fr', name: 'French', code: 'fr' }],
      _count: { mediaContacts: 0 } 
    },
    { 
      id: 'jp', name: 'Japan', code: 'JP', phone_code: '+81', capital: 'Tokyo', flag_emoji: '🇯🇵', 
      regions: [{ id: 'as', name: 'Asia', code: 'AS', category: 'continent' }],
      languages: [{ id: 'ja', name: 'Japanese', code: 'ja' }],
      _count: { mediaContacts: 0 } 
    },
    { 
      id: 'au', name: 'Australia', code: 'AU', phone_code: '+61', capital: 'Canberra', flag_emoji: '🇦🇺', 
      regions: [{ id: 'oc', name: 'Oceania', code: 'OC', category: 'continent' }],
      languages: [{ id: 'en', name: 'English', code: 'en' }],
      _count: { mediaContacts: 0 } 
    },
  ];
}

// Zod schemas for Countries CRUD operations
const CreateCountrySchema = z.object({
  name: z.string().min(1, { message: "Country name is required." }),
  code: z.string().length(2, { message: "Country code must be exactly 2 characters." }).toUpperCase(),
  phone_code: z.string().min(1, { message: "Phone code is required." }),
  capital: z.string().min(1, { message: "Capital is required." }),
  flag_emoji: z.string().min(1, { message: "Flag emoji is required." }),
  regionIds: z.array(z.string().uuid()).optional().default([]),
  languageIds: z.array(z.string().uuid()).optional().default([]),
});

const UpdateCountrySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, { message: "Country name is required." }),
  code: z.string().length(2, { message: "Country code must be exactly 2 characters." }).toUpperCase(),
  phone_code: z.string().min(1, { message: "Phone code is required." }),
  capital: z.string().min(1, { message: "Capital is required." }),
  flag_emoji: z.string().min(1, { message: "Flag emoji is required." }),
  regionIds: z.array(z.string().uuid()).optional().default([]),
  languageIds: z.array(z.string().uuid()).optional().default([]),
});

const DeleteCountrySchema = z.object({
  id: z.string().uuid({ message: "Valid country ID is required" })
});

export type CreateCountryData = z.infer<typeof CreateCountrySchema>;
export type UpdateCountryData = z.infer<typeof UpdateCountrySchema>;

export type CountryActionResult = {
  success: boolean;
  message?: string;
  error?: string;
  data?: Country;
};

/**
 * Server action to create a new country
 * @param data - Country data with regions and languages
 * @returns Result object with success status and message/error
 */
export async function createCountry(
  data: CreateCountryData
): Promise<CountryActionResult> {
  try {
    // Validate input data
    const validationResult = CreateCountrySchema.safeParse(data);
    
    if (!validationResult.success) {
      return {
        success: false,
        error: "Invalid data provided: " + validationResult.error.issues.map(i => i.message).join(", ")
      };
    }

    const { name, code, phone_code, capital, flag_emoji, regionIds, languageIds } = validationResult.data;

    // Check if country with same code or name already exists
    const existingCountry = await prisma.country.findFirst({
      where: {
        OR: [
          { code: code },
          { name: name }
        ]
      }
    });

    if (existingCountry) {
      return {
        success: false,
        error: existingCountry.code === code 
          ? `Country with code "${code}" already exists`
          : `Country with name "${name}" already exists`
      };
    }

    // Verify that all region and language IDs exist
    if (regionIds.length > 0) {
      const existingRegions = await prisma.region.findMany({
        where: { id: { in: regionIds } },
        select: { id: true }
      });
      
      if (existingRegions.length !== regionIds.length) {
        return {
          success: false,
          error: "One or more selected regions do not exist"
        };
      }
    }

    if (languageIds.length > 0) {
      const existingLanguages = await prisma.language.findMany({
        where: { id: { in: languageIds } },
        select: { id: true }
      });
      
      if (existingLanguages.length !== languageIds.length) {
        return {
          success: false,
          error: "One or more selected languages do not exist"
        };
      }
    }

    // Create the country with relationships
    const newCountry = await prisma.country.create({
      data: {
        name,
        code,
        phone_code,
        capital,
        flag_emoji,
        regions: {
          connect: regionIds.map(id => ({ id }))
        },
        languages: {
          connect: languageIds.map(id => ({ id }))
        }
      },
      include: {
        regions: {
          select: {
            id: true,
            name: true,
            code: true,
            category: true,
          }
        },
        languages: {
          select: {
            id: true,
            name: true,
            code: true,
          }
        },
        _count: {
          select: {
            mediaContacts: true,
          }
        }
      }
    });

    revalidatePath('/countries');
    
    return {
      success: true,
      message: "Country created successfully",
      data: newCountry
    };
  } catch (error) {
    console.error("Failed to create country:", error);
    return {
      success: false,
      error: "Database error: Failed to create country"
    };
  }
}

/**
 * Server action to update an existing country
 * @param data - Updated country data with regions and languages
 * @returns Result object with success status and message/error
 */
export async function updateCountry(
  data: UpdateCountryData
): Promise<CountryActionResult> {
  try {
    // Validate input data
    const validationResult = UpdateCountrySchema.safeParse(data);
    
    if (!validationResult.success) {
      return {
        success: false,
        error: "Invalid data provided: " + validationResult.error.issues.map(i => i.message).join(", ")
      };
    }

    const { id, name, code, phone_code, capital, flag_emoji, regionIds, languageIds } = validationResult.data;

    // Check if country exists
    const existingCountry = await prisma.country.findUnique({
      where: { id }
    });

    if (!existingCountry) {
      return {
        success: false,
        error: "Country not found"
      };
    }

    // Check if another country with same code or name already exists (excluding current country)
    const duplicateCountry = await prisma.country.findFirst({
      where: {
        AND: [
          { id: { not: id } },
          {
            OR: [
              { code: code },
              { name: name }
            ]
          }
        ]
      }
    });

    if (duplicateCountry) {
      return {
        success: false,
        error: duplicateCountry.code === code 
          ? `Another country with code "${code}" already exists`
          : `Another country with name "${name}" already exists`
      };
    }

    // Verify that all region and language IDs exist
    if (regionIds.length > 0) {
      const existingRegions = await prisma.region.findMany({
        where: { id: { in: regionIds } },
        select: { id: true }
      });
      
      if (existingRegions.length !== regionIds.length) {
        return {
          success: false,
          error: "One or more selected regions do not exist"
        };
      }
    }

    if (languageIds.length > 0) {
      const existingLanguages = await prisma.language.findMany({
        where: { id: { in: languageIds } },
        select: { id: true }
      });
      
      if (existingLanguages.length !== languageIds.length) {
        return {
          success: false,
          error: "One or more selected languages do not exist"
        };
      }
    }

    // Update the country with relationships
    const updatedCountry = await prisma.country.update({
      where: { id },
      data: {
        name,
        code,
        phone_code,
        capital,
        flag_emoji,
        regions: {
          set: regionIds.map(id => ({ id }))
        },
        languages: {
          set: languageIds.map(id => ({ id }))
        }
      },
      include: {
        regions: {
          select: {
            id: true,
            name: true,
            code: true,
            category: true,
          }
        },
        languages: {
          select: {
            id: true,
            name: true,
            code: true,
          }
        },
        _count: {
          select: {
            mediaContacts: true,
          }
        }
      }
    });

    revalidatePath('/countries');
    
    return {
      success: true,
      message: "Country updated successfully",
      data: updatedCountry
    };
  } catch (error) {
    console.error("Failed to update country:", error);
    
    if (error instanceof Error && 'code' in error && (error as any).code === 'P2025') {
      return {
        success: false,
        error: "Country not found"
      };
    }
    
    return {
      success: false,
      error: "Database error: Failed to update country"
    };
  }
}

/**
 * Server action to delete a country
 * @param countryId - The ID of the country to delete
 * @returns Result object with success status and message/error
 */
export async function deleteCountry(
  countryId: string
): Promise<CountryActionResult> {
  try {
    // Validate input
    if (!countryId) {
      return {
        success: false,
        error: "Country ID is missing"
      };
    }

    const validationResult = DeleteCountrySchema.safeParse({ id: countryId });
    
    if (!validationResult.success) {
      return {
        success: false,
        error: "Invalid country ID format"
      };
    }

    // Check if country has associated media contacts
    const countryWithContacts = await prisma.country.findUnique({
      where: { id: countryId },
      include: {
        _count: {
          select: {
            mediaContacts: true
          }
        }
      }
    });

    if (!countryWithContacts) {
      return {
        success: false,
        error: "Country not found"
      };
    }

    if (countryWithContacts._count.mediaContacts > 0) {
      return {
        success: false,
        error: `Cannot delete country "${countryWithContacts.name}" because it has ${countryWithContacts._count.mediaContacts} associated media contact(s). Please reassign or delete the media contacts first.`
      };
    }

    // Delete the country
    await prisma.country.delete({
      where: { id: countryId }
    });

    revalidatePath('/countries');
    
    return {
      success: true,
      message: "Country deleted successfully"
    };
  } catch (error) {
    console.error("Failed to delete country:", error);
    
    if (error instanceof Error && 'code' in error) {
      const prismaError = error as { code: string };
      
      if (prismaError.code === 'P2025') {
        return {
          success: false,
          error: "Country not found"
        };
      }
    }
    
    return {
      success: false,
      error: "Database error: Failed to delete country"
    };
  }
}
