# Design Document

## Overview

This design addresses three critical issues in the dashboard application:

1. **Chart Visualization Issues**: The Contacts by Category pie chart has overlapping text labels and unnecessary whitespace, while the Contacts by Country bar chart has negative spacing issues.

2. **Activity Feed Malfunction**: The activity feed is not displaying recent activities despite CRUD operations being performed across the application.

3. **Beats CRUD Operations Failure**: Creating and updating beats is failing with "Failed to create beat" errors.

The solution involves optimizing chart rendering configurations, ensuring proper activity logging integration, and fixing the beats API error handling.

## Architecture

### Chart Optimization Architecture

The chart improvements will focus on the `DashboardChart` component and its usage in `CategoryChartCard` and `CountryChartCard`. The architecture leverages Recharts library configurations to:

- Hide pie chart labels and implement hover-based tooltips
- Optimize chart margins and spacing
- Ensure responsive container sizing

### Activity Feed Architecture

The activity feed system consists of:
- **ActivityTrackingService**: Backend service for logging and retrieving activities
- **Activity API Routes**: RESTful endpoints for activity data
- **ActivityFeed Component**: Frontend component for displaying activities
- **Database Integration**: ActivityLog model in Prisma schema

The issue appears to be in the integration between CRUD operations and activity logging.

### Beats CRUD Architecture

The beats system follows a standard three-tier architecture:
- **API Layer**: `/api/beats` routes handling HTTP requests
- **Service Layer**: `beats/actions.ts` containing business logic
- **Data Layer**: Prisma ORM with PostgreSQL database

## Components and Interfaces

### Chart Components

#### Modified DashboardChart Component
```typescript
interface ChartOptimizations {
  // Pie chart specific optimizations
  hidePieLabels: boolean;
  enhancedTooltips: boolean;
  optimizedMargins: ChartMargins;
  
  // Bar chart specific optimizations
  reducedNegativeSpace: boolean;
  responsiveBarSizing: boolean;
}

interface ChartMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}
```

#### Enhanced Tooltip Component
```typescript
interface EnhancedTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  showCategoryInfo?: boolean;
  showCountryInfo?: boolean;
}
```

### Activity Feed Components

#### Activity Integration Interface
```typescript
interface ActivityIntegration {
  ensureActivityLogging: (operation: CRUDOperation) => Promise<void>;
  validateActivityLogModel: () => Promise<boolean>;
  repairActivityFeed: () => Promise<void>;
}

interface CRUDOperation {
  type: 'create' | 'update' | 'delete';
  entity: string;
  entityId: string;
  entityName: string;
  userId: string;
  details?: Record<string, any>;
}
```

### Beats CRUD Components

#### Enhanced Error Handling Interface
```typescript
interface BeatsErrorHandling {
  validateBeatData: (data: BeatFormData) => ValidationResult;
  handleDatabaseErrors: (error: Error) => APIErrorResponse;
  ensureTransactionIntegrity: () => Promise<void>;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

interface APIErrorResponse {
  error: string;
  statusCode: number;
  details?: any;
}
```

## Data Models

### Chart Data Models

```typescript
interface OptimizedChartData {
  // Pie chart data with enhanced metadata
  pieData: {
    name: string;
    value: number;
    color: string;
    percentage: number;
    metadata: {
      description?: string;
      totalContacts: number;
    };
  }[];
  
  // Bar chart data with spacing optimization
  barData: {
    name: string;
    value: number;
    color: string;
    metadata: {
      countryCode?: string;
      flagEmoji?: string;
      totalContacts: number;
    };
  }[];
}
```

### Activity Feed Data Models

The existing `ActivityLog` model in the database is correctly structured:

```sql
model ActivityLog {
  id          String   @id @default(uuid())
  type        String   // 'create', 'update', 'delete', 'import', 'export'
  entity      String   // 'media_contact', 'outlet', 'publisher', etc.
  entityId    String   // ID of the affected entity
  entityName  String   // Human-readable name of the entity
  userId      String   // User who performed the action
  details     Json?    // Additional details about the action
  timestamp   DateTime @default(now())
  
  user        User     @relation(fields: [userId], references: [id])
}
```

