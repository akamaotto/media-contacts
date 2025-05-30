"use server";

import { prisma } from "@/lib/prisma";

export interface Country {
  id: string;
  name: string;
  code?: string | null;
}

export async function getCountries(): Promise<Country[]> {
  try {
    const countries = await prisma.country.findMany({
      select: {
        id: true,
        name: true,
        code: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
    return countries;
  } catch (error) {
    console.error("Failed to fetch countries:", error);
    return []; 
  }
}
