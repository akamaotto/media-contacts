/**
 * Automated Experiment Lifecycle Management Service
 * Manages the complete lifecycle of A/B testing experiments with automation
 */

import { abTestingService, type Experiment, type ExperimentVariant } from '@/lib/feature-flags/ab-testing-service';
import { experimentConfigService, type ExperimentConfig, type ExperimentStatus } from './experiment-config-service';
import { abTestingAnalytics, type ExperimentAnalytics } from '@/lib/analytics/ab-testing-analytics';
import { userSegmentationService } from './user-segmentation-service';
// import { statisticalAnalyzer } from './statistical-analysis';
import { featureFlagService } from '@/lib/feature-flags/feature-flag-service';
import { featureFlagAuditLog } from '@/lib/feature-flags/audit-log-service';

export interface LifecycleConfig {
  id: string;
  experimentId: string;
  autoStart: boolean;
  autoStop: boolean;
  autoRollback: boolean;
  autoRollout: boolean;
  monitoringConfig: MonitoringConfig;
  rolloutConfig: RolloutConfig;
  stoppingRules: StoppingRule[];
  rollbackTriggers: RollbackTrigger[];
  notifications: NotificationConfig;
  schedule: ScheduleConfig;
}

export interface MonitoringConfig {
  enabled: boolean;
  metrics: string[];
  frequency: number; // minutes
  thresholds: Record<string, ThresholdConfig>;
  healthChecks: HealthCheck[];
}

export interface ThresholdConfig {
  type: 'absolute' | 'relative' | 'statistical';
  value: number;
  operator: 'greater_than' | 'less_than' | 'equals';
  action: 'alert' | 'pause' | 'stop' | 'rollback';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface HealthCheck {
  name: string;
  type: 'error_rate' | 'response_time' | 'conversion_rate' | 'sample_size';
  threshold: number;
  operator: 'greater_than' | 'less_than';
  action: 'alert' | 'pause' | 'stop' | 'rollback';
}

export interface RolloutConfig {
  enabled: boolean;
  strategy: 'gradual' | 'linear' | 'exponential';
  steps: RolloutStep[];
  autoProgress: boolean;
  healthThresholds: Record<string, number>;
}

export interface RolloutStep {
  percentage: number;
  duration: number; // hours
  conditions: Record<string, any>;
  autoProceed: boolean;
}

export interface StoppingRule {
  id: string;
  name: string;
  type: 'statistical' | 'business' | 'technical' | 'time';
  conditions: Record<string, any>;
  action: 'stop' | 'pause' | 'continue';
  priority: number;
}

export interface RollbackTrigger {
  id: string;
  name: string;
  type: 'error_rate' | 'performance' | 'conversion' | 'manual';
  conditions: Record<string, any>;
  action: 'immediate' | 'gradual';
  timeout: number; // minutes
}

export interface NotificationConfig {
  enabled: boolean;
  channels: ('email' | 'slack' | 'webhook' | 'in_app')[];
  events: ('started' | 'paused' | 'stopped' | 'completed' | 'rolled_back' | 'milestone_reached')[];
  recipients: string[];
  templates: Record<string, string>;
}

export interface ScheduleConfig {
  enabled: boolean;
  startTime?: Date;
  endTime?: Date;
  timezone: string;
  businessHoursOnly: boolean;
  excludeDates: Date[];
}

export interface LifecycleEvent {
  id: string;
  experimentId: string;
  type: 'started' | 'paused' | 'stopped' | 'completed' | 'rolled_back' | 'milestone_reached' | 'alert';
  timestamp: Date;
  data: Record<string, any>;
  triggeredBy: 'system' | 'user' | 'schedule';
  metadata: Record<string, any>;
}

export interface LifecycleState {
  experimentId: string;
  currentStep: number;
  totalSteps: number;
  status: ExperimentStatus;
  health: 'healthy' | 'warning' | 'critical';
  metrics: Record<string, number>;
  lastCheck: Date;
  nextCheck: Date;
  alerts: LifecycleAlert[];
  history: LifecycleEvent[];
}

export interface LifecycleAlert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  actionRequired: boolean;
  metadata: Record<string, any>;
}

export class ExperimentLifecycleService {
  private configs: Map<string, LifecycleConfig> = new Map();
  private states: Map<string, LifecycleState> = new Map();
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;
  private checkInterval = 60000; // 1 minute

