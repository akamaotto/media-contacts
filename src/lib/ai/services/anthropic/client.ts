/**
 * Anthropic Service Implementation
 * Provides integration with Anthropic Claude for advanced text analysis and validation
 */

import Anthropic from '@anthropic-ai/sdk';
import { BaseAIService } from '../base/service';
import {
  AIServiceRequest,
  ContactExtractionRequest,
  ContactExtractionResponse,
  ContentAnalysisRequest,
  ContentAnalysisResponse,
  ServiceHealth,
  RateLimitInfo,
  QuotaInfo,
  RetryConfig,
  CircuitBreakerConfig,
  CacheConfig
} from '../base/types';
import { AnthropicConfig } from '../config/types';
import { aiConfigManager } from '../config/manager';

interface AnthropicServiceMetrics {
  requests: number;
  tokens: {
    input: number;
    output: number;
    cacheWrite: number;
    cacheRead: number;
  };
  cost: number;
  errors: number;
  rateLimitHits: number;
  cacheHits: number;
  contextCacheHits: number;
}

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string | Array<{
    type: 'text';
    text: string;
  }>;
}

interface ClaudeResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: 'text';
    text: string;
  }>;
  model: string;
  stop_reason: string;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
}

export class AnthropicService extends BaseAIService {
  private client: Anthropic | null = null;
  private config: AnthropicConfig | null = null;
  private metrics: AnthropicServiceMetrics = {
    requests: 0,
    tokens: { input: 0, output: 0, cacheWrite: 0, cacheRead: 0 },
    cost: 0,
    errors: 0,
    rateLimitHits: 0,
    cacheHits: 0,
    contextCacheHits: 0
  };

  private constructor() {
    const retryConfig: RetryConfig = {
      maxAttempts: 3,
      baseDelayMs: 1500,
      maxDelayMs: 25000,
      backoffMultiplier: 2,
      jitter: true,
      retryableErrorTypes: ['NETWORK', 'API', 'RATE_LIMIT']
    };

    const circuitBreakerConfig: CircuitBreakerConfig = {
      failureThreshold: 5,
      recoveryTimeoutMs: 60000,
      monitoringPeriodMs: 300000,
      expectedRecoveryTimeMs: 30000
    };

    const cacheConfig: CacheConfig = {
      enabled: true,
      ttlLocal: 3600, // 1 hour for analysis results
      ttlCold: 7200,  // 2 hours for cold cache
      maxSize: 1000,
      keyPrefix: 'anthropic'
    };

    super('anthropic', '1.0.0', retryConfig, circuitBreakerConfig, cacheConfig);
  }

  public static getInstance(): AnthropicService {
    return new AnthropicService();
  }

