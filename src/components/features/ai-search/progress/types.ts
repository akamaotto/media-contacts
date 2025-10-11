/**
 * Progress Tracking Types
 * Types and interfaces for real-time progress tracking components
 */

import { SearchProgress, SearchStage, SearchStatus } from '@/lib/ai/search-orchestration/types';

// Enhanced progress tracking interface with UI-specific properties
export interface ProgressData extends SearchProgress {
  searchId: string;
  startTime: Date;
  estimatedDuration?: number;
  connectionStatus: ConnectionStatus;
  retryCount?: number;
  lastUpdate: Date;
}

// Individual progress stage with UI enhancements
export interface ProgressStageData {
  id: string;
  name: string;
  description: string;
  status: StageStatus;
  progress: number;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  metrics?: StageMetrics;
  error?: StageError;
  isCurrent: boolean;
  isExpanded?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  color?: string;
}

// Stage status with more granular states
export type StageStatus =
  | 'pending'
  | 'queued'
  | 'running'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'retrying'
  | 'paused';

// Stage-specific metrics
export interface StageMetrics {
  itemsProcessed?: number;
  totalItems?: number;
  processingRate?: number; // items per second
  successRate?: number;
  averageTimePerItem?: number;
  cacheHitRate?: number;
  cost?: number;
}

// Stage error information
export interface StageError {
  code: string;
  message: string;
  details?: Record<string, any>;
  retryable: boolean;
  suggestedAction?: string;
  timestamp: Date;
}

// Connection status for WebSocket
export type ConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'error'
  | 'offline';

// Time estimation data
export interface TimeEstimation {
  totalEstimated: number; // seconds
  remaining: number; // seconds
  confidence: number; // 0-1
  lastUpdated: Date;
  basedOn: 'historical' | 'current' | 'hybrid';
}

// Progress statistics for display
export interface ProgressStatistics {
  totalQueries: number;
  completedQueries: number;
  foundContacts: number;
  processingRate: number;
  averageTimePerQuery: number;
  successRate: number;
  errorCount: number;
  retryCount: number;
  cacheHitRate: number;
  costBreakdown: {
    queryGeneration: number;
    webSearch: number;
    contentScraping: number;
    contactExtraction: number;
    total: number;
  };
}

// Error categories for better UX
export type ErrorCategory =
  | 'network'
  | 'api'
  | 'validation'
  | 'system'
  | 'timeout'
  | 'quota'
  | 'authentication'
  | 'unknown';

// Categorized error display
export interface CategorizedError {
  category: ErrorCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  actions?: ErrorAction[];
  timestamp: Date;
  retryable: boolean;
  technicalDetails?: string;
}

// Available error actions
export interface ErrorAction {
  type: 'retry' | 'skip' | 'cancel' | 'contact-support' | 'view-details';
  label: string;
  action: () => void | Promise<void>;
  primary?: boolean;
}

// WebSocket message types
export interface ProgressUpdateMessage {
  type: 'progress_update';
  searchId: string;
  progress: Partial<ProgressData>;
  timestamp: Date;
}

export interface StageUpdateMessage {
  type: 'stage_update';
  searchId: string;
  stageId: string;
  stage: Partial<ProgressStageData>;
  timestamp: Date;
}

export interface ErrorMessage {
  type: 'error';
  searchId: string;
  error: CategorizedError;
  timestamp: Date;
}

export interface CompletionMessage {
  type: 'completion';
  searchId: string;
  status: SearchStatus;
  results: {
    totalContacts: number;
    totalSources: number;
    processingTime: number;
    statistics: ProgressStatistics;
  };
  timestamp: Date;
}

export type WebSocketMessage =
  | ProgressUpdateMessage
  | StageUpdateMessage
  | ErrorMessage
  | CompletionMessage;

// Progress tracking component props
export interface SearchProgressProps {
  searchId: string;
  initialProgress?: ProgressData;
  onCancel?: (searchId: string) => Promise<void>;
  onRetry?: (searchId: string) => Promise<void>;
  onViewResults?: (searchId: string) => void;
  className?: string;
  showDetails?: boolean;
  compact?: boolean;
  autoHide?: boolean; // Hide when completed
  persistState?: boolean;
}

export interface ProgressStageProps {
  stage: ProgressStageData;
  isCurrent: boolean;
  expanded?: boolean;
  onToggleExpanded?: () => void;
  showMetrics?: boolean;
  compact?: boolean;
  colorScheme?: 'default' | 'blue' | 'green' | 'orange' | 'red';
}

export interface ProgressStatsProps {
  searchId: string;
  statistics: ProgressStatistics;
  showDetails?: boolean;
  refreshRate?: number;
  onRefresh?: () => Promise<void>;
  compact?: boolean;
}

export interface TimeEstimatorProps {
  searchId: string;
  estimation: TimeEstimation;
  showConfidence?: boolean;
  compact?: boolean;
  format?: 'short' | 'long' | 'compact';
}

export interface ErrorDisplayProps {
  error: CategorizedError;
  onRetry?: () => void;
  onSkip?: () => void;
  onCancel?: () => void;
  showTechnicalDetails?: boolean;
  compact?: boolean;
}

// WebSocket hook configuration
export interface UseWebSocketProgressOptions {
  searchId: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  onProgressUpdate?: (progress: ProgressData) => void;
  onStageUpdate?: (stage: ProgressStageData) => void;
  onError?: (error: CategorizedError) => void;
  onComplete?: (results: CompletionMessage['results']) => void;
  onConnectionChange?: (status: ConnectionStatus) => void;
}