  constructor() {
    this.startLifecycleManager();
  }

  /**
   * Create lifecycle configuration for an experiment
   */
  async createLifecycleConfig(
    experimentId: string,
    config: Omit<LifecycleConfig, 'id' | 'experimentId'>
  ): Promise<LifecycleConfig> {
    const lifecycleConfig: LifecycleConfig = {
      ...config,
      id: this.generateConfigId(),
      experimentId
    };

    // Store the configuration
    this.configs.set(lifecycleConfig.id, lifecycleConfig);

    // Initialize state
    await this.initializeLifecycleState(experimentId, lifecycleConfig);

    console.log(`🔄 [LIFECYCLE] Created lifecycle config for experiment ${experimentId}`);
    return lifecycleConfig;
  }

  /**
   * Get lifecycle configuration for an experiment
   */
  getLifecycleConfig(experimentId: string): LifecycleConfig | null {
    for (const config of this.configs.values()) {
      if (config.experimentId === experimentId) {
        return config;
      }
    }
    return null;
  }

  /**
   * Update lifecycle configuration
   */
  async updateLifecycleConfig(
    configId: string,
    updates: Partial<LifecycleConfig>
  ): Promise<LifecycleConfig> {
    const config = this.configs.get(configId);
    if (!config) {
      throw new Error(`Lifecycle config with ID ${configId} not found`);
    }

    const updatedConfig = { ...config, ...updates };
    this.configs.set(configId, updatedConfig);

    // Restart monitoring if needed
    if (updates.monitoringConfig) {
      this.restartMonitoring(config.experimentId);
    }

    console.log(`🔄 [LIFECYCLE] Updated lifecycle config for experiment ${config.experimentId}`);
    return updatedConfig;
  }

