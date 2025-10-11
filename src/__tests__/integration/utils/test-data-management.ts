/**
 * Test Data Management Utilities
 * Provides utilities for creating, managing, and cleaning up test data
 */

import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';
import { testSetup } from '../config/test-config';

// Test data generators
export class TestDataGenerator {
  private prisma: PrismaClient;
  private testUserId: string;

  constructor() {
    this.prisma = testSetup.getPrismaClient();
    this.testUserId = 'test-user-id';
  }

  // Generate random test data
  generateRandomString(length: number): string {
    return randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .slice(0, length);
  }

  generateRandomEmail(): string {
    return `test-${this.generateRandomString(8)}@example.com`;
  }

  generateRandomPhone(): string {
    return `+1-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`;
  }

  generateRandomUrl(): string {
    const domains = ['example.com', 'testsite.org', 'demo.net', 'sample.co'];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    const path = this.generateRandomString(10);
    return `https://${domain}/${path}`;
  }

  generateRandomDate(startYear: number = 2020, endYear: number = 2024): Date {
    const start = new Date(startYear, 0, 1);
    const end = new Date(endYear, 11, 31);
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  }

  // Generate search query test data
  generateSearchQueryData(overrides: Partial<any> = {}): any {
    return {
      query: overrides.query || `Test query: ${this.generateRandomString(10)}`,
      filters: overrides.filters || {
        beats: ['technology'],
        regions: ['US'],
        countries: ['US'],
        languages: ['English'],
        categories: ['technology']
      },
      userId: overrides.userId || this.testUserId,
      status: overrides.status || 'active',
      ...overrides
    };
  }

  // Generate AI search test data
  generateAISearchData(overrides: Partial<any> = {}): any {
    return {
      searchId: overrides.searchId || `search-${this.generateRandomString(16)}`,
      queryId: overrides.queryId || null, // Will be set when creating
      userId: overrides.userId || this.testUserId,
      status: overrides.status || 'processing',
      progress: overrides.progress || 0,
      options: overrides.options || {
        maxResults: 10,
        priority: 'normal',
        includeSummaries: true,
        extractContacts: true,
        scrapeContent: true
      },
      ...overrides
    };
  }

  // Generate search result test data
  generateSearchResultData(overrides: Partial<any> = {}): any {
    return {
      searchId: overrides.searchId || null, // Will be set when creating
      url: overrides.url || this.generateRandomUrl(),
      title: overrides.title || `Test Article: ${this.generateRandomString(10)}`,
      summary: overrides.summary || `Test summary: ${this.generateRandomString(20)}`,
      content: overrides.content || `Test content: ${this.generateRandomString(100)}`,
      relevanceScore: overrides.relevanceScore || Math.random(),
      confidence: overrides.confidence || Math.random(),
      metadata: overrides.metadata || {
        source: 'test',
        wordCount: Math.floor(Math.random() * 2000) + 100,
        author: `Test Author ${this.generateRandomString(5)}`,
        publishedDate: this.generateRandomDate()
      },
      ...overrides
    };
  }

  // Generate contact test data
  generateContactData(overrides: Partial<any> = {}): any {
    const name = overrides.name || `Test Contact ${this.generateRandomString(5)}`;
    return {
      name,
      email: overrides.email || this.generateRandomEmail(),
      role: overrides.role || 'Test Reporter',
      organization: overrides.organization || `Test Organization ${this.generateRandomString(5)}`,
      confidence: overrides.confidence || Math.random(),
      location: overrides.location || `Test City, ${this.generateRandomString(2).toUpperCase()}`,
      beats: overrides.beats || ['technology'],
      languages: overrides.languages || ['English'],
      phone: overrides.phone || this.generateRandomPhone(),
      socialMedia: overrides.socialMedia || {
        twitter: `@${name.toLowerCase().replace(/\s+/g, '')}`,
        linkedin: `linkedin.com/in/${name.toLowerCase().replace(/\s+/g, '')}`
      },
      source: overrides.source || {
        url: this.generateRandomUrl(),
        title: `Test Source: ${this.generateRandomString(10)}`,
        extractedAt: new Date()
      },
      userId: overrides.userId || this.testUserId,
      ...overrides
    };
  }

  // Generate a batch of test contacts
  generateContactsBatch(count: number, overrides: Partial<any> = {}): any[] {
    return Array.from({ length: count }, () => this.generateContactData(overrides));
  }

  // Generate a batch of test search results
  generateSearchResultsBatch(count: number, overrides: Partial<any> = {}): any[] {
    return Array.from({ length: count }, () => this.generateSearchResultData(overrides));
  }

  // Generate complex search query with filters
  generateComplexSearchQueryData(overrides: Partial<any> = {}): any {
    return {
      query: overrides.query || `Complex test query: ${this.generateRandomString(15)}`,
      filters: overrides.filters || {
        beats: ['technology', 'AI', 'innovation'],
        regions: ['US', 'UK', 'Canada'],
        countries: ['US', 'UK', 'CA'],
        languages: ['English', 'Spanish'],
        categories: ['technology', 'science'],
        outletTypes: ['news', 'magazine'],
        domains: ['techcrunch.com', 'wired.com'],
        excludeDomains: ['spam.com'],
        dateRange: {
          from: '2024-01-01',
          to: '2024-12-31'
        },
        safeSearch: true
      },
      userId: overrides.userId || this.testUserId,
      status: overrides.status || 'active',
      ...overrides
    };
  }
}

