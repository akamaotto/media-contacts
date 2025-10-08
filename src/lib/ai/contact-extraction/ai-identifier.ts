/**
 * AI Contact Identification
 * Uses AI models to identify contact information from web content
 */

import { aiServiceManager } from '../services';
import {
  ExtractedContact,
  ParsedContent,
  ContactExtractionError,
  ExtractionMethod,
  ExtractionOperationType,
  ProcessingStep
} from './types';
import crypto from 'crypto';

export class AIContactIdentifier {
  private readonly maxTokens = 2000;
  private readonly temperature = 0.3;
  private readonly maxRetries = 3;

  /**
   * Extract contacts from parsed content using AI
   */
  async extractContacts(
    content: ParsedContent,
    options: {
      maxContacts?: number;
      includeBio?: boolean;
      includeSocialProfiles?: boolean;
      strictValidation?: boolean;
    } = {}
  ): Promise<ExtractedContact[]> {
    const {
      maxContacts = 10,
      includeBio = true,
      includeSocialProfiles = true,
      strictValidation = true
    } = options;

    const processingSteps: ProcessingStep[] = [];
    const startTime = Date.now();

    try {
      // Log AI extraction start
      processingSteps.push({
        operation: ExtractionOperationType.AI_EXTRACTION,
        startTime: new Date(),
        status: 'processing'
      });

      // Prepare the content for AI processing
      const processedContent = this.prepareContentForAI(content, includeBio, includeSocialProfiles);

      // Build the AI prompt
      const prompt = this.buildExtractionPrompt(processedContent, {
        maxContacts,
        includeBio,
        includeSocialProfiles,
        strictValidation
      });

      // Call AI service
      const aiResponse = await this.callAI(prompt, 'contact_extraction');

      // Parse AI response
      const extractedContacts = this.parseAIResponse(aiResponse, {
        sourceUrl: content.url,
        extractionId: this.generateId(),
        searchId: '', // Will be set by the service
        processingSteps,
        startTime
      });

      // Validate and filter contacts
      const validatedContacts = this.validateAndFilterContacts(extractedContacts, {
        strictValidation,
        minConfidence: 0.3
      });

      // Limit to max contacts
      const finalContacts = validatedContacts.slice(0, maxContacts);

      // Update processing step
      processingSteps[0].endTime = new Date();
      processingSteps[0].duration = Date.now() - startTime;
      processingSteps[0].status = 'completed';
      processingSteps[0].details = {
        contactsFound: finalContacts.length,
        contentLength: processedContent.length
      };

      return finalContacts;

    } catch (error) {
      processingSteps[0].endTime = new Date();
      processingSteps[0].duration = Date.now() - startTime;
      processingSteps[0].status = 'failed';
      processingSteps[0].details = {
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      throw new ContactExtractionError(
        `AI contact extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'AI_EXTRACTION_FAILED',
        'AI_ERROR',
        { content: content.url, error }
      );
    }
  }

  /**
   * Prepare content for AI processing
   */
  private prepareContentForAI(
    content: ParsedContent,
    includeBio: boolean,
    includeSocialProfiles: boolean
  ): string {
    let processedContent = '';

    // Add title and metadata
    if (content.title) {
      processedContent += `Title: ${content.title}\n`;
    }

    if (content.author) {
      processedContent += `Author: ${content.author}\n`;
    }

    if (content.publishedAt) {
      processedContent += `Published: ${content.publishedAt.toISOString()}\n`;
    }

    processedContent += `URL: ${content.url}\n\n`;

    // Add main content
    processedContent += 'Content:\n';
    processedContent += content.content;

    // Focus on sections likely to contain contact information
    if (includeBio) {
      const bioSections = this.extractBioSections(content.content);
      if (bioSections.length > 0) {
        processedContent += '\n\nBio Sections:\n';
        processedContent += bioSections.join('\n');
      }
    }

    // Extract social media handles if requested
    if (includeSocialProfiles) {
      const socialSections = this.extractSocialSections(content.content);
      if (socialSections.length > 0) {
        processedContent += '\n\nSocial Media Mentions:\n';
        processedContent += socialSections.join('\n');
      }
    }

    // Limit content length for AI processing
    if (processedContent.length > 4000) {
      processedContent = processedContent.substring(0, 4000) + '...';
    }

    return processedContent;
  }

  /**
   * Extract sections likely to contain bio information
   */
  private extractBioSections(content: string): string[] {
    const bioSections: string[] = [];

    // Look for common bio section indicators
    const bioIndicators = [
      'about the author',
      'about',
      'bio',
      'profile',
      'background',
      'experience',
      'education',
      'contact',
      'reach out',
      'follow',
      'connect'
    ];

    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);

    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      if (bioIndicators.some(indicator => lowerSentence.includes(indicator))) {
        // Look for sentences with contact information indicators
        const contactIndicators = ['@', 'email', 'phone', 'twitter', 'linkedin', 'instagram', 'facebook'];
        if (contactIndicators.some(indicator => lowerSentence.includes(indicator))) {
          bioSections.push(sentence.trim());
        }
      }
    }

    return bioSections;
  }

  /**
   * Extract sections with social media information
   */
  private extractSocialSections(content: string): string[] {
    const socialSections: string[] = [];

    // Social media patterns
    const socialPatterns = [
      /twitter\.com\/\w+/gi,
      /linkedin\.com\/in\/\w+/gi,
      /instagram\.com\/\w+/gi,
      /facebook\.com\/\w+/gi,
      /@\w+/gi
    ];

    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);

    for (const sentence of sentences) {
      for (const pattern of socialPatterns) {
        if (pattern.test(sentence)) {
          socialSections.push(sentence.trim());
          break;
        }
      }
    }

    return socialSections;
  }

  /**
   * Build AI prompt for contact extraction
   */
  private buildExtractionPrompt(
    content: string,
    options: {
      maxContacts: number;
      includeBio: boolean;
      includeSocialProfiles: boolean;
      strictValidation: boolean;
    }
  ): string {
    const { maxContacts, includeBio, includeSocialProfiles, strictValidation } = options;

    let prompt = `You are an expert at identifying contact information from web content. Extract up to ${maxContacts} contacts from the following content.

Content:
${content}

Instructions:
1. Only extract contacts that appear to be real people (journalists, authors, experts, etc.)
2. Include the following information for each contact:
   - Full name (required)
   - Title or position (if available)
   - Email address (if clearly visible and legitimate)
   - Brief bio or description (if available)
   - Social media profiles (if clearly mentioned)

${includeBio ? '3. Look for "about", "bio", or "profile" sections for additional information.' : ''}
${includeSocialProfiles ? '4. Extract social media handles when clearly mentioned (Twitter, LinkedIn, Instagram, etc.).' : ''}
${strictValidation ? '5. Only include high-confidence contacts with clear evidence of who they are.' : '6. Include any reasonably identifiable contacts even if some information is incomplete.'}

Format your response as a JSON array with the following structure:
[
  {
    "name": "Full Name",
    "title": "Position/Title",
    "bio": "Brief description or bio",
    "email": "email@domain.com",
    "socialProfiles": [
      {
        "platform": "twitter",
        "handle": "@handle",
        "url": "https://twitter.com/handle"
      }
    ],
    "confidence": 0.85,
    "reasoning": "Brief explanation of why you identified this as a contact"
  }
]

Important:
- Do not include generic company emails (info@, contact@, etc.) unless they appear to belong to a specific person
- Do not include fictional or example contacts
- Provide confidence scores between 0.0 and 1.0
- If unsure about any field, omit it rather than guessing
- Ensure all URLs are complete and valid`;

    return prompt;
  }

  /**
   * Call AI service
   */
  private async callAI(prompt: string, operation: string): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const searchRequest = {
          query: prompt,
          filters: {},
          options: {
            maxResults: 1,
            priority: 'high',
            includeSummaries: true,
            extractContacts: false,
            scrapeContent: false
          }
        };

        const results = await aiServiceManager.searchWeb(searchRequest);

        if (results.length > 0 && results[0].content) {
          return results[0].content;
        }

        throw new Error('No content returned from AI service');

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.warn(`AI call attempt ${attempt} failed, retrying in ${delay}ms:`, lastError.message);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new ContactExtractionError(
      `AI call failed after ${this.maxRetries} attempts: ${lastError?.message || 'Unknown error'}`,
      'AI_CALL_FAILED',
      'AI_ERROR',
      { operation, lastError }
    );
  }

  /**
   * Parse AI response into contacts
   */
  private parseAIResponse(
    response: string,
    context: {
      sourceUrl: string;
      extractionId: string;
      searchId: string;
      processingSteps: ProcessingStep[];
      startTime: number;
    }
  ): ExtractedContact[] {
    try {
      // Try to parse as JSON
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in AI response');
      }

      const contactsData = JSON.parse(jsonMatch[0]);

      if (!Array.isArray(contactsData)) {
        throw new Error('AI response is not a valid array');
      }

      return contactsData.map((contactData: any, index: number) => {
        const id = this.generateId();
        const now = new Date();

        return {
          id,
          extractionId: context.extractionId,
          searchId: context.searchId,
          sourceUrl: context.sourceUrl,
          name: contactData.name || 'Unknown',
          title: contactData.title || undefined,
          bio: contactData.bio || undefined,
          email: contactData.email || undefined,
          confidenceScore: Math.min(Math.max(contactData.confidence || 0.5, 0), 1),
          relevanceScore: this.calculateRelevanceScore(contactData),
          qualityScore: this.calculateQualityScore(contactData),
          extractionMethod: ExtractionMethod.AI_BASED,
          socialProfiles: contactData.socialProfiles ? contactData.socialProfiles.map((sp: any) => ({
            platform: sp.platform || sp.type || 'unknown',
            handle: sp.handle || '',
            url: sp.url || '',
            verified: sp.verified || false,
            followers: sp.followers || undefined,
            description: sp.description || undefined
          })) : [],
          contactInfo: this.extractContactInfo(contactData),
          verificationStatus: 'PENDING',
          duplicateOf: undefined,
          isDuplicate: false,
          metadata: {
            extractionMethod: ExtractionMethod.AI_BASED,
            textSegments: [],
            aiModelUsed: 'gpt-4',
            confidenceFactors: {
              nameConfidence: contactData.name ? 0.9 : 0,
              emailConfidence: contactData.email ? 0.8 : 0,
              titleConfidence: contactData.title ? 0.7 : 0,
              bioConfidence: contactData.bio ? 0.6 : 0,
              socialConfidence: contactData.socialProfiles?.length ? 0.7 : 0,
              overallConfidence: Math.min(Math.max(contactData.confidence || 0.5, 0), 1)
            },
            qualityFactors: this.calculateQualityFactors(contactData),
            processingSteps: context.processingSteps,
            reasoning: contactData.reasoning || ''
          },
          processingTimeMs: Date.now() - context.startTime,
          createdAt: now
        };
      });

    } catch (error) {
      throw new ContactExtractionError(
        `Failed to parse AI response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'AI_PARSE_FAILED',
        'AI_ERROR',
        { response, error }
      );
    }
  }

  /**
   * Calculate relevance score for extracted contact
   */
  private calculateRelevanceScore(contactData: any): number {
    let score = 0.5; // Base score

    // Has email
    if (contactData.email) {
      score += 0.2;
    }

    // Has title
    if (contactData.title) {
      score += 0.15;
    }

    // Has bio
    if (contactData.bio) {
      score += 0.1;
    }

    // Has social profiles
    if (contactData.socialProfiles && contactData.socialProfiles.length > 0) {
      score += 0.15;
    }

    // Journalist indicators in name/title/bio
    const journalistIndicators = ['journalist', 'reporter', 'editor', 'author', 'writer', 'correspondent'];
    const combinedText = `${contactData.name} ${contactData.title} ${contactData.bio}`.toLowerCase();
    if (journalistIndicators.some(indicator => combinedText.includes(indicator))) {
      score += 0.1;
    }

    return Math.min(score, 1);
  }

  /**
   * Calculate quality score for extracted contact
   */
  private calculateQualityScore(contactData: any): number {
    let score = 0.5; // Base score

    // Complete name (first and last)
    if (contactData.name && contactData.name.split(' ').length >= 2) {
      score += 0.2;
    }

    // Professional email format
    if (contactData.email && this.isProfessionalEmail(contactData.email)) {
      score += 0.15;
    }

    // Professional title
    if (contactData.title && this.isProfessionalTitle(contactData.title)) {
      score += 0.1;
    }

    // Substantive bio
    if (contactData.bio && contactData.bio.length > 50) {
      score += 0.1;
    }

    // Verified social profiles
    const verifiedSocials = contactData.socialProfiles?.filter((sp: any) => sp.verified).length || 0;
    if (verifiedSocials > 0) {
      score += 0.15;
    }

    return Math.min(score, 1);
  }

  /**
   * Check if email is professional format
   */
  private isProfessionalEmail(email: string): boolean {
    const personalPatterns = [
      /^[a-z]+\.[a-z]+@/i, // firstname.lastname
      /^[a-z]+[a-z0-9]*@[a-z]+\.[a-z]{2,}$/i, // personal@domain
      /^[a-z]\.[a-z]+@[a-z]+\.[a-z]{2,}$/i // f.lastname@domain
    ];

    const genericPatterns = [
      /info@/,
      /contact@/,
      /hello@/,
      /news@/,
      /editor@/,
      /support@/,
      /admin@/
    ];

    const lowerEmail = email.toLowerCase();

    return personalPatterns.some(pattern => pattern.test(lowerEmail)) &&
           !genericPatterns.some(pattern => pattern.test(lowerEmail));
  }

  /**
   * Check if title is professional
   */
  private isProfessionalTitle(title: string): boolean {
    const professionalKeywords = [
      'editor', 'reporter', 'journalist', 'author', 'writer', 'correspondent',
      'analyst', 'expert', 'consultant', 'researcher', 'specialist',
      'senior', 'lead', 'chief', 'director', 'manager', 'head'
    ];

    const lowerTitle = title.toLowerCase();
    return professionalKeywords.some(keyword => lowerTitle.includes(keyword));
  }

  /**
   * Extract additional contact information
   */
  private extractContactInfo(contactData: any): any {
    const contactInfo: any = {};

    // Extract phone numbers if present
    if (contactData.phone) {
      contactInfo.phone = contactData.phone;
    }

    // Extract website if present
    if (contactData.website) {
      contactInfo.website = contactData.website;
    }

    // Extract social profiles into contact info
    if (contactData.socialProfiles) {
      contactData.socialProfiles.forEach((sp: any) => {
        if (sp.platform === 'linkedin') {
          contactInfo.linkedin = sp.url;
        } else if (sp.platform === 'twitter') {
          contactInfo.twitter = sp.url;
        }
      });
    }

    return contactInfo;
  }

  /**
   * Calculate quality factors
   */
  private calculateQualityFactors(contactData: any): any {
    return {
      sourceCredibility: 0.8, // Would be calculated based on source
      contentFreshness: 0.8, // Would be calculated based on content
      contactCompleteness: this.calculateCompleteness(contactData),
      informationConsistency: 0.9, // Would be calculated based on cross-validation
      overallQuality: 0.8
    };
  }

  /**
   * Calculate contact completeness
   */
  private calculateCompleteness(contactData: any): number {
    const fields = ['name', 'title', 'email', 'bio', 'socialProfiles'];
    const presentFields = fields.filter(field => contactData[field]);
    return presentFields.length / fields.length;
  }

  /**
   * Validate and filter contacts
   */
  private validateAndFilterContacts(
    contacts: ExtractedContact[],
    options: {
      strictValidation: boolean;
      minConfidence: number;
    }
  ): ExtractedContact[] {
    const { strictValidation, minConfidence } = options;

    return contacts.filter(contact => {
      // Basic validation
      if (!contact.name || contact.name.trim().length === 0) {
        return false;
      }

      // Confidence threshold
      if (contact.confidenceScore < minConfidence) {
        return false;
      }

      // Strict validation checks
      if (strictValidation) {
        // Must have either email or title
        if (!contact.email && !contact.title) {
          return false;
        }

        // Name must be realistic
        if (!this.isRealisticName(contact.name)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Check if name is realistic
   */
  private isRealisticName(name: string): boolean {
    // Remove common indicators of non-real names
    const suspiciousPatterns = [
      /\d/, // Numbers in name
      /^[A-Z]+$/, // All caps
      /^[a-z]+$/, // All lowercase
      /test|example|sample|demo/i, // Test names
      /^[a-z]\.?$/, // Just an initial
      /^.{2,}$/, // Too short
      /^.{30,}$/, // Too long
    ];

    return !suspiciousPatterns.some(pattern => pattern.test(name));
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `ai_contact_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Get AI identification statistics
   */
  getStats(): {
    totalExtractions: number;
    successRate: number;
    averageConfidence: number;
    averageContactsPerSource: number;
    extractionMethodBreakdown: Record<string, number>;
    errorRate: number;
  } {
    // This would typically be stored in a database or metrics system
    // For now, return placeholder values
    return {
      totalExtractions: 0,
      successRate: 0.85,
      averageConfidence: 0.72,
      averageContactsPerSource: 3.5,
      extractionMethodBreakdown: {
        'AI_BASED': 1,
        'RULE_BASED': 0,
        'HYBRID': 0,
        'MANUAL': 0
      },
      errorRate: 0.15
    };
  }
}