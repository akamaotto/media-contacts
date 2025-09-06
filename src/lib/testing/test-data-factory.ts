/**
 * Test Data Factory
 * Generates consistent test data for various entities
 */

export interface TestDataOptions {
  seed?: number;
  locale?: string;
  count?: number;
}

// Strongly-typed entities used by the factory
export interface Contact {
  id: string;
  name: string;
  email: string;
  title: string;
  phone: string;
  bio: string;
  beats: string[];
  socialProfiles: { twitter: string; linkedin: string; website: string };
  location: { city: string; state: string; country: string };
  verified: boolean;
  lastContacted: Date;
  createdAt: Date;
  updatedAt: Date;
  // Optional fields used by scenarios
  outletId?: string;
  outlet?: string;
  // Flexible fields used in tests
  [key: string]: unknown;
}

export interface Outlet {
  id: string;
  name: string;
  domain: string;
  website: string;
  type: 'newspaper' | 'magazine' | 'blog' | 'podcast' | 'tv' | 'radio';
  description: string;
  circulation: number;
  location: { city: string; state: string; country: string };
  categories: string[];
  socialProfiles: { twitter: string; facebook: string; instagram: string };
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'editor';
  organization: string;
  preferences: { emailNotifications: boolean; theme: 'light' | 'dark' | 'auto'; language: 'en' | 'es' | 'fr' | 'de' };
  subscription: { plan: 'free' | 'pro' | 'enterprise'; status: 'active' | 'inactive' | 'trial'; expiresAt: Date };
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date;
}

export interface ResearchSession {
  id: string;
  userId: string;
  topic: string;
  query: string;
  mode: 'comprehensive' | 'quick' | 'targeted';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  parameters: { maxContacts: number; scoreThreshold: number; includeOutlets: boolean; regions: string[] };
  results: { totalFound: number; processed: number; candidates: Contact[] };
  metrics: { processingTime: number; apiCalls: number; tokensUsed: number; cost: number };
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date;
}

export interface EnrichmentSuggestion {
  id: string;
  contactId: string;
  type: 'beats' | 'social' | 'contact' | 'bio' | 'location';
  field: 'beats' | 'twitter' | 'linkedin' | 'phone' | 'bio' | 'location';
  currentValue: string;
  suggestedValue: string;
  confidence: number;
  source: 'ai_analysis' | 'web_scraping' | 'social_media' | 'public_records';
  reasoning: string;
  status: 'pending' | 'approved' | 'rejected' | 'applied';
  metadata: { model: 'gpt-4' | 'claude-3' | 'gemini-pro'; processingTime: number; tokensUsed: number };
  createdAt: Date;
  updatedAt: Date;
}

export interface DuplicateResult {
  id: string;
  originalContactId: string;
  duplicateContactId: string;
  similarity: number;
  matchingFields: Array<'name' | 'email' | 'phone' | 'outlet' | 'title' | 'beats' | 'location'>;
  confidence: number;
  status: 'pending' | 'confirmed' | 'rejected' | 'merged';
  analysis: { nameMatch: number; emailMatch: number; contextMatch: number };
  metadata: { algorithm: 'fuzzy_match' | 'semantic_similarity' | 'ml_classifier'; processingTime: number };
  createdAt: Date;
  updatedAt: Date;
}

export interface DataSet {
  users: User[];
  outlets: Outlet[];
  contacts: Contact[];
  researchSessions: ResearchSession[];
}

/**
 * Simple faker-like utilities for test data generation
 */
const testUtils = {
  uuid: () => `test-${Math.random().toString(36).substr(2, 9)}`,
  
  randomFromArray: <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)],
  
  randomElements: <T>(arr: T[], min = 1, max?: number): T[] => {
    const maxCount = max || arr.length;
    const count = Math.floor(Math.random() * (maxCount - min + 1)) + min;
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  },
  
  randomInt: (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min,
  
  randomFloat: (min: number, max: number, decimals = 2) => 
    parseFloat((Math.random() * (max - min) + min).toFixed(decimals)),
  
  randomBoolean: () => Math.random() > 0.5,
  
  randomDate: (daysAgo = 30) => {
    const now = new Date();
    const past = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
    return new Date(past.getTime() + Math.random() * (now.getTime() - past.getTime()));
  },
  
  randomWords: (count: number) => {
    const words = ['test', 'data', 'sample', 'mock', 'example', 'demo', 'placeholder', 'dummy'];
    return Array.from({ length: count }, () => testUtils.randomFromArray(words)).join(' ');
  },
  
  randomEmail: (name?: string) => {
    const domains = ['example.com', 'test.org', 'demo.net', 'sample.io'];
    const username = name ? name.toLowerCase().replace(/\s+/g, '.') : `user${testUtils.randomInt(1, 1000)}`;
    return `${username}@${testUtils.randomFromArray(domains)}`;
  },
  
  randomName: () => {
    const firstNames = ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Lisa', 'Tom', 'Emma'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
    return `${testUtils.randomFromArray(firstNames)} ${testUtils.randomFromArray(lastNames)}`;
  }
};

