import { faker } from '@faker-js/faker';

// Mock data for related entities first

export const mockOutlets = [
  { id: faker.string.uuid(), name: 'Tech Chronicle', website: 'https://techchronicle.example.com', description: 'Daily tech news and analysis.' },
  { id: faker.string.uuid(), name: 'Global Finance Times', website: 'https://globalfinancetimes.example.com', description: 'In-depth financial market coverage.' },
  { id: faker.string.uuid(), name: 'Eco Watch', website: 'https://ecowatch.example.com', description: 'Environmental news and conservation efforts.' },
  { id: faker.string.uuid(), name: 'Health & Wellness Today', website: 'https://healthtoday.example.com', description: 'Latest in health, nutrition, and wellness.' },
  { id: faker.string.uuid(), name: 'Sports Report Daily', website: 'https://sportsreport.example.com', description: 'Comprehensive sports news and scores.' },
];

export const mockCountries = [
  { id: faker.string.uuid(), name: 'United States', code: 'US' },
  { id: faker.string.uuid(), name: 'United Kingdom', code: 'GB' },
  { id: faker.string.uuid(), name: 'Canada', code: 'CA' },
  { id: faker.string.uuid(), name: 'Germany', code: 'DE' },
  { id: faker.string.uuid(), name: 'Japan', code: 'JP' },
];

export const mockBeats = [
  { id: faker.string.uuid(), name: 'Artificial Intelligence', description: 'Covering advancements in AI and machine learning.' },
  { id: faker.string.uuid(), name: 'Cybersecurity', description: 'News and analysis on digital security threats and defenses.' },
  { id: faker.string.uuid(), name: 'Renewable Energy', description: 'Focus on solar, wind, and other green energy sources.' },
  { id: faker.string.uuid(), name: 'Biotechnology', description: 'Developments in biotech, pharmaceuticals, and life sciences.' },
  { id: faker.string.uuid(), name: 'Venture Capital', description: 'Tracking investments, startups, and VC funding rounds.' },
];

// Define a type for MediaContact creation that matches Prisma's expectations for relations
// This helps ensure type safety when creating contacts with connections.
export type MockMediaContactCreateInput = {
  id?: string;
  name: string;
  title: string;
  bio?: string;
  email: string;
  email_verified_status?: boolean;
  socials?: string[];
  outlets?: { connect: { id: string }[] }; // For outlets, IDs from mockOutlets are stable within a seed run
  countryCodesForMock?: string[]; // Changed from countries connect object
  beats?: { connect: { id: string }[] }; // For beats, IDs from mockBeats are stable
};

export const mockMediaContacts: MockMediaContactCreateInput[] = [];

const numContacts = 50; // Create 50 mock contacts

for (let i = 0; i < numContacts; i++) {
  const contactName = faker.person.fullName();
  mockMediaContacts.push({
    id: faker.string.uuid(),
    name: contactName,
    title: faker.person.jobTitle(),
    bio: faker.lorem.paragraph(),
    email: faker.internet.email({ firstName: contactName.split(' ')[0], lastName: contactName.split(' ')[1] }).toLowerCase(),
    email_verified_status: faker.datatype.boolean(0.8), // 80% chance of being true
    socials: [
      `https://twitter.com/${faker.internet.username()}`,
      `https://linkedin.com/in/${faker.internet.username()}`,
    ],
    // Randomly connect to 1-2 outlets, countries, and beats
    outlets: {
      connect: faker.helpers.arrayElements(mockOutlets, faker.number.int({ min: 1, max: 2 })).map(o => ({ id: o.id })),
    },
    countryCodesForMock: faker.helpers.arrayElements(mockCountries, faker.number.int({ min: 1, max: 2 })).map(c => c.code),

    beats: {
      connect: faker.helpers.arrayElements(mockBeats, faker.number.int({ min: 1, max: 2 })).map(b => ({ id: b.id })),
    },
  });
}
