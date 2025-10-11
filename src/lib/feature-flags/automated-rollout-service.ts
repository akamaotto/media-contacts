/**
 * Automated Rollout Strategy Service
 * Provides intelligent rollout strategies based on metrics and health indicators
 */

import { featureFlagDb } from './feature-flag-db';
import { featureFlagAuditLog } from './audit-log-service';
import { type FeatureFlag } from './feature-flag-service';

export interface RolloutStrategy {
  id: string;
  name: string;
  description: string;
  steps: number[];
  intervalMinutes: number;
  autoAdjust: boolean;
  healthThresholds: HealthThresholds;
  criteria: RolloutCriteria;
}

export interface HealthThresholds {
  errorRate: number;        // Maximum error rate percentage (e.g., 5%)
  responseTime: number;     // Maximum response time in ms (e.g., 2000ms)
  satisfactionScore: number; // Minimum satisfaction score (e.g., 70/100)
  cpuUsage: number;         // Maximum CPU usage percentage (e.g., 80%)
  memoryUsage: number;      // Maximum memory usage percentage (e.g., 85%)
}

export interface RolloutCriteria {
  minUsers: number;         // Minimum number of users before proceeding
  evaluationWindowMinutes: number; // Time window for evaluating metrics
  consecutiveHealthyChecks: number; // Number of consecutive healthy checks required
}

export interface RolloutPlan {
  id: string;
  flagId: string;
  flagKey: string;
  strategy: RolloutStrategy;
  currentStep: number;
  status: 'pending' | 'in_progress' | 'paused' | 'completed' | 'failed' | 'rolled_back';
  startTime?: Date;
  endTime?: Date;
  nextStepTime?: Date;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RolloutMetrics {
  flagId: string;
  timestamp: Date;
  errorRate: number;
  avgResponseTime: number;
  satisfactionScore: number;
  cpuUsage: number;
  memoryUsage: number;
  totalEvaluations: number;
  enabledEvaluations: number;
  userCount: number;
}

export interface RolloutDecision {
  proceed: boolean;
  reason: string;
  action: 'continue' | 'pause' | 'rollback' | 'adjust';
  adjustments?: Partial<RolloutStrategy>;
}

export class AutomatedRolloutService {
  private db = featureFlagDb;
  private auditLog = featureFlagAuditLog;
  private activeRollouts: Map<string, RolloutPlan> = new Map();
  private rolloutTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Predefined rollout strategies
   */
  private readonly predefinedStrategies: Record<string, RolloutStrategy> = {
    conservative: {
      id: 'conservative',
      name: 'Conservative',
      description: 'Slow, careful rollout with small steps and frequent health checks',
      steps: [1, 5, 10, 25, 50, 100],
      intervalMinutes: 60,
      autoAdjust: true,
      healthThresholds: {
        errorRate: 2,
        responseTime: 1000,
        satisfactionScore: 80,
        cpuUsage: 70,
        memoryUsage: 75
      },
      criteria: {
        minUsers: 50,
        evaluationWindowMinutes: 30,
        consecutiveHealthyChecks: 3
      }
    },
    standard: {
      id: 'standard',
      name: 'Standard',
      description: 'Balanced rollout with moderate steps and health checks',
      steps: [5, 10, 25, 50, 100],
      intervalMinutes: 30,
      autoAdjust: true,
      healthThresholds: {
        errorRate: 5,
        responseTime: 2000,
        satisfactionScore: 70,
        cpuUsage: 80,
        memoryUsage: 85
      },
      criteria: {
        minUsers: 20,
        evaluationWindowMinutes: 15,
        consecutiveHealthyChecks: 2
      }
    },
    aggressive: {
      id: 'aggressive',
      name: 'Aggressive',
      description: 'Fast rollout with larger steps and minimal health checks',
      steps: [10, 25, 50, 100],
      intervalMinutes: 15,
      autoAdjust: false,
      healthThresholds: {
        errorRate: 10,
        responseTime: 3000,
        satisfactionScore: 60,
        cpuUsage: 90,
        memoryUsage: 90
      },
      criteria: {
        minUsers: 10,
        evaluationWindowMinutes: 10,
        consecutiveHealthyChecks: 1
      }
    }
  };

