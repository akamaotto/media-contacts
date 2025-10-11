/**
 * AI Services Mock
 * Comprehensive mocking for external AI services
 */

import { jest } from '@jest/globals';

// OpenAI Mock
export const mockOpenAI = {
  chat: {
    completions: {
      create: jest.fn().mockResolvedValue({
        id: 'chatcmpl-test-123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: JSON.stringify({
              queries: [
                'AI technology journalist reporter',
                'artificial intelligence media contact',
                'machine learning tech writer'
              ],
              metadata: {
                model: 'gpt-4',
                processingTime: 1200,
                tokensUsed: 150
              }
            })
          },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 50,
          completion_tokens: 30,
          total_tokens: 80
        }
      })
    }
  }
};

// Anthropic Mock
export const mockAnthropic = {
  messages: {
    create: jest.fn().mockResolvedValue({
      id: 'msg-test-123',
      type: 'message',
      role: 'assistant',
      content: [{
        type: 'text',
        text: JSON.stringify({
          queries: [
            'AI researcher journalist',
            'artificial intelligence reporter',
            'tech industry media contact'
          ],
          metadata: {
            model: 'claude-3-sonnet',
            processingTime: 900,
            tokensUsed: 120
          }
        })
      }],
      model: 'claude-3-sonnet-20240229',
      stop_reason: 'end_turn',
      usage: {
        input_tokens: 45,
        output_tokens: 35
      }
    })
  }
};

// Exa Search Mock
export const mockExa = {
  search: jest.fn().mockResolvedValue({
    results: [
      {
        id: 'exa-result-1',
        url: 'https://techcrunch.com/2024/01/15/ai-journalists',
        title: 'Top AI Journalists to Follow in 2024',
        publishedDate: '2024-01-15',
        author: 'Sarah Chen',
        score: 0.92,
        text: 'This comprehensive list features the most influential AI journalists...',
        highlights: ['artificial intelligence', 'technology journalism', 'media contacts']
      },
      {
        id: 'exa-result-2',
        url: 'https://wired.com/author/jane-doe',
        title: 'Jane Doe - Senior Technology Reporter',
        publishedDate: '2024-01-10',
        author: 'Wired Staff',
        score: 0.88,
        text: 'Jane Doe covers artificial intelligence and machine learning...',
        highlights: ['technology reporter', 'AI coverage', 'machine learning']
      },
      {
        id: 'exa-result-3',
        url: 'https://venturebeat.com/ai-contact-list',
        title: 'Essential AI Industry Contacts',
        publishedDate: '2024-01-08',
        author: 'Mike Johnson',
        score: 0.85,
        text: 'Comprehensive directory of AI industry journalists and media contacts...',
        highlights: ['AI industry', 'media contacts', 'journalist directory']
      }
    ],
    autocomplete: [],
    facets: {},
    totalResults: 3
  }),

  findSimilar: jest.fn().mockResolvedValue({
    results: [
      {
        id: 'exa-similar-1',
        url: 'https://techcrunch.com/author/john-smith',
        title: 'John Smith - AI Correspondent',
        score: 0.89,
        publishedDate: '2024-01-12'
      }
    ]
  })
};

