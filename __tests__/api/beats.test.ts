import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/beats/route';
import { auth } from '@/lib/auth';
import { getAllBeats, createBeat } from '@/backend/beats/actions';

// Mock the auth function
jest.mock('@/lib/auth');
const mockAuth = auth as jest.MockedFunction<typeof auth>;

// Mock the beats actions
jest.mock('@/backend/beats/actions');
const mockGetAllBeats = getAllBeats as jest.MockedFunction<typeof getAllBeats>;
const mockCreateBeat = createBeat as jest.MockedFunction<typeof createBeat>;

describe('/api/beats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return beats for authenticated user', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user1', email: 'test@example.com' },
      } as any);

      const mockBeats = [
        { id: '1', name: 'Technology', description: 'Tech beat' },
        { id: '2', name: 'Business', description: 'Business beat' },
      ];

      mockGetAllBeats.mockResolvedValue(mockBeats);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockBeats);
    });

    it('should handle service errors gracefully', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user1', email: 'test@example.com' },
      } as any);

      mockGetAllBeats.mockRejectedValue(new Error('Database error'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch beats');
    });
  });

  describe('POST', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/beats', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Beat' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized - Please log in to create beats');
    });

    it('should return 401 if session has no user ID', async () => {
      mockAuth.mockResolvedValue({
        user: { email: 'test@example.com' }, // No ID
      } as any);

      const request = new NextRequest('http://localhost:3000/api/beats', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Beat' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid session - Please log in again');
    });

    it('should return 400 if beat name is missing', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user1', email: 'test@example.com' },
      } as any);

      const request = new NextRequest('http://localhost:3000/api/beats', {
        method: 'POST',
        body: JSON.stringify({ description: 'Test description' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Beat name is required');
    });

    it('should return 400 if categoryIds is not an array', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user1', email: 'test@example.com' },
      } as any);

      const request = new NextRequest('http://localhost:3000/api/beats', {
        method: 'POST',
        body: JSON.stringify({ 
          name: 'Test Beat',
          categoryIds: 'not-an-array'
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Category IDs must be an array');
    });

    it('should create beat successfully', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user1', email: 'test@example.com' },
      } as any);

      const mockBeat = {
        id: '1',
        name: 'Test Beat',
        description: 'Test description',
        categories: [],
      };

      mockCreateBeat.mockResolvedValue(mockBeat);

      const request = new NextRequest('http://localhost:3000/api/beats', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Beat',
          description: 'Test description',
          categoryIds: ['cat1', 'cat2'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.message).toBe('Beat created successfully');
      expect(data.beat).toEqual(mockBeat);
      expect(mockCreateBeat).toHaveBeenCalledWith(
        { name: 'Test Beat', description: 'Test description' },
        ['cat1', 'cat2']
      );
    });

    it('should handle duplicate beat names', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user1', email: 'test@example.com' },
      } as any);

      mockCreateBeat.mockRejectedValue(new Error('Beat with name "Test Beat" already exists'));

      const request = new NextRequest('http://localhost:3000/api/beats', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Beat' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('Beat with name "Test Beat" already exists');
    });

    it('should handle database errors', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user1', email: 'test@example.com' },
      } as any);

      mockCreateBeat.mockRejectedValue(new Error('Prisma connection failed'));

      const request = new NextRequest('http://localhost:3000/api/beats', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Beat' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Database error - Please try again');
    });

    it('should handle unexpected errors', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user1', email: 'test@example.com' },
      } as any);

      mockCreateBeat.mockRejectedValue(new Error('Unexpected error'));

      const request = new NextRequest('http://localhost:3000/api/beats', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Beat' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create beat - Please check your input and try again');
    });
  });
});