  /**
   * Get all predefined strategies
   */
  getPredefinedStrategies(): RolloutStrategy[] {
    return Object.values(this.predefinedStrategies);
  }

  /**
   * Get a predefined strategy by ID
   */
  getPredefinedStrategy(strategyId: string): RolloutStrategy | null {
    return this.predefinedStrategies[strategyId] || null;
  }

  /**
   * Create a custom rollout strategy
   */
  async createCustomStrategy(strategy: Omit<RolloutStrategy, 'id'>): Promise<RolloutStrategy> {
    const customStrategy: RolloutStrategy = {
      ...strategy,
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    // In a real implementation, save to database
    console.log(`🚀 [AUTOMATED-ROLLOUT] Created custom strategy: ${customStrategy.id}`);
    
    return customStrategy;
  }

  /**
   * Start an automated rollout plan
   */
  async startRolloutPlan(
    flagId: string,
    strategyId: string,
    createdById: string
  ): Promise<RolloutPlan> {
    const flag = await this.db.getFlagById(flagId);
    if (!flag) {
      throw new Error(`Feature flag with ID ${flagId} not found`);
    }

    const strategy = this.getPredefinedStrategy(strategyId);
    if (!strategy) {
      throw new Error(`Rollout strategy with ID ${strategyId} not found`);
    }

    // Create rollout plan
    const rolloutPlan: RolloutPlan = {
      id: `rollout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      flagId,
      flagKey: flag.id,
      strategy,
      currentStep: 0,
      status: 'pending',
      createdById,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Save to database
    await this.db.createRollout(
      flagId,
      flag.id,
      strategy.steps[strategy.steps.length - 1],
      'AUTOMATED',
      strategy.steps[0],
      strategy.intervalMinutes,
      strategy.autoAdjust,
      strategy.healthThresholds,
      createdById
    );

    // Track in memory
    this.activeRollouts.set(rolloutPlan.id, rolloutPlan);

    // Log to audit
    await this.auditLog.logFlagChange({
      flagId,
      flagKey: flag.id,
      action: 'GRADUAL_ROLLOUT_STARTED',
      oldValue: flag,
      newValue: { ...flag, rolloutPercentage: 0 },
      performedBy: createdById,
      reason: `Started automated rollout with strategy: ${strategy.name}`
    });

    // Start the rollout
    this.executeRolloutStep(rolloutPlan);

    console.log(`🚀 [AUTOMATED-ROLLOUT] Started rollout plan ${rolloutPlan.id} for flag ${flag.id}`);
    
    return rolloutPlan;
  }

  /**
   * Execute a rollout step
   */
  private async executeRolloutStep(plan: RolloutPlan): Promise<void> {
    try {
      // Update plan status
      plan.status = 'in_progress';
      plan.startTime = plan.startTime || new Date();
      plan.updatedAt = new Date();

      const currentPercentage = plan.strategy.steps[plan.currentStep];
      
      // Update flag rollout percentage
      await this.db.updateFlag(plan.flagId, {
        rolloutPercentage: currentPercentage
      }, 'automated_rollout', `Automated rollout step ${plan.currentStep + 1}: ${currentPercentage}%`);

      // Get the updated flag for logging
      const flag = await this.db.getFlagById(plan.flagId);
      
      if (flag) {
        // Log to audit
        await this.auditLog.logFlagChange({
          flagId: plan.flagId,
          flagKey: plan.flagKey,
          action: 'ROLLOUT_UPDATED',
          oldValue: { ...flag, rolloutPercentage: plan.strategy.steps[plan.currentStep - 1] || 0 },
          newValue: { ...flag, rolloutPercentage: currentPercentage },
          performedBy: 'automated_rollout',
          reason: `Automated rollout step ${plan.currentStep + 1}: ${currentPercentage}%`
        });
      }

      console.log(`🚀 [AUTOMATED-ROLLOUT] Executed step ${plan.currentStep + 1} for plan ${plan.id}: ${currentPercentage}%`);

      // Schedule next step or completion
      if (plan.currentStep < plan.strategy.steps.length - 1) {
        // Schedule next step
        plan.nextStepTime = new Date(Date.now() + plan.strategy.intervalMinutes * 60 * 1000);
        
        const timer = setTimeout(async () => {
          await this.evaluateAndProceed(plan);
        }, plan.strategy.intervalMinutes * 60 * 1000);
        
        this.rolloutTimers.set(plan.id, timer);
      } else {
        // Rollout completed
        await this.completeRolloutPlan(plan);
      }
    } catch (error) {
      console.error(`🚀 [AUTOMATED-ROLLOUT] Failed to execute step for plan ${plan.id}:`, error);
      await this.failRolloutPlan(plan, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Evaluate metrics and decide whether to proceed
   */
  private async evaluateAndProceed(plan: RolloutPlan): Promise<void> {
    try {
      // Get current metrics
      const metrics = await this.collectRolloutMetrics(plan.flagId);
      
      // Make rollout decision
      const decision = await this.makeRolloutDecision(plan, metrics);
      
      console.log(`🚀 [AUTOMATED-ROLLOUT] Rollout decision for plan ${plan.id}: ${decision.action} - ${decision.reason}`);
      
      switch (decision.action) {
        case 'continue':
          // Proceed to next step
          plan.currentStep++;
          await this.executeRolloutStep(plan);
          break;
          
        case 'pause':
          // Pause rollout
          plan.status = 'paused';
          plan.updatedAt = new Date();
          
          // Log to audit
          const flag = await this.db.getFlagById(plan.flagId);
          if (flag) {
            await this.auditLog.logFlagChange({
              flagId: plan.flagId,
              flagKey: plan.flagKey,
              action: 'GRADUAL_ROLLOUT_PAUSED',
              oldValue: flag,
              newValue: flag,
              performedBy: 'automated_rollout',
              reason: `Rollout paused: ${decision.reason}`
            });
          }
          break;
          
        case 'rollback':
          // Perform rollback
          await this.rollbackRolloutPlan(plan, decision.reason);
          break;
          
        case 'adjust':
          // Adjust strategy and continue
          if (decision.adjustments) {
            Object.assign(plan.strategy, decision.adjustments);
          }
          plan.currentStep++;
          await this.executeRolloutStep(plan);
          break;
      }
    } catch (error) {
      console.error(`🚀 [AUTOMATED-ROLLOUT] Failed to evaluate plan ${plan.id}:`, error);
      await this.failRolloutPlan(plan, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Make a rollout decision based on metrics
   */
  private async makeRolloutDecision(
    plan: RolloutPlan,
    metrics: RolloutMetrics
  ): Promise<RolloutDecision> {
    const { healthThresholds, criteria } = plan.strategy;
    
    // Check error rate
    if (metrics.errorRate > healthThresholds.errorRate) {
      return {
        proceed: false,
        reason: `Error rate (${metrics.errorRate}%) exceeds threshold (${healthThresholds.errorRate}%)`,
        action: metrics.errorRate > healthThresholds.errorRate * 2 ? 'rollback' : 'pause'
      };
    }
    
    // Check response time
    if (metrics.avgResponseTime > healthThresholds.responseTime) {
      return {
        proceed: false,
        reason: `Response time (${metrics.avgResponseTime}ms) exceeds threshold (${healthThresholds.responseTime}ms)`,
        action: 'pause'
      };
    }
    
    // Check satisfaction score
    if (metrics.satisfactionScore < healthThresholds.satisfactionScore) {
      return {
        proceed: false,
        reason: `Satisfaction score (${metrics.satisfactionScore}) below threshold (${healthThresholds.satisfactionScore})`,
        action: 'pause'
      };
    }
    
    // Check system resources
    if (metrics.cpuUsage > healthThresholds.cpuUsage || metrics.memoryUsage > healthThresholds.memoryUsage) {
      return {
        proceed: false,
        reason: `System resources (CPU: ${metrics.cpuUsage}%, Memory: ${metrics.memoryUsage}%) exceed thresholds`,
        action: 'pause'
      };
    }
    
    // Check minimum user count
    if (metrics.userCount < criteria.minUsers) {
      return {
        proceed: false,
        reason: `User count (${metrics.userCount}) below minimum (${criteria.minUsers})`,
        action: 'pause'
      };
    }
    
    // All checks passed - proceed with rollout
    return {
      proceed: true,
      reason: 'All health checks passed',
      action: 'continue'
    };
  }

  /**
   * Collect rollout metrics
   */
  private async collectRolloutMetrics(flagId: string): Promise<RolloutMetrics> {
    try {
      // Get flag stats
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 30 * 60 * 1000); // Last 30 minutes
      
      const stats = await this.db.getFlagStats(flagId, { start: startTime, end: endTime });
      
      // Get system metrics (in a real implementation, this would come from monitoring systems)
      const systemMetrics = await this.getSystemMetrics();
      
      return {
        flagId,
        timestamp: new Date(),
        errorRate: stats.totalEvaluations > 0 
          ? ((stats.totalEvaluations - stats.enabledEvaluations) / stats.totalEvaluations) * 100 
          : 0,
        avgResponseTime: 1500, // Mock data - would come from monitoring
        satisfactionScore: 85,  // Mock data - would come from user feedback
        cpuUsage: systemMetrics.cpuUsage,
        memoryUsage: systemMetrics.memoryUsage,
        totalEvaluations: stats.totalEvaluations,
        enabledEvaluations: stats.enabledEvaluations,
        userCount: 500 // Mock data - would come from analytics
      };
    } catch (error) {
      console.error(`🚀 [AUTOMATED-ROLLOUT] Failed to collect metrics for flag ${flagId}:`, error);
      
      // Return default metrics
      return {
        flagId,
        timestamp: new Date(),
        errorRate: 0,
        avgResponseTime: 0,
        satisfactionScore: 100,
        cpuUsage: 0,
        memoryUsage: 0,
        totalEvaluations: 0,
        enabledEvaluations: 0,
        userCount: 0
      };
    }
  }

  /**
   * Get system metrics (mock implementation)
   */
  private async getSystemMetrics(): Promise<{ cpuUsage: number; memoryUsage: number }> {
    // In a real implementation, this would query monitoring systems
    return {
      cpuUsage: Math.random() * 50, // 0-50%
      memoryUsage: Math.random() * 60  // 0-60%
    };
  }

  /**
   * Complete a rollout plan
   */
  private async completeRolloutPlan(plan: RolloutPlan): Promise<void> {
    plan.status = 'completed';
    plan.endTime = new Date();
    plan.updatedAt = new Date();
    
    // Clear timer
    const timer = this.rolloutTimers.get(plan.id);
    if (timer) {
      clearTimeout(timer);
      this.rolloutTimers.delete(plan.id);
    }
    
    // Log to audit
    const flag = await this.db.getFlagById(plan.flagId);
    if (flag) {
      await this.auditLog.logFlagChange({
        flagId: plan.flagId,
        flagKey: plan.flagKey,
        action: 'GRADUAL_ROLLOUT_COMPLETED',
        oldValue: null,
        newValue: flag,
        performedBy: 'automated_rollout',
        reason: `Automated rollout completed successfully`
      });
    }
    
    console.log(`🚀 [AUTOMATED-ROLLOUT] Completed rollout plan ${plan.id}`);
  }

  /**
   * Rollback a rollout plan
   */
  private async rollbackRolloutPlan(plan: RolloutPlan, reason: string): Promise<void> {
    plan.status = 'rolled_back';
    plan.endTime = new Date();
    plan.updatedAt = new Date();
    
    // Clear timer
    const timer = this.rolloutTimers.get(plan.id);
    if (timer) {
      clearTimeout(timer);
      this.rolloutTimers.delete(plan.id);
    }
    
    // Roll back flag to previous safe state
    const previousPercentage = plan.currentStep > 0 
      ? plan.strategy.steps[plan.currentStep - 1] 
      : 0;
    
    await this.db.updateFlag(plan.flagId, {
      rolloutPercentage: previousPercentage
    }, 'automated_rollout', `Automated rollback: ${reason}`);
    
    // Log to audit
    const flag = await this.db.getFlagById(plan.flagId);
    if (flag) {
      await this.auditLog.logFlagChange({
        flagId: plan.flagId,
        flagKey: plan.flagKey,
        action: 'EMERGENCY_ROLLBACK',
        oldValue: { ...flag, rolloutPercentage: plan.strategy.steps[plan.currentStep] },
        newValue: { ...flag, rolloutPercentage: previousPercentage },
        performedBy: 'automated_rollout',
        reason: `Automated rollback during rollout: ${reason}`
      });
    }
    
    console.log(`🚀 [AUTOMATED-ROLLOUT] Rolled back rollout plan ${plan.id}: ${reason}`);
  }

  /**
   * Fail a rollout plan
   */
  private async failRolloutPlan(plan: RolloutPlan, reason: string): Promise<void> {
    plan.status = 'failed';
    plan.endTime = new Date();
    plan.updatedAt = new Date();
    
    // Clear timer
    const timer = this.rolloutTimers.get(plan.id);
    if (timer) {
      clearTimeout(timer);
      this.rolloutTimers.delete(plan.id);
    }
    
    console.log(`🚀 [AUTOMATED-ROLLOUT] Failed rollout plan ${plan.id}: ${reason}`);
  }

  /**
   * Pause an active rollout plan
   */
  async pauseRolloutPlan(planId: string, reason: string): Promise<void> {
    const plan = this.activeRollouts.get(planId);
    if (!plan) {
      throw new Error(`Rollout plan ${planId} not found or not active`);
    }
    
    plan.status = 'paused';
    plan.updatedAt = new Date();
    
    // Clear timer
    const timer = this.rolloutTimers.get(planId);
    if (timer) {
      clearTimeout(timer);
      this.rolloutTimers.delete(planId);
    }
    
    // Log to audit
    const flag = await this.db.getFlagById(plan.flagId);
    if (flag) {
      await this.auditLog.logFlagChange({
        flagId: plan.flagId,
        flagKey: plan.flagKey,
        action: 'GRADUAL_ROLLOUT_PAUSED',
        oldValue: flag,
        newValue: flag,
        performedBy: 'manual',
        reason: `Manual pause: ${reason}`
      });
    }
    
    console.log(`🚀 [AUTOMATED-ROLLOUT] Paused rollout plan ${planId}: ${reason}`);
  }

  /**
   * Resume a paused rollout plan
   */
  async resumeRolloutPlan(planId: string): Promise<void> {
    const plan = this.activeRollouts.get(planId);
    if (!plan) {
      throw new Error(`Rollout plan ${planId} not found or not active`);
    }
    
    if (plan.status !== 'paused') {
      throw new Error(`Rollout plan ${planId} is not paused`);
    }
    
    plan.status = 'in_progress';
    plan.updatedAt = new Date();
    
    // Resume from current step
    await this.evaluateAndProceed(plan);
    
    console.log(`🚀 [AUTOMATED-ROLLOUT] Resumed rollout plan ${planId}`);
  }

  /**
   * Get all active rollout plans
   */
  getActiveRolloutPlans(): RolloutPlan[] {
    return Array.from(this.activeRollouts.values());
  }

  /**
   * Get a specific rollout plan
   */
  getRolloutPlan(planId: string): RolloutPlan | null {
    return this.activeRollouts.get(planId) || null;
  }

  /**
   * Cancel a rollout plan
   */
  async cancelRolloutPlan(planId: string, reason: string): Promise<void> {
    const plan = this.activeRollouts.get(planId);
    if (!plan) {
      throw new Error(`Rollout plan ${planId} not found or not active`);
    }
    
    // Clear timer
    const timer = this.rolloutTimers.get(planId);
    if (timer) {
      clearTimeout(timer);
      this.rolloutTimers.delete(planId);
    }
    
    // Remove from active rollouts
    this.activeRollouts.delete(planId);
    
    // Log to audit
    const flag = await this.db.getFlagById(plan.flagId);
    if (flag) {
      await this.auditLog.logFlagChange({
        flagId: plan.flagId,
        flagKey: plan.flagKey,
        action: 'GRADUAL_ROLLOUT_PAUSED',
        oldValue: flag,
        newValue: flag,
        performedBy: 'manual',
        reason: `Manual cancellation: ${reason}`
      });
    }
    
    console.log(`🚀 [AUTOMATED-ROLLOUT] Cancelled rollout plan ${planId}: ${reason}`);
  }
}

// Export singleton instance
export const automatedRolloutService = new AutomatedRolloutService();