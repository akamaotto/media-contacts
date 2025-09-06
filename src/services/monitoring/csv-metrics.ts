/**
 * CSV Import/Export Monitoring Module
 * 
 * This module provides monitoring and metrics collection for CSV operations.
 * It tracks performance, errors, and usage patterns to help identify issues
 * and optimize the application.
 */

// Types
type ImportMetrics = {
  total: number;
  successful: number;
  failed: number;
  validationErrors: number;
  processingErrors: number;
  totalDuration: number;
  totalRows: number;
  totalFileSize: number;
  maxMemoryUsage: number;
};

type ExportMetrics = {
  total: number;
  successful: number;
  failed: number;
  totalDuration: number;
  totalRows: number;
  totalFileSize: number;
};

type CsvOpType = 'import' | 'export';

type CsvOpError = {
  type?: 'validation' | 'processing' | string;
  message?: string;
  [key: string]: unknown;
};

type CsvOperationResult = {
  success: boolean;
  rows?: number;
  errors?: CsvOpError[];
};

type LoggerData = Record<string, unknown>;

// In-memory metrics storage (would be replaced with a proper metrics service in production)
const metrics: { imports: ImportMetrics; exports: ExportMetrics } = {
  imports: {
    total: 0,
    successful: 0,
    failed: 0,
    validationErrors: 0,
    processingErrors: 0,
    totalDuration: 0,
    totalRows: 0,
    totalFileSize: 0,
    maxMemoryUsage: 0,
  },
  exports: {
    total: 0,
    successful: 0,
    failed: 0,
    totalDuration: 0,
    totalRows: 0,
    totalFileSize: 0,
  }
};

// Performance tracking
const activeOperations = new Map<string, {
  startTime: number;
  type: CsvOpType;
  fileSize?: number;
  memoryUsage?: number[];
}>();

/**
 * Start tracking a CSV operation
 */
export function startOperation(id: string, type: CsvOpType, fileSize?: number) {
  activeOperations.set(id, {
    startTime: Date.now(),
    type,
    fileSize,
    memoryUsage: [],
  });
  
  // Log operation start
  logger.info(`CSV ${type} operation started`, { 
    operationId: id,
    fileSize,
    timestamp: new Date().toISOString()
  });
  
  // Start memory tracking for imports (which are more resource-intensive)
  if (type === 'import') {
    trackMemoryUsage(id);
  }
}

/**
 * Complete tracking a CSV operation
 */
export function completeOperation(id: string, result: CsvOperationResult) {
  const operation = activeOperations.get(id);
  if (!operation) {
    logger.warn(`Attempted to complete unknown operation: ${id}`);
    return;
  }
  
  const duration = Date.now() - operation.startTime;
  const { type, fileSize, memoryUsage } = operation;
  
  // Update metrics
  if (type === 'import') {
    metrics.imports.total++;
    metrics.imports.totalDuration += duration;
    if (fileSize) metrics.imports.totalFileSize += fileSize;
    if (result.rows) metrics.imports.totalRows += result.rows;
    
    if (result.success) {
      metrics.imports.successful++;
    } else {
      metrics.imports.failed++;
      if (result.errors?.some((e) => e.type === 'validation')) {
        metrics.imports.validationErrors++;
      } else {
        metrics.imports.processingErrors++;
      }
    }
    
    // Calculate max memory usage
    if (memoryUsage && memoryUsage.length > 0) {
      const maxMemory = Math.max(...memoryUsage);
      metrics.imports.maxMemoryUsage = Math.max(metrics.imports.maxMemoryUsage, maxMemory);
    }
  } else {
    metrics.exports.total++;
    metrics.exports.totalDuration += duration;
    if (result.rows) metrics.exports.totalRows += result.rows;
    
    if (result.success) {
      metrics.exports.successful++;
    } else {
      metrics.exports.failed++;
    }
  }
  
  // Log operation completion
  logger.info(`CSV ${type} operation completed`, {
    operationId: id,
    success: result.success,
    duration,
    rows: result.rows,
    errors: result.errors?.length || 0,
    timestamp: new Date().toISOString()
  });
  
  // Clean up
  activeOperations.delete(id);
}

/**
 * Track memory usage during an operation
 */
function trackMemoryUsage(id: string) {
  const intervalId = setInterval(() => {
    const operation = activeOperations.get(id);
    if (!operation) {
      clearInterval(intervalId);
      return;
    }
    
    // Get current memory usage
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    operation.memoryUsage?.push(heapUsedMB);
    
    // Check for memory alerts
    if (heapUsedMB > 512) { // Alert if using more than 512MB
      logger.warn(`High memory usage detected in CSV operation`, {
        operationId: id,
        memoryUsageMB: heapUsedMB,
        timestamp: new Date().toISOString()
      });
    }
  }, 1000); // Check every second
  
  // Ensure we clean up the interval
  setTimeout(() => {
    if (activeOperations.has(id)) {
      clearInterval(intervalId);
    }
  }, 30 * 60 * 1000); // Max 30 minutes
}

/**
 * Log an error during CSV processing
 */
export function logError(id: string, error: Error, context?: Record<string, unknown>) {
  const operation = activeOperations.get(id);
  
  logger.error(`CSV operation error`, {
    operationId: id,
    operationType: operation?.type || 'unknown',
    error: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  });
}

/**
 * Get current metrics
 */
export function getMetrics() {
  const importAvgDuration = metrics.imports.total > 0 
    ? metrics.imports.totalDuration / metrics.imports.total 
    : 0;
    
  const exportAvgDuration = metrics.exports.total > 0 
    ? metrics.exports.totalDuration / metrics.exports.total 
    : 0;
    
  return {
    imports: {
      ...metrics.imports,
      averageDuration: importAvgDuration,
      successRate: metrics.imports.total > 0 
        ? (metrics.imports.successful / metrics.imports.total) * 100 
        : 0,
    },
    exports: {
      ...metrics.exports,
      averageDuration: exportAvgDuration,
      successRate: metrics.exports.total > 0 
        ? (metrics.exports.successful / metrics.exports.total) * 100 
        : 0,
    },
    activeOperations: activeOperations.size,
  };
}

/**
 * Reset metrics (for testing)
 */
export function resetMetrics() {
  (Object.keys(metrics.imports) as Array<keyof ImportMetrics>).forEach((key) => {
    metrics.imports[key] = 0 as ImportMetrics[typeof key];
  });

  (Object.keys(metrics.exports) as Array<keyof ExportMetrics>).forEach((key) => {
    metrics.exports[key] = 0 as ExportMetrics[typeof key];
  });
}

/**
 * Simple logger implementation
 * In production, this would be replaced with a proper logging service
 */
export const logger = {
  info: (message: string, data?: LoggerData) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      ...data
    }));
  },
  warn: (message: string, data?: LoggerData) => {
    console.warn(JSON.stringify({
      level: 'warn',
      message,
      ...data
    }));
  },
  error: (message: string, data?: LoggerData) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      ...data
    }));
  }
};
