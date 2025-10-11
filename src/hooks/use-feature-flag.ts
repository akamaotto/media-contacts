/**
 * React Hook for Feature Flags
 * Provides a convenient way to use feature flags in React components
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { isFeatureEnabled, type FlagEvaluationContext } from '@/lib/feature-flags/feature-flag-service';

interface UseFeatureFlagOptions {
  defaultFallback?: boolean;
  context?: Omit<FlagEvaluationContext, 'timestamp'>;
}

interface UseFeatureFlagResult {
  enabled: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to check if a feature flag is enabled
 */
export function useFeatureFlag(
  flagName: string,
  options: UseFeatureFlagOptions = {}
): UseFeatureFlagResult {
  const { defaultFallback = false, context = {} } = options;
  
  const [enabled, setEnabled] = useState(defaultFallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create evaluation context
  const evaluationContext: FlagEvaluationContext = {
    timestamp: new Date(),
    ...context
  };

  // Check flag status
  const checkFlag = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await isFeatureEnabled(flagName, evaluationContext);
      setEnabled(result);
    } catch (err) {
      console.error(`Failed to check feature flag ${flagName}:`, err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setEnabled(defaultFallback);
    } finally {
      setLoading(false);
    }
  }, [flagName, evaluationContext, defaultFallback]);

  // Initial check
  useEffect(() => {
    checkFlag();
  }, [checkFlag]);

  return {
    enabled,
    loading,
    error,
    refresh: checkFlag
  };
}

/**
 * Hook to check multiple feature flags at once
 */
export function useFeatureFlags(
  flagNames: string[],
  options: UseFeatureFlagOptions = {}
): Record<string, UseFeatureFlagResult> {
  const { defaultFallback = false, context = {} } = options;
  
  // Initialize results
  const initialResults: Record<string, UseFeatureFlagResult> = {};
  flagNames.forEach(name => {
    initialResults[name] = {
      enabled: defaultFallback,
      loading: true,
      error: null,
      refresh: async () => {}
    };
  });
  
  const [results, setResults] = useState(initialResults);

  // Create evaluation context
  const evaluationContext: FlagEvaluationContext = {
    timestamp: new Date(),
    ...context
  };

  // Check all flags
  const checkFlags = useCallback(async () => {
    const newResults: Record<string, UseFeatureFlagResult> = {};
    
    await Promise.all(
      flagNames.map(async (name) => {
        try {
          const enabled = await isFeatureEnabled(name, evaluationContext);
          newResults[name] = {
            enabled,
            loading: false,
            error: null,
            refresh: async () => {
              const refreshed = await isFeatureEnabled(name, evaluationContext);
              setResults(prev => ({
                ...prev,
                [name]: { ...prev[name], enabled: refreshed }
              }));
            }
          };
        } catch (err) {
          console.error(`Failed to check feature flag ${name}:`, err);
          newResults[name] = {
            enabled: defaultFallback,
            loading: false,
            error: err instanceof Error ? err.message : 'Unknown error',
            refresh: async () => {}
          };
        }
      })
    );
    
    setResults(newResults);
  }, [flagNames, evaluationContext, defaultFallback]);

  // Initial check
  useEffect(() => {
    checkFlags();
  }, [checkFlags]);

  return results;
}

/**
 * Hook to get feature flag with variant support
 */
export function useFeatureFlagVariant<T = string>(
  flagName: string,
  variants: T[],
  options: UseFeatureFlagOptions = {}
): { variant: T | null; enabled: boolean; loading: boolean; error: string | null } {
  const { defaultFallback = false, context = {} } = options;
  
  const [variant, setVariant] = useState<T | null>(null);
  const [enabled, setEnabled] = useState(defaultFallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create evaluation context
  const evaluationContext: FlagEvaluationContext = {
    timestamp: new Date(),
    ...context
  };

  // Check flag status
  const checkFlag = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const flagEnabled = await isFeatureEnabled(flagName, evaluationContext);
      setEnabled(flagEnabled);
      
      if (flagEnabled && variants.length > 0) {
        // Select variant based on user ID or random selection
        const userId = context.userId || 'anonymous';
        const hash = hashCode(userId + flagName);
        const variantIndex = hash % variants.length;
        setVariant(variants[variantIndex]);
      } else {
        setVariant(null);
      }
    } catch (err) {
      console.error(`Failed to check feature flag ${flagName}:`, err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setEnabled(defaultFallback);
      setVariant(null);
    } finally {
      setLoading(false);
    }
  }, [flagName, evaluationContext, variants, defaultFallback]);

  // Initial check
  useEffect(() => {
    checkFlag();
  }, [checkFlag]);

  return {
    variant,
    enabled,
    loading,
    error
  };
}

/**
 * Simple hash function for variant selection
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * HOC to wrap components with feature flag checks
 */
export function withFeatureFlag<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  flagName: string,
  options: {
    fallback?: React.ComponentType<P>;
    defaultFallback?: boolean;
    context?: Omit<FlagEvaluationContext, 'timestamp'>;
  } = {}
) {
  const { fallback: FallbackComponent, defaultFallback = false, context = {} } = options;
  
  return function WithFeatureFlagComponent(props: P) {
    const { enabled, loading } = useFeatureFlag(flagName, { defaultFallback, context });
    
    if (loading) {
      return <div>Loading...</div>; // Or your loading component
    }
    
    if (!enabled) {
      return FallbackComponent ? <FallbackComponent {...props} /> : null;
    }
    
    return <WrappedComponent {...props} />;
  };
}

/**
 * Component to conditionally render children based on feature flag
 */
export function FeatureFlag({
  flagName,
  children,
  fallback = null,
  defaultFallback = false,
  context = {}
}: {
  flagName: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  defaultFallback?: boolean;
  context?: Omit<FlagEvaluationContext, 'timestamp'>;
}) {
  const { enabled, loading } = useFeatureFlag(flagName, { defaultFallback, context });
  
  if (loading) {
    return <div>Loading...</div>; // Or your loading component
  }
  
  return enabled ? <>{children}</> : <>{fallback}</>;
}

/**
 * Component to render different content based on feature flag variant
 */
export function FeatureFlagVariant<T = string>({
  flagName,
  variants,
  children,
  fallback = null,
  defaultFallback = false,
  context = {}
}: {
  flagName: string;
  variants: T[];
  children: (variant: T) => React.ReactNode;
  fallback?: React.ReactNode;
  defaultFallback?: boolean;
  context?: Omit<FlagEvaluationContext, 'timestamp'>;
}) {
  const { variant, enabled, loading } = useFeatureFlagVariant(flagName, variants, { 
    defaultFallback, 
    context 
  });
  
  if (loading) {
    return <div>Loading...</div>; // Or your loading component
  }
  
  if (!enabled || variant === null) {
    return <>{fallback}</>;
  }
  
  return <>{children(variant)}</>;
}