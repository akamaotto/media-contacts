
import * as z from "zod";

// Reusable validation schemas for the user domain
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
  role: z.enum(["USER", "ADMIN"]).optional(),
  search: z.string().optional(),
});

// Types for function parameters and return values
export type UserFilters = z.infer<typeof UserFiltersSchema>;
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

export interface UserActionResult {
  success: boolean;
  message?: string;
  error?: string;
  issues?: z.ZodIssue[];
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
}
