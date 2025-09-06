# Media Contacts Seeding System

## Overview

This directory contains a reusable system for seeding the database with media contacts. The system is designed to be configurable and extensible, allowing you to specify parameters such as:

- Country or region
- Number of contacts needed
- Beats or categories
- Other requirements

## Directory Structure

```
media-contacts/
├── README.md                          # This documentation
├── config/
│   ├── index.ts                       # Main configuration exports
│   └── types.ts                       # Configuration types
├── data/
│   ├── templates/
│   │   └── seeding-template.csv       # CSV template for manual seeding
│   └── samples/
│       └── sample-contacts.csv        # Sample contacts data
├── research/
│   ├── methodology.md                 # Research methodology documentation
│   └── contacts-research.md           # Contact research notes
├── utils/
│   ├── contact-generator.ts           # Contact generation utilities
│   └── data-validator.ts              # Data validation utilities
├── importer/
│   ├── csv-importer.ts                # CSV import functionality
│   └── api-importer.ts                # API-based import functionality
└── index.ts                           # Main entry point
```

## Usage

### Basic Usage

To seed media contacts, you can use the main entry point with your specific requirements:

```typescript
import { seedMediaContacts } from './index';

// Seed 20 tech contacts in the US
await seedMediaContacts({
  region: 'US',
  count: 20,
  categories: ['Technology', 'Startups'],
  requirements: {
    includeEmail: true,
    includeSocialProfiles: true
  }
});
```

### Configuration Options

The seeding system accepts the following configuration options:

- `region`: Country or region code (ISO alpha-3 format)
- `count`: Number of contacts to seed
- `categories`: Array of beats/categories (e.g., ['Technology', 'Finance'])
- `requirements`: Additional requirements for contacts

## Extending the System

To add new sources or modify the research methodology:

1. Update the research methodology in `research/methodology.md`
2. Add new contact sources in `research/contacts-research.md`
3. Extend the contact generator in `utils/contact-generator.ts`
4. Add new validation rules in `utils/data-validator.ts`

## Import Methods

The system supports two import methods:

1. **CSV Import**: Using the template in `data/templates/`
2. **API Import**: Direct database seeding via Prisma

## Maintenance

Regular maintenance tasks include:

1. Updating contact information
2. Adding new sources
3. Verifying data accuracy
4. Expanding coverage to new regions/categories