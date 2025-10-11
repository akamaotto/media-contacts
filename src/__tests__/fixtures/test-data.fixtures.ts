/**
 * Test Data Fixtures
 * Comprehensive test data for various scenarios
 */

import { QueryGenerationRequest, QueryType } from '@/lib/ai/query-generation/types';
import { ContactExtractionRequest } from '@/lib/ai/contact-extraction/types';
import { SearchConfiguration, SearchStage } from '@/lib/ai/search-orchestration/types';

// Query Templates Fixtures
export const queryTemplateFixtures = {
  baseTemplates: [
    {
      id: 'template-base-1',
      name: 'Basic Media Contact',
      template: '{query} journalist reporter media contact',
      type: 'BASE' as QueryType,
      country: null,
      category: null,
      beat: null,
      language: null,
      variables: {},
      priority: 100,
      isActive: true,
      usageCount: 50,
      successCount: 45,
      averageConfidence: 0.85,
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01')
    },
    {
      id: 'template-base-2',
      name: 'Professional Contact',
      template: '{query} professional writer correspondent',
      type: 'BASE' as QueryType,
      country: null,
      category: null,
      beat: null,
      language: null,
      variables: {},
      priority: 95,
      isActive: true,
      usageCount: 35,
      successCount: 32,
      averageConfidence: 0.88,
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01')
    }
  ],

  categoryTemplates: [
    {
      id: 'template-tech-1',
      name: 'Technology Focus',
      template: '{query} technology journalist AI reporter',
      type: 'CATEGORY_SPECIFIC' as QueryType,
      country: null,
      category: 'Technology',
      beat: null,
      language: null,
      variables: {},
      priority: 90,
      isActive: true,
      usageCount: 40,
      successCount: 38,
      averageConfidence: 0.91,
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01')
    },
    {
      id: 'template-business-1',
      name: 'Business Focus',
      template: '{query} business journalist startup reporter',
      type: 'CATEGORY_SPECIFIC' as QueryType,
      country: null,
      category: 'Business',
      beat: null,
      language: null,
      variables: {},
      priority: 88,
      isActive: true,
      usageCount: 30,
      successCount: 28,
      averageConfidence: 0.87,
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01')
    }
  ],

  countryTemplates: [
    {
      id: 'template-us-1',
      name: 'US Media',
      template: '{query} American journalist US media reporter',
      type: 'COUNTRY_SPECIFIC' as QueryType,
      country: 'US',
      category: null,
      beat: null,
      language: null,
      variables: {},
      priority: 85,
      isActive: true,
      usageCount: 25,
      successCount: 23,
      averageConfidence: 0.86,
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01')
    },
    {
      id: 'template-uk-1',
      name: 'UK Media',
      template: '{query} British journalist UK media correspondent',
      type: 'COUNTRY_SPECIFIC' as QueryType,
      country: 'GB',
      category: null,
      beat: null,
      language: null,
      variables: {},
      priority: 83,
      isActive: true,
      usageCount: 20,
      successCount: 19,
      averageConfidence: 0.89,
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01')
    }
  ]
};

// Generated Queries Fixtures
export const generatedQueryFixtures = {
  simpleQueries: [
    {
      id: 'query-simple-1',
      searchId: 'search-123',
      batchId: 'batch-123',
      query: 'AI technology journalist reporter',
      originalQuery: 'artificial intelligence',
      type: 'AI_ENHANCED' as QueryType,
      templateId: 'template-ai-1',
      scores: {
        relevance: 0.85,
        diversity: 0.75,
        coverage: 0.90,
        overall: 0.83
      },
      metadata: {
        aiEnhanced: true,
        processingTime: 250,
        modelUsed: 'gpt-4',
        promptTokens: 150,
        completionTokens: 50
      },
      status: 'ACTIVE' as const,
      usageCount: 5,
      successCount: 4,
      averageConfidence: 0.82,
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01')
    }
  ],

  complexQueries: [
    {
      id: 'query-complex-1',
      searchId: 'search-456',
      batchId: 'batch-456',
      query: 'AI startup funding technology journalist US',
      originalQuery: 'artificial intelligence startups',
      type: 'CATEGORY_SPECIFIC' as QueryType,
      templateId: 'template-tech-1',
      scores: {
        relevance: 0.92,
        diversity: 0.80,
        coverage: 0.95,
        overall: 0.89
      },
      metadata: {
        aiEnhanced: true,
        processingTime: 300,
        modelUsed: 'gpt-4',
        promptTokens: 180,
        completionTokens: 60
      },
      status: 'ACTIVE' as const,
      usageCount: 8,
      successCount: 7,
      averageConfidence: 0.88,
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01')
    }
  ]
};

