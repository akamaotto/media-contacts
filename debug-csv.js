const Papa = require('papaparse');
const fs = require('fs');

// Test the CSV parsing directly
const csvPath = '/Users/akamaotto/Downloads/testing.csv';

console.log('🔍 Testing CSV parsing directly...');
console.log('CSV file path:', csvPath);

// Read the CSV file
const csvContent = fs.readFileSync(csvPath, 'utf8');
console.log('Raw CSV content:');
console.log(csvContent);
console.log('---');

// Parse with same settings as the app
const parseResult = Papa.parse(csvContent, {
  header: true,
  dynamicTyping: false,
  skipEmptyLines: true,
  delimiter: '', // Auto-detect delimiter
  delimitersToGuess: [',', ';', '\t', '|'], // Same as main parser
});

console.log('Parse result:');
console.log('- Detected delimiter:', parseResult.meta?.delimiter);
console.log('- Headers:', parseResult.meta?.fields);
console.log('- Data rows:', parseResult.data.length);
console.log('- First row:', parseResult.data[0]);
console.log('- Errors:', parseResult.errors);

// Test header validation logic
const headers = parseResult.meta?.fields || [];
console.log('\n🔍 Testing header validation...');

const requiredFields = ['name', 'email'];
const headerFieldMapping = {
  'name': 'name',
  'full name': 'name',
  'email': 'email',
  'first name': 'firstName',
  'last name': 'lastName',
};

const normalizedHeaders = headers.map(h => h.trim().toLowerCase());
console.log('Normalized headers:', normalizedHeaders);

const headerMapping = new Map();
normalizedHeaders.forEach((header, index) => {
  const mappedField = headerFieldMapping[header];
  if (mappedField) {
    headerMapping.set(headers[index], mappedField);
  }
});

console.log('Header mapping:', Array.from(headerMapping.entries()));

// Test row mapping
if (parseResult.data.length > 0) {
  console.log('\n🔍 Testing row mapping...');
  const firstRow = parseResult.data[0];
  const mappedRow = {};
  
  for (const [csvHeader, fieldName] of headerMapping.entries()) {
    const value = firstRow[csvHeader];
    mappedRow[fieldName] = value || '';
  }
  
  console.log('Original row:', firstRow);
  console.log('Mapped row:', mappedRow);
}
