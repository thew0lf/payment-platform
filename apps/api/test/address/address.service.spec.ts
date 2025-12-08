import { Test, TestingModule } from '@nestjs/testing';
import { AddressService } from '../../src/address/address.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { GooglePlacesService } from '../../src/integrations/services/providers/google-places.service';
import { CredentialEncryptionService } from '../../src/integrations/services/credential-encryption.service';
import { IntegrationProvider, IntegrationStatus, IntegrationMode } from '../../src/integrations/types/integration.types';

describe('AddressService', () => {
  let service: AddressService;
  let prismaService: PrismaService;
  let googlePlacesService: GooglePlacesService;
  let encryptionService: CredentialEncryptionService;

  const mockCompany = {
    id: 'company-1',
    clientId: 'client-1',
    client: {
      organizationId: 'org-1',
    },
  };

  const mockClientIntegration = {
    id: 'integration-1',
    clientId: 'client-1',
    provider: IntegrationProvider.GOOGLE_PLACES,
    status: IntegrationStatus.ACTIVE,
    mode: IntegrationMode.OWN,
    credentials: { encrypted: 'data' },
    platformIntegrationId: null,
  };

  const mockPlatformIntegration = {
    id: 'platform-integration-1',
    provider: IntegrationProvider.GOOGLE_PLACES,
    status: IntegrationStatus.ACTIVE,
    isSharedWithClients: true,
    credentials: { encrypted: 'platform-data' },
  };

  const mockCredentials = {
    apiKey: 'test-api-key',
    sessionTokenTTL: 180,
  };

  const mockAutocompleteResult = {
    predictions: [
      {
        placeId: 'place-1',
        description: '123 Main St, City, State 12345',
        mainText: '123 Main St',
        secondaryText: 'City, State 12345',
        types: ['street_address'],
      },
    ],
    sessionToken: 'session-token-123',
  };

  const mockPlaceDetails = {
    placeId: 'place-1',
    address: {
      street1: '123 Main St',
      city: 'City',
      state: 'State',
      stateCode: 'ST',
      postalCode: '12345',
      country: 'United States',
      countryCode: 'US',
      formattedAddress: '123 Main St, City, State 12345',
    },
    formattedAddress: '123 Main St, City, State 12345',
  };

  beforeEach(async () => {
    const mockPrisma = {
      company: {
        findUnique: jest.fn().mockResolvedValue(mockCompany),
      },
      clientIntegration: {
        findFirst: jest.fn().mockResolvedValue(mockClientIntegration),
      },
      platformIntegration: {
        findFirst: jest.fn().mockResolvedValue(mockPlatformIntegration),
        findUnique: jest.fn().mockResolvedValue(mockPlatformIntegration),
      },
      integrationUsage: {
        create: jest.fn().mockResolvedValue({ id: 'usage-1' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const mockEncryption = {
      decrypt: jest.fn().mockReturnValue(mockCredentials),
      encrypt: jest.fn().mockReturnValue({ encrypted: 'data' }),
    };

    const mockGooglePlaces = {
      autocomplete: jest.fn().mockResolvedValue(mockAutocompleteResult),
      getPlaceDetails: jest.fn().mockResolvedValue(mockPlaceDetails),
      generateSessionToken: jest.fn().mockReturnValue('new-session-token'),
      testConnection: jest.fn().mockResolvedValue({ success: true, message: 'OK' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddressService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: GooglePlacesService, useValue: mockGooglePlaces },
        { provide: CredentialEncryptionService, useValue: mockEncryption },
      ],
    }).compile();

    service = module.get<AddressService>(AddressService);
    prismaService = module.get<PrismaService>(PrismaService);
    googlePlacesService = module.get<GooglePlacesService>(GooglePlacesService);
    encryptionService = module.get<CredentialEncryptionService>(CredentialEncryptionService);
  });

  describe('getAddressIntegration', () => {
    it('should return client integration when available', async () => {
      const result = await service.getAddressIntegration('company-1');

      expect(result).toBeDefined();
      expect(result?.isCompanyOwned).toBe(true);
      expect(prismaService.company.findUnique).toHaveBeenCalledWith({
        where: { id: 'company-1' },
        select: { id: true, clientId: true, client: { select: { organizationId: true } } },
      });
    });

    it('should fall back to platform integration when no client integration exists', async () => {
      (prismaService.clientIntegration.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.getAddressIntegration('company-1');

      expect(result).toBeDefined();
      expect(result?.isCompanyOwned).toBe(false);
    });

    it('should return null when no integration exists', async () => {
      (prismaService.clientIntegration.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.platformIntegration.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.getAddressIntegration('company-1');

      expect(result).toBeNull();
    });
  });

  describe('autocomplete', () => {
    it('should return autocomplete predictions', async () => {
      const result = await service.autocomplete('company-1', '123 Main', 'session-token', ['us']);

      expect(result).toEqual(mockAutocompleteResult);
      expect(googlePlacesService.autocomplete).toHaveBeenCalledWith(
        mockCredentials,
        '123 Main',
        'session-token',
        { restrictToCountries: ['us'] },
      );
    });

    it('should track usage after successful autocomplete', async () => {
      await service.autocomplete('company-1', '123 Main', 'session-token', ['us']);

      expect(prismaService.integrationUsage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId: 'company-1',
            provider: IntegrationProvider.GOOGLE_PLACES,
            usageType: 'autocomplete',
          }),
        }),
      );
    });

    it('should throw error when no integration is configured', async () => {
      (prismaService.clientIntegration.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.platformIntegration.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.autocomplete('company-1', '123 Main', 'session-token')).rejects.toThrow(
        'Google Places integration not configured',
      );
    });
  });

  describe('getPlaceDetails', () => {
    it('should return place details', async () => {
      const result = await service.getPlaceDetails('company-1', 'place-1', 'session-token');

      expect(result).toEqual(mockPlaceDetails);
      expect(googlePlacesService.getPlaceDetails).toHaveBeenCalledWith(
        mockCredentials,
        'place-1',
        'session-token',
      );
    });

    it('should track usage after successful place details request', async () => {
      await service.getPlaceDetails('company-1', 'place-1', 'session-token');

      expect(prismaService.integrationUsage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId: 'company-1',
            provider: IntegrationProvider.GOOGLE_PLACES,
            usageType: 'place_details',
          }),
        }),
      );
    });
  });

  describe('getUsageStats', () => {
    it('should return usage statistics', async () => {
      (prismaService.integrationUsage.findMany as jest.Mock).mockResolvedValue([
        { usageType: 'autocomplete', baseCostCents: 0.28, billableCents: 0.39, requestCount: 1 },
        { usageType: 'autocomplete', baseCostCents: 0.28, billableCents: 0.39, requestCount: 1 },
        { usageType: 'place_details', baseCostCents: 1.7, billableCents: 2.38, requestCount: 1 },
      ]);

      const result = await service.getUsageStats('company-1', '2024-01');

      expect(result.totalRequests).toBe(3);
      expect(result.autocompleteRequests).toBe(2);
      expect(result.placeDetailsRequests).toBe(1);
    });
  });

  describe('generateSessionToken', () => {
    it('should generate a session token', () => {
      const token = service.generateSessionToken();

      expect(token).toBe('new-session-token');
      expect(googlePlacesService.generateSessionToken).toHaveBeenCalled();
    });
  });

  describe('trackUsage', () => {
    it('should apply 40% markup for platform integrations', async () => {
      // Use platform integration (not company-owned)
      (prismaService.clientIntegration.findFirst as jest.Mock).mockResolvedValue({
        ...mockClientIntegration,
        mode: IntegrationMode.PLATFORM,
        platformIntegrationId: 'platform-integration-1',
      });

      await service.autocomplete('company-1', '123 Main', 'session-token');

      expect(prismaService.integrationUsage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            markupPercent: 40,
          }),
        }),
      );
    });

    it('should apply 0% markup for company-owned integrations', async () => {
      // Company-owned integration (OWN mode)
      await service.autocomplete('company-1', '123 Main', 'session-token');

      expect(prismaService.integrationUsage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            markupPercent: 0,
          }),
        }),
      );
    });
  });
});
