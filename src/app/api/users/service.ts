/**
 * User Service Implementation
 * Contains business logic and orchestrates repository operations
 */

import { BaseService } from '../shared/base-service';
import { UserRepository } from './repository';
import { UserEvents } from './events';
import { 
  User, 
  CreateUserData, 
  UpdateUserData, 
  UpdateProfileData,
  UserFilters, 
  UserError, 
  UserErrorType 
} from './types';
import { PaginatedResult, RequestContext } from '../shared/types';

export class UserService implements BaseService<User, CreateUserData, UpdateUserData, UserFilters> {
  
  constructor(
    protected repository: UserRepository,
    protected events: UserEvents
  ) {}

  /**
   * Get all users with admin permission check
   */
  async getAll(
    filters: UserFilters = {}, 
    pagination: { page?: number; pageSize?: number } = {}, 
    context: RequestContext
  ): Promise<PaginatedResult<User>> {
    // Check admin permission
    this.checkAdminPermission(context);

    const { page = 1, pageSize = 10 } = pagination;
    
    await this.events.beforeGetAll({ filters, pagination, context });
    
    const result = await this.repository.getAll(filters, page, pageSize, context);
    
    await this.events.afterGetAll({ 
      filters, 
      pagination, 
      context, 
      result: result.data 
    });
    
    return result;
  }

  /**
   * Get user by ID with permission check
   */
  async getById(id: string, context: RequestContext): Promise<User | null> {
    // Users can view their own profile, admins can view any
    if (context.userId !== id) {
      this.checkAdminPermission(context);
    }

    await this.events.beforeGetById({ id, context });
    
    const user = await this.repository.getById(id, context);
    
    if (user) {
      await this.events.afterGetById({ id, context, result: user });
    }
    
    return user;
  }

  /**
   * Create new user (admin only)
   */
  async create(data: CreateUserData, context: RequestContext): Promise<User> {
    // Only admins can create users
    this.checkAdminPermission(context);

    await this.events.beforeCreate({ data, context });
    
    const user = await this.repository.create(data, context);
    
    await this.events.afterCreate({ data, context, result: user });
    
    return user;
  }

  /**
   * Update user (admin only, or self for limited fields)
   */
  async update(id: string, data: UpdateUserData, context: RequestContext): Promise<User> {
    // Check permissions - admins can update anyone, users can only update themselves (limited)
    if (context.userId !== id) {
      this.checkAdminPermission(context);
    } else {
      // Users can only update their own name and password, not role or email
      if (data.role !== undefined || data.email !== undefined) {
        throw new UserError(
          "Users can only update their own name and password",
          UserErrorType.PERMISSION_DENIED
        );
      }
    }

    await this.events.beforeUpdate({ id, data, context });
    
    const user = await this.repository.update(id, data, context);
    
    await this.events.afterUpdate({ id, data, context, result: user });
    
    return user;
  }

  /**
   * Delete user (admin only with restrictions)
   */
  async delete(id: string, context: RequestContext): Promise<void> {
    // Only admins can delete users
    this.checkAdminPermission(context);

    // Cannot delete yourself
    if (context.userId === id) {
      throw new UserError("Cannot delete yourself", UserErrorType.PERMISSION_DENIED);
    }

    await this.events.beforeDelete({ id, context });
    
    await this.repository.delete(id, context);
    
    await this.events.afterDelete({ id, context });
  }

  /**
   * Update current user profile
   */
  async updateProfile(data: UpdateProfileData, context: RequestContext): Promise<User> {
    if (!context.userId) {
      throw new UserError("Authentication required", UserErrorType.PERMISSION_DENIED);
    }

    await this.events.beforeUpdateProfile({ data, context });

    // Verify current password if new password provided
    if (data.newPassword) {
      const user = await this.repository.getByEmail(
        await this.getCurrentUserEmail(context.userId), 
        true
      );
      if (!user) {
        throw new UserError("User not found", UserErrorType.NOT_FOUND);
      }
      
      await this.repository.verifyPassword(user.email, data.currentPassword!);
    }

    // Update profile
    const user = await this.repository.updateProfile(
      context.userId, 
      { 
        name: data.name, 
        newPassword: data.newPassword 
      }, 
      context
    );

    await this.events.afterUpdateProfile({ data, context, result: user });

    return user;
  }

  /**
   * Verify user credentials
   */
  async verifyCredentials(email: string, password: string): Promise<User> {
    return await this.repository.verifyPassword(email, password);
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    return await this.repository.getByEmail(email) as User | null;
  }

  /**
   * Check if user is admin
   */
  private checkAdminPermission(context: RequestContext): void {
    if (!context.userId || context.userRole !== 'ADMIN') {
      throw new UserError("Admin permission required", UserErrorType.PERMISSION_DENIED);
    }
  }

  /**
   * Get current user email by ID
   */
  private async getCurrentUserEmail(userId: string): Promise<string> {
    const user = await this.repository.getById(userId, { userId });
    if (!user) {
      throw new UserError("User not found", UserErrorType.NOT_FOUND);
    }
    return user.email;
  }
}