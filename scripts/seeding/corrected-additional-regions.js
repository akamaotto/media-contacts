/**
 * Additional regions to be added to the Media Contacts application
 * Using ISO alpha-3 country codes to match database format
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

// Country to region mappings using ISO alpha-3 codes
const COUNTRY_REGION_MAPPINGS = {
  // Southeast Asia (SEASIA)
  'SEASIA': ['BRN', 'KHM', 'IDN', 'LAO', 'MYS', 'MMR', 'PHL', 'SGP', 'THA', 'TLS', 'VNM'],
  
  // West Africa (WAFR)
  'WAFR': ['BEN', 'BFA', 'CPV', 'CIV', 'GMB', 'GHA', 'GIN', 'GNB', 'LBR', 'MLI', 'MRT', 'NER', 'NGA', 'SHN', 'SLE', 'SEN', 'TGO'],
  
  // East Africa (EAFR)
  'EAFR': ['BDI', 'COM', 'DJI', 'ERI', 'ETH', 'KEN', 'MDG', 'MWI', 'MUS', 'MOZ', 'RWA', 'SYC', 'SOM', 'SSD', 'TZA', 'UGA', 'ZMB', 'ZWE'],
  
  // North Africa (NAFR)
  'NAFR': ['DZA', 'EGY', 'LBY', 'MAR', 'SDN', 'TUN'],
  
  // Southern Africa (SAFR)
  'SAFR': ['BWA', 'LSO', 'NAM', 'SWZ', 'ZAF'],
  
  // Central Africa (CAF)
  'CAF': ['AGO', 'CMR', 'CAF', 'TCD', 'COG', 'COD', 'GNQ', 'GAB', 'STP'],
  
  // North America (NAM)
  'NAM': ['CAN', 'MEX', 'USA'],
  
  // Central America (CAM)
  'CAM': ['BLZ', 'CRI', 'SLV', 'GTM', 'HND', 'NIC', 'PAN'],
  
  // South America (SAM)
  'SAM': ['ARG', 'BOL', 'BRA', 'CHL', 'COL', 'ECU', 'FLK', 'GUF', 'GUY', 'PER', 'PRY', 'SUR', 'URY', 'VEN'],
  
  // Eastern Europe (EEU)
  'EEU': ['BGR', 'BLR', 'CZE', 'HUN', 'MDA', 'POL', 'ROU', 'RUS', 'SVK', 'UKR'],
  
  // Western Europe (WEU)
  'WEU': ['AUT', 'BEL', 'CHE', 'DEU', 'DNK', 'ESP', 'FRA', 'GBR', 'IRL', 'ITA', 'LIE', 'LUX', 'MCO', 'NLD', 'PRT'],
  
  // Northern Europe (NEU)
  'NEU': ['ALA', 'EST', 'FIN', 'FRO', 'GBR', 'GGY', 'IRL', 'IMN', 'ISL', 'JEY', 'LTU', 'LVA', 'NOR', 'SWE'],
  
  // Southern Europe (SEU)
  'SEU': ['AND', 'ALB', 'BIH', 'ESP', 'GIB', 'GRC', 'HRV', 'ITA', 'MNE', 'MKD', 'MLT', 'PRT', 'SRB', 'SVN', 'SMR', 'VAT'],
  
  // Western Asia (WASIA)
  'WASIA': ['ARE', 'ARM', 'AZE', 'BHR', 'CYP', 'GEO', 'ISR', 'IRQ', 'JOR', 'KWT', 'LBN', 'OMN', 'PSE', 'QAT', 'SAU', 'SYR', 'TUR', 'YEM'],
  
  // Eastern Asia (EASIA)
  'EASIA': ['CHN', 'HKG', 'JPN', 'PRK', 'KOR', 'MNG', 'MAC', 'TWN'],
  
  // Southern Asia (SASIA)
  'SASIA': ['AFG', 'BGD', 'BTN', 'IND', 'IRN', 'LKA', 'MDV', 'NPL', 'PAK'],
  
  // Central Asia (CASIA)
  'CASIA': ['KAZ', 'KGZ', 'TJK', 'TKM', 'UZB'],
  
  // Australia and New Zealand (AUNZ)
  'AUNZ': ['AUS', 'NZL', 'NFK'],
  
  // Melanesia (MEL)
  'MEL': ['FJI', 'NCL', 'PNG', 'SLB', 'VUT'],
  
  // Micronesia (MIC)
  'MIC': ['FSM', 'GUM', 'KIR', 'MHL', 'MNP', 'NRU', 'PLW'],
  
  // Polynesia (POLY)
  'POLY': ['ASM', 'COK', 'NIU', 'PYF', 'PCN', 'TKL', 'TON', 'TUV', 'WLF', 'WSM'],
  
  // European Union (EU)
  'EU': ['AUT', 'BEL', 'BGR', 'CYP', 'CZE', 'DEU', 'DNK', 'EST', 'ESP', 'FIN', 'FRA', 'GRC', 'HRV', 'HUN', 'IRL', 'ITA', 'LTU', 'LUX', 'LVA', 'MLT', 'NLD', 'POL', 'PRT', 'ROU', 'SWE', 'SVN', 'SVK'],
  
  // OPEC (OPEC)
  'OPEC': ['DZA', 'AGO', 'ECU', 'IRQ', 'IRN', 'KWT', 'LBY', 'NGA', 'QAT', 'SAU', 'ARE', 'VEN'],
  
  // ECOWAS (ECOWAS)
  'ECOWAS': ['BEN', 'BFA', 'CIV', 'CPV', 'GMB', 'GHA', 'GIN', 'GNB', 'LBR', 'MLI', 'MRT', 'NER', 'NGA', 'SHN', 'SLE', 'SEN', 'TGO'],
  
  // CEMAC (CEMAC)
  'CEMAC': ['CMR', 'CAF', 'TCD', 'COG', 'GNQ', 'GAB'],
  
  // SADC (SADC)
  'SADC': ['AGO', 'BWA', 'COD', 'LSO', 'MDG', 'MWI', 'MUS', 'MOZ', 'NAM', 'SYC', 'SWZ', 'TZA', 'ZAF', 'ZMB', 'ZWE'],
  
  // ASEAN (ASEAN)
  'ASEAN': ['BRN', 'KHM', 'IDN', 'LAO', 'MYS', 'MMR', 'PHL', 'SGP', 'THA', 'VNM'],
  
  // NAFTA (NAFTA) - Note: Now USMCA but keeping for historical reference
  'NAFTA': ['CAN', 'MEX', 'USA'],
  
  // MERCOSUR (MERCOSUR)
  'MERCOSUR': ['ARG', 'BRA', 'PRY', 'URY', 'VEN'],
  
  // APEC (APEC)
  'APEC': ['AUS', 'BRN', 'CAN', 'CHL', 'CHN', 'HKG', 'IDN', 'JPN', 'KOR', 'MEX', 'MYS', 'NZL', 'PER', 'PNG', 'PHL', 'RUS', 'SGP', 'TWN', 'THA', 'USA', 'VNM'],
  
  // G7 (G7)
  'G7': ['CAN', 'FRA', 'DEU', 'ITA', 'JPN', 'GBR', 'USA'],
  
  // G20 (G20)
  'G20': ['ARG', 'AUS', 'BRA', 'CAN', 'CHN', 'FRA', 'DEU', 'IND', 'IDN', 'ITA', 'JPN', 'KOR', 'MEX', 'RUS', 'SAU', 'ZAF', 'TUR', 'GBR', 'USA'],
  
  // Francophonie (FRANC)
  'FRANC': ['AND', 'ARE', 'ALB', 'BEL', 'BEN', 'BGR', 'BDI', 'BFA', 'CAN', 'COD', 'CAF', 'COG', 'CHE', 'CIV', 'CMR', 'CPV', 'CYP', 'DJI', 'DZA', 'EST', 'ERI', 'ESP', 'FIN', 'FRA', 'GAB', 'GBR', 'GEO', 'GHA', 'GIN', 'GNQ', 'GRC', 'GNB', 'HRV', 'HTI', 'HUN', 'IRL', 'ISR', 'ITA', 'JPN', 'KHM', 'COM', 'KNA', 'KOR', 'LAO', 'LCA', 'LUX', 'LVA', 'MAR', 'MCO', 'MDA', 'MNE', 'MDG', 'MKD', 'MLI', 'MRT', 'MUS', 'MDV', 'MWI', 'MOZ', 'NER', 'NLD', 'NOR', 'POL', 'PRT', 'ROU', 'SRB', 'RWA', 'SYC', 'SDN', 'SWE', 'SGP', 'SVK', 'SLE', 'SMR', 'SEN', 'STP', 'SLV', 'SWZ', 'TCD', 'TGO', 'THA', 'TUN', 'TON', 'TUR', 'TUV', 'TZA', 'UKR', 'UGA', 'URY', 'VAT', 'VCT', 'VNM', 'VUT', 'WSM', 'KOS'],
  
  // Commonwealth (COMMON)
  'COMMON': ['ATG', 'AUS', 'BHS', 'BRB', 'BLZ', 'BRN', 'BWA', 'CMR', 'CAN', 'CYP', 'DMA', 'FJI', 'GBR', 'GRD', 'GHA', 'GUY', 'IND', 'IRL', 'ISR', 'JAM', 'KEN', 'KIR', 'LSO', 'MWI', 'MYS', 'MDV', 'MLT', 'MUS', 'MOZ', 'NAM', 'NRU', 'NZL', 'NGA', 'PAK', 'PNG', 'RWA', 'KNA', 'LCA', 'VCT', 'WSM', 'SYC', 'SLE', 'SLB', 'ZAF', 'LKA', 'SWZ', 'TZA', 'TON', 'TTO', 'TUV', 'UGA', 'GBR', 'VUT', 'ZMB', 'ZWE'],
  
  // NATO (NATO)
  'NATO': ['ALB', 'BEL', 'BGR', 'CAN', 'HRV', 'CZE', 'DNK', 'EST', 'FRA', 'DEU', 'GRC', 'HUN', 'ISL', 'ITA', 'LVA', 'LTU', 'LUX', 'MKD', 'MNE', 'NLD', 'NOR', 'POL', 'PRT', 'ROU', 'SVK', 'SVN', 'ESP', 'TUR', 'GBR', 'USA'],
  
  // OIC (OIC)
  'OIC': ['AFG', 'SAU', 'AZE', 'BHR', 'BGD', 'BRN', 'BFA', 'TCD', 'COM', 'DJI', 'EGY', 'GA', 'GMB', 'GIN', 'GNQ', 'IDN', 'IRN', 'IRQ', 'JOR', 'KAZ', 'KEN', 'KWT', 'KGZ', 'LBN', 'LBY', 'MYS', 'MDV', 'MLI', 'MRT', 'MAR', 'MOZ', 'NER', 'NGA', 'OMN', 'PAK', 'PSE', 'QAT', 'RUS', 'SEN', 'SLE', 'SOM', 'SDN', 'SUR', 'SYR', 'TJK', 'TZA', 'TGO', 'TUN', 'TUR', 'TKM', 'UGA', 'ARE', 'UZB', 'YEM'],
  
  // African Union (AU)
  'AU': ['DZA', 'AGO', 'BEN', 'BWA', 'BFA', 'BDI', 'CMR', 'CPV', 'CAF', 'TCD', 'COM', 'COG', 'COD', 'DJI', 'EGY', 'GNQ', 'ERI', 'SWZ', 'ETH', 'GA', 'GMB', 'GHA', 'GIN', 'GNB', 'CIV', 'KEN', 'LSO', 'LBR', 'LBY', 'MDG', 'MWI', 'MLI', 'MRT', 'MUS', 'MAR', 'MOZ', 'NAM', 'NER', 'NGA', 'RWA', 'STP', 'SEN', 'SYC', 'SLE', 'SOM', 'ZAF', 'SSD', 'SDN', 'TZA', 'TGO', 'TUN', 'UGA', 'ZMB', 'ZWE'],
  
  // CARICOM (CARICOM)
  'CARICOM': ['ATG', 'BHS', 'BRB', 'BLZ', 'DMA', 'GRD', 'GUY', 'HTI', 'JAM', 'MSR', 'KNA', 'LCA', 'VCT', 'SUR', 'TTO'],
  
  // CIS (CIS)
  'CIS': ['ARM', 'AZE', 'BLR', 'KAZ', 'KGZ', 'MDA', 'RUS', 'TJK', 'TKM', 'UKR', 'UZB'],
  
  // MENA (MENA)
  'MENA': ['DZA', 'BHR', 'EGY', 'IRN', 'IRQ', 'ISR', 'JOR', 'KWT', 'LBN', 'LBY', 'MAR', 'OMN', 'PSE', 'QAT', 'SAU', 'SYR', 'TUN', 'ARE', 'YEM'],
  
  // BRICS (BRICS)
  'BRICS': ['BRA', 'RUS', 'IND', 'CHN', 'ZAF'],
  
  // G8 (G8)
  'G8': ['CAN', 'FRA', 'DEU', 'ITA', 'JPN', 'RUS', 'GBR', 'USA'],
  
  // USMCA (USMCA)
  'USMCA': ['CAN', 'MEX', 'USA'],
  
  // RCEP (RCEP)
  'RCEP': ['AUS', 'BRN', 'KHM', 'CHN', 'IDN', 'JPN', 'KOR', 'LAO', 'MYS', 'MMR', 'NZL', 'PHL', 'SGP', 'THA', 'VNM'],
  
  // CPTPP (CPTPP)
  'CPTPP': ['AUS', 'BRN', 'CAN', 'CHL', 'JPN', 'MEX', 'NZL', 'PER', 'SGP', 'VNM'],
  
  // Middle East (MIDEAST)
  'MIDEAST': ['ARE', 'ARM', 'AZE', 'BHR', 'CYP', 'GEO', 'ISR', 'IRQ', 'JOR', 'KWT', 'LBN', 'OMN', 'PSE', 'QAT', 'SAU', 'SYR', 'TUR', 'YEM'],
  
  // Caribbean (CARIB)
  'CARIB': ['ATG', 'BHS', 'BRB', 'BLZ', 'VGB', 'CYM', 'CUB', 'CUW', 'DMA', 'DOM', 'GRD', 'GLP', 'HTI', 'JAM', 'MTQ', 'MSR', 'ANT', 'PRI', 'KNA', 'LCA', 'VCT', 'SXM', 'TTO', 'TCA', 'VIR'],
  
  // Balkans (BALKANS)
  'BALKANS': ['ALB', 'BIH', 'BGR', 'HRV', 'KOS', 'MNE', 'MKD', 'ROU', 'SRB', 'SVN']
};

module.exports = { ADDITIONAL_REGIONS, COUNTRY_REGION_MAPPINGS };