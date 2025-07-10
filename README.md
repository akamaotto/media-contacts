# Media Contacts Management System

A modern web application for managing media contacts, built with Next.js 15, Prisma and PostgreSQL This internal tool allows users to efficiently manage a large database of journalists, bloggers, and media contacts with powerful search, filtering, and organization capabilities.

## Features

### Media Contacts Management
- **CRUD Operations**: Create, read, update, and delete media contacts
- **Advanced Search**: Full-text search across all contact fields
- **Filtering**: Filter contacts by outlets, countries, and beats
- **CSV Import/Export**: Bulk import and export contacts via CSV
- **Virtualized Table**: Efficiently handle large datasets (100k+ contacts)

### Authentication & User Management
- **Email/Password Authentication**: Secure login with NextAuth.js
- **Role-Based Access Control**: Admin and regular user roles
- **User Management**: Admins can create, edit, and delete users
- **Profile Management**: Users can update their profile information

### Smart Autocomplete Features
- **Outlet Autocomplete**: Search existing outlets or add new ones
- **Beat Autocomplete**: Search existing beats or add new ones
- **Country Selection**: Select from a standardized list of countries

## Tech Stack

- **Frontend**: Next.js 15+ (App Router), React 19, TypeScript, Tailwind CSS
- **UI Components**: ShadCN UI (based on Radix UI), TanStack Table v8 with React Virtual
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: NextAuth.js with Prisma Adapter
- **Form Handling**: React Hook Form with Zod validation
- **Testing**: Playwright for E2E testing

## Installation

### Prerequisites

- Node.js 18+ (LTS recommended)
- PostgreSQL 14+ (for local development)
- npm or yarn

### Setup Instructions

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/media-contacts.git
cd media-contacts
```

2. **Install dependencies**

```bash
npm install
# or
yarn install
```

3. **Set up environment variables**

Copy the example environment file to create your local environment file:

```bash
cp .env.example .env
```

Then edit the `.env` file with your specific configuration:

```env
# Database (Local PostgreSQL)
DATABASE_URL="postgresql://username:password@localhost:5432/media_contacts"

# NextAuth.js
NEXTAUTH_URL=http://localhost:3000
# Generate a secure secret with: openssl rand -base64 32
NEXTAUTH_SECRET="generate-a-secure-random-secret-here"
```

> **IMPORTANT SECURITY NOTE:** Never commit `.env` files to version control. They contain sensitive information like database credentials and API keys. The `.gitignore` file is configured to exclude these files.

4. **Set up the database**

```bash
# For local development
npx prisma migrate dev

# For production
npm run db:migrate:prod
```

5. **Seed the database with initial data**

```bash
# For local development
npm run prisma:seed

# For production
npm run db:seed:prod
```

6. **Create an admin user**

```bash
# For local development
npm run seed:admin

