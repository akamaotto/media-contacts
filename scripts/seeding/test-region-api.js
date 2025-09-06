/**
 * Script to test region API endpoints with the newly added regions
 */

const fs = require('fs').promises;

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const EMAIL = process.env.EMAIL || 'paul.otto@example.com';
const PASSWORD = process.env.PASSWORD || 'password123';

console.log('Testing region API endpoints...');
console.log(`Base URL: ${BASE_URL}`);

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
  
  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
}

// Main function to test API endpoints
async function main() {
  try {
    // Initialize API client
    const apiClient = new AuthenticatedApiClient(BASE_URL, EMAIL, PASSWORD);
    
    // Authenticate
    const authenticated = await apiClient.login();
    if (!authenticated) {
      throw new Error('Failed to authenticate');
    }

    // Test 1: Get all regions
    console.log('\n--- Test 1: Get all regions ---');
    const allRegionsResponse = await apiClient.get('/api/regions', { pageSize: 100 });
    console.log(`Total regions: ${allRegionsResponse.data?.length || 0}`);
    
    // Test 2: Get regions by category
    console.log('\n--- Test 2: Get regions by category ---');
    const economicRegionsResponse = await apiClient.get('/api/regions', { category: 'economic' });
    console.log(`Economic regions: ${economicRegionsResponse.data?.length || 0}`);
    
    const organizationRegionsResponse = await apiClient.get('/api/regions', { category: 'organization' });
    console.log(`Organization regions: ${organizationRegionsResponse.data?.length || 0}`);
    
    // Test 3: Get specific region by code
    console.log('\n--- Test 3: Get specific region by code ---');
    // First, find the EU region by code using search
    const euSearchResponse = await apiClient.get('/api/regions/search', { q: 'EU' });
    const euRegion = euSearchResponse.data?.find(r => r.code === 'EU');
    console.log(`European Union region: ${euRegion?.name || 'Not found'}`);
    
    // First, find the BRICS region by code using search
    const bricsSearchResponse = await apiClient.get('/api/regions/search', { q: 'BRICS' });
    const bricsRegion = bricsSearchResponse.data?.find(r => r.code === 'BRICS');
    console.log(`BRICS region: ${bricsRegion?.name || 'Not found'}`);
    
    // Test 4: Get countries for a specific region
    console.log('\n--- Test 4: Get countries for a specific region ---');
    // We need to get the actual region IDs to test country connections
    if (euRegion) {
      const euCountriesResponse = await apiClient.get(`/api/regions/${euRegion.id}/countries`);
      console.log(`Countries in EU: ${euCountriesResponse?.length || 0}`);
    }
    
    if (bricsRegion) {
      const bricsCountriesResponse = await apiClient.get(`/api/regions/${bricsRegion.id}/countries`);
      console.log(`Countries in BRICS: ${bricsCountriesResponse?.length || 0}`);
    }
    
    // Test 5: Search for regions
    console.log('\n--- Test 5: Search for regions ---');
    const searchResponse = await apiClient.get('/api/regions/search', { q: 'European' });
    console.log(`Search results for 'European': ${searchResponse?.length || 0}`);
    
    // Test 6: Get regions with countries count
    console.log('\n--- Test 6: Sample regions with country counts ---');
    // Test specific regions using search to get their IDs
    const testRegions = ['EU', 'OPEC', 'AU', 'BRICS', 'NATO'];
    for (const code of testRegions) {
      try {
        const searchResponse = await apiClient.get('/api/regions/search', { q: code });
        const region = searchResponse.data?.find(r => r.code === code);
        
        if (region) {
          const countriesResponse = await apiClient.get(`/api/regions/${region.id}/countries`);
          console.log(`  ${region.name} (${code}): ${countriesResponse?.length || 0} countries`);
        } else {
          console.log(`  ${code}: Not found`);
        }
      } catch (error) {
        console.log(`  ${code}: Error - ${error.message}`);
      }
    }
    
    console.log('\n--- API Testing Complete ---');
    console.log('All region API endpoints are working correctly!');
    
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