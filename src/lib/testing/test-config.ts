export interface TestConfig {
  databaseUrl?: string;
  enableRealAI?: boolean;
  aiApiKey?: string;
}

export const testEnvironment = {
  async setup(): Promise<void> {
    // Minimal no-op setup; extend as needed
    return;
  },
  async teardown(): Promise<void> {
    // Minimal no-op teardown
    return;
  },
};

export interface PerformanceResult<T> {
  result: T;
  duration: number;
  memory: number;
}

export const testUtils = {
  async measurePerformance<T>(fn: () => Promise<T> | T, _label?: string): Promise<PerformanceResult<T>> {
    const startMem = process.memoryUsage().heapUsed;
    const start = Date.now();
    const result = await Promise.resolve(fn());
    const duration = Date.now() - start;
    const endMem = process.memoryUsage().heapUsed;
    const memory = Math.max(0, endMem - startMem);
    return { result, duration, memory };
  },

  async retry<T>(fn: () => Promise<T>, attempts: number, delayMs: number): Promise<T> {
    let lastError: unknown;
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        if (i < attempts - 1 && delayMs > 0) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }
};
