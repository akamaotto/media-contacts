/**
 * User Events Implementation
 * Handles audit logging and event tracking for user operations
 */

import { BaseEvents } from '../shared/base-events';
import { auditLogger } from '@/lib/security/audit-logger';
import { 
  User, 
  CreateUserData, 
  UpdateUserData, 
  UpdateProfileData,
  UserFilters 
} from './types';
import { RequestContext } from '../shared/types';

export class UserEvents extends BaseEvents<User, CreateUserData, UpdateUserData, UserFilters> {
  
  constructor() {
    super('user');
  }

  /**
   * Before getting all users
   */
  async beforeGetAll(params: {
    filters: UserFilters;
    pagination: { page?: number; pageSize?: number };
    context: RequestContext;
  }): Promise<void> {
    auditLogger.logEvent({
      eventType: 'data_access',
      severity: 'low',
      action: 'users.list.attempt',
      userId: params.context.userId || 'anonymous',
      ip: params.context.ip || '0.0.0.0',
      userAgent: params.context.userAgent || 'unknown',
      resource: 'users',
      details: {
        filters: params.filters,
        pagination: params.pagination,
      }
    });
  }

  /**
   * After getting all users
   */
  async afterGetAll(params: {
    filters: UserFilters;
    pagination: { page?: number; pageSize?: number };
    context: RequestContext;
    result: User[];
  }): Promise<void> {
    auditLogger.logEvent({
      eventType: 'data_access',
      severity: 'low',
      action: 'users.list.success',
      userId: params.context.userId || 'anonymous',
      ip: params.context.ip || '0.0.0.0',
      userAgent: 'system',
      resource: 'users',
      details: {
        filters: params.filters,
        pagination: params.pagination,
        resultCount: params.result.length,
      }
    });
  }

  /**
   * Before getting user by ID
   */
  async beforeGetById(params: {
    id: string;
    context: RequestContext;
  }): Promise<void> {
    auditLogger.logEvent({
      eventType: 'data_access',
      severity: 'low',
      action: 'user.get.attempt',
      userId: params.context.userId || 'anonymous',
      ip: params.context.ip || '0.0.0.0',
      userAgent: params.context.userAgent || 'unknown',
      resource: 'users',
      details: {
        targetUserId: params.id,
      }
    });
  }

  /**
   * After getting user by ID
   */
  async afterGetById(params: {
    id: string;
    context: RequestContext;
    result: User;
  }): Promise<void> {
    auditLogger.logEvent({
      eventType: 'data_access',
      severity: 'low',
      action: 'user.get.success',
      userId: params.context.userId || 'anonymous',
      ip: params.context.ip || '0.0.0.0',
      userAgent: 'system',
      resource: 'users',
      details: {
        targetUserId: params.id,
        targetUserEmail: params.result.email,
      }
    });
  }

  /**
   * Before creating user
   */
  async beforeCreate(params: {
    data: CreateUserData;
    context: RequestContext;
  }): Promise<void> {
    auditLogger.logEvent({
      eventType: 'data_modification',
      severity: 'medium',
      action: 'user.create.attempt',
      userId: params.context.userId || 'anonymous',
      ip: params.context.ip || '0.0.0.0',
      userAgent: params.context.userAgent || 'unknown',
      resource: 'users',
      details: {
        targetUserEmail: params.data.email,
        targetUserName: params.data.name,
        targetUserRole: params.data.role,
      }
    });
  }

  /**
   * After creating user
   */
  async afterCreate(params: {
    data: CreateUserData;
    context: RequestContext;
    result: User;
  }): Promise<void> {
    auditLogger.logEvent({
      eventType: 'data_modification',
      severity: 'medium',
      action: 'user.create.success',
      userId: params.context.userId || 'anonymous',
      ip: params.context.ip || '0.0.0.0',
      userAgent: 'system',
      resource: 'users',
      details: {
        targetUserId: params.result.id,
        targetUserEmail: params.result.email,
        targetUserName: params.result.name,
        targetUserRole: params.result.role,
      }
    });
  }

  /**
   * Before updating user
   */
  async beforeUpdate(params: {
    id: string;
    data: UpdateUserData;
    context: RequestContext;
  }): Promise<void> {
    auditLogger.logEvent({
      eventType: 'data_modification',
      severity: 'medium',
      action: 'user.update.attempt',
      userId: params.context.userId || 'anonymous',
      ip: params.context.ip || '0.0.0.0',
      userAgent: params.context.userAgent || 'unknown',
      resource: 'users',
      details: {
        targetUserId: params.id,
        updateFields: Object.keys(params.data),
        roleChange: params.data.role ? 'yes' : 'no',
        emailChange: params.data.email ? 'yes' : 'no',
        passwordChange: params.data.password ? 'yes' : 'no',
      }
    });
  }

