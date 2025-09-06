/**
 * Script to generate a summary report of all regions and their country connections
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function generateRegionsSummary() {
  console.log('Generating regions summary report...');
  
  try {
    // Get all regions ordered by category and name
    const regions = await prisma.regions.findMany({
      include: {
        _count: {
          select: { countries: true }
        }
      },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    });
    
    console.log(`\nTOTAL REGIONS: ${regions.length}\n`);
    
    // Group regions by category
    const regionsByCategory = {};
    regions.forEach(region => {
      if (!regionsByCategory[region.category]) {
        regionsByCategory[region.category] = [];
      }
      regionsByCategory[region.category].push(region);
    });
    
    // Display regions by category
    for (const [category, categoryRegions] of Object.entries(regionsByCategory)) {
      console.log(`=== ${category.toUpperCase()} (${categoryRegions.length} regions) ===`);
      categoryRegions.forEach(region => {
        console.log(`  ${region.name} (${region.code}): ${region._count.countries} countries`);
      });
      console.log('');
    }
    
    // Summary statistics
    console.log('=== SUMMARY STATISTICS ===');
    const totalCountriesConnected = regions.reduce((sum, region) => sum + region._count.countries, 0);
    console.log(`Total country connections: ${totalCountriesConnected}`);
    
    const avgCountriesPerRegion = (totalCountriesConnected / regions.length).toFixed(1);
    console.log(`Average countries per region: ${avgCountriesPerRegion}`);
    
    const regionsWithMostCountries = [...regions]
      .sort((a, b) => b._count.countries - a._count.countries)
      .slice(0, 5);
    
    console.log('\nTop 5 regions by country count:');
    regionsWithMostCountries.forEach(region => {
      console.log(`  ${region.name} (${region.code}): ${region._count.countries} countries`);
    });
    
    console.log('\nRegions summary report generated successfully!');
    
  } catch (error) {
    console.error('Error generating regions summary:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script if called directly
if (require.main === module) {
  generateRegionsSummary().catch(console.error);
}

module.exports = { generateRegionsSummary };