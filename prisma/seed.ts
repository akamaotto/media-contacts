import { PrismaClient } from '@prisma/client';
import { regions as regionSourceData, languages as languageSourceData, countries as countrySourceData } from '../src/lib/country-data';
import { mockOutlets, mockBeats, mockMediaContacts } from '../src/lib/mock-data';
import { validateRegionCountryIntegrity, normalizeRegionCode } from './region-validation';

// Extend PrismaClient to include the custom types
declare global {
  // eslint-disable-next-line no-var
  var prisma: import('@prisma/client').PrismaClient | undefined;
}

const prisma = global.prisma || new (require('@prisma/client').PrismaClient)();

// Store the Prisma Client in the global object in development to prevent
// creating multiple instances of Prisma Client in development
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

async function main() {
  console.log('Start seeding...');

  // Clear existing data in the correct order to respect foreign key constraints
  console.log('\nClearing existing data...');
  
  // Clear all data in the correct order to respect foreign key constraints
  // Note: Order is important. Start with models that are depended upon by others.
  // Or, if using relations with onDelete, Prisma can handle cascading deletes.
  // For explicit control, deleting in reverse order of dependency is safest.
  await prisma.mediaContact.deleteMany({});
  // Join tables for implicit M2M are handled by Prisma when related records are deleted.
  // Explicitly deleting from _CountryToRegion or _CountryToBeat might be needed if direct SQL was used or if issues persist.
  await prisma.country.deleteMany({}); // This should disconnect relations to Region and Language
  await prisma.region.deleteMany({});
  await prisma.language.deleteMany({});
  await prisma.outlet.deleteMany({});
  await prisma.beat.deleteMany({});
  
  // Reset sequences if needed (for auto-increment IDs)
  // Ensure these sequence names match your database. For PostgreSQL, they are typically TableName_id_seq.
  // If using CUIDs or UUIDs, these are not needed.
  await prisma.$executeRaw`ALTER SEQUENCE IF EXISTS "MediaContact_id_seq" RESTART WITH 1;`;
  await prisma.$executeRaw`ALTER SEQUENCE IF EXISTS "Country_id_seq" RESTART WITH 1;`;
  await prisma.$executeRaw`ALTER SEQUENCE IF EXISTS "Region_id_seq" RESTART WITH 1;`;
  await prisma.$executeRaw`ALTER SEQUENCE IF EXISTS "Language_id_seq" RESTART WITH 1;`;
  await prisma.$executeRaw`ALTER SEQUENCE IF EXISTS "Outlet_id_seq" RESTART WITH 1;`;
  await prisma.$executeRaw`ALTER SEQUENCE IF EXISTS "Beat_id_seq" RESTART WITH 1;`;
  
  console.log('Database cleared successfully');

  const regionMap = await seedRegions(prisma);
  console.log(`[DEBUG] In main() after seedRegions: regionMap.size = ${regionMap.size}`);
  
  // Seed languages
  const languageMap = await seedLanguages(prisma);
  console.log(`[DEBUG] In main() after seedLanguages: languageMap.size = ${languageMap.size}`);
  
  // Create defensive copies of the maps to prevent reference issues
  const regionMapCopy = new Map(regionMap);
  const languageMapCopy = new Map(languageMap);
  console.log(`[DEBUG] In main() after creating copies: regionMapCopy.size = ${regionMapCopy.size}, languageMapCopy.size = ${languageMapCopy.size}`); 
  const countryMap = await seedCountriesAndRelatedData(prisma, regionMapCopy, languageMapCopy);
  await seedRemainingData(prisma, countryMap, regionMap, languageMapCopy);
  
  // Validate region-country integrity after seeding is complete
  const validationResults = await validateRegionCountryIntegrity(prisma, countrySourceData, regionSourceData);
  console.log(`[VALIDATION RESULTS] Integrity passed: ${validationResults.integrityPassed}`);
  
  // Log any potential improvement suggestions
  if (!validationResults.integrityPassed) {
    console.log('\n[SUGGESTIONS FOR IMPROVEMENT]');
    console.log('Consider adding the following missing region codes to the region data:');
    validationResults.missingRegionCodes.forEach(code => {
      console.log(`{ code: '${code}', name: '${code} Region', category: 'subregion', parentCode: '[DETERMINE APPROPRIATE PARENT]' },`);
    });
  }
}

