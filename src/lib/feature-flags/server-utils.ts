/**
 * Server-side utilities for feature flags
 * Provides convenient functions for checking feature flags in API routes and server components
 */

import { headers } from 'next/headers';
import { featureFlagService, type FlagEvaluationContext } from './feature-flag-service';

/**
 * Check if a feature flag is enabled on the server side
 */
export async function isServerFeatureEnabled(
  flagName: string,
  context?: Partial<FlagEvaluationContext>
): Promise<boolean> {
  try {
    // Initialize the feature flag service if needed
    await featureFlagService.initialize();
    
    // Get request headers for context
    const headersList = headers();
    const userAgent = headersList.get('user-agent') || undefined;
    const xForwardedFor = headersList.get('x-forwarded-for');
    const ip = xForwardedFor ? xForwardedFor.split(',')[0].trim() : 
            headersList.get('x-real-ip') || 
            headersList.get('remote-addr') || 
            undefined;
    
    // Create evaluation context
    const evaluationContext: FlagEvaluationContext = {
      timestamp: new Date(),
      ip,
      userAgent,
      ...context
    };
    
    return await featureFlagService.isFlagEnabled(flagName, evaluationContext);
  } catch (error) {
    console.error(`Failed to check server feature flag ${flagName}:`, error);
    return false; // Default to disabled on error
  }
}

/**
 * Get all feature flags on the server side
 */
export async function getAllServerFeatureFlags(): Promise<any[]> {
  try {
    // Initialize the feature flag service if needed
    await featureFlagService.initialize();
    
    return await featureFlagService.getAllFlags();
  } catch (error) {
    console.error('Failed to get all server feature flags:', error);
    return [];
  }
}

/**
 * Get a specific feature flag on the server side
 */
export async function getServerFeatureFlag(flagId: string): Promise<any | null> {
  try {
    // Initialize the feature flag service if needed
    await featureFlagService.initialize();
    
    return await featureFlagService.getFlag(flagId);
  } catch (error) {
    console.error(`Failed to get server feature flag ${flagId}:`, error);
    return null;
  }
}

/**
 * Middleware to add feature flag context to requests
 */
export function withFeatureFlagContext(handler: Function) {
  return async (req: any, res: any) => {
    try {
      // Initialize the feature flag service if needed
      await featureFlagService.initialize();
      
      // Add feature flag context to request
      req.featureFlags = {
        isEnabled: (flagName: string, context?: Partial<FlagEvaluationContext>) => 
          featureFlagService.isFlagEnabled(flagName, {
            timestamp: new Date(),
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            ...context
          }),
        getAllFlags: () => featureFlagService.getAllFlags(),
        getFlag: (flagId: string) => featureFlagService.getFlag(flagId)
      };
      
      return handler(req, res);
    } catch (error) {
      console.error('Feature flag middleware error:', error);
      return handler(req, res);
    }
  };
}

/**
 * Higher-order function to wrap API route handlers with feature flag checks
 */
export function withFeatureFlag(
  flagName: string,
  options: {
    fallback?: (req: any, res: any) => any;
    context?: Partial<FlagEvaluationContext>;
  } = {}
) {
  return (handler: Function) => {
    return async (req: any, res: any) => {
      try {
        // Initialize the feature flag service if needed
        await featureFlagService.initialize();
        
        // Create evaluation context
        const evaluationContext: FlagEvaluationContext = {
          timestamp: new Date(),
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          ...options.context
        };
        
        // Check if feature flag is enabled
        const enabled = await featureFlagService.isFlagEnabled(flagName, evaluationContext);
        
        if (!enabled) {
          // Return fallback response or 404
          if (options.fallback) {
            return options.fallback(req, res);
          }
          
          return res.status(404).json({
            success: false,
            error: 'Feature not available'
          });
        }
        
        // Call the original handler
        return handler(req, res);
      } catch (error) {
        console.error(`Feature flag wrapper error for ${flagName}:`, error);
        
        // On error, either call the original handler or return error
        if (options.fallback) {
          return options.fallback(req, res);
        }
        
        return res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    };
  };
}

/**
 * Create a conditional API route based on feature flags
 */
export function createConditionalRoute(
  flagName: string,
  enabledHandler: Function,
  disabledHandler?: Function
) {
  return async (req: any, res: any) => {
    try {
      // Initialize the feature flag service if needed
      await featureFlagService.initialize();
      
      // Create evaluation context
      const evaluationContext: FlagEvaluationContext = {
        timestamp: new Date(),
        ip: req.ip,
        userAgent: req.headers['user-agent']
      };
      
      // Check if feature flag is enabled
      const enabled = await featureFlagService.isFlagEnabled(flagName, evaluationContext);
      
      if (enabled) {
        return enabledHandler(req, res);
      } else if (disabledHandler) {
        return disabledHandler(req, res);
      } else {
        return res.status(404).json({
          success: false,
          error: 'Feature not available'
        });
      }
    } catch (error) {
      console.error(`Conditional route error for ${flagName}:`, error);
      
      // On error, try the disabled handler or return error
      if (disabledHandler) {
        return disabledHandler(req, res);
      }
      
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };
}

/**
 * Initialize feature flags for the application
 * Should be called once during application startup
 */
export async function initializeFeatureFlags(): Promise<void> {
  try {
    await featureFlagService.initialize();
    console.log('🚩 [FEATURE-FLAG] Server-side feature flags initialized');
  } catch (error) {
    console.error('🚩 [FEATURE-FLAG] Failed to initialize server-side feature flags:', error);
  }
}

/**
 * Get feature flag statistics for monitoring
 */
export async function getFeatureFlagStats(flagId: string, timeRange?: { start: Date; end: Date }) {
  try {
    // Initialize the feature flag service if needed
    await featureFlagService.initialize();
    
    // Default to last 24 hours if no time range provided
    const defaultTimeRange = {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000),
      end: new Date()
    };
    
    return await featureFlagService.getFlagStats(flagId, timeRange || defaultTimeRange);
  } catch (error) {
    console.error(`Failed to get feature flag stats for ${flagId}:`, error);
    return {
      totalEvaluations: 0,
      enabledEvaluations: 0,
      enabledPercentage: 0,
      userSegmentStats: {}
    };
  }
}

/**
 * Log feature flag evaluation for analytics
 */
export async function logFeatureFlagEvaluation(
  flagName: string,
  context: Partial<FlagEvaluationContext>,
  result: boolean,
  reason?: string
): Promise<void> {
  try {
    // Initialize the feature flag service if needed
    await featureFlagService.initialize();
    
    // Get the flag for logging
    const flag = await featureFlagService.getFlag(flagName);
    if (!flag) return;
    
    // Create full evaluation context
    const evaluationContext: FlagEvaluationContext = {
      timestamp: new Date(),
      ...context
    };
    
    // Log the evaluation
    await featureFlagService.logEvaluation(flagName, evaluationContext, result, reason);
  } catch (error) {
    console.error(`Failed to log feature flag evaluation for ${flagName}:`, error);
  }
}