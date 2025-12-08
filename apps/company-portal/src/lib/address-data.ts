/**
 * Address Data - Country and Region definitions for checkout forms
 * Supports US, Canada, UK, Australia, and Mexico
 */

export interface Region {
  code: string;
  name: string;
}

export interface Country {
  code: string;
  name: string;
  regions: Region[];
  postalLabel: string;
  postalPlaceholder: string;
  postalPattern: RegExp;
  regionLabel: string;
}

// US States
export const US_STATES: Region[] = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'Washington DC' },
];

// Canadian Provinces and Territories
export const CA_PROVINCES: Region[] = [
  { code: 'AB', name: 'Alberta' },
  { code: 'BC', name: 'British Columbia' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'NB', name: 'New Brunswick' },
  { code: 'NL', name: 'Newfoundland and Labrador' },
  { code: 'NS', name: 'Nova Scotia' },
  { code: 'NT', name: 'Northwest Territories' },
  { code: 'NU', name: 'Nunavut' },
  { code: 'ON', name: 'Ontario' },
  { code: 'PE', name: 'Prince Edward Island' },
  { code: 'QC', name: 'Quebec' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'YT', name: 'Yukon' },
];

// UK Counties/Regions (simplified list of common regions)
export const UK_REGIONS: Region[] = [
  { code: 'ENG', name: 'England' },
  { code: 'SCT', name: 'Scotland' },
  { code: 'WLS', name: 'Wales' },
  { code: 'NIR', name: 'Northern Ireland' },
  // Major English regions
  { code: 'LDN', name: 'Greater London' },
  { code: 'MAN', name: 'Greater Manchester' },
  { code: 'WMD', name: 'West Midlands' },
  { code: 'MER', name: 'Merseyside' },
  { code: 'SYK', name: 'South Yorkshire' },
  { code: 'WYK', name: 'West Yorkshire' },
  { code: 'TYW', name: 'Tyne and Wear' },
];

// Australian States and Territories
export const AU_STATES: Region[] = [
  { code: 'NSW', name: 'New South Wales' },
  { code: 'VIC', name: 'Victoria' },
  { code: 'QLD', name: 'Queensland' },
  { code: 'WA', name: 'Western Australia' },
  { code: 'SA', name: 'South Australia' },
  { code: 'TAS', name: 'Tasmania' },
  { code: 'ACT', name: 'Australian Capital Territory' },
  { code: 'NT', name: 'Northern Territory' },
];

// Mexican States
export const MX_STATES: Region[] = [
  { code: 'AGU', name: 'Aguascalientes' },
  { code: 'BCN', name: 'Baja California' },
  { code: 'BCS', name: 'Baja California Sur' },
  { code: 'CAM', name: 'Campeche' },
  { code: 'CHP', name: 'Chiapas' },
  { code: 'CHH', name: 'Chihuahua' },
  { code: 'COA', name: 'Coahuila' },
  { code: 'COL', name: 'Colima' },
  { code: 'CMX', name: 'Ciudad de México' },
  { code: 'DUR', name: 'Durango' },
  { code: 'GUA', name: 'Guanajuato' },
  { code: 'GRO', name: 'Guerrero' },
  { code: 'HID', name: 'Hidalgo' },
  { code: 'JAL', name: 'Jalisco' },
  { code: 'MEX', name: 'México' },
  { code: 'MIC', name: 'Michoacán' },
  { code: 'MOR', name: 'Morelos' },
  { code: 'NAY', name: 'Nayarit' },
  { code: 'NLE', name: 'Nuevo León' },
  { code: 'OAX', name: 'Oaxaca' },
  { code: 'PUE', name: 'Puebla' },
  { code: 'QUE', name: 'Querétaro' },
  { code: 'ROO', name: 'Quintana Roo' },
  { code: 'SLP', name: 'San Luis Potosí' },
  { code: 'SIN', name: 'Sinaloa' },
  { code: 'SON', name: 'Sonora' },
  { code: 'TAB', name: 'Tabasco' },
  { code: 'TAM', name: 'Tamaulipas' },
  { code: 'TLA', name: 'Tlaxcala' },
  { code: 'VER', name: 'Veracruz' },
  { code: 'YUC', name: 'Yucatán' },
  { code: 'ZAC', name: 'Zacatecas' },
];

// Country definitions with region data
export const COUNTRIES: Country[] = [
  {
    code: 'US',
    name: 'United States',
    regions: US_STATES,
    postalLabel: 'ZIP Code',
    postalPlaceholder: '12345',
    postalPattern: /^\d{5}(-\d{4})?$/,
    regionLabel: 'State',
  },
  {
    code: 'CA',
    name: 'Canada',
    regions: CA_PROVINCES,
    postalLabel: 'Postal Code',
    postalPlaceholder: 'A1A 1A1',
    postalPattern: /^[A-Z]\d[A-Z] ?\d[A-Z]\d$/i,
    regionLabel: 'Province',
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    regions: UK_REGIONS,
    postalLabel: 'Postcode',
    postalPlaceholder: 'SW1A 1AA',
    postalPattern: /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i,
    regionLabel: 'Region',
  },
  {
    code: 'AU',
    name: 'Australia',
    regions: AU_STATES,
    postalLabel: 'Postcode',
    postalPlaceholder: '2000',
    postalPattern: /^\d{4}$/,
    regionLabel: 'State/Territory',
  },
  {
    code: 'MX',
    name: 'Mexico',
    regions: MX_STATES,
    postalLabel: 'Código Postal',
    postalPlaceholder: '01000',
    postalPattern: /^\d{5}$/,
    regionLabel: 'State',
  },
];

// Helper function to get country by code
export function getCountryByCode(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code);
}

// Helper function to get regions for a country
export function getRegionsForCountry(countryCode: string): Region[] {
  const country = getCountryByCode(countryCode);
  return country?.regions || [];
}

// Helper function to validate postal code for a country
export function validatePostalCode(countryCode: string, postalCode: string): boolean {
  const country = getCountryByCode(countryCode);
  if (!country) return true; // Allow if country not found
  return country.postalPattern.test(postalCode);
}
