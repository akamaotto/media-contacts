/**
 * Countries domain types with Zod validation
 */

import { z } from 'zod';
import { CRUDFilters } from '../shared/types';

// Zod schemas for validation
export const CountryRegionSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  category: z.string(),
});

export const CountryLanguageSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
});

export const CountryBeatSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
});

export const CountrySchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string().nullable().optional(),
  capital: z.string().nullable().optional(),
  flag_emoji: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  phone_code: z.string().nullable().optional(),
  regions: z.array(CountryRegionSchema).optional(),
  languages: z.array(CountryLanguageSchema).optional(),
  beats: z.array(CountryBeatSchema).optional(),
  contactCount: z.number().optional(),
  outletCount: z.number().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const CreateCountryDataSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name must be less than 255 characters"),
  code: z.string().min(2, "Country code must be at least 2 characters").max(3, "Country code must be less than 3 characters").optional(),
  capital: z.string().max(255, "Capital must be less than 255 characters").optional(),
  flag_emoji: z.string().max(10, "Flag emoji must be less than 10 characters").optional(),
  latitude: z.number().min(-90, "Latitude must be between -90 and 90").max(90, "Latitude must be between -90 and 90").optional(),
  longitude: z.number().min(-180, "Longitude must be between -180 and 180").max(180, "Longitude must be between -180 and 180").optional(),
  phone_code: z.string().max(10, "Phone code must be less than 10 characters").optional(),
  regionIds: z.array(z.string().uuid("Invalid region ID format")).optional(),
  languageIds: z.array(z.string().uuid("Invalid language ID format")).optional(),
  beatIds: z.array(z.string().uuid("Invalid beat ID format")).optional(),
});

export const UpdateCountryDataSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name must be less than 255 characters").optional(),
  code: z.string().min(2, "Country code must be at least 2 characters").max(3, "Country code must be less than 3 characters").optional(),
  capital: z.string().max(255, "Capital must be less than 255 characters").optional(),
  flag_emoji: z.string().max(10, "Flag emoji must be less than 10 characters").optional(),
  latitude: z.number().min(-90, "Latitude must be between -90 and 90").max(90, "Latitude must be between -90 and 90").optional(),
  longitude: z.number().min(-180, "Longitude must be between -180 and 180").max(180, "Longitude must be between -180 and 180").optional(),
  phone_code: z.string().max(10, "Phone code must be less than 10 characters").optional(),
  regionIds: z.array(z.string().uuid("Invalid region ID format")).optional(),
  languageIds: z.array(z.string().uuid("Invalid language ID format")).optional(),
  beatIds: z.array(z.string().uuid("Invalid beat ID format")).optional(),
});

// Create a Zod schema for CRUDFilters
export const CRUDFiltersSchema = z.object({
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const CountriesFiltersSchema = CRUDFiltersSchema.extend({
  regionIds: z.array(z.string().uuid("Invalid region ID format")).optional(),
  languageIds: z.array(z.string().uuid("Invalid language ID format")).optional(),
  beatIds: z.array(z.string().uuid("Invalid beat ID format")).optional(),
  hasContacts: z.boolean().optional(),
  hasOutlets: z.boolean().optional(),
});

// Inferred types (for backward compatibility and type annotations)
export type CountryRegion = z.infer<typeof CountryRegionSchema>;
export type CountryLanguage = z.infer<typeof CountryLanguageSchema>;
export type CountryBeat = z.infer<typeof CountryBeatSchema>;
export type Country = z.infer<typeof CountrySchema>;
export type CreateCountryData = z.infer<typeof CreateCountryDataSchema>;
export type UpdateCountryData = z.infer<typeof UpdateCountryDataSchema>;
export type CountriesFilters = z.infer<typeof CountriesFiltersSchema>;