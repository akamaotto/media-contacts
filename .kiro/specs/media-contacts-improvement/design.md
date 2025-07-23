# Design Document

## Overview

This design document outlines the architectural improvements for the Media Contacts Management System to transform it from a functional prototype into a production-ready enterprise application. The design addresses performance bottlenecks, security vulnerabilities, scalability limitations, and maintainability issues identified in the current system.

The solution follows a layered architecture approach with clear separation of concerns, implementing modern best practices for Next.js applications, database optimization, API design, and user experience enhancement.

## Architecture

### Current Architecture Analysis

The existing system uses:
- **Frontend**: Next.js 15 with App Router, React 19, TypeScript, Tailwind CSS, ShadCN UI
- **Backend**: Next.js API Routes with Prisma ORM
- **Database**: PostgreSQL with basic schema
- **Authentication**: NextAuth.js 4.x with Prisma Adapter (needs migration to NextAuth 5)
- **State Management**: React useState with complex client-side state
- **Project Structure**: Disorganized with scattered actions and mixed component organization

### Proposed Architecture Improvements

#### 1. Enhanced Database Layer

**Current Issues:**
- Missing indexes on frequently queried fields
- Inefficient array-based relationships
- No full-text search optimization
- Limited query performance monitoring

**Proposed Solution:**
```sql
-- Performance Indexes
CREATE UNIQUE INDEX idx_media_contacts_email ON media_contacts(email);
CREATE INDEX idx_media_contacts_name_gin ON media_contacts USING gin(to_tsvector('english', name));
CREATE INDEX idx_media_contacts_search_gin ON media_contacts USING gin(
  to_tsvector('english', coalesce(name, '') || ' ' || coalesce(title, '') || ' ' || coalesce(bio, ''))
);
CREATE INDEX idx_media_contacts_updated_at ON media_contacts(updated_at DESC);
CREATE INDEX idx_media_contacts_email_verified ON media_contacts(email_verified_status);

-- Relationship Indexes
CREATE INDEX idx_media_contact_outlets ON _MediaContactOutlets(A, B);
CREATE INDEX idx_media_contact_countries ON _MediaContactCountries(A, B);
CREATE INDEX idx_media_contact_beats ON _MediaContactBeats(A, B);
CREATE INDEX idx_countries_regions ON _CountryRegions(A, B);
```

**Connection Pooling Configuration:**
```typescript
// Enhanced Prisma configuration
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
}).$extends({
  query: {
    $allOperations({ operation, model, args, query }) {
      const start = Date.now();
      const result = query(args);
      const end = Date.now();
      console.log(`${model}.${operation} took ${end - start}ms`);
      return result;
    },
  },
});
```

#### 2. API Layer Redesign

**Current Issues:**
- Inconsistent error handling
- No request validation middleware
- Missing rate limiting
- Lack of API documentation

**Proposed Solution:**

```typescript
// API Middleware Stack
interface ApiMiddleware {
  auth: (req: NextRequest) => Promise<Session | null>;
  validate: <T>(schema: z.ZodSchema<T>) => (data: unknown) => T;
  rateLimit: (identifier: string) => Promise<boolean>;
  errorHandler: (error: unknown) => NextResponse;
}

// Standardized API Response Format
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  meta?: {
    pagination?: PaginationMeta;
    timing?: number;
  };
}

// Enhanced Error Handling
class ApiError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
```

#### 3. Performance Optimization Layer

**Caching Strategy:**
```typescript
// Redis-based caching for frequently accessed data
interface CacheStrategy {
  // Cache filter options (countries, beats, regions) for 1 hour
  filterOptions: {
    ttl: 3600;
    key: 'filter-options';
  };
  
  // Cache search results for 5 minutes
  searchResults: {
    ttl: 300;
    key: (filters: string) => `search:${hash(filters)}`;
  };
  
  // Cache user sessions for 24 hours
  userSessions: {
    ttl: 86400;
    key: (userId: string) => `session:${userId}`;
  };
}

// Query Optimization
interface QueryOptimization {
  // Use cursor-based pagination for large datasets
  cursorPagination: {
    cursor: string; // last record ID
    limit: number;
    direction: 'forward' | 'backward';
  };
  
  // Implement query result streaming for exports
  streamingExport: {
    batchSize: 1000;
    format: 'csv' | 'json' | 'xlsx';
  };
}
```

