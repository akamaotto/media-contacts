/**
 * Media Contacts domain types with Zod validation
 */

import { z } from 'zod';
import { CRUDFilters } from '../shared/types';

// Zod schemas for validation
export const MediaContactOutletSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
});

export const MediaContactCountrySchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string().nullable().optional(),
  flag_emoji: z.string().nullable().optional(),
});

export const MediaContactBeatSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
});

export const MediaContactSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  email: z.string().email(),
  title: z.string().min(1).max(255),
  bio: z.string().nullable().optional(),
  email_verified_status: z.boolean().default(false),
  socials: z.array(z.string()).nullable().optional(),
  authorLinks: z.array(z.string()).nullable().optional(),
  outlets: z.array(MediaContactOutletSchema).optional(),
  countries: z.array(MediaContactCountrySchema).optional(),
  beats: z.array(MediaContactBeatSchema).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const CreateMediaContactDataSchema = z.object({
  name: z.string().min(1).max(255, "Name must be less than 255 characters"),
  email: z.string().email("Invalid email format"),
  title: z.string().min(1).max(255, "Title must be less than 255 characters"),
  bio: z.string().max(2000, "Bio must be less than 2000 characters").nullable().optional(),
  email_verified_status: z.boolean().nullable().optional(),
  socials: z.array(z.string().max(255, "Social link must be less than 255 characters")).nullable().optional(),
  authorLinks: z.array(z.string().max(255, "Author link must be less than 255 characters")).nullable().optional(),
  outletIds: z.array(z.string().uuid("Invalid outlet ID format")).optional(),
  countryIds: z.array(z.string().uuid("Invalid country ID format")).optional(),
  beatIds: z.array(z.string().uuid("Invalid beat ID format")).optional(),
});

export const UpdateMediaContactDataSchema = z.object({
  name: z.string().min(1).max(255, "Name must be less than 255 characters").optional(),
  email: z.string().email("Invalid email format").optional(),
  title: z.string().min(1).max(255, "Title must be less than 255 characters").optional(),
  bio: z.string().max(2000, "Bio must be less than 2000 characters").nullable().optional(),
  email_verified_status: z.boolean().nullable().optional(),
  socials: z.array(z.string().max(255, "Social link must be less than 255 characters")).nullable().optional(),
  authorLinks: z.array(z.string().max(255, "Author link must be less than 255 characters")).nullable().optional(),
  outletIds: z.array(z.string().uuid("Invalid outlet ID format")).optional(),
  countryIds: z.array(z.string().uuid("Invalid country ID format")).optional(),
  beatIds: z.array(z.string().uuid("Invalid beat ID format")).optional(),
});

export const MediaContactsFiltersSchema = z.object({
  search: z.string().optional(),
  countryIds: z.array(z.string().uuid("Invalid country ID format")).optional(),
  beatIds: z.array(z.string().uuid("Invalid beat ID format")).optional(),
  outletIds: z.array(z.string().uuid("Invalid outlet ID format")).optional(),
  regionCodes: z.array(z.string()).optional(),
  languageCodes: z.array(z.string()).optional(),
  emailVerified: z.enum(['all', 'verified', 'unverified']).optional().default('all'),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// Inferred types
export type MediaContactOutlet = z.infer<typeof MediaContactOutletSchema>;
export type MediaContactCountry = z.infer<typeof MediaContactCountrySchema>;
export type MediaContactBeat = z.infer<typeof MediaContactBeatSchema>;
export type MediaContact = z.infer<typeof MediaContactSchema>;
export type CreateMediaContactData = z.infer<typeof CreateMediaContactDataSchema>;
export type UpdateMediaContactData = z.infer<typeof UpdateMediaContactDataSchema>;
export type MediaContactsFilters = z.infer<typeof MediaContactsFiltersSchema> & CRUDFilters;