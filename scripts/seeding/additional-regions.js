/**
 * Additional regions to be added to the Media Contacts application
 */

// Additional regions organized by category
const ADDITIONAL_REGIONS = {
  // Sub-continental regions
  subregion: [
    { code: 'SEASIA', name: 'Southeast Asia', category: 'subregion', description: 'Southeast Asian countries' },
    { code: 'WAFR', name: 'West Africa', category: 'subregion', description: 'Western African countries' },
    { code: 'EAFR', name: 'East Africa', category: 'subregion', description: 'Eastern African countries' },
    { code: 'NAFR', name: 'North Africa', category: 'subregion', description: 'Northern African countries' },
    { code: 'SAFR', name: 'Southern Africa', category: 'subregion', description: 'Southern African countries' },
    { code: 'CAF', name: 'Central Africa', category: 'subregion', description: 'Central African countries' },
    { code: 'NAM', name: 'North America', category: 'subregion', description: 'Northern American countries' },
    { code: 'CAM', name: 'Central America', category: 'subregion', description: 'Central American countries' },
    { code: 'SAM', name: 'South America', category: 'subregion', description: 'South American countries' },
    { code: 'EEU', name: 'Eastern Europe', category: 'subregion', description: 'Eastern European countries' },
    { code: 'WEU', name: 'Western Europe', category: 'subregion', description: 'Western European countries' },
    { code: 'NEU', name: 'Northern Europe', category: 'subregion', description: 'Northern European countries' },
    { code: 'SEU', name: 'Southern Europe', category: 'subregion', description: 'Southern European countries' },
    { code: 'WASIA', name: 'Western Asia', category: 'subregion', description: 'Western Asian countries' },
    { code: 'EASIA', name: 'Eastern Asia', category: 'subregion', description: 'Eastern Asian countries' },
    { code: 'SASIA', name: 'Southern Asia', category: 'subregion', description: 'Southern Asian countries' },
    { code: 'CASIA', name: 'Central Asia', category: 'subregion', description: 'Central Asian countries' },
    { code: 'AUNZ', name: 'Australia and New Zealand', category: 'subregion', description: 'Australia and New Zealand countries' },
    { code: 'MEL', name: 'Melanesia', category: 'subregion', description: 'Melanesian countries' },
    { code: 'MIC', name: 'Micronesia', category: 'subregion', description: 'Micronesian countries' },
    { code: 'POLY', name: 'Polynesia', category: 'subregion', description: 'Polynesian countries' }
  ],
  
  // Economic regions
  economic: [
    { code: 'EU', name: 'European Union', category: 'economic', description: 'European Union member states' },
    { code: 'OPEC', name: 'Organization of Petroleum Exporting Countries', category: 'economic', description: 'OPEC member countries' },
    { code: 'ECOWAS', name: 'Economic Community of West African States', category: 'economic', description: 'West African economic community' },
    { code: 'CEMAC', name: 'Economic and Monetary Community of Central Africa', category: 'economic', description: 'Central African economic community' },
    { code: 'SADC', name: 'Southern African Development Community', category: 'economic', description: 'Southern African development community' },
    { code: 'ASEAN', name: 'Association of Southeast Asian Nations', category: 'economic', description: 'Southeast Asian nations' },
    { code: 'NAFTA', name: 'North American Free Trade Agreement', category: 'economic', description: 'North American trade agreement countries' },
    { code: 'MERCOSUR', name: 'Southern Common Market', category: 'economic', description: 'South American trade bloc' },
    { code: 'APEC', name: 'Asia-Pacific Economic Cooperation', category: 'economic', description: 'Asia-Pacific economic forum' },
    { code: 'G7', name: 'Group of Seven', category: 'economic', description: 'Group of seven major advanced economies' },
    { code: 'G20', name: 'Group of Twenty', category: 'economic', description: 'Group of twenty major economies' }
  ],
  
  // Organizations
  organization: [
    { code: 'FRANC', name: 'Francophonie', category: 'organization', description: 'Organisation internationale de la Francophonie' },
    { code: 'COMMON', name: 'Commonwealth of Nations', category: 'organization', description: 'Commonwealth of Nations member countries' },
    { code: 'NATO', name: 'North Atlantic Treaty Organization', category: 'organization', description: 'NATO member countries' },
    { code: 'OIC', name: 'Organization of Islamic Cooperation', category: 'organization', description: 'Islamic countries organization' },
    { code: 'AU', name: 'African Union', category: 'organization', description: 'African Union member states' },
    { code: 'CARICOM', name: 'Caribbean Community', category: 'organization', description: 'Caribbean community nations' },
    { code: 'CIS', name: 'Commonwealth of Independent States', category: 'organization', description: 'Former Soviet states' }
  ],
  
  // Political regions
  political: [
    { code: 'MENA', name: 'Middle East and North Africa', category: 'political', description: 'Middle Eastern and North African countries' },
    { code: 'BRICS', name: 'BRICS', category: 'political', description: 'Brazil, Russia, India, China, South Africa' },
    { code: 'G8', name: 'Group of Eight', category: 'political', description: 'Group of eight major industrialized countries' }
  ],
  
  // Trade agreements
  trade_agreement: [
    { code: 'USMCA', name: 'United States-Mexico-Canada Agreement', category: 'trade_agreement', description: 'USMCA trade agreement countries' },
    { code: 'RCEP', name: 'Regional Comprehensive Economic Partnership', category: 'trade_agreement', description: 'Asia-Pacific trade agreement' },
    { code: 'CPTPP', name: 'Comprehensive and Progressive Agreement for Trans-Pacific Partnership', category: 'trade_agreement', description: 'Trans-Pacific trade agreement' }
  ],
  
  // Geographical regions
  geographical: [
    { code: 'MIDEAST', name: 'Middle East', category: 'geographical', description: 'Middle Eastern countries' },
    { code: 'CARIB', name: 'Caribbean', category: 'geographical', description: 'Caribbean countries' },
    { code: 'BALKANS', name: 'Balkans', category: 'geographical', description: 'Balkan peninsula countries' }
  ]
};

