# Media Contacts Import Instructions

## Overview

This document provides instructions for importing the media contacts CSV file into the platform.

## Prerequisites

1. Ensure the platform is properly set up and running
2. Verify that all required reference data (outlets, countries, beats) exists in the system
3. Confirm you have the necessary permissions to import data

## Import Process

### Step 1: Prepare the CSV File
1. Open the provided `sample-media-contacts.csv` file
2. Review the data to ensure it's accurate and complete
3. Add or modify entries as needed for your specific requirements

### Step 2: Access the Import Functionality
1. Navigate to the Media Contacts section in the platform
2. Look for the "Import" or "Upload" button
3. Select the CSV file option

### Step 3: Upload the CSV File
1. Click the "Choose File" button
2. Select the `sample-media-contacts.csv` file
3. Review the file preview to ensure it's correctly formatted
4. Click "Upload" or "Import"

### Step 4: Map Fields (if required)
If the platform requires field mapping:
1. Match the CSV column headers to the corresponding platform fields:
   - Name → Name
   - Email → Email
   - Title → Title
   - Outlet → Outlet
   - Beats → Beats
   - Countries → Countries
   - Twitter Handle → Twitter Handle
   - Instagram Handle → Instagram Handle
   - LinkedIn URL → LinkedIn URL
   - Bio → Bio
   - Notes → Notes
   - Author Links → Author Links

### Step 5: Complete the Import
1. Review the import settings
2. Confirm the import
3. Wait for the process to complete
4. Check for any errors or warnings

## CSV File Format

The CSV file should include the following columns:
- **Name**: The full name of the media contact
- **Email**: The contact's email address (if available)
- **Title**: The contact's professional title
- **Outlet**: The media outlet the contact works for
- **Beats**: Comma-separated list of beats/coverage areas
- **Countries**: Comma-separated list of countries covered
- **Twitter Handle**: The contact's Twitter handle (including @)
- **Instagram Handle**: The contact's Instagram handle (including @)
- **LinkedIn URL**: The full URL to the contact's LinkedIn profile
- **Bio**: A brief professional biography
- **Notes**: Any additional notes about contacting the person
- **Author Links**: Comma-separated list of URLs to the contact's author pages

## Troubleshooting

### Common Issues
1. **Invalid Email Format**: Ensure all email addresses are properly formatted
2. **Missing Required Fields**: Check that all required fields are populated
3. **Invalid URLs**: Verify that all URLs include http:// or https://
4. **Comma Issues**: If data contains commas, enclose the entire field in quotes

### Error Handling
1. If the import fails, check the error message for specific details
2. Correct any identified issues in the CSV file
3. Try the import again
4. If problems persist, contact technical support

## Post-Import Verification

After importing:
1. Verify that all contacts appear in the media contacts list
2. Check a sample of contacts to ensure data was imported correctly
3. Confirm that relationships (outlets, beats, countries) were properly established
4. Test search and filter functionality with the new contacts

## Expanding the Database

To add more contacts:
1. Use the provided `media-contacts-seeding-template.csv` as a starting point
2. Follow the research methodology in `media-contacts-research-methodology.md`
3. Add new contacts to the CSV file
4. Repeat the import process

## Support

For assistance with the import process, contact the platform administrator or technical support team.