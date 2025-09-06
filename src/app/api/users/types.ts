/**
 * User API Types
 * Following repository pattern standards with Zod validation
 */

import * as z from 'zod';
import { CRUDFilters } from '../shared/types';

// Zod schemas for validation - following memory specification requirement
export const CreateUserSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  role: z.enum(["USER", "ADMIN"]).default("USER"),
});

export const UpdateUserSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }).optional(),
  email: z.string().email({ message: "Invalid email address." }).optional(),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }).optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
});

export const UpdateProfileSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, { message: "Password must be at least 6 characters." }).optional(),
}).refine(data => !data.newPassword || !!data.currentPassword, {
    message: "Current password is required to set a new password.",
    path: ["currentPassword"],
});

export const UserFiltersSchema = z.object({
  search: z.string().optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// Types derived from schemas
export type CreateUserData = z.infer<typeof CreateUserSchema>;
export type UpdateUserData = z.infer<typeof UpdateUserSchema>;
export type UpdateProfileData = z.infer<typeof UpdateProfileSchema>;
export type UserFilters = z.infer<typeof UserFiltersSchema> & CRUDFilters;

// Entity types
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithPassword extends User {
  hashedPassword: string;
}

// API Response types
export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

// Custom error for the user domain
export class UserError extends Error {
  constructor(
    message: string,
    public type: UserErrorType,
    public originalError?: unknown
  ) {
    super(message);
    this.name = "UserError";
  }
}

export enum UserErrorType {
  NOT_FOUND = "NOT_FOUND",
  DUPLICATE_EMAIL = "DUPLICATE_EMAIL", 
  INVALID_PASSWORD = "INVALID_PASSWORD",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  DATABASE_ERROR = "DATABASE_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
}