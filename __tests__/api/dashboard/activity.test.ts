import { NextRequest } from 'next/server';
import { GET } from '@/app/api/dashboard/activity/route';
import { auth } from '@/lib/auth';
import { activityTrackingService } from '@/backend/dashboard/activity';

// Mock the auth function
jest.mock('@/lib/auth');
const mockAuth = auth as jest.MockedFunction<typeof auth>;

// Mock the activity tracking service
jest.mock('@/backend/dashboard/activity');
const mockActivityService = activityTrackingService as jest.Mocked<typeof activityTrackingService>;

describe('/api/dashboard/activity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/dashboard/activity');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return activities for authenticated user', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user1', email: 'test@example.com' },
    } as any);

    const mockActivities = {
      activities: [
        {
          id: '1',
          type: 'create' as const,
          entity: 'beat' as const,
          entityName: 'Technology',
          user: { name: 'John Doe', email: 'john@example.com' },
          timestamp: new Date('2025-01-01T10:00:00Z'),
          details: { description: 'Tech beat' },
        },
        {
          id: '2',
          type: 'update' as const,
          entity: 'category' as const,
          entityName: 'Business',
          user: { name: 'Jane Smith', email: 'jane@example.com' },
          timestamp: new Date('2025-01-01T09:00:00Z'),
          details: { color: '#EF4444' },
        },
      ],
      totalCount: 2,
      hasMore: false,
    };

    mockActivityService.getRecentActivities.mockResolvedValue(mockActivities);

    const request = new NextRequest('http://localhost:3000/api/dashboard/activity?limit=20&offset=0');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.activities).toHaveLength(2);
    expect(data.totalCount).toBe(2);
    expect(data.hasMore).toBe(false);
    expect(data.activities[0].type).toBe('create');
    expect(data.activities[0].entity).toBe('beat');
    expect(data.activities[0].entityName).toBe('Technology');
  });

  it('should handle query parameters correctly', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user1', email: 'test@example.com' },
    } as any);

    mockActivityService.getRecentActivities.mockResolvedValue({
      activities: [],
      totalCount: 0,
      hasMore: false,
    });

    const request = new NextRequest('http://localhost:3000/api/dashboard/activity?limit=10&offset=5&type=create&entity=beat');
    const response = await GET(request);

    expect(mockActivityService.getRecentActivities).toHaveBeenCalledWith(
      10,
      5,
      {
        type: 'create',
        entity: 'beat',
      }
    );
  });

  it('should validate type parameter', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user1', email: 'test@example.com' },
    } as any);

    const request = new NextRequest('http://localhost:3000/api/dashboard/activity?type=invalid');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid type');
  });

  it('should validate entity parameter', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user1', email: 'test@example.com' },
    } as any);

    const request = new NextRequest('http://localhost:3000/api/dashboard/activity?entity=invalid');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid entity');
  });

  it('should handle service errors gracefully', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user1', email: 'test@example.com' },
    } as any);

    mockActivityService.getRecentActivities.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/dashboard/activity');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch activity data');
  });
});