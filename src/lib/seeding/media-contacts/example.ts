// Example usage of the media contacts seeding system

import { seedMediaContacts, seedMediaContactsFromCSV } from './index';

/**
 * Example 1: Seed 10 general contacts
 */
async function example1() {
  console.log('Example 1: Seeding 10 general contacts');
  
  const result = await seedMediaContacts();
  
  console.log(`Seeded ${result.successCount} contacts with ${result.errorCount} errors`);
  
  if (result.errors.length > 0) {
    console.log('Errors:');
    result.errors.forEach(error => console.log(`- ${error}`));
  }
}

/**
 * Example 2: Seed 25 technology contacts in the US
 */
async function example2() {
  console.log('Example 2: Seeding 25 technology contacts in the US');
  
  const result = await seedMediaContacts({
    country: 'United States',
    count: 25,
    categories: ['Technology', 'AI', 'Startups'],
    requirements: {
      includeEmail: true,
      includeSocialProfiles: true
    }
  });
  
  console.log(`Seeded ${result.successCount} contacts with ${result.errorCount} errors`);
  
  if (result.errors.length > 0) {
    console.log('Errors:');
    result.errors.forEach(error => console.log(`- ${error}`));
  }
}

/**
 * Example 3: Seed contacts from a CSV file
 */
async function example3() {
  console.log('Example 3: Seeding contacts from CSV file');
  
  // This would import contacts from a CSV file
  // const result = await seedMediaContactsFromCSV('./path/to/contacts.csv');
  
  console.log('CSV import example - replace with actual file path');
}

// Run examples
async function runExamples() {
  try {
    await example1();
    console.log('\n---\n');
    
    await example2();
    console.log('\n---\n');
    
    await example3();
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Run the examples if this file is executed directly
if (require.main === module) {
  runExamples();
}

export { example1, example2, example3 };