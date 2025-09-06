/**
 * Data Provenance Tracking System
 * Tracks the origin, processing history, and lineage of all extracted data
 */

export interface DataSource {
  id: string;
  type: 'web_scraping' | 'api' | 'manual_entry' | 'import' | 'ai_generation';
  url?: string;
  domain?: string;
  apiEndpoint?: string;
  method?: string;
  timestamp: Date;
  userAgent?: string;
  ipAddress?: string;
  robotsCompliant: boolean;
  rateLimited: boolean;
  metadata?: Record<string, any>;
}

export interface ProcessingStep {
  id: string;
  type: 'extraction' | 'transformation' | 'enrichment' | 'validation' | 'deduplication' | 'ai_processing';
  processor: string; // Service or function name
  version?: string;
  input: {
    dataIds: string[];
    parameters?: Record<string, any>;
  };
  output: {
    dataIds: string[];
    changes?: Record<string, any>;
  };
  timestamp: Date;
  duration: number;
  success: boolean;
  error?: string;
  confidence?: number;
  metadata?: Record<string, any>;
}

export interface DataLineage {
  dataId: string;
  dataType: 'contact' | 'outlet' | 'article' | 'social_profile' | 'email' | 'phone' | 'address';
  originalValue?: any;
  currentValue: any;
  sources: DataSource[];
  processingHistory: ProcessingStep[];
  qualityScore: number;
  lastVerified?: Date;
  verificationMethod?: string;
  retentionPolicy?: {
    retainUntil?: Date;
    reason: string;
    legalBasis?: string;
  };
  accessLog: AccessLogEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AccessLogEntry {
  id: string;
  userId: string;
  action: 'read' | 'write' | 'delete' | 'export' | 'share';
  purpose: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  result: 'success' | 'denied' | 'error';
  reason?: string;
}

export interface ProvenanceQuery {
  dataId?: string;
  dataType?: string;
  sourceUrl?: string;
  sourceDomain?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  processingType?: string;
  qualityThreshold?: number;
  limit?: number;
  offset?: number;
}

/**
 * Provenance Tracking System
 */
export class ProvenanceTracker {
  private static instance: ProvenanceTracker;
  private dataLineages: Map<string, DataLineage> = new Map();
  private sources: Map<string, DataSource> = new Map();
  private processingSteps: Map<string, ProcessingStep> = new Map();

  static getInstance(): ProvenanceTracker {
    if (!ProvenanceTracker.instance) {
      ProvenanceTracker.instance = new ProvenanceTracker();
    }
    return ProvenanceTracker.instance;
  }

  /**
   * Record a data source
   */
  async recordDataSource(source: Omit<DataSource, 'id' | 'timestamp'>): Promise<string> {
    const sourceId = this.generateId('src');
    
    const dataSource: DataSource = {
      ...source,
      id: sourceId,
      timestamp: new Date()
    };

    this.sources.set(sourceId, dataSource);
    return sourceId;
  }

  /**
   * Record a processing step
   */
  async recordProcessingStep(step: Omit<ProcessingStep, 'id' | 'timestamp'>): Promise<string> {
    const stepId = this.generateId('step');
    
    const processingStep: ProcessingStep = {
      ...step,
      id: stepId,
      timestamp: new Date()
    };

    this.processingSteps.set(stepId, processingStep);

    // Update affected data lineages
    for (const dataId of step.output.dataIds) {
      await this.updateDataLineage(dataId, processingStep);
    }

    return stepId;
  }

