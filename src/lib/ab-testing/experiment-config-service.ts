/**
 * Experiment Configuration and Variant Management Service
 * Manages experiment configurations, variants, and their lifecycle
 */

import { statisticalAnalyzer, type VariantData, type StatisticalTestResult } from './statistical-analysis';
import { featureFlagService, type FeatureFlag } from '@/lib/feature-flags/feature-flag-service';
import { featureFlagAuditLog } from '@/lib/feature-flags/audit-log-service';

export interface ExperimentConfig {
  id: string;
  name: string;
  description: string;
  hypothesis: string;
  successMetrics: SuccessMetric[];
  targetingRules: TargetingRule[];
  variants: VariantConfig[];
  trafficAllocation: number;
  duration: ExperimentDuration;
  status: ExperimentStatus;
  priority: ExperimentPriority;
  tags: string[];
  owner: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  metadata: Record<string, any>;
}

export interface SuccessMetric {
  id: string;
  name: string;
  type: 'conversion' | 'revenue' | 'engagement' | 'retention' | 'custom';
  description: string;
  isPrimary: boolean;
  targetValue?: number;
  unit?: string;
  calculationMethod: 'count' | 'sum' | 'average' | 'rate' | 'custom';
  eventTriggers: string[];
  conditions?: Record<string, any>;
}

export interface TargetingRule {
  id: string;
  name: string;
  type: 'include' | 'exclude';
  conditions: TargetingCondition[];
  percentage?: number;
}

export interface TargetingCondition {
  attribute: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
  weight?: number;
}

export interface VariantConfig {
  id: string;
  name: string;
  description: string;
  isControl: boolean;
  trafficWeight: number;
  config: Record<string, any>;
  overrides: Record<string, any>;
  triggers: VariantTrigger[];
  customizations: VariantCustomization[];
  implementationStatus: 'pending' | 'ready' | 'deployed' | 'failed';
}

export interface VariantTrigger {
  event: string;
  conditions: Record<string, any>;
  actions: VariantAction[];
}

export interface VariantAction {
  type: 'modify' | 'redirect' | 'track' | 'custom';
  target: string;
  value: any;
  delay?: number;
}

export interface VariantCustomization {
  type: 'ui' | 'logic' | 'content' | 'behavior';
  selector?: string;
  property?: string;
  value: any;
  conditions?: Record<string, any>;
}

export interface ExperimentDuration {
  type: 'fixed' | 'statistical' | 'manual';
  startDate?: Date;
  endDate?: Date;
  minimumDuration?: number; // days
  maximumDuration?: number; // days
  requiredSampleSize?: number;
  checkInterval?: number; // hours
}

export type ExperimentStatus = 
  | 'draft' 
  | 'pending_approval' 
  | 'approved' 
  | 'running' 
  | 'paused' 
  | 'completed' 
  | 'analyzed' 
  | 'rolled_out' 
  | 'failed' 
  | 'cancelled';

export type ExperimentPriority = 'low' | 'medium' | 'high' | 'critical';

export interface ExperimentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  config: Partial<ExperimentConfig>;
  variants: Omit<VariantConfig, 'id'>[];
  metrics: Omit<SuccessMetric, 'id'>[];
  targetingRules: Omit<TargetingRule, 'id'>[];
  useCases: string[];
  requiredFeatures: string[];
  tags: string[];
}

export interface ExperimentValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  recommendations: string[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
  impact: 'low' | 'medium' | 'high';
}

export interface ExperimentExecutionPlan {
  experiment: ExperimentConfig;
  rolloutPlan: RolloutStep[];
  monitoringPlan: MonitoringStep[];
  successCriteria: SuccessCriteria[];
  rollbackPlan: RollbackStep[];
}

export interface RolloutStep {
  step: number;
  name: string;
  trafficPercentage: number;
  duration?: number; // hours
  conditions: Record<string, any>;
  actions: string[];
  checkpoints: Checkpoint[];
}

export interface MonitoringStep {
  metric: string;
  threshold: number;
  operator: 'greater_than' | 'less_than' | 'equals';
  action: 'alert' | 'pause' | 'rollback';
  frequency: number; // minutes
}

