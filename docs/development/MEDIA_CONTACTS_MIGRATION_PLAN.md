# Media Contacts Feature Migration Plan

## Overview

This document outlines the comprehensive migration plan for the Media Contacts feature from the current server actions architecture to the repository-service pattern with validated Zod object types, following the established patterns from beats and categories implementations.

## Phase 1: Comprehensive Feature Analysis

### 1.1 Repository Pattern Study

**Established Patterns:**
- Repository-Service pattern with clear separation of concerns
- Base class inheritance for common functionality
- Zod validation for strong typing with runtime validation
- Event system for cache invalidation and notifications
- Multi-level caching with TTL management
- Comprehensive error categorization and handling

**Key Components:**
- `BaseServiceImpl`: Abstract service with CRUD operations and lifecycle hooks
- `BasePrismaRepository`: Abstract repository with Prisma integration
- `NamedRepository`: Interface for name-based lookups
- Zod schemas for all data types
- Event system for cache invalidation
- Performance optimizations (batching, minimal selects)

### 1.2 Media Contacts Feature Deep Dive

**Data Layer Analysis:**
The media_contacts table has the following relationships:
- Many-to-many with outlets via `MediaContactOutlets` relation
- Many-to-many with countries via `MediaContactCountries` relation
- Many-to-many with beats via `MediaContactBeats` relation

**Key Fields:**
- `id`: UUID primary key
- `name`: Required string
- `title`: Required string
- `bio`: Optional text
- `email`: Required unique string
- `email_verified_status`: Boolean with default false
- `socials`: String array
- `authorLinks`: String array
- `created_at`: DateTime with default now()
- `updated_at`: DateTime

**Relationship Mapping:**
1. **Outlets**: Contacts can be associated with multiple outlets
2. **Countries**: Contacts can be associated with multiple countries
3. **Beats**: Contacts can be associated with multiple beats

**Server Functions Analysis:**
Currently, media contacts use server actions with:
- `getMediaContactsAction`: Fetch contacts with filters
- `upsertMediaContactAction`: Create/update contacts
- `deleteMediaContactAction`: Delete contacts

**UI Components Analysis:**
The frontend uses a comprehensive set of components:
- Fast table with optimized rendering
- API client view for data fetching
- Filter components for search
- Autocomplete components for related entities
- Sheet components for viewing/editing contacts

## Phase 2: Migration Strategy Development

### 2.1 Architecture Design

**Repository Interface Design:**
```typescript
interface MediaContactsRepository extends BaseRepository<MediaContact, CreateMediaContactData, UpdateMediaContactData, MediaContactsFilters> {
  findByEmail(email: string): Promise<MediaContact | null>;
  search(query: string, limit?: number): Promise<MediaContact[]>;
  // Additional specialized methods
}
```

**Service Layer Structure:**
```typescript
class MediaContactsService extends BaseServiceImpl<MediaContact, CreateMediaContactData, UpdateMediaContactData, MediaContactsFilters> {
  // Business logic methods
  validatePermissions()
  validateData()
  onCreated()
  onUpdated()
  onDeleted()
  // Specialized methods
  searchContacts()
  verifyEmail()
  // Bulk operations
  importFromCsv()
  exportToCsv()
}
```

**Controller Layer Design:**
REST endpoints following the pattern:
- `GET /api/media-contacts` - List with pagination/filters
- `GET /api/media-contacts/:id` - Get single contact
- `POST /api/media-contacts` - Create contact
- `PUT /api/media-contacts/:id` - Update contact
- `DELETE /api/media-contacts/:id` - Delete contact
- `POST /api/media-contacts/import` - CSV import
- `POST /api/media-contacts/export` - CSV export

### 2.2 Data Structure Planning

**Zod Schemas:**
Comprehensive validation schemas for all data types:
- `MediaContactSchema`: Core entity schema
- `CreateMediaContactDataSchema`: Schema for creating contacts
- `UpdateMediaContactDataSchema`: Schema for updating contacts
- `MediaContactsFiltersSchema`: Schema for filtering contacts

