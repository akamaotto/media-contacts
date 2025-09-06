import { prisma as base } from './database/prisma';

// Widen the export type and provide an alias `mediaContact` expected by tests
// while keeping the underlying Prisma client instance.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const prisma: any = base as any;
if (!(prisma as any).mediaContact && (prisma as any).media_contacts) {
  (prisma as any).mediaContact = (prisma as any).media_contacts;
}
