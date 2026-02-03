import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GeoIPService, GeoIPResult } from './geoip.service';
import * as fs from 'fs';

// Mock the fs module
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock @maxmind/geoip2-node
const mockCity = jest.fn();
const mockReaderModel = {
  city: mockCity,
};
jest.mock('@maxmind/geoip2-node', () => ({
  Reader: {
    openBuffer: jest.fn(() => mockReaderModel),
  },
  ReaderModel: jest.fn(),
  City: jest.fn(),
}));

describe('GeoIPService', () => {
  let service: GeoIPService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeoIPService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<GeoIPService>(GeoIPService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should not initialize when GEOIP_DATABASE_PATH is not configured', async () => {
      mockConfigService.get.mockReturnValue(undefined);

      await service.onModuleInit();

      expect(service.isAvailable()).toBe(false);
    });

    it('should not initialize when database file does not exist', async () => {
      mockConfigService.get.mockReturnValue('/path/to/nonexistent.mmdb');
      mockFs.existsSync.mockReturnValue(false);

      await service.onModuleInit();

      expect(service.isAvailable()).toBe(false);
    });

    it('should initialize successfully when database exists', async () => {
      mockConfigService.get.mockReturnValue('/path/to/GeoLite2-City.mmdb');
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(Buffer.from('mock data'));

      await service.onModuleInit();

      expect(service.isAvailable()).toBe(true);
    });
  });

  describe('lookup', () => {
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

    beforeEach(async () => {
      // Initialize the service with a mock database
      mockConfigService.get.mockReturnValue('/path/to/GeoLite2-City.mmdb');
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(Buffer.from('mock data'));
      await service.onModuleInit();
    });

    it('should return empty result when service is not available', async () => {
      // Create a new service instance without initialization
      mockConfigService.get.mockReturnValue(undefined);
      const uninitializedService = new GeoIPService(configService);

      const result = await uninitializedService.lookup('8.8.8.8');

      expect(result).toEqual(emptyResult);
    });

    it('should return empty result for private IPv4 addresses', async () => {
      const privateIPs = [
        '10.0.0.1',
        '192.168.1.1',
        '172.16.0.1',
        '172.31.255.255',
        '127.0.0.1',
        '0.0.0.0',
      ];

      for (const ip of privateIPs) {
        const result = await service.lookup(ip);
        expect(result).toEqual(emptyResult);
      }
    });

    it('should return empty result for private IPv6 addresses', async () => {
      const privateIPs = ['::1', '::', 'fe80::1', 'fc00::1', 'fd00::1'];

      for (const ip of privateIPs) {
        const result = await service.lookup(ip);
        expect(result).toEqual(emptyResult);
      }
    });

    it('should return geographic data for valid public IP', async () => {
      mockCity.mockReturnValue({
        country: {
          isoCode: 'US',
          names: { en: 'United States' },
        },
        subdivisions: [
          {
            isoCode: 'CA',
            names: { en: 'California' },
          },
        ],
        city: {
          names: { en: 'San Francisco' },
        },
        postal: {
          code: '94102',
        },
        location: {
          latitude: 37.7749,
          longitude: -122.4194,
          timeZone: 'America/Los_Angeles',
        },
      });

      const result = await service.lookup('8.8.8.8');

      expect(result).toEqual({
        country: 'US',
        countryName: 'United States',
        region: 'California',
        regionCode: 'CA',
        city: 'San Francisco',
        postalCode: '94102',
        latitude: 37.7749,
        longitude: -122.4194,
        timezone: 'America/Los_Angeles',
      });
    });

    it('should handle missing fields gracefully', async () => {
      mockCity.mockReturnValue({
        country: {
          isoCode: 'CA',
          names: { en: 'Canada' },
        },
        // No subdivisions, city, postal, or location
      });

      const result = await service.lookup('1.2.3.4');

      expect(result).toEqual({
        country: 'CA',
        countryName: 'Canada',
        region: null,
        regionCode: null,
        city: null,
        postalCode: null,
        latitude: null,
        longitude: null,
        timezone: null,
      });
    });

    it('should return empty result when IP is not found in database', async () => {
      const notFoundError = new Error('The address 1.2.3.4 is not found in the database');
      mockCity.mockImplementation(() => {
        throw notFoundError;
      });

      const result = await service.lookup('1.2.3.4');

      expect(result).toEqual(emptyResult);
    });

    it('should return empty result on lookup error (graceful degradation)', async () => {
      mockCity.mockImplementation(() => {
        throw new Error('Database read error');
      });

      const result = await service.lookup('8.8.8.8');

      expect(result).toEqual(emptyResult);
    });
  });

  describe('getCountry', () => {
    beforeEach(async () => {
      mockConfigService.get.mockReturnValue('/path/to/GeoLite2-City.mmdb');
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(Buffer.from('mock data'));
      await service.onModuleInit();
    });

    it('should return country code for valid IP', async () => {
      mockCity.mockReturnValue({
        country: { isoCode: 'GB', names: { en: 'United Kingdom' } },
      });

      const country = await service.getCountry('1.2.3.4');

      expect(country).toBe('GB');
    });

    it('should return null for private IP', async () => {
      const country = await service.getCountry('192.168.1.1');

      expect(country).toBeNull();
    });
  });

  describe('isPrivateIP', () => {
    beforeEach(async () => {
      mockConfigService.get.mockReturnValue('/path/to/GeoLite2-City.mmdb');
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(Buffer.from('mock data'));
      await service.onModuleInit();
    });

    it('should identify 10.x.x.x as private', async () => {
      const result = await service.lookup('10.0.0.1');
      expect(result.country).toBeNull();
    });

    it('should identify 192.168.x.x as private', async () => {
      const result = await service.lookup('192.168.0.1');
      expect(result.country).toBeNull();
    });

    it('should identify 172.16-31.x.x as private', async () => {
      for (let i = 16; i <= 31; i++) {
        const result = await service.lookup(`172.${i}.0.1`);
        expect(result.country).toBeNull();
      }
    });

    it('should identify localhost as private', async () => {
      const result = await service.lookup('127.0.0.1');
      expect(result.country).toBeNull();
    });

    it('should identify IPv6 loopback as private', async () => {
      const result = await service.lookup('::1');
      expect(result.country).toBeNull();
    });
  });
});
