import { MediaContactData } from './src/lib/seeding/media-contacts/config/types';
import { importContactsViaAPI } from './src/lib/seeding/media-contacts/importer/api-importer';

// Full contacts dataset - 35 candidates, will select best 30
const fullContacts: MediaContactData[] = [
  // Nigerian/African Outlets (18 contacts) - Increased to improve regional/global balance
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
  {
    name: "Jessica Adiele",
    email: "jessica.adiele@innovation-village.com",
    title: "Journalist",
    outlet: "Innovation Village",
    beats: ["Technology", "Startups"],
    countries: ["Nigeria"],
    linkedinUrl: "https://linkedin.com/in/jessica-adiele",
    authorLinks: ["https://muckrack.com/jessica-adiele"],
    bio: "Journalist at Innovation Village covering technology and startup stories in Nigeria."
  },
  {
    name: "Duncan McLeod",
    email: "duncan@techcentral.co.za",
    title: "Editor",
    outlet: "TechCentral",
    beats: ["Technology", "Business"],
    countries: ["South Africa"],
    twitterHandle: "@mcleodd",
    linkedinUrl: "https://linkedin.com/in/duncan-mcleod-91733ab",
    authorLinks: ["https://techcentral.co.za/our-authors/"],
    bio: "Editor of TechCentral, South Africa's premier business technology news website."
  },
  {
    name: "Jan Vermeulen",
    email: "jan@mybroadband.co.za",
    title: "Editor",
    outlet: "MyBroadband",
    beats: ["Technology", "Telecom", "Broadband"],
    countries: ["South Africa"],
    twitterHandle: "@sigstart",
    linkedinUrl: "https://linkedin.com/in/sigstart",
    authorLinks: ["https://muckrack.com/jan-vermeulen-1"],
    bio: "Editor at MyBroadband, South Africa's largest tech publication with 4.7 million monthly readers."
  },
  {
    name: "Andile Masuku",
    email: "andile@africantechroundup.com",
    title: "Journalist",
    outlet: "African Tech Roundup",
    beats: ["Technology", "Entrepreneurship", "Innovation"],
    countries: ["South Africa"],
    linkedinUrl: "https://linkedin.com/in/andile-masuku",
    authorLinks: ["https://muckrack.com/andile-masuku"],
    bio: "Journalist at African Tech Roundup delivering ecosystem-focused analysis on technology and innovation in Africa."
  },
  {
    name: "Oluwatomisin Amokeoja",
    email: "oluwatomisin.amokeoja@forbesafrica.com",
    title: "Multimedia Journalist, West Africa",
    outlet: "Forbes Africa",
    beats: ["Finance", "Technology", "Business"],
    countries: ["Nigeria"],
    linkedinUrl: "https://linkedin.com/in/oluwatomisin-amokeoja",
    authorLinks: ["https://www.forbesafrica.com/author/oluwato/"],
    bio: "Multimedia journalist with FORBES AFRICA, covering West Africa's most impactful stories in finance, technology, and business."
  },
  {
    name: "Aanu Adeoye",
    email: "aanu.adeoye@ft.com",
    title: "West Africa Correspondent",
    outlet: "Financial Times",
    beats: ["Politics", "Business", "Technology", "Economics"],
    countries: ["Nigeria"],
    authorLinks: ["https://www.ft.com/aanu-adeoye"],
    bio: "West Africa correspondent for the Financial Times based in Lagos, covering politics, business, technology and economics in the ECOWAS region."
  },
  {
    name: "Bolu Abiodun",
    email: "bolu.abiodun@techpoint.africa",
    title: "Senior Reporter",
    outlet: "Techpoint Africa",
    beats: ["Startups", "Technology"],
    countries: ["Nigeria"],
    authorLinks: ["https://techpoint.africa/author/bolu-abiodun/"],
    bio: "Senior Reporter at Techpoint Africa covering startups and technology in Nigeria."
  },
  {
    name: "Muktar Oladunmade",
    email: "muktar.oladunmade@techcabal.com",
    title: "Reporter",
    outlet: "TechCabal",
    beats: ["Technology", "Startups"],
    countries: ["Nigeria"],
    authorLinks: ["https://techcabal.com/author/muktar-oladunmade/"],
    bio: "Reporter at TechCabal covering technology and startups in Nigeria."
  },
  {
    name: "Ngozi Chukwu",
    email: "ngozi.chukwu@techpoint.africa",
    title: "Reporter",
    outlet: "Techpoint Africa",
    beats: ["Startups", "Business"],
    countries: ["Nigeria"],
    authorLinks: ["https://techpoint.africa/author/ngozi-chukwu/"],
    bio: "Reporter at Techpoint Africa covering startups and business in Nigeria."
  },
  {
    name: "Rudolph Muller",
    email: "rudolph@mybroadband.co.za",
    title: "Managing Editor",
    outlet: "MyBroadband",
    beats: ["Technology", "Telecom", "Broadband"],
    countries: ["South Africa"],
    linkedinUrl: "https://linkedin.com/in/rudolph-muller-372888304",
    bio: "Managing Editor at MyBroadband, South Africa's largest tech publication."
  },
  {
    name: "Chanel Retief",
    email: "chanel.retief@forbesafrica.com",
    title: "Multimedia Journalist",
    outlet: "Forbes Africa",
    beats: ["Technology", "Digital Innovation"],
    countries: ["South Africa"],
    authorLinks: ["https://www.forbesafrica.com/author/chanel-retief/"],
    bio: "Multimedia journalist at FORBES AFRICA, passionate about the digital space and integrating innovative digital storytelling techniques."
  },
  {
    name: "Toby Shapshak",
    email: "toby.shapshak@forbes.com",
    title: "Contributor",
    outlet: "Forbes",
    beats: ["Innovation", "Technology"],
    countries: ["South Africa"],
    twitterHandle: "@shapshak",
    linkedinUrl: "https://linkedin.com/in/shapshak",
    authorLinks: ["https://www.forbes.com/sites/tobyshapshak/"],
    bio: "Writes and speaks about how innovation is better in Africa, defining innovation as solving real problems we have in Africa."
  },

  // Global Outlets Covering Africa (12 contacts) - Reduced to improve regional/global balance
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
  },
  {
    name: "David Pilling",
    email: "david.pilling@ft.com",
    title: "Africa Editor",
    outlet: "Financial Times",
    beats: ["Business", "Politics", "Development"],
    countries: ["United Kingdom"],
    authorLinks: ["https://www.ft.com/david-pilling"],
    bio: "Africa editor and columnist at the Financial Times, covering business, politics and development on the continent."
  },
  {
    name: "Monica Mark",
    email: "monica.mark@ft.com",
    title: "Southern Africa Bureau Chief",
    outlet: "Financial Times",
    beats: ["Business", "Technology", "Economics"],
    countries: ["South Africa"],
    authorLinks: ["https://www.ft.com/monica-mark"],
    bio: "Southern Africa bureau chief for The Financial Times, based in Johannesburg."
  },
  {
    name: "Ore Ogunbiyi",
    email: "ore.ogunbiyi@economist.com",
    title: "Africa Correspondent",
    outlet: "The Economist",
    beats: ["Technology", "Politics", "Economics"],
    countries: ["Nigeria"],
    authorLinks: ["https://mediadirectory.economist.com/people/ore-ogunbiyi/"],
    bio: "Africa correspondent for The Economist based in Lagos, Nigeria, previously co-hosted the daily news podcast 'The Intelligence'."
  },
  {
    name: "Tom Gardner",
    email: "tom.gardner@economist.com",
    title: "Africa Correspondent",
    outlet: "The Economist",
    beats: ["Technology", "Politics", "Economics"],
    countries: ["Kenya"],
    twitterHandle: "@TomGardner18",
    linkedinUrl: "https://linkedin.com/in/tomgardner18",
    authorLinks: ["https://mediadirectory.economist.com/people/tom-gardner/"],
    bio: "Africa correspondent for The Economist, based in Nairobi, covering the region for over a decade."
  },
  {
    name: "John McDermott",
    email: "john.mcdermott@economist.com",
    title: "Chief Africa Correspondent",
    outlet: "The Economist",
    beats: ["Technology", "Politics", "Economics"],
    countries: ["South Africa"],
    authorLinks: ["https://mediadirectory.economist.com/people/john-mcdermott/"],
    bio: "Chief Africa Correspondent for The Economist, based in Johannesburg, but reporting across the continent."
  },
  {
    name: "Tim Bradshaw",
    email: "tim.bradshaw@ft.com",
    title: "Global Tech Correspondent",
    outlet: "Financial Times",
    beats: ["Technology", "Big Tech"],
    countries: ["United Kingdom"],
    authorLinks: ["https://www.ft.com/tim-bradshaw"],
    bio: "Global tech correspondent covering the technology industry for 15 years, including leading the FT's reporting on Apple, Uber, Snap and other major tech companies."
  }
];

async function seedFullContacts() {
  console.log("Seeding full contacts dataset...");
  
  try {
    // Import all contacts
    const result = await importContactsViaAPI(fullContacts);
    
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
    console.error("Error seeding full contacts:", error);
  }
}

// Run the function if this file is executed directly
if (require.main === module) {
  seedFullContacts();
}

export { fullContacts, seedFullContacts };