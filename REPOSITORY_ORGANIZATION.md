# Repository Organization

This document explains the organization of the Media Contacts repository and what files have been excluded from the public GitHub repository for privacy and security reasons.

## Current Repository Structure

The repository follows a standard Next.js 15+ App Router structure with additional directories for research and data processing:

```
media-contacts/
├── .env*                   # Environment variables (excluded from git)
├── prisma/                 # Prisma schema and migrations
├── public/                 # Static assets
├── src/
│   ├── app/                # Next.js App Router pages
│   ├── components/         # React components
│   ├── features/           # Feature-specific modules
│   ├── lib/                # Utility functions and helpers
│   └── services/           # Service layer implementations
├── tests/                  # E2E tests with Playwright
├── scripts/                # Utility scripts for development
└── docs/                   # Project documentation
```

## Excluded Files and Directories

For privacy and security reasons, the following files and directories have been excluded from the public repository:

### Research Data Directories
- `algeria-research/` - Contains JSON files with media contact information for Algeria
- `rwanda-research/` - Contains JSON files with media contact information for Rwanda
- `research-logs/` - Contains research logs with contact verification data
- `backups/` - Database backup files

### Sensitive Data Files
- `existing_contacts.json` - Database of existing media contacts
- `existing_contacts_array.json` - Array format of existing media contacts
- `senegal-*.json` - JSON files containing Senegal media contact data
- `testing_contacts_africa.csv` - CSV file with test contact data
- `sample-media-contacts.csv` - Sample CSV file with contact data

### Research Logs and Reports
- `*research-log.json` - JSON format research logs
- `*enrichment-log.json` - Contact enrichment process logs
- `*deduplication-log.json` - Deduplication process logs
- `*transform-log.json` - Data transformation logs
- `*verification-report.md` - Contact verification reports
- `*import-summary.md` - Data import summary reports
- `senegal-research-log.md` - Detailed Senegal research log
- `senegal-media-contacts-summary.md` - Summary of Senegal media contacts

### Script Reports and Data
- `scripts/seeding/reports/` - Reports from data seeding scripts
- `scripts/seeding/data/` - Data files used in seeding scripts
- `*seed-log.json` - Logs from seeding operations
- `*seeding-errors.json` - Error logs from seeding operations
- `*completion-report.md` - Completion reports from scripts

### Development and Testing Artifacts
- `playwright-report/` - Playwright test reports
- `test-results/` - Test result files
- `*.session.sql` - SQL session files
- `*.png` - Image files (except those in public/)
- `search-results.png` - Search result screenshots
- `page-debug.html` - Debug HTML files
- `page-debug.png` - Debug screenshots

## Environment Variables

All environment variable files are excluded from the repository:
- `.env`
- `.env.local`
- `.env.development`
- `.env.production`
- `.env.test`

Only `.env.example` is included as a template for new developers.

## Security Considerations

The excluded files contain personal contact information including:
- Email addresses
- Phone numbers
- Social media profiles
- Professional titles and affiliations
- Geographic locations
- Outlet and publisher information

These files are maintained in a private repository or secure storage system separate from the public codebase.

## Updating the Repository

When adding new files to the repository, ensure that no sensitive data is included. Follow these guidelines:

1. Add any new data files to the `.gitignore` pattern matches
2. Review all JSON and CSV files for sensitive information before committing
3. Use the example environment file pattern for configuration templates
4. Store sensitive data in secure, private storage systems
5. Regularly audit the `.gitignore` file to ensure all sensitive patterns are covered

## Directory Structure Guidelines

### Research Data
All country-specific research data should be stored in country-named directories following the pattern:
```
{country}-research/
├── {country}-authors.json
├── {country}-outlets.json
├── {country}-publishers.json
├── {country}-research-log.json
└── processing-scripts.ts
```

### Script Reports
All script-generated reports should be stored in:
```
scripts/seeding/reports/
```

This organization ensures that sensitive data is properly isolated and excluded from public repositories while maintaining a clean, organized codebase for development.