// Test data manager for creating and cleaning up test data
export class TestDataManager {
  private prisma: PrismaClient;
  private generator: TestDataGenerator;
  private createdData: {
    searchQueries: string[];
    aiSearches: string[];
    searchResults: string[];
    contacts: string[];
  };

  constructor() {
    this.prisma = testSetup.getPrismaClient();
    this.generator = new TestDataGenerator();
    this.createdData = {
      searchQueries: [],
      aiSearches: [],
      searchResults: [],
      contacts: []
    };
  }

  // Create a search query
  async createSearchQuery(overrides: Partial<any> = {}): Promise<any> {
    const data = this.generator.generateSearchQueryData(overrides);
    const created = await this.prisma.searchQuery.create({
      data: {
        ...data,
        filters: data.filters as any // JSON field
      }
    });
    this.createdData.searchQueries.push(created.id);
    return created;
  }

  // Create an AI search
  async createAISearch(overrides: Partial<any> = {}): Promise<any> {
    let data = this.generator.generateAISearchData(overrides);
    
    // If no queryId is provided, create one
    if (!data.queryId) {
      const query = await this.createSearchQuery();
      data.queryId = query.id;
    }
    
    const created = await this.prisma.aISearch.create({
      data: {
        ...data,
        options: data.options as any // JSON field
      }
    });
    this.createdData.aiSearches.push(created.id);
    return created;
  }

  // Create a search result
  async createSearchResult(overrides: Partial<any> = {}): Promise<any> {
    let data = this.generator.generateSearchResultData(overrides);
    
    // If no searchId is provided, create one
    if (!data.searchId) {
      const search = await this.createAISearch();
      data.searchId = search.id;
    }
    
    const created = await this.prisma.aISearchResult.create({
      data: {
        ...data,
        metadata: data.metadata as any // JSON field
      }
    });
    this.createdData.searchResults.push(created.id);
    return created;
  }

  // Create a contact
  async createContact(overrides: Partial<any> = {}): Promise<any> {
    const data = this.generator.generateContactData(overrides);
    const created = await this.prisma.contact.create({
      data: {
        ...data,
        beats: data.beats as any, // JSON field
        languages: data.languages as any, // JSON field
        socialMedia: data.socialMedia as any, // JSON field
        source: data.source as any // JSON field
      }
    });
    this.createdData.contacts.push(created.id);
    return created;
  }

  // Create a batch of contacts
  async createContactsBatch(count: number, overrides: Partial<any> = {}): Promise<any[]> {
    const contacts = this.generator.generateContactsBatch(count, overrides);
    const created = await this.prisma.contact.createMany({
      data: contacts.map(contact => ({
        ...contact,
        beats: contact.beats as any,
        languages: contact.languages as any,
        socialMedia: contact.socialMedia as any,
        source: contact.source as any
      }))
    });
    
    // Get the created contacts to return them
    const retrieved = await this.prisma.contact.findMany({
      where: {
        userId: contacts[0].userId,
        name: { in: contacts.map(c => c.name) }
      },
      orderBy: { createdAt: 'desc' },
      take: count
    });
    
    retrieved.forEach(contact => {
      this.createdData.contacts.push(contact.id);
    });
    
    return retrieved;
  }

  // Create a complete search scenario with query, search, results, and contacts
  async createCompleteSearchScenario(overrides: Partial<any> = {}): Promise<any> {
    // Create search query
    const searchQuery = await this.createSearchQuery(overrides.searchQuery);
    
    // Create AI search
    const aiSearch = await this.createAISearch({
      ...overrides.aiSearch,
      queryId: searchQuery.id
    });
    
    // Create search results
    const resultCount = overrides.resultCount || 3;
    const searchResults = [];
    for (let i = 0; i < resultCount; i++) {
      const result = await this.createSearchResult({
        ...overrides.searchResult,
        searchId: aiSearch.id
      });
      searchResults.push(result);
    }
    
    // Create contacts
    const contactCount = overrides.contactCount || 5;
    const contacts = await this.createContactsBatch(contactCount, {
      ...overrides.contact,
      userId: overrides.userId || 'test-user-id'
    });
    
    return {
      searchQuery,
      aiSearch,
      searchResults,
      contacts
    };
  }

  // Clean up all created test data
  async cleanupAll(): Promise<void> {
    // Clean up in order of dependencies
    if (this.createdData.contacts.length > 0) {
      await this.prisma.contact.deleteMany({
        where: { id: { in: this.createdData.contacts } }
      });
    }
    
    if (this.createdData.searchResults.length > 0) {
      await this.prisma.aISearchResult.deleteMany({
        where: { id: { in: this.createdData.searchResults } }
      });
    }
    
    if (this.createdData.aiSearches.length > 0) {
      await this.prisma.aISearch.deleteMany({
        where: { id: { in: this.createdData.aiSearches } }
      });
    }
    
    if (this.createdData.searchQueries.length > 0) {
      await this.prisma.searchQuery.deleteMany({
        where: { id: { in: this.createdData.searchQueries } }
      });
    }
    
    // Reset the tracking arrays
    this.createdData = {
      searchQueries: [],
      aiSearches: [],
      searchResults: [],
      contacts: []
    };
  }

