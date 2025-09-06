import { NextRequest } from 'next/server';
import { GET as getCountries } from '../app/api/filters/countries/route';
import { GET as getBeats } from '../app/api/filters/beats/route';
import { GET as getOutlets } from '../app/api/filters/outlets/route';
import { GET as getRegions } from '../app/api/filters/regions/route';
import { GET as getLanguages } from '../app/api/filters/languages/route';

// Mock the auth function
jest.mock('@/lib/auth', () => ({
  auth: jest.fn().mockResolvedValue({ user: { id: 'test-user' } })
}));

// Mock the prisma client
jest.mock('@/lib/database/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn()
  }
}));

// Mock the cache service
jest.mock('@/lib/caching/cache-service', () => ({
  cacheService: {
    get: jest.fn().mockReturnValue(null),
    set: jest.fn()
  },
  CacheKeys: {
    filters: {
      countries: () => 'filters:countries:test',
      beats: () => 'filters:beats:test',
      outlets: () => 'filters:outlets:test',
      regions: () => 'filters:regions:test',
      languages: () => 'filters:languages:test'
    }
  }
}));

// Mock NextRequest constructor
jest.mock('next/server', () => {
  const actual = jest.requireActual('next/server');
  return {
    ...actual,
    NextRequest: jest.fn().mockImplementation((url) => {
      return new actual.NextRequest(url, {
        headers: {
          cookie: ''
        }
      });
    })
  };
});

