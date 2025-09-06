
"use server";
import { prisma } from "@/lib/database/prisma";
import { cacheService, CacheKeys, CacheExpiration } from '@/lib/caching/cache'; // Assuming cache service is available

// This file consolidates all data-fetching logic for the dashboard from the old
// `admin.ts`, `charts.ts`, and `metrics.ts` files.

// --- Types (could be moved to a types.ts file if they grow) ---

export interface DashboardMetrics {
  totalContacts: number;
  totalPublishers: number;
  totalOutlets: number;
  verifiedContacts: number;
  emailVerificationRate: number;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

// --- Queries ---

export async function getDashboardMetrics() {
    const cacheKey = CacheKeys.dashboardMetrics('30d');
    const cached = await cacheService.get<DashboardMetrics>(cacheKey);
    if (cached) return cached;

    const [totalContacts, totalPublishers, totalOutlets, verifiedContacts] = await prisma.$transaction([
        prisma.media_contacts.count(),
        prisma.publishers.count(),
        prisma.outlets.count(),
        prisma.media_contacts.count({ where: { email_verified_status: true } })
    ]);

    const metrics = {
        totalContacts,
        totalPublishers,
        totalOutlets,
        verifiedContacts,
        emailVerificationRate: totalContacts > 0 ? Math.round((verifiedContacts / totalContacts) * 100) : 0,
    };

    await cacheService.set(cacheKey, metrics, CacheExpiration.METRICS);
    return metrics;
}

export async function getContactsByCountryChart(): Promise<ChartDataPoint[]> {
    const cacheKey = CacheKeys.contactsByCountry('1y');
    const cached = await cacheService.get<ChartDataPoint[]>(cacheKey);
    if (cached) return cached;

    const result = await prisma.countries.findMany({
        select: { name: true, _count: { select: { media_contacts: true } } },
        orderBy: { media_contacts: { _count: 'desc' } },
        take: 10,
    });

    const chartData = result.map(r => ({ label: r.name, value: r._count.media_contacts }));
    await cacheService.set(cacheKey, chartData, CacheExpiration.CHARTS);
    return chartData;
}

export async function getContactsByBeatChart(): Promise<ChartDataPoint[]> {
    const cacheKey = CacheKeys.contactsByBeat('1y');
    const cached = await cacheService.get<ChartDataPoint[]>(cacheKey);
    if (cached) return cached;

    const result = await prisma.beats.findMany({
        select: { name: true, _count: { select: { media_contacts: true } } },
        orderBy: { media_contacts: { _count: 'desc' } },
        take: 10,
    });

    const chartData = result.map(r => ({ label: r.name, value: r._count.media_contacts }));
    await cacheService.set(cacheKey, chartData, CacheExpiration.CHARTS);
    return chartData;
}

export async function getEmailVerificationChart(): Promise<ChartDataPoint[]> {
    const [verified, unverified] = await prisma.$transaction([
        prisma.media_contacts.count({ where: { email_verified_status: true } }),
        prisma.media_contacts.count({ where: { email_verified_status: false } })
    ]);

    return [
        { label: 'Verified', value: verified, color: '#10B981' },
        { label: 'Unverified', value: unverified, color: '#EF4444' },
    ];
}