async function seedRegions(prisma: PrismaClient): Promise<Map<string, string>> {
  console.log(`[DEBUG] Starting seedRegions. regionSourceData length: ${regionSourceData.length}`);  
  const regionMap = new Map<string, string>(); // code -> id
  const createdRegions: string[] = [];
  const failedRegions: {code: string, error: string}[] = [];
  
  // First pass: Create all basic regions
  for (const regionData of regionSourceData) {
    try {
      // Normalize code for consistency
      const normalizedCode = normalizeRegionCode(regionData.code);
      
      // Type cast to avoid PrismaClient property error, maintaining type safety where possible
      const region = await (prisma as any).region.upsert({
        where: { code: normalizedCode },
        update: {
          name: regionData.name,
          category: regionData.category,
          // Handle description explicitly to avoid null assignment errors
          ...(regionData.description ? { description: regionData.description } : {}),
          // Defer parent association to second pass to ensure parent exists
        },
        create: {
          code: normalizedCode,
          name: regionData.name,
          category: regionData.category,
          // Handle description explicitly to avoid null assignment errors
          ...(regionData.description ? { description: regionData.description } : {}),
          // Defer parent association to second pass to ensure parent exists
        },
      });
      
      // Store ID for use in relationships - ensure normalized code is a string
      if (normalizedCode) {
        regionMap.set(normalizedCode, region.id);
        createdRegions.push(normalizedCode);
      } else {
        console.warn(`[WARNING] Skipping region with null normalized code: ${regionData.code}`);
      }
      console.log(`Upserted region: ${region.name} (Code: ${region.code})`);
    } catch (error) {
      console.error(`[ERROR] Failed to create region ${regionData.code}: ${error instanceof Error ? error.message : String(error)}`);
      failedRegions.push({code: regionData.code, error: error instanceof Error ? error.message : String(error)});
    }
  }
  
  // Second pass: Update parent-child relationships now that all regions exist
  for (const regionData of regionSourceData) {
    if (regionData.parentCode) {
      try {
        // Ensure non-nullable strings with explicit validation
        const normalizedCode = normalizeRegionCode(regionData.code) || '';
        const normalizedParentCode = regionData.parentCode ? normalizeRegionCode(regionData.parentCode) || '' : '';
        
        // Check if parent exists in our map
        if (!regionMap.has(normalizedParentCode)) {
          console.warn(`[WARNING] Parent region ${normalizedParentCode} for ${normalizedCode} not found in map, skipping parent association`);
          continue;
        }
        
        // Update the region to set its parent
        await (prisma as any).region.update({
          where: { code: normalizedCode },
          data: {
            parentCode: normalizedParentCode
          }
        });
      } catch (error) {
        console.error(`[ERROR] Failed to update parent relationship for region ${regionData.code}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  
  console.log(`[INFO] Successfully created ${createdRegions.length} regions, failed to create ${failedRegions.length} regions`);
  if (failedRegions.length > 0) {
    console.log(`[INFO] Failed regions: ${failedRegions.map(r => r.code).join(', ')}`);
  }
  
  // Double check that all region codes are in the map with null safety
  const missingRegions = regionSourceData.filter(r => {
    const code = normalizeRegionCode(r.code);
    return code ? !regionMap.has(code) : true;
  });
  if (missingRegions.length > 0) {
    console.warn(`[WARNING] ${missingRegions.length} regions are missing from map after seeding: ${missingRegions.map(r => r.code).join(', ')}`);
  }

  console.log('\nFinished seeding regions. Debugging regionMap:');
  console.log(`Region source data length: ${regionSourceData.length}`);
  console.log(`Region map size: ${regionMap.size}`);
  
  // Log a sample of keys from regionMap to check for unexpected characters
  const regionMapSampleKeys = Array.from(regionMap.keys()).slice(0, 10);
  console.log(`Region map sample keys: [${regionMapSampleKeys.join(', ')}]`);
  
  // Check for important regions to ensure they're in the map
  const criticalRegions = ['EU', 'EUNION', 'OECD', 'COMM', 'AUSNZ', 'NA', 'NAM', 'AF', 'AU', 'AND'];
  for (const code of criticalRegions) {
    console.log(`Region '${code}' in map: ${regionMap.has(code)}`);
  }
  
  console.log(`[DEBUG] Exiting seedRegions with map size: ${regionMap.size}`);
  
  // Return a new copy of the map to prevent any reference issues
  return new Map(regionMap);
}

async function seedLanguages(prisma: PrismaClient): Promise<Map<string, string>> {
  console.log('\nSeeding languages...');
  const languageMap = new Map<string, string>();
  
  console.log(`[DEBUG] Starting seedLanguages with ${languageSourceData.length} languages from source data`);
  
  for (const languageData of languageSourceData) {
    try {
      console.log(`[DEBUG] Processing language: ${languageData.name} (${languageData.code})`);
      
      const language = await prisma.language.upsert({
        where: { code: languageData.code },
        update: {
          name: languageData.name,
        },
        create: {
          code: languageData.code,
          name: languageData.name,
        },
      });
      
      languageMap.set(languageData.code, language.id);
      console.log(`Upserted language: ${language.name} (${language.code}) -> ID: ${language.id}`);
    } catch (error: any) {
      console.error(`Error upserting language ${languageData.name} (${languageData.code}):`, error);
      // Continue with other languages even if one fails
    }
  }
  
  console.log(`[DEBUG] Completed seedLanguages. Created/updated ${languageMap.size} languages`);
  console.log(`[DEBUG] Language map contents:`, Array.from(languageMap.entries()).slice(0, 5)); // Show first 5 for debugging
  
  return new Map(languageMap);
}

async function seedCountriesAndRelatedData(
  prisma: PrismaClient, 
  regionMap: Map<string, string>,
  languageMap: Map<string, string> // Now populated with language code -> ID mappings
): Promise<Map<string, string>> {
  // Create another defensive copy at the start of this function
  const localRegionMap = new Map(regionMap);
  console.log(`[DEBUG] At start of seedCountriesAndRelatedData: regionMap size passed in = ${regionMap.size}, local copy size = ${localRegionMap.size}`);
  // Seed Countries
  console.log('\nSeeding countries...');
  console.log(`[DEBUG] State of original regionMap JUST BEFORE country loop: Size = ${regionMap.size}. Sample keys: ${Array.from(regionMap.keys()).slice(0, 10).join(', ')}`);
  console.log(`[DEBUG] State of local regionMap copy JUST BEFORE country loop: Size = ${localRegionMap.size}. Sample keys: ${Array.from(localRegionMap.keys()).slice(0, 10).join(', ')}`);
  
  if (regionMap.size === 0 && localRegionMap.size === 0) {
    console.error("[CRITICAL WARNING] Original regionMap is EMPTY before starting country loop. Region connections will likely fail.");
  }

  const countryMap = new Map<string, string>(); // code -> id
  const loggedMissingGlobal = new Set<string>(); // For codes not found in regionMap, logged once

  for (const countryData of countrySourceData) {
    try {
      // Connect countries to their languages using the populated languageMap
      const languageConnections = (countryData.languages || [])
        .map(langCode => languageMap?.get(langCode?.trim())) // Add optional chaining for safety
        .filter((id): id is string => !!id) 
        .map(id => ({ id }));

      const collectedRegionCodes = new Set<string>();
      if (countryData.continent_code) {
        collectedRegionCodes.add(countryData.continent_code.trim());
      }
      if (Array.isArray(countryData.subregion)) {
        countryData.subregion.forEach(sr => sr && collectedRegionCodes.add(sr.trim()));
      }
      if (Array.isArray(countryData.region)) {
        countryData.region.forEach(r => r && collectedRegionCodes.add(r.trim()));
      }
      const allRegionCodesForCountry = Array.from(collectedRegionCodes).filter(Boolean);

      // Use original regionMap for region connections
      const regionIdsForConnection: string[] = [];
      const missingCodesForThisCountry: string[] = [];

      for (const originalCode of allRegionCodesForCountry) {
        // Use the standardized normalization function
        const normalizedCode = normalizeRegionCode(originalCode);
        if (!normalizedCode) continue; // Skip if normalization fails
        
        // First try with the local copy of the region map
        if (localRegionMap.has(normalizedCode)) {
          regionIdsForConnection.push(localRegionMap.get(normalizedCode)!);
        } 
        // Fall back to the original map if not found in local copy
        else if (regionMap.has(normalizedCode)) {
          regionIdsForConnection.push(regionMap.get(normalizedCode)!);
        } else {
          // Final fallback: Try to find the region directly in the database
          try {
            console.log(`[FALLBACK] Region code '${normalizedCode}' not found in maps. Trying direct DB lookup for country ${countryData.code}...`);
            // Use type assertion to bypass TypeScript's static type checking
            // This acknowledges the type system limitation while maintaining runtime safety
            const regionFromDB = await (prisma as any).region.findFirst({
              where: {
                code: {
                  mode: 'insensitive',
                  equals: normalizedCode
                }
              }
            });
            
            if (regionFromDB) {
              console.log(`[FALLBACK SUCCESS] Found region ${regionFromDB.name} (${regionFromDB.code}) in database directly!`);
              regionIdsForConnection.push(regionFromDB.id);
              // Update maps for future lookups
              regionMap.set(normalizedCode, regionFromDB.id);
              localRegionMap.set(normalizedCode, regionFromDB.id);
            } else {
              // Still not found after all attempts
              missingCodesForThisCountry.push(normalizedCode);
              if (!loggedMissingGlobal.has(normalizedCode)) {
                // Log only once globally for a missing code to reduce noise
                console.warn(`Region code '${normalizedCode}' (needed by country ${countryData.code}) not found in maps or database. Current regionMap size: ${regionMap.size}.`);
                loggedMissingGlobal.add(normalizedCode);
              }
            }
          } catch (err) {
            console.error(`Error during fallback DB lookup for region code ${normalizedCode}:`, err);
            missingCodesForThisCountry.push(normalizedCode);
            if (!loggedMissingGlobal.has(normalizedCode)) {
              console.warn(`Region code '${normalizedCode}' (needed by country ${countryData.code}) not found in maps. DB lookup failed. Current regionMap size: ${regionMap.size}.`);
              loggedMissingGlobal.add(normalizedCode);
            }
          }
          
          if (countryData.code === 'FR') {
            console.log(`[FR regionMap Debug] Region code '${normalizedCode}' NOT FOUND in original regionMap for France. regionMap size: ${regionMap.size}. Sample keys: ${Array.from(regionMap.keys()).slice(0,10).join(',')}`);
          }
        }
      }
      const regionConnections = regionIdsForConnection.map(id => ({ id }));

      // Logging for missing regions based on original regionMap lookups
      const foundRegionCount = regionConnections.length;
      const attemptedRegionCount = allRegionCodesForCountry.length;

      if (attemptedRegionCount > 0 && foundRegionCount < attemptedRegionCount) {
        console.warn(`Country ${countryData.name} (Code: ${countryData.code}): Attempted ${attemptedRegionCount} regions, connected ${foundRegionCount}. Missing codes for this country: [${missingCodesForThisCountry.join(', ')}] (based on original regionMap).`);
      } else if (attemptedRegionCount > 0 && foundRegionCount === 0) {
        console.warn(`Country ${countryData.name} (Code: ${countryData.code}): Connected 0 of ${attemptedRegionCount} attempted regions. Codes: [${allRegionCodesForCountry.join(', ')}] (based on original regionMap).`);
      }

      // Common data for both create and update
      const commonCountryData = {
        name: countryData.name,
        phone_code: countryData.phone_code,
        capital: countryData.capital,
        latitude: countryData.latitude,
        longitude: countryData.longitude,
        flag_emoji: countryData.flag_emoji,
      };

      // Create type-safe country data with explicit null handling
      const countryCreateData: any = {
        ...commonCountryData,
        // Ensure code is properly handled
        ...(countryData.code ? { code: countryData.code } : {}),
        // Conditionally connect regions only if there are any to connect
        ...(regionConnections.length > 0 && { regions: { connect: regionConnections } }),
        // Conditionally connect languages only if there are any to connect
        ...(languageConnections.length > 0 && { languages: { connect: languageConnections } }),
      };

      const countryUpdateData: any = {
        ...commonCountryData,
        // Set regions, ensuring to disconnect all if none are provided
        regions: { set: regionConnections.length > 0 ? regionConnections : [] },
        // Set languages, ensuring to disconnect all if none are provided
        languages: { set: languageConnections.length > 0 ? languageConnections : [] },
      };
      
      // Use a type-safe approach for country upsert where clause
      const countryWhereCondition: any = {};
      if (countryData.code) {
        countryWhereCondition.code = countryData.code;
      } else {
        countryWhereCondition.name = countryData.name;
      }
      
      const createdOrUpdatedCountry = await prisma.country.upsert({
        where: countryWhereCondition,
        create: countryCreateData,
        update: countryUpdateData,
      });

      // Handle potential null/undefined country code with explicit type checking
      if (createdOrUpdatedCountry.code) {
        countryMap.set(createdOrUpdatedCountry.code, createdOrUpdatedCountry.id);
      } else {
        console.warn(`Country ${createdOrUpdatedCountry.name} has no code, cannot add to countryMap`);
      }

      // Enhanced Logging based on region connection outcomes
      if (allRegionCodesForCountry.length > 0) {
        // Apply proper type-safe normalization and filtering
        const foundAndConnectedRegionCodes = allRegionCodesForCountry
          .map(code => normalizeRegionCode(code))
          .filter((code): code is string => code !== undefined)
          .filter(code => regionMap.has(code)); 
        
        const missingFromRegionMapCodes = allRegionCodesForCountry
          .map(code => normalizeRegionCode(code))
          .filter((code): code is string => code !== undefined)
          .filter(code => !regionMap.has(code))

        if (regionConnections.length === 0) { // None of the country's regions were found in regionMap
          console.warn(
            `Country ${countryData.name} (Code: ${countryData.code}): Upserted WITHOUT any of its specified regions. Attempted region codes: [${allRegionCodesForCountry.join(', ')}] (None found in regionMap).`
          );
        } else if (missingFromRegionMapCodes.length > 0) { // Some regions were found and connected, some were not in regionMap
          console.warn(
            `Country ${countryData.name} (Code: ${countryData.code}): Upserted with PARTIAL regions. Attempted: [${allRegionCodesForCountry.join(', ')}]. Successfully found in map & connected: [${foundAndConnectedRegionCodes.join(', ')}]. Missing from map: [${missingFromRegionMapCodes.join(', ')}]`
          );
        } else { // All specified regions were found and connected
          console.log(
            `Country ${countryData.name} (Code: ${countryData.code}): Upserted successfully with all specified regions [${allRegionCodesForCountry.join(', ')}] and languages.`
          );
        }
      } else { // Country had no regions specified in its source data
        console.log(
          `Country ${countryData.name} (Code: ${countryData.code}): Upserted successfully (no regions specified in source data).`
        );
      }

    } catch (e: any) {
      console.error(`Error creating country ${countryData.name} (Code: ${countryData.code}):`, e);
      // console.error('Problematic country data:', JSON.stringify(countryData, null, 2));
    }
  }

  return countryMap;
}

async function seedRemainingData(
  prisma: PrismaClient,
  countryMap: Map<string, string>,
  regionMap: Map<string, string>,
  languageMap: Map<string, string>
) {
  // Seed Outlets
  console.log('\nSeeding outlets...');
  for (const outletData of mockOutlets) {
    try {
      // Assuming mockOutlets provides complete data including any relations if needed
      const outlet = await prisma.outlet.upsert({
        where: { id: outletData.id }, // Use ID for upserting, assuming mockOutlets have stable IDs
        update: { name: outletData.name, website: outletData.website, description: outletData.description }, // Specify fields to update
        create: outletData, // Full data for creation
      });
      console.log(`Upserted outlet: ${outlet.name}`);
    } catch (e: any) {
      console.error(`Error upserting outlet ${outletData.name}:`, e);
    }
  }

  // Seed Beats
  console.log('\nSeeding beats...');
  for (const beatData of mockBeats) {
    try {
      const beat = await prisma.beat.upsert({
        where: { id: beatData.id }, // Assuming mockBeats have stable IDs
        update: { name: beatData.name },
        create: beatData,
      });
      console.log(`Upserted beat: ${beat.name} (ID: ${beat.id})`);
    } catch (e: any) {
      // Prisma error P2002 is unique constraint failed.
      if (e.code === 'P2002' && beatData.id) {
        console.warn(`Beat with ID ${beatData.id} might have a name conflict or already exists with a different ID but same unique fields.`);
      } else {
        console.error(`Error upserting beat ${beatData.name}:`, e);
      }
    }
  }

  // Seed Media Contacts
  console.log('\nSeeding media contacts...');
  for (const contactData of mockMediaContacts) {
    try {
      // contactData from mockMediaContacts is already structured with Prisma connect objects.
      const countryDBConnections = (contactData.countryCodesForMock || [])
        .map((code: string) => countryMap.get(code)) // Use countryMap passed as argument
        .filter((id): id is string => !!id)       // Filter out any codes not found in countryMap
        .map((id: string) => ({ id }));           // Format for Prisma connect

      const prismaContactData: any = {
        // Spread all fields from contactData EXCEPT countryCodesForMock and the original countries (if it existed)
        // as we are rebuilding the countries connection.
        id: contactData.id,
        name: contactData.name,
        title: contactData.title,
        bio: contactData.bio,
        email: contactData.email,
        email_verified_status: contactData.email_verified_status,
        socials: contactData.socials,
        outlets: contactData.outlets, // Assumes outlets in mockData is already { connect: [{id:...}] }
        beats: contactData.beats,     // Assumes beats in mockData is already { connect: [{id:...}] }
      };

      if (countryDBConnections.length > 0) {
        prismaContactData.countries = { connect: countryDBConnections };
      }

      // Clean up potentially undefined relational fields if their connect arrays are empty or they are not provided
      if (prismaContactData.outlets && (!prismaContactData.outlets.connect || prismaContactData.outlets.connect.length === 0)) {
        delete prismaContactData.outlets;
      }
      // No need to check prismaContactData.countries like this anymore, as it's built from countryDBConnections
      if (prismaContactData.beats && (!prismaContactData.beats.connect || prismaContactData.beats.connect.length === 0)) {
        delete prismaContactData.beats;
      }

      const contact = await prisma.mediaContact.create({
        data: prismaContactData,
      });
      console.log(`Created media contact: ${contact.name} (ID: ${contact.id})`);
    } catch (e: any) {
      if (e.code === 'P2002') {
        console.warn(`Media contact with email ${contactData.email} already exists or another unique constraint failed.`);
      } else {
        console.error(`Error creating media contact ${contactData.name}:`, e);
        // console.error('Problematic contact data for Prisma:', JSON.stringify(prismaContactData, null, 2));
      }
    }
  }

  console.log('\nSeeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
