export type ServiceName = 'research' | 'enrichment' | 'duplicates' | 'api';
export type MethodName = string;

export const performanceScenarios = {
  slowResponse: { type: 'slowResponse', delayMs: 2000 } as const,
  timeout: { type: 'timeout', timeoutMs: 5000 } as const,
  highMemory: { type: 'highMemory', bytes: 50 * 1024 * 1024 } as const,
};

export const aiServiceMockFactory = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  addScenario(_service: ServiceName, _method: MethodName, _scenario: unknown) {
    // no-op; tests only need the API to exist
  },
  reset() {
    // no-op mock reset
  },
};

export function setupDefaultMockScenarios(): void {
  // no-op default scenarios
}
