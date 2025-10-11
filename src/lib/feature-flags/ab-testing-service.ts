/**
 * A/B Testing Service
 * Provides A/B testing functionality integrated with the feature flag system
 */

import { featureFlagDb } from './feature-flag-db';
import { featureFlagService } from './feature-flag-service';
import { featureFlagAuditLog } from './audit-log-service';
import { type FeatureFlag } from './feature-flag-service';

export interface Experiment {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'archived';
  flagId: string;
  flagKey: string;
  trafficAllocation: number; // Percentage of traffic to allocate to this experiment
  variants: ExperimentVariant[];
  startDate?: Date;
  endDate?: Date;
  targetMetrics: string[];
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExperimentVariant {
  id: string;
  name: string;
  description: string;
  isControl: boolean;
  trafficWeight: number; // Percentage of experiment traffic
  config: Record<string, any>; // Variant configuration
  results?: ExperimentVariantResults;
}

export interface ExperimentVariantResults {
  participants: number;
  conversions: number;
  conversionRate: number;
  averageValue?: number;
  confidence?: number;
  significance?: 'low' | 'medium' | 'high';
  winner?: boolean;
}

export interface ExperimentParticipant {
  id: string;
  experimentId: string;
  userId?: string;
  sessionId: string;
  variantId: string;
  enrolledAt: Date;
  convertedAt?: Date;
  conversionValue?: number;
  metadata?: Record<string, any>;
}

export interface ExperimentConfig {
  name: string;
  description: string;
  flagId: string;
  flagKey: string;
  trafficAllocation: number;
  variants: Omit<ExperimentVariant, 'id' | 'results'>[];
  targetMetrics: string[];
  startDate?: Date;
  endDate?: Date;
}

export interface ExperimentMetrics {
  experimentId: string;
  totalParticipants: number;
  totalConversions: number;
  overallConversionRate: number;
  variantMetrics: Record<string, ExperimentVariantResults>;
  statisticalSignificance?: {
    pValue: number;
    confidence: number;
    significant: boolean;
    winner?: string;
  };
}

export class ABTestingService {
  private db = featureFlagDb;
  private auditLog = featureFlagAuditLog;
  private experiments: Map<string, Experiment> = new Map();
  private participantAssignments: Map<string, string> = new Map(); // userId -> variantId

