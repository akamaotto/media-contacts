/**
 * Regions domain types with Zod validation
 */

import { z } from 'zod';
import { CRUDFilters } from '../shared/types';

// Zod schemas for validation
export const RegionSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  category: z.string(),
  parentCode: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  countryCount: z.number().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const CreateRegionDataSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name must be less than 255 characters"),
  code: z.string().regex(/^[A-Z0-9_]+$/, "Code must contain only uppercase letters, numbers, and underscores"),
  category: z.string().min(1, "Category is required"),
  parentCode: z.string().optional(),
  description: z.string().max(1000, "Description must be less than 1000 characters").optional(),
});

export const UpdateRegionDataSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name must be less than 255 characters").optional(),
  category: z.string().min(1, "Category is required").optional(),
  parentCode: z.string().optional(),
  description: z.string().max(1000, "Description must be less than 1000 characters").optional(),
});

// Create a Zod schema for CRUDFilters
export const CRUDFiltersSchema = z.object({
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const RegionsFiltersSchema = CRUDFiltersSchema.extend({
  category: z.string().optional(),
  hasCountries: z.boolean().optional(),
});

// Inferred types (for backward compatibility and type annotations)
export type Region = z.infer<typeof RegionSchema>;
export type CreateRegionData = z.infer<typeof CreateRegionDataSchema>;
export type UpdateRegionData = z.infer<typeof UpdateRegionDataSchema>;
export type RegionsFilters = z.infer<typeof RegionsFiltersSchema>;