# Media Contacts Management System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15+-black.svg)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.0+-2D3748.svg)](https://www.prisma.io/)

A professional-grade media contacts management system built for journalists, PR professionals, and media organizations. Manage relationships with media contacts, track coverage, and streamline outreach campaigns with advanced filtering, search, and analytics capabilities.

## ✨ Features

### 🎯 Core Functionality

- **Contact Management**: Comprehensive CRUD operations for media contacts with rich metadata
- **Advanced Search & Filtering**: Multi-dimensional filtering by outlets, countries, beats, regions, and languages
- **CSV Import/Export**: Bulk operations with validation and error handling
- **Relationship Mapping**: Many-to-many relationships between contacts, outlets, beats, and geographic data

### 🚀 Performance & Scale

- **Virtualized Tables**: Handle 100k+ contacts with smooth scrolling and pagination
- **Smart Caching**: Redis-backed caching for filter suggestions and search results
- **Database Optimization**: Indexed queries and connection pooling for sub-second response times
- **Chunked Processing**: Efficient handling of large CSV imports and exports

### 🔐 Security & Authentication

- **Role-Based Access Control**: Admin and user roles with granular permissions
- **Secure Authentication**: NextAuth.js with Prisma adapter and session management
- **Data Validation**: Comprehensive input validation with Zod schemas
- **Environment Security**: Secure handling of sensitive configuration

### 📊 Analytics & Insights

- **Dashboard Analytics**: Contact distribution, geographic coverage, and activity metrics
- **Filter Suggestions**: Popularity-based suggestions with intelligent ranking
- **Activity Tracking**: Comprehensive logging of user actions and system events

## 🛠️ Tech Stack

- **Frontend**: Next.js 15+ (App Router), React 19, TypeScript, Tailwind CSS
- **UI Components**: ShadCN UI (based on Radix UI), TanStack Table v8 with React Virtual
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL (Neon for production)
- **Authentication**: NextAuth.js with Prisma Adapter
- **Form Handling**: React Hook Form with Zod validation
- **Testing**: Playwright for E2E testing, Jest for unit tests

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (LTS recommended)
- PostgreSQL 14+ (for local development)
- npm or yarn

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/media-contacts.git
cd media-contacts
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:

```env
# Database (Local PostgreSQL)
DATABASE_URL="postgresql://username:password@localhost:5432/media_contacts"

# NextAuth.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET="your-secure-secret-here"
```

4. **Set up the database**

```bash
# Run migrations
npx prisma migrate dev

# Seed with initial data
npm run prisma:seed

# Create admin user
npm run seed:admin
```

5. **Start the development server**

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## 📁 Project Structure

```text
media-contacts/
├── src/                    # Application source code
│   ├── app/               # Next.js App Router pages
│   │   ├── (auth)/        # Authentication pages
│   │   ├── (dashboard)/   # Dashboard pages
│   │   └── api/           # API routes
│   ├── components/        # React components
│   │   ├── features/      # Feature-specific components
│   │   └── ui/            # Reusable UI components
│   └── lib/               # Utility functions and helpers
├── prisma/                # Database schema and migrations
├── tests/                 # E2E and integration tests
├── tools/                 # Development and maintenance tools
│   ├── research/          # Business research scripts
│   ├── maintenance/       # Database maintenance tools
│   └── performance/       # Performance testing utilities
├── docs/                  # Documentation
│   ├── api/              # API documentation
│   ├── architecture/     # System architecture docs
│   ├── development/      # Development guides
│   └── deployment/       # Deployment guides
└── config/               # Configuration files
```

## 📚 Documentation

- **[API Documentation](docs/api/)** - Complete API reference
- **[Architecture Guide](docs/architecture/)** - System design and patterns
- **[Development Setup](docs/development/)** - Detailed setup instructions
- **[Deployment Guide](docs/deployment/)** - Production deployment

## 🧪 Testing

```bash
# Run unit tests
npm run test:unit

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:headed
```

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard:
   - `DATABASE_URL` (Neon PostgreSQL connection string)
   - `NEXTAUTH_URL` (Your production domain)
   - `NEXTAUTH_SECRET` (Generate with `openssl rand -base64 32`)

3. Deploy automatically on push to main branch

### Other Platforms

```bash
# Build for production
npm run build

# Start production server
npm start
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/media-contacts/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/media-contacts/discussions)
- **Documentation**: [Project Wiki](https://github.com/yourusername/media-contacts/wiki)

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [ShadCN UI](https://ui.shadcn.com/)
- Database powered by [Neon](https://neon.tech/)
- Authentication via [NextAuth.js](https://next-auth.js.org/)