#### 4. Enhanced State Management

**Current Issues:**
- Complex client-side state with multiple useState calls
- No state persistence
- Inefficient re-renders

**Proposed Solution:**
```typescript
// Zustand-based state management
interface AppState {
  // Media Contacts State
  contacts: {
    data: MediaContactTableItem[];
    filters: MediaContactFilters;
    pagination: PaginationState;
    loading: boolean;
    error: string | null;
  };
  
  // UI State
  ui: {
    sidebarOpen: boolean;
    theme: 'light' | 'dark';
    notifications: Notification[];
  };
  
  // User State
  user: {
    session: Session | null;
    preferences: UserPreferences;
  };
}

// Actions with optimistic updates
interface AppActions {
  contacts: {
    fetch: (filters?: MediaContactFilters) => Promise<void>;
    create: (contact: CreateContactData) => Promise<void>;
    update: (id: string, data: UpdateContactData) => Promise<void>;
    delete: (id: string) => Promise<void>;
    bulkImport: (file: File) => Promise<ImportResult>;
  };
}
```

## Components and Interfaces

### 1. Enhanced Repository Layer

```typescript
// Generic Repository Pattern
interface Repository<T, K = string> {
  findById(id: K): Promise<T | null>;
  findMany(filters?: FilterOptions<T>): Promise<PaginatedResult<T>>;
  create(data: CreateData<T>): Promise<T>;
  update(id: K, data: UpdateData<T>): Promise<T>;
  delete(id: K): Promise<void>;
  count(filters?: FilterOptions<T>): Promise<number>;
}

// Media Contact Repository Implementation
class MediaContactRepository implements Repository<MediaContact> {
  async findMany(filters?: MediaContactFilters): Promise<PaginatedResult<MediaContact>> {
    const query = this.buildQuery(filters);
    const [data, total] = await Promise.all([
      this.executeQuery(query),
      this.countQuery(query)
    ]);
    
    return {
      data,
      total,
      hasMore: data.length === filters?.limit,
      cursor: data[data.length - 1]?.id
    };
  }
  
  private buildQuery(filters?: MediaContactFilters): Prisma.MediaContactFindManyArgs {
    const where: Prisma.MediaContactWhereInput = {};
    
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { title: { contains: filters.search, mode: 'insensitive' } }
      ];
    }
    
    if (filters?.countries?.length) {
      where.countries = { some: { id: { in: filters.countries } } };
    }
    
    return {
      where,
      include: {
        outlets: true,
        countries: { include: { regions: true, languages: true } },
        beats: true
      },
      orderBy: { updatedAt: 'desc' },
      take: filters?.limit || 10,
      cursor: filters?.cursor ? { id: filters.cursor } : undefined,
      skip: filters?.cursor ? 1 : 0
    };
  }
}
```

### 2. Service Layer Architecture

```typescript
// Business Logic Services
interface MediaContactService {
  search(filters: SearchFilters): Promise<SearchResult>;
  bulkImport(file: File, options: ImportOptions): Promise<ImportResult>;
  export(filters: ExportFilters): Promise<ExportStream>;
  validateContact(data: ContactData): ValidationResult;
  deduplicateContacts(contacts: ContactData[]): DeduplicationResult;
}

class MediaContactServiceImpl implements MediaContactService {
  constructor(
    private repository: MediaContactRepository,
    private cacheService: CacheService,
    private validationService: ValidationService
  ) {}
  
  async search(filters: SearchFilters): Promise<SearchResult> {
    // Check cache first
    const cacheKey = this.generateCacheKey(filters);
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;
    
    // Execute search with performance monitoring
    const startTime = Date.now();
    const result = await this.repository.findMany(filters);
    const duration = Date.now() - startTime;
    
    // Cache results and return
    await this.cacheService.set(cacheKey, result, 300); // 5 minutes
    
    return {
      ...result,
      meta: { searchTime: duration }
    };
  }
  
  async bulkImport(file: File, options: ImportOptions): Promise<ImportResult> {
    const stream = file.stream();
    const parser = new CSVParser({ 
      batchSize: 1000,
      validation: this.validationService.validateContact
    });
    
    const results: ImportResult = {
      total: 0,
      successful: 0,
      failed: 0,
      errors: []
    };
    
    for await (const batch of parser.parse(stream)) {
      const batchResult = await this.processBatch(batch);
      results.total += batch.length;
      results.successful += batchResult.successful;
      results.failed += batchResult.failed;
      results.errors.push(...batchResult.errors);
      
      // Emit progress event
      this.emitProgress({
        processed: results.total,
        successful: results.successful,
        failed: results.failed
      });
    }
    
    return results;
  }
}
```

