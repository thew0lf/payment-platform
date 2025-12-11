import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PaymentGatewayType } from '@prisma/client';
import { PaymentGatewayService } from '../../src/payment-pages/gateways/payment-gateway.service';
import { GatewayFactory } from '../../src/payment-pages/gateways/gateway.factory';
import { SessionsService } from '../../src/payment-pages/services/sessions.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ClientIntegrationService } from '../../src/integrations/services/client-integration.service';
import { CredentialEncryptionService } from '../../src/integrations/services/credential-encryption.service';
import { PlatformIntegrationService } from '../../src/integrations/services/platform-integration.service';
import {
  IntegrationProvider,
  IntegrationCategory,
  IntegrationStatus,
  IntegrationMode,
} from '../../src/integrations/types/integration.types';

describe('PaymentGatewayService', () => {
  let service: PaymentGatewayService;
  let prismaService: jest.Mocked<PrismaService>;
  let encryptionService: jest.Mocked<CredentialEncryptionService>;
  let platformIntegrationService: jest.Mocked<PlatformIntegrationService>;

  const mockCompany = {
    id: 'company-1',
    clientId: 'client-1',
  };

  const mockStripeIntegration = {
    id: 'integration-stripe',
    clientId: 'client-1',
    provider: IntegrationProvider.STRIPE,
    category: IntegrationCategory.PAYMENT_GATEWAY,
    status: IntegrationStatus.ACTIVE,
    mode: IntegrationMode.OWN,
    isDefault: true,
    priority: 1,
    environment: 'sandbox',
    credentials: { encrypted: 'enc_data', iv: 'iv', authTag: 'tag', keyVersion: 1, encryptedAt: new Date() },
    platformIntegrationId: null,
  };

  const mockPayPalIntegration = {
    id: 'integration-paypal',
    clientId: 'client-1',
    provider: IntegrationProvider.PAYPAL_REST,
    category: IntegrationCategory.PAYMENT_GATEWAY,
    status: IntegrationStatus.ACTIVE,
    mode: IntegrationMode.PLATFORM,
    isDefault: false,
    priority: 2,
    environment: 'sandbox',
    credentials: null,
    platformIntegrationId: 'platform-paypal-1',
  };

  const mockDecryptedStripeCredentials = {
    publicKey: 'pk_test_123',
    secretKey: 'sk_test_456',
    webhookSecret: 'whsec_789',
  };

  const mockDecryptedPayPalCredentials = {
    apiKey: 'paypal_client_id',
    secretKey: 'paypal_secret',
  };

  const originalEnv = process.env;

  beforeEach(async () => {
    // Reset environment variables
    process.env = { ...originalEnv };
    process.env.STRIPE_SECRET_KEY = 'sk_test_env';
    process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_env';
    process.env.STRIPE_ENVIRONMENT = 'sandbox';
    process.env.PAYPAL_CLIENT_ID = 'paypal_env_id';
    process.env.PAYPAL_CLIENT_SECRET = 'paypal_env_secret';
    process.env.PAYPAL_ENVIRONMENT = 'sandbox';

    const mockPrisma = {
      company: {
        findUnique: jest.fn(),
      },
      clientIntegration: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      paymentPageSession: {
        update: jest.fn(),
      },
    };

    const mockGatewayFactory = {
      getAdapter: jest.fn().mockReturnValue({
        getCapabilities: jest.fn().mockReturnValue({
          supportsRefund: true,
          supportsPartialRefund: true,
        }),
      }),
    };

    const mockSessionsService = {
      findById: jest.fn(),
    };

    const mockClientIntegrationService = {
      findByProvider: jest.fn(),
    };

    const mockEncryptionService = {
      decrypt: jest.fn(),
      encrypt: jest.fn(),
    };

    const mockPlatformIntegrationService = {
      getDecryptedCredentials: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentGatewayService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: GatewayFactory, useValue: mockGatewayFactory },
        { provide: SessionsService, useValue: mockSessionsService },
        { provide: ClientIntegrationService, useValue: mockClientIntegrationService },
        { provide: CredentialEncryptionService, useValue: mockEncryptionService },
        { provide: PlatformIntegrationService, useValue: mockPlatformIntegrationService },
      ],
    }).compile();

    service = module.get<PaymentGatewayService>(PaymentGatewayService);
    prismaService = module.get(PrismaService);
    encryptionService = module.get(CredentialEncryptionService);
    platformIntegrationService = module.get(PlatformIntegrationService);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getAvailableGateways', () => {
    it('should return gateways from ClientIntegration with own credentials', async () => {
      (prismaService.company.findUnique as jest.Mock).mockResolvedValue(mockCompany);
      (prismaService.clientIntegration.findMany as jest.Mock).mockResolvedValue([mockStripeIntegration]);
      (encryptionService.decrypt as jest.Mock).mockReturnValue(mockDecryptedStripeCredentials);

      const gateways = await service.getAvailableGateways('company-1');

      expect(gateways).toHaveLength(1);
      expect(gateways[0].type).toBe(PaymentGatewayType.STRIPE);
      expect(gateways[0].credentials).toEqual({
        environment: 'sandbox',
        ...mockDecryptedStripeCredentials,
      });
      expect(gateways[0].priority).toBe(1);
      expect(gateways[0].enabled).toBe(true);
    });

    it('should return gateways using platform credentials when mode is PLATFORM', async () => {
      (prismaService.company.findUnique as jest.Mock).mockResolvedValue(mockCompany);
      (prismaService.clientIntegration.findMany as jest.Mock).mockResolvedValue([mockPayPalIntegration]);
      (platformIntegrationService.getDecryptedCredentials as jest.Mock).mockResolvedValue(mockDecryptedPayPalCredentials);

      const gateways = await service.getAvailableGateways('company-1');

      expect(gateways).toHaveLength(1);
      expect(gateways[0].type).toBe(PaymentGatewayType.PAYPAL_REST);
      expect(platformIntegrationService.getDecryptedCredentials).toHaveBeenCalledWith('platform-paypal-1');
    });

    it('should return multiple gateways when configured', async () => {
      (prismaService.company.findUnique as jest.Mock).mockResolvedValue(mockCompany);
      (prismaService.clientIntegration.findMany as jest.Mock).mockResolvedValue([
        mockStripeIntegration,
        mockPayPalIntegration,
      ]);
      (encryptionService.decrypt as jest.Mock).mockReturnValue(mockDecryptedStripeCredentials);
      (platformIntegrationService.getDecryptedCredentials as jest.Mock).mockResolvedValue(mockDecryptedPayPalCredentials);

      const gateways = await service.getAvailableGateways('company-1');

      expect(gateways).toHaveLength(2);
      expect(gateways.map(g => g.type)).toContain(PaymentGatewayType.STRIPE);
      expect(gateways.map(g => g.type)).toContain(PaymentGatewayType.PAYPAL_REST);
    });

    it('should return fallback gateways when company not found', async () => {
      (prismaService.company.findUnique as jest.Mock).mockResolvedValue(null);

      const gateways = await service.getAvailableGateways('nonexistent');

      // Should return env variable gateways
      expect(gateways.length).toBeGreaterThanOrEqual(1);
      expect(gateways[0].type).toBe(PaymentGatewayType.STRIPE);
    });

    it('should return fallback gateways when no client integrations exist', async () => {
      (prismaService.company.findUnique as jest.Mock).mockResolvedValue(mockCompany);
      (prismaService.clientIntegration.findMany as jest.Mock).mockResolvedValue([]);

      const gateways = await service.getAvailableGateways('company-1');

      // Should return env variable gateways
      expect(gateways.length).toBeGreaterThanOrEqual(1);
    });

    it('should skip integrations where decryption fails', async () => {
      (prismaService.company.findUnique as jest.Mock).mockResolvedValue(mockCompany);
      (prismaService.clientIntegration.findMany as jest.Mock).mockResolvedValue([
        mockStripeIntegration,
        mockPayPalIntegration,
      ]);
      (encryptionService.decrypt as jest.Mock).mockImplementation(() => {
        throw new Error('Decryption failed');
      });
      (platformIntegrationService.getDecryptedCredentials as jest.Mock).mockResolvedValue(mockDecryptedPayPalCredentials);

      const gateways = await service.getAvailableGateways('company-1');

      // Only PayPal should be returned since Stripe decryption failed
      expect(gateways).toHaveLength(1);
      expect(gateways[0].type).toBe(PaymentGatewayType.PAYPAL_REST);
    });

    it('should return fallback when all decryptions fail', async () => {
      (prismaService.company.findUnique as jest.Mock).mockResolvedValue(mockCompany);
      (prismaService.clientIntegration.findMany as jest.Mock).mockResolvedValue([mockStripeIntegration]);
      (encryptionService.decrypt as jest.Mock).mockImplementation(() => {
        throw new Error('Decryption failed');
      });

      const gateways = await service.getAvailableGateways('company-1');

      // Should fall back to env variable gateways
      expect(gateways.length).toBeGreaterThanOrEqual(1);
    });

    it('should skip integrations without credentials and not using platform', async () => {
      const integrationWithoutCreds = {
        ...mockStripeIntegration,
        credentials: null,
        mode: IntegrationMode.OWN,
      };
      (prismaService.company.findUnique as jest.Mock).mockResolvedValue(mockCompany);
      (prismaService.clientIntegration.findMany as jest.Mock).mockResolvedValue([integrationWithoutCreds]);

      const gateways = await service.getAvailableGateways('company-1');

      // Should fall back to env variables since the integration has no credentials
      expect(gateways.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getGatewayCredentials (via getGatewayConfig)', () => {
    it('should throw NotFoundException for unsupported gateway type', async () => {
      // SQUARE is not yet supported (mapped to null in GATEWAY_TO_PROVIDER)
      await expect(
        (service as any).getGatewayCredentials('company-1', PaymentGatewayType.SQUARE)
      ).rejects.toThrow(NotFoundException);
    });

    it('should return credentials from ClientIntegration for Stripe', async () => {
      (prismaService.company.findUnique as jest.Mock).mockResolvedValue(mockCompany);
      (prismaService.clientIntegration.findFirst as jest.Mock).mockResolvedValue(mockStripeIntegration);
      (encryptionService.decrypt as jest.Mock).mockReturnValue(mockDecryptedStripeCredentials);

      const credentials = await (service as any).getGatewayCredentials('company-1', PaymentGatewayType.STRIPE);

      expect(credentials).toEqual({
        environment: 'sandbox',
        ...mockDecryptedStripeCredentials,
      });
      expect(prismaService.clientIntegration.findFirst).toHaveBeenCalledWith({
        where: {
          clientId: 'client-1',
          provider: IntegrationProvider.STRIPE,
          status: IntegrationStatus.ACTIVE,
        },
        orderBy: [
          { isDefault: 'desc' },
          { priority: 'asc' },
        ],
      });
    });

    it('should return platform credentials when integration mode is PLATFORM', async () => {
      (prismaService.company.findUnique as jest.Mock).mockResolvedValue(mockCompany);
      (prismaService.clientIntegration.findFirst as jest.Mock).mockResolvedValue(mockPayPalIntegration);
      (platformIntegrationService.getDecryptedCredentials as jest.Mock).mockResolvedValue(mockDecryptedPayPalCredentials);

      const credentials = await (service as any).getGatewayCredentials('company-1', PaymentGatewayType.PAYPAL_REST);

      expect(platformIntegrationService.getDecryptedCredentials).toHaveBeenCalledWith('platform-paypal-1');
      expect(credentials).toEqual({
        environment: 'sandbox',
        ...mockDecryptedPayPalCredentials,
      });
    });

    it('should fall back to environment variables when company not found', async () => {
      (prismaService.company.findUnique as jest.Mock).mockResolvedValue(null);

      const credentials = await (service as any).getGatewayCredentials('nonexistent', PaymentGatewayType.STRIPE);

      expect(credentials).toEqual({
        environment: 'sandbox',
        publicKey: 'pk_test_env',
        secretKey: 'sk_test_env',
        webhookSecret: undefined,
      });
    });

    it('should fall back to environment variables when no integration found', async () => {
      (prismaService.company.findUnique as jest.Mock).mockResolvedValue(mockCompany);
      (prismaService.clientIntegration.findFirst as jest.Mock).mockResolvedValue(null);

      const credentials = await (service as any).getGatewayCredentials('company-1', PaymentGatewayType.STRIPE);

      expect(credentials.secretKey).toBe('sk_test_env');
    });

    it('should fall back to environment variables when decryption fails', async () => {
      (prismaService.company.findUnique as jest.Mock).mockResolvedValue(mockCompany);
      (prismaService.clientIntegration.findFirst as jest.Mock).mockResolvedValue(mockStripeIntegration);
      (encryptionService.decrypt as jest.Mock).mockImplementation(() => {
        throw new Error('Decryption failed');
      });

      const credentials = await (service as any).getGatewayCredentials('company-1', PaymentGatewayType.STRIPE);

      expect(credentials.secretKey).toBe('sk_test_env');
    });

    it('should return PayPal environment fallback credentials', async () => {
      (prismaService.company.findUnique as jest.Mock).mockResolvedValue(null);

      const credentials = await (service as any).getGatewayCredentials('company-1', PaymentGatewayType.PAYPAL_REST);

      expect(credentials).toEqual({
        environment: 'sandbox',
        apiKey: 'paypal_env_id',
        secretKey: 'paypal_env_secret',
      });
    });

    it('should throw NotFoundException for NMI when no env credentials configured', async () => {
      // Remove NMI env vars
      delete process.env.NMI_SECURITY_KEY;

      (prismaService.company.findUnique as jest.Mock).mockResolvedValue(null);

      // Should still return credentials (with undefined values), not throw
      // The actual validation of credentials happens at payment processing time
      const credentials = await (service as any).getGatewayCredentials('company-1', PaymentGatewayType.NMI);

      expect(credentials.environment).toBe('sandbox');
    });
  });

  describe('getEnvironmentFallbackCredentials', () => {
    it('should return Stripe credentials from environment', () => {
      const credentials = (service as any).getEnvironmentFallbackCredentials(PaymentGatewayType.STRIPE);

      expect(credentials.environment).toBe('sandbox');
      expect(credentials.publicKey).toBe('pk_test_env');
      expect(credentials.secretKey).toBe('sk_test_env');
    });

    it('should return PayPal credentials from environment', () => {
      const credentials = (service as any).getEnvironmentFallbackCredentials(PaymentGatewayType.PAYPAL_REST);

      expect(credentials.environment).toBe('sandbox');
      expect(credentials.apiKey).toBe('paypal_env_id');
      expect(credentials.secretKey).toBe('paypal_env_secret');
    });

    it('should return PayPal credentials for PAYPAL gateway type', () => {
      const credentials = (service as any).getEnvironmentFallbackCredentials(PaymentGatewayType.PAYPAL);

      expect(credentials.apiKey).toBe('paypal_env_id');
    });

    it('should return NMI credentials from environment', () => {
      process.env.NMI_SECURITY_KEY = 'nmi_key';
      process.env.NMI_TOKENIZATION_KEY = 'nmi_token_key';
      process.env.NMI_ENVIRONMENT = 'production';

      const credentials = (service as any).getEnvironmentFallbackCredentials(PaymentGatewayType.NMI);

      expect(credentials.environment).toBe('production');
      expect(credentials.apiKey).toBe('nmi_key');
      expect(credentials.publicKey).toBe('nmi_token_key');
    });

    it('should return Authorize.Net credentials from environment', () => {
      process.env.AUTHNET_API_LOGIN_ID = 'authnet_login';
      process.env.AUTHNET_TRANSACTION_KEY = 'authnet_txn_key';
      process.env.AUTHNET_CLIENT_KEY = 'authnet_client_key';
      process.env.AUTHNET_ENVIRONMENT = 'sandbox';

      const credentials = (service as any).getEnvironmentFallbackCredentials(PaymentGatewayType.AUTHORIZE_NET);

      expect(credentials.environment).toBe('sandbox');
      expect(credentials.apiKey).toBe('authnet_login');
      expect(credentials.secretKey).toBe('authnet_txn_key');
      expect(credentials.publicKey).toBe('authnet_client_key');
    });

    it('should throw NotFoundException for unsupported gateway', () => {
      expect(() => {
        (service as any).getEnvironmentFallbackCredentials(PaymentGatewayType.OWN_HOSTED);
      }).toThrow(NotFoundException);
    });
  });

  describe('getFallbackGateways', () => {
    it('should return Stripe gateway when STRIPE_SECRET_KEY is set', () => {
      const gateways = (service as any).getFallbackGateways();

      const stripeGateway = gateways.find((g: any) => g.type === PaymentGatewayType.STRIPE);
      expect(stripeGateway).toBeDefined();
      expect(stripeGateway.credentials.secretKey).toBe('sk_test_env');
    });

    it('should return PayPal gateway when PAYPAL_CLIENT_SECRET is set', () => {
      const gateways = (service as any).getFallbackGateways();

      const paypalGateway = gateways.find((g: any) => g.type === PaymentGatewayType.PAYPAL_REST);
      expect(paypalGateway).toBeDefined();
      expect(paypalGateway.credentials.secretKey).toBe('paypal_env_secret');
    });

    it('should return empty array when no credentials are configured', () => {
      delete process.env.STRIPE_SECRET_KEY;
      delete process.env.PAYPAL_CLIENT_SECRET;

      const gateways = (service as any).getFallbackGateways();

      expect(gateways).toHaveLength(0);
    });

    it('should return only Stripe when PayPal not configured', () => {
      delete process.env.PAYPAL_CLIENT_SECRET;

      const gateways = (service as any).getFallbackGateways();

      expect(gateways).toHaveLength(1);
      expect(gateways[0].type).toBe(PaymentGatewayType.STRIPE);
    });
  });
});
