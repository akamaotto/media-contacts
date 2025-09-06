import { MediaContactData } from './src/lib/seeding/media-contacts/config/types';
import { importContactsViaAPI } from './src/lib/seeding/media-contacts/importer/api-importer';

// Pilot contacts dataset - 12 candidates, will select best 10
const pilotContacts: MediaContactData[] = [
  // Nigerian/African Outlets
  {
    name: "Noah Banjo",
    email: "noah.banjo@techcabal.com",
    title: "Senior Editor",
    outlet: "TechCabal",
    beats: ["Technology", "Startups", "Africa Tech"],
    countries: ["Nigeria"],
    twitterHandle: "@noahbanjo",
    linkedinUrl: "https://linkedin.com/in/noahbanjo",
    authorLinks: ["https://techcabal.com/profile/noah-banjo/"],
    bio: "Senior Editor at TechCabal, covering African innovation and technology with a focus on startups and venture capital."
  },
  {
    name: "Chimgozirim Nwokoma",
    email: "chimgozirim.nwokoma@techpoint.africa",
    title: "Senior Reporter",
    outlet: "Techpoint Africa",
    beats: ["Startups", "Venture Capital", "Technology Policy"],
    countries: ["Nigeria"],
    twitterHandle: "@chimgozirim",
    linkedinUrl: "https://linkedin.com/in/chimgozirim-nwokoma",
    authorLinks: ["https://techpoint.africa/author/chimgozirim-nwokoma/"],
    bio: "Senior Reporter at Techpoint Africa covering startups, policy, and venture capital in Nigeria and across Africa."
  },
  {
    name: "Frank Eleanya",
    email: "frank.eleanya@techcabal.com",
    title: "Senior Tech Writer",
    outlet: "TechCabal",
    beats: ["Telecom", "Big Tech", "Infrastructure", "AI", "Tech Policy"],
    countries: ["Nigeria"],
    twitterHandle: "@frankeleanya",
    linkedinUrl: "https://linkedin.com/in/frank-eleanya-0514b335",
    authorLinks: ["https://muckrack.com/frank-eleanya"],
    bio: "Senior technology and innovation journalist covering Nigeria and West Africa's dynamic tech ecosystem."
  },
  {
    name: "Kolawole Oluwanifemi",
    email: "kolawole.oluwanifemi@techpoint.africa",
    title: "Senior Editor",
    outlet: "Techpoint Africa",
    beats: ["Corporate Communications", "Technology", "Startups"],
    countries: ["Nigeria"],
    linkedinUrl: "https://linkedin.com/in/kolawoleoluwanifemi",
    bio: "Senior Editor at Techpoint Africa with expertise in corporate communications and technology reporting."
  },
  {
    name: "David Afolayan",
    email: "david.afolayan@technext24.com",
    title: "Founding Managing Editor",
    outlet: "Technext",
    beats: ["Technology", "Business"],
    countries: ["Nigeria"],
    twitterHandle: "@aforisms",
    linkedinUrl: "https://linkedin.com/in/aforisms",
    authorLinks: ["https://technext24.com/author/david-afolayan/"],
    bio: "Founding Managing Editor at Technext, leading editorial team to produce tech-focused stories for Africans."
  },
  {
    name: "Adonijah Ndege",
    email: "adonijah.ndege@techcabal.com",
    title: "Senior Reporter, East Africa",
    outlet: "TechCabal",
    beats: ["Business", "Technology"],
    countries: ["Kenya"],
    authorLinks: ["https://techcabal.com/author/adonijah/"],
    bio: "Senior Reporter for East Africa at TechCabal with nearly a decade of experience covering the region."
  },
  
  // Global Outlets Covering Africa
  {
    name: "Tage Kene-Okafor",
    email: "tage.kene-okafor@techcrunch.com",
    title: "Reporter",
    outlet: "TechCrunch",
    beats: ["Startups", "Venture Capital"],
    countries: ["Nigeria"],
    twitterHandle: "@tkeneokafor",
    linkedinUrl: "https://linkedin.com/in/tagekeneokafor",
    authorLinks: ["https://techcrunch.com/author/tage-kene-okafor/"],
    bio: "Reporter at TechCrunch based in Lagos, Nigeria, covering the intersection of startups and venture capital in Africa."
  },
  {
    name: "Loni Prinsloo-Lotz",
    email: "loni.prinsloo@bloomberg.com",
    title: "Senior Africa Reporter",
    outlet: "Bloomberg",
    beats: ["Technology", "Business", "Finance"],
    countries: ["South Africa"],
    linkedinUrl: "https://linkedin.com/in/loni-prinsloo",
    authorLinks: ["https://bloomberg.com/authors/ASpwJBbCa-c/loni-prinsloo"],
    bio: "Senior Africa Reporter at Bloomberg covering technology and business across the African continent."
  },
  {
    name: "Nqobile Dludla",
    email: "nqobile.dludla@reuters.com",
    title: "Reporter",
    outlet: "Reuters",
    beats: ["Retail", "Telecom", "Technology"],
    countries: ["South Africa"],
    authorLinks: ["https://www.reuters.com/authors/nqobile-dludla/"],
    bio: "Johannesburg-based reporter covering the South African retail, telecom and tech sectors."
  },
  {
    name: "Emilia David",
    email: "emilia.david@venturebeat.com",
    title: "Senior AI Reporter",
    outlet: "VentureBeat",
    beats: ["Artificial Intelligence", "AI Policy", "Ethics"],
    countries: ["United States"],
    twitterHandle: "@miyadavid",
    linkedinUrl: "https://linkedin.com/in/emiliadavid",
    authorLinks: ["https://venturebeat.com/author/emilia-david/"],
    bio: "Senior AI reporter at VentureBeat focusing on AI policy, responsible and ethical AI, and productivity platforms."
  },
  {
    name: "Khari Johnson",
    email: "khari.johnson@venturebeat.com",
    title: "Senior AI Staff Writer",
    outlet: "VentureBeat",
    beats: ["Artificial Intelligence"],
    countries: ["United States"],
    twitterHandle: "@kharijohnson",
    linkedinUrl: "https://linkedin.com/in/kharijohnson",
    authorLinks: ["https://venturebeat.com/author/kjohnson/"],
    bio: "Senior AI Staff Writer at VentureBeat covering artificial intelligence and machine learning technologies."
  },
  {
    name: "Jennifer Zabasajja",
    email: "jennifer.zabasajja@bloomberg.com",
    title: "Chief Africa Correspondent and Anchor",
    outlet: "Bloomberg Television",
    beats: ["Technology", "Business", "Finance"],
    countries: ["South Africa"],
    linkedinUrl: "https://linkedin.com/in/jenniferzabasajja",
    authorLinks: ["https://www.bloombergmedia.com/talent/people/jennifer-zabasajja/"],
    bio: "Chief Africa Correspondent and Anchor at Bloomberg Television, leading high-impact coverage across the African continent."
  }
];

