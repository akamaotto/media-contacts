/**
 * Debug logging utility for capturing frontend errors and sending them to backend
 */

interface DebugLogEntry {
  message: string;
  level: 'info' | 'warn' | 'error';
  timestamp: string;
  data?: any;
  component?: string;
  userAgent?: string;
  url?: string;
}

class DebugLogger {
  private endpoint: string;
  private enabled: boolean;
  private logQueue: DebugLogEntry[] = [];
  private lastSendTime: number = 0;
  private sendInterval: number = 5000; // 5 seconds
  private maxQueueSize: number = 20;

  constructor() {
    this.endpoint = '/api/debug';
    // Check both NODE_ENV and NEXT_PUBLIC_DEBUG_LOGGING
    this.enabled = process.env.NODE_ENV === 'development' || 
                  (typeof process.env.NEXT_PUBLIC_DEBUG_LOGGING !== 'undefined' && 
                   process.env.NEXT_PUBLIC_DEBUG_LOGGING === 'true');
    
    // Start periodic sending if in browser
    if (typeof window !== 'undefined') {
      setInterval(() => {
        if (this.logQueue.length > 0) {
          this.sendQueuedLogs();
        }
      }, this.sendInterval);
    }
  }

  async log(message: string, data?: any, component?: string): Promise<void> {
    if (!this.enabled) return;

    const logEntry: DebugLogEntry = {
      message,
      level: 'info',
      timestamp: new Date().toISOString(),
      data,
      component,
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined
    };

    this.queueLog(logEntry);
  }

  async warn(message: string, data?: any, component?: string): Promise<void> {
    if (!this.enabled) return;

    const logEntry: DebugLogEntry = {
      message,
      level: 'warn',
      timestamp: new Date().toISOString(),
      data,
      component,
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined
    };

    this.queueLog(logEntry);
  }

  async error(message: string, data?: any, component?: string): Promise<void> {
    const logEntry: DebugLogEntry = {
      message,
      level: 'error',
      timestamp: new Date().toISOString(),
      data,
      component,
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined
    };

    this.queueLog(logEntry);
  }

  private queueLog(logEntry: DebugLogEntry): void {
    if (typeof window === 'undefined') return;

    // Always log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG ${logEntry.level.toUpperCase()}]`, logEntry.timestamp, logEntry.message, logEntry.data);
    }

    // Add to queue
    this.logQueue.push(logEntry);

    // Send immediately if queue is full or if it's an error
    if (this.logQueue.length >= this.maxQueueSize || logEntry.level === 'error') {
      this.sendQueuedLogs();
    }
  }

  private async sendQueuedLogs(): Promise<void> {
    if (typeof window === 'undefined' || this.logQueue.length === 0) return;

    // Rate limiting - don't send more frequently than once per second
    const now = Date.now();
    if (now - this.lastSendTime < 1000 && this.logQueue.length < this.maxQueueSize) {
      return;
    }

    const logsToSend = [...this.logQueue];
    this.logQueue = [];
    this.lastSendTime = now;

    try {
      // Send to backend
      await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logs: logsToSend,
          batchTimestamp: new Date().toISOString()
        })
      });
    } catch (err) {
      // Silently fail to avoid infinite loops
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to send debug logs:', err);
      }
      // Put logs back in queue for retry
      this.logQueue.unshift(...logsToSend);
    }
  }
}

export const debugLogger = new DebugLogger();