// Country to region mappings
const COUNTRY_REGION_MAPPINGS = {
  // Southeast Asia (SEASIA)
  'SEASIA': ['BRN', 'KH', 'IDN', 'LAO', 'MYS', 'MMR', 'PHL', 'SGP', 'THA', 'TLS', 'VN'],
  
  // West Africa (WAFR)
  'WAFR': ['BJ', 'BF', 'CV', 'CI', 'GM', 'GH', 'GN', 'GW', 'LR', 'ML', 'MR', 'NE', 'NG', 'SH', 'SL', 'SN', 'TG'],
  
  // East Africa (EAFR)
  'EAFR': ['BI', 'KM', 'DJ', 'ER', 'ET', 'KE', 'MG', 'MW', 'MU', 'MZ', 'RW', 'SC', 'SO', 'SS', 'TZ', 'UG', 'ZM', 'ZW'],
  
  // North Africa (NAFR)
  'NAFR': ['DZ', 'EG', 'LY', 'MA', 'SD', 'TN'],
  
  // Southern Africa (SAFR)
  'SAFR': ['BW', 'LS', 'NA', 'SZ', 'ZA'],
  
  // Central Africa (CAF)
  'CAF': ['AO', 'CM', 'CF', 'TD', 'CG', 'CD', 'GQ', 'GA', 'ST'],
  
  // North America (NAM)
  'NAM': ['CA', 'MX', 'US'],
  
  // Central America (CAM)
  'CAM': ['BZ', 'CR', 'SV', 'GT', 'HN', 'NI', 'PA'],
  
  // South America (SAM)
  'SAM': ['AR', 'BO', 'BR', 'CL', 'CO', 'EC', 'FK', 'GF', 'GY', 'PE', 'PY', 'SR', 'UY', 'VE'],
  
  // Eastern Europe (EEU)
  'EEU': ['BG', 'BY', 'CZ', 'HU', 'MD', 'PL', 'RO', 'RU', 'SK', 'UA'],
  
  // Western Europe (WEU)
  'WEU': ['AT', 'BE', 'CH', 'DE', 'DK', 'ES', 'FR', 'GB', 'IE', 'IT', 'LI', 'LU', 'MC', 'NL', 'PT'],
  
  // Northern Europe (NEU)
  'NEU': ['AX', 'EE', 'FI', 'FO', 'GB', 'GG', 'IE', 'IM', 'IS', 'JE', 'LT', 'LV', 'NO', 'SE'],
  
  // Southern Europe (SEU)
  'SEU': ['AD', 'AL', 'BA', 'ES', 'GI', 'GR', 'HR', 'IT', 'ME', 'MK', 'MT', 'PT', 'RS', 'SI', 'SM', 'VA'],
  
  // Western Asia (WASIA)
  'WASIA': ['AE', 'AM', 'AZ', 'BH', 'CY', 'GE', 'IL', 'IQ', 'JO', 'KW', 'LB', 'OM', 'PS', 'QA', 'SA', 'SY', 'TR', 'YE'],
  
  // Eastern Asia (EASIA)
  'EASIA': ['CN', 'HK', 'JP', 'KP', 'KR', 'MN', 'MO', 'TW'],
  
  // Southern Asia (SASIA)
  'SASIA': ['AF', 'BD', 'BT', 'IN', 'IR', 'LK', 'MV', 'NP', 'PK'],
  
  // Central Asia (CASIA)
  'CASIA': ['KZ', 'KG', 'TJ', 'TM', 'UZ'],
  
  // Australia and New Zealand (AUNZ)
  'AUNZ': ['AU', 'NZ', 'NF'],
  
  // Melanesia (MEL)
  'MEL': ['FJ', 'NC', 'PG', 'SB', 'VU'],
  
  // Micronesia (MIC)
  'MIC': ['FM', 'GU', 'KI', 'MH', 'MP', 'NR', 'PW'],
  
  // Polynesia (POLY)
  'POLY': ['AS', 'CK', 'NU', 'PF', 'PN', 'TK', 'TO', 'TV', 'WF', 'WS'],
  
  // European Union (EU)
  'EU': ['AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK'],
  
  // OPEC (OPEC)
  'OPEC': ['DZ', 'AO', 'EC', 'IQ', 'IR', 'KW', 'LY', 'NG', 'QA', 'SA', 'AE', 'VE'],
  
  // ECOWAS (ECOWAS)
  'ECOWAS': ['BJ', 'BF', 'CI', 'CV', 'GM', 'GH', 'GN', 'GW', 'LR', 'ML', 'MR', 'NE', 'NG', 'SH', 'SL', 'SN', 'TG'],
  
  // CEMAC (CEMAC)
  'CEMAC': ['CM', 'CF', 'TD', 'CG', 'GQ', 'GA'],
  
  // SADC (SADC)
  'SADC': ['AO', 'BW', 'CD', 'LS', 'MG', 'MW', 'MU', 'MZ', 'NA', 'SC', 'SZ', 'TZ', 'ZA', 'ZM', 'ZW'],
  
  // ASEAN (ASEAN)
  'ASEAN': ['BN', 'KH', 'ID', 'LA', 'MY', 'MM', 'PH', 'SG', 'TH', 'VN'],
  
  // NAFTA (NAFTA) - Note: Now USMCA but keeping for historical reference
  'NAFTA': ['CA', 'MX', 'US'],
  
  // MERCOSUR (MERCOSUR)
  'MERCOSUR': ['AR', 'BR', 'PY', 'UY', 'VE'],
  
  // APEC (APEC)
  'APEC': ['AU', 'BN', 'CA', 'CL', 'CN', 'HK', 'ID', 'JP', 'KR', 'MX', 'MY', 'NZ', 'PE', 'PG', 'PH', 'RU', 'SG', 'TW', 'TH', 'US', 'VN'],
  
  // G7 (G7)
  'G7': ['CA', 'FR', 'DE', 'IT', 'JP', 'GB', 'US'],
  
  // G20 (G20)
  'G20': ['AR', 'AU', 'BR', 'CA', 'CN', 'FR', 'DE', 'IN', 'ID', 'IT', 'JP', 'KR', 'MX', 'RU', 'SA', 'ZA', 'TR', 'GB', 'US'],
  
  // Francophonie (FRANC)
  'FRANC': ['AD', 'AE', 'AL', 'BE', 'BF', 'BG', 'BI', 'BJ', 'CA', 'CD', 'CF', 'CG', 'CH', 'CI', 'CM', 'CV', 'CY', 'DJ', 'DZ', 'EE', 'ER', 'ES', 'FI', 'FR', 'GA', 'GE', 'GH', 'GN', 'GQ', 'GR', 'GW', 'HR', 'HT', 'HU', 'IL', 'IT', 'JP', 'KH', 'KM', 'KN', 'KR', 'LA', 'LC', 'LU', 'LV', 'MA', 'MC', 'MD', 'ME', 'MG', 'MK', 'ML', 'MR', 'MU', 'MV', 'MW', 'MZ', 'NE', 'NL', 'NO', 'PL', 'PT', 'RO', 'RS', 'RW', 'SC', 'SD', 'SE', 'SG', 'SK', 'SL', 'SM', 'SN', 'ST', 'SV', 'SZ', 'TD', 'TG', 'TH', 'TN', 'TO', 'TR', 'TV', 'TZ', 'UA', 'UG', 'UY', 'VA', 'VC', 'VN', 'VU', 'WS', 'XK'],
  
  // Commonwealth (COMMON)
  'COMMON': ['AG', 'AU', 'BS', 'BB', 'BZ', 'BN', 'BW', 'CM', 'CA', 'CY', 'DM', 'FJ', 'GB', 'GD', 'GH', 'GY', 'IN', 'IE', 'IL', 'JM', 'KE', 'KI', 'LS', 'MW', 'MY', 'MV', 'MT', 'MU', 'MZ', 'NA', 'NR', 'NZ', 'NG', 'PK', 'PG', 'RW', 'KN', 'LC', 'VC', 'WS', 'SC', 'SL', 'SB', 'ZA', 'LK', 'SZ', 'TZ', 'TO', 'TT', 'TV', 'UG', 'GB', 'VU', 'ZM', 'ZW'],
  
  // NATO (NATO)
  'NATO': ['AL', 'BE', 'BG', 'CA', 'HR', 'CZ', 'DK', 'EE', 'FR', 'DE', 'GR', 'HU', 'IS', 'IT', 'LV', 'LT', 'LU', 'MK', 'ME', 'NL', 'NO', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'TR', 'GB', 'US'],
  
  // OIC (OIC)
  'OIC': ['AF', 'SA', 'AZ', 'BH', 'BD', 'BN', 'BF', 'TD', 'KM', 'DJ', 'EG', 'GA', 'GM', 'GN', 'GY', 'ID', 'IR', 'IQ', 'JO', 'KZ', 'KE', 'KW', 'KG', 'LB', 'LY', 'MY', 'MV', 'ML', 'MR', 'MA', 'MZ', 'NA', 'NE', 'NG', 'OM', 'PK', 'PS', 'QA', 'RU', 'SN', 'SL', 'SO', 'SD', 'SR', 'SY', 'TJ', 'TZ', 'TG', 'TN', 'TR', 'TM', 'UG', 'AE', 'UZ', 'YE'],
  
  // African Union (AU)
  'AU': ['DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CM', 'CV', 'CF', 'TD', 'KM', 'CG', 'CD', 'DJ', 'EG', 'GQ', 'ER', 'SZ', 'ET', 'GA', 'GM', 'GH', 'GN', 'GW', 'CI', 'KE', 'LS', 'LR', 'LY', 'MG', 'MW', 'ML', 'MR', 'MU', 'MA', 'MZ', 'NA', 'NE', 'NG', 'RW', 'ST', 'SN', 'SC', 'SL', 'SO', 'ZA', 'SS', 'SD', 'TZ', 'TG', 'TN', 'UG', 'ZM', 'ZW'],
  
  // CARICOM (CARICOM)
  'CARICOM': ['AG', 'BS', 'BB', 'BZ', 'DM', 'GD', 'GY', 'HT', 'JM', 'MS', 'KN', 'LC', 'VC', 'SR', 'TT'],
  
  // CIS (CIS)
  'CIS': ['AM', 'AZ', 'BY', 'KZ', 'KG', 'MD', 'RU', 'TJ', 'TM', 'UA', 'UZ'],
  
  // MENA (MENA)
  'MENA': ['DZ', 'BH', 'EG', 'IR', 'IQ', 'IL', 'JO', 'KW', 'LB', 'LY', 'MA', 'OM', 'PS', 'QA', 'SA', 'SY', 'TN', 'AE', 'YE'],
  
  // BRICS (BRICS)
  'BRICS': ['BR', 'RU', 'IN', 'CN', 'ZA'],
  
  // G8 (G8)
  'G8': ['CA', 'FR', 'DE', 'IT', 'JP', 'RU', 'GB', 'US'],
  
  // USMCA (USMCA)
  'USMCA': ['CA', 'MX', 'US'],
  
  // RCEP (RCEP)
  'RCEP': ['AU', 'BN', 'KH', 'CN', 'ID', 'JP', 'KR', 'LA', 'MY', 'MM', 'NZ', 'PH', 'SG', 'TH', 'VN'],
  
  // CPTPP (CPTPP)
  'CPTPP': ['AU', 'BN', 'CA', 'CL', 'JP', 'MX', 'NZ', 'PE', 'SG', 'VN'],
  
  // Middle East (MIDEAST)
  'MIDEAST': ['AE', 'AM', 'AZ', 'BH', 'CY', 'GE', 'IL', 'IQ', 'JO', 'KW', 'LB', 'OM', 'PS', 'QA', 'SA', 'SY', 'TR', 'YE'],
  
  // Caribbean (CARIB)
  'CARIB': ['AG', 'BS', 'BB', 'BZ', 'VG', 'KY', 'CU', 'CW', 'DM', 'DO', 'GD', 'GP', 'HT', 'JM', 'MQ', 'MS', 'AN', 'PR', 'KN', 'LC', 'VC', 'SX', 'TT', 'TC', 'VI'],
  
  // Balkans (BALKANS)
  'BALKANS': ['AL', 'BA', 'BG', 'HR', 'XK', 'ME', 'MK', 'RO', 'RS', 'SI']
};

module.exports = { ADDITIONAL_REGIONS, COUNTRY_REGION_MAPPINGS };