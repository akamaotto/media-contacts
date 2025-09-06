/**
 * User Controller Implementation
 * Handles HTTP requests and responses for user operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { BaseController } from '../shared/base-controller';
import { UserService } from './service';
import { 
  User, 
  CreateUserData, 
  UpdateUserData,
  UpdateProfileData,
  UserFilters,
  CreateUserSchema,
  UpdateUserSchema,
  UpdateProfileSchema,
  UserFiltersSchema,
  UserError,
  UserErrorType 
} from './types';

export class UserController extends BaseController<User, CreateUserData, UpdateUserData, UserFilters> {
  
  constructor(protected service: UserService) {
    super(service);
  }

  /**
   * Parse filters from request
   */
  protected parseFilters(request: NextRequest): UserFilters {
    const { searchParams } = new URL(request.url);
    
    const filters = {
      search: searchParams.get('search') || undefined,
      role: searchParams.get('role') || undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: searchParams.get('sortOrder') as 'asc' | 'desc' || undefined,
    };

    // Validate filters
    const result = UserFiltersSchema.safeParse(filters);
    if (!result.success) {
      throw new UserError("Invalid filter parameters", UserErrorType.VALIDATION_ERROR);
    }

    return result.data;
  }

  /**
   * Parse create data from request body
   */
  protected parseCreateData(body: any): CreateUserData {
    const result = CreateUserSchema.safeParse(body);
    if (!result.success) {
      throw new UserError("Invalid user data", UserErrorType.VALIDATION_ERROR);
    }
    return result.data;
  }

  /**
   * Parse update data from request body
   */
  protected parseUpdateData(body: any): UpdateUserData {
    const result = UpdateUserSchema.safeParse(body);
    if (!result.success) {
      throw new UserError("Invalid user data", UserErrorType.VALIDATION_ERROR);
    }
    return result.data;
  }

  /**
   * Handle profile update requests
   */
  async handleUpdateProfile(request: NextRequest): Promise<NextResponse> {
    return this.handleRequest(async () => {
      const context = await this.getRequestContext(request);
      const body = await request.json();

      // Validate profile data
      const result = UpdateProfileSchema.safeParse(body);
      if (!result.success) {
        return this.errorResponse("Invalid profile data", 400);
      }

      const user = await this.service.updateProfile(result.data, context);

      return this.successResponse(
        { data: user, message: 'Profile updated successfully' }
      );
    });
  }

  /**
   * Handle user authentication requests
   */
  async handleAuthenticate(request: NextRequest): Promise<NextResponse> {
    return this.handleRequest(async () => {
      const body = await request.json();
      const { email, password } = body;

      if (!email || !password) {
        return this.errorResponse("Email and password are required", 400);
      }

      try {
        const user = await this.service.verifyCredentials(email, password);
        return this.successResponse({ data: user });
      } catch (error) {
        if (error instanceof UserError && error.type === UserErrorType.INVALID_PASSWORD) {
          return this.errorResponse("Invalid credentials", 401);
        }
        throw error;
      }
    });
  }

  /**
   * Handle get current user requests
   */
  async handleGetCurrentUser(request: NextRequest): Promise<NextResponse> {
    return this.handleRequest(async () => {
      const context = await this.getRequestContext(request);
      
      if (!context.userId) {
        return this.errorResponse("Authentication required", 401);
      }

      const user = await this.service.getById(context.userId, context);
      
      if (!user) {
        return this.notFoundResponse("User not found");
      }

      return this.successResponse({ data: user });
    });
  }

  /**
   * Custom error handling for user-specific errors
   */
  protected handleError(error: unknown): NextResponse {
    if (error instanceof UserError) {
      switch (error.type) {
        case UserErrorType.NOT_FOUND:
          return this.errorResponse(error.message, 404);
        case UserErrorType.DUPLICATE_EMAIL:
          return this.errorResponse(error.message, 409);
        case UserErrorType.INVALID_PASSWORD:
          return this.errorResponse(error.message, 401);
        case UserErrorType.PERMISSION_DENIED:
          return this.errorResponse(error.message, 403);
        case UserErrorType.VALIDATION_ERROR:
          return this.errorResponse(error.message, 400);
        default:
          return this.errorResponse(error.message, 500);
      }
    }

    // Fall back to base error handling
    return super.handleError(error);
  }
}