### 3. Enhanced UI Components

```typescript
// Virtualized Table Component
interface VirtualizedTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  height: number;
  itemHeight: number;
  loading?: boolean;
  onLoadMore?: () => void;
  onRowClick?: (row: T) => void;
}

function VirtualizedTable<T>({ data, columns, height, itemHeight, ...props }: VirtualizedTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan: 10
  });
  
  return (
    <div ref={parentRef} style={{ height, overflow: 'auto' }}>
      <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
        {rowVirtualizer.getVirtualItems().map((virtualRow) => (
          <TableRow
            key={virtualRow.index}
            data={data[virtualRow.index]}
            columns={columns}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: itemHeight,
              transform: `translateY(${virtualRow.start}px)`
            }}
            onClick={() => props.onRowClick?.(data[virtualRow.index])}
          />
        ))}
      </div>
    </div>
  );
}

// Smart Search Component with Debouncing
interface SmartSearchProps {
  onSearch: (query: string) => void;
  suggestions?: string[];
  placeholder?: string;
  debounceMs?: number;
}

function SmartSearch({ onSearch, suggestions, placeholder, debounceMs = 300 }: SmartSearchProps) {
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const debouncedSearch = useMemo(
    () => debounce(onSearch, debounceMs),
    [onSearch, debounceMs]
  );
  
  useEffect(() => {
    debouncedSearch(query);
  }, [query, debouncedSearch]);
  
  return (
    <div className="relative">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
      />
      
      {showSuggestions && suggestions && (
        <div className="absolute top-full left-0 right-0 bg-white border rounded-md shadow-lg z-10">
          {suggestions
            .filter(s => s.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 10)
            .map((suggestion, index) => (
              <button
                key={index}
                className="w-full text-left px-3 py-2 hover:bg-gray-100"
                onClick={() => {
                  setQuery(suggestion);
                  setShowSuggestions(false);
                }}
              >
                {suggestion}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
```

## Data Models

### Enhanced Database Schema

```prisma
// Enhanced Prisma Schema
model MediaContact {
  id                    String   @id @default(uuid())
  name                  String
  title                 String
  bio                   String?
  email                 String   @unique
  email_verified_status Boolean  @default(false)
  socials               String[] // Array of social media links/handles
  authorLinks           String[] // Array of author links (articles, blogs, etc.)
  
  // Metadata
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt
  created_by String?  // User who created this contact
  updated_by String?  // User who last updated this contact
  
  // Search optimization
  search_vector Unsupported("tsvector")?
  
  // Soft delete
  deleted_at DateTime?
  
  // Relationships (Many-to-Many)
  outlets   Outlet[]  @relation("MediaContactOutlets")
  countries Country[] @relation("MediaContactCountries")
  beats     Beat[]    @relation("MediaContactBeats")
  
  // Audit trail
  auditLogs AuditLog[]
  
  @@map("media_contacts")
  @@index([email])
  @@index([name])
  @@index([updated_at])
  @@index([email_verified_status])
  @@index([search_vector], type: Gin)
}

// Enhanced User model with preferences
model User {
  id             String   @id @default(cuid())
  name           String?
  email          String   @unique
  emailVerified  DateTime?
  hashedPassword String
  image          String?
  role           Role     @default(USER)
  
  // User preferences
  preferences    Json?    // Store user preferences as JSON
  last_login     DateTime?
  login_count    Int      @default(0)
  
  // Relationships
  accounts       Account[]
  sessions       Session[]
  auditLogs      AuditLog[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@map("users")
}

// Audit logging for compliance
model AuditLog {
  id          String   @id @default(uuid())
  action      String   // CREATE, UPDATE, DELETE, VIEW
  entity_type String   // MediaContact, User, etc.
  entity_id   String
  old_values  Json?
  new_values  Json?
  user_id     String
  ip_address  String?
  user_agent  String?
  created_at  DateTime @default(now())
  
  user        User     @relation(fields: [user_id], references: [id])
  
  @@map("audit_logs")
  @@index([entity_type, entity_id])
  @@index([user_id])
  @@index([created_at])
}

// System configuration
model SystemConfig {
  id          String   @id @default(uuid())
  key         String   @unique
  value       Json
  description String?
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt
  
  @@map("system_config")
}
```

