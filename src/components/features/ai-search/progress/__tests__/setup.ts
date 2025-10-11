/**
 * Test Setup for Progress Tracking Components
 * Configuration and mocks for testing environment
 */

// Mock IntersectionObserver for progress animations
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock ResizeObserver for responsive behavior
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock matchMedia for responsive tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
  writable: true,
  value: {
    writeText: jest.fn().mockResolvedValue(undefined),
    readText: jest.fn().mockResolvedValue(''),
  },
});

// Mock performance API for performance testing
Object.defineProperty(window, 'performance', {
  writable: true,
  value: {
    ...window.performance,
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => []),
  },
});

// Mock console methods to avoid noise in tests
Object.defineProperty(console, 'warn', {
  writable: true,
  value: jest.fn(),
});

Object.defineProperty(console, 'error', {
  writable: true,
  value: jest.fn(),
});

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_WS_URL = 'ws://localhost:3001/api/ai/search/ws';