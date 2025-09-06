const fs = require('fs').promises;
const { PrismaClient } = require('@prisma/client');
const { ADDITIONAL_REGIONS, COUNTRY_REGION_MAPPINGS } = require('./corrected-additional-regions');

/**
 * Script to seed additional regions and establish country connections
 */

const prisma = new PrismaClient();

async function seedAdditionalRegions() {
  console.log('Starting to seed additional regions...');
  
  try {
    // Flatten all regions into a single array
    const allRegions = Object.values(ADDITIONAL_REGIONS).flat();
    
    console.log(`Found ${allRegions.length} regions to seed`);
    
    // Create all regions
    const createdRegions = [];
    for (const regionData of allRegions) {
      try {
        // Check if region already exists
        const existingRegion = await prisma.regions.findUnique({
          where: { code: regionData.code }
        });
        
        if (existingRegion) {
          console.log(`Region ${regionData.code} already exists, skipping...`);
          createdRegions.push(existingRegion);
          continue;
        }
        
        // Create the region
        const region = await prisma.regions.create({
          data: {
            name: regionData.name,
            code: regionData.code,
            category: regionData.category,
            description: regionData.description || null
          }
        });
        
        createdRegions.push(region);
        console.log(`Created region: ${region.name} (${region.code})`);
      } catch (error) {
        console.error(`Error creating region ${regionData.code}:`, error.message);
      }
    }
    
    console.log(`Successfully created ${createdRegions.length} regions`);
    
    // Now establish country connections
    console.log('Establishing country connections...');
    
    let connectionCount = 0;
    for (const [regionCode, countryCodes] of Object.entries(COUNTRY_REGION_MAPPINGS)) {
      try {
        // Find the region
        const region = await prisma.regions.findUnique({
          where: { code: regionCode }
        });
        
        if (!region) {
          console.log(`Region ${regionCode} not found, skipping connections...`);
          continue;
        }
        
        // Find all countries by their codes
        const countries = await prisma.countries.findMany({
          where: {
            code: {
              in: countryCodes
            }
          }
        });
        
        if (countries.length === 0) {
          console.log(`No countries found for region ${regionCode}, skipping...`);
          continue;
        }
        
        // Connect countries to the region
        await prisma.regions.update({
          where: { code: regionCode },
          data: {
            countries: {
              connect: countries.map(country => ({ id: country.id }))
            }
          }
        });
        
        connectionCount += countries.length;
        console.log(`Connected ${countries.length} countries to region ${region.name}`);
      } catch (error) {
        console.error(`Error connecting countries to region ${regionCode}:`, error.message);
      }
    }
    
    console.log(`Successfully established ${connectionCount} country connections`);
    
    // Verify the results
    console.log('Verifying results...');
    const totalRegions = await prisma.regions.count();
    console.log(`Total regions in database: ${totalRegions}`);
    
    // Show some sample regions with country counts
    const sampleRegions = await prisma.regions.findMany({
      where: {
        code: {
          in: Object.keys(COUNTRY_REGION_MAPPINGS).slice(0, 5)
        }
      },
      include: {
        _count: {
          select: { countries: true }
        }
      }
    });
    
    console.log('Sample regions with country counts:');
    sampleRegions.forEach(region => {
      console.log(`  ${region.name} (${region.code}): ${region._count.countries} countries`);
    });
    
    console.log('Additional regions seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding additional regions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script if called directly
if (require.main === module) {
  seedAdditionalRegions().catch(console.error);
}

module.exports = { seedAdditionalRegions };
