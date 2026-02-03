import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reader, ReaderModel, City } from '@maxmind/geoip2-node';
import * as path from 'path';
import * as fs from 'fs';

/**
 * GeoIP lookup result interface
 * Contains geographic information derived from an IP address
 */
export interface GeoIPResult {
  /** ISO 3166-1 alpha-2 country code (e.g., "US", "GB", "CA") */
  country: string | null;
  /** Full country name (e.g., "United States", "United Kingdom") */
  countryName: string | null;
  /** Region/state/province name (e.g., "California", "Ontario") */
  region: string | null;
  /** Region/state ISO code (e.g., "CA", "ON") */
  regionCode: string | null;
  /** City name (e.g., "San Francisco", "Toronto") */
  city: string | null;
  /** Postal/ZIP code */
  postalCode: string | null;
  /** Latitude coordinate */
  latitude: number | null;
  /** Longitude coordinate */
  longitude: number | null;
  /** Timezone (e.g., "America/Los_Angeles") */
  timezone: string | null;
}

/**
 * GeoIP Service
 *
 * Provides IP address geolocation using MaxMind GeoLite2 City database.
 *
 * Setup Requirements:
 * 1. Download the GeoLite2-City.mmdb database from MaxMind
 *    (requires free account at https://www.maxmind.com/en/geolite2/signup)
 * 2. Set GEOIP_DATABASE_PATH environment variable to the path of the .mmdb file
 *
 * Usage:
 * - Lookup IP addresses to get geographic information
 * - Handles IPv4 and IPv6 addresses
 * - Gracefully handles missing database or lookup failures
 */
@Injectable()
export class GeoIPService implements OnModuleInit {
  private readonly logger = new Logger(GeoIPService.name);
  private reader: ReaderModel | null = null;
  private isInitialized = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.initializeReader();
  }

  /**
   * Initialize the MaxMind database reader
   * This is called on module init but can be called again if needed
   */
  async initializeReader(): Promise<void> {
    try {
      const dbPath = this.getDatabasePath();

      if (!dbPath) {
        this.logger.warn(
          'GEOIP_DATABASE_PATH not configured. GeoIP lookups will be disabled. ' +
          'To enable, download GeoLite2-City.mmdb from MaxMind and set the environment variable.'
        );
        return;
      }

      // Resolve relative paths from project root
      const resolvedPath = path.isAbsolute(dbPath)
        ? dbPath
        : path.resolve(process.cwd(), dbPath);

      if (!fs.existsSync(resolvedPath)) {
        this.logger.warn(
          `GeoIP database not found at ${resolvedPath}. GeoIP lookups will be disabled. ` +
          'Download GeoLite2-City.mmdb from MaxMind and place it at the configured path.'
        );
        return;
      }

      // Open the database
      const buffer = fs.readFileSync(resolvedPath);
      this.reader = Reader.openBuffer(buffer);
      this.isInitialized = true;

      this.logger.log(`GeoIP database loaded successfully from ${resolvedPath}`);
    } catch (error) {
      this.logger.error(
        `Failed to initialize GeoIP database: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined
      );
      this.reader = null;
      this.isInitialized = false;
    }
  }

  /**
   * Get the database path from configuration
   */
  private getDatabasePath(): string | undefined {
    return this.configService.get<string>('GEOIP_DATABASE_PATH');
  }

  /**
   * Check if GeoIP service is available
   */
  isAvailable(): boolean {
    return this.isInitialized && this.reader !== null;
  }

  /**
   * Lookup geographic information for an IP address
   *
   * @param ip - IPv4 or IPv6 address to lookup
   * @returns GeoIPResult with geographic information, or null values if lookup fails
   */
  async lookup(ip: string): Promise<GeoIPResult> {
    const emptyResult: GeoIPResult = {
      country: null,
      countryName: null,
      region: null,
      regionCode: null,
      city: null,
      postalCode: null,
      latitude: null,
      longitude: null,
      timezone: null,
    };

    // Return empty result if not initialized
    if (!this.isAvailable()) {
      return emptyResult;
    }

    // Skip private/local IPs
    if (this.isPrivateIP(ip)) {
      this.logger.debug(`Skipping GeoIP lookup for private IP: ${ip}`);
      return emptyResult;
    }

    try {
      const response = this.reader!.city(ip);

      return {
        country: response.country?.isoCode || null,
        countryName: response.country?.names?.en || null,
        region: response.subdivisions?.[0]?.names?.en || null,
        regionCode: response.subdivisions?.[0]?.isoCode || null,
        city: response.city?.names?.en || null,
        postalCode: response.postal?.code || null,
        latitude: response.location?.latitude || null,
        longitude: response.location?.longitude || null,
        timezone: response.location?.timeZone || null,
      };
    } catch (error) {
      // Address not found in database is not an error, just return empty result
      if (error instanceof Error && error.message.includes('not found')) {
        this.logger.debug(`IP address ${ip} not found in GeoIP database`);
        return emptyResult;
      }

      // Log actual errors but still return empty result (graceful degradation)
      this.logger.warn(
        `GeoIP lookup failed for ${ip}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return emptyResult;
    }
  }

  /**
   * Lookup and return only the country code
   * Convenience method for simple country-based logic
   */
  async getCountry(ip: string): Promise<string | null> {
    const result = await this.lookup(ip);
    return result.country;
  }

  /**
   * Check if an IP address is private/local
   * Private IPs don't have geographic data in the database
   */
  private isPrivateIP(ip: string): boolean {
    // IPv4 private ranges
    if (ip.startsWith('10.') ||
        ip.startsWith('192.168.') ||
        ip.startsWith('172.16.') ||
        ip.startsWith('172.17.') ||
        ip.startsWith('172.18.') ||
        ip.startsWith('172.19.') ||
        ip.startsWith('172.20.') ||
        ip.startsWith('172.21.') ||
        ip.startsWith('172.22.') ||
        ip.startsWith('172.23.') ||
        ip.startsWith('172.24.') ||
        ip.startsWith('172.25.') ||
        ip.startsWith('172.26.') ||
        ip.startsWith('172.27.') ||
        ip.startsWith('172.28.') ||
        ip.startsWith('172.29.') ||
        ip.startsWith('172.30.') ||
        ip.startsWith('172.31.') ||
        ip === '127.0.0.1' ||
        ip.startsWith('127.') ||
        ip === '0.0.0.0' ||
        ip === '::1' ||
        ip === '::') {
      return true;
    }

    // IPv6 loopback and link-local
    if (ip.toLowerCase().startsWith('fe80:') ||
        ip.toLowerCase().startsWith('fc') ||
        ip.toLowerCase().startsWith('fd')) {
      return true;
    }

    return false;
  }
}
