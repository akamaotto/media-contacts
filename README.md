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
- PostgreSQL 14+
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

Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/media_contacts"

# NextAuth.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET="your-nextauth-secret"
```

4. **Set up the database**

```bash
npx prisma migrate dev
```

5. **Seed the database with initial data**

```bash
npm run prisma:seed
```

6. **Create an admin user**

```bash
npm run seed:admin
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
├── prisma/                 # Prisma schema and migrations
├── public/                 # Static assets
├── src/
│   ├── app/                # Next.js App Router pages
│   │   ├── actions/        # Server actions
│   │   ├── admin/          # Admin dashboard pages
│   │   ├── api/            # API routes
│   │   ├── login/          # Authentication pages
│   │   ├── profile/        # User profile pages
│   │   └── register/       # Registration pages
│   ├── components/         # React components
│   │   ├── media-contacts/ # Media contacts components
│   │   └── ui/             # ShadCN UI components
│   └── lib/                # Utility functions and helpers
└── tests/                  # E2E tests with Playwright
```

### Available Scripts

- `npm run dev`: Start the development server with Turbopack
- `npm run build`: Build the application for production
- `npm run start`: Start the production server
- `npm run lint`: Run ESLint
- `npm run prisma:seed`: Seed the database with test data
- `npm run seed:admin`: Create an admin user
- `npm run test:e2e`: Run Playwright E2E tests
- `npm run test:e2e:headed`: Run Playwright tests in headed mode

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

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