/**
 * Test Data Factory Class
 */
export class TestDataFactory {
  private static instance: TestDataFactory;
  private seed: number;

  constructor(seed: number = 12345) {
    this.seed = seed;
    // Set random seed for consistent test data
    Math.random = this.seededRandom(seed);
  }

  static getInstance(seed?: number): TestDataFactory {
    if (!TestDataFactory.instance || seed !== undefined) {
      TestDataFactory.instance = new TestDataFactory(seed);
    }
    return TestDataFactory.instance;
  }

  private seededRandom(seed: number) {
    let currentSeed = seed;
    return function() {
      currentSeed = (currentSeed * 9301 + 49297) % 233280;
      return currentSeed / 233280;
    };
  }

  /**
   * Reset with new seed
   */
  resetSeed(seed: number): void {
    this.seed = seed;
    Math.random = this.seededRandom(seed);
  }

  /**
   * Generate media contact data
   */
  createContact(overrides: Partial<Contact> = {}): Contact {
    const name = testUtils.randomName();
    
    return {
      id: testUtils.uuid(),
      name,
      email: testUtils.randomEmail(name),
      title: testUtils.randomFromArray([
        'Technology Reporter', 'Senior Editor', 'Staff Writer', 'Contributing Editor',
        'News Director', 'Managing Editor', 'Freelance Journalist', 'Correspondent'
      ]),
      phone: `+1-555-${testUtils.randomInt(1000, 9999)}`,
      bio: testUtils.randomWords(20),
      beats: testUtils.randomElements([
        'technology', 'business', 'politics', 'sports', 'entertainment',
        'health', 'science', 'education', 'environment', 'finance'
      ], 1, 3),
      socialProfiles: {
        twitter: `@${name.toLowerCase().replace(/\s+/g, '')}`,
        linkedin: `linkedin.com/in/${name.toLowerCase().replace(/\s+/g, '-')}`,
        website: `https://${name.toLowerCase().replace(/\s+/g, '')}.com`
      },
      location: {
        city: testUtils.randomFromArray(['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix']),
        state: testUtils.randomFromArray(['NY', 'CA', 'IL', 'TX', 'AZ']),
        country: 'US'
      },
      verified: testUtils.randomBoolean(),
      lastContacted: testUtils.randomDate(30),
      createdAt: testUtils.randomDate(365),
      updatedAt: testUtils.randomDate(7),
      ...overrides
    };
  }

  /**
   * Generate media outlet data
   */
  createOutlet(overrides: Partial<Outlet> = {}): Outlet {
    const baseName = testUtils.randomFromArray([
      'Tech', 'Business', 'Daily', 'Weekly', 'Global', 'National', 'Local', 'Digital'
    ]);
    const suffix = testUtils.randomFromArray(['News', 'Times', 'Post', 'Herald', 'Tribune', 'Journal']);
    const name = `${baseName} ${suffix}`;
    const domain = `${baseName.toLowerCase()}${suffix.toLowerCase()}.com`;
    
    return {
      id: testUtils.uuid(),
      name,
      domain,
      website: `https://${domain}`,
      type: testUtils.randomFromArray(['newspaper', 'magazine', 'blog', 'podcast', 'tv', 'radio']),
      description: testUtils.randomWords(10),
      circulation: testUtils.randomInt(1000, 1000000),
      location: {
        city: testUtils.randomFromArray(['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix']),
        state: testUtils.randomFromArray(['NY', 'CA', 'IL', 'TX', 'AZ']),
        country: 'US'
      },
      categories: testUtils.randomElements([
        'news', 'business', 'technology', 'sports', 'entertainment',
        'lifestyle', 'health', 'politics', 'science'
      ], 1, 4),
      socialProfiles: {
        twitter: `@${baseName.toLowerCase()}${suffix.toLowerCase()}`,
        facebook: `facebook.com/${baseName.toLowerCase()}${suffix.toLowerCase()}`,
        instagram: `@${baseName.toLowerCase()}${suffix.toLowerCase()}`
      },
      verified: testUtils.randomBoolean(),
      createdAt: testUtils.randomDate(365),
      updatedAt: testUtils.randomDate(7),
      ...overrides
    };
  }

