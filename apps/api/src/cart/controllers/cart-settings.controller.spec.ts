/**
 * Cart Settings Controller Unit Tests
 *
 * Comprehensive tests for cart settings endpoints including:
 * - Cart theme retrieval (GET /cart/theme)
 * - Cart theme updates (PUT /cart/theme)
 * - Theme presets retrieval (GET /cart/theme/presets)
 * - Authorization and access control
 * - Error handling
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CartSettingsController } from './cart-settings.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { HierarchyService } from '../../hierarchy/hierarchy.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { ScopeType } from '@prisma/client';
import { CartTheme, DEFAULT_CART_THEME, CartColors, CartLayout, CartContent } from '../types/cart-theme.types';

// Helper type for deep partial - allows partial nested objects for testing
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

interface UpdateCartThemeBody {
  theme: DeepPartial<CartTheme>;
}

describe('CartSettingsController', () => {
  let controller: CartSettingsController;
  let prismaService: {
    company: {
      findFirst: jest.Mock;
      update: jest.Mock;
    };
  };
  let hierarchyService: {
    canAccessCompany: jest.Mock;
  };
  let auditLogsService: {
    log: jest.Mock;
  };

  // ═══════════════════════════════════════════════════════════════
  // TEST DATA FACTORIES
  // ═══════════════════════════════════════════════════════════════

  const mockCompanyId = 'company-123';
  const mockClientId = 'client-456';
  const mockOrganizationId = 'org-789';

  const createMockUser = (overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser => ({
    sub: 'user-123',
    id: 'user-123',
    email: 'test@example.com',
    role: 'ADMIN',
    scopeType: 'COMPANY' as ScopeType,
    scopeId: mockCompanyId,
    organizationId: mockOrganizationId,
    clientId: mockClientId,
    companyId: mockCompanyId,
    departmentId: undefined,
    ...overrides,
  });

  const createMockCompany = (settings: Record<string, unknown> | null = null) => ({
    id: mockCompanyId,
    settings,
  });

  const createMockTheme = (overrides: Partial<CartTheme> = {}): CartTheme => ({
    ...DEFAULT_CART_THEME,
    ...overrides,
  });

  // ═══════════════════════════════════════════════════════════════
  // SETUP
  // ═══════════════════════════════════════════════════════════════

  beforeEach(async () => {
    prismaService = {
      company: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    hierarchyService = {
      canAccessCompany: jest.fn(),
    };

    auditLogsService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartSettingsController],
      providers: [
        { provide: PrismaService, useValue: prismaService },
        { provide: HierarchyService, useValue: hierarchyService },
        { provide: AuditLogsService, useValue: auditLogsService },
      ],
    }).compile();

    controller = module.get<CartSettingsController>(CartSettingsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /cart/theme - RETURNS DEFAULT THEME WHEN NONE SET
  // ═══════════════════════════════════════════════════════════════

  describe('getCartTheme - returns default theme when none set', () => {
    it('should return default theme when company has no settings', async () => {
      const mockUser = createMockUser();
      prismaService.company.findFirst.mockResolvedValue(createMockCompany(null));

      const result = await controller.getCartTheme(mockUser);

      expect(result).toEqual({ theme: DEFAULT_CART_THEME });
      expect(prismaService.company.findFirst).toHaveBeenCalledWith({
        where: { id: mockCompanyId, deletedAt: null },
        select: { settings: true },
      });
    });

    it('should return default theme when settings exist but no cartTheme', async () => {
      const mockUser = createMockUser();
      prismaService.company.findFirst.mockResolvedValue(
        createMockCompany({ otherSetting: 'value' }),
      );

      const result = await controller.getCartTheme(mockUser);

      expect(result).toEqual({ theme: DEFAULT_CART_THEME });
    });

    it('should return default theme when settings is empty object', async () => {
      const mockUser = createMockUser();
      prismaService.company.findFirst.mockResolvedValue(createMockCompany({}));

      const result = await controller.getCartTheme(mockUser);

      expect(result).toEqual({ theme: DEFAULT_CART_THEME });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /cart/theme - RETURNS SAVED THEME WHEN EXISTS
  // ═══════════════════════════════════════════════════════════════

  describe('getCartTheme - returns saved theme when exists', () => {
    it('should return saved theme merged with defaults', async () => {
      const mockUser = createMockUser();
      const savedTheme: Partial<CartTheme> = {
        preset: 'LUXE',
        colors: { ...DEFAULT_CART_THEME.colors, primaryButton: '#FF0000' },
      };
      prismaService.company.findFirst.mockResolvedValue(
        createMockCompany({ cartTheme: savedTheme }),
      );

      const result = await controller.getCartTheme(mockUser);

      expect(result.theme.preset).toBe('LUXE');
      expect(result.theme.colors.primaryButton).toBe('#FF0000');
      // Should preserve default values for unspecified fields
      expect(result.theme.layout).toEqual(DEFAULT_CART_THEME.layout);
    });

    it('should return complete saved theme without overriding with defaults', async () => {
      const mockUser = createMockUser();
      const completeTheme = createMockTheme({
        preset: 'ARTISAN',
        colors: {
          ...DEFAULT_CART_THEME.colors,
          background: '#FFFFF0',
          primaryButton: '#D4AF37',
        },
      });
      prismaService.company.findFirst.mockResolvedValue(
        createMockCompany({ cartTheme: completeTheme }),
      );

      const result = await controller.getCartTheme(mockUser);

      expect(result.theme.preset).toBe('ARTISAN');
      expect(result.theme.colors.background).toBe('#FFFFF0');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /cart/theme - REQUIRES COMPANY SELECTION FOR CLIENT USERS
  // ═══════════════════════════════════════════════════════════════

  describe('getCartTheme - requires company selection for CLIENT users', () => {
    it('should throw ForbiddenException when CLIENT user has no company context', async () => {
      const mockUser = createMockUser({
        scopeType: 'CLIENT' as ScopeType,
        scopeId: mockClientId,
        companyId: undefined,
      });

      await expect(controller.getCartTheme(mockUser)).rejects.toThrow(ForbiddenException);
      await expect(controller.getCartTheme(mockUser)).rejects.toThrow(
        'Company selection required. Please select a company to continue.',
      );
    });

    it('should throw ForbiddenException when ORGANIZATION user has no company context', async () => {
      const mockUser = createMockUser({
        scopeType: 'ORGANIZATION' as ScopeType,
        scopeId: mockOrganizationId,
        companyId: undefined,
      });

      await expect(controller.getCartTheme(mockUser)).rejects.toThrow(ForbiddenException);
    });

    it('should allow CLIENT user with queryCompanyId when access is granted', async () => {
      const mockUser = createMockUser({
        scopeType: 'CLIENT' as ScopeType,
        scopeId: mockClientId,
        companyId: undefined,
      });
      const queryCompanyId = 'requested-company-123';
      hierarchyService.canAccessCompany.mockResolvedValue(true);
      prismaService.company.findFirst.mockResolvedValue(createMockCompany(null));

      const result = await controller.getCartTheme(mockUser, queryCompanyId);

      expect(result).toEqual({ theme: DEFAULT_CART_THEME });
      expect(hierarchyService.canAccessCompany).toHaveBeenCalledWith(
        { sub: mockUser.id, scopeType: mockUser.scopeType, scopeId: mockUser.scopeId },
        queryCompanyId,
      );
    });

    it('should throw ForbiddenException when CLIENT user cannot access requested company', async () => {
      const mockUser = createMockUser({
        scopeType: 'CLIENT' as ScopeType,
        scopeId: mockClientId,
        companyId: undefined,
      });
      const queryCompanyId = 'unauthorized-company';
      hierarchyService.canAccessCompany.mockResolvedValue(false);

      await expect(controller.getCartTheme(mockUser, queryCompanyId)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(controller.getCartTheme(mockUser, queryCompanyId)).rejects.toThrow(
        'Access denied to this company',
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PUT /cart/theme - SAVES THEME SUCCESSFULLY
  // ═══════════════════════════════════════════════════════════════

  describe('updateCartTheme - saves theme successfully', () => {
    it('should save new theme for company with no existing settings', async () => {
      const mockUser = createMockUser();
      const themeUpdate: DeepPartial<CartTheme> = { colors: { primaryButton: '#00FF00' } };
      prismaService.company.findFirst.mockResolvedValue(createMockCompany(null));
      prismaService.company.update.mockResolvedValue({});

      const result = await controller.updateCartTheme(mockUser, { theme: themeUpdate } as any);

      expect(result.success).toBe(true);
      expect(result.theme.colors.primaryButton).toBe('#00FF00');
      expect(prismaService.company.update).toHaveBeenCalledWith({
        where: { id: mockCompanyId },
        data: {
          settings: expect.objectContaining({
            cartTheme: expect.objectContaining({
              colors: expect.objectContaining({
                primaryButton: '#00FF00',
              }),
            }),
          }),
        },
      });
    });

    it('should save theme and include updatedAt timestamp', async () => {
      const mockUser = createMockUser();
      const themeUpdate = { preset: 'VELOCITY' as const };
      prismaService.company.findFirst.mockResolvedValue(createMockCompany(null));
      prismaService.company.update.mockResolvedValue({});

      const result = await controller.updateCartTheme(mockUser, { theme: themeUpdate });

      expect(result.theme.updatedAt).toBeDefined();
      expect(new Date(result.theme.updatedAt!).getTime()).toBeGreaterThan(0);
    });

    it('should preserve existing non-cartTheme settings', async () => {
      const mockUser = createMockUser();
      const existingSettings = { otherSetting: 'preserved-value', anotherSetting: 123 };
      prismaService.company.findFirst.mockResolvedValue(createMockCompany(existingSettings));
      prismaService.company.update.mockResolvedValue({});

      await controller.updateCartTheme(mockUser, { theme: { preset: 'FOODIE' as const } });

      expect(prismaService.company.update).toHaveBeenCalledWith({
        where: { id: mockCompanyId },
        data: {
          settings: expect.objectContaining({
            otherSetting: 'preserved-value',
            anotherSetting: 123,
            cartTheme: expect.any(Object),
          }),
        },
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PUT /cart/theme - DEEP MERGES THEME PROPERLY
  // ═══════════════════════════════════════════════════════════════

  describe('updateCartTheme - deep merges theme properly', () => {
    it('should deep merge colors with existing theme', async () => {
      const mockUser = createMockUser();
      const existingTheme = createMockTheme({
        colors: {
          ...DEFAULT_CART_THEME.colors,
          primaryButton: '#FF0000',
          background: '#CCCCCC',
        },
      });
      prismaService.company.findFirst.mockResolvedValue(
        createMockCompany({ cartTheme: existingTheme }),
      );
      prismaService.company.update.mockResolvedValue({});

      const result = await controller.updateCartTheme(mockUser, {
        theme: { colors: { primaryButton: '#00FF00' } },
      } as any);

      // New value should override
      expect(result.theme.colors.primaryButton).toBe('#00FF00');
      // Existing value should be preserved
      expect(result.theme.colors.background).toBe('#CCCCCC');
      // Default values should fill in the rest
      expect(result.theme.colors.error).toBe(DEFAULT_CART_THEME.colors.error);
    });

    it('should deep merge layout with existing theme', async () => {
      const mockUser = createMockUser();
      const existingTheme = createMockTheme({
        layout: {
          ...DEFAULT_CART_THEME.layout,
          position: 'left',
          width: 'wide',
        },
      });
      prismaService.company.findFirst.mockResolvedValue(
        createMockCompany({ cartTheme: existingTheme }),
      );
      prismaService.company.update.mockResolvedValue({});

      const result = await controller.updateCartTheme(mockUser, {
        theme: { layout: { position: 'bottom' } },
      } as any);

      expect(result.theme.layout.position).toBe('bottom');
      expect(result.theme.layout.width).toBe('wide');
      expect(result.theme.layout.animation).toBe(DEFAULT_CART_THEME.layout.animation);
    });

    it('should deep merge content with existing theme', async () => {
      const mockUser = createMockUser();
      const existingTheme = createMockTheme({
        content: {
          ...DEFAULT_CART_THEME.content,
          headerTitle: 'My Cart',
          checkoutButtonText: 'Buy Now',
        },
      });
      prismaService.company.findFirst.mockResolvedValue(
        createMockCompany({ cartTheme: existingTheme }),
      );
      prismaService.company.update.mockResolvedValue({});

      const result = await controller.updateCartTheme(mockUser, {
        theme: { content: { headerTitle: 'Shopping Bag' } },
      } as any);

      expect(result.theme.content.headerTitle).toBe('Shopping Bag');
      expect(result.theme.content.checkoutButtonText).toBe('Buy Now');
    });

    it('should apply defaults when updating from empty existing theme', async () => {
      const mockUser = createMockUser();
      prismaService.company.findFirst.mockResolvedValue(createMockCompany({ cartTheme: {} }));
      prismaService.company.update.mockResolvedValue({});

      const result = await controller.updateCartTheme(mockUser, {
        theme: { preset: 'WELLNESS' as const },
      });

      expect(result.theme.preset).toBe('WELLNESS');
      expect(result.theme.colors).toEqual(expect.objectContaining(DEFAULT_CART_THEME.colors));
      expect(result.theme.layout).toEqual(expect.objectContaining(DEFAULT_CART_THEME.layout));
      expect(result.theme.content).toEqual(expect.objectContaining(DEFAULT_CART_THEME.content));
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PUT /cart/theme - VALIDATES COMPANY ACCESS
  // ═══════════════════════════════════════════════════════════════

  describe('updateCartTheme - validates company access', () => {
    it('should throw ForbiddenException when no company context', async () => {
      const mockUser = createMockUser({
        scopeType: 'ORGANIZATION' as ScopeType,
        scopeId: mockOrganizationId,
        companyId: undefined,
      });

      await expect(
        controller.updateCartTheme(mockUser, { theme: { preset: 'LUXE' as const } }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should use scopeId when user scopeType is COMPANY', async () => {
      const mockUser = createMockUser({
        scopeType: 'COMPANY' as ScopeType,
        scopeId: 'company-from-scope',
        companyId: 'company-from-context',
      });
      prismaService.company.findFirst.mockResolvedValue(createMockCompany(null));
      prismaService.company.update.mockResolvedValue({});

      await controller.updateCartTheme(mockUser, { theme: {} });

      expect(prismaService.company.findFirst).toHaveBeenCalledWith({
        where: { id: 'company-from-scope', deletedAt: null },
        select: { settings: true },
      });
    });

    it('should allow update with valid queryCompanyId', async () => {
      const mockUser = createMockUser({
        scopeType: 'CLIENT' as ScopeType,
        scopeId: mockClientId,
        companyId: undefined,
      });
      const queryCompanyId = 'accessible-company';
      hierarchyService.canAccessCompany.mockResolvedValue(true);
      prismaService.company.findFirst.mockResolvedValue(createMockCompany(null));
      prismaService.company.update.mockResolvedValue({});

      const result = await controller.updateCartTheme(
        mockUser,
        { theme: { preset: 'CREATOR' as const } },
        queryCompanyId,
      );

      expect(result.success).toBe(true);
      expect(hierarchyService.canAccessCompany).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when queryCompanyId access denied', async () => {
      const mockUser = createMockUser({
        scopeType: 'CLIENT' as ScopeType,
        scopeId: mockClientId,
        companyId: undefined,
      });
      hierarchyService.canAccessCompany.mockResolvedValue(false);

      await expect(
        controller.updateCartTheme(
          mockUser,
          { theme: {} },
          'unauthorized-company',
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /cart/theme/presets - RETURNS ALL PRESETS
  // ═══════════════════════════════════════════════════════════════

  describe('getThemePresets - returns all presets', () => {
    it('should return all 9 theme presets', () => {
      const result = controller.getThemePresets();

      expect(result.presets).toHaveLength(9);
      expect(result.presets.map((p) => p.id)).toEqual([
        'STARTER',
        'ARTISAN',
        'VELOCITY',
        'LUXE',
        'WELLNESS',
        'FOODIE',
        'PROFESSIONAL',
        'CREATOR',
        'MARKETPLACE',
      ]);
    });

    it('should return presets with required fields', () => {
      const result = controller.getThemePresets();

      result.presets.forEach((preset) => {
        expect(preset).toHaveProperty('id');
        expect(preset).toHaveProperty('name');
        expect(preset).toHaveProperty('description');
        expect(typeof preset.id).toBe('string');
        expect(typeof preset.name).toBe('string');
        expect(typeof preset.description).toBe('string');
      });
    });

    it('should return correct preset descriptions', () => {
      const result = controller.getThemePresets();

      const starterPreset = result.presets.find((p) => p.id === 'STARTER');
      expect(starterPreset?.description).toBe('Clean, minimal design for any brand');

      const luxePreset = result.presets.find((p) => p.id === 'LUXE');
      expect(luxePreset?.description).toBe('Elegant, premium feel for luxury brands');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // ERROR CASES - COMPANY NOT FOUND
  // ═══════════════════════════════════════════════════════════════

  describe('Error cases - company not found', () => {
    it('should throw NotFoundException when company not found in getCartTheme', async () => {
      const mockUser = createMockUser();
      prismaService.company.findFirst.mockResolvedValue(null);

      await expect(controller.getCartTheme(mockUser)).rejects.toThrow(NotFoundException);
      await expect(controller.getCartTheme(mockUser)).rejects.toThrow('Company not found');
    });

    it('should throw NotFoundException when company not found in updateCartTheme', async () => {
      const mockUser = createMockUser();
      prismaService.company.findFirst.mockResolvedValue(null);

      await expect(
        controller.updateCartTheme(mockUser, { theme: { preset: 'STARTER' as const } }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.updateCartTheme(mockUser, { theme: {} }),
      ).rejects.toThrow('Company not found');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // ERROR CASES - ACCESS DENIED
  // ═══════════════════════════════════════════════════════════════

  describe('Error cases - access denied', () => {
    it('should throw ForbiddenException for getCartTheme with unauthorized company', async () => {
      const mockUser = createMockUser({
        scopeType: 'CLIENT' as ScopeType,
        scopeId: mockClientId,
        companyId: undefined,
      });
      hierarchyService.canAccessCompany.mockResolvedValue(false);

      await expect(controller.getCartTheme(mockUser, 'other-company')).rejects.toThrow(
        'Access denied to this company',
      );
    });

    it('should throw ForbiddenException for updateCartTheme with unauthorized company', async () => {
      const mockUser = createMockUser({
        scopeType: 'CLIENT' as ScopeType,
        scopeId: mockClientId,
        companyId: undefined,
      });
      hierarchyService.canAccessCompany.mockResolvedValue(false);

      await expect(
        controller.updateCartTheme(mockUser, { theme: {} }, 'other-company'),
      ).rejects.toThrow('Access denied to this company');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // ADDITIONAL EDGE CASES
  // ═══════════════════════════════════════════════════════════════

  describe('Edge cases', () => {
    it('should handle empty theme update body', async () => {
      const mockUser = createMockUser();
      prismaService.company.findFirst.mockResolvedValue(createMockCompany(null));
      prismaService.company.update.mockResolvedValue({});

      const result = await controller.updateCartTheme(mockUser, { theme: {} });

      expect(result.success).toBe(true);
      expect(result.theme.preset).toBe(DEFAULT_CART_THEME.preset);
    });

    it('should handle user with companyId fallback when scopeType is CLIENT', async () => {
      const mockUser = createMockUser({
        scopeType: 'CLIENT' as ScopeType,
        scopeId: mockClientId,
        companyId: 'fallback-company-id',
      });
      prismaService.company.findFirst.mockResolvedValue(createMockCompany(null));

      const result = await controller.getCartTheme(mockUser);

      expect(prismaService.company.findFirst).toHaveBeenCalledWith({
        where: { id: 'fallback-company-id', deletedAt: null },
        select: { settings: true },
      });
      expect(result).toEqual({ theme: DEFAULT_CART_THEME });
    });

    it('should handle partial nested objects in theme update', async () => {
      const mockUser = createMockUser();
      const existingTheme = createMockTheme();
      prismaService.company.findFirst.mockResolvedValue(
        createMockCompany({ cartTheme: existingTheme }),
      );
      prismaService.company.update.mockResolvedValue({});

      const result = await controller.updateCartTheme(mockUser, {
        theme: {
          colors: { primaryButton: '#123456' },
          layout: { position: 'left' },
          content: { headerTitle: 'New Title' },
        },
      } as any);

      expect(result.theme.colors.primaryButton).toBe('#123456');
      expect(result.theme.layout.position).toBe('left');
      expect(result.theme.content.headerTitle).toBe('New Title');
      // Other fields should remain as defaults
      expect(result.theme.colors.background).toBe(DEFAULT_CART_THEME.colors.background);
      expect(result.theme.layout.width).toBe(DEFAULT_CART_THEME.layout.width);
      expect(result.theme.content.showItemCount).toBe(DEFAULT_CART_THEME.content.showItemCount);
    });

    it('should handle customCss field in theme', async () => {
      const mockUser = createMockUser();
      prismaService.company.findFirst.mockResolvedValue(createMockCompany(null));
      prismaService.company.update.mockResolvedValue({});

      const customCss = '.cart-item { border: none; }';
      const result = await controller.updateCartTheme(mockUser, {
        theme: { customCss },
      });

      expect(result.theme.customCss).toBe(customCss);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SCOPE TYPE VARIATIONS
  // ═══════════════════════════════════════════════════════════════

  describe('Scope type variations', () => {
    it('should work correctly for COMPANY scope type', async () => {
      const mockUser = createMockUser({
        scopeType: 'COMPANY' as ScopeType,
        scopeId: 'direct-company-id',
      });
      prismaService.company.findFirst.mockResolvedValue(createMockCompany(null));

      await controller.getCartTheme(mockUser);

      expect(prismaService.company.findFirst).toHaveBeenCalledWith({
        where: { id: 'direct-company-id', deletedAt: null },
        select: { settings: true },
      });
    });

    it('should use companyId for ORGANIZATION scope with company context', async () => {
      const mockUser = createMockUser({
        scopeType: 'ORGANIZATION' as ScopeType,
        scopeId: mockOrganizationId,
        companyId: 'org-company-context',
      });
      prismaService.company.findFirst.mockResolvedValue(createMockCompany(null));

      await controller.getCartTheme(mockUser);

      expect(prismaService.company.findFirst).toHaveBeenCalledWith({
        where: { id: 'org-company-context', deletedAt: null },
        select: { settings: true },
      });
    });

    it('should prioritize queryCompanyId over user companyId', async () => {
      const mockUser = createMockUser({
        scopeType: 'CLIENT' as ScopeType,
        scopeId: mockClientId,
        companyId: 'user-default-company',
      });
      const queryCompanyId = 'query-specified-company';
      hierarchyService.canAccessCompany.mockResolvedValue(true);
      prismaService.company.findFirst.mockResolvedValue(createMockCompany(null));

      await controller.getCartTheme(mockUser, queryCompanyId);

      expect(hierarchyService.canAccessCompany).toHaveBeenCalledWith(
        expect.any(Object),
        queryCompanyId,
      );
      expect(prismaService.company.findFirst).toHaveBeenCalledWith({
        where: { id: queryCompanyId, deletedAt: null },
        select: { settings: true },
      });
    });
  });
});
