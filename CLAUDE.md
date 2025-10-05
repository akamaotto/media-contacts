# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
- `npm run dev` - Start development server on port 3000
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Testing
- `npm run test` - Run Jest unit tests
- `npm run test:watch` - Run Jest tests in watch mode
- `npm run test:unit` - Run unit tests with specific config
- `npm run test:e2e` - Run Playwright E2E tests
- `npm run test:e2e:headed` - Run E2E tests with browser UI
- `npm run test:e2e:auth` - Run authentication-specific E2E tests

### Database Operations
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate:dev` - Run development migrations
- `npm run db:migrate:prod` - Deploy migrations to production
- `npm run prisma:seed` - Seed database with initial data
- `npm run seed:admin` - Create admin user
- `npm run seed:media-contacts` - Import media contacts from CLI
- `npm run seed:media-contacts:sample` - Import sample media contacts

### Data Management
- `npm run db:backup:local` - Backup local database
- `npm run db:backup:prod` - Backup production database
- `npm run db:sync:local-to-prod` - Sync local to production
- `npm run db:sync:prod-to-local` - Sync production to local

## Architecture Overview

### Project Structure
This is a Next.js 15 application using the App Router with a layered architecture:

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes with MVC pattern
│   ├── dashboard/         # Dashboard pages
│   └── auth/              # Authentication pages
├── components/            # React components
│   ├── features/          # Feature-specific components
│   ├── ui/               # Reusable UI components (ShadCN)
│   └── layout/           # Layout components
├── lib/                   # Utilities and services
├── features/              # Feature modules (actions, queries)
└── services/              # Business logic services
```

### API Architecture
The API uses a custom MVC pattern with dependency injection:

- **BaseController**: Common request/response handling, authentication, pagination
- **BaseService**: Core business logic with context tracking
- **BaseRepository**: Data access layer with Prisma
- **DIContainer**: Simple dependency injection container
- **Events**: Event-driven architecture for cross-feature communication

### Database Schema
Core entities: media_contacts, outlets, beats, countries, categories, languages, publishers, regions
- Many-to-many relationships between contacts, outlets, beats, and geographic data
- Role-based access control (ADMIN/USER roles)
- Comprehensive activity logging
- Email verification status tracking

### Key Features
- **Virtualized Tables**: Handle 100k+ contacts using TanStack Table with React Virtual
- **Advanced Filtering**: Multi-dimensional filtering with Redis-backed caching
- **CSV Operations**: Bulk import/export with validation and chunked processing
- **Authentication**: NextAuth.js with Prisma adapter
- **Real-time Updates**: Activity tracking and dashboard metrics

### Technology Stack
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS, ShadCN UI
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL (Neon for production)
- **Caching**: Redis for filter suggestions and search results
- **Testing**: Jest (unit), Playwright (E2E)
- **Authentication**: NextAuth.js with Prisma adapter

### Development Patterns
- **Feature-based organization**: Each feature has its own components, actions, and queries
- **Shared base classes**: Controllers, services, and repositories inherit from base classes
- **Type safety**: Comprehensive TypeScript usage with Zod validation
- **Error handling**: Centralized error handling with user-friendly messages
- **Context tracking**: All operations include user context and audit trails

### Environment Configuration
Uses multiple environment files for different stages:
- `.env.local` - Local development secrets
- `.env.development` - Development environment
- `.env.production` - Production environment
- `.env.test` - Testing environment

### Seeding and Data Management
Comprehensive seeding system with:
- Geographic data (countries, regions, languages)
- Media outlet research and import
- Business contact research tools
- Sample data generation for development

### Monitoring and Maintenance
- Database connection monitoring
- API health checks
- Activity logging and metrics
- Performance monitoring
- Backup and sync tools