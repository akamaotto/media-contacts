/**
 * Publishers Feature Types
 * Following the established pattern from beats and categories
 */

import { z } from 'zod';

// Base entity schema
export const PublisherSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  website: z.string().nullable(),
  outlets: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    website: z.string().nullable(),
  })).optional(),
  outletCount: z.number().optional(),
  updatedAt: z.string(),
});

// Create data schema
export const CreatePublisherDataSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  website: z.string().url("Invalid website URL").optional().or(z.literal("")),
  outletIds: z.array(z.string().uuid("Invalid outlet ID format")).optional(),
});

// Update data schema
export const UpdatePublisherDataSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters").optional(),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  website: z.string().url("Invalid website URL").optional().or(z.literal("")),
  outletIds: z.array(z.string().uuid("Invalid outlet ID format")).optional(),
});

// Filters schema extending base CRUDFilters
export const PublishersFiltersSchema = z.object({
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  hasOutlets: z.boolean().optional(),
});

// Inferred types
export type Publisher = z.infer<typeof PublisherSchema>;
export type CreatePublisherData = z.infer<typeof CreatePublisherDataSchema>;
export type UpdatePublisherData = z.infer<typeof UpdatePublisherDataSchema>;
export type PublishersFilters = z.infer<typeof PublishersFiltersSchema>;