/**
 * Progress Tracking Components Index
 * Exports all progress tracking components and utilities
 */

// Main components
export { SearchProgress } from './search-progress';
export { ProgressStage } from './progress-stage';
export { ProgressStats } from './progress-stats';
export { TimeEstimator } from './time-estimator';
export { ErrorDisplay } from './error-display';

// Hooks
export { useWebSocketProgress, useProgressState } from './use-websocket-progress';

// Types and interfaces
export type {
  ProgressData,
  ProgressStageData,
  StageStatus,
  StageMetrics,
  StageError,
  ConnectionStatus,
  TimeEstimation,
  ProgressStatistics,
  ErrorCategory,
  CategorizedError,
  ErrorAction,
  WebSocketMessage,
  ProgressUpdateMessage,
  StageUpdateMessage,
  ErrorMessage,
  CompletionMessage,
  SearchProgressProps,
  ProgressStageProps,
  ProgressStatsProps,
  TimeEstimatorProps,
  ErrorDisplayProps,
  UseWebSocketProgressOptions,
  ProgressContextValue,
  ProgressAnimations,
  PerformanceThresholds
} from './types';

// Constants and utilities
export {
  defaultAnimations,
  defaultPerformanceThresholds,
  progressAccessibilityLabels,
  progressColorSchemes,
  errorMessagesByCategory
} from './types';

// Re-export for backward compatibility
export type {
  SearchProgress as default,
  ProgressStage as Stage,
  ProgressStats as Stats,
  TimeEstimator as Timer,
  ErrorDisplay as Error
} from './search-progress';