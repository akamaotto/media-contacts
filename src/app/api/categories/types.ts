/**
 * Categories domain types with Zod validation
 */

import { z } from 'zod';
import { CRUDFilters } from '../shared/types';

// Zod schemas for validation
export const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  beatCount: z.number().optional(),
  outletCount: z.number().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const CreateCategoryDataSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Color must be a valid hex color (e.g., #3B82F6)").optional(),
});

export const UpdateCategoryDataSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters").optional(),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Color must be a valid hex color (e.g., #3B82F6)").optional(),
});

export const CategoriesFiltersSchema = z.object({
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  hasBeats: z.boolean().optional(),
  hasOutlets: z.boolean().optional(),
});

// Inferred types
export type Category = z.infer<typeof CategorySchema>;
export type CreateCategoryData = z.infer<typeof CreateCategoryDataSchema>;
export type UpdateCategoryData = z.infer<typeof UpdateCategoryDataSchema>;
export type CategoriesFilters = z.infer<typeof CategoriesFiltersSchema> & CRUDFilters;