// Media Contacts Fixtures
export const mediaContactFixtures = {
  basicContacts: [
    {
      id: 'contact-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@technews.com',
      secondaryEmail: 'john.alt@techcrunch.com',
      phone: '+1-555-0123',
      mobile: '+1-555-0124',
      outlet: 'Tech News Daily',
      outletId: 'outlet-1',
      beat: 'Technology',
      beatId: 'beat-1',
      country: 'US',
      countryId: 'country-us',
      region: 'North America',
      regionId: 'region-na',
      languages: ['English'],
      topics: ['Artificial Intelligence', 'Machine Learning', 'Startups'],
      socialMedia: {
        twitter: '@johndoetech',
        linkedin: 'linkedin.com/in/johndoe',
        website: 'johndoe.tech'
      },
      confidence: 0.85,
      source: 'ai-extraction',
      sourceUrl: 'https://techcrunch.com/author/john-doe',
      lastVerified: new Date('2024-01-01'),
      isActive: true,
      notes: 'Senior technology correspondent with 10+ years experience',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    },
    {
      id: 'contact-2',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@wired.com',
      phone: '+1-555-0234',
      outlet: 'Wired Magazine',
      outletId: 'outlet-2',
      beat: 'AI Research',
      beatId: 'beat-2',
      country: 'US',
      countryId: 'country-us',
      region: 'North America',
      regionId: 'region-na',
      languages: ['English'],
      topics: ['AI Research', 'Neural Networks', 'Deep Learning'],
      socialMedia: {
        twitter: '@janesmithai',
        linkedin: 'linkedin.com/in/janesmith'
      },
      confidence: 0.92,
      source: 'ai-extraction',
      sourceUrl: 'https://wired.com/author/jane-smith',
      lastVerified: new Date('2024-01-01'),
      isActive: true,
      notes: 'AI research specialist with academic background',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    }
  ],

  internationalContacts: [
    {
      id: 'contact-3',
      firstName: 'Sarah',
      lastName: 'Chen',
      email: 'sarah.chen@techcrunch.com',
      phone: '+44-20-1234-5678',
      outlet: 'TechCrunch UK',
      outletId: 'outlet-3',
      beat: 'European Tech',
      beatId: 'beat-3',
      country: 'GB',
      countryId: 'country-gb',
      region: 'Europe',
      regionId: 'region-eu',
      languages: ['English', 'Mandarin'],
      topics: ['European Startups', 'UK Tech Scene', 'FinTech'],
      socialMedia: {
        twitter: '@sarahchen_eu',
        linkedin: 'linkedin.com/in/sarahchen'
      },
      confidence: 0.88,
      source: 'ai-extraction',
      sourceUrl: 'https://techcrunch.com/author/sarah-chen',
      lastVerified: new Date('2024-01-01'),
      isActive: true,
      notes: 'European technology correspondent based in London',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    }
  ],

  specialistContacts: [
    {
      id: 'contact-4',
      firstName: 'Michael',
      lastName: 'Johnson',
      email: 'michael.johnson@airesearch.com',
      phone: '+1-555-0345',
      outlet: 'AI Research Journal',
      outletId: 'outlet-4',
      beat: 'Machine Learning Research',
      beatId: 'beat-4',
      country: 'US',
      countryId: 'country-us',
      region: 'North America',
      regionId: 'region-na',
      languages: ['English', 'Python'],
      topics: ['Machine Learning', 'Neural Networks', 'Computer Vision', 'NLP'],
      socialMedia: {
        twitter: '@mjohnson_ml',
        linkedin: 'linkedin.com/in/michaeljohnson',
        github: 'github.com/mjohnson'
      },
      confidence: 0.95,
      source: 'ai-extraction',
      sourceUrl: 'https://airesearch.com/author/michael-johnson',
      lastVerified: new Date('2024-01-01'),
      isActive: true,
      notes: 'PhD in Computer Science, specializes in ML research reporting',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    }
  ]
};

