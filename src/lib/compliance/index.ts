/**
 * Compliance and Ethical Scraping System
 * Comprehensive compliance features for ethical data handling
 */

// Core compliance service
export { complianceService, ComplianceService } from './compliance-service';

// Robots.txt compliance
export { robotsChecker, robotsUtils } from './robots-checker';

// Request throttling
export { requestThrottler, throttleUtils } from './request-throttler';

// Takedown and opt-out handling
export { takedownSystem } from './takedown-system';

// Data provenance tracking
export { provenanceTracker } from './provenance-tracker';

// Types
export type {
  ComplianceConfig,
  ScrapingRequest,
  ComplianceResult,
  ComplianceReport
} from './compliance-service';

export type {
  RobotsRule,
  RobotsCheckResult
} from './robots-checker';

export type {
  ThrottleConfig,
  ThrottleResult,
  ThrottleState
} from './request-throttler';

export type {
  TakedownRequest,
  TakedownAction,
  OptOutEntry,
  ComplianceRule
} from './takedown-system';

export type {
  DataSource,
  ProcessingStep,
  DataLineage,
  AccessLogEntry,
  ProvenanceQuery
} from './provenance-tracker';

// Default export
export { complianceService as default } from './compliance-service';