  /**
   * Create a new A/B test experiment
   */
  async createExperiment(config: ExperimentConfig, createdById: string): Promise<Experiment> {
    // Validate variants
    if (config.variants.length < 2) {
      throw new Error('Experiment must have at least 2 variants');
    }

    // Ensure there's exactly one control variant
    const controlVariants = config.variants.filter(v => v.isControl);
    if (controlVariants.length !== 1) {
      throw new Error('Experiment must have exactly one control variant');
    }

    // Validate traffic weights
    const totalWeight = config.variants.reduce((sum, v) => sum + v.trafficWeight, 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      throw new Error('Variant traffic weights must sum to 100%');
    }

    // Create experiment
    const experiment: Experiment = {
      id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: config.name,
      description: config.description,
      status: 'draft',
      flagId: config.flagId,
      flagKey: config.flagKey,
      trafficAllocation: config.trafficAllocation,
      variants: config.variants.map(v => ({
        ...v,
        id: `variant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      })),
      startDate: config.startDate,
      endDate: config.endDate,
      targetMetrics: config.targetMetrics,
      createdById,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Store experiment
    this.experiments.set(experiment.id, experiment);

    // Log creation
    await this.auditLog.logFlagChange({
      flagId: config.flagId,
      flagKey: config.flagKey,
      action: 'CREATED',
      oldValue: null,
      newValue: { experiment: experiment.name },
      performedBy: createdById,
      reason: 'A/B test experiment created'
    });

    console.log(`🧪 [AB-TESTING] Created experiment: ${experiment.name}`);
    
    return experiment;
  }

  /**
   * Start an A/B test experiment
   */
  async startExperiment(experimentId: string, startedById: string): Promise<void> {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment with ID ${experimentId} not found`);
    }

    if (experiment.status !== 'draft') {
      throw new Error(`Cannot start experiment with status: ${experiment.status}`);
    }

    // Update experiment status
    experiment.status = 'running';
    experiment.startDate = new Date();
    experiment.updatedAt = new Date();

    // Ensure the feature flag is enabled
    const flag = await this.db.getFlagById(experiment.flagId);
    if (!flag) {
      throw new Error(`Feature flag with ID ${experiment.flagId} not found`);
    }

    if (!flag.enabled) {
      await this.db.updateFlag(experiment.flagId, { enabled: true }, startedById, 'A/B test experiment started');
    }

    // Log start
    await this.auditLog.logFlagChange({
      flagId: experiment.flagId,
      flagKey: experiment.flagKey,
      action: 'UPDATED',
      oldValue: null,
      newValue: { experiment: experiment.name, status: 'running' },
      performedBy: startedById,
      reason: 'A/B test experiment started'
    });

    console.log(`🧪 [AB-TESTING] Started experiment: ${experiment.name}`);
  }

  /**
   * Pause an A/B test experiment
   */
  async pauseExperiment(experimentId: string, pausedById: string, reason?: string): Promise<void> {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment with ID ${experimentId} not found`);
    }

    if (experiment.status !== 'running') {
      throw new Error(`Cannot pause experiment with status: ${experiment.status}`);
    }

    // Update experiment status
    experiment.status = 'paused';
    experiment.updatedAt = new Date();

    // Log pause
    await this.auditLog.logFlagChange({
      flagId: experiment.flagId,
      flagKey: experiment.flagKey,
      action: 'UPDATED',
      oldValue: null,
      newValue: { experiment: experiment.name, status: 'paused' },
      performedBy: pausedById,
      reason: reason || 'A/B test experiment paused'
    });

    console.log(`🧪 [AB-TESTING] Paused experiment: ${experiment.name}`);
  }

  /**
   * Resume a paused A/B test experiment
   */
  async resumeExperiment(experimentId: string, resumedById: string): Promise<void> {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment with ID ${experimentId} not found`);
    }

    if (experiment.status !== 'paused') {
      throw new Error(`Cannot resume experiment with status: ${experiment.status}`);
    }

    // Update experiment status
    experiment.status = 'running';
    experiment.updatedAt = new Date();

    // Log resume
    await this.auditLog.logFlagChange({
      flagId: experiment.flagId,
      flagKey: experiment.flagKey,
      action: 'UPDATED',
      oldValue: null,
      newValue: { experiment: experiment.name, status: 'running' },
      performedBy: resumedById,
      reason: 'A/B test experiment resumed'
    });

    console.log(`🧪 [AB-TESTING] Resumed experiment: ${experiment.name}`);
  }

  /**
   * Complete an A/B test experiment
   */
  async completeExperiment(experimentId: string, completedById: string): Promise<void> {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment with ID ${experimentId} not found`);
    }

    if (experiment.status !== 'running') {
      throw new Error(`Cannot complete experiment with status: ${experiment.status}`);
    }

    // Update experiment status
    experiment.status = 'completed';
    experiment.endDate = new Date();
    experiment.updatedAt = new Date();

    // Calculate final results
    await this.calculateExperimentResults(experimentId);

    // Log completion
    await this.auditLog.logFlagChange({
      flagId: experiment.flagId,
      flagKey: experiment.flagKey,
      action: 'UPDATED',
      oldValue: null,
      newValue: { experiment: experiment.name, status: 'completed' },
      performedBy: completedById,
      reason: 'A/B test experiment completed'
    });

    console.log(`🧪 [AB-TESTING] Completed experiment: ${experiment.name}`);
  }

  /**
   * Get the variant for a user in an experiment
   */
  async getExperimentVariant(
    experimentId: string,
    userId?: string,
    sessionId?: string
  ): Promise<ExperimentVariant | null> {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment with ID ${experimentId} not found`);
    }

