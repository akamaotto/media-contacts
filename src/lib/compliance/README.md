# Ethical Scraping and Compliance System

This module provides comprehensive compliance features for ethical web scraping and data handling, ensuring adherence to robots.txt, rate limiting, takedown requests, and data provenance tracking.

## Overview

The compliance system consists of four main components:

1. **Robots.txt Checker** - Respects robots.txt directives
2. **Request Throttler** - Implements ethical rate limiting
3. **Takedown System** - Handles opt-out and takedown requests
4. **Provenance Tracker** - Tracks data origin and processing history

## Quick Start

### Basic Compliance Check

```typescript
import { complianceService } from '@/lib/compliance';

const request = {
  url: 'https://example.com/contact',
  purpose: 'media contact research',
  userId: 'user-123'
};

const result = await complianceService.checkCompliance(request);

if (result.allowed) {
  // Proceed with request
  if (result.delay) {
    await new Promise(resolve => setTimeout(resolve, result.delay));
  }
  // Make the request...
} else {
  console.log('Request blocked:', result.reason);
}
```

### Compliant Request Execution

```typescript
import { complianceService } from '@/lib/compliance';

const result = await complianceService.executeCompliantRequest(
  {
    url: 'https://example.com/staff',
    purpose: 'staff directory scraping',
    userId: 'user-123'
  },
  () => fetch('https://example.com/staff')
);
```

## Components

### 1. Robots.txt Checker

Automatically checks and respects robots.txt directives:

```typescript
import { robotsChecker, robotsUtils } from '@/lib/compliance';

// Check single URL
const result = await robotsChecker.isAllowed('https://example.com/page');
console.log('Allowed:', result.allowed);
console.log('Crawl delay:', result.crawlDelay);

// Check multiple URLs
const allowedUrls = await robotsUtils.filterAllowedUrls([
  'https://example.com/page1',
  'https://example.com/page2',
  'https://example.com/admin' // Might be blocked
]);

// Get sitemaps
const sitemaps = await robotsChecker.getSitemaps('https://example.com');
```

**Features:**
- Automatic robots.txt fetching and parsing
- Caching with configurable TTL
- User-agent specific rules
- Wildcard and pattern matching
- Sitemap discovery
- Graceful fallback when robots.txt is unavailable

### 2. Request Throttler

Implements ethical rate limiting and request throttling:

```typescript
import { requestThrottler, throttleUtils } from '@/lib/compliance';

// Check if request is allowed
const throttleResult = await requestThrottler.checkRequest('https://example.com/page');

if (throttleResult.allowed) {
  // Make request
  await makeRequest();
  requestThrottler.recordRequest('https://example.com/page');
} else {
  // Wait for required delay
  await new Promise(resolve => setTimeout(resolve, throttleResult.delay));
}

// Execute with automatic throttling
const result = await requestThrottler.executeThrottledRequest(
  'https://example.com/page',
  () => fetch('https://example.com/page')
);
```

**Features:**
- Per-domain rate limiting
- Exponential backoff for errors
- Circuit breaker pattern
- Configurable limits (per second/minute/hour)
- Burst request handling
- Domain-specific configurations

### 3. Takedown System

Handles takedown requests and opt-out preferences:

```typescript
import { takedownSystem } from '@/lib/compliance';

// Submit takedown request
const requestId = await takedownSystem.submitTakedownRequest({
  type: 'takedown',
  priority: 'high',
  requesterInfo: {
    name: 'John Doe',
    email: 'john@example.com',
    relationship: 'subject',
    verificationStatus: 'unverified'
  },
  requestDetails: {
    reason: 'Privacy concerns',
    description: 'Please remove my contact information',
    affectedData: ['email', 'phone', 'social_profiles']
  },
  affectedRecords: {
    contactIds: ['contact-123'],
    dataTypes: ['personal_info'],
    estimatedRecordCount: 1
  },
  timeline: {
    submittedAt: new Date()
  }
});

// Add opt-out
const optOutId = await takedownSystem.addOptOut({
  type: 'email',
  value: 'noemail@example.com',
  reason: 'User requested opt-out',
  source: 'user_request',
  addedBy: 'user-123'
});

// Check if opted out
const isOptedOut = takedownSystem.isOptedOut('example.com', 'domain');
```