### TypeScript Type Definitions

```typescript
// Enhanced type definitions
interface MediaContactTableItem {
  id: string;
  name: string;
  title: string;
  email: string;
  email_verified_status: boolean;
  bio?: string;
  socials: string[];
  authorLinks: string[];
  outlets: Outlet[];
  countries: Country[];
  beats: Beat[];
  created_at: Date;
  updated_at: Date;
  created_by?: string;
  updated_by?: string;
}

interface SearchFilters {
  query?: string;
  countries?: string[];
  beats?: string[];
  regions?: string[];
  languages?: string[];
  emailVerified?: 'all' | 'verified' | 'unverified';
  dateRange?: {
    from: Date;
    to: Date;
  };
  sortBy?: 'name' | 'email' | 'updated_at' | 'created_at';
  sortOrder?: 'asc' | 'desc';
  cursor?: string;
  limit?: number;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  hasMore: boolean;
  cursor?: string;
  meta?: {
    searchTime?: number;
    cacheHit?: boolean;
  };
}
```

## Error Handling

### Comprehensive Error Management

```typescript
// Error Classification System
enum ErrorCategory {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  DATABASE = 'DATABASE',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  RATE_LIMIT = 'RATE_LIMIT',
  SYSTEM = 'SYSTEM'
}

interface ErrorContext {
  category: ErrorCategory;
  code: string;
  message: string;
  statusCode: number;
  details?: Record<string, any>;
  timestamp: Date;
  requestId?: string;
  userId?: string;
}

// Error Handler Middleware
class ErrorHandler {
  static handle(error: unknown, context: Partial<ErrorContext> = {}): ApiResponse {
    const errorContext = this.categorizeError(error, context);
    
    // Log error for monitoring
    this.logError(errorContext);
    
    // Return user-friendly response
    return {
      success: false,
      error: {
        code: errorContext.code,
        message: this.getUserMessage(errorContext),
        ...(process.env.NODE_ENV === 'development' && { details: errorContext.details })
      }
    };
  }
  
  private static categorizeError(error: unknown, context: Partial<ErrorContext>): ErrorContext {
    if (error instanceof z.ZodError) {
      return {
        category: ErrorCategory.VALIDATION,
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        statusCode: 400,
        details: error.flatten(),
        timestamp: new Date(),
        ...context
      };
    }
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return this.handlePrismaError(error, context);
    }
    
    // Default system error
    return {
      category: ErrorCategory.SYSTEM,
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      statusCode: 500,
      timestamp: new Date(),
      ...context
    };
  }
}

// Client-side Error Boundary
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<PropsWithChildren, ErrorBoundaryState> {
  constructor(props: PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to monitoring service
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    // Send to error tracking service
    if (typeof window !== 'undefined') {
      // Send to Sentry or similar service
    }
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-8 w-8 text-red-500 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">Something went wrong</h1>
            </div>
            <p className="text-gray-600 mb-4">
              We're sorry, but something unexpected happened. Please try refreshing the page.
            </p>
            <Button 
              onClick={() => window.location.reload()}
              className="w-full"
            >
              Refresh Page
            </Button>
          </div>
        </div>
      );
    }
    
    return this.props.children;
  }
}
```

