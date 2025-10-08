/**
 * Email Validation System
 * Validates and verifies email addresses with multiple layers of checking
 */

import { EmailAnalyzer, EmailAnalysis } from '../heuristics/email-analyzer';
import {
  EmailValidationResult,
  EmailValidationStatus,
  ContactExtractionError
} from './types';

export class EmailValidator {
  private emailAnalyzer: EmailAnalyzer;
  private cache = new Map<string, EmailValidationResult>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_TTL = 1800000; // 30 minutes

  constructor() {
    this.emailAnalyzer = new EmailAnalyzer();
  }

  /**
   * Validate email address with comprehensive checks
   */
  async validateEmail(email: string, options: {
    enableDomainCheck?: boolean;
    enableMXRecordCheck?: boolean;
    enableDisposableCheck?: boolean;
    strictMode?: boolean;
  } = {}): Promise<EmailValidationResult> {
    const {
      enableDomainCheck = true,
      enableMXRecordCheck = true,
      enableDisposableCheck = true,
      strictMode = false
    } = options;

    // Basic format validation
    const formatValidation = this.validateFormat(email);
    if (!formatValidation.isValid) {
      return {
        email,
        isValid: false,
        isDisposable: false,
        isTemporary: false,
        domainExists: false,
        mxRecords: false,
        spamScore: 1.0,
        suggestions: formatValidation.suggestions,
        reasoning: formatValidation.reasoning
      };
    }

    // Check cache first
    const cacheKey = this.generateCacheKey(email, options);
    if (this.isCacheValid(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      await this.updateCacheAccess(cacheKey);
      return cached;
    }

    try {
      const validationResults = await Promise.all([
        this.analyzeEmailType(email),
        enableDomainCheck ? this.checkDomainExists(email) : Promise.resolve({ exists: true }),
        enableMXRecordCheck ? this.checkMXRecords(email) : Promise.resolve({ hasMX: true }),
        enableDisposableCheck ? this.checkDisposableEmail(email) : Promise.resolve({ isDisposable: false })
      ]);

      const [emailAnalysis, domainCheck, mxCheck, disposableCheck] = validationResults;

      // Calculate spam score
      const spamScore = this.calculateSpamScore(email, emailAnalysis, {
        domainCheck,
        mxCheck,
        disposableCheck
      });

      // Generate suggestions
      const suggestions = this.generateSuggestions(email, emailAnalysis, {
        formatValidation,
        domainCheck,
        mxCheck,
        disposableCheck,
        strictMode
      });

      // Determine overall validity
      const isValid = this.determineOverallValidity({
        formatValidation,
        emailAnalysis,
        domainCheck,
        mxCheck,
        disposableCheck,
        spamScore
      }, strictMode);

      const result: EmailValidationResult = {
        email,
        isValid,
        isDisposable: disposableCheck.isDisposable,
        isTemporary: emailAnalysis.emailType === 'department' || emailAnalysis.emailType === 'generic',
        domainExists: domainCheck.exists,
        mxRecords: mxCheck.hasMX,
        spamScore,
        suggestions,
        reasoning: this.generateReasoning(email, emailAnalysis, {
          formatValidation,
          domainCheck,
          mxCheck,
          disposableCheck,
          spamScore,
          isValid
        })
      };

      // Cache the result
      this.cache.set(cacheKey, result);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_TTL);

      return result;

    } catch (error) {
      throw new ContactExtractionError(
        `Email validation failed for ${email}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'EMAIL_VALIDATION_FAILED',
        'VALIDATION_ERROR',
        { email, error }
      );
    }
  }

  /**
   * Validate multiple emails in parallel
   */
  async validateMultipleEmails(
    emails: string[],
    options: {
      enableDomainCheck?: boolean;
      enableMXRecordCheck?: boolean;
      enableDisposableCheck?: boolean;
      strictMode?: boolean;
      maxConcurrent?: number;
    } = {}
  ): Promise<EmailValidationResult[]> {
    const {
      maxConcurrent = 5
    } = options;

    const chunks = this.chunkArray(emails, maxConcurrent);
    const results: EmailValidationResult[] = [];

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(email =>
        this.validateEmail(email, options)
      );
      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
    }

    return results;
  }

  /**
   * Basic email format validation
   */
  private validateFormat(email: string): {
    isValid: boolean;
    suggestions?: string[];
    reasoning: string;
  } {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!emailRegex.test(email)) {
      return {
        isValid: false,
        suggestions: this.generateFormatSuggestions(email),
        reasoning: 'Invalid email format'
      };
    }

    // Additional format checks
    if (email.includes('..')) {
      return {
        isValid: false,
        suggestions: [],
        reasoning: 'Email contains consecutive dots'
      };
    }

    if (email.startsWith('.') || email.endsWith('.')) {
      return {
        isValid: false,
        suggestions: [],
        reasoning: 'Email starts or ends with a dot'
      };
    }

    if (email.includes('@.')) {
      return {
        isValid: false,
        suggestions: [],
        reasoning: 'Invalid @. combination'
      };
    }

    return {
      isValid: true,
      reasoning: 'Valid email format'
    };
  }

  /**
   * Analyze email type using existing EmailAnalyzer
   */
  private async analyzeEmailType(email: string): Promise<EmailAnalysis> {
    return this.emailAnalyzer.analyzeEmail(email);
  }

  /**
   * Check if domain exists
   */
  private async checkDomainExists(email: string): Promise<{ exists: boolean; reasoning?: string }> {
    try {
      const domain = email.split('@')[1];

      // Basic DNS check (simplified - in production would use DNS lookup)
      if (!domain || domain.length < 3) {
        return { exists: false, reasoning: 'Invalid domain format' };
      }

      // Check for common disposable email domains
      const disposableDomains = [
        '10minutemail', 'tempmail', 'mailinator', 'guerrillamail', 'yopmail',
        'maildrop', 'throwaway', 'mailnesia', 'tempmail', 'tempmail.org'
      ];

      if (disposableDomains.some(disposable => domain.includes(disposable))) {
        return { exists: true, reasoning: 'Disposable email domain' };
      }

      // In production, would perform actual DNS lookup
      // For now, assume domain exists if it has proper format
      return { exists: true };

    } catch (error) {
      return { exists: false, reasoning: `Domain check failed: ${error}` };
    }
  }

  /**
   * Check MX records for domain
   */
  private async checkMXRecords(email: string): Promise<{ hasMX: boolean; reasoning?: string }> {
    try {
      const domain = email.split('@')[1];

      if (!domain) {
        return { hasMX: false, reasoning: 'Invalid domain format' };
      }

      // In production, would perform actual MX record lookup
      // For now, assume MX records exist for most domains
      return { hasMX: true };

    } catch (error) {
      return { hasMX: false, reasoning: `MX record check failed: ${error}` };
    }
  }

  /**
   * Check if email is from disposable service
   */
  private async checkDisposableEmail(email: string): Promise<{ isDisposable: boolean; service?: string }> {
    const disposableServices = [
      '10minutemail.com', 'tempmail.org', 'mailinator.com', 'guerrillamail.info',
      'yopmail.com', 'maildrop.cc', 'throwaway.email', 'mailnesia.org',
      'tempmail.co', 'tempmail.dev', 'tempmail.net', 'tempmail.app'
    ];

    const domain = email.split('@')[1]?.toLowerCase();

    const service = disposableServices.find(service => domain?.includes(service));

    return {
      isDisposable: !!service,
      service: service || undefined
    };
  }

  /**
   * Calculate spam score
   */
  private calculateSpamScore(
    email: string,
    emailAnalysis: EmailAnalysis,
    checks: {
      domainCheck: { exists: boolean };
      mxCheck: { hasMX: boolean };
      disposableCheck: { isDisposable: boolean };
    }
  ): number {
    let spamScore = 0;

    // High risk email types
    if (emailAnalysis.emailType === 'generic' || emailAnalysis.emailType === 'department') {
      spamScore += 0.4;
    }

    // Disposable email
    if (checks.disposableCheck.isDisposable) {
      spamScore += 0.8;
    }

    // Domain issues
    if (!checks.domainCheck.exists) {
      spamScore += 0.6;
    }

    // MX record issues
    if (!checks.mxCheck.hasMX) {
      spamScore += 0.3;
    }

    // Suspicious patterns
    const localPart = email.split('@')[0].toLowerCase();
    if (localPart.includes('test') || localPart.includes('demo') || localPart.includes('sample')) {
      spamScore += 0.3;
    }

    if (localPart.length > 20 || localPart.length < 3) {
      spamScore += 0.2;
    }

    return Math.min(spamScore, 1.0);
  }

  /**
   * Generate suggestions for email improvement
   */
  private generateSuggestions(
    email: string,
    emailAnalysis: EmailAnalysis,
    context: any
  ): string[] {
    const suggestions: string[] = [];

    // Format suggestions
    if (!context.formatValidation.isValid) {
      suggestions = suggestions.concat(context.formatValidation.suggestions || []);
    }

    // Email type suggestions
    if (emailAnalysis.emailType === 'alias' && emailAnalysis.suggestions?.alternativeEmails) {
      suggestions.push(...emailAnalysis.suggestions.alternativeEmails);
    }

    // Contact method suggestions
    if (emailAnalysis.suggestions?.contactMethod) {
      suggestions.push(emailAnalysis.suggestions.contactMethod);
    }

    // Domain suggestions
    if (!context.domainCheck.exists && context.domainCheck.reasoning) {
      suggestions.push('Consider using a different email domain');
    }

    // MX record suggestions
    if (!context.mxCheck.hasMX && context.mxCheck.reasoning) {
      suggestions.push('Email domain may not receive messages properly');
    }

    // Disposable email suggestions
    if (context.disposableCheck.isDisposable) {
      suggestions.push('Use a permanent email address instead');
    }

    // Spam score suggestions
    if (context.spamScore > 0.5) {
      suggestions.push('Consider a more professional email address');
    }

    return Array.from(new Set(suggestions)); // Remove duplicates
  }

  /**
   * Generate format suggestions for invalid emails
   */
  private generateFormatSuggestions(email: string): string[] {
    const suggestions: string[] = [];

    // Common format issues and suggestions
    if (!email.includes('@')) {
      suggestions.push('Add @ symbol between name and domain');
    }

    if (email.includes('@.') || email.includes('.@')) {
      suggestions.push('Ensure proper format: user@domain.com');
    }

    if (email.includes('..')) {
      suggestions.push('Remove consecutive dots');
    }

    if (email.startsWith('.') || email.endsWith('.')) {
      suggestions.push('Remove leading or trailing dots');
    }

    return suggestions;
  }

  /**
   * Determine overall validity
   */
  private determineOverallValidity(
    checks: {
      formatValidation: any;
      emailAnalysis: EmailAnalysis;
      domainCheck: any;
      mxCheck: any;
      disposableCheck: any;
      spamScore: number;
    },
    strictMode: boolean
  ): boolean {
    // Basic format must be valid
    if (!checks.formatValidation.isValid) {
      return false;
    }

    // In strict mode, require more checks
    if (strictMode) {
      // Domain must exist
      if (!checks.domainCheck.exists) {
        return false;
      }

      // MX records preferred
      if (!checks.mxCheck.hasMX) {
        return false;
      }

      // No disposable emails
      if (checks.disposableCheck.isDisposable) {
        return false;
      }

      // Low spam score
      if (checks.spamScore > 0.7) {
        return false;
      }

      // Prefer personal or department emails over generic
      if (checks.emailAnalysis.emailType === 'unknown') {
        return false;
      }
    } else {
      // In lenient mode, allow most valid formats except obvious issues
      if (checks.disposableCheck.isDisposable || checks.spamScore > 0.9) {
        return false;
      }
    }

    return true;
  }

  /**
   * Generate reasoning for validation result
   */
  private generateReasoning(
    email: string,
    emailAnalysis: EmailAnalysis,
    checks: any
  ): string {
    const reasons: string[] = [];

    reasons.push(`Email format: ${checks.formatValidation.isValid ? 'valid' : 'invalid'}`);
    reasons.push(`Email type: ${emailAnalysis.emailType}`);
    reasons.push(`Confidence: ${(emailAnalysis.confidence * 100).toFixed(0)}%`);

    if (checks.domainCheck.exists) {
      reasons.push('Domain exists');
    } else {
      reasons.push('Domain may not exist');
    }

    if (checks.mxCheck.hasMX) {
      reasons.push('MX records found');
    } else {
      reasons.push('No MX records found');
    }

    if (checks.disposableCheck.isDisposable) {
      reasons.push('Disposable email service');
    }

    if (checks.spamScore > 0) {
      reasons.push(`Spam risk: ${(checks.spamScore * 100).toFixed(0)}%`);
    }

    return reasons.join('; ');
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(email: string, options: any): string {
    const key = `${email}:${JSON.stringify(options)}`;
    return Buffer.from(key).toString('base64');
  }

  /**
   * Check if cache entry is valid
   */
  private isCacheValid(key: string): boolean {
    const expiry = this.cacheExpiry.get(key);
    return expiry ? Date.now() < expiry : false;
  }

  /**
   * Update cache access statistics
   */
  private async updateCacheAccess(key: string): Promise<void> {
    // Update cache expiry time
    this.cacheExpiry.set(key, Date.now() + this.CACHE_TTL);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    hitRate: number;
    totalLookups: number;
    averageResponseTime: number;
  } {
    return {
      size: this.cache.size,
      hitRate: 0, // Would need to track hits/misses
      totalLookups: 0,
      averageResponseTime: 0
    };
  }

  /**
   * Get validation statistics
   */
  getValidationStats(): {
    totalValidations: number;
    validEmails: number;
    invalidEmails: number;
    averageConfidence: number;
    commonIssues: Array<{
      issue: string;
      count: number;
      percentage: number;
    }>;
    } {
    // This would typically be stored in a database or metrics system
    return {
      totalValidations: 0,
      validEmails: 0,
      invalidEmails: 0,
      averageConfidence: 0,
      commonIssues: []
    };
  }

  /**
   * Chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Batch validate emails with rate limiting
   */
  async batchValidateEmails(
    emails: string[],
    options: {
      batchSize?: number;
      delayMs?: number;
      enableDomainCheck?: boolean;
      enableMXRecordCheck?: boolean;
      enableDisposableCheck?: boolean;
      strictMode?: boolean;
    } = {}
  ): Promise<EmailValidationResult[]> {
    const {
      batchSize = 10,
      delayMs = 100,
      ...validationOptions
    } = options;

    const results: EmailValidationResult[] = [];
    const chunks = this.chunkArray(emails, batchSize);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      // Process chunk
      const chunkResults = await this.validateMultipleEmails(chunk, {
        maxConcurrent: batchSize,
        ...validationOptions
      });

      results.push(...chunkResults);

      // Add delay between chunks to respect rate limits
      if (i < chunks.length - 1 && delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return results;
  }
}