const fs = require('fs').promises;

/**
 * Fixed enhanced seeding script to properly handle authentication for POST requests
 */

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const EMAIL = 'akamaotto@gmail.com';
const PASSWORD = 'ChangeMe123!';

console.log('Starting fixed enhanced seeding script...');
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
      const response = await fetch(`${this.baseUrl}/api/auth/callback/credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          email: this.email,
          password: this.password,
          redirect: 'false',
          json: 'true'
        }),
        redirect: 'manual' // Don't follow redirects
      });

      if (!response.ok && response.status !== 302) {
        throw new Error(`Login API failed: ${response.status} ${await response.text()}`);
      }

      // Extract cookies from response
      const setCookieHeaders = response.headers.raw ? response.headers.raw()['set-cookie'] : [];
      
      if (setCookieHeaders && setCookieHeaders.length > 0) {
        // Parse cookies
        this.cookies = setCookieHeaders.map(cookie => {
          const [nameValue] = cookie.split(';');
          const [name, value] = nameValue.split('=');
          return `${name}=${value}`;
        });
      }

      console.log('Authentication successful');
      return true;
    } catch (error) {
      console.error('Authentication failed:', error.message);
      return false;
    }
  }

  async request(endpoint, options = {}) {
    // Build cookie string
    const cookieString = this.cookies.join('; ');
    
    const url = `${this.baseUrl}${endpoint}`;
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

    return response;
  }

  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    const response = await this.request(url, { method: 'GET' });
    
    if (!response.ok) {
      throw new Error(`GET request failed: ${response.status} ${await response.text()}`);
    }
    
    return await response.json();
  }

  async post(endpoint, data) {
    const response = await this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`POST request failed: ${response.status} ${errorText}`);
    }
    
    try {
      return await response.json();
    } catch (e) {
      // If response is not JSON, return success message
      return { success: true, message: 'Created successfully' };
    }
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

// Standard ISO data for comparison
const STANDARD_REGIONS = [
  { code: 'AFR', name: 'Africa', category: 'continent' },
  { code: 'AME', name: 'Americas', category: 'continent' },
  { code: 'ASI', name: 'Asia', category: 'continent' },
  { code: 'EUR', name: 'Europe', category: 'continent' },
  { code: 'OCE', name: 'Oceania', category: 'continent' }
];

// Additional languages to seed
const ADDITIONAL_LANGUAGES = [
  { name: 'Tajik', code: 'tgk' },
  { name: 'Kyrgyz', code: 'kir' },
  { name: 'Turkmen', code: 'tuk' },
  { name: 'Malagasy', code: 'mlg' },
  { name: 'Shona', code: 'sna' },
  { name: 'Northern Sotho', code: 'nso' },
  { name: 'Tswana', code: 'tsn' },
  { name: 'Southern Sotho', code: 'sot' },
  { name: 'Tsonga', code: 'tso' },
  { name: 'Swati', code: 'ssw' },
  { name: 'Venda', code: 'ven' },
  { name: 'Kirundi', code: 'run' },
  { name: 'Tigré', code: 'tig' },
  { name: 'Blin', code: 'byn' },
  { name: 'Sidamo', code: 'sid' },
  { name: 'Walloon', code: 'wln' },
  { name: 'Cornish', code: 'cor' },
  { name: 'Limburgish', code: 'lim' },
  { name: 'Asturian', code: 'ast' },
  { name: 'Sardinian', code: 'srd' },
  { name: 'Sicilian', code: 'scn' },
  { name: 'Neapolitan', code: 'nap' },
  { name: 'Venetian', code: 'vec' },
  { name: 'Friulian', code: 'fur' },
  { name: 'Ligurian', code: 'lij' },
  { name: 'Piedmontese', code: 'pms' },
  { name: 'Emilian-Romagnol', code: 'eml' },
  { name: 'Samosan', code: 'roh' }
];

// Function to identify missing entities
function identifyMissingEntities(current, standard, keyField) {
  const currentCodes = new Set(current.map(item => item[keyField]));
  const missing = standard.filter(item => !currentCodes.has(item[keyField]));
  return missing;
}

// Function to seed missing entities
async function seedMissingEntities(apiClient, endpoint, entities, entityType) {
  console.log(`\n--- Seeding ${entities.length} missing ${entityType} ---`);
  
  const errors = [];
  let seededCount = 0;
  
  for (const entity of entities) {
    try {
      console.log(`Seeding ${entityType}: ${entity.name} (${entity.code})`);
      await apiClient.post(endpoint, entity);
      seededCount++;
    } catch (error) {
      console.error(`Failed to seed ${entityType} ${entity.name}:`, error.message);
      errors.push({
        entity: entity.name,
        code: entity.code,
        error: error.message
      });
    }
  }
  
  console.log(`Successfully seeded ${seededCount} ${entityType}`);
  if (errors.length > 0) {
    console.log(`Failed to seed ${errors.length} ${entityType}`);
  }
  
  return { seededCount, errors };
}

// Main function
async function main() {
  try {
    // Initialize API client
    const apiClient = new AuthenticatedApiClient(BASE_URL, EMAIL, PASSWORD);
    
    // Authenticate
    const authenticated = await apiClient.login();
    if (!authenticated) {
      throw new Error('Failed to authenticate');
    }

    // Query current data
    console.log('\n--- Querying Current Data ---');
    
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
    await fs.writeFile('scripts/seeding/current-regions-full.json', JSON.stringify(currentRegions, null, 2));
    await fs.writeFile('scripts/seeding/current-countries-full.json', JSON.stringify(currentCountries, null, 2));
    await fs.writeFile('scripts/seeding/current-languages-full.json', JSON.stringify(currentLanguages, null, 2));
    
    // Identify missing entities
    console.log('\n--- Identifying Missing Entities ---');
    
    const missingRegions = identifyMissingEntities(currentRegions, STANDARD_REGIONS, 'code');
    console.log(`Missing regions: ${missingRegions.length}`);
    
    // We already have all countries, so no missing countries
    
    // Check for missing languages
    const allLanguages = [...currentLanguages, ...ADDITIONAL_LANGUAGES];
    const missingLanguages = identifyMissingEntities(currentLanguages, ADDITIONAL_LANGUAGES, 'code');
    console.log(`Missing languages: ${missingLanguages.length}`);
    
    // Seed missing entities
    console.log('\n--- Seeding Missing Entities ---');
    
    const regionResults = await seedMissingEntities(apiClient, '/api/regions', missingRegions, 'regions');
    const languageResults = await seedMissingEntities(apiClient, '/api/languages', missingLanguages, 'languages');
    
    // Summary
    console.log('\n--- Seeding Summary ---');
    console.log(`Regions: ${regionResults.seededCount} seeded, ${regionResults.errors.length} errors`);
    console.log(`Languages: ${languageResults.seededCount} seeded, ${languageResults.errors.length} errors`);
    
    // Save errors if any
    const allErrors = [
      ...regionResults.errors.map(e => ({ type: 'region', ...e })),
      ...languageResults.errors.map(e => ({ type: 'language', ...e }))
    ];
    
    if (allErrors.length > 0) {
      await fs.writeFile('scripts/seeding/seeding-errors.json', JSON.stringify(allErrors, null, 2));
      console.log(`\nErrors saved to scripts/seeding/seeding-errors.json`);
    }
    
    console.log('\nFixed enhanced seeding completed successfully!');
    
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