## Testing Strategy

### Multi-Layer Testing Approach

```typescript
// Unit Testing Strategy
describe('MediaContactService', () => {
  let service: MediaContactService;
  let mockRepository: jest.Mocked<MediaContactRepository>;
  
  beforeEach(() => {
    mockRepository = createMockRepository();
    service = new MediaContactServiceImpl(mockRepository, mockCacheService, mockValidationService);
  });
  
  describe('search', () => {
    it('should return cached results when available', async () => {
      const filters = { query: 'john' };
      const cachedResult = { data: [], total: 0 };
      
      mockCacheService.get.mockResolvedValue(cachedResult);
      
      const result = await service.search(filters);
      
      expect(result).toEqual(cachedResult);
      expect(mockRepository.findMany).not.toHaveBeenCalled();
    });
    
    it('should handle search errors gracefully', async () => {
      mockRepository.findMany.mockRejectedValue(new Error('Database error'));
      
      await expect(service.search({ query: 'test' })).rejects.toThrow('Database error');
    });
  });
});

// Integration Testing
describe('Media Contacts API', () => {
  let app: NextApiHandler;
  
  beforeAll(async () => {
    app = await createTestApp();
  });
  
  describe('GET /api/media-contacts', () => {
    it('should return paginated results', async () => {
      const response = await request(app)
        .get('/api/media-contacts')
        .query({ page: 1, limit: 10 })
        .expect(200);
      
      expect(response.body).toMatchObject({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String),
            email: expect.any(String)
          })
        ]),
        meta: expect.objectContaining({
          pagination: expect.objectContaining({
            total: expect.any(Number),
            hasMore: expect.any(Boolean)
          })
        })
      });
    });
  });
});

// Performance Testing
describe('Performance Tests', () => {
  it('should handle large dataset queries within acceptable time', async () => {
    const startTime = Date.now();
    
    const result = await service.search({
      query: 'test',
      limit: 1000
    });
    
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(1000); // Should complete within 1 second
    expect(result.data.length).toBeLessThanOrEqual(1000);
  });
  
  it('should handle concurrent requests efficiently', async () => {
    const requests = Array(10).fill(null).map(() => 
      service.search({ query: 'concurrent test' })
    );
    
    const startTime = Date.now();
    const results = await Promise.all(requests);
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(2000); // All requests should complete within 2 seconds
    expect(results).toHaveLength(10);
  });
});

// End-to-End Testing with Playwright
test('complete user workflow', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[data-testid=email]', 'test@example.com');
  await page.fill('[data-testid=password]', 'password');
  await page.click('[data-testid=login-button]');
  
  // Navigate to contacts
  await page.waitForURL('/');
  
  // Search for contacts
  await page.fill('[data-testid=search-input]', 'john');
  await page.waitForSelector('[data-testid=search-results]');
  
  // Verify results
  const results = await page.locator('[data-testid=contact-row]').count();
  expect(results).toBeGreaterThan(0);
  
  // Test pagination
  if (await page.locator('[data-testid=next-page]').isVisible()) {
    await page.click('[data-testid=next-page]');
    await page.waitForSelector('[data-testid=search-results]');
  }
  
  // Test contact creation
  await page.click('[data-testid=add-contact]');
  await page.fill('[data-testid=contact-name]', 'Test Contact');
  await page.fill('[data-testid=contact-email]', 'test@newcontact.com');
  await page.fill('[data-testid=contact-title]', 'Test Title');
  await page.click('[data-testid=save-contact]');
  
  // Verify contact was created
  await page.waitForSelector('[data-testid=success-message]');
});
```

#### 5. NextAuth 5 (Auth.js) Migration Architecture

**Current Issues:**
- NextAuth 4.x compatibility issues with Next.js 15
- Complex configuration scattered across multiple files
- Limited TypeScript support
- Middleware integration challenges

**Proposed Solution:**

```typescript
// New auth.ts in project root
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null
        
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })
        
        if (!user?.hashedPassword) return null
        
        const isValid = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        )
        
        if (!isValid) return null
        
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub
        session.user.role = token.role as string
      }
      return session
    },
    jwt({ token, user }) {
      if (user) {
        token.role = user.role
      }
      return token
    },
  },
  pages: {
    signIn: "/login",
    newUser: "/register",
  },
})
```

