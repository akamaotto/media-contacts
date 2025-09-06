import { z } from 'zod';
import { MediaContactTableItem } from '@/components/features/media-contacts/types';

// Schemas for validation
export const MediaContactFiltersSchema = z.object({
  searchTerm: z.string().optional(),
  countryIds: z.array(z.string().uuid()).optional(),
  beatIds: z.array(z.string().uuid()).optional(),
  regionCodes: z.array(z.string()).optional(),
  languageCodes: z.array(z.string()).optional(),
  emailVerified: z.enum(['all', 'verified', 'unverified']).optional().default('all'),
  page: z.number().int().min(0).optional().default(0),
  pageSize: z.number().int().min(1).max(50).optional().default(10),
});

export const UpsertMediaContactSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, { message: "Name is required." }),
  email: z.string().email({ message: "Invalid email address." }),
  title: z.string().min(1, { message: "Title is required." }),
  email_verified_status: z.boolean().nullable().optional(),
  bio: z.string().nullable().optional(),
  socials: z.array(z.string()).nullable().optional(),
  authorLinks: z.array(z.string()).nullable().optional(),
  outlets: z.array(z.string()).optional(),
  countryIds: z.array(z.string().uuid()).optional(),
  beats: z.array(z.string()).optional(),
});

export const DeleteMediaContactSchema = z.object({
  id: z.string().min(1, { message: "Contact ID is required" })
});

// Input types inferred from schemas
export type MediaContactFilters = z.infer<typeof MediaContactFiltersSchema>;
export type UpsertMediaContactInput = z.infer<typeof UpsertMediaContactSchema>;

// Action Result Types
export interface PaginatedMediaContactsResult {
  contacts: MediaContactTableItem[];
  totalCount: number;
  error?: string;
  errorType?: string;
}

export interface MediaContactActionResult {
  success: boolean;
  message?: string;
  error?: string;
  issues?: z.ZodIssue[];
  data?: MediaContactTableItem;
}

// Custom Error
export enum MediaContactErrorType {
  DB_NOT_CONNECTED = 'DB_NOT_CONNECTED',
  NO_CONTACTS_FOUND = 'NO_CONTACTS_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class MediaContactError extends Error {
  constructor(message: string, public type: MediaContactErrorType) {
    super(message);
    this.name = 'MediaContactError';
  }
}