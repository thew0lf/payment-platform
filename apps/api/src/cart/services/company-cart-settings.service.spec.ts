/**
 * CompanyCartSettingsService Unit Tests
 *
 * Tests for loading company cart settings from database
 * with proper defaults and integration lookups
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CompanyCartSettingsService } from './company-cart-settings.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ExpressCheckoutProvider,
  DEFAULT_EXPRESS_CHECKOUT_SETTINGS,
  DEFAULT_UPSELL_SETTINGS,
  DEFAULT_INVENTORY_HOLD_SETTINGS,
  DEFAULT_ABANDONMENT_SETTINGS,
} from '../types/cart-settings.types';
import { IntegrationCategory, IntegrationProvider, IntegrationStatus } from '../../integrations/types/integration.types';

describe('CompanyCartSettingsService', () => {
  let service: CompanyCartSettingsService;
  let prisma: any;

  const mockCompanyId = 'company-123';
  const mockClientId = 'client-456';

  const mockCompany = {
    id: mockCompanyId,
    clientId: mockClientId,
    settings: {},
  };

  const mockCompanyWithSettings = {
    id: mockCompanyId,
    clientId: mockClientId,
    settings: {
      cart: {
        upsell: {
          enabled: false,
          maxSuggestions: 5,
        },
        inventoryHold: {
          holdDurationMinutes: 30,
        },
        abandonment: {
          enableRecoveryEmails: false,
        },
      },
    },
  };

  const mockStripeIntegration = {
    id: 'int-stripe-1',
    clientId: mockClientId,
    provider: IntegrationProvider.STRIPE,
    category: IntegrationCategory.PAYMENT_GATEWAY,
    status: IntegrationStatus.ACTIVE,
    environment: 'PRODUCTION',
    isDefault: true,
    priority: 1,
    settings: {
      applePayMerchantId: 'merchant.com.production',
      googlePayMerchantId: 'gpay-merchant-prod',
    },
  };

  const mockPayPalIntegration = {
    id: 'int-paypal-1',
    clientId: mockClientId,
    provider: IntegrationProvider.PAYPAL_REST,
    category: IntegrationCategory.PAYMENT_GATEWAY,
    status: IntegrationStatus.ACTIVE,
    environment: 'SANDBOX',
    isDefault: false,
    priority: 2,
    settings: {
      clientId: 'paypal-client-id-123',
    },
  };

  beforeEach(async () => {
    prisma = {
      company: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      clientIntegration: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyCartSettingsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CompanyCartSettingsService>(CompanyCartSettingsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════
  // getExpressCheckoutSettings
  // ═══════════════════════════════════════════════════════════════

  describe('getExpressCheckoutSettings', () => {
    it('should return default settings when company has no cart settings', async () => {
      prisma.company.findUnique.mockResolvedValue(mockCompany);
      prisma.clientIntegration.findMany.mockResolvedValue([]);

      const result = await service.getExpressCheckoutSettings(mockCompanyId);

      expect(result.enabledProviders).toEqual([]);
      expect(result.environment).toBe('SANDBOX');
    });

    it('should throw NotFoundException when company not found', async () => {
      prisma.company.findUnique.mockResolvedValue(null);

      await expect(
        service.getExpressCheckoutSettings(mockCompanyId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should enable Apple Pay and Google Pay when Stripe integration is active', async () => {
      prisma.company.findUnique.mockResolvedValue(mockCompany);
      prisma.clientIntegration.findMany.mockResolvedValue([mockStripeIntegration]);

      const result = await service.getExpressCheckoutSettings(mockCompanyId);

      expect(result.enabledProviders).toContain(ExpressCheckoutProvider.APPLE_PAY);
      expect(result.enabledProviders).toContain(ExpressCheckoutProvider.GOOGLE_PAY);
      expect(result.applePayMerchantId).toBe('merchant.com.production');
      expect(result.googlePayMerchantId).toBe('gpay-merchant-prod');
    });

    it('should enable PayPal Express when PayPal integration is active', async () => {
      prisma.company.findUnique.mockResolvedValue(mockCompany);
      prisma.clientIntegration.findMany.mockResolvedValue([mockPayPalIntegration]);

      const result = await service.getExpressCheckoutSettings(mockCompanyId);

      expect(result.enabledProviders).toContain(ExpressCheckoutProvider.PAYPAL_EXPRESS);
      expect(result.paypalClientId).toBe('paypal-client-id-123');
    });

    it('should set environment to PRODUCTION when any integration is in production', async () => {
      prisma.company.findUnique.mockResolvedValue(mockCompany);
      prisma.clientIntegration.findMany.mockResolvedValue([
        mockStripeIntegration, // PRODUCTION
        mockPayPalIntegration, // SANDBOX
      ]);

      const result = await service.getExpressCheckoutSettings(mockCompanyId);

      expect(result.environment).toBe('PRODUCTION');
    });

    it('should merge multiple integrations correctly', async () => {
      prisma.company.findUnique.mockResolvedValue(mockCompany);
      prisma.clientIntegration.findMany.mockResolvedValue([
        mockStripeIntegration,
        mockPayPalIntegration,
      ]);

      const result = await service.getExpressCheckoutSettings(mockCompanyId);

      expect(result.enabledProviders).toContain(ExpressCheckoutProvider.APPLE_PAY);
      expect(result.enabledProviders).toContain(ExpressCheckoutProvider.GOOGLE_PAY);
      expect(result.enabledProviders).toContain(ExpressCheckoutProvider.PAYPAL_EXPRESS);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getDefaultPaymentGateway
  // ═══════════════════════════════════════════════════════════════

  describe('getDefaultPaymentGateway', () => {
    it('should return the default payment gateway integration', async () => {
      prisma.company.findUnique.mockResolvedValue(mockCompany);
      prisma.clientIntegration.findFirst.mockResolvedValue(mockStripeIntegration);

      const result = await service.getDefaultPaymentGateway(mockCompanyId);

      expect(result.integration).toBe(mockStripeIntegration);
      expect(result.environment).toBe('PRODUCTION');
      expect(result.provider).toBe(IntegrationProvider.STRIPE);
    });

    it('should return first active integration as fallback when no default', async () => {
      prisma.company.findUnique.mockResolvedValue(mockCompany);
      prisma.clientIntegration.findFirst
        .mockResolvedValueOnce(null) // No default
        .mockResolvedValueOnce(mockPayPalIntegration); // Fallback

      const result = await service.getDefaultPaymentGateway(mockCompanyId);

      expect(result.integration).toBe(mockPayPalIntegration);
      expect(result.environment).toBe('SANDBOX');
    });

    it('should return null when no payment integrations exist', async () => {
      prisma.company.findUnique.mockResolvedValue(mockCompany);
      prisma.clientIntegration.findFirst.mockResolvedValue(null);

      const result = await service.getDefaultPaymentGateway(mockCompanyId);

      expect(result.integration).toBeNull();
      expect(result.environment).toBe('SANDBOX');
      expect(result.provider).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getUpsellSettings
  // ═══════════════════════════════════════════════════════════════

  describe('getUpsellSettings', () => {
    it('should return default settings when company has no cart settings', async () => {
      prisma.company.findUnique.mockResolvedValue(mockCompany);

      const result = await service.getUpsellSettings(mockCompanyId);

      expect(result).toEqual(DEFAULT_UPSELL_SETTINGS);
    });

    it('should merge company settings with defaults', async () => {
      prisma.company.findUnique.mockResolvedValue(mockCompanyWithSettings);

      const result = await service.getUpsellSettings(mockCompanyId);

      expect(result.enabled).toBe(false); // From company settings
      expect(result.maxSuggestions).toBe(5); // From company settings
      expect(result.minConfidenceScore).toBe(DEFAULT_UPSELL_SETTINGS.minConfidenceScore); // Default
      expect(result.preferBundles).toBe(DEFAULT_UPSELL_SETTINGS.preferBundles); // Default
    });

    it('should throw NotFoundException when company not found', async () => {
      prisma.company.findUnique.mockResolvedValue(null);

      await expect(service.getUpsellSettings(mockCompanyId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getInventoryHoldSettings
  // ═══════════════════════════════════════════════════════════════

  describe('getInventoryHoldSettings', () => {
    it('should return default settings when company has no cart settings', async () => {
      prisma.company.findUnique.mockResolvedValue(mockCompany);

      const result = await service.getInventoryHoldSettings(mockCompanyId);

      expect(result).toEqual(DEFAULT_INVENTORY_HOLD_SETTINGS);
    });

    it('should merge company settings with defaults', async () => {
      prisma.company.findUnique.mockResolvedValue(mockCompanyWithSettings);

      const result = await service.getInventoryHoldSettings(mockCompanyId);

      expect(result.holdDurationMinutes).toBe(30); // From company settings
      expect(result.enabled).toBe(DEFAULT_INVENTORY_HOLD_SETTINGS.enabled); // Default
      expect(result.allowOversell).toBe(DEFAULT_INVENTORY_HOLD_SETTINGS.allowOversell); // Default
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getAbandonmentSettings
  // ═══════════════════════════════════════════════════════════════

  describe('getAbandonmentSettings', () => {
    it('should return default settings when company has no cart settings', async () => {
      prisma.company.findUnique.mockResolvedValue(mockCompany);

      const result = await service.getAbandonmentSettings(mockCompanyId);

      expect(result).toEqual(DEFAULT_ABANDONMENT_SETTINGS);
    });

    it('should merge company settings with defaults', async () => {
      prisma.company.findUnique.mockResolvedValue(mockCompanyWithSettings);

      const result = await service.getAbandonmentSettings(mockCompanyId);

      expect(result.enableRecoveryEmails).toBe(false); // From company settings
      expect(result.atRiskThresholdMinutes).toBe(
        DEFAULT_ABANDONMENT_SETTINGS.atRiskThresholdMinutes,
      ); // Default
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getAllCartSettings
  // ═══════════════════════════════════════════════════════════════

  describe('getAllCartSettings', () => {
    it('should return all cart settings in a single call', async () => {
      prisma.company.findUnique.mockResolvedValue(mockCompanyWithSettings);
      prisma.clientIntegration.findMany.mockResolvedValue([]);

      const result = await service.getAllCartSettings(mockCompanyId);

      expect(result).toHaveProperty('expressCheckout');
      expect(result).toHaveProperty('upsell');
      expect(result).toHaveProperty('inventoryHold');
      expect(result).toHaveProperty('abandonment');

      // Verify merged values
      expect(result.upsell.enabled).toBe(false);
      expect(result.inventoryHold.holdDurationMinutes).toBe(30);
      expect(result.abandonment.enableRecoveryEmails).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // updateCartSettings
  // ═══════════════════════════════════════════════════════════════

  describe('updateCartSettings', () => {
    it('should update cart settings in company record', async () => {
      prisma.company.findUnique.mockResolvedValue(mockCompany);
      prisma.company.update.mockResolvedValue({});

      await service.updateCartSettings(mockCompanyId, {
        upsell: { enabled: false },
      });

      expect(prisma.company.update).toHaveBeenCalledWith({
        where: { id: mockCompanyId },
        data: {
          settings: {
            cart: {
              upsell: { enabled: false },
            },
          },
        },
      });
    });

    it('should merge with existing cart settings', async () => {
      prisma.company.findUnique.mockResolvedValue(mockCompanyWithSettings);
      prisma.company.update.mockResolvedValue({});

      await service.updateCartSettings(mockCompanyId, {
        upsell: { maxSuggestions: 10 },
      });

      // The update replaces the section being updated, but preserves other sections
      expect(prisma.company.update).toHaveBeenCalledWith({
        where: { id: mockCompanyId },
        data: {
          settings: {
            cart: {
              upsell: { maxSuggestions: 10 }, // New value replaces entire upsell section
              inventoryHold: { holdDurationMinutes: 30 }, // Preserved
              abandonment: { enableRecoveryEmails: false }, // Preserved
            },
          },
        },
      });
    });

    it('should throw NotFoundException when company not found', async () => {
      prisma.company.findUnique.mockResolvedValue(null);

      await expect(
        service.updateCartSettings(mockCompanyId, { upsell: { enabled: false } }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Edge Cases
  // ═══════════════════════════════════════════════════════════════

  describe('Edge Cases', () => {
    it('should handle null settings gracefully', async () => {
      prisma.company.findUnique.mockResolvedValue({
        ...mockCompany,
        settings: null,
      });

      const result = await service.getUpsellSettings(mockCompanyId);

      expect(result).toEqual(DEFAULT_UPSELL_SETTINGS);
    });

    it('should handle non-object settings gracefully', async () => {
      prisma.company.findUnique.mockResolvedValue({
        ...mockCompany,
        settings: 'invalid',
      });

      const result = await service.getInventoryHoldSettings(mockCompanyId);

      expect(result).toEqual(DEFAULT_INVENTORY_HOLD_SETTINGS);
    });

    it('should handle empty cart settings', async () => {
      prisma.company.findUnique.mockResolvedValue({
        ...mockCompany,
        settings: { cart: {} },
      });

      const result = await service.getAbandonmentSettings(mockCompanyId);

      expect(result).toEqual(DEFAULT_ABANDONMENT_SETTINGS);
    });

    it('should handle integrations with missing settings field', async () => {
      const integrationWithoutSettings = {
        ...mockStripeIntegration,
        settings: null,
      };
      prisma.company.findUnique.mockResolvedValue(mockCompany);
      prisma.clientIntegration.findMany.mockResolvedValue([integrationWithoutSettings]);

      const result = await service.getExpressCheckoutSettings(mockCompanyId);

      expect(result.enabledProviders).toContain(ExpressCheckoutProvider.APPLE_PAY);
      expect(result.applePayMerchantId).toBeUndefined();
    });
  });
});