**Features:**
- Multiple request types (takedown, opt-out, correction, deletion)
- Priority-based processing
- Automatic deadline calculation
- Verification workflow
- Compliance rule engine
- Audit trail and reporting

### 4. Provenance Tracker

Tracks data origin and processing history:

```typescript
import { provenanceTracker } from '@/lib/compliance';

// Record data source
const sourceId = await provenanceTracker.recordDataSource({
  type: 'web_scraping',
  url: 'https://example.com/contact',
  domain: 'example.com',
  robotsCompliant: true,
  rateLimited: true,
  metadata: {
    purpose: 'contact research',
    userId: 'user-123'
  }
});

// Create data lineage
await provenanceTracker.createDataLineage({
  dataId: 'contact-123',
  dataType: 'contact',
  value: { name: 'John Doe', email: 'john@example.com' },
  sourceId,
  qualityScore: 0.9
});

// Record processing step
await provenanceTracker.recordProcessingStep({
  type: 'ai_processing',
  processor: 'contact_enricher_v1.0',
  input: { dataIds: ['contact-123'] },
  output: { 
    dataIds: ['contact-123'],
    changes: { beats: ['technology', 'startups'] }
  },
  duration: 2500,
  success: true,
  confidence: 0.85
});

// Get compliance report
const report = provenanceTracker.getComplianceReport('contact-123');
console.log('Compliant:', report.compliant);
console.log('Issues:', report.issues);
```

**Features:**
- Complete data lineage tracking
- Processing history with confidence scores
- Access logging and audit trails
- Quality scoring and verification
- Retention policy enforcement
- Compliance reporting

## Integrated Compliance Service

The main compliance service orchestrates all components:

```typescript
import { complianceService } from '@/lib/compliance';

// Configure compliance
const service = ComplianceService.getInstance({
  enableRobotsCheck: true,
  enableRateThrottling: true,
  enableProvenanceTracking: true,
  enableTakedownHandling: true,
  defaultUserAgent: 'MyBot/1.0 (+https://mysite.com/bot)',
  respectCrawlDelay: true,
  minRequestDelay: 1000
});

// Batch compliance check
const requests = [
  { url: 'https://site1.com/page', purpose: 'research', userId: 'user-123' },
  { url: 'https://site2.com/page', purpose: 'research', userId: 'user-123' }
];

const results = await service.checkBatchCompliance(requests);
const allowedRequests = results
  .filter(({ result }) => result.allowed)
  .map(({ request }) => request);

// Get compliance report
const report = await service.getComplianceReport({
  start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
  end: new Date()
});

console.log('Compliance rate:', report.summary.complianceRate + '%');
```

## Configuration

### Default Configuration

```typescript
const defaultConfig = {
  enableRobotsCheck: true,
  enableRateThrottling: true,
  enableProvenanceTracking: true,
  enableTakedownHandling: true,
  defaultUserAgent: 'MediaContactBot/1.0 (+https://example.com/bot)',
  respectCrawlDelay: true,
  minRequestDelay: 1000,
  maxRequestsPerDomain: 100
};
```

### Domain-Specific Throttling

```typescript
import { throttleUtils } from '@/lib/compliance';

// Get recommended config for social media sites
const twitterConfig = throttleUtils.getRecommendedConfig('twitter.com');
// Returns: { requestsPerSecond: 0.5, minDelay: 2000, ... }

const linkedinConfig = throttleUtils.getRecommendedConfig('linkedin.com');
// Returns: { requestsPerSecond: 0.3, minDelay: 3000, ... }
```