export interface Checkpoint {
  name: string;
  metric: string;
  threshold: number;
  action: 'continue' | 'pause' | 'rollback';
}

export interface SuccessCriteria {
  metric: string;
  threshold: number;
  operator: 'greater_than' | 'less_than' | 'equals';
  weight: number;
}

export interface RollbackStep {
  trigger: string;
  conditions: Record<string, any>;
  actions: string[];
  timeout?: number; // minutes
}

export class ExperimentConfigService {
  private experiments: Map<string, ExperimentConfig> = new Map();
  private templates: Map<string, ExperimentTemplate> = new Map();
  private validators: Map<string, (config: ExperimentConfig) => ExperimentValidationResult> = new Map();

  constructor() {
    this.initializeTemplates();
    this.initializeValidators();
  }

  /**
   * Create a new experiment configuration
   */
  async createExperiment(
    config: Omit<ExperimentConfig, 'id' | 'createdAt' | 'updatedAt'>,
    createdBy: string
  ): Promise<ExperimentConfig> {
    // Validate the configuration
    const validation = this.validateExperiment(config as ExperimentConfig);
    if (!validation.valid) {
      throw new Error(`Invalid experiment configuration: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Create the experiment
    const experiment: ExperimentConfig = {
      ...config,
      id: this.generateExperimentId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy,
      updatedBy: createdBy
    };

    // Store the experiment
    this.experiments.set(experiment.id, experiment);

    // Log the creation
    await featureFlagAuditLog.logFlagChange({
      flagId: experiment.id,
      flagKey: experiment.id,
      action: 'CREATED',
      oldValue: null,
      newValue: experiment,
      performedBy: createdBy,
      reason: 'A/B test experiment created'
    });

    console.log(`🧪 [EXPERIMENT-CONFIG] Created experiment: ${experiment.name}`);
    return experiment;
  }

  /**
   * Update an experiment configuration
   */
  async updateExperiment(
    id: string,
    updates: Partial<ExperimentConfig>,
    updatedBy: string,
    reason?: string
  ): Promise<ExperimentConfig> {
    const experiment = this.experiments.get(id);
    if (!experiment) {
      throw new Error(`Experiment with ID ${id} not found`);
    }

    // Check if experiment can be updated
    if (experiment.status === 'running' || experiment.status === 'completed') {
      throw new Error(`Cannot update experiment in ${experiment.status} status`);
    }

    // Create updated configuration
    const updatedConfig: ExperimentConfig = {
      ...experiment,
      ...updates,
      id, // Ensure ID doesn't change
      updatedAt: new Date(),
      updatedBy
    };

    // Validate the updated configuration
    const validation = this.validateExperiment(updatedConfig);
    if (!validation.valid) {
      throw new Error(`Invalid experiment configuration: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Store the updated experiment
    this.experiments.set(id, updatedConfig);

    // Log the update
    await featureFlagAuditLog.logFlagChange({
      flagId: id,
      flagKey: id,
      action: 'UPDATED',
      oldValue: experiment,
      newValue: updatedConfig,
      performedBy: updatedBy,
      reason
    });

    console.log(`🧪 [EXPERIMENT-CONFIG] Updated experiment: ${updatedConfig.name}`);
    return updatedConfig;
  }

  /**
   * Get an experiment configuration
   */
  getExperiment(id: string): ExperimentConfig | null {
    return this.experiments.get(id) || null;
  }

  /**
   * Get all experiment configurations
   */
  getAllExperiments(): ExperimentConfig[] {
    return Array.from(this.experiments.values());
  }

  /**
   * Get experiments by status
   */
  getExperimentsByStatus(status: ExperimentStatus): ExperimentConfig[] {
    return Array.from(this.experiments.values()).filter(exp => exp.status === status);
  }

  /**
   * Get experiments by owner
   */
  getExperimentsByOwner(owner: string): ExperimentConfig[] {
    return Array.from(this.experiments.values()).filter(exp => exp.owner === owner);
  }

  /**
   * Delete an experiment configuration
   */
  async deleteExperiment(id: string, deletedBy: string, reason?: string): Promise<void> {
    const experiment = this.experiments.get(id);
    if (!experiment) {
      throw new Error(`Experiment with ID ${id} not found`);
    }

    // Check if experiment can be deleted
    if (experiment.status === 'running') {
      throw new Error('Cannot delete a running experiment. Pause it first.');
    }

    // Log the deletion
    await featureFlagAuditLog.logFlagChange({
      flagId: id,
      flagKey: id,
      action: 'DELETED',
      oldValue: experiment,
      newValue: null,
      performedBy: deletedBy,
      reason
    });

    // Remove the experiment
    this.experiments.delete(id);

    console.log(`🧪 [EXPERIMENT-CONFIG] Deleted experiment: ${experiment.name}`);
  }

  /**
   * Create experiment from template
   */
  async createFromTemplate(
    templateId: string,
    customizations: Partial<ExperimentConfig>,
    createdBy: string
  ): Promise<ExperimentConfig> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template with ID ${templateId} not found`);
    }

    // Merge template with customizations
    const config: Omit<ExperimentConfig, 'id' | 'createdAt' | 'updatedAt'> = {
      name: customizations.name || template.config.name || `Experiment from ${template.name}`,
      description: customizations.description || template.config.description || template.description,
      hypothesis: customizations.hypothesis || template.config.hypothesis || '',
      successMetrics: customizations.successMetrics || template.metrics.map(m => ({ ...m, id: this.generateMetricId() })),
      targetingRules: customizations.targetingRules || template.targetingRules.map(r => ({ ...r, id: this.generateRuleId() })),
      variants: customizations.variants || template.variants.map(v => ({ ...v, id: this.generateVariantId() })),
      trafficAllocation: customizations.trafficAllocation || template.config.trafficAllocation || 100,
      duration: customizations.duration || template.config.duration || { type: 'fixed' as const },
      status: 'draft',
      priority: customizations.priority || template.config.priority || 'medium',
      tags: customizations.tags || template.tags,
      owner: customizations.owner || createdBy,
      createdBy,
      updatedBy: createdBy,
      metadata: { ...template.config.metadata, ...customizations.metadata }
    };

    return this.createExperiment(config, createdBy);
  }

  /**
   * Get available templates
   */
  getTemplates(): ExperimentTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get template by ID
   */
  getTemplate(id: string): ExperimentTemplate | null {
    return this.templates.get(id) || null;
  }

  /**
   * Validate experiment configuration
   */
  validateExperiment(config: ExperimentConfig): ExperimentValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const recommendations: string[] = [];

    // Basic validation
    if (!config.name || config.name.trim() === '') {
      errors.push({
        field: 'name',
        message: 'Experiment name is required',
        code: 'REQUIRED_FIELD',
        severity: 'error'
      });
    }

    if (!config.hypothesis || config.hypothesis.trim() === '') {
      errors.push({
        field: 'hypothesis',
        message: 'Experiment hypothesis is required',
        code: 'REQUIRED_FIELD',
        severity: 'error'
      });
    }

    if (!config.variants || config.variants.length < 2) {
      errors.push({
        field: 'variants',
        message: 'Experiment must have at least 2 variants',
        code: 'INSUFFICIENT_VARIANTS',
        severity: 'error'
      });
    }

    // Variant validation
    if (config.variants) {
      const controlVariants = config.variants.filter(v => v.isControl);
      if (controlVariants.length !== 1) {
        errors.push({
          field: 'variants',
          message: 'Experiment must have exactly one control variant',
          code: 'INVALID_CONTROL_COUNT',
          severity: 'error'
        });
      }

      const totalWeight = config.variants.reduce((sum, v) => sum + v.trafficWeight, 0);
      if (Math.abs(totalWeight - 100) > 0.01) {
        errors.push({
          field: 'variants',
          message: `Variant traffic weights must sum to 100%, current sum is ${totalWeight}%`,
          code: 'INVALID_TRAFFIC_WEIGHT',
          severity: 'error'
        });
      }

      // Check for duplicate variant names
      const variantNames = config.variants.map(v => v.name);
      const duplicateNames = variantNames.filter((name, index) => variantNames.indexOf(name) !== index);
      if (duplicateNames.length > 0) {
        errors.push({
          field: 'variants',
          message: `Duplicate variant names: ${duplicateNames.join(', ')}`,
          code: 'DUPLICATE_VARIANT_NAMES',
          severity: 'error'
        });
      }
    }

    // Success metrics validation
    if (config.successMetrics) {
      const primaryMetrics = config.successMetrics.filter(m => m.isPrimary);
      if (primaryMetrics.length !== 1) {
        errors.push({
          field: 'successMetrics',
          message: 'Experiment must have exactly one primary success metric',
          code: 'INVALID_PRIMARY_METRIC_COUNT',
          severity: 'error'
        });
      }
    }

    // Duration validation
    if (config.duration) {
      if (config.duration.type === 'fixed') {
        if (!config.duration.startDate || !config.duration.endDate) {
          errors.push({
            field: 'duration',
            message: 'Fixed duration experiments must have start and end dates',
            code: 'MISSING_DURATION_DATES',
            severity: 'error'
          });
        }

        if (config.duration.startDate && config.duration.endDate && 
            config.duration.startDate >= config.duration.endDate) {
          errors.push({
            field: 'duration',
            message: 'End date must be after start date',
            code: 'INVALID_DURATION_DATES',
            severity: 'error'
          });
        }
      }

      if (config.duration.type === 'statistical' && !config.duration.requiredSampleSize) {
        warnings.push({
          field: 'duration',
          message: 'Statistical duration experiments should specify required sample size',
          code: 'MISSING_SAMPLE_SIZE',
          impact: 'medium'
        });
        recommendations.push('Consider setting a required sample size for statistical significance');
      }
    }

    // Traffic allocation validation
    if (config.trafficAllocation <= 0 || config.trafficAllocation > 100) {
      errors.push({
        field: 'trafficAllocation',
        message: 'Traffic allocation must be between 0 and 100',
        code: 'INVALID_TRAFFIC_ALLOCATION',
        severity: 'error'
      });
    }

    if (config.trafficAllocation < 10) {
      warnings.push({
        field: 'trafficAllocation',
        message: 'Low traffic allocation may result in longer experiment duration',
        code: 'LOW_TRAFFIC_ALLOCATION',
        impact: 'medium'
      });
    }

    // Check for potential issues
    if (config.duration && config.duration.type === 'fixed') {
      const daysDiff = config.duration.endDate && config.duration.startDate ? 
        Math.ceil((config.duration.endDate.getTime() - config.duration.startDate.getTime()) / (24 * 60 * 60 * 1000)) : 0;
      
      if (daysDiff < 7) {
        warnings.push({
          field: 'duration',
          message: 'Experiment duration is less than 7 days, which may not capture weekly patterns',
          code: 'SHORT_DURATION',
          impact: 'high'
        });
      }

      if (daysDiff > 90) {
        warnings.push({
          field: 'duration',
          message: 'Experiment duration is more than 90 days, consider shorter duration',
          code: 'LONG_DURATION',
          impact: 'medium'
        });
      }
    }

    // Run custom validators
    for (const [name, validator] of this.validators) {
      const result = validator(config);
      errors.push(...result.errors);
      warnings.push(...result.warnings);
      recommendations.push(...result.recommendations);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      recommendations
    };
  }

  /**
   * Generate execution plan for experiment
   */
  generateExecutionPlan(experimentId: string): ExperimentExecutionPlan {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment with ID ${experimentId} not found`);
    }