    // Check if experiment is running
    if (experiment.status !== 'running') {
      return null;
    }

    // Check if user is already assigned to a variant
    if (userId && this.participantAssignments.has(userId)) {
      const variantId = this.participantAssignments.get(userId)!;
      return experiment.variants.find(v => v.id === variantId) || null;
    }

    // Check if user should be included in the experiment (traffic allocation)
    if (userId) {
      const hash = this.hashString(userId + experimentId);
      const bucket = hash % 100;
      
      if (bucket >= experiment.trafficAllocation) {
        return null; // User not in experiment traffic
      }
    }

    // Assign user to a variant
    const variant = this.assignVariant(experiment, userId, sessionId);
    
    return variant;
  }

  /**
   * Assign a user to a variant
   */
  private assignVariant(
    experiment: Experiment,
    userId?: string,
    sessionId?: string
  ): ExperimentVariant {
    // Generate a consistent hash for user/session
    const identifier = userId || sessionId || `anonymous_${Math.random().toString(36).substr(2, 9)}`;
    const hash = this.hashString(identifier + experiment.id);
    
    // Determine which bucket the user falls into
    let bucket = hash % 100;
    
    // Find the variant based on traffic weights
    let cumulativeWeight = 0;
    for (const variant of experiment.variants) {
      cumulativeWeight += variant.trafficWeight;
      
      if (bucket < cumulativeWeight) {
        // Store assignment
        if (userId) {
          this.participantAssignments.set(userId, variant.id);
        }
        
        // Record participant
        const participant: ExperimentParticipant = {
          id: `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          experimentId: experiment.id,
          userId,
          sessionId: sessionId || `session_${Math.random().toString(36).substr(2, 9)}`,
          variantId: variant.id,
          enrolledAt: new Date()
        };
        
        // In a real implementation, save to database
        // await this.db.createExperimentParticipant(participant);
        
        return variant;
      }
    }
    
    // Fallback to control variant
    const controlVariant = experiment.variants.find(v => v.isControl)!;
    if (userId) {
      this.participantAssignments.set(userId, controlVariant.id);
    }
    
    return controlVariant;
  }

  /**
   * Record a conversion for an experiment participant
   */
  async recordConversion(
    experimentId: string,
    userId?: string,
    sessionId?: string,
    value?: number
  ): Promise<void> {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment with ID ${experimentId} not found`);
    }

    // Find the participant
    const variantId = userId ? this.participantAssignments.get(userId) : null;
    if (!variantId) {
      return; // User not in experiment
    }

    // In a real implementation, update the participant record in the database
    // await this.db.updateParticipantConversion(participantId, value);
    
    console.log(`🧪 [AB-TESTING] Recorded conversion for experiment ${experimentId}, variant ${variantId}, value: ${value}`);
  }

  /**
   * Calculate experiment results
   */
  async calculateExperimentResults(experimentId: string): Promise<ExperimentMetrics> {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment with ID ${experimentId} not found`);
    }

    // In a real implementation, this would query the database for participant data
    // For now, we'll generate mock results
    
    const variantMetrics: Record<string, ExperimentVariantResults> = {};
    let totalParticipants = 0;
    let totalConversions = 0;
    
    for (const variant of experiment.variants) {
      // Mock data - in a real implementation, this would come from the database
      const participants = Math.floor(Math.random() * 1000) + 100;
      const conversionRate = 0.1 + Math.random() * 0.2; // 10-30% conversion rate
      const conversions = Math.floor(participants * conversionRate);
      
      totalParticipants += participants;
      totalConversions += conversions;
      
      variantMetrics[variant.id] = {
        participants,
        conversions,
        conversionRate,
        confidence: Math.random() * 0.3 + 0.7, // 70-100% confidence
        significance: Math.random() > 0.5 ? 'high' : Math.random() > 0.25 ? 'medium' : 'low'
      };
    }
    
    const overallConversionRate = totalParticipants > 0 ? totalConversions / totalParticipants : 0;
    
    // Calculate statistical significance (simplified)
    const controlVariant = experiment.variants.find(v => v.isControl)!;
    const controlMetrics = variantMetrics[controlVariant.id];
    
    let statisticalSignificance;
    let winner;
    
    if (controlMetrics) {
      // Find the best performing variant
      let bestVariant = controlVariant;
      let bestConversionRate = controlMetrics.conversionRate;
      
      for (const variant of experiment.variants) {
        if (variant.id !== controlVariant.id) {
          const metrics = variantMetrics[variant.id];
          if (metrics.conversionRate > bestConversionRate) {
            bestVariant = variant;
            bestConversionRate = metrics.conversionRate;
          }
        }
      }
      
      // Simplified significance calculation
      const improvement = bestConversionRate > controlMetrics.conversionRate
        ? (bestConversionRate - controlMetrics.conversionRate) / controlMetrics.conversionRate
        : 0;
      
      const pValue = Math.max(0.05 - improvement, 0.01); // Mock p-value
      
      statisticalSignificance = {
        pValue,
        confidence: 1 - pValue,
        significant: pValue < 0.05,
        winner: bestVariant.id !== controlVariant.id ? bestVariant.id : undefined
      };
      
      if (statisticalSignificance.winner) {
        variantMetrics[statisticalSignificance.winner].winner = true;
      }
    }
    
    const metrics: ExperimentMetrics = {
      experimentId,
      totalParticipants,
      totalConversions,
      overallConversionRate,
      variantMetrics,
      statisticalSignificance
    };
    
    // Update experiment with results
    for (const variant of experiment.variants) {
      variant.results = variantMetrics[variant.id];
    }
    
    return metrics;
  }

  /**
   * Get all experiments
   */
  getAllExperiments(): Experiment[] {
    return Array.from(this.experiments.values());
  }

  /**
   * Get a specific experiment
   */
  getExperiment(experimentId: string): Experiment | null {
    return this.experiments.get(experimentId) || null;
  }

  /**
   * Get experiments for a specific feature flag
   */
  getExperimentsForFlag(flagId: string): Experiment[] {
    return Array.from(this.experiments.values()).filter(
      exp => exp.flagId === flagId
    );
  }

  /**
   * Delete an experiment
   */
  async deleteExperiment(experimentId: string, deletedById: string, reason?: string): Promise<void> {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment with ID ${experimentId} not found`);
    }

    // Log deletion
    await this.auditLog.logFlagChange({
      flagId: experiment.flagId,
      flagKey: experiment.flagKey,
      action: 'DELETED',
      oldValue: { experiment: experiment.name },
      newValue: null,
      performedBy: deletedById,
      reason: reason || 'A/B test experiment deleted'
    });

    // Remove experiment
    this.experiments.delete(experimentId);

    console.log(`🧪 [AB-TESTING] Deleted experiment: ${experiment.name}`);
  }

  /**
   * Simple hash function for consistent user assignment
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Get experiment analytics
   */
  async getExperimentAnalytics(experimentId: string): Promise<{
    experiment: Experiment;
    metrics: ExperimentMetrics;
    dailyStats: Array<{
      date: string;
      participants: number;
      conversions: number;
      conversionRate: number;
    }>;
  }> {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment with ID ${experimentId} not found`);
    }

    const metrics = await this.calculateExperimentResults(experimentId);
    
    // Mock daily stats - in a real implementation, this would come from the database
    const dailyStats = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Mock data
      const participants = Math.floor(Math.random() * 100) + 20;
      const conversionRate = 0.1 + Math.random() * 0.2;
      const conversions = Math.floor(participants * conversionRate);
      
      dailyStats.push({
        date: dateStr,
        participants,
        conversions,
        conversionRate
      });
    }
    
    return {
      experiment,
      metrics,
      dailyStats
    };
  }
}

// Export singleton instance
export const abTestingService = new ABTestingService();