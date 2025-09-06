/**
 * Outlets Feature Types
 * Following the established pattern from beats and categories
 */

import { description } from '@/components/chart-area-interactive';
import { z } from 'zod';

// Category schema for outlets
export const OutletCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  color: z.string().nullable(),
  description: z.string().nullable(),
});

// Country schema for outlets
export const OutletCountrySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  code: z.string().nullable(),
  flag_emoji: z.string().nullable(),
});

// Publisher schema for outlets
export const OutletPublisherSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  website: z.string().nullable(),
});

// Base entity schema
export const OutletSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  website: z.string().nullable(),
  publisherId: z.string().uuid().nullable(),
  publisher: OutletPublisherSchema.nullable().optional(),
  categories: z.array(OutletCategorySchema).optional(),
  countries: z.array(OutletCountrySchema).optional(),
  contactCount: z.number().optional(),
  updatedAt: z.string(),
});

// Create data schema
export const CreateOutletDataSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  publisherId: z.string().uuid('Invalid publisher ID format').optional(),
  categoryIds: z.array(z.string().uuid('Invalid category ID format')).optional(),
  countryIds: z.array(z.string().uuid('Invalid country ID format')).optional(),
});

// Update data schema
export const UpdateOutletDataSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters').optional(),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  publisherId: z.string().uuid('Invalid publisher ID format').optional().nullable(),
  categoryIds: z.array(z.string().uuid('Invalid category ID format')).optional(),
  countryIds: z.array(z.string().uuid('Invalid country ID format')).optional(),
});

// Filters schema extending base CRUDFilters
export const OutletsFiltersSchema = z.object({
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  publisherId: z.string().uuid().optional(),
  categoryIds: z.array(z.string().uuid()).optional(),
  countryIds: z.array(z.string().uuid()).optional(),
  hasContacts: z.boolean().optional(),
  hasPublisher: z.boolean().optional(),
});

// Inferred types
export type OutletCategory = z.infer<typeof OutletCategorySchema>;
export type OutletCountry = z.infer<typeof OutletCountrySchema>;
export type OutletPublisher = z.infer<typeof OutletPublisherSchema>;
export type Outlet = z.infer<typeof OutletSchema>;
export type CreateOutletData = z.infer<typeof CreateOutletDataSchema>;
export type UpdateOutletData = z.infer<typeof UpdateOutletDataSchema>;
export type OutletsFilters = z.infer<typeof OutletsFiltersSchema>;