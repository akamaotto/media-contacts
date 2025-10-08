/**
 * Contact Extraction Service
 * Main orchestrator for the AI-powered contact extraction pipeline
 */

import { WebContentParser } from './content-parser';
import { AIContactIdentifier } from './ai-identifier';
import { EmailValidator } from './email-validator';
import { SocialMediaDetector } from './social-detector';
import { ConfidenceScorer } from './confidence-scorer';
import { DuplicateDetector } from './duplicate-detector';
import { QualityAssessor } from './quality-assessor';
import { ExtractionCache, CacheConfig } from './extraction-cache';

import {
  ContactExtractionRequest,
  ContactExtractionOptions,
  ContactExtractionResult,
  ExtractedContact,
  ParsedContent,
  ExtractionStatus,
  ExtractionJob,
  ExtractionPerformanceLog,
  ContactExtractionError,
  ExtractionOperationType,
  ProcessingStep,
  ValidationResults
} from './types';

import { prisma } from '../../prisma';

export class ContactExtractionService {
  private contentParser: WebContentParser;
  private aiIdentifier: AIContactIdentifier;
  private emailValidator: EmailValidator;
  private socialDetector: SocialMediaDetector;
  private confidenceScorer: ConfidenceScorer;
  private duplicateDetector: DuplicateDetector;
  private qualityAssessor: QualityAssessor;
  private cache: ExtractionCache;

  constructor(cacheConfig?: Partial<CacheConfig>) {
    this.contentParser = new WebContentParser();
    this.aiIdentifier = new AIContactIdentifier();
    this.emailValidator = new EmailValidator();
    this.socialDetector = new SocialMediaDetector();
    this.confidenceScorer = new ConfidenceScorer();
    this.duplicateDetector = new DuplicateDetector();
    this.qualityAssessor = new QualityAssessor();
    this.cache = new ExtractionCache(cacheConfig);
  }

