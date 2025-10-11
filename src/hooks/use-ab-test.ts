/**
 * React Hook for A/B Testing
 * Provides a convenient way to use A/B testing in React components
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { abTestingService, type Experiment, type ExperimentVariant } from '@/lib/feature-flags/ab-testing-service';
import { useFeatureFlag } from './use-feature-flag';

interface UseABTestOptions {
  userId?: string;
  sessionId?: string;
  recordConversion?: boolean;
}

interface UseABTestResult {
  variant: ExperimentVariant | null;
  experiment: Experiment | null;
  isLoading: boolean;
  error: string | null;
  recordConversion: (value?: number) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Hook to participate in an A/B test experiment
 */
export function useABTest(
  experimentId: string,
  options: UseABTestOptions = {}
): UseABTestResult {
  const { userId, sessionId } = options;
  
  const [variant, setVariant] = useState<ExperimentVariant | null>(null);
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get the experiment
  const getExperiment = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const exp = abTestingService.getExperiment(experimentId);
      if (!exp) {
        setError(`Experiment with ID ${experimentId} not found`);
        return;
      }
      
      setExperiment(exp);
      
      // Get variant for user
      const userVariant = await abTestingService.getExperimentVariant(
        experimentId,
        userId,
        sessionId
      );
      
      setVariant(userVariant);
    } catch (err) {
      console.error(`Failed to get A/B test variant for experiment ${experimentId}:`, err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [experimentId, userId, sessionId]);

  // Record conversion
  const recordConversion = useCallback(async (value?: number) => {
    try {
      await abTestingService.recordConversion(experimentId, userId, sessionId, value);
    } catch (err) {
      console.error(`Failed to record conversion for experiment ${experimentId}:`, err);
    }
  }, [experimentId, userId, sessionId]);

  // Initial load
  useEffect(() => {
    getExperiment();
  }, [getExperiment]);

  return {
    variant,
    experiment,
    isLoading,
    error,
    recordConversion,
    refresh: getExperiment
  };
}

/**
 * Hook to participate in an A/B test experiment based on a feature flag
 */
export function useABTestByFlag(
  flagId: string,
  options: UseABTestOptions = {}
): UseABTestResult {
  const { userId, sessionId } = options;
  
  const [variant, setVariant] = useState<ExperimentVariant | null>(null);
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get the experiment associated with the flag
  const getExperimentByFlag = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Get experiments for the flag
      const experiments = abTestingService.getExperimentsForFlag(flagId);
      
      // Find the running experiment
      const runningExp = experiments.find(exp => exp.status === 'running');
      
      if (!runningExp) {
        setError(`No running A/B test found for flag ${flagId}`);
        return;
      }
      
      setExperiment(runningExp);
      
      // Get variant for user
      const userVariant = await abTestingService.getExperimentVariant(
        runningExp.id,
        userId,
        sessionId
      );
      
      setVariant(userVariant);
    } catch (err) {
      console.error(`Failed to get A/B test variant for flag ${flagId}:`, err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [flagId, userId, sessionId]);

  // Record conversion
  const recordConversion = useCallback(async (value?: number) => {
    if (!experiment) return;
    
    try {
      await abTestingService.recordConversion(experiment.id, userId, sessionId, value);
    } catch (err) {
      console.error(`Failed to record conversion for experiment ${experiment.id}:`, err);
    }
  }, [experiment?.id, userId, sessionId]);

  // Initial load
  useEffect(() => {
    getExperimentByFlag();
  }, [getExperimentByFlag]);

  return {
    variant,
    experiment,
    isLoading,
    error,
    recordConversion,
    refresh: getExperimentByFlag
  };
}

/**
 * Hook to check if a feature flag is enabled and participate in an A/B test
 */
