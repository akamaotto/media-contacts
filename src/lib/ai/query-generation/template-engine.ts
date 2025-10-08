/**
 * Query Template Engine
 * Manages and processes query templates for different criteria
 */

import { PrismaClient, QueryTemplateType } from '@prisma/client';
import {
  QueryTemplate,
  QueryCriteria,
  QueryGenerationRequest,
  QueryGenerationError,
  QueryValidationResult
} from './types';

export class QueryTemplateEngine {
  private prisma: PrismaClient;
  private templateCache: Map<string, QueryTemplate[]> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 3600000; // 1 hour

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Initialize the template engine with default templates
   */
  async initialize(): Promise<void> {
    await this.seedDefaultTemplates();
    await this.loadActiveTemplates();
  }

  /**
   * Select appropriate templates for a given request
   */
  async selectTemplates(request: QueryGenerationRequest): Promise<QueryTemplate[]> {
    const cacheKey = this.generateCacheKey(request.criteria);

    // Check cache first
    if (this.isCacheValid(cacheKey)) {
      return this.templateCache.get(cacheKey) || [];
    }

    const templates = await this.fetchTemplatesFromDatabase(request.criteria);

    // Cache the results
    this.templateCache.set(cacheKey, templates);
    this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_TTL);

    return templates;
  }

  /**
   * Generate queries from selected templates
   */
  async generateFromTemplates(
    templates: QueryTemplate[],
    request: QueryGenerationRequest
  ): Promise<Array<{ query: string; templateId: string; type: string }>> {
    const generatedQueries: Array<{ query: string; templateId: string; type: string }> = [];

    for (const template of templates) {
      try {
        const query = this.processTemplate(template, request.criteria, request.originalQuery);

        // Validate the generated query
        const validation = this.validateQuery(query);
        if (!validation.isValid) {
          console.warn(`Template ${template.id} generated invalid query:`, validation.errors);
          continue;
        }

        generatedQueries.push({
          query: validation.normalizedQuery || query,
          templateId: template.id,
          type: template.type
        });

        // Update template usage stats
        await this.updateTemplateStats(template.id, true);
      } catch (error) {
        console.error(`Error processing template ${template.id}:`, error);
        await this.updateTemplateStats(template.id, false);
      }
    }

    return generatedQueries;
  }

  /**
   * Process a single template with given criteria
   */
  private processTemplate(
    template: QueryTemplate,
    criteria: QueryCriteria,
    originalQuery: string
  ): string {
    let processedQuery = template.template;

    // Replace base query placeholder
    processedQuery = processedQuery.replace(/\{query\}/g, originalQuery);

    // Replace criteria placeholders
    if (criteria.countries && criteria.countries.length > 0) {
      const countryList = criteria.countries.join(' OR ');
      processedQuery = processedQuery.replace(/\{countries\}/g, countryList);
      processedQuery = processedQuery.replace(/\{country\}/g, criteria.countries[0]);
    }

    if (criteria.categories && criteria.categories.length > 0) {
      const categoryList = criteria.categories.join(' OR ');
      processedQuery = processedQuery.replace(/\{categories\}/g, categoryList);
      processedQuery = processedQuery.replace(/\{category\}/g, criteria.categories[0]);
    }

    if (criteria.beats && criteria.beats.length > 0) {
      const beatList = criteria.beats.join(' OR ');
      processedQuery = processedQuery.replace(/\{beats\}/g, beatList);
      processedQuery = processedQuery.replace(/\{beat\}/g, criteria.beats[0]);
    }

    if (criteria.languages && criteria.languages.length > 0) {
      const languageList = criteria.languages.join(' OR ');
      processedQuery = processedQuery.replace(/\{languages\}/g, languageList);
      processedQuery = processedQuery.replace(/\{language\}/g, criteria.languages[0]);
    }

    if (criteria.topics && criteria.topics.length > 0) {
      const topicList = criteria.topics.join(' OR ');
      processedQuery = processedQuery.replace(/\{topics\}/g, topicList);
      processedQuery = processedQuery.replace(/\{topic\}/g, criteria.topics[0]);
    }

    // Replace variables
    if (template.variables) {
      for (const [key, value] of Object.entries(template.variables)) {
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        processedQuery = processedQuery.replace(regex, String(value));
      }
    }

    return processedQuery;
  }

  /**
   * Fetch templates from database based on criteria
   */
  private async fetchTemplatesFromDatabase(criteria: QueryCriteria): Promise<QueryTemplate[]> {
    const templates = await this.prisma.ai_query_templates.findMany({
      where: {
        isActive: true,
        OR: [
          // Base templates (always applicable)
          { type: QueryTemplateType.BASE },
          // Country-specific templates
          ...(criteria.countries && criteria.countries.length > 0 ? [
            {
              type: QueryTemplateType.COUNTRY_SPECIFIC,
              country: { in: criteria.countries }
            }
          ] : []),
          // Category-specific templates
          ...(criteria.categories && criteria.categories.length > 0 ? [
            {
              type: QueryTemplateType.CATEGORY_SPECIFIC,
              category: { in: criteria.categories }
            }
          ] : []),
          // Beat-specific templates
          ...(criteria.beats && criteria.beats.length > 0 ? [
            {
              type: QueryTemplateType.BEAT_SPECIFIC,
              beat: { in: criteria.beats }
            }
          ] : []),
          // Language-specific templates
          ...(criteria.languages && criteria.languages.length > 0 ? [
            {
              type: QueryTemplateType.LANGUAGE_SPECIFIC,
              language: { in: criteria.languages }
            }
          ] : [])
        ]
      },
      orderBy: [
        { priority: 'desc' },
        { successCount: 'desc' },
        { averageConfidence: 'desc' },
        { usageCount: 'desc' }
      ],
      take: 50 // Limit to prevent too many templates
    });

    return templates.map(template => ({
      id: template.id,
      name: template.name,
      template: template.template,
      type: template.type as any,
      criteria: {
        country: template.country,
        category: template.category,
        beat: template.beat,
        language: template.language
      },
      variables: template.variables as Record<string, any> || {},
      priority: template.priority,
      isActive: template.isActive,
      usageCount: template.usageCount,
      successCount: template.successCount,
      averageConfidence: template.averageConfidence ? Number(template.averageConfidence) : 0,
      createdAt: template.created_at,
      updatedAt: template.updated_at
    }));
  }

  /**
   * Seed default templates if none exist
   */
  private async seedDefaultTemplates(): Promise<void> {
    const existingTemplates = await this.prisma.ai_query_templates.count();

    if (existingTemplates > 0) {
      return; // Templates already exist
    }

    const defaultTemplates = [
      // Base templates
      {
        name: 'Base Media Contact Search',
        template: '{query} media contact journalist reporter',
        type: QueryTemplateType.BASE,
        variables: {},
        priority: 100
      },
      {
        name: 'Beat-Specific Search',
        template: '{query} {beat} journalist reporter',
        type: QueryTemplateType.BASE,
        variables: {},
        priority: 90
      },
      {
        name: 'Category-Specific Search',
        template: '{query} {category} media journalism',
        type: QueryTemplateType.BASE,
        variables: {},
        priority: 90
      },

      // Country-specific templates
      {
        name: 'UK Media Search',
        template: '{query} UK British media journalist reporter',
        type: QueryTemplateType.COUNTRY_SPECIFIC,
        country: 'GB',
        variables: {},
        priority: 85
      },
      {
        name: 'US Media Search',
        template: '{query} US American media journalist reporter',
        type: QueryTemplateType.COUNTRY_SPECIFIC,
        country: 'US',
        variables: {},
        priority: 85
      },
      {
        name: 'Canadian Media Search',
        template: '{query} Canada Canadian media journalist reporter',
        type: QueryTemplateType.COUNTRY_SPECIFIC,
        country: 'CA',
        variables: {},
        priority: 85
      },

      // Category-specific templates
      {
        name: 'Technology Media Search',
        template: '{query} technology tech journalist reporter media',
        type: QueryTemplateType.CATEGORY_SPECIFIC,
        category: 'Technology',
        variables: {},
        priority: 88
      },
      {
        name: 'Business Media Search',
        template: '{query} business finance journalist reporter media',
        type: QueryTemplateType.CATEGORY_SPECIFIC,
        category: 'Business',
        variables: {},
        priority: 88
      },
      {
        name: 'Sports Media Search',
        template: '{query} sports journalist reporter media athletics',
        type: QueryTemplateType.CATEGORY_SPECIFIC,
        category: 'Sports',
        variables: {},
        priority: 88
      },

      // Beat-specific templates
      {
        name: 'Politics Beat Search',
        template: '{query} politics government journalist reporter political',
        type: QueryTemplateType.BEAT_SPECIFIC,
        beat: 'Politics',
        variables: {},
        priority: 87
      },
      {
        name: 'Healthcare Beat Search',
        template: '{query} health medical journalist reporter healthcare',
        type: QueryTemplateType.BEAT_SPECIFIC,
        beat: 'Healthcare',
        variables: {},
        priority: 87
      },
      {
        name: 'Entertainment Beat Search',
        template: '{query} entertainment celebrity journalist reporter media',
        type: QueryTemplateType.BEAT_SPECIFIC,
        beat: 'Entertainment',
        variables: {},
        priority: 87
      },

      // Composite templates
      {
        name: 'Multi-Criteria Search',
        template: '{query} {category} {beat} journalist reporter media',
        type: QueryTemplateType.COMPOSITE,
        variables: {},
        priority: 75
      },
      {
        name: 'Country-Category Search',
        template: '{query} {country} {category} media journalist reporter',
        type: QueryTemplateType.COMPOSITE,
        country: null,
        category: null,
        variables: {},
        priority: 80
      },
      {
        name: 'Advanced Media Search',
        template: '{query} site:.com OR site:.org {category} journalist reporter author contact',
        type: QueryTemplateType.COMPOSITE,
        variables: {},
        priority: 70
      }
    ];

    for (const template of defaultTemplates) {
      await this.prisma.ai_query_templates.create({
        data: template
      });
    }

    console.log(`Seeded ${defaultTemplates.length} default query templates`);
  }

  /**
   * Load active templates into cache
   */
  private async loadActiveTemplates(): Promise<void> {
    const templates = await this.prisma.ai_query_templates.findMany({
      where: { isActive: true },
      orderBy: { priority: 'desc' }
    });

    const cacheKey = 'all_active';
    this.templateCache.set(cacheKey, templates.map(t => ({
      id: t.id,
      name: t.name,
      template: t.template,
      type: t.type as any,
      criteria: {
        country: t.country,
        category: t.category,
        beat: t.beat,
        language: t.language
      },
      variables: t.variables as Record<string, any> || {},
      priority: t.priority,
      isActive: t.isActive,
      usageCount: t.usageCount,
      successCount: t.successCount,
      averageConfidence: t.averageConfidence ? Number(t.averageConfidence) : 0,
      createdAt: t.created_at,
      updatedAt: t.updated_at
    })));

    this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_TTL);
  }

  /**
   * Update template usage statistics
   */
  private async updateTemplateStats(templateId: string, success: boolean): Promise<void> {
    await this.prisma.ai_query_templates.update({
      where: { id: templateId },
      data: {
        usageCount: { increment: 1 },
        ...(success ? { successCount: { increment: 1 } } : {})
      }
    });
  }

  /**
   * Validate a generated query
   */
  private validateQuery(query: string): QueryValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Basic validation
    if (!query || query.trim().length === 0) {
      errors.push('Query cannot be empty');
      return { isValid: false, errors, warnings, suggestions };
    }

    if (query.length < 3) {
      errors.push('Query is too short (minimum 3 characters)');
    }

    if (query.length > 1000) {
      warnings.push('Query is very long, may impact search performance');
    }

    // Check for placeholder remnants
    if (query.includes('{') || query.includes('}')) {
      errors.push('Query contains unprocessed template placeholders');
    }

    // Check for common issues
    const lowerQuery = query.toLowerCase();
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'];
    const words = lowerQuery.split(/\s+/).filter(word => !stopWords.includes(word));

    if (words.length < 2) {
      warnings.push('Query has very few meaningful words');
    }

    // Normalize the query
    const normalizedQuery = query
      .replace(/\s+/g, ' ')
      .replace(/\s*[,.!?;:]\s*/g, ' ')
      .trim()
      .toLowerCase();

    if (normalizedQuery !== query.toLowerCase()) {
      suggestions.push('Query format can be optimized');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      normalizedQuery: normalizedQuery !== query.toLowerCase() ? normalizedQuery : undefined
    };
  }

  /**
   * Generate cache key for criteria
   */
  private generateCacheKey(criteria: QueryCriteria): string {
    const key = [
      criteria.countries?.join(',') || '',
      criteria.categories?.join(',') || '',
      criteria.beats?.join(',') || '',
      criteria.languages?.join(',') || ''
    ].join('|');

    return key || 'default';
  }

  /**
   * Check if cache is valid
   */
  private isCacheValid(key: string): boolean {
    const expiry = this.cacheExpiry.get(key);
    return expiry ? Date.now() < expiry : false;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.templateCache.clear();
    this.cacheExpiry.clear();
  }

  /**
   * Get template statistics
   */
  async getTemplateStats(): Promise<{
    total: number;
    active: number;
    byType: Record<string, number>;
    topPerforming: QueryTemplate[];
  }> {
    const [total, active, byType, topPerforming] = await Promise.all([
      this.prisma.ai_query_templates.count(),
      this.prisma.ai_query_templates.count({ where: { isActive: true } }),
      this.prisma.ai_query_templates.groupBy({
        by: ['type'],
        _count: { type: true }
      }),
      this.prisma.ai_query_templates.findMany({
        where: { isActive: true },
        orderBy: [
          { successCount: 'desc' },
          { averageConfidence: 'desc' }
        ],
        take: 10
      })
    ]);

    return {
      total,
      active,
      byType: byType.reduce((acc, item) => {
        acc[item.type] = item._count.type;
        return acc;
      }, {} as Record<string, number>),
      topPerforming: topPerforming.map(t => ({
        id: t.id,
        name: t.name,
        template: t.template,
        type: t.type as any,
        criteria: {
          country: t.country,
          category: t.category,
          beat: t.beat,
          language: t.language
        },
        variables: t.variables as Record<string, any> || {},
        priority: t.priority,
        isActive: t.isActive,
        usageCount: t.usageCount,
        successCount: t.successCount,
        averageConfidence: t.averageConfidence ? Number(t.averageConfidence) : 0,
        createdAt: t.created_at,
        updatedAt: t.updated_at
      }))
    };
  }
}