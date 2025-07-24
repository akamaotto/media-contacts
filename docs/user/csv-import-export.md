# CSV Import/Export Guide

This guide explains how to import and export media contacts using CSV files in the Media Contacts application.

## Importing Contacts

### CSV File Requirements

To successfully import contacts, your CSV file must:

1. **Include required fields**:
   - `firstName` and `lastName` (or a combined `name` column)
   - `email` (must be unique)

2. **Follow the correct format**:
   - Use UTF-8 encoding
   - Use comma (,) as the delimiter
   - Include a header row with field names
   - Wrap text containing commas in quotes (e.g., `"Technology, Science"`)

3. **Supported fields**:

| Field Name | Description | Required | Format |
|------------|-------------|----------|--------|
| firstName | First name | Yes | Text |
| lastName | Last name | Yes | Text |
| email | Email address | Yes | Valid email format |
| title | Job title | No | Text |
| outlet | Media outlet | No | Text |
| beats | Coverage areas | No | Comma-separated values |
| countries | Countries | No | Comma-separated values |
| regions | Regions | No | Comma-separated values |
| languages | Languages | No | Comma-separated values |
| twitterHandle | Twitter handle | No | @username format |
| instagramHandle | Instagram handle | No | @username format |
| linkedinUrl | LinkedIn profile URL | No | Valid URL |
| bio | Biography | No | Text |
| notes | Additional notes | No | Text |
| authorLinks | Links to author's work | No | Comma-separated URLs |

### Sample CSV Format

```csv
firstName,lastName,email,title,outlet,beats,countries,regions,languages,twitterHandle,instagramHandle,linkedinUrl,bio,notes,authorLinks
John,Doe,john.doe@example.com,Reporter,Tech News,"Technology, AI",USA,North America,English,@johndoe,@johndoe_insta,https://linkedin.com/in/johndoe,"Tech reporter with 10 years experience",Prefers email contact,https://technews.com/author/johndoe
Jane,Smith,jane.smith@example.com,Editor,Science Today,"Science, Health","UK, France",Europe,"English, French",@janesmith,@janesmith_insta,https://linkedin.com/in/janesmith,"Science editor specializing in health topics",Available for interviews,https://sciencetoday.com/author/janesmith
```

### Import Process

1. Navigate to the Media Contacts page
2. Click the "Import" button in the top right corner
3. Select your CSV file from your computer
4. The system will validate your file and show any errors
5. If validation passes, the system will import valid contacts
6. You'll see a summary of imported contacts and any errors

### Handling Duplicates

- Contacts with email addresses that already exist in the system will be updated
- All other fields will be overwritten with the values from the CSV
- If you want to preserve existing data, export your contacts first, make changes, then import

### Troubleshooting Import Errors

| Error | Solution |
|-------|----------|
| "Missing required columns" | Ensure your CSV includes firstName, lastName, and email columns |
| "Invalid email format" | Check that all email addresses follow a valid format |
| "Duplicate email in CSV" | Remove duplicate email entries from your CSV file |
| "File too large" | Split your file into smaller CSVs (max 10,000 contacts per file) |
| "Invalid CSV format" | Ensure your file is properly formatted CSV with headers |

## Exporting Contacts

### Export Options

1. **Field Selection**:
   - Choose which fields to include in the export
   - All fields are selected by default

2. **Filtering**:
   - Export all contacts or apply filters
   - Filter by beats, countries, regions, languages
   - Filter by search term

### Export Process

1. Navigate to the Media Contacts page
2. Click the "Export" button in the top right corner
3. Select the fields you want to include
4. Apply any filters if needed
5. Click "Export" to download the CSV file

### Using Exported Data

- The exported CSV can be opened in any spreadsheet application
- You can edit the data and re-import it to update contacts
- The export includes all the fields available in the system

## Best Practices

1. **Before importing**:
   - Validate your data in a spreadsheet application
   - Check for duplicate emails
   - Ensure required fields are present

2. **Managing large datasets**:
   - For files with more than 1,000 contacts, split into multiple files
   - Import one file at a time
   - Allow each import to complete before starting another

3. **Regular backup**:
   - Export your contacts regularly as a backup
   - Store exported files securely

## Support

If you encounter issues with CSV import or export, please contact support at support@mediacontacts.app with:

1. A description of the issue
2. Screenshots of any error messages
3. A sample of your CSV file (with sensitive information removed)