  /**
   * Main entry point for contact extraction
   */
  async extractContacts(request: ContactExtractionRequest): Promise<ContactExtractionResult> {
    const extractionId = this.generateExtractionId();
    const startTime = Date.now();
    const processingSteps: ProcessingStep[] = [];

    try {
      // Log extraction start
      await this.logPerformance({
        extractionId,
        searchId: request.searchId,
        operation: ExtractionOperationType.CONTENT_FETCHING,
        startTime: new Date(),
        status: 'processing',
        contentLength: request.sources.length
      });

      // Create extraction job record
      const extractionJob = await this.createExtractionJob(extractionId, request);

      // Process sources in batches
      const allContacts: ExtractedContact[] = [];
      const errors: string[] = [];
      let sourcesProcessed = 0;

      for (const source of request.sources) {
        try {
          const sourceContacts = await this.processSource(
            source.url,
            extractionId,
            request.searchId,
            request.options,
            processingSteps
          );

          allContacts.push(...sourceContacts);
          sourcesProcessed++;

          // Update job progress
          await this.updateJobProgress(extractionJob.id, sourcesProcessed, allContacts.length);

        } catch (error) {
          const errorMsg = `Failed to process ${source.url}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      // Quality assessment and filtering
      const filteredContacts = await this.applyQualityFilters(allContacts, request);

      // Duplicate detection
      const deduplicationResult = this.duplicateDetector.detectDuplicates(filteredContacts);

      // Calculate final metrics
      const averageConfidence = this.calculateAverageConfidence(deduplicationResult.uniqueContacts);
      const averageQuality = this.calculateAverageQuality(deduplicationResult.uniqueContacts);
      const processingTimeMs = Date.now() - startTime;

      // Save results to database
      await this.saveExtractionResults(extractionId, deduplicationResult, processingTimeMs);

      // Update final job status
      await this.updateJobCompletion(extractionJob.id, ExtractionStatus.COMPLETED, {
        contactsFound: allContacts.length,
        contactsImported: deduplicationResult.uniqueContacts.length,
        processingTimeMs
      });

      // Log completion
      await this.logPerformance({
        extractionId,
        searchId: request.searchId,
        operation: ExtractionOperationType.VALIDATION,
        startTime: new Date(),
        endTime: new Date(),
        duration: processingTimeMs,
        status: 'completed',
        contactsProcessed: deduplicationResult.uniqueContacts.length,
        successRate: deduplicationResult.uniqueContacts.length / Math.max(allContacts.length, 1)
      });

      return {
        extractionId,
        searchId: request.searchId,
        status: ExtractionStatus.COMPLETED,
        sourcesProcessed,
        contactsFound: allContacts.length,
        contactsImported: deduplicationResult.uniqueContacts.length,
        averageConfidence,
        averageQuality,
        processingTimeMs,
        contacts: deduplicationResult.uniqueContacts,
        duplicates: deduplicationResult.duplicateGroups,
        errors: errors.length > 0 ? errors : undefined,
        metrics: this.calculateExtractionMetrics(allContacts, deduplicationResult, processingTimeMs)
      };

    } catch (error) {
      const processingTimeMs = Date.now() - startTime;

      // Log error
      await this.logPerformance({
        extractionId,
        searchId: request.searchId,
        operation: ExtractionOperationType.VALIDATION,
        startTime: new Date(),
        endTime: new Date(),
        duration: processingTimeMs,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Update job status to failed
      const jobs = await prisma.aiExtractionJob.findMany({
        where: { extractionId }
      });

      for (const job of jobs) {
        await prisma.aiExtractionJob.update({
          where: { id: job.id },
          data: {
            status: ExtractionStatus.FAILED,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            completedAt: new Date(),
            processingTimeMs
          }
        });
      }

      throw new ContactExtractionError(
        `Contact extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'EXTRACTION_FAILED',
        'EXTRACTION_ERROR',
        { extractionId, error }
      );
    }
  }

  /**
   * Process a single source URL
   */
  private async processSource(
    url: string,
    extractionId: string,
    searchId: string,
    options: ContactExtractionOptions,
    processingSteps: ProcessingStep[]
  ): Promise<ExtractedContact[]> {
    // Check cache first
    if (options.enableCaching) {
      const cachedResult = await this.cache.get(url);
      if (cachedResult) {
        // Update cached contacts with current extraction context
        return cachedResult.extractedData.map(contact => ({
          ...contact,
          extractionId,
          searchId
        }));
      }
    }

    // Step 1: Parse content
    const content = await this.contentParser.parseContent(url, {
      format: 'markdown',
      includeImages: false,
      includeLinks: true,
      timeout: options.processingTimeout
    });

    // Step 2: Quality assessment
    const qualityAssessment = await this.qualityAssessor.assessContentQuality(content);

    // Skip low-quality content if strict validation is enabled
    if (options.strictValidation && qualityAssessment.overallScore < 0.3) {
      throw new ContactExtractionError(
        `Content quality too low: ${qualityAssessment.overallScore}`,
        'LOW_QUALITY_CONTENT',
        'QUALITY_ERROR'
      );
    }

    // Step 3: Extract contacts using AI
    let extractedContacts: ExtractedContact[] = [];
    if (options.enableAIEnhancement) {
      extractedContacts = await this.aiIdentifier.extractContacts(content, {
        maxContacts: options.maxContactsPerSource,
        includeBio: options.includeBio,
        includeSocialProfiles: options.includeSocialProfiles,
        strictValidation: options.strictValidation
      });
    }

    // Step 4: Email validation
    if (options.enableEmailValidation) {
      for (const contact of extractedContacts) {
        if (contact.email) {
          const validation = await this.emailValidator.validateEmail(contact.email, {
            enableDomainCheck: true,
            enableMXRecordCheck: true,
            enableDisposableCheck: true,
            strictMode: options.strictValidation
          });

          contact.emailValidation = validation.isValid ? 'VALID' : 'INVALID';
          contact.emailType = validation.isDisposable ? 'DISPOSABLE' :
                              validation.isTemporary ? 'TEMPORARY' : 'PERSONAL';
        }
      }
    }

    // Step 5: Social media detection
    if (options.enableSocialDetection) {
      for (const contact of extractedContacts) {
        if (options.includeSocialProfiles && contact.bio) {
          const socialProfiles = this.socialDetector.detectSocialProfiles(contact.bio);
          if (socialProfiles.length > 0) {
            contact.socialProfiles = [...(contact.socialProfiles || []), ...socialProfiles];
          }
        }
      }
    }

    // Step 6: Confidence and quality scoring
    for (const contact of extractedContacts) {
      const confidenceResult = this.confidenceScorer.calculateConfidenceScore(contact, {
        content,
        sourceCredibility: qualityAssessment.credibility,
        contentFreshness: qualityAssessment.freshness
      });

      const qualityResult = this.confidenceScorer.calculateQualityScore(contact, {
        content,
        sourceCredibility: qualityAssessment.credibility,
        contentFreshness: qualityAssessment.freshness,
        consistencyScore: qualityAssessment.factors.informationConsistency
      });

      contact.confidenceScore = confidenceResult.confidenceScore;
      contact.qualityScore = qualityResult.qualityScore;
      contact.relevanceScore = this.confidenceScorer.calculateRelevanceScore(contact, content);

      // Update metadata with scoring results
      contact.metadata.confidenceFactors = confidenceResult.confidenceFactors;
      contact.metadata.qualityFactors = qualityResult.qualityFactors;
      contact.metadata.processingSteps = processingSteps;
    }

    // Step 7: Filter by confidence threshold
    const filteredContacts = extractedContacts.filter(
      contact => contact.confidenceScore >= options.confidenceThreshold
    );

    // Cache results if enabled
    if (options.enableCaching) {
      await this.cache.set(url, content, filteredContacts, qualityAssessment.overallScore);
    }

    // Update contacts with extraction context
    return filteredContacts.map(contact => ({
      ...contact,
      extractionId,
      searchId
    }));
  }

  /**
   * Apply quality filters to contacts
   */
  private async applyQualityFilters(
    contacts: ExtractedContact[],
    request: ContactExtractionRequest
  ): Promise<ExtractedContact[]> {
    let filteredContacts = [...contacts];

    // Filter by confidence threshold
    filteredContacts = filteredContacts.filter(
      contact => contact.confidenceScore >= request.options.confidenceThreshold
    );

    // Filter by quality score if quality assessment is enabled
    if (request.options.enableQualityAssessment) {
      filteredContacts = filteredContacts.filter(
        contact => contact.qualityScore >= 0.3
      );
    }

    // Filter out disposable/temporary emails if strict validation
    if (request.options.strictValidation) {
      filteredContacts = filteredContacts.filter(contact => {
        if (contact.emailValidation === 'DISPOSABLE' || contact.emailValidation === 'TEMPORARY') {
          return false;
        }
        return true;
      });
    }

    // Limit contacts per source if specified
    if (request.options.maxContactsPerSource > 0) {
      const contactsBySource = new Map<string, ExtractedContact[]>();

      for (const contact of filteredContacts) {
        const source = contact.sourceUrl;
        if (!contactsBySource.has(source)) {
          contactsBySource.set(source, []);
        }
        contactsBySource.get(source)!.push(contact);
      }

      const limitedContacts: ExtractedContact[] = [];
      for (const [source, sourceContacts] of contactsBySource) {
        // Sort by confidence score and take top N
        sourceContacts.sort((a, b) => b.confidenceScore - a.confidenceScore);
        limitedContacts.push(...sourceContacts.slice(0, request.options.maxContactsPerSource));
      }

      filteredContacts = limitedContacts;
    }

    return filteredContacts;
  }

  /**
   * Create extraction job record
   */
  private async createExtractionJob(
    extractionId: string,
    request: ContactExtractionRequest
  ): Promise<ExtractionJob> {
    const job = await prisma.aiExtractionJob.create({
      data: {
        id: this.generateJobId(),
        searchId: request.searchId,
        sourceUrl: request.sources.map(s => s.url).join(','),
        sourceType: 'web_content',
        status: ExtractionStatus.PROCESSING,
        options: JSON.stringify(request.options),
        userId: request.userId,
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    return job;
  }

  /**
   * Update job progress
   */
  private async updateJobProgress(
    jobId: string,
    sourcesProcessed: number,
    contactsFound: number
  ): Promise<void> {
    await prisma.aiExtractionJob.update({
      where: { id: jobId },
      data: {
        contactsFound,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Update job completion
   */
  private async updateJobCompletion(
    jobId: string,
    status: ExtractionStatus,
    metrics: {
      contactsFound: number;
      contactsImported: number;
      processingTimeMs: number;
    }
  ): Promise<void> {
    await prisma.aiExtractionJob.update({
      where: { id: jobId },
      data: {
        status,
        contactsFound: metrics.contactsFound,
        contactsImported: metrics.contactsImported,
        averageConfidence: this.calculateAverageConfidence([]), // Would calculate from actual contacts
        qualityScore: this.calculateAverageQuality([]), // Would calculate from actual contacts
        processingTimeMs: metrics.processingTimeMs,
        completedAt: new Date(),
        updatedAt: new Date()
      }
    });
  }

  /**
   * Save extraction results to database
   */
  private async saveExtractionResults(
    extractionId: string,
    deduplicationResult: {
      uniqueContacts: ExtractedContact[];
      duplicateGroups: any[];
    },
    processingTimeMs: number
  ): Promise<void> {
    // Save extracted contacts
    for (const contact of deduplicationResult.uniqueContacts) {
      await prisma.aiExtractedContact.create({
        data: {
          id: contact.id,
          extractionId,
          searchId: contact.searchId,
          sourceUrl: contact.sourceUrl,
          name: contact.name,
          title: contact.title,
          bio: contact.bio,
          email: contact.email,
          emailType: contact.emailType || undefined,
          confidenceScore: contact.confidenceScore,
          relevanceScore: contact.relevanceScore,
          qualityScore: contact.qualityScore,
          extractionMethod: contact.extractionMethod,
          socialProfiles: JSON.stringify(contact.socialProfiles || []),
          contactInfo: JSON.stringify(contact.contactInfo || {}),
          verificationStatus: contact.verificationStatus,
          isDuplicate: contact.isDuplicate,
          metadata: JSON.stringify(contact.metadata),
          processingTimeMs: contact.processingTimeMs,
          createdAt: contact.createdAt
        }
      });
    }

    // Save duplicate groups
    for (const duplicateGroup of deduplicationResult.duplicateGroups) {
      await prisma.aiExtractedContact.updateMany({
        where: {
          id: { in: duplicateGroup.contacts }
        },
        data: {
          isDuplicate: true,
          duplicateOf: duplicateGroup.selectedContact
        }
      });
    }
  }

  /**
   * Log performance metrics
   */
  private async logPerformance(log: {
    extractionId: string;
    searchId: string;
    operation: ExtractionOperationType;
    startTime: Date;
    endTime?: Date;
    duration?: number;
    status: string;
    contentLength?: number;
    contactsProcessed?: number;
    tokensUsed?: number;
    modelUsed?: string;
    successRate?: number;
    error?: string;
  }): Promise<void> {
    try {
      await prisma.aiExtractionLog.create({
        data: {
          id: this.generateLogId(),
          extractionId: log.extractionId,
          searchId: log.searchId,
          operation: log.operation,
          startTime: log.startTime,
          endTime: log.endTime,
          duration: log.duration,
          status: log.status,
          contentLength: log.contentLength,
          contactsProcessed: log.contactsProcessed,
          tokensUsed: log.tokensUsed,
          modelUsed: log.modelUsed,
          successRate: log.successRate,
          metadata: log.error ? JSON.stringify({ error: log.error }) : null,
          createdAt: new Date()
        }
      });
    } catch (error) {
      console.error('Failed to log performance metrics:', error);
    }
  }

  /**
   * Calculate extraction metrics
   */
  private calculateExtractionMetrics(
    allContacts: ExtractedContact[],
    deduplicationResult: {
      duplicateGroups: any[];
      uniqueContacts: ExtractedContact[];
      totalDuplicates: number;
      duplicateRate: number;
    },
    processingTimeMs: number
  ) {
    const confidenceDistribution = {
      high: allContacts.filter(c => c.confidenceScore > 0.8).length,
      medium: allContacts.filter(c => c.confidenceScore >= 0.5 && c.confidenceScore <= 0.8).length,
      low: allContacts.filter(c => c.confidenceScore < 0.5).length
    };

    const extractionMethodBreakdown = allContacts.reduce((acc, contact) => {
      acc[contact.extractionMethod] = (acc[contact.extractionMethod] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sourceQualityDistribution = {
      high: allContacts.filter(c => c.qualityScore > 0.8).length,
      medium: allContacts.filter(c => c.qualityScore >= 0.5 && c.qualityScore <= 0.8).length,
      low: allContacts.filter(c => c.qualityScore < 0.5).length
    };

    return {
      processingSpeed: processingTimeMs > 0 ? (allContacts.length / (processingTimeMs / 1000)) : 0,
      accuracyEstimate: this.calculateAverageConfidence(deduplicationResult.uniqueContacts),
      confidenceDistribution,
      extractionMethodBreakdown,
      sourceQualityDistribution,
      validationResults: {
        emailValidationRate: allContacts.filter(c => c.emailValidation === 'VALID').length / Math.max(allContacts.length, 1),
        socialValidationRate: allContacts.filter(c => c.socialProfiles && c.socialProfiles.length > 0).length / Math.max(allContacts.length, 1),
        duplicateDetectionRate: deduplicationResult.duplicateRate
      }
    };
  }

  /**
   * Calculate average confidence score
   */
  private calculateAverageConfidence(contacts: ExtractedContact[]): number {
    if (contacts.length === 0) return 0;
    const sum = contacts.reduce((acc, contact) => acc + contact.confidenceScore, 0);
    return Math.round((sum / contacts.length) * 100) / 100;
  }

  /**
   * Calculate average quality score
   */
  private calculateAverageQuality(contacts: ExtractedContact[]): number {
    if (contacts.length === 0) return 0;
    const sum = contacts.reduce((acc, contact) => acc + (contact.qualityScore || 0), 0);
    return Math.round((sum / contacts.length) * 100) / 100;
  }

  /**
   * Generate unique IDs
   */
  private generateExtractionId(): string {
    return `ext_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get extraction statistics
   */
  async getExtractionStatistics(userId?: string): Promise<{
    totalExtractions: number;
    successfulExtractions: number;
    averageContactsPerSource: number;
    averageConfidence: number;
    averageProcessingTime: number;
    extractionMethodBreakdown: Record<string, number>;
    sourceTypeBreakdown: Record<string, number>;
    qualityDistribution: {
      high: number;
      medium: number;
      low: number;
    };
    validationStats: {
      emailValidationRate: number;
      duplicateDetectionRate: number;
      overallAccuracy: number;
    };
    performanceStats: {
      throughput: number;
      latency: number;
      errorRate: number;
    };
  }> {
    const whereClause = userId ? { userId } : {};

    const jobs = await prisma.aiExtractionJob.findMany({
      where: whereClause,
      include: {
        extractedContacts: true
      }
    });

    const totalExtractions = jobs.length;
    const successfulExtractions = jobs.filter(job => job.status === ExtractionStatus.COMPLETED).length;
    const totalContacts = jobs.reduce((sum, job) => sum + job.contactsFound, 0);
    const totalProcessingTime = jobs.reduce((sum, job) => sum + (job.processingTimeMs || 0), 0);

    const allContacts = jobs.flatMap(job => job.extractedContacts);
    const averageConfidence = this.calculateAverageConfidence(allContacts);
    const averageProcessingTime = totalExtractions > 0 ? totalProcessingTime / totalExtractions : 0;

    const extractionMethodBreakdown = allContacts.reduce((acc, contact) => {
      acc[contact.extractionMethod] = (acc[contact.extractionMethod] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const qualityDistribution = {
      high: allContacts.filter(c => c.confidenceScore > 0.8).length,
      medium: allContacts.filter(c => c.confidenceScore >= 0.5 && c.confidenceScore <= 0.8).length,
      low: allContacts.filter(c => c.confidenceScore < 0.5).length
    };

    const validEmails = allContacts.filter(c => c.emailValidation === 'VALID').length;
    const duplicates = allContacts.filter(c => c.isDuplicate).length;

    return {
      totalExtractions,
      successfulExtractions,
      averageContactsPerSource: totalExtractions > 0 ? totalContacts / totalExtractions : 0,
      averageConfidence,
      averageProcessingTime,
      extractionMethodBreakdown,
      sourceTypeBreakdown: {}, // Would be populated based on source analysis
      qualityDistribution,
      validationStats: {
        emailValidationRate: allContacts.length > 0 ? validEmails / allContacts.length : 0,
        duplicateDetectionRate: allContacts.length > 0 ? duplicates / allContacts.length : 0,
        overallAccuracy: averageConfidence
      },
      performanceStats: {
        throughput: averageProcessingTime > 0 ? (totalContacts / (averageProcessingTime / 1000)) : 0,
        latency: averageProcessingTime,
        errorRate: totalExtractions > 0 ? (totalExtractions - successfulExtractions) / totalExtractions : 0
      }
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.cache.destroy();
  }
}