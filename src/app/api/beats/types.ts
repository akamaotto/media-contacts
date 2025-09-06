/**
 * Beats domain types with Zod validation
 */

import { z } from 'zod';
import { CRUDFilters } from '../shared/types';

// Zod schemas for validation
export const BeatCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

export const BeatCountrySchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string().nullable().optional(),
  flag_emoji: z.string().nullable().optional(),
});

export const BeatSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  categories: z.array(BeatCategorySchema).optional(),
  countries: z.array(BeatCountrySchema).optional(),
  contactCount: z.number().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const CreateBeatDataSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name must be less than 255 characters"),
  description: z.string().max(1000, "Description must be less than 1000 characters").optional(),
  categoryIds: z.array(z.string().uuid("Invalid category ID format")).optional(),
  countryIds: z.array(z.string().uuid("Invalid country ID format")).optional(),
});

export const UpdateBeatDataSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name must be less than 255 characters").optional(),
  description: z.string().max(1000, "Description must be less than 1000 characters").optional(),
  categoryIds: z.array(z.string().uuid("Invalid category ID format")).optional(),
  countryIds: z.array(z.string().uuid("Invalid country ID format")).optional(),
});

// Create a Zod schema for CRUDFilters
export const CRUDFiltersSchema = z.object({
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const BeatsFiltersSchema = CRUDFiltersSchema.extend({
  categoryIds: z.array(z.string().uuid("Invalid category ID format")).optional(),
  countryIds: z.array(z.string().uuid("Invalid country ID format")).optional(),
  hasContacts: z.boolean().optional(),
});

// Inferred types (for backward compatibility and type annotations)
export type BeatCategory = z.infer<typeof BeatCategorySchema>;
export type BeatCountry = z.infer<typeof BeatCountrySchema>;
export type Beat = z.infer<typeof BeatSchema>;
export type CreateBeatData = z.infer<typeof CreateBeatDataSchema>;
export type UpdateBeatData = z.infer<typeof UpdateBeatDataSchema>;
export type BeatsFilters = z.infer<typeof BeatsFiltersSchema>;