  /**
   * Start automated lifecycle management for an experiment
   */
  async startExperiment(experimentId: string, triggeredBy: 'system' | 'user' = 'user'): Promise<void> {
    const config = this.getLifecycleConfig(experimentId);
    if (!config) {
      throw new Error(`No lifecycle config found for experiment ${experimentId}`);
    }

    const experiment = abTestingService.getExperiment(experimentId);
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    // Check if scheduled start time is configured
    if (config.schedule.enabled && config.schedule.startTime) {
      const now = new Date();
      if (now < config.schedule.startTime) {
        // Schedule the start
        setTimeout(() => {
          this.startExperiment(experimentId, 'system');
        }, config.schedule.startTime.getTime() - now.getTime());
        
        await this.logLifecycleEvent(experimentId, 'scheduled_start', {
          scheduledTime: config.schedule.startTime,
          triggeredBy
        });
        return;
      }
    }

    // Check business hours if configured
    if (config.schedule.businessHoursOnly && !this.isBusinessHours(config.schedule.timezone)) {
      // Schedule for next business hours
      const nextBusinessHours = this.getNextBusinessHours(config.schedule.timezone);
      setTimeout(() => {
        this.startExperiment(experimentId, 'system');
      }, nextBusinessHours.getTime() - Date.now());
      
      await this.logLifecycleEvent(experimentId, 'scheduled_start', {
        scheduledTime: nextBusinessHours,
        reason: 'business_hours',
        triggeredBy
      });
      return;
    }

    try {
      // Start the experiment
      await abTestingService.startExperiment(experimentId, 'lifecycle_service');

      // Update state
      const state = this.states.get(experimentId);
      if (state) {
        state.status = 'running';
        state.currentStep = 0;
        state.lastCheck = new Date();
        state.nextCheck = new Date(Date.now() + config.monitoringConfig.frequency * 60000);
      }

      // Start monitoring
      this.startMonitoring(experimentId);

      // Start rollout if configured
      if (config.autoRollout && config.rolloutConfig.enabled) {
        await this.startRollout(experimentId, config);
      }

      // Send notification
      await this.sendNotification(experimentId, 'started', {
        experimentName: experiment.name,
        triggeredBy
      });

      // Log event
      await this.logLifecycleEvent(experimentId, 'started', { triggeredBy });

      console.log(`🔄 [LIFECYCLE] Started experiment ${experimentId}`);
    } catch (error) {
      console.error(`🔄 [LIFECYCLE] Failed to start experiment ${experimentId}:`, error);
      await this.logLifecycleEvent(experimentId, 'start_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        triggeredBy
      });
    }
  }

  /**
   * Pause an experiment
   */
  async pauseExperiment(experimentId: string, reason: string, triggeredBy: 'system' | 'user' = 'user'): Promise<void> {
    const config = this.getLifecycleConfig(experimentId);
    if (!config) {
      throw new Error(`No lifecycle config found for experiment ${experimentId}`);
    }

    try {
      // Pause the experiment
      await abTestingService.pauseExperiment(experimentId, 'lifecycle_service', reason);

      // Update state
      const state = this.states.get(experimentId);
      if (state) {
        state.status = 'paused';
      }

      // Stop monitoring
      this.stopMonitoring(experimentId);

      // Send notification
      await this.sendNotification(experimentId, 'paused', {
        reason,
        triggeredBy
      });

      // Log event
      await this.logLifecycleEvent(experimentId, 'paused', { reason, triggeredBy });

      console.log(`🔄 [LIFECYCLE] Paused experiment ${experimentId}: ${reason}`);
    } catch (error) {
      console.error(`🔄 [LIFECYCLE] Failed to pause experiment ${experimentId}:`, error);
    }
  }

  /**
   * Stop an experiment
   */
  async stopExperiment(experimentId: string, reason: string, triggeredBy: 'system' | 'user' = 'user'): Promise<void> {
    const config = this.getLifecycleConfig(experimentId);
    if (!config) {
      throw new Error(`No lifecycle config found for experiment ${experimentId}`);
    }

    try {
      // Stop the experiment
      await abTestingService.completeExperiment(experimentId, 'lifecycle_service');

      // Update state
      const state = this.states.get(experimentId);
      if (state) {
        state.status = 'completed';
      }

      // Stop monitoring
      this.stopMonitoring(experimentId);

      // Generate final report
      const analytics = await abTestingAnalytics.analyzeExperiment(experimentId);
      const report = await abTestingAnalytics.generateExperimentReport(experimentId);

      // Send notification
      await this.sendNotification(experimentId, 'completed', {
        reason,
        triggeredBy,
        winner: analytics.statisticalAnalysis.winner?.variantName,
        confidence: analytics.statisticalAnalysis.winner?.confidence
      });

      // Log event
      await this.logLifecycleEvent(experimentId, 'completed', {
        reason,
        triggeredBy,
        report: report.executiveSummary
      });

      console.log(`🔄 [LIFECYCLE] Stopped experiment ${experimentId}: ${reason}`);
    } catch (error) {
      console.error(`🔄 [LIFECYCLE] Failed to stop experiment ${experimentId}:`, error);
    }
  }

  /**
   * Rollback an experiment
   */
  async rollbackExperiment(experimentId: string, reason: string, triggeredBy: 'system' | 'user' = 'user'): Promise<void> {
    const config = this.getLifecycleConfig(experimentId);
    if (!config) {
      throw new Error(`No lifecycle config found for experiment ${experimentId}`);
    }

    try {
      // Disable the feature flag
      const experiment = abTestingService.getExperiment(experimentId);
      if (experiment) {
        await featureFlagService.updateFlag(
          experiment.flagId,
          { enabled: false, rolloutPercentage: 0 },
          'lifecycle_service',
          `Rollback: ${reason}`
        );
      }

      // Update state
      const state = this.states.get(experimentId);
      if (state) {
        state.status = 'failed';
        state.health = 'critical';
      }

      // Stop monitoring
      this.stopMonitoring(experimentId);

      // Send notification
      await this.sendNotification(experimentId, 'rolled_back', {
        reason,
        triggeredBy,
        severity: 'critical'
      });

      // Log event
      await this.logLifecycleEvent(experimentId, 'rolled_back', { reason, triggeredBy });

      console.log(`🔄 [LIFECYCLE] Rolled back experiment ${experimentId}: ${reason}`);
    } catch (error) {
      console.error(`🔄 [LIFECYCLE] Failed to rollback experiment ${experimentId}:`, error);
    }
  }

  /**
   * Get lifecycle state for an experiment
   */
  getLifecycleState(experimentId: string): LifecycleState | null {
    return this.states.get(experimentId) || null;
  }

  /**
   * Get all lifecycle states
   */
  getAllLifecycleStates(): LifecycleState[] {
    return Array.from(this.states.values());
  }

  /**
   * Get lifecycle events for an experiment
   */
  getLifecycleEvents(experimentId: string, limit: number = 50): LifecycleEvent[] {
    const state = this.states.get(experimentId);
    if (!state) {
      return [];
    }

    return state.history
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(experimentId: string, alertId: string): Promise<void> {
    const state = this.states.get(experimentId);
    if (!state) {
      throw new Error(`No lifecycle state found for experiment ${experimentId}`);
    }

    const alert = state.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      await this.logLifecycleEvent(experimentId, 'alert_acknowledged', {
        alertId,
        alertType: alert.type,
        message: alert.message
      });
    }
  }

  /**
   * Initialize lifecycle state for an experiment
   */
  private async initializeLifecycleState(experimentId: string, config: LifecycleConfig): Promise<void> {
    const state: LifecycleState = {
      experimentId,
      currentStep: 0,
      totalSteps: config.rolloutConfig.steps.length,
      status: 'draft',
      health: 'healthy',
      metrics: {},
      lastCheck: new Date(),
      nextCheck: new Date(),
      alerts: [],
      history: []
    };

    this.states.set(experimentId, state);
  }

  /**
   * Start the lifecycle manager
   */
  private startLifecycleManager(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    setInterval(() => {
      this.checkAllExperiments();
    }, this.checkInterval);

    console.log('🔄 [LIFECYCLE] Started automated lifecycle manager');
  }

  /**
   * Check all experiments for lifecycle actions
   */
  private async checkAllExperiments(): Promise<void> {
    for (const [experimentId, config] of this.configs) {
      await this.checkExperiment(experimentId, config);
    }
  }

  /**
   * Check a single experiment for lifecycle actions
   */
  private async checkExperiment(experimentId: string, config: LifecycleConfig): Promise<void> {
    const state = this.states.get(experimentId);
    if (!state) return;

    const experiment = abTestingService.getExperiment(experimentId);
    if (!experiment) return;

    // Update state status from experiment
    state.status = experiment.status;

    // Skip checks for non-running experiments
    if (experiment.status !== 'running') {
      return;
    }

    try {
      // Get current metrics
      const analytics = await abTestingAnalytics.analyzeExperiment(experimentId);
      state.metrics = {
        conversionRate: analytics.metrics.overallMetrics.overallConversionRate,
        participants: analytics.metrics.overallMetrics.totalParticipants,
        revenue: analytics.businessImpact.revenueImpact
      };

      // Check health
      await this.checkExperimentHealth(experimentId, config, analytics);

      // Check stopping rules
      await this.checkStoppingRules(experimentId, config, analytics);

      // Check rollback triggers
      await this.checkRollbackTriggers(experimentId, config, analytics);

      // Check rollout progress
      if (config.autoRollout && config.rolloutConfig.enabled) {
        await this.checkRolloutProgress(experimentId, config);
      }

      // Update check timestamps
      state.lastCheck = new Date();
      state.nextCheck = new Date(Date.now() + config.monitoringConfig.frequency * 60000);

    } catch (error) {
      console.error(`🔄 [LIFECYCLE] Error checking experiment ${experimentId}:`, error);
    }
  }

  /**
   * Check experiment health
   */
  private async checkExperimentHealth(
    experimentId: string,
    config: LifecycleConfig,
    analytics: ExperimentAnalytics
  ): Promise<void> {
    const state = this.states.get(experimentId);
    if (!state) return;

    let healthScore = 100;
    const alerts: LifecycleAlert[] = [];

    // Check health checks
    for (const healthCheck of config.monitoringConfig.healthChecks) {
      let value = 0;
      
      switch (healthCheck.type) {
        case 'error_rate':
          value = analytics.metrics.primaryMetrics.errorRate?.variants?.control || 0;
          break;
        case 'response_time':
          value = analytics.metrics.primaryMetrics.responseTime?.variants?.control || 0;
          break;
        case 'conversion_rate':
          value = analytics.metrics.overallMetrics.overallConversionRate;
          break;
        case 'sample_size':
          value = analytics.metrics.overallMetrics.totalParticipants;
          break;
      }

      const threshold = healthCheck.threshold;
      const isHealthy = healthCheck.operator === 'greater_than' ? value > threshold : value < threshold;

      if (!isHealthy) {
        healthScore -= 20;
        alerts.push({
          id: this.generateAlertId(),
          type: healthCheck.type === 'error_rate' ? 'critical' : 'warning',
          message: `${healthCheck.name}: ${value} (threshold: ${threshold})`,
          timestamp: new Date(),
          acknowledged: false,
          actionRequired: healthCheck.action !== 'alert',
          metadata: { type: healthCheck.type, value, threshold }
        });
      }
    }

    // Update health status
    if (healthScore >= 80) {
      state.health = 'healthy';
    } else if (healthScore >= 50) {
      state.health = 'warning';
    } else {
      state.health = 'critical';
    }

    // Add new alerts
    state.alerts.push(...alerts);

    // Handle critical health
    if (state.health === 'critical' && config.autoRollback) {
      await this.rollbackExperiment(experimentId, 'Critical health issues detected', 'system');
    }
  }

  /**
   * Check stopping rules
   */
  private async checkStoppingRules(
    experimentId: string,
    config: LifecycleConfig,
    analytics: ExperimentAnalytics
  ): Promise<void> {
    const sortedRules = config.stoppingRules.sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      if (await this.evaluateStoppingRule(rule, analytics)) {
        switch (rule.action) {
          case 'stop':
            await this.stopExperiment(experimentId, `Stopping rule triggered: ${rule.name}`, 'system');
            break;
          case 'pause':
            await this.pauseExperiment(experimentId, `Stopping rule triggered: ${rule.name}`, 'system');
            break;
          case 'continue':
            // Continue monitoring
            break;
        }
        break; // Only execute the highest priority rule
      }
    }
  }

  /**
   * Check rollback triggers
   */
  private async checkRollbackTriggers(
    experimentId: string,
    config: LifecycleConfig,
    analytics: ExperimentAnalytics
  ): Promise<void> {
    for (const trigger of config.rollbackTriggers) {
      if (await this.evaluateRollbackTrigger(trigger, analytics)) {
        await this.rollbackExperiment(experimentId, `Rollback trigger activated: ${trigger.name}`, 'system');
        break;
      }
    }
  }

  /**
   * Check rollout progress
   */
  private async checkRolloutProgress(experimentId: string, config: LifecycleConfig): Promise<void> {
    const state = this.states.get(experimentId);
    if (!state || state.currentStep >= config.rolloutConfig.steps.length) {
      return;
    }

    const currentStep = config.rolloutConfig.steps[state.currentStep];
    const stepStartTime = state.history.find(e => e.type === 'rollout_step_started')?.timestamp;

    if (!stepStartTime) {
      return;
    }

    const stepDuration = Date.now() - stepStartTime.getTime();
    const stepDurationHours = stepDuration / (1000 * 60 * 60);

    // Check if step duration has passed
    if (stepDurationHours >= currentStep.duration) {
      // Check if conditions are met
      const conditionsMet = await this.evaluateRolloutConditions(experimentId, currentStep.conditions);

      if (conditionsMet || !currentStep.autoProceed) {
        // Move to next step
        await this.proceedToNextRolloutStep(experimentId, config);
      }
    }
  }

  /**
   * Start monitoring for an experiment
   */
  private startMonitoring(experimentId: string): void {
    const config = this.getLifecycleConfig(experimentId);
    if (!config || !config.monitoringConfig.enabled) {
      return;
    }

    // Clear existing interval
    this.stopMonitoring(experimentId);

    // Start new interval
    const interval = setInterval(() => {
      this.checkExperiment(experimentId, config);
    }, config.monitoringConfig.frequency * 60000);

    this.monitoringIntervals.set(experimentId, interval);
  }

  /**
   * Stop monitoring for an experiment
   */
  private stopMonitoring(experimentId: string): void {
    const interval = this.monitoringIntervals.get(experimentId);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(experimentId);
    }
  }

  /**
   * Restart monitoring for an experiment
   */
  private restartMonitoring(experimentId: string): void {
    this.stopMonitoring(experimentId);
    const config = this.getLifecycleConfig(experimentId);
    if (config) {
      this.startMonitoring(experimentId);
    }
  }

  /**
   * Start rollout for an experiment
   */
  private async startRollout(experimentId: string, config: LifecycleConfig): Promise<void> {
    if (config.rolloutConfig.steps.length === 0) {
      return;
    }

    const firstStep = config.rolloutConfig.steps[0];
    await this.executeRolloutStep(experimentId, firstStep, 0);
  }

  /**
   * Execute a rollout step
   */
  private async executeRolloutStep(
    experimentId: string,
    step: RolloutStep,
    stepIndex: number
  ): Promise<void> {
    const experiment = abTestingService.getExperiment(experimentId);
    if (!experiment) {
      return;
    }

    // Update feature flag rollout percentage
    await featureFlagService.updateFlag(
      experiment.flagId,
      { rolloutPercentage: step.percentage },
      'lifecycle_service',
      `Rollout step ${stepIndex + 1}: ${step.percentage}%`
    );

    // Update state
    const state = this.states.get(experimentId);
    if (state) {
      state.currentStep = stepIndex;
    }

    // Log event
    await this.logLifecycleEvent(experimentId, 'rollout_step_started', {
      step: stepIndex + 1,
      percentage: step.percentage,
      duration: step.duration
    });

    // Send notification
    await this.sendNotification(experimentId, 'milestone_reached', {
      milestone: `Rollout step ${stepIndex + 1}`,
      percentage: step.percentage
    });
  }

  /**
   * Proceed to next rollout step
   */
  private async proceedToNextRolloutStep(experimentId: string, config: LifecycleConfig): Promise<void> {
    const state = this.states.get(experimentId);
    if (!state) {
      return;
    }

    const nextStepIndex = state.currentStep + 1;
    if (nextStepIndex >= config.rolloutConfig.steps.length) {
      // Rollout complete
      await this.logLifecycleEvent(experimentId, 'rollout_completed', {
        totalSteps: config.rolloutConfig.steps.length
      });
      return;
    }

    const nextStep = config.rolloutConfig.steps[nextStepIndex];
    await this.executeRolloutStep(experimentId, nextStep, nextStepIndex);
  }

  /**
   * Evaluate stopping rule
   */
  private async evaluateStoppingRule(rule: StoppingRule, analytics: ExperimentAnalytics): Promise<boolean> {
    switch (rule.type) {
      case 'statistical':
        return analytics.statisticalAnalysis.winner !== null;
      case 'business':
        return analytics.businessImpact.roi > (rule.conditions.roi || 0);
      case 'technical':
        return analytics.metrics.overallMetrics.totalParticipants >= (rule.conditions.sampleSize || 0);
      case 'time':
        const duration = Date.now() - analytics.experiment.startDate!.getTime();
        const maxDuration = rule.conditions.maxDays * 24 * 60 * 60 * 1000;
        return duration >= maxDuration;
      default:
        return false;
    }
  }

  /**
   * Evaluate rollback trigger
   */
  private async evaluateRollbackTrigger(trigger: RollbackTrigger, analytics: ExperimentAnalytics): Promise<boolean> {
    switch (trigger.type) {
      case 'error_rate':
        return analytics.metrics.overallMetrics.totalParticipants > 0 && 
               (analytics.metrics.primaryMetrics.errorRate?.variants?.control || 0) > (trigger.conditions.threshold || 0.1);
      case 'performance':
        return (analytics.metrics.primaryMetrics.responseTime?.variants?.control || 0) > (trigger.conditions.threshold || 5000);
      case 'conversion':
        return analytics.metrics.overallMetrics.overallConversionRate < (trigger.conditions.threshold || 0.01);
      case 'manual':
        return trigger.conditions.triggered === true;
      default:
        return false;
    }
  }

  /**
   * Evaluate rollout conditions
   */
  private async evaluateRolloutConditions(experimentId: string, conditions: Record<string, any>): Promise<boolean> {
    // Get current analytics
    const analytics = await abTestingAnalytics.analyzeExperiment(experimentId);
    
    // Check each condition
    for (const [key, value] of Object.entries(conditions)) {
      switch (key) {
        case 'minConversionRate':
          if (analytics.metrics.overallMetrics.overallConversionRate < value) {
            return false;
          }
          break;
        case 'maxErrorRate':
          if ((analytics.metrics.primaryMetrics.errorRate?.variants?.control || 0) > value) {
            return false;
          }
          break;
        case 'minParticipants':
          if (analytics.metrics.overallMetrics.totalParticipants < value) {
            return false;
          }
          break;
        case 'statisticalSignificance':
          if (!analytics.statisticalAnalysis.winner || analytics.statisticalAnalysis.winner.confidence < value) {
            return false;
          }
          break;
      }
    }

    return true;
  }

  /**
   * Check if current time is within business hours
   */
  private isBusinessHours(timezone: string): boolean {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false
    };
    const hour = parseInt(now.toLocaleTimeString('en-US', options));
    
    // Business hours: 9 AM - 5 PM, Monday - Friday
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
    return hour >= 9 && hour <= 17 && dayOfWeek >= 1 && dayOfWeek <= 5;
  }

  /**
   * Get next business hours
   */
  private getNextBusinessHours(timezone: string): Date {
    const now = new Date();
    const nextBusinessHours = new Date(now);
    
    // If it's Friday after business hours, skip to Monday
    const dayOfWeek = now.getDay();
    if (dayOfWeek === 5 && now.getHours() > 17) {
      nextBusinessHours.setDate(now.getDate() + 3);
      nextBusinessHours.setHours(9, 0, 0, 0);
    } else if (dayOfWeek === 6) {
      nextBusinessHours.setDate(now.getDate() + 2);
      nextBusinessHours.setHours(9, 0, 0, 0);
    } else if (dayOfWeek === 0) {
      nextBusinessHours.setDate(now.getDate() + 1);
      nextBusinessHours.setHours(9, 0, 0, 0);
    } else if (now.getHours() > 17) {
      nextBusinessHours.setDate(now.getDate() + 1);
      nextBusinessHours.setHours(9, 0, 0, 0);
    } else if (now.getHours() < 9) {
      nextBusinessHours.setHours(9, 0, 0, 0);
    }

    return nextBusinessHours;
  }

  /**
   * Send notification
   */
  private async sendNotification(
    experimentId: string,
    event: LifecycleEvent['type'],
    data: Record<string, any>
  ): Promise<void> {
    const config = this.getLifecycleConfig(experimentId);
    if (!config || !config.notifications.enabled || !config.notifications.events.includes(event)) {
      return;
    }

    // Log notification (in production, would send to actual channels)
    console.log(`🔔 [LIFECYCLE] Notification for experiment ${experimentId}: ${event}`, data);
  }

  /**
   * Log lifecycle event
   */
  private async logLifecycleEvent(
    experimentId: string,
    type: LifecycleEvent['type'],
    data: Record<string, any>
  ): Promise<void> {
    const state = this.states.get(experimentId);
    if (!state) {
      return;
    }

    const event: LifecycleEvent = {
      id: this.generateEventId(),
      experimentId,
      type,
      timestamp: new Date(),
      data,
      triggeredBy: 'system',
      metadata: {}
    };

    state.history.push(event);

    // Keep only last 100 events
    if (state.history.length > 100) {
      state.history = state.history.slice(-100);
    }

    // Log to audit service
    await featureFlagAuditLog.logFlagChange({
      flagId: experimentId,
      flagKey: experimentId,
      action: type.toUpperCase() as any,
      oldValue: null,
      newValue: data,
      performedBy: 'lifecycle_service',
      reason: `Lifecycle event: ${type}`
    });
  }

  /**
   * Generate unique IDs
   */
  private generateConfigId(): string {
    return `lifecycle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const experimentLifecycleService = new ExperimentLifecycleService();

// Export utility functions
export async function createLifecycleConfig(
  experimentId: string,
  config: Omit<LifecycleConfig, 'id' | 'experimentId'>
): Promise<LifecycleConfig> {
  return experimentLifecycleService.createLifecycleConfig(experimentId, config);
}

export async function startExperimentLifecycle(experimentId: string): Promise<void> {
  return experimentLifecycleService.startExperiment(experimentId);
}

export async function pauseExperimentLifecycle(
  experimentId: string,
  reason: string
): Promise<void> {
  return experimentLifecycleService.pauseExperiment(experimentId, reason);
}

export async function stopExperimentLifecycle(
  experimentId: string,
  reason: string
): Promise<void> {
  return experimentLifecycleService.stopExperiment(experimentId, reason);
}

export async function rollbackExperimentLifecycle(
  experimentId: string,
  reason: string
): Promise<void> {
  return experimentLifecycleService.rollbackExperiment(experimentId, reason);
}

export function getLifecycleState(experimentId: string): LifecycleState | null {
  return experimentLifecycleService.getLifecycleState(experimentId);
}

export function getAllLifecycleStates(): LifecycleState[] {
  return experimentLifecycleService.getAllLifecycleStates();
}

export async function acknowledgeLifecycleAlert(
  experimentId: string,
  alertId: string
): Promise<void> {
  return experimentLifecycleService.acknowledgeAlert(experimentId, alertId);
}