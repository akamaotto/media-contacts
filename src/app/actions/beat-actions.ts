"use server";

import { prisma } from "@/lib/prisma";

export interface Beat {
  id: string;
  name: string;
  description?: string | null;
}

export async function getBeats(): Promise<Beat[]> {
  try {
    const beats = await prisma.beat.findMany({
      select: {
        id: true,
        name: true,
        description: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
    return beats;
  } catch (error) {
    console.error("Failed to fetch beats:", error);
    // In a real app, you might throw a more specific error or return an error object
    return []; // Return empty array on error to prevent UI breakage
  }
}
