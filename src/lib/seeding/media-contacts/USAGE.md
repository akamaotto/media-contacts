# Media Contacts Seeding System - Usage Guide

## Overview

The Media Contacts Seeding System is a comprehensive solution for populating your database with media contacts. It provides both programmatic APIs and a command-line interface for flexible usage.

## Installation

The seeding system is included as part of the media-contacts project. No additional installation is required beyond the standard project setup.

## Usage Methods

### 1. Command-Line Interface (CLI)

The CLI provides the easiest way to seed your database with media contacts.

#### Basic Usage

```bash
# Seed with default configuration (10 general contacts)
npm run seed:media-contacts

# Seed with specific parameters
npm run seed:media-contacts seed --count 20 --beats "Technology,Startups" --country "United States"

# Import contacts from a CSV file
npm run seed:media-contacts import-csv path/to/contacts.csv

# Export contacts to a CSV file
npm run seed:media-contacts export-csv path/to/output.csv

# Seed with sample contacts
npm run seed:media-contacts:sample
```

#### CLI Options

##### Seed Command Options

| Option | Description | Default |
|--------|-------------|---------|
| `-r, --region <region>` | Region code (ISO alpha-3) | None |
| `-c, --country <country>` | Country name | None |
| `-n, --count <number>` | Number of contacts to seed | 10 |
| `-b, --beats <beats>` | Comma-separated list of beats/categories | "General" |
| `-t, --types <types>` | Comma-separated list of outlet types | "general" |
| `-l, --language <language>` | Language code | "en" |
| `--include-email` | Include email addresses | false |
| `--include-social` | Include social profiles | false |
| `--verified-only` | Only include contacts with verified emails | false |

##### Import CSV Command

```bash
npm run seed:media-contacts import-csv <file>
```

Imports media contacts from a CSV file. The CSV file should follow the format specified in the template.

##### Export CSV Command

```bash
npm run seed:media-contacts export-csv <file> [options]
```

Exports media contacts to a CSV file.

Options:
- `-r, --region <region>`: Filter by region
- `-c, --country <country>`: Filter by country
- `-b, --beats <beats>`: Filter by beats/categories

### 2. Programmatic API

The seeding system can also be used programmatically within your application.

#### Basic Usage

```typescript
import { seedMediaContacts } from './src/lib/seeding/media-contacts';

// Seed with default configuration
const result = await seedMediaContacts();

// Seed with custom configuration
const result = await seedMediaContacts({
  region: 'US',
  count: 20,
  categories: ['Technology', 'Startups'],
  requirements: {
    includeEmail: true,
    includeSocialProfiles: true
  }
});

console.log(`Seeded ${result.successCount} contacts with ${result.errorCount} errors`);
```

#### Available Functions

##### `seedMediaContacts(config?)`

Seeds media contacts based on the provided configuration.

Parameters:
- `config`: Seeding configuration object (optional)

Returns:
```typescript
{
  successCount: number;
  errorCount: number;
  contacts: MediaContactData[];
  errors: string[];
}
```

##### `seedMediaContactsFromCSV(filePath)`

Seeds media contacts from a CSV file.

Parameters:
- `filePath`: Path to the CSV file

Returns:
```typescript
{
  successCount: number;
  errorCount: number;
  contacts: MediaContactData[];
  errors: string[];
}
```

##### `exportMediaContactsToCSV(filePath, filterOptions?)`

Exports media contacts to a CSV file.

Parameters:
- `filePath`: Path to the output CSV file
- `filterOptions`: Optional filter options

Returns:
```typescript
{
  success: boolean;
  count: number;
  errors: string[];
}
```

### 3. Configuration Options

#### SeedingConfig Interface

```typescript
interface SeedingConfig {
  region?: string;
  country?: string;
  count: number;
  categories: string[];
  requirements?: SeedingRequirements;
  outletTypes?: ('tech' | 'business' | 'finance' | 'startup' | 'general')[];
  experienceLevel?: 'junior' | 'mid' | 'senior' | 'executive';
  language?: string;
}

interface SeedingRequirements {
  includeEmail?: boolean;
  includeSocialProfiles?: boolean;
  includeBio?: boolean;
  verifiedEmailsOnly?: boolean;
  activeContactsOnly?: boolean;
}
```

### 4. Data Format

#### CSV Template

The system uses a standardized CSV format for importing/exporting contacts:

| Column | Required | Description |
|--------|----------|-------------|
| Name | Yes | Full name of the contact |
| Email | Yes | Email address |
| Title | Yes | Professional title |
| Outlet | Yes | Media outlet name |
| Beats | Yes | Comma-separated list of beats/categories |
| Countries | Yes | Comma-separated list of countries |
| Twitter Handle | No | Twitter handle (with @) |
| Instagram Handle | No | Instagram handle (with @) |
| LinkedIn URL | No | Full LinkedIn profile URL |
| Bio | No | Professional biography |
| Notes | No | Additional notes |
| Author Links | No | Comma-separated list of author page URLs |

#### Example CSV Row

```csv
Kate Park,kateparknews@gmail.com,Reporter,TechCrunch,"Technology, Startups, Venture Capital","South Korea, Japan, Southeast Asia",@kateparknews,kateparknews,https://www.linkedin.com/in/kateparknews/,"Reporter at TechCrunch focusing on technology, startups and venture capital in Asia. Previously a financial journalist.","Based in Tokyo. Open to tips via Signal.",https://techcrunch.com/author/kate-park/
```

## Examples

### Seeding 50 Technology Contacts in the US

```bash
npm run seed:media-contacts seed --count 50 --beats "Technology,AI,Software" --country "United States" --include-email --include-social
```

### Seeding Finance Contacts in Europe

```bash
npm run seed:media-contacts seed --count 30 --beats "Finance,Fintech,Cryptocurrency" --region "EU" --include-email
```

### Importing Custom Contacts

```bash
npm run seed:media-contacts import-csv ./my-contacts.csv
```

### Exporting All Contacts

```bash
npm run seed:media-contacts export-csv ./all-contacts.csv
```

## Extending the System

### Adding New Sources

To add new sources to the research database:

1. Update `research/contacts-research.md` with new contacts
2. Add new outlet types to `config/index.ts`
3. Update the contact generator in `utils/contact-generator.ts`

### Customizing Contact Generation

To customize how contacts are generated:

1. Modify the sample data in `utils/contact-generator.ts`
2. Update the generation logic in the same file
3. Add new validation rules in `utils/data-validator.ts`

## Troubleshooting

### Common Issues

1. **Database Connection Errors**: Ensure your database is running and connection parameters are correct
2. **CSV Parsing Errors**: Ensure your CSV file follows the template format
3. **Validation Errors**: Check that all required fields are populated correctly

### Getting Help

For assistance with the seeding system:

1. Check the console output for error messages
2. Verify your configuration parameters
3. Ensure your CSV files are properly formatted
4. Check that your database is accessible

## Best Practices

1. **Start Small**: Begin with a small number of contacts to test the system
2. **Validate Data**: Always validate your data before importing
3. **Backup Database**: Create a backup before large seeding operations
4. **Monitor Performance**: Watch for performance issues with large imports
5. **Update Regularly**: Keep contact information current with regular updates