const fs = require('fs').promises;

/**
 * Final API check script to verify all data is accessible via API
 */

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const EMAIL = 'akamaotto@gmail.com';
const PASSWORD = 'ChangeMe123!';

console.log('Starting final API check script...');
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
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: this.email,
          password: this.password,
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
      
      this.cookies = setCookies.map(raw => {
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
      return true;
    } catch (error) {
      console.error('Authentication failed:', error.message);
      return false;
    }
  }

  async request(endpoint, options = {}) {
    // Build cookie string
    const cookieString = this.cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
    
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(cookieString && { 'Cookie': cookieString }),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
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

  async getAllPages(endpoint, params = {}) {
    const allData = [];
    let page = 1;
    let totalPages = 1;
    
    do {
      const response = await this.get(endpoint, { ...params, page, pageSize: 100 });
      allData.push(...response.data);
      totalPages = response.totalPages;
      page++;
    } while (page <= totalPages);
    
    return allData;
  }
}

async function main() {
  try {
    // Initialize API client
    const apiClient = new AuthenticatedApiClient(BASE_URL, EMAIL, PASSWORD);
    
    // Authenticate
    const authenticated = await apiClient.login();
    if (!authenticated) {
      throw new Error('Failed to authenticate');
    }

    // Query current data with pagination
    console.log('\n--- Querying Current Data via API ---');
    
    // Get all regions
    const regionsResponse = await apiClient.get('/api/regions');
    const currentRegions = regionsResponse.data || [];
    console.log(`Found ${currentRegions.length} regions`);
    
    // Get all countries (all pages)
    const currentCountries = await apiClient.getAllPages('/api/countries');
    console.log(`Found ${currentCountries.length} countries`);
    
    // Get all languages (all pages)
    const currentLanguages = await apiClient.getAllPages('/api/languages');
    console.log(`Found ${currentLanguages.length} languages`);
    
    // Save current data to files for analysis
    await fs.writeFile('scripts/seeding/final-regions.json', JSON.stringify(currentRegions, null, 2));
    await fs.writeFile('scripts/seeding/final-countries.json', JSON.stringify(currentCountries, null, 2));
    await fs.writeFile('scripts/seeding/final-languages.json', JSON.stringify(currentLanguages, null, 2));
    
    // Summary
    console.log('\n--- Final API Data Summary ---');
    console.log(`Regions: ${currentRegions.length}`);
    console.log(`Countries: ${currentCountries.length}`);
    console.log(`Languages: ${currentLanguages.length}`);
    
    // Show some sample data
    console.log('\n--- Sample Data ---');
    console.log('Region codes:', currentRegions.map(r => r.code).sort());
    console.log('\nFirst 10 country codes:', currentCountries.slice(0, 10).map(c => c.code));
    console.log('\nFirst 10 language codes:', currentLanguages.slice(0, 10).map(l => l.code));
    
    // Check if our new languages are there
    const newLanguageCodes = [
      'tgk', 'kir', 'tuk', 'mlg', 'sna', 'nso', 'tsn', 'sot', 'tso', 
      'ssw', 'ven', 'run', 'tig', 'byn', 'sid', 'wln', 'cor', 'lim', 
      'ast', 'srd', 'scn', 'nap', 'vec', 'fur', 'lij', 'pms', 'eml', 'roh'
    ];
    
    const foundNewLanguages = currentLanguages.filter(lang => newLanguageCodes.includes(lang.code));
    console.log(`\nFound ${foundNewLanguages.length} of our new languages via API`);
    
    if (foundNewLanguages.length > 0) {
      console.log('Sample of new languages found:');
      foundNewLanguages.slice(0, 5).forEach(lang => {
        console.log(`  - ${lang.name} (${lang.code})`);
      });
    }
    
    console.log('\nFinal API check completed successfully!');
    
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