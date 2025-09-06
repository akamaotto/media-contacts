/**
 * User Repository Implementation
 * Handles all database operations for users
 */

import { prisma } from '@/lib/database/prisma';
import { 
  User, 
  UserWithPassword,
  CreateUserData, 
  UpdateUserData, 
  UserFilters, 
  UserError, 
  UserErrorType 
} from './types';
import { PaginatedResult, RequestContext } from '../shared/types';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';

export class UserRepository {
  
  protected readonly entityName = 'users';

  /**
   * Handle Prisma errors and convert to appropriate UserError
   */
  private handleError(error: unknown, operation: string): never {
    console.error(`User repository error in ${operation}:`, error);
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new UserError('Email already exists', UserErrorType.DUPLICATE_EMAIL);
      }
      if (error.code === 'P2025') {
        throw new UserError('User not found', UserErrorType.NOT_FOUND);
      }
    }
    
    if (error instanceof UserError) {
      throw error;
    }
    
    throw new UserError(
      `Database error in ${operation}`, 
      UserErrorType.DATABASE_ERROR, 
      error
    );
  }

  /**
   * Get all users with filtering and pagination
   */
  async getAll(
    filters: UserFilters = {}, 
    page = 1, 
    pageSize = 10, 
    context: RequestContext
  ): Promise<PaginatedResult<User>> {
    try {
      const skip = (page - 1) * pageSize;
      const where = this.buildWhereClause(filters);

      const [data, totalCount] = await Promise.all([
        prisma.users.findMany({
          where,
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { 
            [filters.sortBy || 'createdAt']: filters.sortOrder || 'desc' 
          },
          skip,
          take: pageSize,
        }),
        prisma.users.count({ where })
      ]);

      return {
        data: data as User[],
        totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
      };
    } catch (error) {
      this.handleError(error, 'getAll');
    }
  }

  /**
   * Get user by ID
   */
  async getById(id: string, context: RequestContext): Promise<User | null> {
    try {
      const user = await prisma.users.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return user as User | null;
    } catch (error) {
      this.handleError(error, 'getById');
    }
  }

  /**
   * Get user by email with optional password
   */
  async getByEmail(email: string, includePassword = false): Promise<User | UserWithPassword | null> {
    try {
      const user = await prisma.users.findUnique({
        where: { email },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          hashedPassword: includePassword,
        },
      });

      return user as User | UserWithPassword | null;
    } catch (error) {
      this.handleError(error, 'getByEmail');
    }
  }

  /**
   * Create new user
   */
  async create(data: CreateUserData, context: RequestContext): Promise<User> {
    try {
      // Check for existing user
      const existingUser = await this.getByEmail(data.email);
      if (existingUser) {
        throw new UserError(
          `User with email ${data.email} already exists`, 
          UserErrorType.DUPLICATE_EMAIL
        );
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);

      const user = await prisma.users.create({
        data: {
          id: randomUUID(),
          name: data.name,
          email: data.email,
          hashedPassword,
          role: data.role || 'USER',
          updatedAt: new Date(),
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return user as User;
    } catch (error) {
      if (error instanceof UserError) throw error;
      this.handleError(error, 'create');
    }
  }

  /**
   * Update user
   */
  async update(id: string, data: UpdateUserData, context: RequestContext): Promise<User> {
    try {
      // Check if user exists
      const existingUser = await this.getById(id, context);
      if (!existingUser) {
        throw new UserError(`User with ID ${id} not found`, UserErrorType.NOT_FOUND);
      }

      // Check for email conflicts if email is being updated
      if (data.email && data.email !== existingUser.email) {
        const emailConflict = await this.getByEmail(data.email);
        if (emailConflict) {
          throw new UserError(
            `User with email ${data.email} already exists`, 
            UserErrorType.DUPLICATE_EMAIL
          );
        }
      }

      // Prepare update data
      const updateData: any = { ...data };
      if (data.password) {
        updateData.hashedPassword = await bcrypt.hash(data.password, 10);
        delete updateData.password;
      }
      updateData.updatedAt = new Date();

      const updatedUser = await prisma.users.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return updatedUser as User;
    } catch (error) {
      if (error instanceof UserError) throw error;
      this.handleError(error, 'update');
    }
  }

  /**
   * Delete user with associated records
   */
  async delete(id: string, context: RequestContext): Promise<void> {
    try {
      // Check if user exists
      const existingUser = await this.getById(id, context);
      if (!existingUser) {
        throw new UserError(`User with ID ${id} not found`, UserErrorType.NOT_FOUND);
      }

      // Prevent deletion of super admin
      if (existingUser.email === "akamaotto@gmail.com") {
        throw new UserError(
          "Cannot delete super admin user", 
          UserErrorType.PERMISSION_DENIED
        );
      }

      // Delete user and associated records in transaction
      await prisma.$transaction([
        prisma.sessions.deleteMany({ where: { userId: id } }),
        prisma.accounts.deleteMany({ where: { userId: id } }),
        prisma.users.delete({ where: { id } }),
      ]);
    } catch (error) {
      if (error instanceof UserError) throw error;
      this.handleError(error, 'delete');
    }
  }

  /**
   * Verify user password
   */
  async verifyPassword(email: string, password: string): Promise<User> {
    try {
      const user = await this.getByEmail(email, true) as UserWithPassword | null;
      if (!user || !user.hashedPassword) {
        throw new UserError("Invalid credentials", UserErrorType.INVALID_PASSWORD);
      }

      const isValid = await bcrypt.compare(password, user.hashedPassword);
      if (!isValid) {
        throw new UserError("Invalid credentials", UserErrorType.INVALID_PASSWORD);
      }

      // Return user without password
      const { hashedPassword, ...userWithoutPassword } = user;
      return userWithoutPassword as User;
    } catch (error) {
      if (error instanceof UserError) throw error;
      this.handleError(error, 'verifyPassword');
    }
  }

  /**
   * Update user profile (current user only)
   */
  async updateProfile(userId: string, data: { name: string; newPassword?: string }, context: RequestContext): Promise<User> {
    try {
      const updateData: any = { name: data.name };
      
      if (data.newPassword) {
        updateData.hashedPassword = await bcrypt.hash(data.newPassword, 10);
      }
      
      updateData.updatedAt = new Date();

      const updatedUser = await prisma.users.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return updatedUser as User;
    } catch (error) {
      this.handleError(error, 'updateProfile');
    }
  }

  /**
   * Build where clause for filtering
   */
  private buildWhereClause(filters: UserFilters) {
    const where: any = {};

    if (filters.role) {
      where.role = filters.role;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }
}