### Custom Throttle Configuration

```typescript
import { RequestThrottler } from '@/lib/compliance';

const customThrottler = new RequestThrottler();

await customThrottler.executeThrottledRequest(
  'https://example.com/api',
  () => fetch('https://example.com/api'),
  {
    requestsPerSecond: 2,
    requestsPerMinute: 60,
    minDelay: 500,
    respectCrawlDelay: true
  }
);
```

## API Integration

### Express.js Middleware

```typescript
import express from 'express';
import { complianceService } from '@/lib/compliance';

const app = express();

// Compliance middleware
app.use('/api/scrape', async (req, res, next) => {
  const { url, purpose } = req.body;
  const userId = req.user.id;

  const result = await complianceService.checkCompliance({
    url,
    purpose,
    userId
  });

  if (!result.allowed) {
    return res.status(403).json({
      error: 'Request blocked by compliance rules',
      reason: result.reason
    });
  }

  // Add compliance info to request
  req.compliance = result;
  next();
});
```

### Next.js API Route

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { complianceService } from '@/lib/compliance';

export async function POST(request: NextRequest) {
  const { url, purpose } = await request.json();
  const userId = 'user-123'; // Get from auth

  try {
    const result = await complianceService.executeCompliantRequest(
      { url, purpose, userId },
      () => fetch(url)
    );

    const data = await result.text();
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: 'Compliance check failed' },
      { status: 403 }
    );
  }
}
```

## Compliance Reporting

### Generate Compliance Report

```typescript
import { complianceService } from '@/lib/compliance';

const report = await complianceService.getComplianceReport({
  start: new Date('2024-01-01'),
  end: new Date('2024-01-31')
});

console.log(`
Compliance Report for January 2024:
- Total Requests: ${report.summary.totalRequests}
- Compliance Rate: ${report.summary.complianceRate}%
- Robots.txt Compliant: ${report.robotsCompliance.compliantDomains}/${report.robotsCompliance.domainsChecked}
- Takedown Requests: ${report.takedowns.totalRequests} (${report.takedowns.pendingRequests} pending)
- Data Quality Score: ${report.provenance.qualityScore}
`);
```

### Export Provenance Data

```typescript
import { provenanceTracker } from '@/lib/compliance';

const exportData = provenanceTracker.exportProvenanceData({
  dateRange: {
    start: new Date('2024-01-01'),
    end: new Date('2024-01-31')
  },
  dataType: 'contact',
  limit: 1000
});

// Save to file or send to compliance team
console.log(`Exported ${exportData.data.length} records`);
```

## Best Practices

### 1. Always Check Compliance

```typescript
// ✅ Good: Check compliance before scraping
const result = await complianceService.checkCompliance(request);
if (result.allowed) {
  await makeRequest();
}

// ❌ Bad: Skip compliance checks
await makeRequest(); // Might violate robots.txt or rate limits
```

### 2. Respect Rate Limits

```typescript
// ✅ Good: Use built-in throttling
await complianceService.executeCompliantRequest(request, () => fetch(url));

// ❌ Bad: Make rapid requests
for (const url of urls) {
  await fetch(url); // No delay between requests
}
```

### 3. Handle Opt-outs Proactively

```typescript
// ✅ Good: Check opt-outs before processing
const domain = new URL(url).hostname;
if (takedownSystem.isOptedOut(domain, 'domain')) {
  console.log('Domain opted out, skipping');
  return;
}

// ❌ Bad: Process without checking opt-outs
await processContactData(data); // Might process opted-out data
```

### 4. Track Data Provenance

```typescript
// ✅ Good: Track data sources and processing
const sourceId = await provenanceTracker.recordDataSource({
  type: 'web_scraping',
  url,
  robotsCompliant: true,
  rateLimited: true
});

await provenanceTracker.createDataLineage({
  dataId: 'contact-123',
  dataType: 'contact',
  value: extractedData,
  sourceId
});