  /**
   * Initialize the Anthropic service
   */
  async initialize(): Promise<void> {
    try {
      this.config = aiConfigManager.getServiceConfig('anthropic');

      if (!this.config.apiKey) {
        throw new Error('Anthropic API key is required');
      }

      this.client = new Anthropic({
        apiKey: this.config.apiKey,
        baseURL: this.config.baseUrl,
        defaultHeaders: {
          'User-Agent': `media-contacts/${this.serviceName}/${this.version}`
        }
      });

      // Perform a simple health check
      await this.healthCheck();

      console.info('Anthropic service initialized successfully', {
        baseUrl: this.config.baseUrl,
        modelsCount: this.config.models.length,
        contextCachingEnabled: this.config.enableContextCaching
      });

    } catch (error) {
      console.error('Failed to initialize Anthropic service:', error);
      throw new Error(`Anthropic service initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract contacts from content using Claude
   */
  async extractContacts(request: ContactExtractionRequest): Promise<ContactExtractionResponse> {
    const response = await this.executeOperation(
      request,
      () => this.performContactExtraction(request),
      {
        maxAttempts: 2, // Fewer retries for expensive operations
        baseDelayMs: 2000
      }
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Contact extraction failed');
    }

    return response.data;
  }

  /**
   * Analyze content using Claude
   */
  async analyzeContent(request: ContentAnalysisRequest): Promise<ContentAnalysisResponse> {
    const response = await this.executeOperation(
      request,
      () => this.performContentAnalysis(request)
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Content analysis failed');
    }

    return response.data;
  }

  /**
   * Validate and verify extracted contact information
   */
  async validateContacts(contacts: any[], context?: any): Promise<{
    validContacts: any[];
    invalidContacts: any[];
    confidence: number;
    validationReport: string;
  }> {
    const request: AIServiceRequest = {
      correlationId: Math.random().toString(36).substr(2, 9),
      operation: 'validateContacts',
      timestamp: Date.now(),
      metadata: { contactCount: contacts.length, context }
    };

    const response = await this.executeOperation(
      request,
      () => this.performContactValidation(contacts, context)
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Contact validation failed');
    }

    return response.data;
  }

  /**
   * Generate structured data from unstructured text
   */
  async extractStructuredData(text: string, schema: any): Promise<any> {
    const request: AIServiceRequest = {
      correlationId: Math.random().toString(36).substr(2, 9),
      operation: 'extractStructuredData',
      timestamp: Date.now(),
      metadata: { textLength: text.length, schemaType: schema.type }
    };

    const response = await this.executeOperation(
      request,
      () => this.performStructuredDataExtraction(text, schema)
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Structured data extraction failed');
    }

    return response.data;
  }

  /**
   * Perform contact extraction using Claude
   */
  private async performContactExtraction(request: ContactExtractionRequest): Promise<ContactExtractionResponse> {
    if (!this.client || !this.config) {
      throw new Error('Anthropic service not initialized');
    }

    const model = this.config.models.find(m => m.name.includes('claude-3-5-sonnet')) || this.config.models[0];

    const systemPrompt = `You are an expert at extracting media contact information from text. Your task is to identify journalists, editors, publishers, and media professionals with high accuracy.

EXTRACTION CRITERIA:
1. Extract complete names (first and last name when available)
2. Identify current, professional email addresses
3. Find phone numbers when available
4. Determine job titles and roles accurately
5. Identify the organization/company they work for
6. Look for social media profiles (LinkedIn, Twitter, Mastodon)
7. Assess confidence in each contact (0-100)
8. Only include contacts that appear to be current and relevant

QUALITY STANDARDS:
- Ignore generic contact forms or general addresses
- Exclude outdated or historical information
- Prioritize recent content and sources
- Verify that the person appears to be a media professional
- Cross-reference details within the text for consistency

RESPONSE FORMAT (JSON):
{
  "contacts": [
    {
      "name": "Full Name",
      "email": "professional@example.com",
      "phone": "+1-555-0123",
      "role": "Job Title",
      "organization": "Company Name",
      "website": "https://example.com",
      "social": {
        "linkedin": "https://linkedin.com/in/username",
        "twitter": "@username",
        "mastodon": "@username@server.com"
      },
      "confidence": 85,
      "metadata": {
        "source": "source description",
        "extractedAt": "2024-01-01T00:00:00Z",
        "verificationStatus": "verified|unverified|pending",
        "evidence": ["evidence1", "evidence2"]
      }
    }
  ],
  "sourceAnalysis": {
    "type": "article|website|social|directory|other",
    "quality": "high|medium|low",
    "relevance": 0.9,
    "datePublished": "2024-01-01",
    "authorCredibility": "high|medium|low"
  },
  "confidence": 0.85,
  "totalContacts": 5
}`;

    const userPrompt = `Extract media contact information from the following content:

CONTENT:
"""
${request.content}
"""

${request.context ? `
CONTEXT:
- Source: ${request.context.source || 'Unknown'}
- Language: ${request.context.language || 'Unknown'}
- Region: ${request.context.region || 'Unknown'}
- Relevant Beats: ${request.context.beats?.join(', ') || 'None'}
` : ''}

${request.options ? `
EXTRACTION OPTIONS:
- Minimum Confidence: ${request.options.confidence || 70}%
- Maximum Contacts: ${request.options.maxContacts || 50}
- Include Social Media: ${request.options.includeSocial || false}
` : ''}

Analyze the content thoroughly and extract all relevant media contacts following the specified format.`;

    const startTime = Date.now();

    try {
      const messages: ClaudeMessage[] = [
        { role: 'user', content: userPrompt }
      ];

      const response: ClaudeResponse = await this.client.messages.create({
        model: model.name,
        max_tokens: 4000,
        temperature: 0.1,
        system: systemPrompt,
        messages
      });

      const responseText = response.content[0]?.text;
      if (!responseText) {
        throw new Error('No response from Claude');
      }

      // Parse JSON response
      const result = this.parseJSONResponse(responseText);
      const processingTime = Date.now() - startTime;

      // Update metrics
      this.updateMetrics(response.usage);

      return {
        contacts: result.contacts || [],
        confidence: result.confidence || 0.8,
        processingTime,
        sourceAnalysis: result.sourceAnalysis || {
          type: 'other',
          quality: 'medium',
          relevance: 0.5
        }
      };

    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }

  /**
   * Perform content analysis using Claude
   */
  private async performContentAnalysis(request: ContentAnalysisRequest): Promise<ContentAnalysisResponse> {
    if (!this.client || !this.config) {
      throw new Error('Anthropic service not initialized');
    }

    const model = this.config.models.find(m => m.name.includes('claude-3-5-sonnet')) || this.config.models[0];

    const analysisPrompts = {
      sentiment: `Analyze the sentiment and emotional tone of this content. Provide:
- Overall sentiment score (-100 to +100)
- Emotional indicators present
- Key phrases that influence the sentiment
- Context for the sentiment (industry/topic specific)`,

      topic: `Identify and categorize the main topics and themes. Provide:
- Primary topics with relevance scores (0-100)
- Secondary topics
- Industry/sector classification
- Geographic relevance
- Audience type assessment`,

      quality: `Assess content quality and credibility. Provide:
- Quality score (0-100) based on accuracy, depth, clarity
- Credibility indicators
- Writing style assessment
- Fact-checking suggestions
- Improvement recommendations`,

      contact_density: `Evaluate potential for media contact discovery. Provide:
- Contact density score (0-100)
- Types of contacts likely present
- Extraction difficulty assessment
- Recommended extraction strategies
- Confidence in finding valuable contacts`,

      relevance: `Assess relevance for media contact databases. Provide:
- Relevance score (0-100) for media industry
- Beat/topic alignment
- Geographic relevance
- Timeliness assessment
- Overall value rating`
    };

    const systemPrompt = `You are an expert content analyst specializing in media intelligence and contact discovery. Provide detailed, objective analysis with specific evidence and reasoning.

ANALYSIS STANDARDS:
- Be thorough and evidence-based
- Provide specific examples from the text
- Use industry-standard metrics
- Consider context and nuance
- Give actionable insights

RESPONSE FORMAT (JSON):
{
  "analysis": {
    "score": 0.85,
    "confidence": 0.9,
    "reasoning": "Detailed explanation with evidence",
    "details": {
      "keyPoints": ["point1", "point2"],
      "evidence": ["evidence1", "evidence2"],
      "recommendations": ["rec1", "rec2"]
    }
  },
  "metadata": {
    "contentLength": 1500,
    "language": "en",
    "complexity": "high|medium|low",
    "topics": ["topic1", "topic2"],
    "processingNotes": "notes"
  }
}`;

    const userPrompt = `${analysisPrompts[request.analysisType]}

CONTENT TO ANALYZE:
"""
${request.content}
"""

${request.context ? `
ADDITIONAL CONTEXT:
- Target Beats: ${request.context.beats?.join(', ') || 'None'}
- Target Regions: ${request.context.regions?.join(', ') || 'None'}
- Target Languages: ${request.context.languages?.join(', ') || 'None'}
` : ''}

${request.options ? `
ANALYSIS OPTIONS:
- Detail Level: ${request.options.detailLevel || 'detailed'}
- Include Reasoning: ${request.options.includeReasoning || true}
` : ''}

Provide comprehensive analysis following the specified format.`;

    const startTime = Date.now();

    try {
      const messages: ClaudeMessage[] = [
        { role: 'user', content: userPrompt }
      ];

      const response: ClaudeResponse = await this.client.messages.create({
        model: model.name,
        max_tokens: 3000,
        temperature: 0.3,
        system: systemPrompt,
        messages
      });

      const responseText = response.content[0]?.text;
      if (!responseText) {
        throw new Error('No response from Claude');
      }

      const result = this.parseJSONResponse(responseText);
      const processingTime = Date.now() - startTime;

      // Update metrics
      this.updateMetrics(response.usage);

      return {
        analysis: result.analysis,
        processingTime,
        metadata: {
          contentLength: request.content.length,
          language: result.metadata?.language || 'en',
          topics: result.metadata?.topics || []
        }
      };

    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }

  /**
   * Perform contact validation
   */
  private async performContactValidation(contacts: any[], context?: any): Promise<any> {
    if (!this.client || !this.config) {
      throw new Error('Anthropic service not initialized');
    }

    const model = this.config.models.find(m => m.name.includes('claude-3-haiku')) || this.config.models[0];

    const systemPrompt = `You are an expert at validating media contact information. Review the provided contacts for accuracy, completeness, and professionalism.

VALIDATION CRITERIA:
1. Email format and domain validity
2. Name structure and completeness
3. Professional role relevance
4. Organization legitimacy
5. Social media profile authenticity
6. Overall contact reliability

RESPONSE FORMAT (JSON):
{
  "validContacts": [...],
  "invalidContacts": [...],
  "confidence": 0.85,
  "validationReport": "Summary of validation results",
  "issues": ["issue1", "issue2"],
  "recommendations": ["rec1", "rec2"]
}`;

    const userPrompt = `Validate the following media contacts:

CONTACTS:
${JSON.stringify(contacts, null, 2)}

${context ? `
VALIDATION CONTEXT:
${JSON.stringify(context, null, 2)}
` : ''}

Review each contact for accuracy, completeness, and professionalism. Mark as valid or invalid with reasoning.`;

    try {
      const messages: ClaudeMessage[] = [
        { role: 'user', content: userPrompt }
      ];

      const response: ClaudeResponse = await this.client.messages.create({
        model: model.name,
        max_tokens: 2000,
        temperature: 0.2,
        system: systemPrompt,
        messages
      });

      const responseText = response.content[0]?.text;
      if (!responseText) {
        throw new Error('No response from Claude');
      }

      const result = this.parseJSONResponse(responseText);
      this.updateMetrics(response.usage);

      return result;

    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }

  /**
   * Perform structured data extraction
   */
  private async performStructuredDataExtraction(text: string, schema: any): Promise<any> {
    if (!this.client || !this.config) {
      throw new Error('Anthropic service not initialized');
    }

    const model = this.config.models.find(m => m.name.includes('claude-3-haiku')) || this.config.models[0];

    const systemPrompt = `You are an expert at extracting structured information from unstructured text. Follow the provided schema precisely.

SCHEMA:
${JSON.stringify(schema, null, 2)}

Extract information that matches the schema fields. If a field has no corresponding information in the text, use null or omit it.`;

    const userPrompt = `Extract structured data from the following text according to the provided schema:

TEXT:
"""
${text}
"""

Respond with valid JSON that matches the schema structure.`;

    try {
      const messages: ClaudeMessage[] = [
        { role: 'user', content: userPrompt }
      ];

      const response: ClaudeResponse = await this.client.messages.create({
        model: model.name,
        max_tokens: 2000,
        temperature: 0.1,
        system: systemPrompt,
        messages
      });

      const responseText = response.content[0]?.text;
      if (!responseText) {
        throw new Error('No response from Claude');
      }

      const result = this.parseJSONResponse(responseText);
      this.updateMetrics(response.usage);

      return result;

    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }

  /**
   * Check service health
   */
  async healthCheck(): Promise<ServiceHealth> {
    const startTime = Date.now();

    try {
      if (!this.client) {
        throw new Error('Client not initialized');
      }

      // Simple test - send a minimal message
      const response = await this.client.messages.create({
        model: this.config!.models[0].name,
        max_tokens: 10,
        temperature: 0,
        messages: [{ role: 'user', content: 'Hello' }]
      });

      const responseTime = Date.now() - startTime;
      const baseHealth = this.calculateHealthFromMetrics();

      return {
        ...baseHealth,
        lastCheck: Date.now(),
        responseTime,
        metadata: {
          ...baseHealth.metadata,
          modelsAvailable: this.config?.models.length || 0,
          apiKeyStatus: 'valid',
          contextCachingEnabled: this.config?.enableContextCaching || false
        }
      };

    } catch (error) {
      this.metrics.errors++;

      return {
        service: this.serviceName,
        status: 'unhealthy',
        lastCheck: Date.now(),
        responseTime: Date.now() - startTime,
        errorRate: 100,
        uptime: 0,
        requestCount: 1,
        errorCount: 1,
        lastError: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          apiKeyStatus: this.config?.apiKey ? 'invalid' : 'missing'
        }
      };
    }
  }

  /**
   * Get current rate limit status
   */
  async getRateLimitStatus(): Promise<RateLimitInfo | null> {
    if (!this.config) {
      return null;
    }

    const now = Date.now();
    const windowMs = 60000; // 1 minute window
    const recentMetrics = this.getRecentMetrics(1); // Last minute

    const requestsInWindow = recentMetrics.filter(m =>
      m.timestamp > now - windowMs && m.operation !== 'healthCheck'
    ).length;

    return {
      limit: this.config.rateLimits.requestsPerMinute,
      remaining: Math.max(0, this.config.rateLimits.requestsPerMinute - requestsInWindow),
      resetTime: Math.ceil(now / windowMs) * windowMs,
      windowMs
    };
  }

  /**
   * Get current quota usage
   */
  async getQuotaStatus(): Promise<QuotaInfo | null> {
    if (!this.config) {
      return null;
    }

    const now = Date.now();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Calculate monthly usage from metrics
    const estimatedMonthlyUsage = this.metrics.cost;

    return {
      limit: this.config.costLimits.maxMonthlySpend,
      used: estimatedMonthlyUsage,
      remaining: Math.max(0, this.config.costLimits.maxMonthlySpend - estimatedMonthlyUsage),
      resetTime: monthEnd.getTime(),
      period: 'monthly'
    };
  }

  /**
   * Parse JSON response from Claude (handles various response formats)
   */
  private parseJSONResponse(text: string): any {
    try {
      // Try direct JSON parsing first
      return JSON.parse(text);
    } catch {
      // Extract JSON from text if it's wrapped in other content
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) ||
                       text.match(/\{[\s\S]*\}/) ||
                       text.match(/\[[\s\S]*\]/);

      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[1] || jsonMatch[0]);
        } catch {
          throw new Error('Failed to parse JSON response from Claude');
        }
      }

      throw new Error('No valid JSON found in Claude response');
    }
  }

  /**
   * Update service metrics
   */
  private updateMetrics(usage: ClaudeResponse['usage']): void {
    this.metrics.requests++;
    this.metrics.tokens.input += usage.input_tokens;
    this.metrics.tokens.output += usage.output_tokens;

    if (usage.cache_creation_input_tokens) {
      this.metrics.tokens.cacheWrite += usage.cache_creation_input_tokens;
    }

    if (usage.cache_read_input_tokens) {
      this.metrics.tokens.cacheRead += usage.cache_read_input_tokens;
      this.metrics.contextCacheHits++;
    }

    // Calculate cost (simplified - should use actual pricing)
    const inputCost = (usage.input_tokens / 1000) * 0.003; // ~$0.003 per 1K input tokens
    const outputCost = (usage.output_tokens / 1000) * 0.015; // ~$0.015 per 1K output tokens
    this.metrics.cost += inputCost + outputCost;
  }

  /**
   * Get detailed metrics
   */
  public getDetailedMetrics(): AnthropicServiceMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics (useful for testing)
   */
  public resetMetrics(): void {
    this.metrics = {
      requests: 0,
      tokens: { input: 0, output: 0, cacheWrite: 0, cacheRead: 0 },
      cost: 0,
      errors: 0,
      rateLimitHits: 0,
      cacheHits: 0,
      contextCacheHits: 0
    };
  }
}

// Export singleton instance
export const anthropicService = AnthropicService.getInstance();