async function seedPilotContacts() {
  console.log("Seeding pilot contacts...");
  
  try {
    // Import all 12 contacts
    const result = await importContactsViaAPI(pilotContacts);
    
    console.log(`Successfully imported ${result.successCount} contacts`);
    console.log(`Failed to import ${result.errorCount} contacts`);
    
    if (result.errors.length > 0) {
      console.log("Errors:");
      result.errors.forEach(error => console.log(`- ${error}`));
    }
    
    // Verify the contacts were added
    console.log("\nVerifying contacts...");
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    try {
      const contactCount = await prisma.media_contacts.count();
      console.log(`Total contacts in database: ${contactCount}`);
      
      // Show some sample contacts with proper outlet information
      const sampleContacts = await prisma.media_contacts.findMany({
        take: 5,
        include: {
          countries: true,
          outlets: true
        }
      });
      
      console.log("\nSample contacts:");
      sampleContacts.forEach((contact: any, index: number) => {
        console.log(`${index + 1}. ${contact.name} - ${contact.title}`);
        console.log(`   Email: ${contact.email}`);
        console.log(`   Outlet: ${contact.outlets.length > 0 ? contact.outlets[0].name : 'None'}`);
        console.log(`   Countries: ${contact.countries.map((c: any) => c.name).join(', ')}`);
        console.log('');
      });
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    console.error("Error seeding pilot contacts:", error);
  }
}

// Run the function if this file is executed directly
if (require.main === module) {
  seedPilotContacts();
}

export { pilotContacts, seedPilotContacts };