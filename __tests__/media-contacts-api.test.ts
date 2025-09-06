import { NextRequest, NextResponse } from 'next/server';
import { getMediaContactsService } from '../src/app/api/media-contacts/factory';

// Mock the auth function
jest.mock('../src/lib/auth', () => ({
  auth: jest.fn().mockResolvedValue({
    user: { id: 'test-user-id' }
  })
}));

// Mock the prisma client
jest.mock('../src/lib/database/prisma', () => ({
  prisma: {
    media_contacts: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'test-id',
          name: 'Test Contact',
          email: 'test@example.com',
          title: 'Test Title',
          bio: 'Test Bio',
          email_verified_status: false,
          socials: [],
          authorLinks: [],
          updated_at: new Date(),
          created_at: new Date(),
          outlets: [],
          countries: [],
          beats: [],
          _count: {
            outlets: 0,
            countries: 0,
            beats: 0
          }
        }
      ]),
      count: jest.fn().mockResolvedValue(1)
    }
  }
}));

describe('Media Contacts API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/media-contacts', () => {
    it('should return media contacts with pagination', async () => {
      const request = new NextRequest('http://localhost:3000/api/media-contacts');
      
      // Import the route handler dynamically
      const routeModule = await import('../src/app/api/media-contacts/route');
      const response = await routeModule.GET(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.pagination.totalCount).toBe(1);
    });
  });

  describe('Search functionality', () => {
    it('should search media contacts', async () => {
      const service = getMediaContactsService();
      const contacts = await service.searchContacts('Test');
      
      expect(contacts).toBeDefined();
      expect(Array.isArray(contacts)).toBe(true);
    });
  });
});