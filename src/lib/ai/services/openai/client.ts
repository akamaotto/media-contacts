/**
 * OpenAI Service Implementation
 * Provides integration with OpenAI API for content analysis, contact extraction, and embeddings
 */

import OpenAI from 'openai';
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
import { OpenAIConfig } from '../config/types';
import { aiConfigManager } from '../config/manager';

interface OpenAIServiceMetrics {
  requests: number;
  tokens: number;
  cost: number;
  errors: number;
  rateLimitHits: number;
}

export class OpenAIService extends BaseAIService {
  private client: OpenAI | null = null;
  private config: OpenAIConfig | null = null;
  private metrics: OpenAIServiceMetrics = {
    requests: 0,
    tokens: 0,
    cost: 0,
    errors: 0,
    rateLimitHits: 0
  };

  private constructor() {
    const retryConfig: RetryConfig = {
      maxAttempts: 3,
      baseDelayMs: 1000,
      maxDelayMs: 30000,
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
      ttlLocal: 3600,
      ttlCold: 86400,
      maxSize: 1000,
      keyPrefix: 'openai'
    };

    super('openai', '1.0.0', retryConfig, circuitBreakerConfig, cacheConfig);
  }

  public static getInstance(): OpenAIService {
    return new OpenAIService();
  }

  /**
   * Initialize the OpenAI service
   */
  async initialize(): Promise<void> {
    try {
      this.config = aiConfigManager.getServiceConfig('openai');

      if (!this.config.apiKey) {
        throw new Error('OpenAI API key is required');
      }

      this.client = new OpenAI({
        apiKey: this.config.apiKey,
        baseURL: this.config.baseUrl,
        organization: this.config.organization,
        defaultHeaders: {
          'User-Agent': `media-contacts/${this.serviceName}/${this.version}`
        }
      });

      // Perform a simple health check
      await this.healthCheck();

      console.info('OpenAI service initialized successfully', {
        baseUrl: this.config.baseUrl,
        organization: this.config.organization,
        modelsCount: this.config.models.length
      });

    } catch (error) {
      console.error('Failed to initialize OpenAI service:', error);
      throw new Error(`OpenAI service initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract contacts from content using OpenAI
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
   * Analyze content using OpenAI
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
   * Generate text embeddings
   */
  async generateEmbedding(texts: string[], model: string = 'text-embedding-3-small'): Promise<number[][]> {
    const request: AIServiceRequest = {
      correlationId: Math.random().toString(36).substr(2, 9),
      operation: 'generateEmbedding',
      timestamp: Date.now(),
      metadata: { textCount: texts.length, model }
    };

    const response = await this.executeOperation(
      request,
      () => this.performEmbeddingGeneration(texts, model)
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Embedding generation failed');
    }

    return response.data;
  }

  /**
   * Perform contact extraction using GPT-4
   */
  private async performContactExtraction(request: ContactExtractionRequest): Promise<ContactExtractionResponse> {
    if (!this.client || !this.config) {
      throw new Error('OpenAI service not initialized');
    }

    const model = this.config.models.find(m => m.name.includes('gpt-4')) || this.config.models[0];

    const systemPrompt = `You are an expert at extracting contact information from text. Extract media contacts (journalists, editors, publishers) and provide detailed information.

Instructions:
1. Extract names, emails, phone numbers, roles, and organizations
2. Identify the type of media outlet and relevance
3. Assign confidence scores (0-100) for each contact
4. Focus on verified, current contact information
5. Ignore generic or outdated information
6. Return results in JSON format

Response format:
{
  "contacts": [
    {
      "name": "Full Name",
      "email": "email@example.com",
      "phone": "+1-555-0123",
      "role": "Job Title",
      "organization": "Company Name",
      "website": "https://example.com",
      "social": {
        "linkedin": "https://linkedin.com/in/username",
        "twitter": "@username"
      },
      "confidence": 85,
      "metadata": {
        "source": "article title",
        "extractedAt": "2024-01-01T00:00:00Z",
        "verificationStatus": "verified"
      }
    }
  ],
  "sourceAnalysis": {
    "type": "article|website|social|directory|other",
    "quality": "high|medium|low",
    "relevance": 0.9
  }
}`;

    const userPrompt = `Extract contact information from the following text:

${request.content}

${request.context ? `
Context:
- Source: ${request.context.source || 'Unknown'}
- Language: ${request.context.language || 'Unknown'}
- Region: ${request.context.region || 'Unknown'}
- Beats: ${request.context.beats?.join(', ') || 'None'}
` : ''}

${request.options ? `
Options:
- Confidence threshold: ${request.options.confidence || 70}%
- Max contacts: ${request.options.maxContacts || 50}
- Include social media: ${request.options.includeSocial || false}
` : ''}`;

    const startTime = Date.now();

    try {
      const completion = await this.client.chat.completions.create({
        model: model.name,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 4000,
        temperature: 0.1,
        response_format: { type: 'json_object' }
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error('No response from OpenAI');
      }

      const result = JSON.parse(responseText);
      const processingTime = Date.now() - startTime;

      // Update metrics
      this.updateMetrics({
        tokens: completion.usage?.total_tokens || 0,
        cost: this.calculateCost(completion.usage?.total_tokens || 0, model.name)
      });

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
   * Perform content analysis using OpenAI
   */
  private async performContentAnalysis(request: ContentAnalysisRequest): Promise<ContentAnalysisResponse> {
    if (!this.client || !this.config) {
      throw new Error('OpenAI service not initialized');
    }

    const model = this.config.models.find(m => m.name.includes('gpt-4')) || this.config.models[0];

    const analysisPrompts = {
      sentiment: `Analyze the sentiment of this content. Provide a score from -1 (very negative) to 1 (very positive) and explain your reasoning.`,
      topic: `Identify the main topics and themes in this content. List them with relevance scores.`,
      quality: `Assess the quality of this content on a scale of 0-100. Consider factors like clarity, depth, accuracy, and professionalism.`,
      contact_density: `Estimate how likely this content is to contain valuable contact information for media professionals (0-100).`,
      relevance: `Assess how relevant this content would be for media contact discovery, considering beats, regions, and industry relevance.`
    };

    const systemPrompt = `You are an expert content analyst. Provide detailed, objective analysis with specific reasoning and scores where requested.

Always respond in this JSON format:
{
  "analysis": {
    "score": 0.85,
    "confidence": 0.9,
    "reasoning": "Detailed explanation of your analysis...",
    "details": {
      "key_points": ["point1", "point2"],
      "evidence": ["evidence1", "evidence2"]
    }
  },
  "metadata": {
    "contentLength": 1500,
    "language": "en",
    "topics": ["technology", "business"]
  }
}`;

    const userPrompt = `${analysisPrompts[request.analysisType]}

Content to analyze:
"""
${request.content}
"""

${request.context ? `
Context:
- Beats: ${request.context.beats?.join(', ') || 'None'}
- Regions: ${request.context.regions?.join(', ') || 'None'}
- Languages: ${request.context.languages?.join(', ') || 'None'}
` : ''}

${request.options ? `
Options:
- Detail level: ${request.options.detailLevel || 'detailed'}
- Include reasoning: ${request.options.includeReasoning || true}
` : ''}`;

    const startTime = Date.now();

    try {
      const completion = await this.client.chat.completions.create({
        model: model.name,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 2000,
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error('No response from OpenAI');
      }

      const result = JSON.parse(responseText);
      const processingTime = Date.now() - startTime;

      // Update metrics
      this.updateMetrics({
        tokens: completion.usage?.total_tokens || 0,
        cost: this.calculateCost(completion.usage?.total_tokens || 0, model.name)
      });

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
   * Generate embeddings for text similarity
   */
  private async performEmbeddingGeneration(texts: string[], model: string): Promise<number[][]> {
    if (!this.client || !this.config) {
      throw new Error('OpenAI service not initialized');
    }

    try {
      const response = await this.client.embeddings.create({
        model,
        input: texts,
        encoding_format: 'float'
      });

      // Update metrics
      this.updateMetrics({
        tokens: response.usage?.total_tokens || 0,
        cost: this.calculateCost(response.usage?.total_tokens || 0, model)
      });

      return response.data.map(embedding => embedding.embedding);

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

      // Simple API test - list available models
      await this.client.models.list();

      const responseTime = Date.now() - startTime;
      const baseHealth = this.calculateHealthFromMetrics();

      return {
        ...baseHealth,
        lastCheck: Date.now(),
        responseTime,
        metadata: {
          ...baseHealth.metadata,
          modelsAvailable: this.config?.models.length || 0,
          apiKeyStatus: 'valid'
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
    // OpenAI doesn't provide a direct rate limit status endpoint
    // We'll estimate based on our configuration and usage
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
    // OpenAI doesn't provide quota information via API
    // We'll estimate based on costs and configuration
    if (!this.config) {
      return null;
    }

    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // This is a simplified calculation - in production you'd track this more carefully
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
   * Calculate cost based on token usage
   */
  private calculateCost(tokens: number, model: string): number {
    const modelConfig = this.config?.models.find(m => m.name === model);
    if (!modelConfig) {
      return 0;
    }

    return (tokens / 1000) * modelConfig.costPer1kTokens;
  }

  /**
   * Update service metrics
   */
  private updateMetrics(update: Partial<OpenAIServiceMetrics>): void {
    this.metrics.requests++;
    if (update.tokens) this.metrics.tokens += update.tokens;
    if (update.cost) this.metrics.cost += update.cost;
    if (update.errors) this.metrics.errors += update.errors;
    if (update.rateLimitHits) this.metrics.rateLimitHits += update.rateLimitHits;
  }

  /**
   * Get detailed metrics
   */
  public getDetailedMetrics(): OpenAIServiceMetrics {
    return { ...this.metrics };
  }
}

// Export singleton instance
export const openAIService = OpenAIService.getInstance();