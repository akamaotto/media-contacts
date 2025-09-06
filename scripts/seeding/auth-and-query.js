const fs = require('fs').promises;
const { spawn } = require('child_process');

/**
 * Script to authenticate with the API and query regions, countries, and languages
 * Uses the same approach as the Playwright tests
 */

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const EMAIL = process.env.EMAIL || 'paul.otto@example.com';
const PASSWORD = process.env.PASSWORD || 'password123';

console.log('Starting authenticated API query script...');
console.log(`Base URL: ${BASE_URL}`);
console.log(`Email: ${EMAIL}`);

// Simple sleep function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to make authenticated requests
async function makeAuthenticatedRequest(endpoint, cookies) {
  try {
    // Build cookie string
    const cookieString = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
    
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieString
      }
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${await response.text()}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error making request to ${endpoint}:`, error.message);
    throw error;
  }
}

// Function to login via API (similar to Playwright test utils)
async function loginViaApi() {
  console.log('Authenticating with API...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/auth/callback/credentials?json=true`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: EMAIL,
        password: PASSWORD,
        redirect: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Login API failed: ${response.status} ${await response.text()}`);
    }

    // Extract set-cookie headers
    const rawHeaders = {};
    for (const [key, value] of response.headers.entries()) {
      if (!rawHeaders[key]) {
        rawHeaders[key] = [];
      }
      rawHeaders[key].push(value);
    }
    
    const setCookies = rawHeaders['set-cookie'] || [];
    const { hostname } = new URL(BASE_URL);
    
    const cookies = setCookies.map(raw => {
      const [cookiePart] = raw.split(';');
      const [name, value] = cookiePart.split('=');
      return {
        name,
        value,
        domain: hostname,
        path: '/',
        httpOnly: raw.toLowerCase().includes('httponly'),
        secure: raw.toLowerCase().includes('secure'),
        sameSite: raw.toLowerCase().includes('samesite=lax') ? 'Lax' : raw.toLowerCase().includes('samesite=strict') ? 'Strict' : 'None',
        expires: Math.floor(Date.now() / 1000) + 60 * 60, // 1h
      };
    });

    console.log('Authentication successful');
    return cookies;
  } catch (error) {
    console.error('Authentication failed:', error.message);
    throw error;
  }
}

// Main function to query API and identify missing entities
async function main() {
  try {
    // Authenticate
    const cookies = await loginViaApi();
    
    // Add a small delay to ensure authentication is fully processed
    await sleep(1000);

    // Query current regions
    console.log('\n--- Querying Regions ---');
    const regionsResponse = await makeAuthenticatedRequest('/api/regions', cookies);
    const regions = regionsResponse.data || [];
    console.log(`Found ${regions.length} regions`);
    
    // Query current countries
    console.log('\n--- Querying Countries ---');
    const countriesResponse = await makeAuthenticatedRequest('/api/countries', cookies);
    const countries = countriesResponse.data || [];
    console.log(`Found ${countries.length} countries`);
    
    // Query current languages
    console.log('\n--- Querying Languages ---');
    const languagesResponse = await makeAuthenticatedRequest('/api/languages', cookies);
    const languages = languagesResponse.data || [];
    console.log(`Found ${languages.length} languages`);
    
    // Save current data to files for analysis
    await fs.writeFile('scripts/seeding/current-regions.json', JSON.stringify(regions, null, 2));
    await fs.writeFile('scripts/seeding/current-countries.json', JSON.stringify(countries, null, 2));
    await fs.writeFile('scripts/seeding/current-languages.json', JSON.stringify(languages, null, 2));
    
    console.log('\n--- Current Data Summary ---');
    console.log(`Regions: ${regions.length}`);
    console.log(`Countries: ${countries.length}`);
    console.log(`Languages: ${languages.length}`);
    
    // Extract codes for easy comparison
    const regionCodes = regions.map(r => r.code).sort();
    const countryCodes = countries.map(c => c.code).sort();
    const languageCodes = languages.map(l => l.code).sort();
    
    console.log('\nSample region codes:', regionCodes.slice(0, 10));
    console.log('\nSample country codes:', countryCodes.slice(0, 20));
    console.log('\nSample language codes:', languageCodes.slice(0, 20));
    
    // Identify gaps (this would be expanded with web search)
    console.log('\n--- Analysis Complete ---');
    console.log('Next steps:');
    console.log('1. Compare with comprehensive lists from web search');
    console.log('2. Identify missing entities');
    console.log('3. Seed missing entities via API');
    
    return { regions, countries, languages };
    
  } catch (error) {
    console.error('Error in main function:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };