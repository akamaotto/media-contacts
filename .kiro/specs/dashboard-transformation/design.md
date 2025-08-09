# Design Document

## Overview

The dashboard transformation involves restructuring the current home page from a direct Media Contacts table view into a comprehensive analytics dashboard that provides insights, metrics, and activity feeds for the media relations platform. This design follows modern dashboard patterns with key performance indicators (KPIs), interactive visualizations, and real-time activity monitoring.

The transformation includes:
1. Converting the current home page (`/`) to a dashboard with analytics and metrics
2. Creating a dedicated Media Contacts page (`/media-contacts`) with the existing functionality
3. Updating navigation to reflect the new information architecture
4. Implementing responsive design patterns for mobile and desktop usage

## Architecture

### Component Architecture

```
Dashboard Page (/)
├── DashboardLayout (existing)
│   ├── MediaContactsSidebar (updated navigation)
│   └── DashboardContent
│       ├── MetricsSection
│       │   ├── MetricCard (Total Contacts)
│       │   ├── MetricCard (Total Publishers)
│       │   ├── MetricCard (Total Outlets)
│       │   └── MetricCard (Email Verification Rate)
│       ├── ChartsSection
│       │   ├── ContactsByCountryChart
│       │   ├── ContactsByBeatChart
│       │   ├── PublisherOutletDistribution
│       │   └── GeographicDistributionMap
│       └── ActivityFeedSection
│           ├── ActivityFeedHeader
│           ├── ActivityFeedList
│           └── ActivityFeedPagination

Media Contacts Page (/media-contacts)
├── DashboardLayout (existing)
│   ├── MediaContactsSidebar (updated navigation)
│   └── MediaContactsClientView (existing component)
```

### Data Flow Architecture

```
Dashboard Page
├── Server Components (RSC)
│   ├── getDashboardMetrics() → MetricsSection
│   ├── getDashboardChartData() → ChartsSection
│   └── getRecentActivity() → ActivityFeedSection
├── Client Components
│   ├── InteractiveCharts (Chart.js/Recharts)
│   ├── TimeRangeSelector
│   └── ActivityFeedFilters
└── API Routes (for real-time updates)
    ├── /api/dashboard/metrics
    ├── /api/dashboard/charts
    └── /api/dashboard/activity
```

### Database Query Strategy

The dashboard will use optimized queries to minimize database load:

1. **Aggregation Queries**: Use Prisma's aggregate functions for metrics
2. **Cached Results**: Implement Redis caching for frequently accessed data
3. **Incremental Loading**: Load charts and activity feeds progressively
4. **Real-time Updates**: Use WebSocket connections for live activity feeds

## Components and Interfaces

### Core Dashboard Components

#### 1. MetricCard Component
```typescript
interface MetricCardProps {
  title: string;
  value: number | string;
  change?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
    period: string;
  };
  icon: React.ComponentType;
  description?: string;
  loading?: boolean;
}
```

#### 2. DashboardChart Component
```typescript
interface DashboardChartProps {
  title: string;
  type: 'bar' | 'pie' | 'line' | 'area' | 'map';
  data: ChartDataPoint[];
  timeRange: '7d' | '30d' | '3m' | '1y';
  onTimeRangeChange: (range: string) => void;
  loading?: boolean;
  height?: number;
}

interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
  metadata?: Record<string, any>;
}
```

#### 3. ActivityFeed Component
```typescript
interface ActivityFeedProps {
  activities: ActivityItem[];
  loading?: boolean;
  onLoadMore: () => void;
  hasMore: boolean;
}

interface ActivityItem {
  id: string;
  type: 'create' | 'update' | 'delete' | 'import' | 'export';
  entity: 'media_contact' | 'outlet' | 'publisher' | 'beat' | 'category';
  entityName: string;
  user: {
    name: string;
    email: string;
  };
  timestamp: Date;
  details?: Record<string, any>;
}
```

### Navigation Updates

#### Updated Sidebar Navigation
```typescript
const navigationData = {
  navMain: [
    {
      title: "Dashboard",
      url: "/",
      icon: IconDashboard,
      isActive: pathname === "/"
    },
    {
      title: "Media Contacts",
      url: "/media-contacts",
      icon: IconUsers,
      isActive: pathname === "/media-contacts"
    },
    // ... existing navigation items
  ]
}
```

### Backend Services

#### 1. Dashboard Metrics Service
```typescript
interface DashboardMetrics {
  totalContacts: number;
  totalPublishers: number;
  totalOutlets: number;
  emailVerificationRate: number;
  contactsChange: MetricChange;
  publishersChange: MetricChange;
  outletsChange: MetricChange;
  verificationChange: MetricChange;
}

interface MetricChange {
  value: number;
  percentage: number;
  period: string;
}
```

#### 2. Chart Data Service
```typescript
interface ChartDataService {
  getContactsByCountry(timeRange: string): Promise<ChartDataPoint[]>;
  getContactsByBeat(timeRange: string): Promise<ChartDataPoint[]>;
  getPublisherDistribution(): Promise<ChartDataPoint[]>;
  getGeographicDistribution(): Promise<GeographicDataPoint[]>;
  getActivityTrends(timeRange: string): Promise<ChartDataPoint[]>;
}

interface GeographicDataPoint {
  countryCode: string;
  countryName: string;
  contactCount: number;
  coordinates: [number, number];
}
```

#### 3. Activity Tracking Service
```typescript
interface ActivityTrackingService {
  logActivity(activity: Omit<ActivityItem, 'id' | 'timestamp'>): Promise<void>;
  getRecentActivities(limit: number, offset: number): Promise<ActivityItem[]>;
  getActivitiesByType(type: ActivityItem['type']): Promise<ActivityItem[]>;
  getActivitiesByUser(userId: string): Promise<ActivityItem[]>;
}
```

