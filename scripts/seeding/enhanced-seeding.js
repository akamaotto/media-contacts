const fs = require('fs').promises;

/**
 * Enhanced seeding script to query API, identify missing entities, and seed them
 */

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const EMAIL = 'akamaotto@gmail.com';
const PASSWORD = 'ChangeMe123!';

console.log('Starting enhanced seeding script...');
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

  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
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

// Comprehensive list of countries (ISO 3166-1 alpha-3 codes)
const STANDARD_COUNTRIES = [
  // Africa
  { name: 'Algeria', code: 'DZA' },
  { name: 'Angola', code: 'AGO' },
  { name: 'Benin', code: 'BEN' },
  { name: 'Botswana', code: 'BWA' },
  { name: 'Burkina Faso', code: 'BFA' },
  { name: 'Burundi', code: 'BDI' },
  { name: 'Cameroon', code: 'CMR' },
  { name: 'Cape Verde', code: 'CPV' },
  { name: 'Central African Republic', code: 'CAF' },
  { name: 'Chad', code: 'TCD' },
  { name: 'Comoros', code: 'COM' },
  { name: 'Congo', code: 'COG' },
  { name: 'Congo, Democratic Republic of the', code: 'COD' },
  { name: "Côte d'Ivoire", code: 'CIV' },
  { name: 'Djibouti', code: 'DJI' },
  { name: 'Egypt', code: 'EGY' },
  { name: 'Equatorial Guinea', code: 'GNQ' },
  { name: 'Eritrea', code: 'ERI' },
  { name: 'Ethiopia', code: 'ETH' },
  { name: 'Gabon', code: 'GAB' },
  { name: 'Gambia', code: 'GMB' },
  { name: 'Ghana', code: 'GHA' },
  { name: 'Guinea', code: 'GIN' },
  { name: 'Guinea-Bissau', code: 'GNB' },
  { name: 'Kenya', code: 'KEN' },
  { name: 'Lesotho', code: 'LSO' },
  { name: 'Liberia', code: 'LBR' },
  { name: 'Libya', code: 'LBY' },
  { name: 'Madagascar', code: 'MDG' },
  { name: 'Malawi', code: 'MWI' },
  { name: 'Mali', code: 'MLI' },
  { name: 'Mauritania', code: 'MRT' },
  { name: 'Mauritius', code: 'MUS' },
  { name: 'Morocco', code: 'MAR' },
  { name: 'Mozambique', code: 'MOZ' },
  { name: 'Namibia', code: 'NAM' },
  { name: 'Niger', code: 'NER' },
  { name: 'Nigeria', code: 'NGA' },
  { name: 'Rwanda', code: 'RWA' },
  { name: 'Sao Tome and Principe', code: 'STP' },
  { name: 'Senegal', code: 'SEN' },
  { name: 'Seychelles', code: 'SYC' },
  { name: 'Sierra Leone', code: 'SLE' },
  { name: 'Somalia', code: 'SOM' },
  { name: 'South Africa', code: 'ZAF' },
  { name: 'South Sudan', code: 'SSD' },
  { name: 'Sudan', code: 'SDN' },
  { name: 'Swaziland', code: 'SWZ' },
  { name: 'Tanzania', code: 'TZA' },
  { name: 'Togo', code: 'TGO' },
  { name: 'Tunisia', code: 'TUN' },
  { name: 'Uganda', code: 'UGA' },
  { name: 'Zambia', code: 'ZMB' },
  { name: 'Zimbabwe', code: 'ZWE' },
  
  // Americas
  { name: 'Antigua and Barbuda', code: 'ATG' },
  { name: 'Argentina', code: 'ARG' },
  { name: 'Bahamas', code: 'BHS' },
  { name: 'Barbados', code: 'BRB' },
  { name: 'Belize', code: 'BLZ' },
  { name: 'Bolivia', code: 'BOL' },
  { name: 'Brazil', code: 'BRA' },
  { name: 'Canada', code: 'CAN' },
  { name: 'Chile', code: 'CHL' },
  { name: 'Colombia', code: 'COL' },
  { name: 'Costa Rica', code: 'CRI' },
  { name: 'Cuba', code: 'CUB' },
  { name: 'Dominica', code: 'DMA' },
  { name: 'Dominican Republic', code: 'DOM' },
  { name: 'Ecuador', code: 'ECU' },
  { name: 'El Salvador', code: 'SLV' },
  { name: 'Grenada', code: 'GRD' },
  { name: 'Guatemala', code: 'GTM' },
  { name: 'Guyana', code: 'GUY' },
  { name: 'Haiti', code: 'HTI' },
  { name: 'Honduras', code: 'HND' },
  { name: 'Jamaica', code: 'JAM' },
  { name: 'Mexico', code: 'MEX' },
  { name: 'Nicaragua', code: 'NIC' },
  { name: 'Panama', code: 'PAN' },
  { name: 'Paraguay', code: 'PRY' },
  { name: 'Peru', code: 'PER' },
  { name: 'Saint Kitts and Nevis', code: 'KNA' },
  { name: 'Saint Lucia', code: 'LCA' },
  { name: 'Saint Vincent and the Grenadines', code: 'VCT' },
  { name: 'Suriname', code: 'SUR' },
  { name: 'Trinidad and Tobago', code: 'TTO' },
  { name: 'United States', code: 'USA' },
  { name: 'Uruguay', code: 'URY' },
  { name: 'Venezuela', code: 'VEN' },
  
  // Asia
  { name: 'Afghanistan', code: 'AFG' },
  { name: 'Armenia', code: 'ARM' },
  { name: 'Azerbaijan', code: 'AZE' },
  { name: 'Bahrain', code: 'BHR' },
  { name: 'Bangladesh', code: 'BGD' },
  { name: 'Bhutan', code: 'BTN' },
  { name: 'Brunei Darussalam', code: 'BRN' },
  { name: 'Cambodia', code: 'KHM' },
  { name: 'China', code: 'CHN' },
  { name: 'Cyprus', code: 'CYP' },
  { name: 'Georgia', code: 'GEO' },
  { name: 'India', code: 'IND' },
  { name: 'Indonesia', code: 'IDN' },
  { name: 'Iran', code: 'IRN' },
  { name: 'Iraq', code: 'IRQ' },
  { name: 'Israel', code: 'ISR' },
  { name: 'Japan', code: 'JPN' },
  { name: 'Jordan', code: 'JOR' },
  { name: 'Kazakhstan', code: 'KAZ' },
  { name: 'Kuwait', code: 'KWT' },
  { name: 'Kyrgyzstan', code: 'KGZ' },
  { name: 'Laos', code: 'LAO' },
  { name: 'Lebanon', code: 'LBN' },
  { name: 'Malaysia', code: 'MYS' },
  { name: 'Maldives', code: 'MDV' },
  { name: 'Mongolia', code: 'MNG' },
  { name: 'Myanmar', code: 'MMR' },
  { name: 'Nepal', code: 'NPL' },
  { name: 'North Korea', code: 'PRK' },
  { name: 'Oman', code: 'OMN' },
  { name: 'Pakistan', code: 'PAK' },
  { name: 'Palestine', code: 'PSE' },
  { name: 'Philippines', code: 'PHL' },
  { name: 'Qatar', code: 'QAT' },
  { name: 'Saudi Arabia', code: 'SAU' },
  { name: 'Singapore', code: 'SGP' },
  { name: 'South Korea', code: 'KOR' },
  { name: 'Sri Lanka', code: 'LKA' },
  { name: 'Syria', code: 'SYR' },
  { name: 'Taiwan', code: 'TWN' },
  { name: 'Tajikistan', code: 'TJK' },
  { name: 'Thailand', code: 'THA' },
  { name: 'Timor-Leste', code: 'TLS' },
  { name: 'Turkey', code: 'TUR' },
  { name: 'Turkmenistan', code: 'TKM' },
  { name: 'United Arab Emirates', code: 'ARE' },
  { name: 'Uzbekistan', code: 'UZB' },
  { name: 'Vietnam', code: 'VNM' },
  { name: 'Yemen', code: 'YEM' },
  
  // Europe
  { name: 'Albania', code: 'ALB' },
  { name: 'Andorra', code: 'AND' },
  { name: 'Austria', code: 'AUT' },
  { name: 'Belarus', code: 'BLR' },
  { name: 'Belgium', code: 'BEL' },
  { name: 'Bosnia and Herzegovina', code: 'BIH' },
  { name: 'Bulgaria', code: 'BGR' },
  { name: 'Croatia', code: 'HRV' },
  { name: 'Czech Republic', code: 'CZE' },
  { name: 'Denmark', code: 'DNK' },
  { name: 'Estonia', code: 'EST' },
  { name: 'Finland', code: 'FIN' },
  { name: 'France', code: 'FRA' },
  { name: 'Germany', code: 'DEU' },
  { name: 'Greece', code: 'GRC' },
  { name: 'Hungary', code: 'HUN' },
  { name: 'Iceland', code: 'ISL' },
  { name: 'Ireland', code: 'IRL' },
  { name: 'Italy', code: 'ITA' },
  { name: 'Latvia', code: 'LVA' },
  { name: 'Liechtenstein', code: 'LIE' },
  { name: 'Lithuania', code: 'LTU' },
  { name: 'Luxembourg', code: 'LUX' },
  { name: 'Malta', code: 'MLT' },
  { name: 'Moldova', code: 'MDA' },
  { name: 'Monaco', code: 'MCO' },
  { name: 'Montenegro', code: 'MNE' },
  { name: 'Netherlands', code: 'NLD' },
  { name: 'North Macedonia', code: 'MKD' },
  { name: 'Norway', code: 'NOR' },
  { name: 'Poland', code: 'POL' },
  { name: 'Portugal', code: 'PRT' },
  { name: 'Romania', code: 'ROU' },
  { name: 'San Marino', code: 'SMR' },
  { name: 'Serbia', code: 'SRB' },
  { name: 'Slovakia', code: 'SVK' },
  { name: 'Slovenia', code: 'SVN' },
  { name: 'Spain', code: 'ESP' },
  { name: 'Sweden', code: 'SWE' },
  { name: 'Switzerland', code: 'CHE' },
  { name: 'Ukraine', code: 'UKR' },
  { name: 'United Kingdom', code: 'GBR' },
  
  // Oceania
  { name: 'Australia', code: 'AUS' },
  { name: 'Fiji', code: 'FJI' },
  { name: 'Kiribati', code: 'KIR' },
  { name: 'Marshall Islands', code: 'MHL' },
  { name: 'Micronesia', code: 'FSM' },
  { name: 'Nauru', code: 'NRU' },
  { name: 'New Zealand', code: 'NZL' },
  { name: 'Palau', code: 'PLW' },
  { name: 'Papua New Guinea', code: 'PNG' },
  { name: 'Samoa', code: 'WSM' },
  { name: 'Solomon Islands', code: 'SLB' },
  { name: 'Tonga', code: 'TON' },
  { name: 'Tuvalu', code: 'TUV' },
  { name: 'Vanuatu', code: 'VUT' }
];