### 2.3 API Endpoint Structure

**Main CRUD Endpoints:**
- `GET /api/media-contacts` - List contacts with pagination and filters
- `POST /api/media-contacts` - Create new contact
- `GET /api/media-contacts/:id` - Get contact details
- `PUT /api/media-contacts/:id` - Update contact
- `DELETE /api/media-contacts/:id` - Delete contact

**Specialized Endpoints:**
- `GET /api/media-contacts/search?q=term` - Search contacts
- `POST /api/media-contacts/bulk` - Bulk operations
- `POST /api/media-contacts/import` - CSV import
- `POST /api/media-contacts/export` - CSV export

## Phase 3: Detailed Implementation Plan

### 3.1 Backend Implementation Strategy

**Process Planning:**
1. **Phase 1**: Implement core repository and service classes
2. **Phase 2**: Create API routes with proper error handling
3. **Phase 3**: Migrate existing functionality to new architecture
4. **Phase 4**: Implement caching and performance optimizations
5. **Phase 5**: Add comprehensive testing

**Performance Optimization:**
- Implement caching with appropriate TTL values (5 minutes for lists, 30 minutes for reference data)
- Use minimal select clauses for list views
- Implement batch operations for bulk imports
- Add database indexes for frequently queried fields

### 3.2 Frontend Implementation Strategy

**UI Migration Planning:**
1. Update API client to use new endpoints
2. Replace server actions with API calls
3. Maintain existing UI components with minimal changes
4. Implement proper loading and error states

### 3.3 Testing Strategy

**Backend Testing:**
- Unit tests for repository methods
- Unit tests for service methods
- Integration tests for API endpoints
- Performance tests for high-load scenarios

**Frontend Testing:**
- Component tests for UI elements
- Integration tests for API interactions
- E2E tests for complete user workflows

## Phase 4: Deliverables

### Implementation Roadmap

**Phase 1: Foundation (Week 1)**
- Create Zod schemas and type definitions
- Implement MediaContactsRepository
- Implement MediaContactsService
- Set up basic API routes

**Phase 2: Core Functionality (Week 2)**
- Implement full CRUD operations
- Add search and filtering capabilities
- Implement relationship management
- Add proper error handling

**Phase 3: Advanced Features (Week 3)**
- Implement CSV import/export
- Add caching and performance optimizations
- Implement bulk operations
- Add activity tracking

**Phase 4: Testing and Refinement (Week 4)**
- Add comprehensive unit tests
- Add integration tests
- Performance testing and optimization
- Documentation and final review

## Success Criteria

- Zero functionality loss during migration
- Improved performance metrics (20% faster API responses)
- Consistent architecture with beats/categories patterns
- Comprehensive test coverage (>80%)
- Proper error handling and logging
- Scalable and maintainable code structure

## Technical Specifications

### Zod Schema Definitions

All data types are validated using Zod schemas with comprehensive validation rules.

### Repository Interface Specifications

The repository implements all standard CRUD operations plus specialized methods for searching and relationship management.

### Service Layer Method Specifications

The service layer implements business logic including validation, permissions, and event handling.

### API Endpoint Specifications

All API endpoints follow REST conventions with proper HTTP status codes and error handling.

## Risk Assessment and Mitigation

**Risks:**
1. Data loss during migration
2. Performance degradation
3. Breaking existing functionality
4. Incomplete test coverage

**Mitigation Strategies:**
1. Comprehensive backup before migration
2. Performance testing at each phase
3. Gradual rollout with feature flags
4. 100% test coverage for critical paths

## Conclusion

This migration plan provides a comprehensive roadmap for modernizing the Media Contacts feature while maintaining backward compatibility and improving performance. The implementation follows established patterns and best practices from the existing codebase.