const fs = require('fs').promises;
const { PrismaClient } = require('@prisma/client');

/**
 * Script to seed the database with regions, countries, and languages
 * Based on UN M49 region codes, ISO 3166-1 alpha-3 country codes, and ISO 639-3 language codes
 */

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
// Use an existing admin user
const EMAIL = 'admin@example.com';
const PASSWORD = 'admin'; // We'll need to find the actual password

console.log('Starting database seeding script...');
console.log(`Base URL: ${BASE_URL}`);
console.log(`Email: ${EMAIL}`);

const prisma = new PrismaClient();

// Direct database seeding approach since API authentication is complex
async function seedRegionsDirect() {
  console.log('\n--- Seeding Regions Directly ---');
  
  // Define the main regions based on UN M49
  const regions = [
    { name: 'Africa', code: 'AFR', category: 'continent' },
    { name: 'Americas', code: 'AME', category: 'continent' },
    { name: 'Asia', code: 'ASI', category: 'continent' },
    { name: 'Europe', code: 'EUR', category: 'continent' },
    { name: 'Oceania', code: 'OCE', category: 'continent' },
  ];
  
  const actionLog = [];
  const errors = [];
  
  for (const region of regions) {
    try {
      console.log(`Seeding region: ${region.name} (${region.code})`);
      
      // Check if region already exists
      const existing = await prisma.regions.findUnique({
        where: { code: region.code }
      });
      
      if (existing) {
        console.log(`Region ${region.name} already exists, skipping...`);
        actionLog.push(`Skipped existing region: ${region.name} (${region.code})`);
        continue;
      }
      
      // Create region
      const created = await prisma.regions.create({
        data: {
          id: require('crypto').randomUUID(),
          name: region.name,
          code: region.code,
          category: region.category,
          created_at: new Date(),
          updated_at: new Date()
        }
      });
      
      actionLog.push(`Created region: ${created.name} (${created.code})`);
      console.log(`Successfully created region: ${created.name}`);
    } catch (error) {
      errors.push(`Failed to create region ${region.name}: ${error.message}`);
      console.error(`Error seeding region ${region.name}:`, error.message);
    }
  }
  
  return { actionLog, errors };
}

