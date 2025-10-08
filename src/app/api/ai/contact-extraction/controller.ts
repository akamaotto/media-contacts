/**
 * Contact Extraction API Controller
 * Handles HTTP requests for contact extraction operations
 */

import { BaseController } from '../../shared/base-controller';
import { ContactExtractionAPIService } from './service';
import { ContactExtractionRequest } from '@/lib/ai/contact-extraction/types';

export class ContactExtractionController extends BaseController {
  private contactExtractionService: ContactExtractionAPIService;

  constructor() {
    super();
    this.contactExtractionService = new ContactExtractionAPIService();
  }

  /**
   * Extract contacts from web sources
   * POST /api/ai/contact-extraction/extract
   */
  async extractContacts(request: Request) {
    try {
      const body = await request.json();
      const userId = this.getCurrentUserId(request);

      if (!userId) {
        return this.createErrorResponse('Unauthorized', 401);
      }

      // Validate and build extraction request
      const extractionRequest: ContactExtractionRequest = {
        searchId: body.searchId || this.generateId(),
        sources: body.sources,
        options: {
          enableAIEnhancement: body.options?.enableAIEnhancement ?? true,
          enableEmailValidation: body.options?.enableEmailValidation ?? true,
          enableSocialDetection: body.options?.enableSocialDetection ?? true,
          enableDuplicateDetection: body.options?.enableDuplicateDetection ?? true,
          enableQualityAssessment: body.options?.enableQualityAssessment ?? true,
          enableCaching: body.options?.enableCaching ?? true,
          confidenceThreshold: body.options?.confidenceThreshold ?? 0.5,
          maxContactsPerSource: body.options?.maxContactsPerSource ?? 10,
          processingTimeout: body.options?.processingTimeout ?? 30000,
          batchSize: body.options?.batchSize ?? 5,
          includeBio: body.options?.includeBio ?? true,
          includeSocialProfiles: body.options?.includeSocialProfiles ?? true,
          strictValidation: body.options?.strictValidation ?? false
        },
        userId
      };

      const context = {
        userId,
        searchId: body.searchId,
        requestId: this.generateId()
      };

      const result = await this.contactExtractionService.extractContacts(extractionRequest, context);

      return this.createSuccessResponse(result, 200);

    } catch (error) {
      return this.handleError(error, 'Failed to extract contacts');
    }
  }

  /**
   * Get extraction statistics
   * GET /api/ai/contact-extraction/statistics
   */
  async getExtractionStatistics(request: Request) {
    try {
      const userId = this.getCurrentUserId(request);

      if (!userId) {
        return this.createErrorResponse('Unauthorized', 401);
      }

      const { searchParams } = new URL(request.url);
      const filters = {
        startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
        endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
        status: searchParams.get('status') || undefined
      };

      const stats = await this.contactExtractionService.getExtractionStatistics(userId, filters);

      return this.createSuccessResponse(stats, 200);

    } catch (error) {
      return this.handleError(error, 'Failed to get extraction statistics');
    }
  }

  /**
   * Get extraction job details
   * GET /api/ai/contact-extraction/jobs/[jobId]
   */
  async getExtractionJob(request: Request, params: { jobId: string }) {
    try {
      const userId = this.getCurrentUserId(request);

      if (!userId) {
        return this.createErrorResponse('Unauthorized', 401);
      }

      const job = await this.contactExtractionService.getExtractionJob(params.jobId, userId);

      return this.createSuccessResponse(job, 200);

    } catch (error) {
      return this.handleError(error, 'Failed to get extraction job');
    }
  }

  /**
   * List extraction jobs
   * GET /api/ai/contact-extraction/jobs
   */
  async listExtractionJobs(request: Request) {
    try {
      const userId = this.getCurrentUserId(request);

      if (!userId) {
        return this.createErrorResponse('Unauthorized', 401);
      }

      const { searchParams } = new URL(request.url);
      const options = {
        page: parseInt(searchParams.get('page') || '1'),
        limit: parseInt(searchParams.get('limit') || '20'),
        status: searchParams.get('status') || undefined,
        sortBy: (searchParams.get('sortBy') as any) || 'createdAt',
        sortOrder: (searchParams.get('sortOrder') as any) || 'desc'
      };

      const result = await this.contactExtractionService.listExtractionJobs(userId, options);

      return this.createSuccessResponse(result, 200);

    } catch (error) {
      return this.handleError(error, 'Failed to list extraction jobs');
    }
  }

  /**
   * Cancel extraction job
   * POST /api/ai/contact-extraction/jobs/[jobId]/cancel
   */
  async cancelExtractionJob(request: Request, params: { jobId: string }) {
    try {
      const userId = this.getCurrentUserId(request);

      if (!userId) {
        return this.createErrorResponse('Unauthorized', 401);
      }

      await this.contactExtractionService.cancelExtractionJob(params.jobId, userId);

      return this.createSuccessResponse({ message: 'Job cancelled successfully' }, 200);

    } catch (error) {
      return this.handleError(error, 'Failed to cancel extraction job');
    }
  }

  /**
   * Retry extraction job
   * POST /api/ai/contact-extraction/jobs/[jobId]/retry
   */
  async retryExtractionJob(request: Request, params: { jobId: string }) {
    try {
      const userId = this.getCurrentUserId(request);

      if (!userId) {
        return this.createErrorResponse('Unauthorized', 401);
      }

      const result = await this.contactExtractionService.retryExtractionJob(params.jobId, userId);

      return this.createSuccessResponse(result, 200);

    } catch (error) {
      return this.handleError(error, 'Failed to retry extraction job');
    }
  }

  /**
   * Get extracted contacts for a job
   * GET /api/ai/contact-extraction/jobs/[jobId]/contacts
   */
  async getExtractedContacts(request: Request, params: { jobId: string }) {
    try {
      const userId = this.getCurrentUserId(request);

      if (!userId) {
        return this.createErrorResponse('Unauthorized', 401);
      }

      const { searchParams } = new URL(request.url);
      const options = {
        page: parseInt(searchParams.get('page') || '1'),
        limit: parseInt(searchParams.get('limit') || '50'),
        minConfidence: parseFloat(searchParams.get('minConfidence') || '0'),
        includeDuplicates: searchParams.get('includeDuplicates') === 'true'
      };

      const result = await this.contactExtractionService.getExtractedContacts(
        params.jobId,
        userId,
        options
      );

      return this.createSuccessResponse(result, 200);

    } catch (error) {
      return this.handleError(error, 'Failed to get extracted contacts');
    }
  }

  /**
   * Health check endpoint
   * GET /api/ai/contact-extraction/health
   */
  async healthCheck(request: Request) {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'contact-extraction',
        version: '1.0.0'
      };

      return this.createSuccessResponse(health, 200);

    } catch (error) {
      return this.handleError(error, 'Health check failed');
    }
  }
}