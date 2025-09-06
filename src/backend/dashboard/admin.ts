import { prisma } from '@/lib/database/prisma';

/**
 * Admin Dashboard Service
 *
 * This service is intentionally minimal. Jest tests mock its methods,
 * but we provide a functional default implementation for runtime.
 */
export const adminDashboardService = {
  /** Check if the given user has admin privileges */
  async isUserAdmin(userId: string): Promise<boolean> {
    try {
      const user = await prisma.users.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      // Use uppercase comparison to align with common role conventions
      return user?.role === 'ADMIN';
    } catch {
      return false;
    }
  },

  /** Fetch admin-focused metrics for the dashboard */
  async getAdminMetrics(): Promise<Record<string, unknown>> {
    try {
      const [totalContacts, totalPublishers, totalOutlets, verifiedContacts] = await prisma.$transaction([
        prisma.media_contacts.count(),
        prisma.publishers.count(),
        prisma.outlets.count(),
        prisma.media_contacts.count({ where: { email_verified_status: true } }),
      ]);

      const emailVerificationRate = totalContacts > 0
        ? Math.round((verifiedContacts / totalContacts) * 100)
        : 0;

      return {
        systemHealth: {
          uptime: Math.floor(process.uptime()),
        },
        databaseMetrics: {
          totalRecords: {
            mediaContacts: totalContacts,
            publishers: totalPublishers,
            outlets: totalOutlets,
          },
        },
        performanceMetrics: {
          averageResponseTime: 0,
          errorRate: { percentage: 0, count: 0, period: '24h' },
        },
        summary: {
          verifiedContacts,
          emailVerificationRate,
        },
      };
    } catch (e) {
      // Propagate so the route returns 500 as expected by tests
      throw e;
    }
  },
};
