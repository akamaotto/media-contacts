import { seedMediaContacts } from './src/lib/seeding/media-contacts/index';

async function seedNigeriaTechBloggers() {
  console.log('Seeding 20 tech bloggers in Nigeria...');
  
  try {
    const result = await seedMediaContacts({
      country: 'Nigeria',
      count: 20,
      categories: ['Technology', 'Startups', 'AI'],
      requirements: {
        includeEmail: true,
        includeSocialProfiles: true,
        includeBio: true,
        verifiedEmailsOnly: false,
        activeContactsOnly: true
      },
      outletTypes: ['tech', 'startup'],
      language: 'en'
    });
    
    console.log(`Seeding completed: ${result.successCount} contacts added, ${result.errorCount} errors`);
    
    if (result.errors.length > 0) {
      console.error('Errors:');
      result.errors.forEach(error => console.error(`- ${error}`));
    } else {
      console.log('Successfully seeded 20 tech bloggers in Nigeria!');
    }
    
    // Display some of the generated contacts
    console.log('\nSample of generated contacts:');
    result.contacts.slice(0, 3).forEach((contact, index) => {
      console.log(`${index + 1}. ${contact.name} - ${contact.title} at ${contact.outlet}`);
      console.log(`   Email: ${contact.email}`);
      console.log(`   Twitter: ${contact.twitterHandle}`);
      console.log(`   Beats: ${contact.beats.join(', ')}`);
      console.log(`   Countries: ${contact.countries.join(', ')}`);
      console.log('');
    });
  } catch (error) {
    console.error('Error seeding Nigerian tech bloggers:', error);
  }
}

// Run the function if this file is executed directly
if (require.main === module) {
  seedNigeriaTechBloggers();
}

export { seedNigeriaTechBloggers };