describe('Filter API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Countries Filter API', () => {
    it('should return popular countries when no search query is provided', async () => {
      const mockCountries = [
        { id: '1', name: 'United States', code: 'US', count: BigInt(100) },
        { id: '2', name: 'United Kingdom', code: 'GB', count: BigInt(75) }
      ];
      
      const mockPrisma = require('@/lib/database/prisma').prisma;
      mockPrisma.$queryRaw.mockResolvedValue(mockCountries);

      const request = new NextRequest('http://localhost:3000/api/filters/countries');
      const response = await getCountries(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(2);
      expect(data.items[0]).toEqual({
        id: '1',
        label: 'United States',
        code: 'US',
        count: 100
      });
    });

    it('should return searched countries when search query is provided', async () => {
      const mockCountries = [
        { id: '1', name: 'Egypt', code: 'EG', count: BigInt(50) }
      ];
      
      const mockPrisma = require('@/lib/database/prisma').prisma;
      mockPrisma.$queryRaw.mockResolvedValue(mockCountries);

      const request = new NextRequest('http://localhost:3000/api/filters/countries?s=egy&limit=10');
      const response = await getCountries(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(1);
      expect(data.items[0].label).toBe('Egypt');
    });
  });

  describe('Beats Filter API', () => {
    it('should return popular beats when no search query is provided', async () => {
      const mockBeats = [
        { id: '1', name: 'Technology', description: 'Tech news', count: BigInt(80) },
        { id: '2', name: 'Sports', description: 'Sports news', count: BigInt(60) }
      ];
      
      const mockPrisma = require('@/lib/database/prisma').prisma;
      mockPrisma.$queryRaw.mockResolvedValue(mockBeats);

      const request = new NextRequest('http://localhost:3000/api/filters/beats');
      const response = await getBeats(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(2);
      expect(data.items[0]).toEqual({
        id: '1',
        label: 'Technology',
        description: 'Tech news',
        count: 80
      });
    });

    it('should return searched beats when search query is provided', async () => {
      const mockBeats = [
        { id: '1', name: 'Technology', description: 'Tech news', count: BigInt(80) }
      ];
      
      const mockPrisma = require('@/lib/database/prisma').prisma;
      mockPrisma.$queryRaw.mockResolvedValue(mockBeats);

      const request = new NextRequest('http://localhost:3000/api/filters/beats?s=tech&limit=10');
      const response = await getBeats(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(1);
      expect(data.items[0].label).toBe('Technology');
    });
  });

  describe('Outlets Filter API', () => {
    it('should return popular outlets when no search query is provided', async () => {
      const mockOutlets = [
        { id: '1', name: 'TechCrunch', description: 'Tech news', website: 'techcrunch.com', count: BigInt(90) },
        { id: '2', name: 'The Verge', description: 'Tech and culture', website: 'theverge.com', count: BigInt(70) }
      ];
      
      const mockPrisma = require('@/lib/database/prisma').prisma;
      mockPrisma.$queryRaw.mockResolvedValue(mockOutlets);

      const request = new NextRequest('http://localhost:3000/api/filters/outlets');
      const response = await getOutlets(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(2);
      expect(data.items[0]).toEqual({
        id: '1',
        label: 'TechCrunch',
        description: 'Tech news',
        website: 'techcrunch.com',
        count: 90
      });
    });

    it('should return searched outlets when search query is provided', async () => {
      const mockOutlets = [
        { id: '1', name: 'TechCrunch', description: 'Tech news', website: 'techcrunch.com', count: BigInt(90) }
      ];
      
      const mockPrisma = require('@/lib/database/prisma').prisma;
      mockPrisma.$queryRaw.mockResolvedValue(mockOutlets);

      const request = new NextRequest('http://localhost:3000/api/filters/outlets?s=tech&limit=10');
      const response = await getOutlets(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(1);
      expect(data.items[0].label).toBe('TechCrunch');
    });
  });

  describe('Regions Filter API', () => {
    it('should return popular regions when no search query is provided', async () => {
      const mockRegions = [
        { id: '1', name: 'North America', code: 'NA', category: 'continent', count: BigInt(120) },
        { id: '2', name: 'Europe', code: 'EU', category: 'continent', count: BigInt(90) }
      ];
      
      const mockPrisma = require('@/lib/database/prisma').prisma;
      mockPrisma.$queryRaw.mockResolvedValue(mockRegions);

      const request = new NextRequest('http://localhost:3000/api/filters/regions');
      const response = await getRegions(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(2);
      expect(data.items[0]).toEqual({
        id: '1',
        label: 'North America',
        code: 'NA',
        category: 'continent',
        count: 120
      });
    });

    it('should return searched regions when search query is provided', async () => {
      const mockRegions = [
        { id: '1', name: 'North America', code: 'NA', category: 'continent', count: BigInt(120) }
      ];
      
      const mockPrisma = require('@/lib/database/prisma').prisma;
      mockPrisma.$queryRaw.mockResolvedValue(mockRegions);

      const request = new NextRequest('http://localhost:3000/api/filters/regions?s=north&limit=10');
      const response = await getRegions(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(1);
      expect(data.items[0].label).toBe('North America');
    });
  });

  describe('Languages Filter API', () => {
    it('should return popular languages when no search query is provided', async () => {
      const mockLanguages = [
        { id: '1', name: 'English', code: 'en', count: BigInt(200) },
        { id: '2', name: 'Spanish', code: 'es', count: BigInt(150) }
      ];
      
      const mockPrisma = require('@/lib/database/prisma').prisma;
      mockPrisma.$queryRaw.mockResolvedValue(mockLanguages);

      const request = new NextRequest('http://localhost:3000/api/filters/languages');
      const response = await getLanguages(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(2);
      expect(data.items[0]).toEqual({
        id: '1',
        label: 'English',
        code: 'en',
        count: 200
      });
    });

    it('should return searched languages when search query is provided', async () => {
      const mockLanguages = [
        { id: '1', name: 'English', code: 'en', count: BigInt(200) }
      ];
      
      const mockPrisma = require('@/lib/database/prisma').prisma;
      mockPrisma.$queryRaw.mockResolvedValue(mockLanguages);

      const request = new NextRequest('http://localhost:3000/api/filters/languages?s=eng&limit=10');
      const response = await getLanguages(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(1);
      expect(data.items[0].label).toBe('English');
    });
  });
});