**Enhanced Middleware Integration:**
```typescript
// middleware.ts - Simplified with NextAuth 5
import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth
  
  // Protect admin routes
  if (pathname.startsWith('/admin')) {
    if (!isLoggedIn || req.auth?.user?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login', req.url))
    }
  }
  
  // Protect dashboard routes
  if (pathname.startsWith('/dashboard') || pathname === '/') {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
  }
  
  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
```

#### 6. Project Structure Refactor Architecture

**Current Structure Issues:**
```
src/
├── app/
│   ├── actions/          # ❌ Scattered actions
│   ├── login/           # ❌ Should be grouped
│   ├── profile/         # ❌ Should be grouped  
│   └── register/        # ❌ Should be grouped
├── backend/
│   └── media-contacts/
│       └── actions/     # ❌ Duplicate actions location
└── components/          # ❌ Mixed organization
    ├── media-contacts/  # ❌ Feature mixed with UI
    └── ui/             # ✅ Good separation
```

**Proposed Improved Structure:**
```
src/
├── app/
│   ├── (auth)/          # 🎯 Auth-related routes
│   │   ├── login/
│   │   │   ├── page.tsx
│   │   │   └── login-form.tsx
│   │   ├── register/
│   │   │   ├── page.tsx
│   │   │   └── register-form.tsx
│   │   └── layout.tsx   # Auth-specific layout
│   ├── (dashboard)/     # 🎯 Main app routes
│   │   ├── page.tsx     # Dashboard home
│   │   ├── profile/
│   │   │   ├── page.tsx
│   │   │   └── actions.ts
│   │   └── admin/
│   │       └── users/
│   ├── api/
│   │   ├── auth/
│   │   └── media-contacts/
│   ├── globals.css
│   └── layout.tsx       # Root layout
├── components/
│   ├── ui/              # 🎯 ShadCN/UI components only
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   └── ...
│   ├── features/        # 🎯 Feature-specific components
│   │   ├── auth/
│   │   │   ├── login-form.tsx
│   │   │   ├── register-form.tsx
│   │   │   └── user-avatar-menu.tsx
│   │   ├── media-contacts/
│   │   │   ├── contacts-table.tsx
│   │   │   ├── contact-form.tsx
│   │   │   ├── filters/
│   │   │   └── export/
│   │   └── user-management/
│   │       ├── user-profile.tsx
│   │       └── admin-panel.tsx
│   └── layout/          # 🎯 Layout components
│       ├── app-header.tsx
│       ├── app-layout.tsx
│       └── page-header.tsx
├── lib/
│   ├── actions/         # 🎯 Consolidated server actions
│   │   ├── auth.ts
│   │   ├── media-contacts.ts
│   │   └── users.ts
│   ├── services/        # 🎯 Business logic services
│   │   ├── media-contacts.service.ts
│   │   ├── auth.service.ts
│   │   └── export.service.ts
│   ├── utils/
│   ├── validations/     # 🎯 Zod schemas
│   └── types/          # 🎯 Shared TypeScript types
└── types/              # 🎯 Global type definitions
    ├── auth.ts
    ├── media-contacts.ts
    └── api.ts
```

**Migration Benefits:**

1. **Route Organization:**
   - Clear separation between auth and dashboard functionality
   - Easier navigation and maintenance
   - Better code splitting and loading performance

2. **Component Architecture:**
   - Feature-based organization improves maintainability
   - Clear separation between UI and business logic
   - Reusable components are easier to locate

3. **Action Consolidation:**
   - Single source of truth for server actions
   - Better type safety and error handling
   - Easier testing and debugging

4. **Service Layer:**
   - Business logic separated from UI components
   - Better testability and reusability
   - Clear API boundaries

This comprehensive design addresses all the identified gaps in the current system while maintaining compatibility with the existing codebase. The improvements focus on performance, scalability, maintainability, and user experience while following Next.js best practices and modern development patterns.