# For production
npm run db:admin:prod
```

7. **Start the development server**

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Development

### Project Structure

```
media-contacts/
├── .env                    # Local environment variables
├── .env.development       # Development environment variables
├── .env.production        # Production environment variables
├── prisma/                 # Prisma schema and migrations
│   ├── schema.prisma      # Database schema definition
│   ├── seed.ts            # Database seeding script
│   └── seed-admin.js      # Admin user creation script
├── public/                 # Static assets
├── src/
│   ├── app/                # Next.js App Router pages
│   │   ├── actions/        # Server actions
│   │   ├── admin/          # Admin dashboard pages
│   │   │   └── users/      # User management pages
│   │   ├── api/            # API routes
│   │   │   ├── auth/       # NextAuth.js API routes
│   │   │   └── media/      # Media contacts API routes
│   │   ├── login/          # Authentication pages
│   │   ├── profile/        # User profile pages
│   │   └── register/       # Registration pages (admin only)
│   ├── components/         # React components
│   │   ├── auth/           # Authentication components
│   │   ├── media-contacts/ # Media contacts components
│   │   │   ├── filters/    # Filter components
│   │   │   └── forms/      # Form components
│   │   └── ui/             # ShadCN UI components
│   └── lib/                # Utility functions and helpers
│       ├── auth/           # Authentication utilities
│       ├── db/             # Database utilities
│       └── utils/          # General utilities
└── tests/                  # E2E tests with Playwright
```

### Available Scripts

#### Development Scripts
- `npm run dev`: Start the development server with Turbopack
- `npm run build`: Build the application for production
- `npm run start`: Start the production server
- `npm run lint`: Run ESLint

#### Database Scripts
- `npm run prisma:seed`: Seed the local database with test data
- `npm run seed:admin`: Create an admin user in local database
- `npm run db:push`: Push schema changes to local database
- `npm run db:push:prod`: Push schema changes to Neon production database
- `npm run db:migrate:dev`: Run migrations on local database
- `npm run db:migrate:prod`: Run migrations on Neon production database
- `npm run db:seed:prod`: Seed the Neon production database
- `npm run db:admin:prod`: Create an admin user in Neon production database

#### Testing Scripts
- `npm run test:e2e`: Run Playwright E2E tests
- `npm run test:e2e:headed`: Run Playwright tests in headed mode

## Database Configuration

This application supports both local PostgreSQL for development and Neon PostgreSQL for production.

### Local Development Database

For local development, the application uses a PostgreSQL database running on your local machine. This provides fast development experience without incurring cloud costs.

### Neon PostgreSQL for Production

For production, the application uses [Neon](https://neon.tech) - a serverless PostgreSQL service with the following benefits:

- **Serverless**: Auto-scaling compute that scales to zero when not in use
- **Branching**: Development and production branches with isolated environments
- **High Performance**: Low-latency database access with connection pooling
- **Cost-Effective**: Pay only for what you use with compute that scales to zero

### Database Structure

The database schema is managed through Prisma and includes the following main tables:

- **users**: User accounts with role-based access control
- **media_contacts**: Core table for journalist and media contact information
- **outlets**: Media outlets (publications, websites, TV stations, etc.)
- **beats**: Subject areas or topics that journalists cover
- **countries**: Countries where media contacts are based
- **languages**: Languages that media contacts speak

Junction tables handle many-to-many relationships between these entities.

## Performance Optimizations

This application is optimized for handling large datasets (100k+ contacts) with the following strategies:

- **Server-side pagination**: Efficient data fetching with cursor-based pagination
- **Virtualized tables**: Render only visible rows using TanStack Table with React Virtual
- **Debounced inputs**: Reduce server requests from search and filter inputs
- **Database optimization**: Proper indexing for fast queries
- **Chunked CSV processing**: Handle large imports/exports efficiently

## Authentication and Authorization

The application uses NextAuth.js with the following features:

- **Credentials Provider**: Email/password authentication
- **Prisma Adapter**: Store sessions and user data in PostgreSQL
- **Role-Based Access**: Admin and regular user roles
- **Protected Routes**: Middleware for route protection
- **User Avatar Dropdown**: Access to profile, admin features, and logout
- **Private Registration**: Only admins can create new users
- **Profile Management**: Users can update their own information

## Deployment

This application is designed to be deployed to any modern hosting platform that supports Next.js applications. Here are the recommended deployment options:

### Vercel (Recommended)

#### Initial Setup
1. Connect your GitHub repository to Vercel
2. Set up the following environment variables in the Vercel dashboard:
   - `DATABASE_URL` (Neon PostgreSQL connection string)
   - `NEXTAUTH_URL` (Your production domain)
   - `NEXTAUTH_SECRET` (Generate with `openssl rand -base64 32`)

#### Environment Variables Security Best Practices

1. **Use Vercel's Environment Variables UI**
   - Store all secrets in Vercel's Environment Variables section
   - Mark sensitive variables as encrypted
   - Never hardcode secrets in your codebase

2. **Environment Separation**
   - Set different values for Production, Preview, and Development environments
   - Use development-specific values for preview deployments
   - Never use production credentials in preview environments

3. **Secret Rotation**
   - Regularly rotate sensitive secrets like `NEXTAUTH_SECRET`
   - Update database credentials periodically
   - Revoke and regenerate any compromised secrets immediately

4. **Access Control**
   - Limit access to environment variables in the Vercel dashboard
   - Use Vercel teams with appropriate permissions
   - Audit access to production secrets regularly

### Other Hosting Platforms

For other hosting platforms like Netlify, Railway, or a custom server:

1. Build the application: `npm run build`
2. Set the required environment variables using the platform's secure storage
3. Start the production server: `npm run start`

### Database Considerations

Before deploying to production:

1. Ensure your Neon database is set up and configured
2. Run migrations on the production database: `npm run db:migrate:prod`
3. Create an admin user: `npm run db:admin:prod`
4. Secure your database connection with proper SSL settings
5. Implement database access controls and least privilege principles

### Database Synchronization and Backup

To ensure data consistency between local development and production environments:

#### Regular Backups

```bash
# Backup local database to a SQL file
npm run db:backup:local

# Backup production database to a SQL file
npm run db:backup:prod
```

#### Sync Data Between Environments

```bash
# Export specific tables or join tables from local to production
npm run db:sync:local-to-prod

# Export specific tables or join tables from production to local
npm run db:sync:prod-to-local
```

#### Troubleshooting Missing Associations

If media contacts are showing but their associated outlets, countries, or beats are missing:

1. **Verify Join Tables**: Check if join tables (_MediaContactBeats, _MediaContactCountries, _MediaContactOutlets) have data
2. **Export Join Tables**: If local has data but production doesn't, export join tables:
   ```bash
   pg_dump -U username -d local_db -t "_MediaContactBeats" -t "_MediaContactCountries" -t "_MediaContactOutlets" --data-only > join_tables_dump.sql
   ```
3. **Import to Production**: Import the join tables to production:
   ```bash
   cat join_tables_dump.sql | psql -h production_host -U username -d production_db
   ```
4. **Verify Data**: Confirm row counts match between environments

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