  /**
   * Generate user data
   */
  createUser(overrides: Partial<User> = {}): User {
    const name = testUtils.randomName();
    
    return {
      id: testUtils.uuid(),
      email: testUtils.randomEmail(name),
      name,
      role: testUtils.randomFromArray(['user', 'admin', 'editor']),
      organization: testUtils.randomFromArray([
        'Tech Corp', 'Media Inc', 'News Agency', 'Publishing House', 'Digital Media'
      ]),
      preferences: {
        emailNotifications: testUtils.randomBoolean(),
        theme: testUtils.randomFromArray(['light', 'dark', 'auto']),
        language: testUtils.randomFromArray(['en', 'es', 'fr', 'de'])
      },
      subscription: {
        plan: testUtils.randomFromArray(['free', 'pro', 'enterprise']),
        status: testUtils.randomFromArray(['active', 'inactive', 'trial']),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      },
      createdAt: testUtils.randomDate(365),
      updatedAt: testUtils.randomDate(7),
      lastLoginAt: testUtils.randomDate(1),
      ...overrides
    };
  }

  /**
   * Generate research session data
   */
  createResearchSession(overrides: Partial<ResearchSession> = {}): ResearchSession {
    return {
      id: testUtils.uuid(),
      userId: testUtils.uuid(),
      topic: testUtils.randomWords(3),
      query: testUtils.randomWords(5),
      mode: testUtils.randomFromArray(['comprehensive', 'quick', 'targeted']),
      status: testUtils.randomFromArray(['pending', 'in_progress', 'completed', 'failed']),
      parameters: {
        maxContacts: testUtils.randomInt(10, 100),
        scoreThreshold: testUtils.randomFloat(0.5, 1.0),
        includeOutlets: testUtils.randomBoolean(),
        regions: testUtils.randomElements(['US', 'EU', 'APAC'], 1, 3)
      },
      results: {
        totalFound: testUtils.randomInt(0, 50),
        processed: testUtils.randomInt(0, 50),
        candidates: []
      },
      metrics: {
        processingTime: testUtils.randomInt(1000, 30000),
        apiCalls: testUtils.randomInt(1, 10),
        tokensUsed: testUtils.randomInt(100, 5000),
        cost: testUtils.randomFloat(0.01, 1.0, 4)
      },
      createdAt: testUtils.randomDate(30),
      updatedAt: testUtils.randomDate(1),
      completedAt: testUtils.randomDate(1),
      ...overrides
    };
  }

  /**
   * Generate enrichment suggestion data
   */
  createEnrichmentSuggestion(overrides: Partial<EnrichmentSuggestion> = {}): EnrichmentSuggestion {
    return {
      id: testUtils.uuid(),
      contactId: testUtils.uuid(),
      type: testUtils.randomFromArray(['beats', 'social', 'contact', 'bio', 'location']),
      field: testUtils.randomFromArray(['beats', 'twitter', 'linkedin', 'phone', 'bio', 'location']),
      currentValue: testUtils.randomWords(2),
      suggestedValue: testUtils.randomWords(3),
      confidence: testUtils.randomFloat(0.5, 1.0),
      source: testUtils.randomFromArray(['ai_analysis', 'web_scraping', 'social_media', 'public_records']),
      reasoning: testUtils.randomWords(10),
      status: testUtils.randomFromArray(['pending', 'approved', 'rejected', 'applied']),
      metadata: {
        model: testUtils.randomFromArray(['gpt-4', 'claude-3', 'gemini-pro']),
        processingTime: testUtils.randomInt(100, 5000),
        tokensUsed: testUtils.randomInt(50, 1000)
      },
      createdAt: testUtils.randomDate(30),
      updatedAt: testUtils.randomDate(1),
      ...overrides
    };
  }

  /**
   * Generate duplicate detection result
   */
  createDuplicateResult(overrides: Partial<DuplicateResult> = {}): DuplicateResult {
    return {
      id: testUtils.uuid(),
      originalContactId: testUtils.uuid(),
      duplicateContactId: testUtils.uuid(),
      similarity: testUtils.randomFloat(0.7, 1.0, 3),
      matchingFields: testUtils.randomElements([
        'name', 'email', 'phone', 'outlet', 'title', 'beats', 'location'
      ], 2, 5),
      confidence: testUtils.randomFloat(0.6, 1.0),
      status: testUtils.randomFromArray(['pending', 'confirmed', 'rejected', 'merged']),
      analysis: {
        nameMatch: testUtils.randomFloat(0.5, 1.0),
        emailMatch: testUtils.randomFloat(0.0, 1.0),
        contextMatch: testUtils.randomFloat(0.5, 1.0)
      },
      metadata: {
        algorithm: testUtils.randomFromArray(['fuzzy_match', 'semantic_similarity', 'ml_classifier']),
        processingTime: testUtils.randomInt(100, 2000)
      },
      createdAt: testUtils.randomDate(30),
      updatedAt: testUtils.randomDate(1),
      ...overrides
    };
  }