// Progress context for state management
export interface ProgressContextValue {
  searchId: string;
  progress: ProgressData | null;
  stages: Map<string, ProgressStageData>;
  statistics: ProgressStatistics | null;
  connectionStatus: ConnectionStatus;
  error: CategorizedError | null;
  isRunning: boolean;
  isCompleted: boolean;
  isFailed: boolean;
  isCancelled: boolean;
  cancelSearch: () => Promise<void>;
  retrySearch: () => Promise<void>;
  retryStage: (stageId: string) => Promise<void>;
  clearError: () => void;
  toggleStageExpanded: (stageId: string) => void;
  refresh: () => Promise<void>;
}

// Animation and transitions
export interface ProgressAnimations {
  barDuration: number; // ms
  stageTransition: number; // ms
  pulseDuration: number; // ms
  fadeInDuration: number; // ms
  slideDuration: number; // ms
}

export const defaultAnimations: ProgressAnimations = {
  barDuration: 300,
  stageTransition: 200,
  pulseDuration: 1000,
  fadeInDuration: 150,
  slideDuration: 250
};

// Performance thresholds
export interface PerformanceThresholds {
  maxUpdateTime: number; // ms for progress updates
  maxReconnectTime: number; // ms for reconnection
  maxMemoryUsage: number; // MB
  maxCpuUsage: number; // percentage
  minAnimationFPS: number;
}

export const defaultPerformanceThresholds: PerformanceThresholds = {
  maxUpdateTime: 2000, // 2 seconds as per requirements
  maxReconnectTime: 5000, // 5 seconds
  maxMemoryUsage: 100, // 100MB
  maxCpuUsage: 50, // 50%
  minAnimationFPS: 30
};

// Accessibility labels
export const progressAccessibilityLabels = {
  progressBar: (progress: number, stage: string) =>
    `Search progress: ${progress}% complete, currently ${stage}`,
  stageStatus: (stage: string, status: StageStatus) =>
    `Stage ${stage} status: ${status}`,
  cancelButton: 'Cancel search',
  retryButton: 'Retry search',
  errorNotification: 'Search error occurred',
  completionNotification: 'Search completed successfully',
  connectionStatus: (status: ConnectionStatus) =>
    `WebSocket connection ${status}`,
  timeRemaining: (time: number) =>
    `Estimated time remaining: ${time} seconds`,
  expandStage: 'Expand stage details',
  collapseStage: 'Collapse stage details'
} as const;

// Color schemes for different states
export const progressColorSchemes = {
  default: {
    primary: 'hsl(var(--primary))',
    secondary: 'hsl(var(--secondary))',
    success: 'hsl(142, 76%, 36%)',
    warning: 'hsl(38, 92%, 50%)',
    error: 'hsl(0, 84%, 60%)',
    muted: 'hsl(var(--muted))'
  },
  blue: {
    primary: 'hsl(221, 83%, 53%)',
    secondary: 'hsl(221, 83%, 93%)',
    success: 'hsl(142, 76%, 36%)',
    warning: 'hsl(38, 92%, 50%)',
    error: 'hsl(0, 84%, 60%)',
    muted: 'hsl(221, 83%, 97%)'
  },
  green: {
    primary: 'hsl(142, 76%, 36%)',
    secondary: 'hsl(142, 76%, 91%)',
    success: 'hsl(142, 76%, 36%)',
    warning: 'hsl(38, 92%, 50%)',
    error: 'hsl(0, 84%, 60%)',
    muted: 'hsl(142, 76%, 95%)'
  },
  orange: {
    primary: 'hsl(38, 92%, 50%)',
    secondary: 'hsl(38, 92%, 90%)',
    success: 'hsl(142, 76%, 36%)',
    warning: 'hsl(38, 92%, 50%)',
    error: 'hsl(0, 84%, 60%)',
    muted: 'hsl(38, 92%, 95%)'
  },
  red: {
    primary: 'hsl(0, 84%, 60%)',
    secondary: 'hsl(0, 84%, 93%)',
    success: 'hsl(142, 76%, 36%)',
    warning: 'hsl(38, 92%, 50%)',
    error: 'hsl(0, 84%, 60%)',
    muted: 'hsl(0, 84%, 97%)'
  }
} as const;

// Error messages by category
export const errorMessagesByCategory: Record<ErrorCategory, { title: string; defaultMessage: string; actions: ErrorAction['type'][] }> = {
  network: {
    title: 'Network Connection Error',
    defaultMessage: 'Unable to connect to the search service. Please check your internet connection.',
    actions: ['retry', 'cancel']
  },
  api: {
    title: 'Service Error',
    defaultMessage: 'The search service encountered an error. Please try again.',
    actions: ['retry', 'skip', 'cancel']
  },
  validation: {
    title: 'Validation Error',
    defaultMessage: 'Invalid search parameters. Please check your search criteria.',
    actions: ['retry', 'cancel']
  },
  system: {
    title: 'System Error',
    defaultMessage: 'An unexpected error occurred. Our team has been notified.',
    actions: ['retry', 'contact-support', 'cancel']
  },
  timeout: {
    title: 'Timeout Error',
    defaultMessage: 'The search took too long to complete. Please try with different criteria.',
    actions: ['retry', 'cancel']
  },
  quota: {
    title: 'Quota Exceeded',
    defaultMessage: 'You have reached your search limit. Please upgrade your plan or try again later.',
    actions: ['cancel', 'contact-support']
  },
  authentication: {
    title: 'Authentication Error',
    defaultMessage: 'Please log in to perform searches.',
    actions: ['retry', 'cancel']
  },
  unknown: {
    title: 'Unknown Error',
    defaultMessage: 'An unexpected error occurred. Please try again.',
    actions: ['retry', 'contact-support', 'cancel']
  }
};