## Data Models

### Dashboard Metrics Model
```typescript
// New Prisma model for tracking metrics over time
model DashboardMetric {
  id          String   @id @default(uuid())
  metricType  String   // 'total_contacts', 'total_publishers', etc.
  value       Int
  date        DateTime @default(now())
  metadata    Json?    // Additional context data
  
  @@map("dashboard_metrics")
  @@index([metricType, date])
}
```

### Activity Log Model
```typescript
// New Prisma model for activity tracking
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
  
  @@map("activity_logs")
  @@index([timestamp])
  @@index([type, entity])
  @@index([userId])
}
```

### Chart Data Aggregation Views
```sql
-- Database views for optimized chart data queries
CREATE VIEW contact_country_stats AS
SELECT 
  c.id as country_id,
  c.name as country_name,
  c.code as country_code,
  c.flag_emoji,
  COUNT(mc.id) as contact_count
FROM countries c
LEFT JOIN _MediaContactCountries mcc ON c.id = mcc.B
LEFT JOIN media_contacts mc ON mcc.A = mc.id
GROUP BY c.id, c.name, c.code, c.flag_emoji;

CREATE VIEW beat_contact_stats AS
SELECT 
  b.id as beat_id,
  b.name as beat_name,
  b.description,
  COUNT(mc.id) as contact_count
FROM beats b
LEFT JOIN _MediaContactBeats mcb ON b.id = mcb.B
LEFT JOIN media_contacts mc ON mcb.A = mc.id
GROUP BY b.id, b.name, b.description;
```

## Error Handling

### Dashboard Error Boundaries
```typescript
interface DashboardErrorBoundaryProps {
  fallback: React.ComponentType<{ error: Error; retry: () => void }>;
  children: React.ReactNode;
}

// Error states for different dashboard sections
interface DashboardErrorStates {
  metricsError?: Error;
  chartsError?: Error;
  activityError?: Error;
}
```

### Loading States
```typescript
interface DashboardLoadingStates {
  metricsLoading: boolean;
  chartsLoading: boolean;
  activityLoading: boolean;
}
```

### Fallback Components
- **MetricsSkeletonLoader**: Animated placeholders for metric cards
- **ChartSkeletonLoader**: Chart-shaped loading animations
- **ActivitySkeletonLoader**: List-style loading placeholders
- **ErrorFallback**: User-friendly error messages with retry buttons

## Testing Strategy

### Unit Testing
- **Component Testing**: Test individual dashboard components with Jest and React Testing Library
- **Service Testing**: Test backend services with mock data
- **Utility Testing**: Test chart data transformation functions

### Integration Testing
- **API Testing**: Test dashboard API endpoints with realistic data
- **Database Testing**: Test aggregation queries and performance
- **Navigation Testing**: Test routing between dashboard and media contacts pages

### End-to-End Testing
- **Dashboard Flow**: Test complete dashboard loading and interaction
- **Navigation Flow**: Test navigation between dashboard and media contacts
- **Responsive Testing**: Test dashboard on different screen sizes
- **Performance Testing**: Test dashboard loading times and chart rendering

### Performance Testing
- **Metrics**: Dashboard should load within 2 seconds
- **Charts**: Chart rendering should complete within 1 second
- **Activity Feed**: Activity feed should load incrementally without blocking UI

## Security Considerations

### Data Access Control
- **Role-based Metrics**: Admin users see additional system metrics
- **Data Filtering**: Users only see data they have permission to access
- **API Rate Limiting**: Prevent abuse of dashboard API endpoints

### Privacy Protection
- **Data Anonymization**: Activity logs don't expose sensitive contact information
- **Audit Trails**: Track who accesses dashboard data and when
- **GDPR Compliance**: Ensure dashboard data handling complies with privacy regulations

## Performance Optimizations

### Caching Strategy
- **Redis Caching**: Cache aggregated metrics for 5 minutes
- **Browser Caching**: Cache chart data with appropriate cache headers
- **CDN Integration**: Serve static chart assets from CDN

### Database Optimizations
- **Indexed Queries**: Ensure all dashboard queries use appropriate indexes
- **Query Batching**: Batch multiple metric queries into single database calls
- **Connection Pooling**: Use connection pooling for dashboard API endpoints

### Frontend Optimizations
- **Code Splitting**: Lazy load chart libraries and dashboard components
- **Virtual Scrolling**: Use virtual scrolling for long activity feeds
- **Memoization**: Memoize expensive chart calculations
- **Progressive Loading**: Load dashboard sections progressively

## Accessibility

### WCAG Compliance
- **Keyboard Navigation**: All dashboard interactions accessible via keyboard
- **Screen Reader Support**: Proper ARIA labels for charts and metrics
- **Color Contrast**: Ensure sufficient contrast for all dashboard elements
- **Focus Management**: Proper focus management for interactive elements

### Chart Accessibility
- **Alternative Text**: Provide text alternatives for chart data
- **Data Tables**: Offer tabular view of chart data for screen readers
- **High Contrast Mode**: Support high contrast mode for better visibility

## Mobile Responsiveness

### Responsive Design Patterns
- **Stacked Layout**: Stack metric cards vertically on mobile
- **Collapsible Charts**: Allow charts to be collapsed/expanded on mobile
- **Touch Interactions**: Optimize chart interactions for touch devices
- **Simplified Navigation**: Streamlined navigation for mobile users

### Mobile-Specific Features
- **Swipe Gestures**: Support swipe gestures for chart navigation
- **Pull-to-Refresh**: Implement pull-to-refresh for dashboard updates
- **Offline Support**: Cache dashboard data for offline viewing