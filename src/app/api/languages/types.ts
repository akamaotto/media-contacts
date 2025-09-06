/**
 * Languages domain types with Zod validation
 */

import { z } from 'zod';
import { CRUDFilters } from '../shared/types';

// Zod schemas for validation
export const LanguageSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const CreateLanguageDataSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name must be less than 255 characters"),
  code: z.string().min(2, "Code must be at least 2 characters").max(10, "Code must be less than 10 characters"),
});

export const UpdateLanguageDataSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name must be less than 255 characters").optional(),
  code: z.string().min(2, "Code must be at least 2 characters").max(10, "Code must be less than 10 characters").optional(),
});

// Create a Zod schema for CRUDFilters
export const CRUDFiltersSchema = z.object({
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const LanguagesFiltersSchema = CRUDFiltersSchema.extend({
  hasCountries: z.boolean().optional(),
});

// Inferred types (for backward compatibility and type annotations)
export type Language = z.infer<typeof LanguageSchema>;
export type CreateLanguageData = z.infer<typeof CreateLanguageDataSchema>;
export type UpdateLanguageData = z.infer<typeof UpdateLanguageDataSchema>;
export type LanguagesFilters = z.infer<typeof LanguagesFiltersSchema>;