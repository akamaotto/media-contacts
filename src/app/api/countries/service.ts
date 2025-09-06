/**
 * Countries Service Implementation
 */

import { BaseServiceImpl } from '../shared/base-service';
import { RequestContext } from '../shared/types';
import { APIError } from '../shared/errors';
import { Country, CreateCountryData, UpdateCountryData, CountriesFilters } from './types';
import { CountriesRepository } from './repository';
import { CountriesEvents } from './events';

export class CountriesService extends BaseServiceImpl<Country, CreateCountryData, UpdateCountryData, CountriesFilters> {
  
  constructor(
    repository: CountriesRepository,
    private events: CountriesEvents
  ) {
    super(repository);
  }

  protected async validatePermissions(operation: 'read' | 'create' | 'update' | 'delete', context?: RequestContext): Promise<void> {
    // Allow unauthenticated read access for countries
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
    // For now, all authenticated users can manage countries
  }

  protected async validateData(data: CreateCountryData | UpdateCountryData, operation: 'create' | 'update'): Promise<void> {
    if (operation === 'create') {
      const createData = data as CreateCountryData;
      
      if (!createData.name || createData.name.trim().length === 0) {
        throw APIError.validation('Country name is required');
      }

      if (createData.name.trim().length > 255) {
        throw APIError.validation('Country name must be less than 255 characters');
      }

      // Check for duplicate names
      const repository = this.repository as CountriesRepository;
      const existing = await repository.findByName(createData.name.trim());
      if (existing) {
        throw APIError.conflict(`Country with name "${createData.name}" already exists`);
      }

      // Check for duplicate country codes if provided
      if (createData.code) {
        const existingByCode = await repository.findByCode(createData.code.trim());
        if (existingByCode) {
          throw APIError.conflict(`Country with code "${createData.code}" already exists`);
        }
      }
    } else {
      const updateData = data as UpdateCountryData;
      
      if (updateData.name !== undefined) {
        if (!updateData.name || updateData.name.trim().length === 0) {
          throw APIError.validation('Country name cannot be empty');
        }

        if (updateData.name.trim().length > 255) {
          throw APIError.validation('Country name must be less than 255 characters');
        }
      }

      if (updateData.code !== undefined && updateData.code) {
        if (updateData.code.trim().length < 2 || updateData.code.trim().length > 3) {
          throw APIError.validation('Country code must be 2-3 characters');
        }
      }
    }

    // Validate coordinates if provided
    if (data.latitude !== undefined && data.latitude !== null) {
      if (data.latitude < -90 || data.latitude > 90) {
        throw APIError.validation('Latitude must be between -90 and 90');
      }
    }

    if (data.longitude !== undefined && data.longitude !== null) {
      if (data.longitude < -180 || data.longitude > 180) {
        throw APIError.validation('Longitude must be between -180 and 180');
      }
    }
  }

  protected async onCreated(entity: Country, context: RequestContext): Promise<void> {
    await this.events.onCreated(entity, context);
  }

  protected async onUpdated(entity: Country, originalData: Country, context: RequestContext): Promise<void> {
    await this.events.onUpdated(entity, originalData, context);
  }

  protected async onDeleted(id: string, context: RequestContext): Promise<void> {
    await this.events.onDeleted(id, context);
  }

  /**
   * Search countries by name, code, or capital
   */
  async searchCountries(query: string, limit = 10, context?: RequestContext): Promise<Country[]> {
    await this.validatePermissions('read', context);
    
    const repository = this.repository as CountriesRepository;
    return repository.search(query, limit);
  }

  /**
   * Get countries with usage statistics
   */
  async getCountriesWithStats(context?: RequestContext): Promise<Country[]> {
    await this.validatePermissions('read', context);
    
    const repository = this.repository as CountriesRepository;
    return repository.findWithStats();
  }

  /**
   * Find country by code
   */
  async findByCode(code: string, context?: RequestContext): Promise<Country | null> {
    await this.validatePermissions('read', context);
    
    const repository = this.repository as CountriesRepository;
    return repository.findByCode(code.toUpperCase());
  }

  /**
   * Check if country name is available
   */
  async isNameAvailable(name: string, excludeId?: string): Promise<boolean> {
    const repository = this.repository as CountriesRepository;
    const existing = await repository.findByName(name.trim());
    
    if (!existing) return true;
    if (excludeId && existing.id === excludeId) return true;
    
    return false;
  }