// Search Request Fixtures
export const searchRequestFixtures = {
  simpleRequests: [
    {
      searchId: 'search-simple-1',
      userId: 'user-123',
      query: 'AI technology journalists',
      criteria: {
        categories: ['Technology'],
        countries: ['US'],
        languages: ['English']
      },
      sources: ['openai', 'exa'],
      options: {
        maxResults: 20,
        enableAIEnhancement: true,
        enableContactExtraction: false,
        enableCaching: true,
        priority: 'medium',
        timeout: 15000
      }
    } as SearchConfiguration
  ],

  complexRequests: [
    {
      searchId: 'search-complex-1',
      userId: 'user-456',
      query: 'artificial intelligence startup funding reporters',
      criteria: {
        categories: ['Technology', 'Business'],
        countries: ['US', 'GB', 'CA'],
        languages: ['English'],
        beats: ['AI', 'Startups', 'Venture Capital'],
        topics: ['machine learning', 'funding', 'innovation']
      },
      sources: ['openai', 'anthropic', 'exa', 'firecrawl'],
      options: {
        maxResults: 50,
        enableAIEnhancement: true,
        enableContactExtraction: true,
        enableCaching: true,
        priority: 'high',
        timeout: 30000
      }
    } as SearchConfiguration
  ]
};

// Contact Extraction Fixtures
export const contactExtractionFixtures = {
  simpleContent: [
    {
      url: 'https://techcrunch.com/2024/01/15/ai-breakthrough',
      title: 'Major AI Breakthrough Announced',
      content: 'In a groundbreaking development, researchers announced a significant advancement in artificial intelligence. Sarah Chen, our senior technology correspondent, has been covering this story extensively. For more insights, contact Sarah at sarah.chen@techcrunch.com or follow her on Twitter @sarahchen_ai.',
      author: 'TechCrunch Staff',
      publishDate: '2024-01-15T00:00:00Z'
    }
  ],

  complexContent: [
    {
      url: 'https://example.com/tech-journalists-directory',
      title: 'Complete Directory of Technology Journalists',
      content: `This comprehensive directory features the most influential technology journalists:

John Doe - Senior Technology Correspondent
Email: john.doe@technews.com
Twitter: @johndoetech
LinkedIn: linkedin.com/in/johndoe
Beat: Artificial Intelligence and Machine Learning

Jane Smith - AI Research Reporter
Email: jane.smith@wired.com
Twitter: @janesmithai
Website: janesmithwrites.com
Beat: Academic AI Research

Michael Johnson - Freelance Tech Writer
Email: michael@freelancetech.com
Social: linkedin.com/in/mjohnson
Beat: Startup coverage and funding news

For media inquiries, please contact our editorial team at editorial@techmedia.com.`,
      author: 'Tech Media Staff',
      publishDate: '2024-01-01T00:00:00Z'
    }
  ],

  multiPageContent: [
    {
      url: 'https://techblog.com/author/john-doe',
      title: 'John Doe - Technology Writer',
      content: 'John Doe is a senior technology writer with over 15 years of experience covering AI and machine learning.',
      author: 'Tech Blog',
      publishDate: '2024-01-01T00:00:00Z'
    },
    {
      url: 'https://techblog.com/author/john-doe/contact',
      title: 'Contact John Doe',
      content: 'Reach John Doe at john.doe@techblog.com or via Twitter @johndoetech. For urgent matters, call +1-555-0123.',
      author: 'Tech Blog',
      publishDate: '2024-01-01T00:00:00Z'
    }
  ]
};

