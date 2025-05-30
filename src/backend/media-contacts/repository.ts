import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { MediaContactTableItem } from '@/components/media-contacts/columns';

const mediaContactFullSelect = {
  id: true,
  name: true,
  email: true,
  title: true,
  email_verified_status: true,
  updated_at: true,
  outlets: { select: { id: true, name: true } },
  countries: { select: { id: true, name: true } },
  beats: { select: { id: true, name: true } },
  bio: true,
  socials: true,
} satisfies Prisma.MediaContactSelect;

export async function getMediaContactsFromDb(): Promise<MediaContactTableItem[]> {
  try {
    const contacts = await prisma.mediaContact.findMany({
      select: mediaContactFullSelect,
      orderBy: { updated_at: 'desc' },
      take: 100,
    });
    return contacts as unknown as MediaContactTableItem[];
  } catch (error) {
    console.error("Failed to fetch media contacts from DB:", error);
    throw new Error("Could not fetch media contacts from the database.");
  }
}

export type UpsertMediaContactData = {
  id?: string;
  name: string;
  email: string;
  title: string;
  email_verified_status?: boolean | null;
  bio?: string | null;
  socials?: string[] | null;
  outlets?: string[]; // Changed from outletIds to outlets (array of names)
  countryIds?: string[];
  beats?: string[]; // Changed from beatIds to beats (array of names)
};

export async function upsertMediaContactInDb(
  data: UpsertMediaContactData
): Promise<MediaContactTableItem> {
  const { id, outlets, countryIds, beats, ...scalarData } = data;

  // Operations for outlets (array of names)
  const outletOperations = outlets?.map(name => ({
    where: { name }, // Assumes 'name' is unique on Outlet model
    create: { name },
  }));

  // Operations for beats (array of names)
  const beatOperations = beats?.map(name => ({
    where: { name }, // Assumes 'name' is unique on Beat model
    create: { name },
  }));

  const countryConnections = countryIds?.map((cid) => ({ id: cid }));

  const prismaScalarData: Omit<Prisma.MediaContactUncheckedCreateInput, 'id' | 'outlets' | 'countries' | 'beats' | 'updated_at' | 'created_at'> = {
    ...scalarData,
    email_verified_status: scalarData.email_verified_status === null ? undefined : scalarData.email_verified_status,
    bio: scalarData.bio === null ? undefined : scalarData.bio,
    socials: scalarData.socials === null ? undefined : scalarData.socials,
  };

  try {
    const upsertedContact = await prisma.mediaContact.upsert({
      where: id ? { id: id } : { email: data.email },
      create: {
        ...prismaScalarData,
        outlets: outletOperations ? { connectOrCreate: outletOperations } : undefined,
        countries: countryConnections ? { connect: countryConnections } : undefined,
        beats: beatOperations ? { connectOrCreate: beatOperations } : undefined,
      },
      update: {
        ...prismaScalarData,
        outlets: outletOperations ? { set: [], connectOrCreate: outletOperations } : { set: [] }, // Clear existing and connect/create new
        countries: countryConnections ? { set: countryConnections } : { set: [] },
        beats: beatOperations ? { set: [], connectOrCreate: beatOperations } : { set: [] }, // Clear existing and connect/create new
      },
      select: mediaContactFullSelect,
    });
    return upsertedContact as unknown as MediaContactTableItem;
  } catch (error) {
    console.error("Error upserting media contact in DB:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = error.meta?.target as string[] | string | undefined;
        const fields = Array.isArray(target) ? target.join(', ') : target;
        throw new Error(`A contact with this information already exists (e.g., email or other unique field: ${fields || 'unknown'}).`);
      }
    }
    throw new Error("Could not upsert media contact in the database.");
  }
}