  // Clean up specific data types
  async cleanupContacts(): Promise<void> {
    if (this.createdData.contacts.length > 0) {
      await this.prisma.contact.deleteMany({
        where: { id: { in: this.createdData.contacts } }
      });
      this.createdData.contacts = [];
    }
  }

  async cleanupSearchResults(): Promise<void> {
    if (this.createdData.searchResults.length > 0) {
      await this.prisma.aISearchResult.deleteMany({
        where: { id: { in: this.createdData.searchResults } }
      });
      this.createdData.searchResults = [];
    }
  }

  async cleanupAISearches(): Promise<void> {
    if (this.createdData.aiSearches.length > 0) {
      await this.prisma.aISearch.deleteMany({
        where: { id: { in: this.createdData.aiSearches } }
      });
      this.createdData.aiSearches = [];
    }
  }

  async cleanupSearchQueries(): Promise<void> {
    if (this.createdData.searchQueries.length > 0) {
      await this.prisma.searchQuery.deleteMany({
        where: { id: { in: this.createdData.searchQueries } }
      });
      this.createdData.searchQueries = [];
    }
  }

  // Get count of created data
  getCreatedDataCount(): {
    searchQueries: number;
    aiSearches: number;
    searchResults: number;
    contacts: number;
  } {
    return {
      searchQueries: this.createdData.searchQueries.length,
      aiSearches: this.createdData.aiSearches.length,
      searchResults: this.createdData.searchResults.length,
      contacts: this.createdData.contacts.length
    };
  }
}

// Test fixtures for common test scenarios
export class TestFixtures {
  private dataManager: TestDataManager;
  private generator: TestDataGenerator;

  constructor() {
    this.dataManager = new TestDataManager();
    this.generator = new TestDataGenerator();
  }

  // Create a basic search scenario
  async createBasicSearchScenario(): Promise<any> {
    return await this.dataManager.createCompleteSearchScenario({
      searchQuery: {
        query: 'AI technology journalists',
        filters: {
          beats: ['technology', 'AI'],
          regions: ['US'],
          languages: ['English']
        }
      },
      aiSearch: {
        status: 'completed',
        progress: 100
      },
      resultCount: 2,
      contactCount: 3
    });
  }

  // Create a complex search scenario with multiple filters
  async createComplexSearchScenario(): Promise<any> {
    return await this.dataManager.createCompleteSearchScenario({
      searchQuery: this.generator.generateComplexSearchQueryData({
        query: 'Healthcare innovation reporters in US and Europe'
      }),
      aiSearch: {
        status: 'completed',
        progress: 100,
        options: {
          maxResults: 20,
          priority: 'high'
        }
      },
      resultCount: 5,
      contactCount: 10
    });
  }

  // Create a scenario with failed search
  async createFailedSearchScenario(): Promise<any> {
    const searchQuery = await this.dataManager.createSearchQuery({
      query: 'Test query for failed search'
    });
    
    const aiSearch = await this.dataManager.createAISearch({
      queryId: searchQuery.id,
      status: 'failed',
      progress: 45,
      options: { maxResults: 10 }
    });
    
    return {
      searchQuery,
      aiSearch,
      searchResults: [],
      contacts: []
    };
  }

  // Create a scenario with contacts that have low confidence
  async createLowConfidenceContactsScenario(): Promise<any> {
    const contacts = await this.dataManager.createContactsBatch(5, {
      confidence: 0.5 // Low confidence
    });
    
    return {
      searchQuery: null,
      aiSearch: null,
      searchResults: [],
      contacts
    };
  }

  // Create a scenario with contacts from different regions
  async createMultiRegionContactsScenario(): Promise<any> {
    const usContacts = await this.dataManager.createContactsBatch(3, {
      location: 'San Francisco, CA',
      beats: ['technology']
    });
    
    const ukContacts = await this.dataManager.createContactsBatch(3, {
      location: 'London, UK',
      beats: ['technology', 'business']
    });
    
    const asiaContacts = await this.dataManager.createContactsBatch(3, {
      location: 'Singapore',
      beats: ['technology', 'innovation']
    });
    
    return {
      searchQuery: null,
      aiSearch: null,
      searchResults: [],
      contacts: [...usContacts, ...ukContacts, ...asiaContacts]
    };
  }

  // Clean up all fixtures
  async cleanupAll(): Promise<void> {
    await this.dataManager.cleanupAll();
  }
}

// Export default instances
export const testDataGenerator = new TestDataGenerator();
export const testDataManager = new TestDataManager();
export const testFixtures = new TestFixtures();

// Export classes for custom instances
export {
  TestDataGenerator,
  TestDataManager,
  TestFixtures
};