  /**
   * Create or update data lineage
   */
  async createDataLineage(params: {
    dataId: string;
    dataType: DataLineage['dataType'];
    value: any;
    sourceId: string;
    qualityScore?: number;
    retentionPolicy?: DataLineage['retentionPolicy'];
  }): Promise<void> {
    const { dataId, dataType, value, sourceId, qualityScore = 0.5, retentionPolicy } = params;
    
    const source = this.sources.get(sourceId);
    if (!source) {
      throw new Error(`Source ${sourceId} not found`);
    }

    const existingLineage = this.dataLineages.get(dataId);
    
    if (existingLineage) {
      // Update existing lineage
      existingLineage.currentValue = value;
      existingLineage.sources.push(source);
      existingLineage.qualityScore = Math.max(existingLineage.qualityScore, qualityScore);
      existingLineage.updatedAt = new Date();
      
      if (retentionPolicy) {
        existingLineage.retentionPolicy = retentionPolicy;
      }
    } else {
      // Create new lineage
      const lineage: DataLineage = {
        dataId,
        dataType,
        originalValue: value,
        currentValue: value,
        sources: [source],
        processingHistory: [],
        qualityScore,
        retentionPolicy,
        accessLog: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.dataLineages.set(dataId, lineage);
    }
  }

  /**
   * Log data access
   */
  async logDataAccess(params: {
    dataId: string;
    userId: string;
    action: AccessLogEntry['action'];
    purpose: string;
    ipAddress?: string;
    userAgent?: string;
    result?: AccessLogEntry['result'];
    reason?: string;
  }): Promise<void> {
    const lineage = this.dataLineages.get(params.dataId);
    if (!lineage) return;

    const accessEntry: AccessLogEntry = {
      id: this.generateId('access'),
      userId: params.userId,
      action: params.action,
      purpose: params.purpose,
      timestamp: new Date(),
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      result: params.result || 'success',
      reason: params.reason
    };

    lineage.accessLog.push(accessEntry);
    lineage.updatedAt = new Date();

    // Keep only recent access logs (last 1000 entries)
    if (lineage.accessLog.length > 1000) {
      lineage.accessLog = lineage.accessLog.slice(-500);
    }
  }

  /**
   * Get data lineage
   */
  getDataLineage(dataId: string): DataLineage | null {
    return this.dataLineages.get(dataId) || null;
  }

  /**
   * Query data lineages
   */
  queryDataLineages(query: ProvenanceQuery): DataLineage[] {
    let lineages = Array.from(this.dataLineages.values());

    // Apply filters
    if (query.dataId) {
      lineages = lineages.filter(l => l.dataId === query.dataId);
    }

    if (query.dataType) {
      lineages = lineages.filter(l => l.dataType === query.dataType);
    }

    if (query.sourceUrl) {
      lineages = lineages.filter(l => 
        l.sources.some(s => s.url === query.sourceUrl)
      );
    }

    if (query.sourceDomain) {
      lineages = lineages.filter(l => 
        l.sources.some(s => s.domain === query.sourceDomain)
      );
    }

    if (query.dateRange) {
      lineages = lineages.filter(l => 
        l.createdAt >= query.dateRange!.start && l.createdAt <= query.dateRange!.end
      );
    }

    if (query.processingType) {
      lineages = lineages.filter(l => 
        l.processingHistory.some(p => p.type === query.processingType)
      );
    }

    if (query.qualityThreshold !== undefined) {
      lineages = lineages.filter(l => l.qualityScore >= query.qualityThreshold!);
    }

    // Sort by creation date (newest first)
    lineages.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 100;
    return lineages.slice(offset, offset + limit);
  }

  /**
   * Get data sources for a domain
   */
  getDomainSources(domain: string): DataSource[] {
    return Array.from(this.sources.values())
      .filter(s => s.domain === domain)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get processing history for data
   */
  getProcessingHistory(dataId: string): ProcessingStep[] {
    const lineage = this.dataLineages.get(dataId);
    if (!lineage) return [];

    return lineage.processingHistory.sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    );
  }

  /**
   * Verify data integrity
   */
  async verifyDataIntegrity(dataId: string, method: string): Promise<boolean> {
    const lineage = this.dataLineages.get(dataId);
    if (!lineage) return false;

    lineage.lastVerified = new Date();
    lineage.verificationMethod = method;
    lineage.updatedAt = new Date();

    return true;
  }

  /**
   * Update data quality score
   */
  async updateQualityScore(dataId: string, score: number, reason?: string): Promise<void> {
    const lineage = this.dataLineages.get(dataId);
    if (!lineage) return;

    lineage.qualityScore = Math.max(0, Math.min(1, score));
    lineage.updatedAt = new Date();

    // Record quality update as processing step
    await this.recordProcessingStep({
      type: 'validation',
      processor: 'quality_scorer',
      input: { dataIds: [dataId] },
      output: { 
        dataIds: [dataId], 
        changes: { qualityScore: score, reason } 
      },
      duration: 0,
      success: true,
      confidence: score
    });
  }

  /**
   * Get compliance report for data
   */
  getComplianceReport(dataId: string): {
    dataId: string;
    compliant: boolean;
    issues: string[];
    recommendations: string[];
    retentionStatus: 'valid' | 'expiring' | 'expired';
    lastAccessed?: Date;
    accessCount: number;
  } {
    const lineage = this.dataLineages.get(dataId);
    if (!lineage) {
      return {
        dataId,
        compliant: false,
        issues: ['Data lineage not found'],
        recommendations: ['Investigate missing provenance data'],
        retentionStatus: 'expired',
        accessCount: 0
      };
    }

    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check robots.txt compliance
    const hasNonCompliantSources = lineage.sources.some(s => !s.robotsCompliant);
    if (hasNonCompliantSources) {
      issues.push('Data sourced from non-robots.txt compliant scraping');
      recommendations.push('Review and potentially remove non-compliant data');
    }

    // Check rate limiting compliance
    const hasNonRateLimitedSources = lineage.sources.some(s => !s.rateLimited);
    if (hasNonRateLimitedSources) {
      issues.push('Data sourced without proper rate limiting');
      recommendations.push('Implement proper rate limiting for future scraping');
    }

    // Check data quality
    if (lineage.qualityScore < 0.5) {
      issues.push('Low data quality score');
      recommendations.push('Verify and improve data quality');
    }

    // Check retention policy
    let retentionStatus: 'valid' | 'expiring' | 'expired' = 'valid';
    if (lineage.retentionPolicy?.retainUntil) {
      const now = new Date();
      const retainUntil = lineage.retentionPolicy.retainUntil;
      const daysUntilExpiry = (retainUntil.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
      
      if (daysUntilExpiry < 0) {
        retentionStatus = 'expired';
        issues.push('Data retention period has expired');
        recommendations.push('Delete or anonymize expired data');
      } else if (daysUntilExpiry < 30) {
        retentionStatus = 'expiring';
        recommendations.push('Review data retention before expiry');
      }
    }

    // Check verification status
    if (!lineage.lastVerified || 
        (new Date().getTime() - lineage.lastVerified.getTime()) > 90 * 24 * 60 * 60 * 1000) {
      issues.push('Data not verified in last 90 days');
      recommendations.push('Verify data accuracy and integrity');
    }

    const lastAccessed = lineage.accessLog.length > 0 
      ? lineage.accessLog[lineage.accessLog.length - 1].timestamp
      : undefined;

    return {
      dataId,
      compliant: issues.length === 0,
      issues,
      recommendations,
      retentionStatus,
      lastAccessed,
      accessCount: lineage.accessLog.length
    };
  }

  /**
   * Get provenance statistics
   */
  getProvenanceStats(): {
    totalDataItems: number;
    dataByType: Record<string, number>;
    sourcesByType: Record<string, number>;
    sourcesByDomain: Record<string, number>;
    processingByType: Record<string, number>;
    qualityDistribution: {
      high: number; // > 0.8
      medium: number; // 0.5 - 0.8
      low: number; // < 0.5
    };
    complianceStats: {
      robotsCompliant: number;
      rateLimited: number;
      verified: number;
      expired: number;
    };
  } {
    const lineages = Array.from(this.dataLineages.values());
    const sources = Array.from(this.sources.values());
    const steps = Array.from(this.processingSteps.values());

    // Data by type
    const dataByType = lineages.reduce((acc, l) => {
      acc[l.dataType] = (acc[l.dataType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Sources by type
    const sourcesByType = sources.reduce((acc, s) => {
      acc[s.type] = (acc[s.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Sources by domain
    const sourcesByDomain = sources.reduce((acc, s) => {
      if (s.domain) {
        acc[s.domain] = (acc[s.domain] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Processing by type
    const processingByType = steps.reduce((acc, s) => {
      acc[s.type] = (acc[s.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Quality distribution
    const qualityDistribution = lineages.reduce((acc, l) => {
      if (l.qualityScore > 0.8) acc.high++;
      else if (l.qualityScore >= 0.5) acc.medium++;
      else acc.low++;
      return acc;
    }, { high: 0, medium: 0, low: 0 });

    // Compliance stats
    const now = new Date();
    const complianceStats = {
      robotsCompliant: lineages.filter(l => 
        l.sources.every(s => s.robotsCompliant)
      ).length,
      rateLimited: lineages.filter(l => 
        l.sources.every(s => s.rateLimited)
      ).length,
      verified: lineages.filter(l => 
        l.lastVerified && (now.getTime() - l.lastVerified.getTime()) < 90 * 24 * 60 * 60 * 1000
      ).length,
      expired: lineages.filter(l => 
        l.retentionPolicy?.retainUntil && now > l.retentionPolicy.retainUntil
      ).length
    };

    return {
      totalDataItems: lineages.length,
      dataByType,
      sourcesByType,
      sourcesByDomain,
      processingByType,
      qualityDistribution,
      complianceStats
    };
  }

  /**
   * Export provenance data for compliance
   */
  exportProvenanceData(query: ProvenanceQuery): {
    metadata: {
      exportedAt: Date;
      query: ProvenanceQuery;
      totalRecords: number;
    };
    data: Array<{
      dataId: string;
      dataType: string;
      sources: DataSource[];
      processingHistory: ProcessingStep[];
      accessLog: AccessLogEntry[];
      complianceStatus: ReturnType<ProvenanceTracker['getComplianceReport']>;
    }>;
  } {
    const lineages = this.queryDataLineages(query);
    
    const exportData = lineages.map(lineage => ({
      dataId: lineage.dataId,
      dataType: lineage.dataType,
      sources: lineage.sources,
      processingHistory: lineage.processingHistory,
      accessLog: lineage.accessLog,
      complianceStatus: this.getComplianceReport(lineage.dataId)
    }));

    return {
      metadata: {
        exportedAt: new Date(),
        query,
        totalRecords: exportData.length
      },
      data: exportData
    };
  }

  /**
   * Update data lineage with processing step
   */
  private async updateDataLineage(dataId: string, step: ProcessingStep): Promise<void> {
    const lineage = this.dataLineages.get(dataId);
    if (!lineage) return;

    lineage.processingHistory.push(step);
    lineage.updatedAt = new Date();

    // Update quality score if provided
    if (step.confidence !== undefined) {
      lineage.qualityScore = Math.max(lineage.qualityScore, step.confidence);
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup old data based on retention policies
   */
  async cleanup(): Promise<{ deleted: number; anonymized: number }> {
    const now = new Date();
    let deleted = 0;
    let anonymized = 0;

    for (const [dataId, lineage] of this.dataLineages.entries()) {
      if (lineage.retentionPolicy?.retainUntil && now > lineage.retentionPolicy.retainUntil) {
        if (lineage.retentionPolicy.reason === 'delete') {
          this.dataLineages.delete(dataId);
          deleted++;
        } else {
          // Anonymize data
          lineage.originalValue = '[ANONYMIZED]';
          lineage.currentValue = '[ANONYMIZED]';
          lineage.accessLog = [];
          anonymized++;
        }
      }
    }

    return { deleted, anonymized };
  }
}

// Export singleton instance
export const provenanceTracker = ProvenanceTracker.getInstance();