// Function to seed countries directly
async function seedCountriesDirect() {
  console.log('\n--- Seeding Countries Directly ---');
  
  // Load country data from the JSON file we fetched earlier
  const countryData = [
    {"name":"Afghanistan","alpha-2":"AF","alpha-3":"AFG","country-code":"004","region":"Asia","sub-region":"Southern Asia"},
    {"name":"Åland Islands","alpha-2":"AX","alpha-3":"ALA","country-code":"248","region":"Europe","sub-region":"Northern Europe"},
    {"name":"Albania","alpha-2":"AL","alpha-3":"ALB","country-code":"008","region":"Europe","sub-region":"Southern Europe"},
    {"name":"Algeria","alpha-2":"DZ","alpha-3":"DZA","country-code":"012","region":"Africa","sub-region":"Northern Africa"},
    {"name":"American Samoa","alpha-2":"AS","alpha-3":"ASM","country-code":"016","region":"Oceania","sub-region":"Polynesia"},
    {"name":"Andorra","alpha-2":"AD","alpha-3":"AND","country-code":"020","region":"Europe","sub-region":"Southern Europe"},
    {"name":"Angola","alpha-2":"AO","alpha-3":"AGO","country-code":"024","region":"Africa","sub-region":"Sub-Saharan Africa"},
    {"name":"Anguilla","alpha-2":"AI","alpha-3":"AIA","country-code":"660","region":"Americas","sub-region":"Caribbean"},
    {"name":"Antarctica","alpha-2":"AQ","alpha-3":"ATA","country-code":"010","region":"","sub-region":""},
    {"name":"Antigua and Barbuda","alpha-2":"AG","alpha-3":"ATG","country-code":"028","region":"Americas","sub-region":"Caribbean"},
    {"name":"Argentina","alpha-2":"AR","alpha-3":"ARG","country-code":"032","region":"Americas","sub-region":"South America"},
    {"name":"Armenia","alpha-2":"AM","alpha-3":"ARM","country-code":"051","region":"Asia","sub-region":"Western Asia"},
    {"name":"Aruba","alpha-2":"AW","alpha-3":"ABW","country-code":"533","region":"Americas","sub-region":"Caribbean"},
    {"name":"Australia","alpha-2":"AU","alpha-3":"AUS","country-code":"036","region":"Oceania","sub-region":"Australia and New Zealand"},
    {"name":"Austria","alpha-2":"AT","alpha-3":"AUT","country-code":"040","region":"Europe","sub-region":"Western Europe"},
    {"name":"Azerbaijan","alpha-2":"AZ","alpha-3":"AZE","country-code":"031","region":"Asia","sub-region":"Western Asia"},
    {"name":"Bahamas","alpha-2":"BS","alpha-3":"BHS","country-code":"044","region":"Americas","sub-region":"Caribbean"},
    {"name":"Bahrain","alpha-2":"BH","alpha-3":"BHR","country-code":"048","region":"Asia","sub-region":"Western Asia"},
    {"name":"Bangladesh","alpha-2":"BD","alpha-3":"BGD","country-code":"050","region":"Asia","sub-region":"Southern Asia"},
    {"name":"Barbados","alpha-2":"BB","alpha-3":"BRB","country-code":"052","region":"Americas","sub-region":"Caribbean"},
    {"name":"Belarus","alpha-2":"BY","alpha-3":"BLR","country-code":"112","region":"Europe","sub-region":"Eastern Europe"},
    {"name":"Belgium","alpha-2":"BE","alpha-3":"BEL","country-code":"056","region":"Europe","sub-region":"Western Europe"},
    {"name":"Belize","alpha-2":"BZ","alpha-3":"BLZ","country-code":"084","region":"Americas","sub-region":"Central America"},
    {"name":"Benin","alpha-2":"BJ","alpha-3":"BEN","country-code":"204","region":"Africa","sub-region":"Western Africa"},
    {"name":"Bermuda","alpha-2":"BM","alpha-3":"BMU","country-code":"060","region":"Americas","sub-region":"Northern America"},
    {"name":"Bhutan","alpha-2":"BT","alpha-3":"BTN","country-code":"064","region":"Asia","sub-region":"Southern Asia"},
    {"name":"Bolivia, Plurinational State of","alpha-2":"BO","alpha-3":"BOL","country-code":"068","region":"Americas","sub-region":"South America"},
    {"name":"Bonaire, Sint Eustatius and Saba","alpha-2":"BQ","alpha-3":"BES","country-code":"535","region":"Americas","sub-region":"Caribbean"},
    {"name":"Bosnia and Herzegovina","alpha-2":"BA","alpha-3":"BIH","country-code":"070","region":"Europe","sub-region":"Southern Europe"},
    {"name":"Botswana","alpha-2":"BW","alpha-3":"BWA","country-code":"072","region":"Africa","sub-region":"Southern Africa"},
    {"name":"Bouvet Island","alpha-2":"BV","alpha-3":"BVT","country-code":"074","region":"Americas","sub-region":"South America"},
    {"name":"Brazil","alpha-2":"BR","alpha-3":"BRA","country-code":"076","region":"Americas","sub-region":"South America"},
    {"name":"British Indian Ocean Territory","alpha-2":"IO","alpha-3":"IOT","country-code":"086","region":"Africa","sub-region":"Eastern Africa"},
    {"name":"Brunei Darussalam","alpha-2":"BN","alpha-3":"BRN","country-code":"096","region":"Asia","sub-region":"South-eastern Asia"},
    {"name":"Bulgaria","alpha-2":"BG","alpha-3":"BGR","country-code":"100","region":"Europe","sub-region":"Eastern Europe"},
    {"name":"Burkina Faso","alpha-2":"BF","alpha-3":"BFA","country-code":"854","region":"Africa","sub-region":"Western Africa"},
    {"name":"Burundi","alpha-2":"BI","alpha-3":"BDI","country-code":"108","region":"Africa","sub-region":"Eastern Africa"},
    {"name":"Cabo Verde","alpha-2":"CV","alpha-3":"CPV","country-code":"132","region":"Africa","sub-region":"Western Africa"},
    {"name":"Cambodia","alpha-2":"KH","alpha-3":"KHM","country-code":"116","region":"Asia","sub-region":"South-eastern Asia"},
    {"name":"Cameroon","alpha-2":"CM","alpha-3":"CMR","country-code":"120","region":"Africa","sub-region":"Middle Africa"},
    {"name":"Canada","alpha-2":"CA","alpha-3":"CAN","country-code":"124","region":"Americas","sub-region":"Northern America"},
    {"name":"Cayman Islands","alpha-2":"KY","alpha-3":"CYM","country-code":"136","region":"Americas","sub-region":"Caribbean"},
    {"name":"Central African Republic","alpha-2":"CF","alpha-3":"CAF","country-code":"140","region":"Africa","sub-region":"Middle Africa"},
    {"name":"Chad","alpha-2":"TD","alpha-3":"TCD","country-code":"148","region":"Africa","sub-region":"Middle Africa"},
    {"name":"Chile","alpha-2":"CL","alpha-3":"CHL","country-code":"152","region":"Americas","sub-region":"South America"},
    {"name":"China","alpha-2":"CN","alpha-3":"CHN","country-code":"156","region":"Asia","sub-region":"Eastern Asia"},
    {"name":"Christmas Island","alpha-2":"CX","alpha-3":"CXR","country-code":"162","region":"Oceania","sub-region":"Australia and New Zealand"},
    {"name":"Cocos (Keeling) Islands","alpha-2":"CC","alpha-3":"CCK","country-code":"166","region":"Oceania","sub-region":"Australia and New Zealand"},
    {"name":"Colombia","alpha-2":"CO","alpha-3":"COL","country-code":"170","region":"Americas","sub-region":"South America"},
    {"name":"Comoros","alpha-2":"KM","alpha-3":"COM","country-code":"174","region":"Africa","sub-region":"Eastern Africa"},
    {"name":"Congo","alpha-2":"CG","alpha-3":"COG","country-code":"178","region":"Africa","sub-region":"Middle Africa"},
    {"name":"Congo, Democratic Republic of the","alpha-2":"CD","alpha-3":"COD","country-code":"180","region":"Africa","sub-region":"Middle Africa"},
    {"name":"Cook Islands","alpha-2":"CK","alpha-3":"COK","country-code":"184","region":"Oceania","sub-region":"Polynesia"},
    {"name":"Costa Rica","alpha-2":"CR","alpha-3":"CRI","country-code":"188","region":"Americas","sub-region":"Central America"},
    {"name":"Côte d'Ivoire","alpha-2":"CI","alpha-3":"CIV","country-code":"384","region":"Africa","sub-region":"Western Africa"},
    {"name":"Croatia","alpha-2":"HR","alpha-3":"HRV","country-code":"191","region":"Europe","sub-region":"Southern Europe"},
    {"name":"Cuba","alpha-2":"CU","alpha-3":"CUB","country-code":"192","region":"Americas","sub-region":"Caribbean"},
    {"name":"Curaçao","alpha-2":"CW","alpha-3":"CUW","country-code":"531","region":"Americas","sub-region":"Caribbean"},
    {"name":"Cyprus","alpha-2":"CY","alpha-3":"CYP","country-code":"196","region":"Asia","sub-region":"Western Asia"},
    {"name":"Czechia","alpha-2":"CZ","alpha-3":"CZE","country-code":"203","region":"Europe","sub-region":"Eastern Europe"},
    {"name":"Denmark","alpha-2":"DK","alpha-3":"DNK","country-code":"208","region":"Europe","sub-region":"Northern Europe"},
    {"name":"Djibouti","alpha-2":"DJ","alpha-3":"DJI","country-code":"262","region":"Africa","sub-region":"Eastern Africa"},
    {"name":"Dominica","alpha-2":"DM","alpha-3":"DMA","country-code":"212","region":"Americas","sub-region":"Caribbean"},
    {"name":"Dominican Republic","alpha-2":"DO","alpha-3":"DOM","country-code":"214","region":"Americas","sub-region":"Caribbean"},
    {"name":"Ecuador","alpha-2":"EC","alpha-3":"ECU","country-code":"218","region":"Americas","sub-region":"South America"},
    {"name":"Egypt","alpha-2":"EG","alpha-3":"EGY","country-code":"818","region":"Africa","sub-region":"Northern Africa"},
    {"name":"El Salvador","alpha-2":"SV","alpha-3":"SLV","country-code":"222","region":"Americas","sub-region":"Central America"},
    {"name":"Equatorial Guinea","alpha-2":"GQ","alpha-3":"GNQ","country-code":"226","region":"Africa","sub-region":"Middle Africa"},
    {"name":"Eritrea","alpha-2":"ER","alpha-3":"ERI","country-code":"232","region":"Africa","sub-region":"Eastern Africa"},
    {"name":"Estonia","alpha-2":"EE","alpha-3":"EST","country-code":"233","region":"Europe","sub-region":"Northern Europe"},
    {"name":"Eswatini","alpha-2":"SZ","alpha-3":"SWZ","country-code":"748","region":"Africa","sub-region":"Southern Africa"},
    {"name":"Ethiopia","alpha-2":"ET","alpha-3":"ETH","country-code":"231","region":"Africa","sub-region":"Eastern Africa"},
    {"name":"Falkland Islands (Malvinas)","alpha-2":"FK","alpha-3":"FLK","country-code":"238","region":"Americas","sub-region":"South America"},
    {"name":"Faroe Islands","alpha-2":"FO","alpha-3":"FRO","country-code":"234","region":"Europe","sub-region":"Northern Europe"},
    {"name":"Fiji","alpha-2":"FJ","alpha-3":"FJI","country-code":"242","region":"Oceania","sub-region":"Melanesia"},
    {"name":"Finland","alpha-2":"FI","alpha-3":"FIN","country-code":"246","region":"Europe","sub-region":"Northern Europe"},
    {"name":"France","alpha-2":"FR","alpha-3":"FRA","country-code":"250","region":"Europe","sub-region":"Western Europe"},
    {"name":"French Guiana","alpha-2":"GF","alpha-3":"GUF","country-code":"254","region":"Americas","sub-region":"South America"},
    {"name":"French Polynesia","alpha-2":"PF","alpha-3":"PYF","country-code":"258","region":"Oceania","sub-region":"Polynesia"},
    {"name":"French Southern Territories","alpha-2":"TF","alpha-3":"ATF","country-code":"260","region":"Africa","sub-region":"Eastern Africa"},
    {"name":"Gabon","alpha-2":"GA","alpha-3":"GAB","country-code":"266","region":"Africa","sub-region":"Middle Africa"},
    {"name":"Gambia","alpha-2":"GM","alpha-3":"GMB","country-code":"270","region":"Africa","sub-region":"Western Africa"},
    {"name":"Georgia","alpha-2":"GE","alpha-3":"GEO","country-code":"268","region":"Asia","sub-region":"Western Asia"},
    {"name":"Germany","alpha-2":"DE","alpha-3":"DEU","country-code":"276","region":"Europe","sub-region":"Western Europe"},
    {"name":"Ghana","alpha-2":"GH","alpha-3":"GHA","country-code":"288","region":"Africa","sub-region":"Western Africa"},
    {"name":"Gibraltar","alpha-2":"GI","alpha-3":"GIB","country-code":"292","region":"Europe","sub-region":"Southern Europe"},
    {"name":"Greece","alpha-2":"GR","alpha-3":"GRC","country-code":"300","region":"Europe","sub-region":"Southern Europe"},
    {"name":"Greenland","alpha-2":"GL","alpha-3":"GRL","country-code":"304","region":"Americas","sub-region":"Northern America"},
    {"name":"Grenada","alpha-2":"GD","alpha-3":"GRD","country-code":"308","region":"Americas","sub-region":"Caribbean"},
    {"name":"Guadeloupe","alpha-2":"GP","alpha-3":"GLP","country-code":"312","region":"Americas","sub-region":"Caribbean"},
    {"name":"Guam","alpha-2":"GU","alpha-3":"GUM","country-code":"316","region":"Oceania","sub-region":"Micronesia"},
    {"name":"Guatemala","alpha-2":"GT","alpha-3":"GTM","country-code":"320","region":"Americas","sub-region":"Central America"},
    {"name":"Guernsey","alpha-2":"GG","alpha-3":"GGY","country-code":"831","region":"Europe","sub-region":"Northern Europe"},
    {"name":"Guinea","alpha-2":"GN","alpha-3":"GIN","country-code":"324","region":"Africa","sub-region":"Western Africa"},
    {"name":"Guinea-Bissau","alpha-2":"GW","alpha-3":"GNB","country-code":"624","region":"Africa","sub-region":"Western Africa"},
    {"name":"Guyana","alpha-2":"GY","alpha-3":"GUY","country-code":"328","region":"Americas","sub-region":"South America"},
    {"name":"Haiti","alpha-2":"HT","alpha-3":"HTI","country-code":"332","region":"Americas","sub-region":"Caribbean"},
    {"name":"Heard Island and McDonald Islands","alpha-2":"HM","alpha-3":"HMD","country-code":"334","region":"Oceania","sub-region":"Australia and New Zealand"},
    {"name":"Holy See","alpha-2":"VA","alpha-3":"VAT","country-code":"336","region":"Europe","sub-region":"Southern Europe"},
    {"name":"Honduras","alpha-2":"HN","alpha-3":"HND","country-code":"340","region":"Americas","sub-region":"Central America"},
    {"name":"Hungary","alpha-2":"HU","alpha-3":"HUN","country-code":"348","region":"Europe","sub-region":"Eastern Europe"},
    {"name":"Iceland","alpha-2":"IS","alpha-3":"ISL","country-code":"352","region":"Europe","sub-region":"Northern Europe"},
    {"name":"India","alpha-2":"IN","alpha-3":"IND","country-code":"356","region":"Asia","sub-region":"Southern Asia"},
    {"name":"Indonesia","alpha-2":"ID","alpha-3":"IDN","country-code":"360","region":"Asia","sub-region":"South-eastern Asia"},
    {"name":"Iran, Islamic Republic of","alpha-2":"IR","alpha-3":"IRN","country-code":"364","region":"Asia","sub-region":"Southern Asia"},
    {"name":"Iraq","alpha-2":"IQ","alpha-3":"IRQ","country-code":"368","region":"Asia","sub-region":"Western Asia"},
    {"name":"Ireland","alpha-2":"IE","alpha-3":"IRL","country-code":"372","region":"Europe","sub-region":"Northern Europe"},
    {"name":"Isle of Man","alpha-2":"IM","alpha-3":"IMN","country-code":"833","region":"Europe","sub-region":"Northern Europe"},
    {"name":"Israel","alpha-2":"IL","alpha-3":"ISR","country-code":"376","region":"Asia","sub-region":"Western Asia"},
    {"name":"Italy","alpha-2":"IT","alpha-3":"ITA","country-code":"380","region":"Europe","sub-region":"Southern Europe"},
    {"name":"Jamaica","alpha-2":"JM","alpha-3":"JAM","country-code":"388","region":"Americas","sub-region":"Caribbean"},
    {"name":"Japan","alpha-2":"JP","alpha-3":"JPN","country-code":"392","region":"Asia","sub-region":"Eastern Asia"},
    {"name":"Jersey","alpha-2":"JE","alpha-3":"JEY","country-code":"832","region":"Europe","sub-region":"Northern Europe"},
    {"name":"Jordan","alpha-2":"JO","alpha-3":"JOR","country-code":"400","region":"Asia","sub-region":"Western Asia"},
    {"name":"Kazakhstan","alpha-2":"KZ","alpha-3":"KAZ","country-code":"398","region":"Asia","sub-region":"Central Asia"},
    {"name":"Kenya","alpha-2":"KE","alpha-3":"KEN","country-code":"404","region":"Africa","sub-region":"Eastern Africa"},
    {"name":"Kiribati","alpha-2":"KI","alpha-3":"KIR","country-code":"296","region":"Oceania","sub-region":"Micronesia"},
    {"name":"Korea, Democratic People's Republic of","alpha-2":"KP","alpha-3":"PRK","country-code":"408","region":"Asia","sub-region":"Eastern Asia"},
    {"name":"Korea, Republic of","alpha-2":"KR","alpha-3":"KOR","country-code":"410","region":"Asia","sub-region":"Eastern Asia"},
    {"name":"Kuwait","alpha-2":"KW","alpha-3":"KWT","country-code":"414","region":"Asia","sub-region":"Western Asia"},
    {"name":"Kyrgyzstan","alpha-2":"KG","alpha-3":"KGZ","country-code":"417","region":"Asia","sub-region":"Central Asia"},
    {"name":"Lao People's Democratic Republic","alpha-2":"LA","alpha-3":"LAO","country-code":"418","region":"Asia","sub-region":"South-eastern Asia"},
    {"name":"Latvia","alpha-2":"LV","alpha-3":"LVA","country-code":"428","region":"Europe","sub-region":"Northern Europe"},
    {"name":"Lebanon","alpha-2":"LB","alpha-3":"LBN","country-code":"422","region":"Asia","sub-region":"Western Asia"},
    {"name":"Lesotho","alpha-2":"LS","alpha-3":"LSO","country-code":"426","region":"Africa","sub-region":"Southern Africa"},
    {"name":"Liberia","alpha-2":"LR","alpha-3":"LBR","country-code":"430","region":"Africa","sub-region":"Western Africa"},
    {"name":"Libya","alpha-2":"LY","alpha-3":"LBY","country-code":"434","region":"Africa","sub-region":"Northern Africa"},
    {"name":"Liechtenstein","alpha-2":"LI","alpha-3":"LIE","country-code":"438","region":"Europe","sub-region":"Western Europe"},
    {"name":"Lithuania","alpha-2":"LT","alpha-3":"LTU","country-code":"440","region":"Europe","sub-region":"Northern Europe"},
    {"name":"Luxembourg","alpha-2":"LU","alpha-3":"LUX","country-code":"442","region":"Europe","sub-region":"Western Europe"},
    {"name":"Macao","alpha-2":"MO","alpha-3":"MAC","country-code":"446","region":"Asia","sub-region":"Eastern Asia"},
    {"name":"Madagascar","alpha-2":"MG","alpha-3":"MDG","country-code":"450","region":"Africa","sub-region":"Eastern Africa"},
    {"name":"Malawi","alpha-2":"MW","alpha-3":"MWI","country-code":"454","region":"Africa","sub-region":"Eastern Africa"},
    {"name":"Malaysia","alpha-2":"MY","alpha-3":"MYS","country-code":"458","region":"Asia","sub-region":"South-eastern Asia"},
    {"name":"Maldives","alpha-2":"MV","alpha-3":"MDV","country-code":"462","region":"Asia","sub-region":"Southern Asia"},
    {"name":"Mali","alpha-2":"ML","alpha-3":"MLI","country-code":"466","region":"Africa","sub-region":"Western Africa"},
    {"name":"Malta","alpha-2":"MT","alpha-3":"MLT","country-code":"470","region":"Europe","sub-region":"Southern Europe"},
    {"name":"Marshall Islands","alpha-2":"MH","alpha-3":"MHL","country-code":"584","region":"Oceania","sub-region":"Micronesia"},
    {"name":"Martinique","alpha-2":"MQ","alpha-3":"MTQ","country-code":"474","region":"Americas","sub-region":"Caribbean"},
    {"name":"Mauritania","alpha-2":"MR","alpha-3":"MRT","country-code":"478","region":"Africa","sub-region":"Western Africa"},
    {"name":"Mauritius","alpha-2":"MU","alpha-3":"MUS","country-code":"480","region":"Africa","sub-region":"Eastern Africa"},
    {"name":"Mayotte","alpha-2":"YT","alpha-3":"MYT","country-code":"175","region":"Africa","sub-region":"Eastern Africa"},
    {"name":"Mexico","alpha-2":"MX","alpha-3":"MEX","country-code":"484","region":"Americas","sub-region":"Central America"},
    {"name":"Micronesia, Federated States of","alpha-2":"FM","alpha-3":"FSM","country-code":"583","region":"Oceania","sub-region":"Micronesia"},
    {"name":"Moldova, Republic of","alpha-2":"MD","alpha-3":"MDA","country-code":"498","region":"Europe","sub-region":"Eastern Europe"},
    {"name":"Monaco","alpha-2":"MC","alpha-3":"MCO","country-code":"492","region":"Europe","sub-region":"Western Europe"},
    {"name":"Mongolia","alpha-2":"MN","alpha-3":"MNG","country-code":"496","region":"Asia","sub-region":"Eastern Asia"},
    {"name":"Montenegro","alpha-2":"ME","alpha-3":"MNE","country-code":"499","region":"Europe","sub-region":"Southern Europe"},
    {"name":"Montserrat","alpha-2":"MS","alpha-3":"MSR","country-code":"500","region":"Americas","sub-region":"Caribbean"},
    {"name":"Morocco","alpha-2":"MA","alpha-3":"MAR","country-code":"504","region":"Africa","sub-region":"Northern Africa"},
    {"name":"Mozambique","alpha-2":"MZ","alpha-3":"MOZ","country-code":"508","region":"Africa","sub-region":"Eastern Africa"},
    {"name":"Myanmar","alpha-2":"MM","alpha-3":"MMR","country-code":"104","region":"Asia","sub-region":"South-eastern Asia"},
    {"name":"Namibia","alpha-2":"NA","alpha-3":"NAM","country-code":"516","region":"Africa","sub-region":"Southern Africa"},
    {"name":"Nauru","alpha-2":"NR","alpha-3":"NRU","country-code":"520","region":"Oceania","sub-region":"Micronesia"},
    {"name":"Nepal","alpha-2":"NP","alpha-3":"NPL","country-code":"524","region":"Asia","sub-region":"Southern Asia"},
    {"name":"Netherlands","alpha-2":"NL","alpha-3":"NLD","country-code":"528","region":"Europe","sub-region":"Western Europe"},
    {"name":"New Caledonia","alpha-2":"NC","alpha-3":"NCL","country-code":"540","region":"Oceania","sub-region":"Melanesia"},
    {"name":"New Zealand","alpha-2":"NZ","alpha-3":"NZL","country-code":"554","region":"Oceania","sub-region":"Australia and New Zealand"},
    {"name":"Nicaragua","alpha-2":"NI","alpha-3":"NIC","country-code":"558","region":"Americas","sub-region":"Central America"},
    {"name":"Niger","alpha-2":"NE","alpha-3":"NER","country-code":"562","region":"Africa","sub-region":"Western Africa"},
    {"name":"Nigeria","alpha-2":"NG","alpha-3":"NGA","country-code":"566","region":"Africa","sub-region":"Western Africa"},
    {"name":"Niue","alpha-2":"NU","alpha-3":"NIU","country-code":"570","region":"Oceania","sub-region":"Polynesia"},
    {"name":"Norfolk Island","alpha-2":"NF","alpha-3":"NFK","country-code":"574","region":"Oceania","sub-region":"Australia and New Zealand"},
    {"name":"North Macedonia","alpha-2":"MK","alpha-3":"MKD","country-code":"807","region":"Europe","sub-region":"Southern Europe"},
    {"name":"Northern Mariana Islands","alpha-2":"MP","alpha-3":"MNP","country-code":"580","region":"Oceania","sub-region":"Micronesia"},
    {"name":"Norway","alpha-2":"NO","alpha-3":"NOR","country-code":"578","region":"Europe","sub-region":"Northern Europe"},
    {"name":"Oman","alpha-2":"OM","alpha-3":"OMN","country-code":"512","region":"Asia","sub-region":"Western Asia"},
    {"name":"Pakistan","alpha-2":"PK","alpha-3":"PAK","country-code":"586","region":"Asia","sub-region":"Southern Asia"},
    {"name":"Palau","alpha-2":"PW","alpha-3":"PLW","country-code":"585","region":"Oceania","sub-region":"Micronesia"},
    {"name":"Palestine, State of","alpha-2":"PS","alpha-3":"PSE","country-code":"275","region":"Asia","sub-region":"Western Asia"},
    {"name":"Panama","alpha-2":"PA","alpha-3":"PAN","country-code":"591","region":"Americas","sub-region":"Central America"},
    {"name":"Papua New Guinea","alpha-2":"PG","alpha-3":"PNG","country-code":"598","region":"Oceania","sub-region":"Melanesia"},
    {"name":"Paraguay","alpha-2":"PY","alpha-3":"PRY","country-code":"600","region":"Americas","sub-region":"South America"},
    {"name":"Peru","alpha-2":"PE","alpha-3":"PER","country-code":"604","region":"Americas","sub-region":"South America"},
    {"name":"Philippines","alpha-2":"PH","alpha-3":"PHL","country-code":"608","region":"Asia","sub-region":"South-eastern Asia"},
    {"name":"Pitcairn","alpha-2":"PN","alpha-3":"PCN","country-code":"612","region":"Oceania","sub-region":"Polynesia"},
    {"name":"Poland","alpha-2":"PL","alpha-3":"POL","country-code":"616","region":"Europe","sub-region":"Eastern Europe"},
    {"name":"Portugal","alpha-2":"PT","alpha-3":"PRT","country-code":"620","region":"Europe","sub-region":"Southern Europe"},
    {"name":"Puerto Rico","alpha-2":"PR","alpha-3":"PRI","country-code":"630","region":"Americas","sub-region":"Caribbean"},
    {"name":"Qatar","alpha-2":"QA","alpha-3":"QAT","country-code":"634","region":"Asia","sub-region":"Western Asia"},
    {"name":"Réunion","alpha-2":"RE","alpha-3":"REU","country-code":"638","region":"Africa","sub-region":"Eastern Africa"},
    {"name":"Romania","alpha-2":"RO","alpha-3":"ROU","country-code":"642","region":"Europe","sub-region":"Eastern Europe"},
    {"name":"Russian Federation","alpha-2":"RU","alpha-3":"RUS","country-code":"643","region":"Europe","sub-region":"Eastern Europe"},
    {"name":"Rwanda","alpha-2":"RW","alpha-3":"RWA","country-code":"646","region":"Africa","sub-region":"Eastern Africa"},
    {"name":"Saint Barthélemy","alpha-2":"BL","alpha-3":"BLM","country-code":"652","region":"Americas","sub-region":"Caribbean"},
    {"name":"Saint Helena, Ascension and Tristan da Cunha","alpha-2":"SH","alpha-3":"SHN","country-code":"654","region":"Africa","sub-region":"Western Africa"},
    {"name":"Saint Kitts and Nevis","alpha-2":"KN","alpha-3":"KNA","country-code":"659","region":"Americas","sub-region":"Caribbean"},
    {"name":"Saint Lucia","alpha-2":"LC","alpha-3":"LCA","country-code":"662","region":"Americas","sub-region":"Caribbean"},
    {"name":"Saint Martin (French part)","alpha-2":"MF","alpha-3":"MAF","country-code":"663","region":"Americas","sub-region":"Caribbean"},
    {"name":"Saint Pierre and Miquelon","alpha-2":"PM","alpha-3":"SPM","country-code":"666","region":"Americas","sub-region":"Northern America"},
    {"name":"Saint Vincent and the Grenadines","alpha-2":"VC","alpha-3":"VCT","country-code":"670","region":"Americas","sub-region":"Caribbean"},
    {"name":"Samoa","alpha-2":"WS","alpha-3":"WSM","country-code":"882","region":"Oceania","sub-region":"Polynesia"},
    {"name":"San Marino","alpha-2":"SM","alpha-3":"SMR","country-code":"674","region":"Europe","sub-region":"Southern Europe"},
    {"name":"Sao Tome and Principe","alpha-2":"ST","alpha-3":"STP","country-code":"678","region":"Africa","sub-region":"Middle Africa"},
    {"name":"Saudi Arabia","alpha-2":"SA","alpha-3":"SAU","country-code":"682","region":"Asia","sub-region":"Western Asia"},
    {"name":"Senegal","alpha-2":"SN","alpha-3":"SEN","country-code":"686","region":"Africa","sub-region":"Western Africa"},
    {"name":"Serbia","alpha-2":"RS","alpha-3":"SRB","country-code":"688","region":"Europe","sub-region":"Southern Europe"},
    {"name":"Seychelles","alpha-2":"SC","alpha-3":"SYC","country-code":"690","region":"Africa","sub-region":"Eastern Africa"},
    {"name":"Sierra Leone","alpha-2":"SL","alpha-3":"SLE","country-code":"694","region":"Africa","sub-region":"Western Africa"},
    {"name":"Singapore","alpha-2":"SG","alpha-3":"SGP","country-code":"702","region":"Asia","sub-region":"South-eastern Asia"},
    {"name":"Sint Maarten (Dutch part)","alpha-2":"SX","alpha-3":"SXM","country-code":"534","region":"Americas","sub-region":"Caribbean"},
    {"name":"Slovakia","alpha-2":"SK","alpha-3":"SVK","country-code":"703","region":"Europe","sub-region":"Eastern Europe"},
    {"name":"Slovenia","alpha-2":"SI","alpha-3":"SVN","country-code":"705","region":"Europe","sub-region":"Southern Europe"},
    {"name":"Solomon Islands","alpha-2":"SB","alpha-3":"SLB","country-code":"090","region":"Oceania","sub-region":"Melanesia"},
    {"name":"Somalia","alpha-2":"SO","alpha-3":"SOM","country-code":"706","region":"Africa","sub-region":"Eastern Africa"},
    {"name":"South Africa","alpha-2":"ZA","alpha-3":"ZAF","country-code":"710","region":"Africa","sub-region":"Southern Africa"},
    {"name":"South Georgia and the South Sandwich Islands","alpha-2":"GS","alpha-3":"SGS","country-code":"239","region":"Americas","sub-region":"South America"},
    {"name":"South Sudan","alpha-2":"SS","alpha-3":"SSD","country-code":"728","region":"Africa","sub-region":"Eastern Africa"},
    {"name":"Spain","alpha-2":"ES","alpha-3":"ESP","country-code":"724","region":"Europe","sub-region":"Southern Europe"},
    {"name":"Sri Lanka","alpha-2":"LK","alpha-3":"LKA","country-code":"144","region":"Asia","sub-region":"Southern Asia"},
    {"name":"Sudan","alpha-2":"SD","alpha-3":"SDN","country-code":"729","region":"Africa","sub-region":"Northern Africa"},
    {"name":"Suriname","alpha-2":"SR","alpha-3":"SUR","country-code":"740","region":"Americas","sub-region":"South America"},
    {"name":"Svalbard and Jan Mayen","alpha-2":"SJ","alpha-3":"SJM","country-code":"744","region":"Europe","sub-region":"Northern Europe"},
    {"name":"Sweden","alpha-2":"SE","alpha-3":"SWE","country-code":"752","region":"Europe","sub-region":"Northern Europe"},
    {"name":"Switzerland","alpha-2":"CH","alpha-3":"CHE","country-code":"756","region":"Europe","sub-region":"Western Europe"},
    {"name":"Syrian Arab Republic","alpha-2":"SY","alpha-3":"SYR","country-code":"760","region":"Asia","sub-region":"Western Asia"},
    {"name":"Taiwan, Province of China","alpha-2":"TW","alpha-3":"TWN","country-code":"158","region":"Asia","sub-region":"Eastern Asia"},
    {"name":"Tajikistan","alpha-2":"TJ","alpha-3":"TJK","country-code":"762","region":"Asia","sub-region":"Central Asia"},
    {"name":"Tanzania, United Republic of","alpha-2":"TZ","alpha-3":"TZA","country-code":"834","region":"Africa","sub-region":"Eastern Africa"},
    {"name":"Thailand","alpha-2":"TH","alpha-3":"THA","country-code":"764","region":"Asia","sub-region":"South-eastern Asia"},
    {"name":"Timor-Leste","alpha-2":"TL","alpha-3":"TLS","country-code":"626","region":"Asia","sub-region":"South-eastern Asia"},
    {"name":"Togo","alpha-2":"TG","alpha-3":"TGO","country-code":"768","region":"Africa","sub-region":"Western Africa"},
    {"name":"Tokelau","alpha-2":"TK","alpha-3":"TKL","country-code":"772","region":"Oceania","sub-region":"Polynesia"},
    {"name":"Tonga","alpha-2":"TO","alpha-3":"TON","country-code":"776","region":"Oceania","sub-region":"Polynesia"},
    {"name":"Trinidad and Tobago","alpha-2":"TT","alpha-3":"TTO","country-code":"780","region":"Americas","sub-region":"Caribbean"},
    {"name":"Tunisia","alpha-2":"TN","alpha-3":"TUN","country-code":"788","region":"Africa","sub-region":"Northern Africa"},
    {"name":"Turkey","alpha-2":"TR","alpha-3":"TUR","country-code":"792","region":"Asia","sub-region":"Western Asia"},
    {"name":"Turkmenistan","alpha-2":"TM","alpha-3":"TKM","country-code":"795","region":"Asia","sub-region":"Central Asia"},
    {"name":"Turks and Caicos Islands","alpha-2":"TC","alpha-3":"TCA","country-code":"796","region":"Americas","sub-region":"Caribbean"},
    {"name":"Tuvalu","alpha-2":"TV","alpha-3":"TUV","country-code":"798","region":"Oceania","sub-region":"Polynesia"},
    {"name":"Uganda","alpha-2":"UG","alpha-3":"UGA","country-code":"800","region":"Africa","sub-region":"Eastern Africa"},
    {"name":"Ukraine","alpha-2":"UA","alpha-3":"UKR","country-code":"804","region":"Europe","sub-region":"Eastern Europe"},
    {"name":"United Arab Emirates","alpha-2":"AE","alpha-3":"ARE","country-code":"784","region":"Asia","sub-region":"Western Asia"},
    {"name":"United Kingdom of Great Britain and Northern Ireland","alpha-2":"GB","alpha-3":"GBR","country-code":"826","region":"Europe","sub-region":"Northern Europe"},
    {"name":"United States of America","alpha-2":"US","alpha-3":"USA","country-code":"840","region":"Americas","sub-region":"Northern America"},
    {"name":"United States Minor Outlying Islands","alpha-2":"UM","alpha-3":"UMI","country-code":"581","region":"Oceania","sub-region":"Micronesia"},
    {"name":"Uruguay","alpha-2":"UY","alpha-3":"URY","country-code":"858","region":"Americas","sub-region":"South America"},
    {"name":"Uzbekistan","alpha-2":"UZ","alpha-3":"UZB","country-code":"860","region":"Asia","sub-region":"Central Asia"},
    {"name":"Vanuatu","alpha-2":"VU","alpha-3":"VUT","country-code":"548","region":"Oceania","sub-region":"Melanesia"},
    {"name":"Venezuela, Bolivarian Republic of","alpha-2":"VE","alpha-3":"VEN","country-code":"862","region":"Americas","sub-region":"South America"},
    {"name":"Viet Nam","alpha-2":"VN","alpha-3":"VNM","country-code":"704","region":"Asia","sub-region":"South-eastern Asia"},
    {"name":"Virgin Islands, British","alpha-2":"VG","alpha-3":"VGB","country-code":"092","region":"Americas","sub-region":"Caribbean"},
    {"name":"Virgin Islands, U.S.","alpha-2":"VI","alpha-3":"VIR","country-code":"850","region":"Americas","sub-region":"Caribbean"},
    {"name":"Wallis and Futuna","alpha-2":"WF","alpha-3":"WLF","country-code":"876","region":"Oceania","sub-region":"Polynesia"},
    {"name":"Western Sahara","alpha-2":"EH","alpha-3":"ESH","country-code":"732","region":"Africa","sub-region":"Northern Africa"},
    {"name":"Yemen","alpha-2":"YE","alpha-3":"YEM","country-code":"887","region":"Asia","sub-region":"Western Asia"},
    {"name":"Zambia","alpha-2":"ZM","alpha-3":"ZMB","country-code":"894","region":"Africa","sub-region":"Eastern Africa"},
    {"name":"Zimbabwe","alpha-2":"ZW","alpha-3":"ZWE","country-code":"716","region":"Africa","sub-region":"Eastern Africa"}
  ];
  
  const actionLog = [];
  const errors = [];
  
  // Process countries in batches to avoid overwhelming the database
  const batchSize = 50;
  for (let i = 0; i < countryData.length; i += batchSize) {
    const batch = countryData.slice(i, i + batchSize);
    
    for (const country of batch) {
      try {
        // Skip countries without regions (like Antarctica)
        if (!country.region) continue;
        
        console.log(`Seeding country: ${country.name} (${country['alpha-3']})`);
        
        // Check if country already exists
        const existing = await prisma.countries.findUnique({
          where: { code: country['alpha-3'] }
        });
        
        if (existing) {
          console.log(`Country ${country.name} already exists, skipping...`);
          actionLog.push(`Skipped existing country: ${country.name} (${country['alpha-3']})`);
          continue;
        }
        
        // Create country
        const created = await prisma.countries.create({
          data: {
            id: require('crypto').randomUUID(),
            name: country.name,
            code: country['alpha-3'],
            created_at: new Date(),
            updated_at: new Date()
          }
        });
        
        actionLog.push(`Created country: ${created.name} (${created.code})`);
        console.log(`Successfully created country: ${created.name}`);
      } catch (error) {
        errors.push(`Failed to create country ${country.name}: ${error.message}`);
        console.error(`Error seeding country ${country.name}:`, error.message);
      }
    }
    
    // Small delay between batches to avoid overwhelming the database
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return { actionLog, errors };
}

// Function to seed languages directly
async function seedLanguagesDirect() {
  console.log('\n--- Seeding Languages Directly ---');
  
  // Define some common languages with ISO 639-3 codes
  const languages = [
    { name: 'English', code: 'eng' },
    { name: 'Spanish', code: 'spa' },
    { name: 'French', code: 'fra' },
    { name: 'German', code: 'deu' },
    { name: 'Chinese', code: 'zho' },
    { name: 'Japanese', code: 'jpn' },
    { name: 'Korean', code: 'kor' },
    { name: 'Russian', code: 'rus' },
    { name: 'Arabic', code: 'ara' },
    { name: 'Portuguese', code: 'por' },
    { name: 'Italian', code: 'ita' },
    { name: 'Dutch', code: 'nld' },
    { name: 'Swedish', code: 'swe' },
    { name: 'Norwegian', code: 'nor' },
    { name: 'Danish', code: 'dan' },
    { name: 'Finnish', code: 'fin' },
    { name: 'Polish', code: 'pol' },
    { name: 'Turkish', code: 'tur' },
    { name: 'Hindi', code: 'hin' },
    { name: 'Bengali', code: 'ben' },
    { name: 'Urdu', code: 'urd' },
    { name: 'Thai', code: 'tha' },
    { name: 'Vietnamese', code: 'vie' },
    { name: 'Indonesian', code: 'ind' },
    { name: 'Malay', code: 'msa' },
    { name: 'Tagalog', code: 'tgl' },
    { name: 'Swahili', code: 'swa' },
    { name: 'Amharic', code: 'amh' },
    { name: 'Armenian', code: 'hye' },
    { name: 'Czech', code: 'ces' },
    { name: 'Greek', code: 'ell' },
    { name: 'Hebrew', code: 'heb' },
    { name: 'Hungarian', code: 'hun' },
    { name: 'Icelandic', code: 'isl' },
    { name: 'Romanian', code: 'ron' },
    { name: 'Slovak', code: 'slk' },
    { name: 'Ukrainian', code: 'ukr' },
    { name: 'Catalan', code: 'cat' },
    { name: 'Basque', code: 'eus' },
    { name: 'Welsh', code: 'cym' },
    { name: 'Irish', code: 'gle' },
    { name: 'Scottish Gaelic', code: 'gla' },
    { name: 'Farsi', code: 'fas' },
    { name: 'Malayalam', code: 'mal' },
    { name: 'Tamil', code: 'tam' },
    { name: 'Telugu', code: 'tel' },
    { name: 'Marathi', code: 'mar' },
    { name: 'Punjabi', code: 'pan' },
    { name: 'Gujarati', code: 'guj' },
    { name: 'Burmese', code: 'mya' },
    { name: 'Khmer', code: 'khm' },
    { name: 'Lao', code: 'lao' },
    { name: 'Mongolian', code: 'mon' },
    { name: 'Nepali', code: 'nep' },
    { name: 'Sinhala', code: 'sin' },
    { name: 'Tibetan', code: 'bod' },
    { name: 'Azerbaijani', code: 'aze' },
    { name: 'Belarusian', code: 'bel' },
    { name: 'Bulgarian', code: 'bul' },
    { name: 'Croatian', code: 'hrv' },
    { name: 'Estonian', code: 'est' },
    { name: 'Latvian', code: 'lav' },
    { name: 'Lithuanian', code: 'lit' },
    { name: 'Macedonian', code: 'mkd' },
    { name: 'Serbian', code: 'srp' },
    { name: 'Slovenian', code: 'slv' },
    { name: 'Albanian', code: 'sqi' },
    { name: 'Georgian', code: 'kat' },
    { name: 'Kazakh', code: 'kaz' },
    { name: 'Uzbek', code: 'uzb' },
    { name: 'Afrikaans', code: 'afr' },
    { name: 'Zulu', code: 'zul' },
    { name: 'Xhosa', code: 'xho' },
    { name: 'Yoruba', code: 'yor' },
    { name: 'Igbo', code: 'ibo' },
    { name: 'Hausa', code: 'hau' },
    { name: 'Somali', code: 'som' },
    { name: 'Kinyarwanda', code: 'kin' },
    { name: 'Luganda', code: 'lug' },
    { name: 'Akan', code: 'aka' },
    { name: 'Fulah', code: 'ful' },
    { name: 'Wolof', code: 'wol' },
    { name: 'Tigrinya', code: 'tir' },
    { name: 'Oromo', code: 'orm' },
    { name: 'Kurdish', code: 'kur' },
    { name: 'Pashto', code: 'pus' },
    { name: 'Dari', code: 'prs' },
    { name: 'Uyghur', code: 'uig' },
    { name: 'Sindhi', code: 'snd' },
    { name: 'Balochi', code: 'bal' },
    { name: 'Dhivehi', code: 'div' },
    { name: 'Maltese', code: 'mlt' },
    { name: 'Luxembourgish', code: 'ltz' },
    { name: 'Breton', code: 'bre' },
    { name: 'Corsican', code: 'cos' },
    { name: 'Frisian', code: 'fry' },
    { name: 'Galician', code: 'glg' },
    { name: 'Manx', code: 'glv' },
    { name: 'Samoan', code: 'smo' },
    { name: 'Tongan', code: 'ton' },
    { name: 'Hawaiian', code: 'haw' },
    { name: 'Maori', code: 'mri' },
    { name: 'Esperanto', code: 'epo' }
  ];
  
  const actionLog = [];
  const errors = [];
  
  // Process languages in batches
  const batchSize = 20;
  for (let i = 0; i < languages.length; i += batchSize) {
    const batch = languages.slice(i, i + batchSize);
    
    for (const language of batch) {
      try {
        console.log(`Seeding language: ${language.name} (${language.code})`);
        
        // Check if language already exists
        const existing = await prisma.languages.findUnique({
          where: { code: language.code }
        });
        
        if (existing) {
          console.log(`Language ${language.name} already exists, skipping...`);
          actionLog.push(`Skipped existing language: ${language.name} (${language.code})`);
          continue;
        }
        
        // Create language
        const created = await prisma.languages.create({
          data: {
            id: require('crypto').randomUUID(),
            name: language.name,
            code: language.code,
            created_at: new Date(),
            updated_at: new Date()
          }
        });
        
        actionLog.push(`Created language: ${created.name} (${created.code})`);
        console.log(`Successfully created language: ${created.name}`);
      } catch (error) {
        errors.push(`Failed to create language ${language.name}: ${error.message}`);
        console.error(`Error seeding language ${language.name}:`, error.message);
      }
    }
    
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return { actionLog, errors };
}

// Main function to seed all data directly
async function main() {
  try {
    console.log('Starting direct database seeding...');
    
    // Track all actions and errors
    const allActions = [];
    const allErrors = [];

    // Seed regions
    const { actionLog: regionActions, errors: regionErrors } = await seedRegionsDirect();
    allActions.push(...regionActions);
    allErrors.push(...regionErrors);

    // Seed countries
    const { actionLog: countryActions, errors: countryErrors } = await seedCountriesDirect();
    allActions.push(...countryActions);
    allErrors.push(...countryErrors);

    // Seed languages
    const { actionLog: languageActions, errors: languageErrors } = await seedLanguagesDirect();
    allActions.push(...languageActions);
    allErrors.push(...languageErrors);

    // Summary
    console.log('\n--- Seeding Complete ---');
    console.log(`Total actions: ${allActions.length}`);
    console.log(`Total errors: ${allErrors.length}`);
    
    if (allErrors.length > 0) {
      console.log('\nErrors encountered:');
      allErrors.forEach(error => console.log(`- ${error}`));
    }
    
    // Save logs
    await fs.writeFile('scripts/seeding/seed-action-log.json', JSON.stringify(allActions, null, 2));
    await fs.writeFile('scripts/seeding/seed-errors.json', JSON.stringify(allErrors, null, 2));
    
    console.log('\nLogs saved to scripts/seeding/seed-action-log.json and scripts/seeding/seed-errors.json');
    
    return { actions: allActions, errors: allErrors };
    
  } catch (error) {
    console.error('Error in main function:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };