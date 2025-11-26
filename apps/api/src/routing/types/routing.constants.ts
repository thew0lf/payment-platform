/**
 * Routing Constants
 * Geographic and compliance reference data
 */

// OFAC Sanctioned Countries
export const SANCTIONED_COUNTRIES = [
  'CU', // Cuba
  'IR', // Iran
  'KP', // North Korea
  'SY', // Syria
  'RU', // Russia (partial)
  'BY', // Belarus
];

// High-Risk Countries (FATF Grey/Black List + Others)
export const HIGH_RISK_COUNTRIES = [
  'AF', // Afghanistan
  'AL', // Albania
  'BB', // Barbados
  'BF', // Burkina Faso
  'KH', // Cambodia
  'KY', // Cayman Islands
  'HT', // Haiti
  'JM', // Jamaica
  'JO', // Jordan
  'ML', // Mali
  'MT', // Malta
  'MA', // Morocco
  'MM', // Myanmar
  'NI', // Nicaragua
  'PK', // Pakistan
  'PA', // Panama
  'PH', // Philippines
  'SN', // Senegal
  'SS', // South Sudan
  'TZ', // Tanzania
  'TR', // Turkey
  'UG', // Uganda
  'AE', // UAE
  'VN', // Vietnam
  'YE', // Yemen
  'ZW', // Zimbabwe
];

// European Union Countries
export const EU_COUNTRIES = [
  'AT', // Austria
  'BE', // Belgium
  'BG', // Bulgaria
  'HR', // Croatia
  'CY', // Cyprus
  'CZ', // Czech Republic
  'DK', // Denmark
  'EE', // Estonia
  'FI', // Finland
  'FR', // France
  'DE', // Germany
  'GR', // Greece
  'HU', // Hungary
  'IE', // Ireland
  'IT', // Italy
  'LV', // Latvia
  'LT', // Lithuania
  'LU', // Luxembourg
  'MT', // Malta
  'NL', // Netherlands
  'PL', // Poland
  'PT', // Portugal
  'RO', // Romania
  'SK', // Slovakia
  'SI', // Slovenia
  'ES', // Spain
  'SE', // Sweden
];

// European Economic Area (EU + EFTA minus Switzerland)
export const EEA_COUNTRIES = [
  ...EU_COUNTRIES,
  'IS', // Iceland
  'LI', // Liechtenstein
  'NO', // Norway
];

// Country to Continent Mapping
export const COUNTRY_TO_CONTINENT: Record<string, string> = {
  // North America
  US: 'NA', CA: 'NA', MX: 'NA',
  // South America
  BR: 'SA', AR: 'SA', CL: 'SA', CO: 'SA', PE: 'SA', VE: 'SA', EC: 'SA', UY: 'SA', PY: 'SA', BO: 'SA',
  // Europe
  GB: 'EU', DE: 'EU', FR: 'EU', IT: 'EU', ES: 'EU', PT: 'EU', NL: 'EU', BE: 'EU', AT: 'EU', CH: 'EU',
  SE: 'EU', NO: 'EU', DK: 'EU', FI: 'EU', IE: 'EU', PL: 'EU', CZ: 'EU', HU: 'EU', RO: 'EU', GR: 'EU',
  // Asia
  CN: 'AS', JP: 'AS', KR: 'AS', IN: 'AS', ID: 'AS', TH: 'AS', VN: 'AS', MY: 'AS', SG: 'AS', PH: 'AS',
  TW: 'AS', HK: 'AS', PK: 'AS', BD: 'AS', LK: 'AS', NP: 'AS',
  // Oceania
  AU: 'OC', NZ: 'OC',
  // Africa
  ZA: 'AF', EG: 'AF', NG: 'AF', KE: 'AF', MA: 'AF', GH: 'AF', TN: 'AF', ET: 'AF',
  // Middle East
  AE: 'ME', SA: 'ME', IL: 'ME', TR: 'ME', QA: 'ME', KW: 'ME', BH: 'ME', OM: 'ME',
};

// Country to Region Mapping
export const COUNTRY_TO_REGION: Record<string, string> = {
  // EMEA
  GB: 'EMEA', DE: 'EMEA', FR: 'EMEA', IT: 'EMEA', ES: 'EMEA', NL: 'EMEA', AE: 'EMEA', SA: 'EMEA', ZA: 'EMEA',
  // APAC
  CN: 'APAC', JP: 'APAC', KR: 'APAC', IN: 'APAC', AU: 'APAC', NZ: 'APAC', SG: 'APAC', HK: 'APAC',
  // LATAM
  BR: 'LATAM', MX: 'LATAM', AR: 'LATAM', CL: 'LATAM', CO: 'LATAM', PE: 'LATAM',
  // NAM
  US: 'NAM', CA: 'NAM',
};

// US State to Region Mapping
export const US_STATE_TO_REGION: Record<string, string> = {
  // Northeast
  CT: 'NORTHEAST', ME: 'NORTHEAST', MA: 'NORTHEAST', NH: 'NORTHEAST', RI: 'NORTHEAST', VT: 'NORTHEAST',
  NJ: 'NORTHEAST', NY: 'NORTHEAST', PA: 'NORTHEAST',
  // Southeast
  AL: 'SOUTHEAST', AR: 'SOUTHEAST', FL: 'SOUTHEAST', GA: 'SOUTHEAST', KY: 'SOUTHEAST', LA: 'SOUTHEAST',
  MS: 'SOUTHEAST', NC: 'SOUTHEAST', SC: 'SOUTHEAST', TN: 'SOUTHEAST', VA: 'SOUTHEAST', WV: 'SOUTHEAST',
  // Midwest
  IL: 'MIDWEST', IN: 'MIDWEST', IA: 'MIDWEST', KS: 'MIDWEST', MI: 'MIDWEST', MN: 'MIDWEST',
  MO: 'MIDWEST', NE: 'MIDWEST', ND: 'MIDWEST', OH: 'MIDWEST', SD: 'MIDWEST', WI: 'MIDWEST',
  // Southwest
  AZ: 'SOUTHWEST', NM: 'SOUTHWEST', OK: 'SOUTHWEST', TX: 'SOUTHWEST',
  // West
  AK: 'WEST', CA: 'WEST', CO: 'WEST', HI: 'WEST', ID: 'WEST', MT: 'WEST', NV: 'WEST',
  OR: 'WEST', UT: 'WEST', WA: 'WEST', WY: 'WEST',
  // Territories
  DC: 'NORTHEAST', PR: 'SOUTHEAST', VI: 'SOUTHEAST', GU: 'WEST',
};

// Card Brand Codes
export const CARD_BRANDS = {
  VISA: 'VISA',
  MASTERCARD: 'MASTERCARD',
  AMEX: 'AMEX',
  DISCOVER: 'DISCOVER',
  JCB: 'JCB',
  DINERS: 'DINERS',
  UNIONPAY: 'UNIONPAY',
  MAESTRO: 'MAESTRO',
};

// Card Types
export const CARD_TYPES = {
  CREDIT: 'CREDIT',
  DEBIT: 'DEBIT',
  PREPAID: 'PREPAID',
  CORPORATE: 'CORPORATE',
  COMMERCIAL: 'COMMERCIAL',
};

// Digital Wallet Types
export const WALLET_TYPES = {
  APPLE_PAY: 'APPLE_PAY',
  GOOGLE_PAY: 'GOOGLE_PAY',
  SAMSUNG_PAY: 'SAMSUNG_PAY',
  PAYPAL: 'PAYPAL',
  VENMO: 'VENMO',
  CLICK_TO_PAY: 'CLICK_TO_PAY',
};
