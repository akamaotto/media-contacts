const fs = require('fs').promises;

/**
 * Script to check API pagination and get full data sets
 */

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const EMAIL = process.env.EMAIL || 'paul.otto@example.com';
const PASSWORD = process.env.PASSWORD || 'password123';

console.log('Checking API pagination...');

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
}

// Main function to check pagination
async function main() {
  try {
    // Initialize API client
    const apiClient = new AuthenticatedApiClient(BASE_URL, EMAIL, PASSWORD);
    
    // Authenticate
    const authenticated = await apiClient.login();
    if (!authenticated) {
      throw new Error('Failed to authenticate');
    }

    // Query regions (should be all since there are only 5)
    console.log('\n--- Querying All Regions ---');
    const regionsResponse = await apiClient.get('/api/regions');
    console.log(`Found ${regionsResponse.data.length} regions`);
    console.log('Regions:', regionsResponse.data.map(r => r.code).sort());
    
    // Query countries with higher page size
    console.log('\n--- Querying Countries with pageSize=300 ---');
    const countriesResponse = await apiClient.get('/api/countries', { pageSize: 300 });
    console.log(`Found ${countriesResponse.data.length} countries`);
    console.log(`Total count: ${countriesResponse.totalCount}`);
    console.log(`Total pages: ${countriesResponse.totalPages}`);
    console.log('First 10 country codes:', countriesResponse.data.slice(0, 10).map(c => c.code));
    
    // Query languages with higher page size
    console.log('\n--- Querying Languages with pageSize=300 ---');
    const languagesResponse = await apiClient.get('/api/languages', { pageSize: 300 });
    console.log(`Found ${languagesResponse.data.length} languages`);
    console.log(`Total count: ${languagesResponse.totalCount}`);
    console.log(`Total pages: ${languagesResponse.totalPages}`);
    console.log('First 10 language codes:', languagesResponse.data.slice(0, 10).map(l => l.code));
    
    console.log('\n--- API Pagination Check Complete ---');
    
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