// Comprehensive list of languages (ISO 639-3 codes)
const STANDARD_LANGUAGES = [
  { name: 'English', code: 'eng' },
  { name: 'Spanish', code: 'spa' },
  { name: 'French', code: 'fra' },
  { name: 'Chinese', code: 'zho' },
  { name: 'Arabic', code: 'ara' },
  { name: 'Russian', code: 'rus' },
  { name: 'Portuguese', code: 'por' },
  { name: 'German', code: 'deu' },
  { name: 'Japanese', code: 'jpn' },
  { name: 'Korean', code: 'kor' },
  { name: 'Italian', code: 'ita' },
  { name: 'Hindi', code: 'hin' },
  { name: 'Bengali', code: 'ben' },
  { name: 'Urdu', code: 'urd' },
  { name: 'Turkish', code: 'tur' },
  { name: 'Dutch', code: 'nld' },
  { name: 'Polish', code: 'pol' },
  { name: 'Persian', code: 'fas' },
  { name: 'Swedish', code: 'swe' },
  { name: 'Norwegian', code: 'nor' },
  { name: 'Danish', code: 'dan' },
  { name: 'Finnish', code: 'fin' },
  { name: 'Greek', code: 'ell' },
  { name: 'Czech', code: 'ces' },
  { name: 'Hungarian', code: 'hun' },
  { name: 'Thai', code: 'tha' },
  { name: 'Vietnamese', code: 'vie' },
  { name: 'Indonesian', code: 'ind' },
  { name: 'Malay', code: 'msa' },
  { name: 'Hebrew', code: 'heb' },
  { name: 'Amharic', code: 'amh' },
  { name: 'Swahili', code: 'swa' },
  { name: 'Zulu', code: 'zul' },
  { name: 'Afrikaans', code: 'afr' },
  { name: 'Romanian', code: 'ron' },
  { name: 'Ukrainian', code: 'ukr' },
  { name: 'Catalan', code: 'cat' },
  { name: 'Croatian', code: 'hrv' },
  { name: 'Slovak', code: 'slk' },
  { name: 'Slovenian', code: 'slv' },
  { name: 'Bulgarian', code: 'bul' },
  { name: 'Serbian', code: 'srp' },
  { name: 'Lithuanian', code: 'lit' },
  { name: 'Latvian', code: 'lav' },
  { name: 'Estonian', code: 'est' },
  { name: 'Albanian', code: 'sqi' },
  { name: 'Macedonian', code: 'mkd' },
  { name: 'Armenian', code: 'hye' },
  { name: 'Georgian', code: 'kat' },
  { name: 'Azerbaijani', code: 'aze' },
  { name: 'Kazakh', code: 'kaz' },
  { name: 'Uzbek', code: 'uzb' },
  { name: 'Tajik', code: 'tgk' },
  { name: 'Kyrgyz', code: 'kir' },
  { name: 'Turkmen', code: 'tuk' },
  { name: 'Mongolian', code: 'mon' },
  { name: 'Nepali', code: 'nep' },
  { name: 'Sinhala', code: 'sin' },
  { name: 'Burmese', code: 'mya' },
  { name: 'Khmer', code: 'khm' },
  { name: 'Lao', code: 'lao' },
  { name: 'Malagasy', code: 'mlg' },
  { name: 'Somali', code: 'som' },
  { name: 'Yoruba', code: 'yor' },
  { name: 'Igbo', code: 'ibo' },
  { name: 'Hausa', code: 'hau' },
  { name: 'Akan', code: 'aka' },
  { name: 'Shona', code: 'sna' },
  { name: 'Northern Sotho', code: 'nso' },
  { name: 'Tswana', code: 'tsn' },
  { name: 'Southern Sotho', code: 'sot' },
  { name: 'Tsonga', code: 'tso' },
  { name: 'Swati', code: 'ssw' },
  { name: 'Venda', code: 'ven' },
  { name: 'Xhosa', code: 'xho' },
  { name: 'Kinyarwanda', code: 'kin' },
  { name: 'Kirundi', code: 'run' },
  { name: 'Wolof', code: 'wol' },
  { name: 'Fulah', code: 'ful' },
  { name: 'Tigrinya', code: 'tir' },
  { name: 'Tigré', code: 'tig' },
  { name: 'Blin', code: 'byn' },
  { name: 'Sidamo', code: 'sid' },
  { name: 'Walloon', code: 'wln' },
  { name: 'Cornish', code: 'cor' },
  { name: 'Manx', code: 'glv' },
  { name: 'Luxembourgish', code: 'ltz' },
  { name: 'Limburgish', code: 'lim' },
  { name: 'Frisian', code: 'fry' },
  { name: 'Basque', code: 'eus' },
  { name: 'Galician', code: 'glg' },
  { name: 'Asturian', code: 'ast' },
  { name: 'Catalan', code: 'cat' },
  { name: 'Corsican', code: 'cos' },
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
    
    const missingCountries = identifyMissingEntities(currentCountries, STANDARD_COUNTRIES, 'code');
    console.log(`Missing countries: ${missingCountries.length}`);
    
    const missingLanguages = identifyMissingEntities(currentLanguages, STANDARD_LANGUAGES, 'code');
    console.log(`Missing languages: ${missingLanguages.length}`);
    
    // Seed missing entities
    console.log('\n--- Seeding Missing Entities ---');
    
    const regionResults = await seedMissingEntities(apiClient, '/api/regions', missingRegions, 'regions');
    const countryResults = await seedMissingEntities(apiClient, '/api/countries', missingCountries, 'countries');
    const languageResults = await seedMissingEntities(apiClient, '/api/languages', missingLanguages, 'languages');
    
    // Summary
    console.log('\n--- Seeding Summary ---');
    console.log(`Regions: ${regionResults.seededCount} seeded, ${regionResults.errors.length} errors`);
    console.log(`Countries: ${countryResults.seededCount} seeded, ${countryResults.errors.length} errors`);
    console.log(`Languages: ${languageResults.seededCount} seeded, ${languageResults.errors.length} errors`);
    
    // Save errors if any
    const allErrors = [
      ...regionResults.errors.map(e => ({ type: 'region', ...e })),
      ...countryResults.errors.map(e => ({ type: 'country', ...e })),
      ...languageResults.errors.map(e => ({ type: 'language', ...e }))
    ];
    
    if (allErrors.length > 0) {
      await fs.writeFile('scripts/seeding/seeding-errors.json', JSON.stringify(allErrors, null, 2));
      console.log(`\nErrors saved to scripts/seeding/seeding-errors.json`);
    }
    
    console.log('\nEnhanced seeding completed successfully!');
    
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