// ❌ Bad: No provenance tracking
const data = extractDataFromPage(html); // No record of where data came from
```

### 5. Regular Compliance Audits

```typescript
// ✅ Good: Regular compliance monitoring
setInterval(async () => {
  const report = await complianceService.getComplianceReport();
  if (report.summary.complianceRate < 95) {
    console.warn('Compliance rate below threshold:', report.summary.complianceRate);
  }
}, 24 * 60 * 60 * 1000); // Daily check

// ✅ Good: Cleanup expired data
setInterval(async () => {
  await complianceService.cleanup();
}, 7 * 24 * 60 * 60 * 1000); // Weekly cleanup
```

## Legal Compliance

### GDPR Compliance

```typescript
// Handle data deletion requests
await takedownSystem.submitTakedownRequest({
  type: 'data_deletion',
  priority: 'high',
  requesterInfo: {
    name: 'Data Subject',
    email: 'subject@example.com',
    relationship: 'subject'
  },
  requestDetails: {
    reason: 'GDPR Article 17 - Right to erasure',
    description: 'Request deletion of all personal data',
    legalBasis: 'GDPR Article 17'
  },
  affectedRecords: {
    contactIds: ['contact-123'],
    dataTypes: ['personal_info', 'contact_details']
  }
});

// Set retention policies
await provenanceTracker.createDataLineage({
  dataId: 'contact-123',
  dataType: 'contact',
  value: contactData,
  sourceId,
  retentionPolicy: {
    retainUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    reason: 'Business necessity',
    legalBasis: 'GDPR Article 6(1)(f) - Legitimate interests'
  }
});
```

### CCPA Compliance

```typescript
// Handle opt-out requests
await takedownSystem.addOptOut({
  type: 'email',
  value: 'california-resident@example.com',
  reason: 'CCPA opt-out request',
  source: 'user_request',
  addedBy: 'compliance-team'
});

// Track data sales (if applicable)
await provenanceTracker.logDataAccess({
  dataId: 'contact-123',
  userId: 'third-party-vendor',
  action: 'share',
  purpose: 'Data sharing with vendor',
  result: 'success'
});
```

## Testing

### Unit Tests

```typescript
import { complianceService, robotsChecker } from '@/lib/compliance';

describe('Compliance Service', () => {
  it('should block requests to disallowed paths', async () => {
    const result = await complianceService.checkCompliance({
      url: 'https://example.com/admin',
      purpose: 'testing',
      userId: 'test-user'
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('robots.txt');
  });

  it('should respect crawl delays', async () => {
    const result = await robotsChecker.isAllowed('https://example.com/page');
    
    if (result.crawlDelay) {
      expect(result.crawlDelay).toBeGreaterThan(0);
    }
  });
});
```

### Integration Tests

```typescript
describe('End-to-End Compliance', () => {
  it('should handle complete compliance workflow', async () => {
    // Submit takedown request
    const requestId = await complianceService.submitTakedownRequest({
      type: 'opt_out',
      requesterInfo: {
        name: 'Test User',
        email: 'test@example.com',
        relationship: 'subject'
      },
      requestDetails: {
        reason: 'Privacy request',
        description: 'Please opt me out',
        affectedData: ['email']
      },
      affectedRecords: {
        dataTypes: ['contact_info']
      }
    });

    // Check that domain is now opted out
    const isOptedOut = takedownSystem.isOptedOut('example.com', 'domain');
    expect(isOptedOut).toBe(true);

    // Verify compliance check blocks requests
    const complianceResult = await complianceService.checkCompliance({
      url: 'https://example.com/contact',
      purpose: 'testing',
      userId: 'test-user'
    });

    expect(complianceResult.allowed).toBe(false);
    expect(complianceResult.reason).toContain('opted out');
  });
});
```

This comprehensive compliance system ensures ethical data handling while maintaining detailed audit trails and respecting user privacy rights.