const fs = require('fs').promises;

/**
 * Script to query the application's API for regions, countries, and languages
 * and identify missing entities that need to be seeded.
 */

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const EMAIL = process.env.EMAIL || 'paul.otto@example.com';
const PASSWORD = process.env.PASSWORD || 'password123';

console.log('Starting API query script...');
console.log(`Base URL: ${BASE_URL}`);
console.log(`Email: ${EMAIL}`);

// API client with authentication
class AuthenticatedApiClient {
  constructor(baseUrl, email, password) {
    this.baseUrl = baseUrl;
    this.email = email;
    this.password = password;
    this.cookies = [];
  }

  async login() {
    console.log('Authenticating with API...');
    
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/callback/credentials?json=true`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: this.email,
          password: this.password,
          redirect: false,
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Login failed: ${response.status} ${await response.text()}`);
      }

      // Extract cookies from response headers
      const rawHeaders = response.headers.raw ? response.headers.raw() : {};
      const setCookieHeaders = rawHeaders['set-cookie'] || [];
      
      // If raw() is not available, try get()
      if (setCookieHeaders.length === 0) {
        const setCookieHeader = response.headers.get('set-cookie');
        if (setCookieHeader) {
          setCookieHeaders.push(setCookieHeader);
        }
      }
      
      this.cookies = setCookieHeaders;
      
      console.log('Authentication successful');
      return true;
    } catch (error) {
      console.error('Authentication failed:', error.message);
      return false;
    }
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Build cookie string
    const cookieString = this.cookies.join('; ');
    
    const headers = {
      'Content-Type': 'application/json',
      ...(cookieString && { 'Cookie': cookieString }),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${await response.text()}`);
    }

    return await response.json();
  }

  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  }
}

// Main function to query API and identify missing entities
async function main() {
  try {
    // Initialize API client
    const apiClient = new AuthenticatedApiClient(BASE_URL, EMAIL, PASSWORD);
    
    // Authenticate
    const authenticated = await apiClient.login();
    if (!authenticated) {
      throw new Error('Failed to authenticate');
    }

    // Query current regions
    console.log('\n--- Querying Regions ---');
    const regionsResponse = await apiClient.get('/api/regions');
    const regions = regionsResponse.data || [];
    console.log(`Found ${regions.length} regions`);
    
    // Query current countries
    console.log('\n--- Querying Countries ---');
    const countriesResponse = await apiClient.get('/api/countries');
    const countries = countriesResponse.data || [];
    console.log(`Found ${countries.length} countries`);
    
    // Query current languages
    console.log('\n--- Querying Languages ---');
    const languagesResponse = await apiClient.get('/api/languages');
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
    
    console.log('\nRegion codes:', regionCodes);
    console.log('\nCountry codes (first 20):', countryCodes.slice(0, 20));
    console.log('\nLanguage codes:', languageCodes);
    
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