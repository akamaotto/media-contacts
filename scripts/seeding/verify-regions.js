/**
 * Script to verify that regions and country connections were properly created
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyRegions() {
  console.log('Verifying regions and country connections...');
  
  try {
    // Check total count of regions
    const totalRegions = await prisma.regions.count();
    console.log(`Total regions in database: ${totalRegions}`);
    
    // Check regions by category
    const categories = await prisma.regions.groupBy({
      by: ['category'],
      _count: true
    });
    
    console.log('Regions by category:');
    categories.forEach(category => {
      console.log(`  ${category.category}: ${category._count} regions`);
    });
    
    // Check some specific regions with their country counts
    const sampleRegions = [
      'EU', 'OPEC', 'ECOWAS', 'ASEAN', 'EU', 'NATO', 'AU', 'BRICS', 'G20'
    ];
    
    console.log('\nSample regions with country counts:');
    for (const code of sampleRegions) {
      const region = await prisma.regions.findUnique({
        where: { code },
        include: {
          _count: {
            select: { countries: true }
          }
        }
      });
      
      if (region) {
        console.log(`  ${region.name} (${region.code}): ${region._count.countries} countries`);
      } else {
        console.log(`  Region ${code}: NOT FOUND`);
      }
    }
    
    // Check a few regions in detail
    console.log('\nDetailed view of some regions:');
    
    // European Union
    const eu = await prisma.regions.findUnique({
      where: { code: 'EU' },
      include: {
        countries: {
          select: { name: true, code: true },
          take: 5
        },
        _count: {
          select: { countries: true }
        }
      }
    });
    
    if (eu) {
      console.log(`\n${eu.name} (${eu.code}):`);
      console.log(`  Total countries: ${eu._count.countries}`);
      console.log(`  Sample countries: ${eu.countries.map(c => c.name).join(', ')}`);
    }
    
    // BRICS
    const brics = await prisma.regions.findUnique({
      where: { code: 'BRICS' },
      include: {
        countries: {
          select: { name: true, code: true }
        },
        _count: {
          select: { countries: true }
        }
      }
    });
    
    if (brics) {
      console.log(`\n${brics.name} (${brics.code}):`);
      console.log(`  Total countries: ${brics._count.countries}`);
      console.log(`  Countries: ${brics.countries.map(c => c.name).join(', ')}`);
    }
    
    // Francophonie
    const francophonie = await prisma.regions.findUnique({
      where: { code: 'FRANC' },
      include: {
        countries: {
          select: { name: true, code: true },
          take: 10
        },
        _count: {
          select: { countries: true }
        }
      }
    });
    
    if (francophonie) {
      console.log(`\n${francophonie.name} (${francophonie.code}):`);
      console.log(`  Total countries: ${francophonie._count.countries}`);
      console.log(`  Sample countries: ${francophonie.countries.map(c => c.name).join(', ')}`);
    }
    
    console.log('\nVerification completed successfully!');
    
  } catch (error) {
    console.error('Error verifying regions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script if called directly
if (require.main === module) {
  verifyRegions().catch(console.error);
}

module.exports = { verifyRegions };