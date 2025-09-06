/**
 * Beats Events Handler
 */

import { BaseEventHandler } from '../shared/events';
import { RequestContext } from '../shared/types';
import { Beat } from './types';
import { prisma } from '@/lib/database/prisma';

export class BeatsEvents extends BaseEventHandler<Beat> {
  
  protected getEntityName(): string {
    return 'beat';
  }

  protected getEntityId(entity: Beat): string {
    return entity.id;
  }

  protected getEntityDisplayName(entity: Beat): string {
    return entity.name;
  }

  protected async handleCustomCreatedEvent(entity: Beat, context: RequestContext): Promise<void> {
    // Custom logic for beat creation
    console.log(`Beat "${entity.name}" created by user ${context.userId}`);
  }

  protected async handleCustomUpdatedEvent(entity: Beat, previous: Beat, context: RequestContext): Promise<void> {
    // Custom logic for beat updates
    console.log(`Beat "${entity.name}" updated by user ${context.userId}`);
    
    // Check for significant changes
    const nameChanged = entity.name !== previous.name;
    const descriptionChanged = entity.description !== previous.description;
    const categoriesChanged = JSON.stringify(entity.categories?.map(c => c.id).sort()) !== 
                            JSON.stringify(previous.categories?.map(c => c.id).sort());
    
    if (nameChanged) {
      console.log(`Beat name changed from "${previous.name}" to "${entity.name}"`);
    }
    
    if (categoriesChanged) {
      console.log(`Beat categories changed:`);
      console.log(`  Previous: ${previous.categories?.map(c => c.name).join(', ') || 'none'}`);
      console.log(`  New: ${entity.categories?.map(c => c.name).join(', ') || 'none'}`);
    }
  }

  protected async handleCustomDeletedEvent(entityId: string, context: RequestContext): Promise<void> {
    // Custom logic for beat deletion
    console.log(`Beat ${entityId} deleted by user ${context.userId}`);
    
    // Example: Clean up related data, send notifications, etc.
    // await this.cleanupRelatedData(entityId);
    // await this.sendNotification('beat_deleted', { id: entityId }, context);
  }

  /**
   * Update search index (example implementation)
   */
  private async updateSearchIndex(entity: Beat): Promise<void> {
    try {
      // Example: Update external search service
      console.log(`Updating search index for beat: ${entity.name}`);
      
      // Implementation would depend on your search service
      // await searchService.indexBeat(entity);
    } catch (error) {
      console.error('Failed to update search index for beat:', error);
      // Don't throw - search index updates are not critical
    }
  }

  /**
   * Clean up related data when beat is deleted
   */
  private async cleanupRelatedData(beatId: string): Promise<void> {
    try {
      console.log(`Cleaning up data related to deleted beat: ${beatId}`);
      
      // Example: Clean up cached data, search indices, etc.
      // await cacheService.removeBeatsReferences(beatId);
      // await searchService.removeBeat(beatId);
    } catch (error) {
      console.error('Failed to cleanup related data for beat:', error);
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
}