  /**
   * Check if country code is available
   */
  async isCodeAvailable(code: string, excludeId?: string): Promise<boolean> {
    const repository = this.repository as CountriesRepository;
    const existing = await repository.findByCode(code.trim().toUpperCase());
    
    if (!existing) return true;
    if (excludeId && existing.id === excludeId) return true;
    
    return false;
  }

  /**
   * Verify that region IDs exist before updating
   */
  private async verifyRegionsExist(regionIds: string[]): Promise<void> {
    if (!regionIds || regionIds.length === 0) return;
    
    try {
      const { prisma } = await import('@/lib/database/prisma');
      
      const existingRegions = await prisma.regions.findMany({
        where: {
          id: { in: regionIds }
        },
        select: {
          id: true,
          name: true
        }
      });
      
      const missingIds = regionIds.filter(id => !existingRegions.some(region => region.id === id));
      if (missingIds.length > 0) {
        throw new Error(`Regions not found: ${missingIds.join(', ')}`);
      }
      
    } catch (error) {
      console.error(`Region verification failed:`, error);
      throw error;
    }
  }

  /**
   * Verify that language IDs exist before updating
   */
  private async verifyLanguagesExist(languageIds: string[]): Promise<void> {
    if (!languageIds || languageIds.length === 0) return;
    
    try {
      const { prisma } = await import('@/lib/database/prisma');
      
      const existingLanguages = await prisma.languages.findMany({
        where: {
          id: { in: languageIds }
        },
        select: {
          id: true,
          name: true
        }
      });
      
      const missingIds = languageIds.filter(id => !existingLanguages.some(lang => lang.id === id));
      if (missingIds.length > 0) {
        throw new Error(`Languages not found: ${missingIds.join(', ')}`);
      }
      
    } catch (error) {
      console.error(`Language verification failed:`, error);
      throw error;
    }
  }

  /**
   * Verify that beat IDs exist before updating
   */
  private async verifyBeatsExist(beatIds: string[]): Promise<void> {
    if (!beatIds || beatIds.length === 0) return;
    
    try {
      const { prisma } = await import('@/lib/database/prisma');
      
      const existingBeats = await prisma.beats.findMany({
        where: {
          id: { in: beatIds }
        },
        select: {
          id: true,
          name: true
        }
      });
      
      const missingIds = beatIds.filter(id => !existingBeats.some(beat => beat.id === id));
      if (missingIds.length > 0) {
        throw new Error(`Beats not found: ${missingIds.join(', ')}`);
      }
      
    } catch (error) {
      console.error(`Beat verification failed:`, error);
      throw error;
    }
  }

  /**
   * Override create to handle relationship verification
   */
  async create(data: CreateCountryData, context: RequestContext): Promise<Country> {
    // Verify related entities exist before creating
    if (data.regionIds) {
      await this.verifyRegionsExist(data.regionIds);
    }
    
    if (data.languageIds) {
      await this.verifyLanguagesExist(data.languageIds);
    }
    
    if (data.beatIds) {
      await this.verifyBeatsExist(data.beatIds);
    }

    return super.create(data, context);
  }

  /**
   * Override update to handle name/code conflicts and relationship verification
   */
  async update(id: string, data: UpdateCountryData, context: RequestContext): Promise<Country> {
    // Verify related entities exist before updating
    if (data.regionIds) {
      await this.verifyRegionsExist(data.regionIds);
    }
    
    if (data.languageIds) {
      await this.verifyLanguagesExist(data.languageIds);
    }
    
    if (data.beatIds) {
      await this.verifyBeatsExist(data.beatIds);
    }
    
    // Additional validation for updates with name changes
    if (data.name) {
      const isAvailable = await this.isNameAvailable(data.name, id);
      if (!isAvailable) {
        throw APIError.conflict(`Country with name "${data.name}" already exists`);
      }
    }

    // Additional validation for updates with code changes
    if (data.code) {
      const isCodeAvailable = await this.isCodeAvailable(data.code, id);
      if (!isCodeAvailable) {
        throw APIError.conflict(`Country with code "${data.code}" already exists`);
      }
    }

    return super.update(id, data, context);
  }
}