export function useFeatureFlagWithABTest(
  flagId: string,
  experimentId?: string,
  options: UseABTestOptions = {}
) {
  const { userId, sessionId } = options;
  
  // Check if feature flag is enabled
  const { enabled: flagEnabled, loading: flagLoading } = useFeatureFlag(flagId, {
    context: { userId }
  });
  
  // Get A/B test variant if experiment ID is provided
  const abTestResult = useABTest(experimentId || '', { userId, sessionId });
  
  // Auto-record conversion if option is enabled
  useEffect(() => {
    if (options.recordConversion && flagEnabled && abTestResult.variant) {
      // In a real implementation, you would record conversion at the appropriate time
      // This is just a placeholder to show how it could be done
      console.log(`Would record conversion for experiment ${experimentId}`);
    }
  }, [options.recordConversion, flagEnabled, abTestResult.variant, experimentId]);
  
  return {
    flagEnabled,
    flagLoading,
    variant: abTestResult.variant,
    experiment: abTestResult.experiment,
    isLoading: flagLoading || abTestResult.isLoading,
    error: abTestResult.error,
    recordConversion: abTestResult.recordConversion,
    refresh: abTestResult.refresh
  };
}

/**
 * Component to conditionally render content based on A/B test variant
 */
export function ABTestVariant({
  experimentId,
  children,
  fallback = null,
  loadingComponent = null,
  options = {}
}: {
  experimentId: string;
  children: (variant: ExperimentVariant, experiment: Experiment) => React.ReactNode;
  fallback?: React.ReactNode;
  loadingComponent?: React.ReactNode;
  options?: UseABTestOptions;
}) {
  const { variant, experiment, isLoading, error } = useABTest(experimentId, options);
  
  if (isLoading) {
    return <>{loadingComponent}</>;
  }
  
  if (error || !variant || !experiment) {
    return <>{fallback}</>;
  }
  
  return <>{children(variant, experiment)}</>;
}

/**
 * Component to render different content based on A/B test variant
 */
export function ABTestVariantRenderer({
  experimentId,
  variants,
  fallback = null,
  loadingComponent = null,
  options = {}
}: {
  experimentId: string;
  variants: Record<string, (variant: ExperimentVariant) => React.ReactNode>;
  fallback?: React.ReactNode;
  loadingComponent?: React.ReactNode;
  options?: UseABTestOptions;
}) {
  const { variant, experiment, isLoading, error } = useABTest(experimentId, options);
  
  if (isLoading) {
    return <>{loadingComponent}</>;
  }
  
  if (error || !variant || !experiment) {
    return <>{fallback}</>;
  }
  
  // Render the component for the current variant
  const variantRenderer = variants[variant.id];
  if (variantRenderer) {
    return <>{variantRenderer(variant)}</>;
  }
  
  // Fallback to control variant renderer if available
  const controlVariant = experiment.variants.find(v => v.isControl);
  if (controlVariant && variants[controlVariant.id]) {
    return <>{variants[controlVariant.id](variant)}</>;
  }
  
  return <>{fallback}</>;
}

/**
 * Higher-order component to wrap components with A/B testing
 */
export function withABTest<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  experimentId: string,
  options: {
    fallback?: React.ComponentType<P>;
    loadingComponent?: React.ComponentType<P>;
    variantRenderer?: (variant: ExperimentVariant, props: P) => React.ReactNode;
    abTestOptions?: UseABTestOptions;
  } = {}
) {
  const { 
    fallback: FallbackComponent, 
    loadingComponent: LoadingComponent,
    variantRenderer,
    abTestOptions
  } = options;
  
  return function WithABTestComponent(props: P) {
    const { variant, experiment, isLoading, error } = useABTest(experimentId, abTestOptions);
    
    if (isLoading && LoadingComponent) {
      return <LoadingComponent {...props} />;
    }
    
    if ((error || !variant || !experiment) && FallbackComponent) {
      return <FallbackComponent {...props} />;
    }
    
    if (variantRenderer && variant && experiment) {
      return <>{variantRenderer(variant, props)}</>;
    }
    
    if (!variant || !experiment) {
      return null;
    }
    
    return <WrappedComponent {...props} />;
  };
}