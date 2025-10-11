/**
 * Tests for A/B Testing Experiments API Endpoints
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '../experiments/route';

// Mock the dependencies
jest.mock('@/lib/feature-flags/ab-testing-service', () => ({
  abTestingService: {
    getAllExperiments: jest.fn(),
    getExperiment: jest.fn(),
    createExperiment: jest.fn(),
    updateExperiment: jest.fn(),
    deleteExperiment: jest.fn(),
    startExperiment: jest.fn(),
    pauseExperiment: jest.fn(),
    completeExperiment: jest.fn(),
    recordConversion: jest.fn()
  }
}));

jest.mock('@/lib/ab-testing/experiment-config-service', () => ({
  experimentConfigService: {
    getExperiment: jest.fn(),
    createExperiment: jest.fn(),
    updateExperiment: jest.fn(),
    deleteExperiment: jest.fn()
  }
}));

jest.mock('@/lib/analytics/ab-testing-analytics', () => ({
  abTestingAnalytics: {
    analyzeExperiment: jest.fn(),
    generateExperimentReport: jest.fn()
  }
}));

jest.mock('@/lib/ab-testing/experiment-lifecycle-service', () => ({
  experimentLifecycleService: {
    createLifecycleConfig: jest.fn(),
    getLifecycleState: jest.fn()
  }
}));

jest.mock('next-auth', () => ({
  getServerSession: jest.fn()
}));

// Import the mocked modules
import { abTestingService } from '@/lib/feature-flags/ab-testing-service';
import { experimentConfigService } from '@/lib/ab-testing/experiment-config-service';
import { abTestingAnalytics } from '@/lib/analytics/ab-testing-analytics';
import { experimentLifecycleService } from '@/lib/ab-testing/experiment-lifecycle-service';
import { getServerSession } from 'next-auth';

describe('/api/ab-testing/experiments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/ab-testing/experiments', () => {
    test('should return all experiments', async () => {
      // Mock successful authentication
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { email: 'test@example.com' }
      });

      // Mock experiment data
      const mockExperiments = [
        {
          id: 'exp_1',
          name: 'Test Experiment 1',
          description: 'A test experiment',
          status: 'running',
          variants: [],
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'exp_2',
          name: 'Test Experiment 2',
          description: 'Another test experiment',
          status: 'draft',
          variants: [],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      (abTestingService.getAllExperiments as jest.Mock).mockReturnValue(mockExperiments);

      // Create mock request
      const request = new NextRequest('http://localhost:3000/api/ab-testing/experiments');

      // Call the API
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.experiments).toEqual(mockExperiments);
      expect(getServerSession).toHaveBeenCalled();
      expect(abTestingService.getAllExperiments).toHaveBeenCalled();
    });

    test('should filter experiments by status', async () => {
      // Mock successful authentication
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { email: 'test@example.com' }
      });

      // Mock experiment data
      const mockExperiments = [
        {
          id: 'exp_1',
          name: 'Test Experiment 1',
          description: 'A test experiment',
          status: 'running',
          variants: [],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      (abTestingService.getAllExperiments as jest.Mock).mockReturnValue(mockExperiments);

      // Create mock request with status filter
      const request = new NextRequest('http://localhost:3000/api/ab-testing/experiments?status=running');

      // Call the API
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.experiments).toEqual(mockExperiments);
    });

    test('should include analytics when requested', async () => {
      // Mock successful authentication
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { email: 'test@example.com' }
      });

      // Mock experiment data
      const mockExperiments = [
        {
          id: 'exp_1',
          name: 'Test Experiment 1',
          description: 'A test experiment',
          status: 'running',
          variants: [],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      // Mock analytics data
      const mockAnalytics = {
        experimentId: 'exp_1',
        experimentName: 'Test Experiment 1',
        status: 'running',
        variants: [],
        metrics: {
          overallMetrics: {
            totalParticipants: 1000,
            totalConversions: 100,
            overallConversionRate: 0.1
          }
        }
      };

      (abTestingService.getAllExperiments as jest.Mock).mockReturnValue(mockExperiments);
      (abTestingAnalytics.analyzeExperiment as jest.Mock).mockResolvedValue(mockAnalytics);

      // Create mock request with analytics flag
      const request = new NextRequest('http://localhost:3000/api/ab-testing/experiments?includeAnalytics=true');

      // Call the API
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.experiments).toHaveLength(1);
      expect(data.experiments[0].analytics).toEqual(mockAnalytics);
      expect(abTestingAnalytics.analyzeExperiment).toHaveBeenCalledWith('exp_1');
    });

    test('should return 401 for unauthenticated requests', async () => {
      // Mock failed authentication
      (getServerSession as jest.Mock).mockResolvedValue(null);

      // Create mock request
      const request = new NextRequest('http://localhost:3000/api/ab-testing/experiments');

      // Call the API
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(getServerSession).toHaveBeenCalled();
    });

    test('should handle errors gracefully', async () => {
      // Mock successful authentication
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { email: 'test@example.com' }
      });

      // Mock error in getting experiments
      (abTestingService.getAllExperiments as jest.Mock).mockImplementation(() => {
        throw new Error('Database error');
      });

      // Create mock request
      const request = new NextRequest('http://localhost:3000/api/ab-testing/experiments');

      // Call the API
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to get experiments');
    });
  });

  describe('POST /api/ab-testing/experiments', () => {
    test('should create a new experiment', async () => {
      // Mock successful authentication
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { email: 'test@example.com' }
      });

      // Mock experiment creation
      const mockExperimentConfig = {
        id: 'config_1',
        name: 'New Test Experiment',
        description: 'A new test experiment',
        hypothesis: 'This variant will perform better',
        status: 'draft',
        variants: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockExperiment = {
        id: 'exp_1',
        name: 'New Test Experiment',
        description: 'A new test experiment',
        flagId: 'flag_1',
        flagKey: 'new_test_experiment',
        status: 'draft',
        variants: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (experimentConfigService.createExperiment as jest.Mock).mockResolvedValue(mockExperimentConfig);
      (abTestingService.createExperiment as jest.Mock).mockResolvedValue(mockExperiment);

      // Create mock request with experiment data
      const requestBody = {
        name: 'New Test Experiment',
        description: 'A new test experiment',
        hypothesis: 'This variant will perform better',
        flagId: 'flag_1',
        trafficAllocation: 100,
        variants: [
          {
            name: 'Control',
            isControl: true,
            trafficWeight: 50,
            config: {}
          },
          {
            name: 'Variant A',
            isControl: false,
            trafficWeight: 50,
            config: {}
          }
        ]
      };

      const request = new NextRequest('http://localhost:3000/api/ab-testing/experiments', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Call the API
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.experiment).toEqual(mockExperiment);
      expect(experimentConfigService.createExperiment).toHaveBeenCalled();
      expect(abTestingService.createExperiment).toHaveBeenCalled();
    });

    test('should return 400 for missing required fields', async () => {
      // Mock successful authentication
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { email: 'test@example.com' }
      });

      // Create mock request with missing name
      const requestBody = {
        description: 'A test experiment',
        flagId: 'flag_1',
        variants: []
      };

      const request = new NextRequest('http://localhost:3000/api/ab-testing/experiments', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Call the API
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    test('should return 401 for unauthenticated requests', async () => {
      // Mock failed authentication
      (getServerSession as jest.Mock).mockResolvedValue(null);

      // Create mock request
      const requestBody = {
        name: 'Test Experiment',
        flagId: 'flag_1',
        variants: []
      };

      const request = new NextRequest('http://localhost:3000/api/ab-testing/experiments', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Call the API
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    test('should create lifecycle config when provided', async () => {
      // Mock successful authentication
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { email: 'test@example.com' }
      });

      // Mock experiment creation
      const mockExperimentConfig = {
        id: 'config_1',
        name: 'New Test Experiment',
        description: 'A new test experiment',
        hypothesis: 'This variant will perform better',
        status: 'draft',
        variants: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockExperiment = {
        id: 'exp_1',
        name: 'New Test Experiment',
        description: 'A new test experiment',
        flagId: 'flag_1',
        flagKey: 'new_test_experiment',
        status: 'draft',
        variants: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockLifecycleConfig = {
        id: 'lifecycle_1',
        experimentId: 'exp_1',
        autoStart: true,
        autoStop: true,
        autoRollback: false,
        autoRollout: false,
        monitoringConfig: {
          enabled: true,
          metrics: ['conversion_rate'],
          frequency: 60,
          thresholds: {},
          healthChecks: []
        },
        rolloutConfig: {
          enabled: false,
          strategy: 'gradual',
          steps: [],
          autoProgress: false,
          healthThresholds: {}
        },
        stoppingRules: [],
        rollbackTriggers: [],
        notifications: {
          enabled: false,
          channels: [],
          events: [],
          recipients: [],
          templates: {}
        },
        schedule: {
          enabled: false,
          timezone: 'UTC',
          businessHoursOnly: false,
          excludeDates: []
        }
      };

      (experimentConfigService.createExperiment as jest.Mock).mockResolvedValue(mockExperimentConfig);
      (abTestingService.createExperiment as jest.Mock).mockResolvedValue(mockExperiment);
      (experimentLifecycleService.createLifecycleConfig as jest.Mock).mockResolvedValue(mockLifecycleConfig);

      // Create mock request with experiment data and lifecycle config
      const requestBody = {
        name: 'New Test Experiment',
        description: 'A new test experiment',
        hypothesis: 'This variant will perform better',
        flagId: 'flag_1',
        trafficAllocation: 100,
        variants: [
          {
            name: 'Control',
            isControl: true,
            trafficWeight: 50,
            config: {}
          },
          {
            name: 'Variant A',
            isControl: false,
            trafficWeight: 50,
            config: {}
          }
        ],
        lifecycleConfig: {
          autoStart: true,
          autoStop: true,
          monitoringConfig: {
            enabled: true,
            metrics: ['conversion_rate'],
            frequency: 60
          }
        }
      };

      const request = new NextRequest('http://localhost:3000/api/ab-testing/experiments', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Call the API
      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(experimentLifecycleService.createLifecycleConfig).toHaveBeenCalledWith(
        'exp_1',
        expect.objectContaining({
          autoStart: true,
          autoStop: true
        })
      );
    });
  });
});