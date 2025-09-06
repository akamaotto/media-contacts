/**
 * Media Contacts Service Implementation
 */

import { BaseServiceImpl } from '../shared/base-service';
import { PaginatedResult, PaginationParams, RequestContext } from '../shared/types';
import { APIError } from '../shared/errors';
import { MediaContact, CreateMediaContactData, UpdateMediaContactData, MediaContactsFilters } from './types';
import { MediaContactsRepository } from './repository';
import { MediaContactsEvents } from './events';

export class MediaContactsService extends BaseServiceImpl<MediaContact, CreateMediaContactData, UpdateMediaContactData, MediaContactsFilters> {
  
  constructor(
    repository: MediaContactsRepository,
    private events: MediaContactsEvents
  ) {
    super(repository);
  }

  protected async validatePermissions(operation: 'read' | 'create' | 'update' | 'delete', context?: RequestContext): Promise<void> {
    // Allow unauthenticated read access for media contacts
    if (operation === 'read') {
      return;
    }
    
    if (!context) {
      throw APIError.unauthorized();
    }

    // Create, update, delete require authentication
    if (!context.userId) {
      throw APIError.unauthorized();
    }

    // Add role-based permissions later if needed
    // For now, all authenticated users can manage media contacts
  }

  protected async validateData(data: CreateMediaContactData | UpdateMediaContactData, operation: 'create' | 'update'): Promise<void> {
    if (operation === 'create') {
      const createData = data as CreateMediaContactData;
      
      if (!createData.name || createData.name.trim().length === 0) {
        throw APIError.validation('Contact name is required');
      }

      if (!createData.email || createData.email.trim().length === 0) {
        throw APIError.validation('Contact email is required');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(createData.email)) {
        throw APIError.validation('Invalid email format');
      }

      // Check for duplicate emails
      const repository = this.repository as MediaContactsRepository;
      const existing = await repository.findByEmail(createData.email.trim());
      if (existing) {
        throw APIError.conflict(`Contact with email "${createData.email}" already exists`);
      }
    } else {
      const updateData = data as UpdateMediaContactData;
      
      if (updateData.name !== undefined) {
        if (!updateData.name || updateData.name.trim().length === 0) {
          throw APIError.validation('Contact name cannot be empty');
        }
      }

      if (updateData.email !== undefined) {
        if (!updateData.email || updateData.email.trim().length === 0) {
          throw APIError.validation('Contact email cannot be empty');
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(updateData.email)) {
          throw APIError.validation('Invalid email format');
        }
      }
    }

    // Validate field lengths
    if (data.name && data.name.length > 255) {
      throw APIError.validation('Contact name must be less than 255 characters');
    }

    if (data.title && data.title.length > 255) {
      throw APIError.validation('Contact title must be less than 255 characters');
    }

    if (data.bio && data.bio.length > 2000) {
      throw APIError.validation('Contact bio must be less than 2000 characters');
    }

    // Validate social links and author links
    if (Array.isArray(data.socials)) {
      for (const link of data.socials) {
        if (link.length > 255) {
          throw APIError.validation('Social link must be less than 255 characters');
        }
      }
    }

    if (Array.isArray(data.authorLinks)) {
      for (const link of data.authorLinks) {
        if (link.length > 255) {
          throw APIError.validation('Author link must be less than 255 characters');
        }
      }
    }
  }

  protected async onCreated(entity: MediaContact, context: RequestContext): Promise<void> {
    await this.events.onCreated(entity, context);
  }

  protected async onUpdated(entity: MediaContact, originalData: MediaContact, context: RequestContext): Promise<void> {
    await this.events.onUpdated(entity, originalData, context);
  }

  protected async onDeleted(id: string, context: RequestContext): Promise<void> {
    await this.events.onDeleted(id, context);
  }

  /**
   * Search media contacts by name, email, or title
   */
  async searchContacts(query: string, limit = 10, context?: RequestContext): Promise<MediaContact[]> {
    await this.validatePermissions('read', context);
    
    const repository = this.repository as MediaContactsRepository;
    return repository.search(query, limit);
  }

  /**
   * Verify that a contact email is available
   */
  async isEmailAvailable(email: string, excludeId?: string): Promise<boolean> {
    const repository = this.repository as MediaContactsRepository;
    const existing = await repository.findByEmail(email.trim());
    
    if (!existing) return true;
    if (excludeId && existing.id === excludeId) return true;
    
    return false;
  }

  /**
   * Override create to handle additional validation
   */
  async create(data: CreateMediaContactData, context: RequestContext): Promise<MediaContact> {
    // Additional validation before creating
    return super.create(data, context);
  }

  /**
   * Override getAll to add debugging
   */
  async getAll(filters?: MediaContactsFilters, pagination?: PaginationParams, context?: RequestContext): Promise<PaginatedResult<MediaContact>> {
    return super.getAll(filters, pagination, context);
  }

  /**
   * Override update to handle additional validation
   */
  async update(id: string, data: UpdateMediaContactData, context: RequestContext): Promise<MediaContact> {
    // Additional validation for updates with email changes
    if (data.email) {
      const isAvailable = await this.isEmailAvailable(data.email, id);
      if (!isAvailable) {
        throw APIError.conflict(`Contact with email "${data.email}" already exists`);
      }
    }

    return super.update(id, data, context);
  }
}