### Beats Data Models

The existing `Beat` model is properly structured. The issue is in error handling and validation:

```typescript
interface BeatFormData {
  name: string;
  description?: string;
  categoryIds?: string[];
}

interface BeatValidation {
  nameRequired: boolean;
  nameLength: { min: number; max: number };
  descriptionLength: { max: number };
  categoryIdsValidation: boolean;
}
```

## Error Handling

### Chart Error Handling

```typescript
interface ChartErrorHandling {
  handleDataFetchErrors: (error: Error) => ChartErrorState;
  handleRenderingErrors: (error: Error) => ChartErrorState;
  provideGracefulDegradation: () => ChartFallbackState;
}
```

### Activity Feed Error Handling

```typescript
interface ActivityErrorHandling {
  handleMissingActivityLogs: () => Promise<void>;
  handleDatabaseConnectionErrors: (error: Error) => ActivityErrorState;
  handleUserSessionErrors: (error: Error) => ActivityErrorState;
}
```

### Beats Error Handling

```typescript
interface BeatsErrorHandling {
  handleValidationErrors: (errors: ValidationError[]) => APIResponse;
  handleDatabaseConstraintErrors: (error: PrismaError) => APIResponse;
  handleAuthenticationErrors: (error: AuthError) => APIResponse;
  handleUnexpectedErrors: (error: Error) => APIResponse;
}
```

## Testing Strategy

### Chart Testing

1. **Visual Regression Tests**: Ensure charts render correctly without text overlap
2. **Interaction Tests**: Verify hover tooltips work properly
3. **Responsive Tests**: Confirm charts adapt to different container sizes
4. **Data Handling Tests**: Test with various data sets including edge cases

### Activity Feed Testing

1. **Integration Tests**: Verify activity logging works across all CRUD operations
2. **API Tests**: Test activity retrieval endpoints with various filters
3. **Real-time Tests**: Confirm activity feed updates without page refresh
4. **Performance Tests**: Ensure activity feed performs well with large datasets

### Beats CRUD Testing

1. **API Tests**: Test all beats endpoints (GET, POST, PUT, DELETE)
2. **Validation Tests**: Verify form validation works correctly
3. **Error Handling Tests**: Test various error scenarios
4. **Integration Tests**: Ensure beats operations integrate with activity logging

### Test Data Requirements

```typescript
interface TestDataSets {
  chartData: {
    emptyDataSet: ChartDataPoint[];
    smallDataSet: ChartDataPoint[];
    largeDataSet: ChartDataPoint[];
    edgeCaseDataSet: ChartDataPoint[];
  };
  
  activityData: {
    recentActivities: ActivityItem[];
    historicalActivities: ActivityItem[];
    mixedUserActivities: ActivityItem[];
  };
  
  beatsData: {
    validBeatData: BeatFormData[];
    invalidBeatData: BeatFormData[];
    duplicateBeatData: BeatFormData[];
  };
}
```

## Implementation Approach

### Phase 1: Chart Optimization
- Modify pie chart configuration to hide labels
- Implement enhanced tooltips with category information
- Optimize chart margins and container sizing
- Fix bar chart negative spacing issues

### Phase 2: Activity Feed Repair
- Investigate and fix activity logging integration
- Ensure all CRUD operations properly log activities
- Test activity feed real-time updates
- Optimize activity feed performance

### Phase 3: Beats CRUD Fix
- Identify and fix the root cause of beats creation failures
- Improve error handling and validation
- Ensure proper integration with activity logging
- Add comprehensive error messages

### Phase 4: Testing and Validation
- Implement comprehensive test suites for all components
- Perform integration testing across the entire system
- Validate fixes with real user scenarios
- Performance testing and optimization