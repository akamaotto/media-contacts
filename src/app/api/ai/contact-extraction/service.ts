/**
 * Contact Extraction API Service
 * Business logic for contact extraction endpoints
 */

import { BaseServiceImpl } from '../../shared/base-service';
import { ContactExtractionService } from '@/lib/ai/contact-extraction/contact-extraction-service';
import {
  ContactExtractionRequest,
  ContactExtractionResult,
  ContactExtractionOptions,
  ExtractionStatistics
} from '@/lib/ai/contact-extraction/types';

export interface ContactExtractionContext {
  userId: string;
  searchId?: string;
  requestId?: string;
}

export class ContactExtractionAPIService extends BaseServiceImpl<any, any, any, any> {
  private contactExtractionService: ContactExtractionService;

  constructor() {
    super();
    this.contactExtractionService = new ContactExtractionService({
      enabled: true,
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      maxSize: 10000,
      cleanupInterval: 60 * 60 * 1000 // 1 hour
    });
  }

  /**
   * Extract contacts from web sources
   */
  async extractContacts(
    request: ContactExtractionRequest,
    context: ContactExtractionContext
  ): Promise<ContactExtractionResult> {
    this.logInfo('Starting contact extraction', {
      extractionId: context.requestId,
      searchId: context.searchId,
      userId: context.userId,
      sourceCount: request.sources.length
    });

    try {
      // Validate request
      this.validateExtractionRequest(request);

      // Set user context
      request.userId = context.userId;
      if (context.searchId) {
        request.searchId = context.searchId;
      }

      // Perform extraction
      const result = await this.contactExtractionService.extractContacts(request);

      this.logInfo('Contact extraction completed successfully', {
        extractionId: result.extractionId,
        searchId: result.searchId,
        contactsFound: result.contactsFound,
        contactsImported: result.contactsImported,
        processingTimeMs: result.processingTimeMs,
        averageConfidence: result.averageConfidence
      });

      return result;

    } catch (error) {
      this.logError('Contact extraction failed', error as Error, {
        extractionId: context.requestId,
        searchId: context.searchId,
        userId: context.userId
      });
      throw error;
    }
  }