// Firecrawl Mock
export const mockFirecrawl = {
  scrapeUrl: jest.fn().mockResolvedValue({
    success: true,
    data: {
      content: 'John Doe is a senior technology correspondent at Tech Daily News, specializing in artificial intelligence and machine learning coverage. Email: john.doe@techdaily.com. Twitter: @johndoetech. LinkedIn: linkedin.com/in/johndoe.',
      metadata: {
        title: 'John Doe - Technology Correspondent',
        description: 'Senior tech journalist covering AI and ML',
        url: 'https://techdaily.com/author/john-doe',
        author: 'Tech Daily News',
        publishedDate: '2024-01-01',
        language: 'en',
        wordCount: 245,
        images: []
      },
      links: [
        {
          url: 'https://twitter.com/johndoetech',
          text: 'Twitter'
        },
        {
          url: 'https://linkedin.com/in/johndoe',
          text: 'LinkedIn'
        },
        {
          url: 'mailto:john.doe@techdaily.com',
          text: 'Email'
        }
      ],
      timestamp: new Date().toISOString()
    }
  }),

  crawlUrl: jest.fn().mockResolvedValue({
    success: true,
    data: [
      {
        url: 'https://techdaily.com/author/john-doe',
        content: 'John Doe - Senior Technology Correspondent',
        metadata: {
          title: 'John Doe Profile',
          author: 'Tech Daily News'
        }
      },
      {
        url: 'https://techdaily.com/author/john-doe/articles',
        content: 'Recent articles by John Doe covering AI breakthroughs...',
        metadata: {
          title: 'John Doe Articles',
          articleCount: 25
        }
      }
    ],
    total: 2
  }),

  map: jest.fn().mockResolvedValue({
    success: true,
    data: {
      links: [
        'https://techdaily.com/author/john-doe',
        'https://techdaily.com/author/john-doe/articles',
        'https://techdaily.com/author/john-doe/contact'
      ]
    }
  })
};

// Redis Mock
export const mockRedis = {
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  setex: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  exists: jest.fn().mockResolvedValue(0),
  expire: jest.fn().mockResolvedValue(1),
  ttl: jest.fn().mockResolvedValue(-1),
  keys: jest.fn().mockResolvedValue([]),
  flushall: jest.fn().mockResolvedValue('OK'),
  hget: jest.fn().mockResolvedValue(null),
  hset: jest.fn().mockResolvedValue(1),
  hgetall: jest.fn().mockResolvedValue({}),
  hdel: jest.fn().mockResolvedValue(1),
  incr: jest.fn().mockResolvedValue(1),
  decr: jest.fn().mockResolvedValue(1)
};

// HTTP Fetch Mock
export const mockFetch = jest.fn().mockImplementation((url, options) => {
  if (url.includes('openai.com')) {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockOpenAI.chat.completions.create())
    });
  }

  if (url.includes('anthropic.com')) {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockAnthropic.messages.create())
    });
  }

  if (url.includes('exa.ai')) {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockExa.search())
    });
  }

  if (url.includes('firecrawl.dev')) {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockFirecrawl.scrapeUrl())
    });
  }

  // Default mock response
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ data: 'mock response' }),
    text: () => Promise.resolve('mock text response')
  });
});

// Mock error responses
export const mockErrors = {
  openai: {
    rateLimit: new Error('Rate limit exceeded') as any,
    invalidRequest: new Error('Invalid request') as any,
    authentication: new Error('Invalid API key') as any,
    serverError: new Error('Internal server error') as any
  },

  anthropic: {
    rateLimit: new Error('Rate limit exceeded') as any,
    invalidRequest: new Error('Invalid request') as any,
    authentication: new Error('Invalid API key') as any,
    serverError: new Error('Internal server error') as any
  },

  exa: {
    rateLimit: new Error('Rate limit exceeded') as any,
    invalidRequest: new Error('Invalid search query') as any,
    authentication: new Error('Invalid API key') as any,
    serverError: new Error('Search service unavailable') as any
  },

  firecrawl: {
    rateLimit: new Error('Rate limit exceeded') as any,
    invalidRequest: new Error('Invalid URL') as any,
    authentication: new Error('Invalid API key') as any,
    serverError: new Error('Scraping service unavailable') as any
  },

  network: {
    timeout: new Error('Request timeout') as any,
    connection: new Error('Connection failed') as any,
    dns: new Error('DNS resolution failed') as any
  }
};

// Mock setup utilities
export function setupMockServices() {
  // Reset all mocks
  jest.clearAllMocks();

  // Setup global fetch
  global.fetch = mockFetch;

  // Return mock instances for test configuration
  return {
    openai: mockOpenAI,
    anthropic: mockAnthropic,
    exa: mockExa,
    firecrawl: mockFirecrawl,
    redis: mockRedis,
    fetch: mockFetch,
    errors: mockErrors
  };
}

