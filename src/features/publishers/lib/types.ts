
import { Prisma } from '@prisma/client';

export interface Publisher {
  id: string;
  name: string;
  description: string | null;
  website: string | null;
  outletCount?: number; // Added for aggregated data
}

export type PublisherWithOutletsCount = Prisma.publishersGetPayload<{
  include: { _count: { select: { outlets: true } } };
}>;