    // Generate rollout plan
    const rolloutPlan = this.generateRolloutPlan(experiment);

    // Generate monitoring plan
    const monitoringPlan = this.generateMonitoringPlan(experiment);

    // Generate success criteria
    const successCriteria = this.generateSuccessCriteria(experiment);

    // Generate rollback plan
    const rollbackPlan = this.generateRollbackPlan(experiment);

    return {
      experiment,
      rolloutPlan,
      monitoringPlan,
      successCriteria,
      rollbackPlan
    };
  }

  /**
   * Generate rollout plan
   */
  private generateRolloutPlan(experiment: ExperimentConfig): RolloutStep[] {
    const steps: RolloutStep[] = [];
    
    // Default gradual rollout plan
    if (experiment.trafficAllocation === 100) {
      steps.push(
        {
          step: 1,
          name: 'Initial Rollout',
          trafficPercentage: 10,
          duration: 24,
          conditions: { error_rate: { less_than: 0.05 } },
          actions: ['Enable feature flag', 'Start monitoring'],
          checkpoints: [
            { name: 'Error Rate Check', metric: 'error_rate', threshold: 0.05, action: 'pause' },
            { name: 'Performance Check', metric: 'response_time', threshold: 2000, action: 'continue' }
          ]
        },
        {
          step: 2,
          name: 'Expanded Rollout',
          trafficPercentage: 50,
          duration: 48,
          conditions: { conversion_rate: { greater_than: 0.1 } },
          actions: ['Increase traffic', 'Intensify monitoring'],
          checkpoints: [
            { name: 'Conversion Check', metric: 'conversion_rate', threshold: 0.1, action: 'continue' }
          ]
        },
        {
          step: 3,
          name: 'Full Rollout',
          trafficPercentage: 100,
          conditions: { stability_score: { greater_than: 0.95 } },
          actions: ['Full rollout', 'Final monitoring setup'],
          checkpoints: []
        }
      );
    } else {
      // Single step rollout for partial traffic allocation
      steps.push({
        step: 1,
        name: 'Partial Rollout',
        trafficPercentage: experiment.trafficAllocation,
        duration: experiment.duration?.minimumDuration ? experiment.duration.minimumDuration * 24 : 168, // 1 week default
        conditions: {},
        actions: ['Enable feature flag', 'Start monitoring'],
        checkpoints: [
          { name: 'Error Rate Check', metric: 'error_rate', threshold: 0.05, action: 'pause' }
        ]
      });
    }

    return steps;
  }

  /**
   * Generate monitoring plan
   */
  private generateMonitoringPlan(experiment: ExperimentConfig): MonitoringStep[] {
    const steps: MonitoringStep[] = [];
    
    // Add monitoring for each success metric
    experiment.successMetrics.forEach(metric => {
      steps.push({
        metric: metric.name,
        threshold: metric.targetValue || 0,
        operator: 'greater_than',
        action: 'alert',
        frequency: 60 // Check every hour
      });
    });

    // Add system health monitoring
    steps.push(
      {
        metric: 'error_rate',
        threshold: 0.05,
        operator: 'greater_than',
        action: 'rollback',
        frequency: 5 // Check every 5 minutes
      },
      {
        metric: 'response_time',
        threshold: 2000,
        operator: 'greater_than',
        action: 'alert',
        frequency: 15 // Check every 15 minutes
      }
    );

    return steps;
  }

  /**
   * Generate success criteria
   */
  private generateSuccessCriteria(experiment: ExperimentConfig): SuccessCriteria[] {
    const criteria: SuccessCriteria[] = [];
    
    experiment.successMetrics.forEach(metric => {
      if (metric.targetValue) {
        criteria.push({
          metric: metric.name,
          threshold: metric.targetValue,
          operator: 'greater_than',
          weight: metric.isPrimary ? 1.0 : 0.5
        });
      }
    });

    return criteria;
  }

  /**
   * Generate rollback plan
   */
  private generateRollbackPlan(experiment: ExperimentConfig): RollbackStep[] {
    return [
      {
        trigger: 'high_error_rate',
        conditions: { error_rate: { greater_than: 0.1 }, duration: { greater_than: 300 } }, // 5 minutes
        actions: ['Disable feature flag', 'Notify stakeholders', 'Create incident report'],
        timeout: 10 // Execute within 10 minutes
      },
      {
        trigger: 'performance_degradation',
        conditions: { response_time: { greater_than: 5000 }, duration: { greater_than: 600 } }, // 10 minutes
        actions: ['Reduce traffic', 'Investigate performance', 'Consider rollback'],
        timeout: 15
      },
      {
        trigger: 'manual_rollback',
        conditions: { manual_trigger: true },
        actions: ['Immediate rollback', 'Root cause analysis', 'Post-mortem'],
        timeout: 5
      }
    ];
  }

  /**
   * Initialize experiment templates
   */
  private initializeTemplates(): void {
    const templates: ExperimentTemplate[] = [
      {
        id: 'ui-button-test',
        name: 'UI Button Test',
        description: 'Test different button designs, colors, and text',
        category: 'UI Testing',
        config: {
          name: 'UI Button Test',
          description: 'Test different button variations',
          hypothesis: 'Changing button design will improve click-through rate',
          trafficAllocation: 50,
          duration: { type: 'fixed', minimumDuration: 14, maximumDuration: 30 },
          priority: 'medium',
          tags: ['ui', 'button', 'conversion']
        },
        variants: [
          {
            name: 'Control',
            description: 'Current button design',
            isControl: true,
            trafficWeight: 50,
            config: { color: 'blue', text: 'Click Here', size: 'medium' },
            overrides: {},
            triggers: [],
            customizations: [],
            implementationStatus: 'ready'
          },
          {
            name: 'Variant A',
            description: 'Red button with different text',
            isControl: false,
            trafficWeight: 25,
            config: { color: 'red', text: 'Get Started', size: 'medium' },
            overrides: {},
            triggers: [],
            customizations: [],
            implementationStatus: 'ready'
          },
          {
            name: 'Variant B',
            description: 'Green button with larger size',
            isControl: false,
            trafficWeight: 25,
            config: { color: 'green', text: 'Click Here', size: 'large' },
            overrides: {},
            triggers: [],
            customizations: [],
            implementationStatus: 'ready'
          }
        ],
        metrics: [
          {
            name: 'Click Through Rate',
            type: 'conversion',
            description: 'Percentage of users who click the button',
            isPrimary: true,
            targetValue: 0.15,
            unit: '%',
            calculationMethod: 'rate',
            eventTriggers: ['button_click', 'page_view']
          },
          {
            name: 'Conversion Rate',
            type: 'conversion',
            description: 'Percentage of users who complete the desired action',
            isPrimary: false,
            targetValue: 0.05,
            unit: '%',
            calculationMethod: 'rate',
            eventTriggers: ['conversion', 'page_view']
          }
        ],
        targetingRules: [
          {
            name: 'All Users',
            type: 'include',
            conditions: [],
            percentage: 100
          }
        ],
        useCases: ['Button optimization', 'Color testing', 'Text testing'],
        requiredFeatures: ['feature_flags', 'analytics'],
        tags: ['ui', 'button', 'conversion', 'frontend']
      },
      {
        id: 'ai-search-algorithm',
        name: 'AI Search Algorithm Test',
        description: 'Test different AI search algorithms and configurations',
        category: 'AI Testing',
        config: {
          name: 'AI Search Algorithm Test',
          description: 'Test different AI search algorithms',
          hypothesis: 'New AI algorithm will improve search relevance and user satisfaction',
          trafficAllocation: 30,
          duration: { type: 'statistical', requiredSampleSize: 1000, minimumDuration: 7, maximumDuration: 21 },
          priority: 'high',
          tags: ['ai', 'search', 'algorithm']
        },
        variants: [
          {
            name: 'Current Algorithm',
            description: 'Existing AI search algorithm',
            isControl: true,
            trafficWeight: 50,
            config: { algorithm: 'current', model: 'gpt-3.5-turbo', temperature: 0.7 },
            overrides: {},
            triggers: [],
            customizations: [],
            implementationStatus: 'ready'
          },
          {
            name: 'New Algorithm v1',
            description: 'Improved AI search algorithm with better relevance',
            isControl: false,
            trafficWeight: 25,
            config: { algorithm: 'new-v1', model: 'gpt-4', temperature: 0.5 },
            overrides: {},
            triggers: [],
            customizations: [],
            implementationStatus: 'ready'
          },
          {
            name: 'New Algorithm v2',
            description: 'Optimized AI search algorithm with caching',
            isControl: false,
            trafficWeight: 25,
            config: { algorithm: 'new-v2', model: 'gpt-4', temperature: 0.3, cache: true },
            overrides: {},
            triggers: [],
            customizations: [],
            implementationStatus: 'ready'
          }
        ],
        metrics: [
          {
            name: 'Search Success Rate',
            type: 'conversion',
            description: 'Percentage of searches that return relevant results',
            isPrimary: true,
            targetValue: 0.85,
            unit: '%',
            calculationMethod: 'rate',
            eventTriggers: ['search_success', 'search_query']
          },
          {
            name: 'User Satisfaction',
            type: 'engagement',
            description: 'Average user satisfaction rating',
            isPrimary: false,
            targetValue: 4.0,
            unit: 'stars',
            calculationMethod: 'average',
            eventTriggers: ['satisfaction_rating']
          },
          {
            name: 'Search Response Time',
            type: 'engagement',
            description: 'Average time to return search results',
            isPrimary: false,
            targetValue: 2000,
            unit: 'ms',
            calculationMethod: 'average',
            eventTriggers: ['search_completed']
          }
        ],
        targetingRules: [
          {
            name: 'Power Users',
            type: 'include',
            conditions: [
              { attribute: 'search_count_last_30d', operator: 'greater_than', value: 10 }
            ],
            percentage: 100
          }
        ],
        useCases: ['Search algorithm optimization', 'AI model testing', 'Performance testing'],
        requiredFeatures: ['ai_search', 'feature_flags', 'analytics'],
        tags: ['ai', 'search', 'algorithm', 'performance']
      }
    ];

    templates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  /**
   * Initialize custom validators
   */
  private initializeValidators(): void {
    // Add custom validators as needed
    this.validators.set('ai_search_validator', (config: ExperimentConfig) => {
      const errors: ValidationError[] = [];
      const warnings: ValidationWarning[] = [];
      const recommendations: string[] = [];

      // Custom validation logic for AI search experiments
      if (config.tags.includes('ai') && config.tags.includes('search')) {
        if (!config.successMetrics.some(m => m.name.includes('success'))) {
          warnings.push({
            field: 'successMetrics',
            message: 'AI search experiments should include success rate metrics',
            code: 'MISSING_SUCCESS_METRIC',
            impact: 'high'
          });
        }

        if (!config.successMetrics.some(m => m.name.includes('response_time'))) {
          recommendations.push('Consider adding response time metrics for AI experiments');
        }
      }

      return { valid: errors.length === 0, errors, warnings, recommendations };
    });
  }

  /**
   * Generate unique IDs
   */
  private generateExperimentId(): string {
    return `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateVariantId(): string {
    return `var_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMetricId(): string {
    return `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRuleId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const experimentConfigService = new ExperimentConfigService();

// Export utility functions
export async function createExperiment(
  config: Omit<ExperimentConfig, 'id' | 'createdAt' | 'updatedAt'>,
  createdBy: string
): Promise<ExperimentConfig> {
  return experimentConfigService.createExperiment(config, createdBy);
}

export function getExperiment(id: string): ExperimentConfig | null {
  return experimentConfigService.getExperiment(id);
}

export function getAllExperiments(): ExperimentConfig[] {
  return experimentConfigService.getAllExperiments();
}

export async function updateExperiment(
  id: string,
  updates: Partial<ExperimentConfig>,
  updatedBy: string,
  reason?: string
): Promise<ExperimentConfig> {
  return experimentConfigService.updateExperiment(id, updates, updatedBy, reason);
}

export function validateExperiment(config: ExperimentConfig): ExperimentValidationResult {
  return experimentConfigService.validateExperiment(config);
}

export function getExperimentTemplates(): ExperimentTemplate[] {
  return experimentConfigService.getTemplates();
}

export async function createFromTemplate(
  templateId: string,
  customizations: Partial<ExperimentConfig>,
  createdBy: string
): Promise<ExperimentConfig> {
  return experimentConfigService.createFromTemplate(templateId, customizations, createdBy);
}