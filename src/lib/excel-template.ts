import * as XLSX from 'xlsx';

// Define the structure for the Excel template
export interface MediaContactTemplate {
  'Name': string;
  'Email': string;
  'Title': string;
  'Outlet': string;
  'Beats': string; // Comma-separated
  'Countries': string; // Comma-separated
  'Twitter Handle': string;
  'Instagram Handle': string;
  'LinkedIn URL': string;
  'Bio': string;
  'Notes': string;
  'Author Links': string; // Comma-separated URLs
}

// Sample data to show users the expected format
const sampleData: MediaContactTemplate[] = [
  {
    'Name': 'John Smith',
    'Email': 'john.smith@example.com',
    'Title': 'Senior Reporter',
    'Outlet': 'Tech News Daily',
    'Beats': 'Technology, AI, Startups',
    'Countries': 'United States, Canada',
    'Twitter Handle': '@johnsmith',
    'Instagram Handle': '@johnsmith_reporter',
    'LinkedIn URL': 'https://linkedin.com/in/johnsmith',
    'Bio': 'Senior technology reporter covering AI and startups.',
    'Notes': 'Prefers email contact, responds quickly to tech stories.',
    'Author Links': 'https://technews.com/author/john-smith, https://medium.com/@johnsmith'
  },
  {
    'Name': 'Sarah Johnson',
    'Email': 'sarah.johnson@newsmagazine.com',
    'Title': 'Business Editor',
    'Outlet': 'Business Weekly',
    'Beats': 'Finance, Economics, Markets',
    'Countries': 'United Kingdom',
    'Twitter Handle': '@sarahjbusiness',
    'Instagram Handle': '',
    'LinkedIn URL': 'https://linkedin.com/in/sarah-johnson-editor',
    'Bio': 'Business editor with 10+ years experience in financial journalism.',
    'Notes': 'Best contact time: 9-11 AM GMT. Interested in fintech stories.',
    'Author Links': 'https://businessweekly.com/author/sarah-johnson'
  }
];

// Instructions for users
const instructions = [
  'INSTRUCTIONS FOR USING THIS TEMPLATE:',
  '',
  '1. Fill out the template with your media contact information',
  '2. Use the sample rows as a guide for formatting',
  '3. For multiple values (Beats, Countries, etc.), separate with commas',
  '4. Delete the sample rows and instruction rows before uploading',
  '5. Save this file as CSV format when ready to upload',
  '6. Upload the CSV file using the "Upload CSV" button',
  '',
  'IMPORTANT NOTES:',
  '- Email is required for each contact',
  '- First Name and Last Name are required',
  '- Leave fields blank if not applicable',
  '- URLs should include http:// or https://',
  '- Twitter handles should include the @ symbol',
  '',
  'DELETE THESE INSTRUCTION ROWS BEFORE UPLOADING',
  ''
];

/**
 * Generate an Excel template for media contacts upload
 * Returns a buffer that can be downloaded as .xlsx file
 */
export function generateMediaContactsTemplate(): Buffer {
  // Create a new workbook
  const workbook = XLSX.utils.book_new();
  
  // Create instructions sheet
  const instructionsSheet = XLSX.utils.aoa_to_sheet(
    instructions.map(instruction => [instruction])
  );
  
  // Create template sheet with sample data
  const templateSheet = XLSX.utils.json_to_sheet(sampleData);
  
  // Add some empty rows for users to fill
  const emptyRows: MediaContactTemplate[] = Array(10).fill(null).map(() => ({
    'Name': '',
    'Email': '',
    'Title': '',
    'Outlet': '',
    'Beats': '',
    'Countries': '',
    'Regions': '',
    'Languages': '',
    'Twitter Handle': '',
    'Instagram Handle': '',
    'LinkedIn URL': '',
    'Bio': '',
    'Notes': '',
    'Author Links': ''
  }));
  
  // Append empty rows to the template
  XLSX.utils.sheet_add_json(templateSheet, emptyRows, { 
    skipHeader: true, 
    origin: -1 
  });
  
  // Set column widths for better readability
  const columnWidths = [
    { wch: 15 }, // First Name
    { wch: 15 }, // Last Name
    { wch: 25 }, // Email
    { wch: 20 }, // Title
    { wch: 20 }, // Outlet
    { wch: 30 }, // Beats
    { wch: 20 }, // Countries
    { wch: 15 }, // Regions
    { wch: 15 }, // Languages
    { wch: 15 }, // Twitter Handle
    { wch: 15 }, // Instagram Handle
    { wch: 30 }, // LinkedIn URL
    { wch: 40 }, // Bio
    { wch: 40 }, // Notes
    { wch: 40 }  // Author Links
  ];
  
  templateSheet['!cols'] = columnWidths;
  instructionsSheet['!cols'] = [{ wch: 60 }];
  
  // Add sheets to workbook
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');
  XLSX.utils.book_append_sheet(workbook, templateSheet, 'Media Contacts Template');
  
  // Generate buffer
  const buffer = XLSX.write(workbook, { 
    type: 'buffer', 
    bookType: 'xlsx',
    compression: true 
  });
  
  return buffer;
}

/**
 * Get the filename for the template download
 */
export function getTemplateFilename(): string {
  const date = new Date().toISOString().split('T')[0];
  return `media-contacts-template-${date}.xlsx`;
}
