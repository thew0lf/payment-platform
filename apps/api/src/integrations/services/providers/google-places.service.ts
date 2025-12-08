import { Injectable, Logger } from '@nestjs/common';

export interface GooglePlacesCredentials {
  apiKey: string;
  sessionTokenTTL?: number; // Session token TTL in seconds (default 180 = 3 minutes)
}

export interface GooglePlacesSettings {
  restrictToCountries?: string[]; // e.g., ['us', 'ca']
  types?: string[]; // e.g., ['address'] to restrict to addresses only
  language?: string; // e.g., 'en'
}

export interface GooglePlacesTestResult {
  success: boolean;
  message: string;
  apiKeyValid?: boolean;
  quotaRemaining?: boolean;
}

export interface AddressPrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  types: string[];
}

export interface AutocompleteResult {
  predictions: AddressPrediction[];
  sessionToken: string;
}

export interface AddressComponent {
  longName: string;
  shortName: string;
  types: string[];
}

export interface ParsedAddress {
  streetNumber?: string;
  streetName?: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  stateCode: string;
  postalCode: string;
  country: string;
  countryCode: string;
  formattedAddress: string;
  latitude?: number;
  longitude?: number;
}

export interface PlaceDetailsResult {
  placeId: string;
  address: ParsedAddress;
  formattedAddress: string;
}

@Injectable()
export class GooglePlacesService {
  private readonly logger = new Logger(GooglePlacesService.name);
  private readonly baseUrl = 'https://maps.googleapis.com/maps/api/place';

  async testConnection(credentials: GooglePlacesCredentials): Promise<GooglePlacesTestResult> {
    try {
      // Test with a simple autocomplete request
      const url = new URL(`${this.baseUrl}/autocomplete/json`);
      url.searchParams.append('input', 'test');
      url.searchParams.append('key', credentials.apiKey);
      url.searchParams.append('types', 'address');

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data.status === 'OK' || data.status === 'ZERO_RESULTS') {
        return {
          success: true,
          message: 'Google Places API connection successful',
          apiKeyValid: true,
          quotaRemaining: true,
        };
      }

      if (data.status === 'REQUEST_DENIED') {
        return {
          success: false,
          message: `API key error: ${data.error_message || 'Invalid API key or Places API not enabled'}`,
          apiKeyValid: false,
        };
      }

      if (data.status === 'OVER_QUERY_LIMIT') {
        return {
          success: false,
          message: 'API quota exceeded. Please check your billing settings.',
          apiKeyValid: true,
          quotaRemaining: false,
        };
      }

      return {
        success: false,
        message: `Unexpected status: ${data.status} - ${data.error_message || 'Unknown error'}`,
      };
    } catch (error) {
      this.logger.error('Google Places connection test failed', error);
      return {
        success: false,
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Generate a session token for grouping autocomplete requests
   * Google bundles requests with the same session token for billing
   */
  generateSessionToken(): string {
    // Generate a UUID-like token
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Get address autocomplete predictions
   */
  async autocomplete(
    credentials: GooglePlacesCredentials,
    input: string,
    sessionToken: string,
    settings?: GooglePlacesSettings,
  ): Promise<AutocompleteResult> {
    try {
      const url = new URL(`${this.baseUrl}/autocomplete/json`);
      url.searchParams.append('input', input);
      url.searchParams.append('key', credentials.apiKey);
      url.searchParams.append('sessiontoken', sessionToken);
      url.searchParams.append('types', 'address');

      // Apply settings
      if (settings?.restrictToCountries?.length) {
        url.searchParams.append('components', settings.restrictToCountries.map(c => `country:${c}`).join('|'));
      }

      if (settings?.language) {
        url.searchParams.append('language', settings.language);
      }

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new Error(`Google Places API error: ${data.status} - ${data.error_message || ''}`);
      }

      const predictions: AddressPrediction[] = (data.predictions || []).map((p: any) => ({
        placeId: p.place_id,
        description: p.description,
        mainText: p.structured_formatting?.main_text || p.description,
        secondaryText: p.structured_formatting?.secondary_text || '',
        types: p.types || [],
      }));

      return {
        predictions,
        sessionToken,
      };
    } catch (error) {
      this.logger.error('Autocomplete failed', error);
      throw error;
    }
  }

  /**
   * Get full address details for a place ID
   * This completes the session and should be called after user selects an address
   */
  async getPlaceDetails(
    credentials: GooglePlacesCredentials,
    placeId: string,
    sessionToken: string,
  ): Promise<PlaceDetailsResult> {
    try {
      const url = new URL(`${this.baseUrl}/details/json`);
      url.searchParams.append('place_id', placeId);
      url.searchParams.append('key', credentials.apiKey);
      url.searchParams.append('sessiontoken', sessionToken);
      url.searchParams.append('fields', 'address_component,formatted_address,geometry');

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data.status !== 'OK') {
        throw new Error(`Google Places API error: ${data.status} - ${data.error_message || ''}`);
      }

      const result = data.result;
      const components: AddressComponent[] = (result.address_components || []).map((c: any) => ({
        longName: c.long_name,
        shortName: c.short_name,
        types: c.types,
      }));

      const address = this.parseAddressComponents(components, result.formatted_address);

      // Add location if available
      if (result.geometry?.location) {
        address.latitude = result.geometry.location.lat;
        address.longitude = result.geometry.location.lng;
      }

      return {
        placeId,
        address,
        formattedAddress: result.formatted_address,
      };
    } catch (error) {
      this.logger.error('Get place details failed', error);
      throw error;
    }
  }

  /**
   * Parse Google's address components into a structured address
   */
  private parseAddressComponents(components: AddressComponent[], formattedAddress: string): ParsedAddress {
    const findComponent = (types: string[]): AddressComponent | undefined => {
      return components.find(c => types.some(t => c.types.includes(t)));
    };

    const streetNumber = findComponent(['street_number'])?.shortName || '';
    const streetName = findComponent(['route'])?.longName || '';
    const subpremise = findComponent(['subpremise'])?.longName;
    const city =
      findComponent(['locality'])?.longName ||
      findComponent(['sublocality_level_1'])?.longName ||
      findComponent(['administrative_area_level_2'])?.longName ||
      '';
    const stateComponent = findComponent(['administrative_area_level_1']);
    const postalCode = findComponent(['postal_code'])?.shortName || '';
    const countryComponent = findComponent(['country']);

    // Build street address
    let street1 = '';
    if (streetNumber && streetName) {
      street1 = `${streetNumber} ${streetName}`;
    } else if (streetName) {
      street1 = streetName;
    }

    return {
      streetNumber,
      streetName,
      street1,
      street2: subpremise,
      city,
      state: stateComponent?.longName || '',
      stateCode: stateComponent?.shortName || '',
      postalCode,
      country: countryComponent?.longName || '',
      countryCode: countryComponent?.shortName || '',
      formattedAddress,
    };
  }
}