  /**
   * Get extraction statistics
   */
  async getExtractionStatistics(
    userId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      status?: string;
    }
  ): Promise<ExtractionStatistics> {
    this.logInfo('Retrieving extraction statistics', { userId, filters });

    try {
      const stats = await this.contactExtractionService.getExtractionStatistics(userId);

      this.logInfo('Extraction statistics retrieved successfully', {
        userId,
        totalExtractions: stats.totalExtractions,
        successfulExtractions: stats.successfulExtractions,
        averageConfidence: stats.averageConfidence
      });

      return stats;

    } catch (error) {
      this.logError('Failed to retrieve extraction statistics', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Get extraction job details
   */
  async getExtractionJob(jobId: string, userId: string): Promise<any> {
    this.logInfo('Retrieving extraction job details', { jobId, userId });

    try {
      const job = await this.prisma.aiExtractionJob.findFirst({
        where: {
          id: jobId,
          userId
        },
        include: {
          extractedContacts: true
        }
      });

      if (!job) {
        throw new Error('Extraction job not found');
      }

      this.logInfo('Extraction job details retrieved successfully', {
        jobId,
        status: job.status,
        contactsFound: job.contactsFound,
        contactsImported: job.contactsImported
      });

      return job;

    } catch (error) {
      this.logError('Failed to retrieve extraction job', error as Error, { jobId, userId });
      throw error;
    }
  }

  /**
   * List extraction jobs for a user
   */
  async listExtractionJobs(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      status?: string;
      sortBy?: 'createdAt' | 'updatedAt' | 'processingTimeMs';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{
    jobs: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 20,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    this.logInfo('Listing extraction jobs', {
      userId,
      page,
      limit,
      status,
      sortBy,
      sortOrder
    });

    try {
      const where = {
        userId,
        ...(status && { status })
      };

      const [jobs, total] = await Promise.all([
        this.prisma.aiExtractionJob.findMany({
          where,
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            extractedContacts: {
              select: {
                id: true,
                name: true,
                email: true,
                confidenceScore: true,
                qualityScore: true
              }
            }
          }
        }),
        this.prisma.aiExtractionJob.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      this.logInfo('Extraction jobs listed successfully', {
        userId,
        jobsCount: jobs.length,
        total,
        page,
        totalPages
      });

      return {
        jobs,
        total,
        page,
        totalPages
      };

    } catch (error) {
      this.logError('Failed to list extraction jobs', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Cancel an extraction job
   */
  async cancelExtractionJob(jobId: string, userId: string): Promise<void> {
    this.logInfo('Cancelling extraction job', { jobId, userId });

    try {
      const job = await this.prisma.aiExtractionJob.findFirst({
        where: {
          id: jobId,
          userId,
          status: 'PROCESSING'
        }
      });

      if (!job) {
        throw new Error('Active extraction job not found');
      }

      await this.prisma.aiExtractionJob.update({
        where: { id: jobId },
        data: {
          status: 'CANCELLED',
          completedAt: new Date(),
          updatedAt: new Date()
        }
      });

      this.logInfo('Extraction job cancelled successfully', { jobId, userId });

    } catch (error) {
      this.logError('Failed to cancel extraction job', error as Error, { jobId, userId });
      throw error;
    }
  }

  /**
   * Retry a failed extraction job
   */
  async retryExtractionJob(jobId: string, userId: string): Promise<ContactExtractionResult> {
    this.logInfo('Retrying extraction job', { jobId, userId });

    try {
      const job = await this.prisma.aiExtractionJob.findFirst({
        where: {
          id: jobId,
          userId,
          status: 'FAILED'
        }
      });

      if (!job) {
        throw new Error('Failed extraction job not found');
      }

      // Parse the original sources and options
      const sources = this.parseJobSources(job.sourceUrl);
      const options = this.parseJobOptions(job.options);

      // Create new extraction request
      const retryRequest: ContactExtractionRequest = {
        searchId: job.searchId,
        sources,
        options,
        userId
      };

      // Perform new extraction
      const result = await this.contactExtractionService.extractContacts(retryRequest);

      // Update original job status
      await this.prisma.aiExtractionJob.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          updatedAt: new Date()
        }
      });

      this.logInfo('Extraction job retry completed successfully', {
        originalJobId: jobId,
        newExtractionId: result.extractionId,
        contactsFound: result.contactsFound,
        contactsImported: result.contactsImported
      });

      return result;

    } catch (error) {
      this.logError('Failed to retry extraction job', error as Error, { jobId, userId });
      throw error;
    }
  }

  /**
   * Get extracted contacts for a job
   */
  async getExtractedContacts(
    jobId: string,
    userId: string,
    options: {
      page?: number;
      limit?: number;
      minConfidence?: number;
      includeDuplicates?: boolean;
    } = {}
  ): Promise<{
    contacts: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 50,
      minConfidence = 0,
      includeDuplicates = false
    } = options;

    this.logInfo('Retrieving extracted contacts', {
      jobId,
      userId,
      page,
      limit,
      minConfidence,
      includeDuplicates
    });

    try {
      // Verify job ownership
      const job = await this.prisma.aiExtractionJob.findFirst({
        where: { id: jobId, userId }
      });

      if (!job) {
        throw new Error('Extraction job not found');
      }

      const where = {
        extractionId: job.extractionId,
        confidenceScore: { gte: minConfidence },
        ...(includeDuplicates ? {} : { isDuplicate: false })
      };

      const [contacts, total] = await Promise.all([
        this.prisma.aiExtractedContact.findMany({
          where,
          orderBy: { confidenceScore: 'desc' },
          skip: (page - 1) * limit,
          take: limit
        }),
        this.prisma.aiExtractedContact.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      this.logInfo('Extracted contacts retrieved successfully', {
        jobId,
        contactsCount: contacts.length,
        total,
        page,
        totalPages
      });

      return {
        contacts,
        total,
        page,
        totalPages
      };

    } catch (error) {
      this.logError('Failed to retrieve extracted contacts', error as Error, { jobId, userId });
      throw error;
    }
  }

  /**
   * Validate extraction request
   */
  private validateExtractionRequest(request: ContactExtractionRequest): void {
    if (!request.sources || request.sources.length === 0) {
      throw new Error('At least one source must be provided');
    }

    if (request.sources.length > 100) {
      throw new Error('Maximum 100 sources allowed per request');
    }

    for (const source of request.sources) {
      if (!source.url || !this.isValidUrl(source.url)) {
        throw new Error(`Invalid URL: ${source.url}`);
      }
    }

    if (!request.userId) {
      throw new Error('User ID is required');
    }

    if (request.options.confidenceThreshold < 0 || request.options.confidenceThreshold > 1) {
      throw new Error('Confidence threshold must be between 0 and 1');
    }

    if (request.options.maxContactsPerSource < 1 || request.options.maxContactsPerSource > 50) {
      throw new Error('Max contacts per source must be between 1 and 50');
    }

    if (request.options.processingTimeout < 1000 || request.options.processingTimeout > 300000) {
      throw new Error('Processing timeout must be between 1 and 300 seconds');
    }
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Parse job sources from stored format
   */
  private parseJobSources(sourceUrl: string): Array<{ url: string; type: string; priority?: string }> {
    try {
      const urls = sourceUrl.split(',').map(url => url.trim());
      return urls.map(url => ({
        url,
        type: 'web_content',
        priority: 'medium'
      }));
    } catch {
      throw new Error('Failed to parse job sources');
    }
  }

  /**
   * Parse job options from stored format
   */
  private parseJobOptions(optionsJson: string): ContactExtractionOptions {
    try {
      const options = JSON.parse(optionsJson);
      return {
        enableAIEnhancement: options.enableAIEnhancement ?? true,
        enableEmailValidation: options.enableEmailValidation ?? true,
        enableSocialDetection: options.enableSocialDetection ?? true,
        enableDuplicateDetection: options.enableDuplicateDetection ?? true,
        enableQualityAssessment: options.enableQualityAssessment ?? true,
        enableCaching: options.enableCaching ?? true,
        confidenceThreshold: options.confidenceThreshold ?? 0.5,
        maxContactsPerSource: options.maxContactsPerSource ?? 10,
        processingTimeout: options.processingTimeout ?? 30000,
        batchSize: options.batchSize ?? 5,
        includeBio: options.includeBio ?? true,
        includeSocialProfiles: options.includeSocialProfiles ?? true,
        strictValidation: options.strictValidation ?? false
      };
    } catch {
      throw new Error('Failed to parse job options');
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.contactExtractionService.cleanup();
  }
}