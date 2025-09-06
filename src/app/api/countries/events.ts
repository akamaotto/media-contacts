/**
 * Countries Events Handler
 */

import { BaseEventHandler } from '../shared/events';
import { RequestContext } from '../shared/types';
import { Country } from './types';

export class CountriesEvents extends BaseEventHandler<Country> {
  
  protected getEntityName(): string {
    return 'country';
  }

  protected getEntityId(entity: Country): string {
    return entity.id;
  }

  protected getEntityDisplayName(entity: Country): string {
    return entity.name;
  }

  protected async handleCustomCreatedEvent(entity: Country, context: RequestContext): Promise<void> {
    // Custom logic for country creation
    console.log(`Country "${entity.name}" (${entity.code || 'No code'}) created by user ${context.userId}`);
  }

  protected async handleCustomUpdatedEvent(entity: Country, previous: Country, context: RequestContext): Promise<void> {
    // Custom logic for country updates
    console.log(`Country "${entity.name}" updated by user ${context.userId}`);
    
    // Check for significant changes
    const nameChanged = entity.name !== previous.name;
    const codeChanged = entity.code !== previous.code;
    const capitalChanged = entity.capital !== previous.capital;
    const coordinatesChanged = entity.latitude !== previous.latitude || entity.longitude !== previous.longitude;
    
    const regionsChanged = JSON.stringify(entity.regions?.map(r => r.id).sort()) !== 
                          JSON.stringify(previous.regions?.map(r => r.id).sort());
    const languagesChanged = JSON.stringify(entity.languages?.map(l => l.id).sort()) !== 
                           JSON.stringify(previous.languages?.map(l => l.id).sort());
    const beatsChanged = JSON.stringify(entity.beats?.map(b => b.id).sort()) !== 
                        JSON.stringify(previous.beats?.map(b => b.id).sort());
    
    if (nameChanged) {
      console.log(`Country name changed from "${previous.name}" to "${entity.name}"`);
    }
    
    if (codeChanged) {
      console.log(`Country code changed from "${previous.code || 'none'}" to "${entity.code || 'none'}"`);
    }
    
    if (capitalChanged) {
      console.log(`Country capital changed from "${previous.capital || 'none'}" to "${entity.capital || 'none'}"`);
    }
    
    if (coordinatesChanged) {
      console.log(`Country coordinates changed`);
      console.log(`  Previous: ${previous.latitude || 'N/A'}, ${previous.longitude || 'N/A'}`);
      console.log(`  New: ${entity.latitude || 'N/A'}, ${entity.longitude || 'N/A'}`);
    }
    
    if (regionsChanged) {
      console.log(`Country regions changed:`);
      console.log(`  Previous: ${previous.regions?.map(r => r.name).join(', ') || 'none'}`);
      console.log(`  New: ${entity.regions?.map(r => r.name).join(', ') || 'none'}`);
    }
    
    if (languagesChanged) {
      console.log(`Country languages changed:`);
      console.log(`  Previous: ${previous.languages?.map(l => l.name).join(', ') || 'none'}`);
      console.log(`  New: ${entity.languages?.map(l => l.name).join(', ') || 'none'}`);
    }
    
    if (beatsChanged) {
      console.log(`Country beats changed:`);
      console.log(`  Previous: ${previous.beats?.map(b => b.name).join(', ') || 'none'}`);
      console.log(`  New: ${entity.beats?.map(b => b.name).join(', ') || 'none'}`);
    }
  }

  protected async handleCustomDeletedEvent(entityId: string, context: RequestContext): Promise<void> {
    // Custom logic for country deletion
    console.log(`Country ${entityId} deleted by user ${context.userId}`);
    
    // Example: Clean up related data, send notifications, etc.
    await this.cleanupRelatedData(entityId);
    await this.sendNotification('country_deleted', { id: entityId }, context);
  }

  /**
   * Update search index (example implementation)
   */
  private async updateSearchIndex(entity: Country): Promise<void> {
    try {
      // Example: Update external search service
      console.log(`Updating search index for country: ${entity.name}`);
      
      // Implementation would depend on your search service
      // await searchService.indexCountry(entity);
    } catch (error) {
      console.error('Failed to update search index for country:', error);
      // Don't throw - search index updates are not critical
    }
  }

  /**
   * Clean up related data when country is deleted
   */
  private async cleanupRelatedData(countryId: string): Promise<void> {
    try {
      console.log(`Cleaning up data related to deleted country: ${countryId}`);
      
      // Example: Clean up cached data, search indices, etc.
      // Note: Prisma relationships with cascade delete should handle most cleanup
      // but we might need to clean up caches, search indices, etc.
      
      // Clear cache entries related to this country
      const { cacheService } = await import('../shared/cache-service');
      cacheService.clearByPrefix('countries_');
      
      // Could also clear related cache entries
      cacheService.clearByPrefix('media_contacts_'); // In case contacts were filtered by this country
      
    } catch (error) {
      console.error('Failed to cleanup related data for country:', error);
      // Don't throw - cleanup failures shouldn't break the deletion
    }
  }

  /**
   * Send notifications (example implementation)
   */
  private async sendNotification(type: string, data: any, context: RequestContext): Promise<void> {
    try {
      console.log(`Sending ${type} notification for user ${context.userId}`);
      
      // Example implementation:
      // await notificationService.send({
      //   type,
      //   data,
      //   userId: context.userId,
      //   timestamp: new Date()
      // });
    } catch (error) {
      console.error(`Failed to send ${type} notification:`, error);
      // Don't throw - notification failures shouldn't break the operation
    }
  }

  /**
   * Handle geography data changes
   * This is specific to countries as they are core geography entities
   */
  private async handleGeographyChange(entity: Country, context: RequestContext): Promise<void> {
    try {
      console.log(`Geography data changed for country: ${entity.name}`);
      
      // Example: Invalidate geography-related caches
      const { cacheService } = await import('../shared/cache-service');
      cacheService.clearByPrefix('geography_');
      cacheService.clearByPrefix('reference_');
      
      // Example: Trigger updates to dependent services
      // await geoService.updateCountryData(entity);
      // await analyticsService.updateGeoFilters();
      
    } catch (error) {
      console.error('Failed to handle geography change:', error);
      // Don't throw - geography updates are not critical for the main operation
    }
  }
}