// Mock behavior configuration
export function configureMockBehavior(service: string, behavior: 'success' | 'error' | 'timeout', errorType?: string) {
  switch (service) {
    case 'openai':
      if (behavior === 'error' && errorType) {
        mockOpenAI.chat.completions.create.mockRejectedValue(mockErrors.openai[errorType as keyof typeof mockErrors.openai]);
      } else if (behavior === 'timeout') {
        mockOpenAI.chat.completions.create.mockImplementation(() => new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), 100)
        ));
      } else {
        mockOpenAI.chat.completions.create.mockResolvedValue(mockOpenAI.chat.completions.create());
      }
      break;

    case 'anthropic':
      if (behavior === 'error' && errorType) {
        mockAnthropic.messages.create.mockRejectedValue(mockErrors.anthropic[errorType as keyof typeof mockErrors.anthropic]);
      } else if (behavior === 'timeout') {
        mockAnthropic.messages.create.mockImplementation(() => new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), 100)
        ));
      } else {
        mockAnthropic.messages.create.mockResolvedValue(mockAnthropic.messages.create());
      }
      break;

    case 'exa':
      if (behavior === 'error' && errorType) {
        mockExa.search.mockRejectedValue(mockErrors.exa[errorType as keyof typeof mockErrors.exa]);
      } else if (behavior === 'timeout') {
        mockExa.search.mockImplementation(() => new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), 100)
        ));
      } else {
        mockExa.search.mockResolvedValue(mockExa.search());
      }
      break;

    case 'firecrawl':
      if (behavior === 'error' && errorType) {
        mockFirecrawl.scrapeUrl.mockRejectedValue(mockErrors.firecrawl[errorType as keyof typeof mockErrors.firecrawl]);
      } else if (behavior === 'timeout') {
        mockFirecrawl.scrapeUrl.mockImplementation(() => new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), 100)
        ));
      } else {
        mockFirecrawl.scrapeUrl.mockResolvedValue(mockFirecrawl.scrapeUrl());
      }
      break;

    case 'redis':
      if (behavior === 'error') {
        mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));
        mockRedis.set.mockRejectedValue(new Error('Redis connection failed'));
      } else {
        mockRedis.get.mockResolvedValue(null);
        mockRedis.set.mockResolvedValue('OK');
      }
      break;
  }
}

// Mock data generators
export function generateMockAIResponse(query: string, service: 'openai' | 'anthropic') {
  const baseQueries = [
    `${query} journalist reporter`,
    `${query} media contact`,
    `${query} tech writer`,
    `${query} industry correspondent`
  ];

  if (service === 'openai') {
    return {
      choices: [{
        message: {
          content: JSON.stringify({
            queries: baseQueries,
            metadata: {
              model: 'gpt-4',
              processingTime: 1200,
              tokensUsed: 150
            }
          })
        }
      }]
    };
  } else {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          queries: baseQueries,
          metadata: {
            model: 'claude-3-sonnet',
            processingTime: 900,
            tokensUsed: 120
          }
        })
      }]
    };
  }
}

export function generateMockSearchResults(query: string) {
  return {
    results: [
      {
        id: `result-1-${Date.now()}`,
        url: `https://example.com/${query.replace(/\s+/g, '-')}`,
        title: `${query} - Latest News and Articles`,
        publishedDate: new Date().toISOString().split('T')[0],
        author: 'Test Author',
        score: 0.9,
        text: `Comprehensive coverage of ${query} with expert insights...`
      }
    ]
  };
}

export function generateMockScrapedContent(url: string) {
  return {
    data: {
      content: `This is mock scraped content from ${url}. It contains contact information and professional details about journalists and media contacts.`,
      metadata: {
        title: 'Mock Article Title',
        description: 'Mock article description',
        url,
        author: 'Mock Author',
        publishedDate: new Date().toISOString().split('T')[0]
      }
    }
  };
}