// Performance Test Fixtures
export const performanceFixtures = {
  smallDataset: {
    queryCount: 5,
    contactCount: 10,
    urlCount: 3,
    expectedMaxTime: 2000 // 2 seconds
  },

  mediumDataset: {
    queryCount: 20,
    contactCount: 50,
    urlCount: 10,
    expectedMaxTime: 5000 // 5 seconds
  },

  largeDataset: {
    queryCount: 100,
    contactCount: 500,
    urlCount: 50,
    expectedMaxTime: 15000 // 15 seconds
  }
};

// Error Scenario Fixtures
export const errorScenarioFixtures = {
  invalidQueries: [
    '',
    '   ',
    'a',
    'query that is way too long and should trigger validation limits because it exceeds the maximum allowed length for query processing and would cause performance issues if processed normally'
  ],

  invalidUrls: [
    'not-a-url',
    'ftp://invalid-protocol.com',
    'https://',
    'http://',
    'https://domain-does-not-exist-12345.com'
  ],

  malformedContent: [
    {
      url: 'https://example.com',
      title: '',
      content: '',
      author: '',
      publishDate: 'invalid-date'
    },
    {
      url: '',
      title: 'No URL Content',
      content: 'This content has no valid URL associated with it.',
      author: 'Unknown',
      publishDate: '2024-01-01T00:00:00Z'
    }
  ],

  edgeCases: [
    {
      description: 'Special characters in content',
      content: 'Contact: test+tag@example.com, user.name@domain.co.uk, "email with quotes"@example.org'
    },
    {
      description: 'International phone numbers',
      content: 'Phone: +44 (0)20 1234 5678, Mobile: +1-555-123-4567, International: +86-10-1234-5678'
    },
    {
      description: 'Mixed language content',
      content: 'Journaliste: français@example.com. Reporter: english@example.com. Писатель: russian@example.com'
    }
  ]
};

// Integration Test Fixtures
export const integrationFixtures = {
  completeWorkflow: {
    query: 'artificial intelligence journalists covering startup funding',
    expectedStages: [
      'QUERY_GENERATION',
      'SEARCH_EXECUTION',
      'CONTENT_EXTRACTION',
      'CONTACT_PROCESSING',
      'RESULT_AGGREGATION'
    ] as SearchStage[],
    expectedMinContacts: 5,
    expectedMaxProcessingTime: 10000
  },

  highVolumeTest: {
    queries: [
      'AI technology journalists',
      'machine learning reporters',
      'startup funding writers',
      'venture capital correspondents',
      'tech industry analysts'
    ],
    expectedTotalResults: 50,
    expectedMaxProcessingTime: 20000
  }
};

// Utility functions for fixtures
export function getRandomFixture<T>(fixtureArray: T[]): T {
  return fixtureArray[Math.floor(Math.random() * fixtureArray.length)];
}

export function getAllFixtures() {
  return {
    queryTemplates: queryTemplateFixtures,
    generatedQueries: generatedQueryFixtures,
    mediaContacts: mediaContactFixtures,
    searchRequests: searchRequestFixtures,
    contactExtraction: contactExtractionFixtures,
    performance: performanceFixtures,
    errorScenarios: errorScenarioFixtures,
    integration: integrationFixtures
  };
}

export function createTestFixtureManager() {
  const fixtures = getAllFixtures();

  return {
    getQueryTemplate: (type: keyof typeof queryTemplateFixtures) =>
      getRandomFixture(queryTemplateFixtures[type]),

    getMediaContact: (type: keyof typeof mediaContactFixtures) =>
      getRandomFixture(mediaContactFixtures[type]),

    getSearchRequest: (type: keyof typeof searchRequestFixtures) =>
      getRandomFixture(searchRequestFixtures[type]),

    getExtractionContent: (type: keyof typeof contactExtractionFixtures) =>
      getRandomFixture(contactExtractionFixtures[type]),

    getErrorScenario: (type: keyof typeof errorScenarioFixtures) =>
      getRandomFixture(errorScenarioFixtures[type]),

    getAllFixtures: () => fixtures
  };
}