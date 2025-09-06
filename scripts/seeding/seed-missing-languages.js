const fs = require('fs').promises;
const { PrismaClient } = require('@prisma/client');

/**
 * Script to seed missing languages directly to the database
 */

console.log('Starting missing languages seeding script...');

const prisma = new PrismaClient();

// Additional languages to seed
const MISSING_LANGUAGES = [
  { name: 'Tajik', code: 'tgk' },
  { name: 'Kyrgyz', code: 'kir' },
  { name: 'Turkmen', code: 'tuk' },
  { name: 'Malagasy', code: 'mlg' },
  { name: 'Shona', code: 'sna' },
  { name: 'Northern Sotho', code: 'nso' },
  { name: 'Tswana', code: 'tsn' },
  { name: 'Southern Sotho', code: 'sot' },
  { name: 'Tsonga', code: 'tso' },
  { name: 'Swati', code: 'ssw' },
  { name: 'Venda', code: 'ven' },
  { name: 'Kirundi', code: 'run' },
  { name: 'Tigré', code: 'tig' },
  { name: 'Blin', code: 'byn' },
  { name: 'Sidamo', code: 'sid' },
  { name: 'Walloon', code: 'wln' },
  { name: 'Cornish', code: 'cor' },
  { name: 'Limburgish', code: 'lim' },
  { name: 'Asturian', code: 'ast' },
  { name: 'Sardinian', code: 'srd' },
  { name: 'Sicilian', code: 'scn' },
  { name: 'Neapolitan', code: 'nap' },
  { name: 'Venetian', code: 'vec' },
  { name: 'Friulian', code: 'fur' },
  { name: 'Ligurian', code: 'lij' },
  { name: 'Piedmontese', code: 'pms' },
  { name: 'Emilian-Romagnol', code: 'eml' },
  { name: 'Samosan', code: 'roh' }
];

// Function to seed missing languages directly
async function seedMissingLanguages() {
  console.log('\n--- Seeding Missing Languages Directly ---');
  
  const actionLog = [];
  const errors = [];
  
  // Process languages in batches
  const batchSize = 10;
  for (let i = 0; i < MISSING_LANGUAGES.length; i += batchSize) {
    const batch = MISSING_LANGUAGES.slice(i, i + batchSize);
    
    for (const language of batch) {
      try {
        console.log(`Seeding language: ${language.name} (${language.code})`);
        
        // Check if language already exists
        const existing = await prisma.languages.findUnique({
          where: { code: language.code }
        });
        
        if (existing) {
          console.log(`Language ${language.name} already exists, skipping...`);
          actionLog.push(`Skipped existing language: ${language.name} (${language.code})`);
          continue;
        }
        
        // Create language
        const created = await prisma.languages.create({
          data: {
            id: require('crypto').randomUUID(),
            name: language.name,
            code: language.code,
            created_at: new Date(),
            updated_at: new Date()
          }
        });
        
        actionLog.push(`Created language: ${created.name} (${created.code})`);
        console.log(`Successfully created language: ${created.name}`);
      } catch (error) {
        errors.push(`Failed to create language ${language.name}: ${error.message}`);
        console.error(`Error seeding language ${language.name}:`, error.message);
      }
    }
    
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  return { actionLog, errors };
}

// Main function
async function main() {
  try {
    console.log('Starting missing languages seeding...');
    
    // Track all actions and errors
    const allActions = [];
    const allErrors = [];

    // Seed missing languages
    const { actionLog: languageActions, errors: languageErrors } = await seedMissingLanguages();
    allActions.push(...languageActions);
    allErrors.push(...languageErrors);

    // Summary
    console.log('\n--- Seeding Complete ---');
    console.log(`Total actions: ${allActions.length}`);
    console.log(`Total errors: ${allErrors.length}`);
    
    if (allErrors.length > 0) {
      console.log('\nErrors encountered:');
      allErrors.forEach(error => console.log(`- ${error}`));
    }
    
    // Save logs
    await fs.writeFile('scripts/seeding/missing-languages-seed-log.json', JSON.stringify(allActions, null, 2));
    if (allErrors.length > 0) {
      await fs.writeFile('scripts/seeding/missing-languages-seed-errors.json', JSON.stringify(allErrors, null, 2));
      console.log('\nErrors saved to scripts/seeding/missing-languages-seed-errors.json');
    }
    
    console.log('\nLogs saved to scripts/seeding/missing-languages-seed-log.json');
    
    return { actions: allActions, errors: allErrors };
    
  } catch (error) {
    console.error('Error in main function:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };