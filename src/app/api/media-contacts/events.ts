/**
 * Media Contacts Events System
 * Handles cache invalidation and notifications
 */

import { MediaContact } from './types';
import { RequestContext } from '../shared/types';
import { cacheService, CacheKeys } from '../shared/cache-service';

export class MediaContactsEvents {
  
  /**
   * Handle post-creation events
   */
  async onCreated(entity: MediaContact, context: RequestContext): Promise<void> {
    // Invalidate relevant caches
    this.invalidateCaches();
    
    // Log activity if user context is available
    if (context.userId) {
      try {
        const { activityTrackingService } = await import('@/services/activity');
        await activityTrackingService.logActivity({
          type: 'create',
          entity: 'media_contact',
          entityId: entity.id,
          entityName: entity.name,
          userId: context.userId,
          details: {
            email: entity.email,
            title: entity.title
          }
        });
      } catch (error) {
        console.error('Failed to log activity for media contact creation:', error);
      }
    }
  }

  /**
   * Handle post-update events
   */
  async onUpdated(entity: MediaContact, originalData: MediaContact, context: RequestContext): Promise<void> {
    // Invalidate relevant caches
    this.invalidateCaches();
    
    // Log activity if user context is available
    if (context.userId) {
      try {
        const { activityTrackingService } = await import('@/services/activity');
        await activityTrackingService.logActivity({
          type: 'update',
          entity: 'media_contact',
          entityId: entity.id,
          entityName: entity.name,
          userId: context.userId,
          details: {
            email: entity.email,
            title: entity.title
          }
        });
      } catch (error) {
        console.error('Failed to log activity for media contact update:', error);
      }
    }
  }

  /**
   * Handle post-deletion events
   */
  async onDeleted(id: string, context: RequestContext): Promise<void> {
    // Invalidate relevant caches
    this.invalidateCaches();
    
    // Log activity if user context is available
    if (context.userId) {
      try {
        const { activityTrackingService } = await import('@/services/activity');
        await activityTrackingService.logActivity({
          type: 'delete',
          entity: 'media_contact',
          entityId: id,
          entityName: 'Media Contact',
          userId: context.userId
        });
      } catch (error) {
        console.error('Failed to log activity for media contact deletion:', error);
      }
    }
  }

  /**
   * Invalidate all relevant caches
   */
  private invalidateCaches(): void {
    // Clear all media contacts related caches
    cacheService.clearByPrefix('media_contacts_');
    
    // Also clear related caches that might be affected
    cacheService.clearByPrefix('reference_data_');
  }
}