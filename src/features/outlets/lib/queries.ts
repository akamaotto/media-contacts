"use server";
import { prisma } from "@/lib/database/prisma";

export async function getOutlets(options: {
    page?: number;
    pageSize?: number;
    search?: string;
} = {}) {
    const { page = 1, pageSize = 10, search } = options;
    const skip = (page - 1) * pageSize;

    const where = search ? {
        name: { contains: search.trim(), mode: 'insensitive' as const }
    } : {};

    const [outlets, totalCount] = await Promise.all([
        prisma.outlets.findMany({
            where,
            include: { publishers: true, categories: true, countries: true, _count: { select: { media_contacts: true } } },
            orderBy: { name: 'asc' },
            skip,
            take: pageSize,
        }),
        prisma.outlets.count({ where })
    ]);

    return {
        data: outlets,
        totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize)
    };
}

export async function searchOutlets(query: string) {
    if (!query || query.trim().length < 2) return [];
    return prisma.outlets.findMany({
        where: { name: { contains: query.trim(), mode: 'insensitive' } },
        select: { id: true, name: true, website: true },
        orderBy: { name: 'asc' },
        take: 10,
    });
}