  /**
   * Generate multiple items of a type
   */
  createMany<T>(factory: () => T, count: number): T[] {
    return Array.from({ length: count }, () => factory());
  }

  /**
   * Create related data sets
   */
  createDataSet(options: {
    users?: number;
    outlets?: number;
    contactsPerOutlet?: number;
    researchSessions?: number;
    apiKeys?: number;
  } = {}): DataSet {
    const {
      users = 5,
      outlets = 10,
      contactsPerOutlet = 3,
      researchSessions = 8
    } = options;

    // Create users
    const userData = this.createMany(() => this.createUser(), users);
    
    // Create outlets
    const outletData = this.createMany(() => this.createOutlet(), outlets);
    
    // Create contacts for each outlet
    const contactData: Contact[] = [];
    outletData.forEach(outlet => {
      const outletContacts = this.createMany(
        () => this.createContact({ outletId: outlet.id, outlet: outlet.name }),
        contactsPerOutlet
      );
      contactData.push(...outletContacts);
    });
    
    // Create research sessions
    const researchSessionData = this.createMany(
      () => this.createResearchSession({
        userId: testUtils.randomFromArray(userData).id
      }),
      researchSessions
    );

    return {
      users: userData,
      outlets: outletData,
      contacts: contactData,
      researchSessions: researchSessionData
    };
  }

  /**
   * Create test scenario data
   */
  createScenario(scenarioName: string): any {
    // Return type is a discriminated union of common scenarios for convenience in tests
    switch (scenarioName) {
      case 'successful_research':
        return {
          user: this.createUser({ role: 'user' }),
          researchSession: this.createResearchSession({ 
            status: 'completed',
            results: { totalFound: 15, processed: 15, candidates: this.createMany(() => this.createContact(), 15) }
          }),
          contacts: this.createMany(() => this.createContact(), 15)
        };
        
      case 'enrichment_workflow':
        const contact = this.createContact();
        return {
          user: this.createUser({ role: 'user' }),
          contact,
          suggestions: this.createMany(
            () => this.createEnrichmentSuggestion({ contactId: contact.id }),
            5
          )
        };
        
      case 'duplicate_detection':
        const contactA = this.createContact();
        const contactB = this.createContact({ name: contactA.name, email: contactA.email });
        return {
          contacts: [contactA, contactB],
          result: this.createDuplicateResult({
            originalContactId: contactA.id,
            duplicateContactId: contactB.id,
            similarity: 0.92,
            status: 'confirmed'
          })
        };
        
      case 'failed_research':
        return {
          user: this.createUser({ role: 'user' }),
          researchSession: this.createResearchSession({ 
            status: 'failed',
            results: { totalFound: 0, processed: 0, candidates: [] }
          })
        };
        
      default:
        return {
          user: this.createUser(),
          contacts: this.createMany(() => this.createContact(), 10)
        };
    }
  }
}

// Export singleton instance
export const testDataFactory = TestDataFactory.getInstance();

/**
 * Predefined test data sets
 */
export const testDataSets = {
  minimal: () => testDataFactory.createDataSet({
    users: 2,
    outlets: 3,
    contactsPerOutlet: 2,
    researchSessions: 2
  }),
  
  standard: () => testDataFactory.createDataSet({
    users: 5,
    outlets: 10,
    contactsPerOutlet: 3,
    researchSessions: 8
  }),
  
  large: () => testDataFactory.createDataSet({
    users: 20,
    outlets: 50,
    contactsPerOutlet: 5,
    researchSessions: 30
  })
};

/**
 * Test data validation helpers
 */
export const testDataValidators = {
  validateContact: (contact: Contact): boolean => {
    const requiredFields: Array<keyof Contact> = ['id', 'name', 'email', 'title', 'beats'];
    return requiredFields.every(field => contact[field] !== undefined);
  },
  
  validateOutlet: (outlet: Outlet): boolean => {
    const requiredFields: Array<keyof Outlet> = ['id', 'name', 'domain', 'type'];
    return requiredFields.every(field => outlet[field] !== undefined);
  },
  
  validateUser: (user: User): boolean => {
    const requiredFields: Array<keyof User> = ['id', 'email', 'name', 'role'];
    return requiredFields.every(field => user[field] !== undefined);
  }
};