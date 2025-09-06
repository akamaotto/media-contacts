const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifySeeding() {
  try {
    console.log('Verifying seeded data...');
    
    // Check regions
    const regions = await prisma.regions.findMany({
      orderBy: { name: 'asc' }
    });
    console.log(`\n--- Regions (${regions.length} total) ---`);
    regions.forEach(region => {
      console.log(`${region.name} (${region.code}) - ${region.category}`);
    });
    
    // Check countries
    const countries = await prisma.countries.findMany({
      orderBy: { name: 'asc' }
    });
    console.log(`\n--- Countries (${countries.length} total) ---`);
    console.log('First 10 countries:');
    countries.slice(0, 10).forEach(country => {
      console.log(`${country.name} (${country.code})`);
    });
    if (countries.length > 10) {
      console.log(`... and ${countries.length - 10} more`);
    }
    
    // Check languages
    const languages = await prisma.languages.findMany({
      orderBy: { name: 'asc' }
    });
    console.log(`\n--- Languages (${languages.length} total) ---`);
    console.log('First 10 languages:');
    languages.slice(0, 10).forEach(language => {
      console.log(`${language.name} (${language.code})`);
    });
    if (languages.length > 10) {
      console.log(`... and ${languages.length - 10} more`);
    }
    
    console.log('\n--- Verification Complete ---');
    console.log(`Total regions: ${regions.length}`);
    console.log(`Total countries: ${countries.length}`);
    console.log(`Total languages: ${languages.length}`);
    
  } catch (error) {
    console.error('Error verifying seeding:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifySeeding().catch(console.error);