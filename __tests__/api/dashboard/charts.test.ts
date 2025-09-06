/** @jest-environment node */
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/dashboard/charts/route';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Mock the auth function
jest.mock('@/lib/auth');
const mockAuth = auth as jest.MockedFunction<typeof auth>;

// Mock prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    mediaContact: {
      findMany: jest.fn(),
    },
  },
}));

describe('/api/dashboard/charts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/dashboard/charts?type=category', { headers: new Headers() });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 400 if chart type is missing', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user1', email: 'test@example.com' },
    } as any);

    const request = new NextRequest('http://localhost:3000/api/dashboard/charts', { headers: new Headers() });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Chart type is required');
  });

  it('should return category chart data for authenticated user', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user1', email: 'test@example.com' },
    } as any);

    // Mock database response
    const mockContacts = [
      {
        id: '1',
        beats: [
          {
            categories: [
              { name: 'Technology', color: '#3B82F6' },
              { name: 'Business', color: '#EF4444' },
            ],
          },
        ],
      },
      {
        id: '2',
        beats: [
          {
            categories: [
              { name: 'Technology', color: '#3B82F6' },
            ],
          },
        ],
      },
    ];

    (prisma.mediaContact.findMany as jest.Mock).mockResolvedValue(mockContacts);

    const request = new NextRequest('http://localhost:3000/api/dashboard/charts?type=category&timeRange=30d', { headers: new Headers() });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.type).toBe('category');
    expect(data.timeRange).toBe('30d');
    expect(data.data).toHaveLength(2);
    expect(data.data[0].label).toBe('Technology');
    expect(data.data[0].value).toBe(2);
    expect(data.data[1].label).toBe('Business');
    expect(data.data[1].value).toBe(1);
  });

  it('should return country chart data for authenticated user', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user1', email: 'test@example.com' },
    } as any);

    // Mock database response
    const mockContacts = [
      {
        id: '1',
        countries: [
          { name: 'United States', code: 'US', flag_emoji: '🇺🇸' },
          { name: 'Canada', code: 'CA', flag_emoji: '🇨🇦' },
        ],
      },
      {
        id: '2',
        countries: [
          { name: 'United States', code: 'US', flag_emoji: '🇺🇸' },
        ],
      },
    ];

    (prisma.mediaContact.findMany as jest.Mock).mockResolvedValue(mockContacts);

    const request = new NextRequest('http://localhost:3000/api/dashboard/charts?type=country&timeRange=7d', { headers: new Headers() });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.type).toBe('country');
    expect(data.timeRange).toBe('7d');
    expect(data.data).toHaveLength(2);
    expect(data.data[0].label).toBe('United States');
    expect(data.data[0].value).toBe(2);
    expect(data.data[1].label).toBe('Canada');
    expect(data.data[1].value).toBe(1);
  });

  it('should handle database errors gracefully', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user1', email: 'test@example.com' },
    } as any);

    (prisma.mediaContact.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/dashboard/charts?type=category', { headers: new Headers() });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch chart data');
  });
});