  /**
   * After updating user
   */
  async afterUpdate(params: {
    id: string;
    data: UpdateUserData;
    context: RequestContext;
    result: User;
  }): Promise<void> {
    auditLogger.logEvent({
      eventType: 'data_modification',
      severity: 'medium',
      action: 'user.update.success',
      userId: params.context.userId || 'anonymous',
      ip: params.context.ip || '0.0.0.0',
      userAgent: 'system',
      resource: 'users',
      details: {
        targetUserId: params.id,
        targetUserEmail: params.result.email,
        targetUserName: params.result.name,
        targetUserRole: params.result.role,
        updateFields: Object.keys(params.data),
      }
    });
  }

  /**
   * Before deleting user
   */
  async beforeDelete(params: {
    id: string;
    context: RequestContext;
  }): Promise<void> {
    auditLogger.logEvent({
      eventType: 'data_modification',
      severity: 'high',
      action: 'user.delete.attempt',
      userId: params.context.userId || 'anonymous',
      ip: params.context.ip || '0.0.0.0',
      userAgent: params.context.userAgent || 'unknown',
      resource: 'users',
      details: {
        targetUserId: params.id,
      }
    });
  }

  /**
   * After deleting user
   */
  async afterDelete(params: {
    id: string;
    context: RequestContext;
  }): Promise<void> {
    auditLogger.logEvent({
      eventType: 'data_modification',
      severity: 'high',
      action: 'user.delete.success',
      userId: params.context.userId || 'anonymous',
      ip: params.context.ip || '0.0.0.0',
      userAgent: 'system',
      resource: 'users',
      details: {
        targetUserId: params.id,
      }
    });
  }

  /**
   * Before updating profile
   */
  async beforeUpdateProfile(params: {
    data: UpdateProfileData;
    context: RequestContext;
  }): Promise<void> {
    auditLogger.logEvent({
      eventType: 'data_modification',
      severity: 'medium',
      action: 'profile.update.attempt',
      userId: params.context.userId || 'anonymous',
      ip: params.context.ip || '0.0.0.0',
      userAgent: params.context.userAgent || 'unknown',
      resource: 'profile',
      details: {
        nameChange: 'yes',
        passwordChange: params.data.newPassword ? 'yes' : 'no',
      }
    });
  }

  /**
   * After updating profile
   */
  async afterUpdateProfile(params: {
    data: UpdateProfileData;
    context: RequestContext;
    result: User;
  }): Promise<void> {
    auditLogger.logEvent({
      eventType: 'data_modification',
      severity: 'medium',
      action: 'profile.update.success',
      userId: params.context.userId || 'anonymous',
      ip: params.context.ip || '0.0.0.0',
      userAgent: 'system',
      resource: 'profile',
      details: {
        userName: params.result.name,
        userEmail: params.result.email,
        passwordChange: params.data.newPassword ? 'yes' : 'no',
      }
    });
  }

  /**
   * Log authentication events
   */
  async logAuthentication(params: {
    email: string;
    success: boolean;
    ip?: string;
    userAgent?: string;
    error?: string;
  }): Promise<void> {
    auditLogger.logEvent({
      eventType: 'authentication',
      severity: params.success ? 'low' : 'medium',
      action: params.success ? 'auth.login.success' : 'auth.login.failed',
      userId: params.success ? 'authenticated' : 'anonymous',
      ip: params.ip || '0.0.0.0',
      userAgent: params.userAgent || 'unknown',
      resource: 'authentication',
      details: {
        email: params.email,
        error: params.error,
      }
    });
  }

  /**
   * Log password verification events
   */
  async logPasswordVerification(params: {
    email: string;
    success: boolean;
    ip?: string;
    userAgent?: string;
  }): Promise<void> {
    auditLogger.logEvent({
      eventType: 'authentication',
      severity: params.success ? 'low' : 'medium',
      action: params.success ? 'password.verify.success' : 'password.verify.failed',
      userId: 'authenticated',
      ip: params.ip || '0.0.0.0',
      userAgent: params.userAgent || 'unknown',
      resource: 'authentication',
      details: {
        email: params.email,
      }
    });
  }
}