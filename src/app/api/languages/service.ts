/**
 * Languages Service - Business logic and validation
 */

import { BaseServiceImpl } from '../shared/base-service';
import { Language, CreateLanguageData, UpdateLanguageData, LanguagesFilters } from './types';
import { LanguagesRepository } from './repository';
import { LanguagesEvents } from './events';
import { RequestContext } from '../shared/types';
import { APIError } from '../shared/errors';


export class LanguagesService extends BaseServiceImpl<Language, CreateLanguageData, UpdateLanguageData, LanguagesFilters> {
  
  constructor(
    repository: LanguagesRepository,
    private events: LanguagesEvents
  ) {
    super(repository);
  }

  protected async validatePermissions(operation: 'read' | 'create' | 'update' | 'delete', context?: RequestContext): Promise<void> {
    if (!context) {
      throw APIError.unauthorized();
    }

    // For now, all authenticated users can read languages
    if (operation === 'read') {
      return;
    }

    // Create, update, delete require authentication
    if (!context.userId) {
      throw APIError.unauthorized();
    }

    // Add role-based permissions later if needed
    // For now, all authenticated users can manage languages
  }

  protected async validateData(data: CreateLanguageData | UpdateLanguageData, operation: 'create' | 'update'): Promise<void> {
    // For create operations, check if language with same name or code already exists
    if (operation === 'create' && 'name' in data && 'code' in data) {
      // Type guard to ensure name and code are defined for create operations
      if (data.name !== undefined && data.code !== undefined) {
        const existingByName = await (this.repository as LanguagesRepository).findByName(data.name);
        if (existingByName) {
          throw APIError.conflict(`Language with name '${data.name}' already exists`);
        }

        const existingByCode = await (this.repository as LanguagesRepository).findByCode(data.code);
        if (existingByCode) {
          throw APIError.conflict(`Language with code '${data.code}' already exists`);
        }
      }
    }

    // For update operations, check if updating to a name or code that already exists
    if (operation === 'update' && 'id' in data && typeof data.id === 'string') {
      const existing = await this.repository.findById(data.id);
      if (!existing) {
        throw APIError.notFound('Language not found');
      }

      if (data.name !== undefined && data.name !== existing.name) {
        const existingByName = await (this.repository as LanguagesRepository).findByName(data.name);
        if (existingByName) {
          throw APIError.conflict(`Language with name '${data.name}' already exists`);
        }
      }

      if (data.code !== undefined && data.code !== existing.code) {
        const existingByCode = await (this.repository as LanguagesRepository).findByCode(data.code);
        if (existingByCode) {
          throw APIError.conflict(`Language with code '${data.code}' already exists`);
        }
      }
    }
  }

  protected async onCreated(entity: Language, context: RequestContext): Promise<void> {
    await this.events.onCreated(entity, context);
  }

  protected async onUpdated(entity: Language, originalData: Language, context: RequestContext): Promise<void> {
    await this.events.onUpdated(entity, originalData, context);
  }

  protected async onDeleted(id: string, context: RequestContext): Promise<void> {
    await this.events.onDeleted(id, context);
  }

  async create(data: CreateLanguageData, context: RequestContext): Promise<Language> {
    await this.validatePermissions('create', context);
    await this.validateData(data, 'create');

    const language = await this.repository.create(data);
    await this.onCreated(language, context);

    return language;
  }

  async update(id: string, data: UpdateLanguageData, context: RequestContext): Promise<Language> {
    await this.validatePermissions('update', context);
    await this.validateData({ ...data, id } as UpdateLanguageData & { id: string }, 'update');

    // Get original data for comparison
    const originalLanguage = await this.repository.findById(id);
    if (!originalLanguage) {
      throw APIError.notFound('Language not found');
    }

    const updatedLanguage = await this.repository.update(id, data);
    await this.onUpdated(updatedLanguage, originalLanguage, context);

    return updatedLanguage;
  }

  async delete(id: string, context: RequestContext): Promise<void> {
    await this.validatePermissions('delete', context);

    const exists = await this.repository.exists(id);
    if (!exists) {
      throw APIError.notFound('Language not found');
    }

    // Check if language is in use by countries
    const language = await this.repository.findById(id);
    if (language && 'countryCount' in language && (language as any).countryCount > 0) {
      throw APIError.conflict('Cannot delete language that is in use by countries');
    }

    await this.repository.delete(id);
    await this.onDeleted(id, context);
  }
}