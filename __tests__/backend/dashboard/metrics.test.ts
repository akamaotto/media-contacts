import { DashboardMetricsService } from '@/backend/dashboard/metrics';
import { prisma } from '@/lib/prisma';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    mediaContact: {
      count: jest.fn()
    },
    publisher: {
      count: jest.fn()
    },
    outlet: {
      count: jest.fn()
    },
    dashboardMetric: {
      create: jest.fn(),
      findFirst: jest.fn()
    }
  }
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('DashboardMetricsService', () => {
  let service: DashboardMetricsService;

  beforeEach(() => {
    service = new DashboardMetricsService();
    jest.clearAllMocks();
  });

  describe('getTotalContacts', () => {
    it('should return total number of media contacts', async () => {
      mockPrisma.mediaContact.count.mockResolvedValue(150);

      const result = await service.getTotalContacts();

      expect(result).toBe(150);
      expect(mockPrisma.mediaContact.count).toHaveBeenCalledWith();
    });
  });

  describe('getTotalPublishers', () => {
    it('should return total number of publishers', async () => {
      mockPrisma.publisher.count.mockResolvedValue(25);

      const result = await service.getTotalPublishers();

      expect(result).toBe(25);
      expect(mockPrisma.publisher.count).toHaveBeenCalledWith();
    });
  });

  describe('getTotalOutlets', () => {
    it('should return total number of outlets', async () => {
      mockPrisma.outlet.count.mockResolvedValue(75);

      const result = await service.getTotalOutlets();

      expect(result).toBe(75);
      expect(mockPrisma.outlet.count).toHaveBeenCalledWith();
    });
  });

  describe('getVerifiedContacts', () => {
    it('should return number of verified email contacts', async () => {
      mockPrisma.mediaContact.count.mockResolvedValue(120);

      const result = await service.getVerifiedContacts();

      expect(result).toBe(120);
      expect(mockPrisma.mediaContact.count).toHaveBeenCalledWith({
        where: {
          email_verified_status: true
        }
      });
    });
  });

  describe('getDashboardMetrics', () => {
    it('should return dashboard metrics with percentage changes', async () => {
      // Mock current counts
      mockPrisma.mediaContact.count
        .mockResolvedValueOnce(150) // total contacts
        .mockResolvedValueOnce(120); // verified contacts
      mockPrisma.publisher.count.mockResolvedValue(25);
      mockPrisma.outlet.count.mockResolvedValue(75);

      // Mock historical data
      mockPrisma.dashboardMetric.findFirst
        .mockResolvedValueOnce({ id: '1', metricType: 'total_contacts', value: 140, date: new Date(), metadata: null })
        .mockResolvedValueOnce({ id: '2', metricType: 'total_publishers', value: 20, date: new Date(), metadata: null })
        .mockResolvedValueOnce({ id: '3', metricType: 'total_outlets', value: 70, date: new Date(), metadata: null })
        .mockResolvedValueOnce({ id: '4', metricType: 'verified_contacts', value: 100, date: new Date(), metadata: null });

      const result = await service.getDashboardMetrics('30d');

      expect(result).toEqual({
        totalContacts: 150,
        totalPublishers: 25,
        totalOutlets: 75,
        emailVerificationRate: 80, // 120/150 * 100
        contactsChange: {
          value: 10, // 150 - 140
          percentage: 7, // (10/140) * 100
          period: 'Last 30 days'
        },
        publishersChange: {
          value: 5, // 25 - 20
          percentage: 25, // (5/20) * 100
          period: 'Last 30 days'
        },
        outletsChange: {
          value: 5, // 75 - 70
          percentage: 7, // (5/70) * 100
          period: 'Last 30 days'
        },
        verificationChange: {
          value: 9, // 80 - 71 (100/140 * 100)
          percentage: 13, // (9/71) * 100
          period: 'Last 30 days'
        }
      });
    });

    it('should handle zero division in email verification rate', async () => {
      mockPrisma.mediaContact.count
        .mockResolvedValueOnce(0) // total contacts
        .mockResolvedValueOnce(0); // verified contacts
      mockPrisma.publisher.count.mockResolvedValue(0);
      mockPrisma.outlet.count.mockResolvedValue(0);
      
      // Mock historical data
      mockPrisma.dashboardMetric.findFirst.mockResolvedValue(null);

      const result = await service.getDashboardMetrics();

      expect(result.emailVerificationRate).toBe(0);
    });

    it('should handle missing historical data', async () => {
      mockPrisma.mediaContact.count
        .mockResolvedValueOnce(150) // total contacts
        .mockResolvedValueOnce(120); // verified contacts
      mockPrisma.publisher.count.mockResolvedValue(25);
      mockPrisma.outlet.count.mockResolvedValue(75);
      
      mockPrisma.dashboardMetric.findFirst.mockResolvedValue(null);

      const result = await service.getDashboardMetrics();

      expect(result.contactsChange.value).toBe(150); // current - 0
      expect(result.contactsChange.percentage).toBe(0); // no historical data
    });
  });

  describe('storeCurrentMetrics', () => {
    it('should store current metrics in database', async () => {
      mockPrisma.mediaContact.count
        .mockResolvedValueOnce(150) // total contacts
        .mockResolvedValueOnce(120); // verified contacts
      mockPrisma.publisher.count.mockResolvedValue(25);
      mockPrisma.outlet.count.mockResolvedValue(75);
      mockPrisma.dashboardMetric.create.mockResolvedValue({
        id: '1',
        metricType: 'total_contacts',
        value: 150,
        date: new Date(),
        metadata: null
      });

      await service.storeCurrentMetrics();

      expect(mockPrisma.dashboardMetric.create).toHaveBeenCalledTimes(4);
      expect(mockPrisma.dashboardMetric.create).toHaveBeenCalledWith({
        data: { metricType: 'total_contacts', value: 150 }
      });
      expect(mockPrisma.dashboardMetric.create).toHaveBeenCalledWith({
        data: { metricType: 'total_publishers', value: 25 }
      });
      expect(mockPrisma.dashboardMetric.create).toHaveBeenCalledWith({
        data: { metricType: 'total_outlets', value: 75 }
      });
      expect(mockPrisma.dashboardMetric.create).toHaveBeenCalledWith({
        data: { metricType: 'verified_contacts', value: 120 }
      });
    });
  });

  describe('period calculations', () => {
    it('should handle different time periods for 7 days', async () => {
      mockPrisma.mediaContact.count
        .mockResolvedValueOnce(150) // total contacts
        .mockResolvedValueOnce(120); // verified contacts
      mockPrisma.publisher.count.mockResolvedValue(25);
      mockPrisma.outlet.count.mockResolvedValue(75);
      mockPrisma.dashboardMetric.findFirst.mockResolvedValue({
        id: '1',
        metricType: 'total_contacts',
        value: 140,
        date: new Date(),
        metadata: null
      });

      const result7d = await service.getDashboardMetrics('7d');
      expect(result7d.contactsChange.period).toBe('Last 7 days');
    });

    it('should handle different time periods for 3 months', async () => {
      mockPrisma.mediaContact.count
        .mockResolvedValueOnce(150) // total contacts
        .mockResolvedValueOnce(120); // verified contacts
      mockPrisma.publisher.count.mockResolvedValue(25);
      mockPrisma.outlet.count.mockResolvedValue(75);
      mockPrisma.dashboardMetric.findFirst.mockResolvedValue({
        id: '1',
        metricType: 'total_contacts',
        value: 140,
        date: new Date(),
        metadata: null
      });

      const result3m = await service.getDashboardMetrics('3m');
      expect(result3m.contactsChange.period).toBe('Last 3 months');
    });
  });
});