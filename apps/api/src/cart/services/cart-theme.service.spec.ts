/**
 * Cart Theme Service Unit Tests
 *
 * Comprehensive tests for cart theming including:
 * - Getting cart themes by landing page ID
 * - Updating cart themes
 * - Resetting themes to preset defaults
 * - Theme preview with CSS variables
 * - Theme presets retrieval
 * - Generating themes from brand colors
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CartThemeService } from './cart-theme.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CartTheme, CartThemePreset, DEFAULT_CART_THEME } from '../types/cart-theme.types';
import { CART_THEME_PRESETS } from '../constants/cart-theme-presets';

describe('CartThemeService', () => {
  let service: CartThemeService;
  let prisma: {
    landingPage: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
  };

  // ═══════════════════════════════════════════════════════════════
  // TEST DATA FACTORIES
  // ═══════════════════════════════════════════════════════════════

  const mockLandingPageId = 'landing-page-123';
  const mockCompanyId = 'company-456';

  const createMockLandingPage = (overrides: Partial<any> = {}) => ({
    id: mockLandingPageId,
    companyId: mockCompanyId,
    theme: 'STARTER',
    cartTheme: null,
    deletedAt: null,
    ...overrides,
  });

  const createMockCartTheme = (): Partial<CartTheme> => ({
    preset: 'ARTISAN',
    colors: {
      background: '#FEF7ED',
      headerBackground: '#FEF7ED',
      footerBackground: '#FEF7ED',
      border: '#E5E7EB',
      itemBackground: '#FFFFFF',
      itemBorder: '#E5E7EB',
      headingText: '#111827',
      bodyText: '#374151',
      mutedText: '#6B7280',
      primaryButton: '#B45309',
      primaryButtonText: '#FFFFFF',
      secondaryButton: '#F3F4F6',
      secondaryButtonText: '#374151',
      iconColor: '#6B7280',
      iconHover: '#374151',
      badge: '#EF4444',
      badgeText: '#FFFFFF',
      error: '#EF4444',
      success: '#10B981',
    },
    layout: {
      position: 'right',
      width: 'medium',
      animation: 'slide',
      animationDuration: 300,
      borderRadius: 'medium',
      shadow: 'medium',
      backdropBlur: true,
      itemLayout: 'comfortable',
      showItemImages: true,
      imageSize: 'medium',
      imageBorderRadius: 'small',
    },
  });

  // ═══════════════════════════════════════════════════════════════
  // SETUP
  // ═══════════════════════════════════════════════════════════════

  beforeEach(async () => {
    prisma = {
      landingPage: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartThemeService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CartThemeService>(CartThemeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════
  // getCartTheme TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getCartTheme', () => {
    it('should return default preset theme when no custom theme exists', async () => {
      const landingPage = createMockLandingPage({ cartTheme: null });
      prisma.landingPage.findUnique.mockResolvedValue(landingPage);

      const result = await service.getCartTheme(mockLandingPageId);

      expect(result).toBeDefined();
      expect(result.preset).toBe('STARTER');
      expect(result.colors).toBeDefined();
      expect(result.layout).toBeDefined();
      expect(result.content).toBeDefined();
      expect(prisma.landingPage.findUnique).toHaveBeenCalledWith({
        where: { id: mockLandingPageId },
        select: { theme: true, cartTheme: true },
      });
    });

    it('should return merged theme when custom theme exists', async () => {
      const customTheme = createMockCartTheme();
      const landingPage = createMockLandingPage({ cartTheme: customTheme });
      prisma.landingPage.findUnique.mockResolvedValue(landingPage);

      const result = await service.getCartTheme(mockLandingPageId);

      expect(result.preset).toBe('ARTISAN');
      expect(result.colors.primaryButton).toBe('#B45309');
    });

    it('should throw NotFoundException when landing page not found', async () => {
      prisma.landingPage.findUnique.mockResolvedValue(null);

      await expect(service.getCartTheme('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.getCartTheme('nonexistent')).rejects.toThrow('Landing page not found');
    });

    it('should use landing page theme as preset base', async () => {
      const landingPage = createMockLandingPage({ theme: 'LUXE', cartTheme: {} });
      prisma.landingPage.findUnique.mockResolvedValue(landingPage);

      const result = await service.getCartTheme(mockLandingPageId);

      expect(result.preset).toBe('LUXE');
      expect(result.colors.background).toBe(CART_THEME_PRESETS.LUXE.colors.background);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // updateCartTheme TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('updateCartTheme', () => {
    it('should update cart theme successfully', async () => {
      const landingPage = createMockLandingPage();
      prisma.landingPage.findFirst.mockResolvedValue(landingPage);
      prisma.landingPage.update.mockResolvedValue(landingPage);

      const updates: Partial<CartTheme> = {
        colors: { primaryButton: '#FF0000' },
      } as Partial<CartTheme>;

      const result = await service.updateCartTheme(mockLandingPageId, mockCompanyId, updates);

      expect(result).toBeDefined();
      expect(prisma.landingPage.update).toHaveBeenCalledWith({
        where: { id: mockLandingPageId },
        data: { cartTheme: expect.objectContaining({ colors: { primaryButton: '#FF0000' } }) },
      });
    });

    it('should throw NotFoundException when landing page not found', async () => {
      prisma.landingPage.findFirst.mockResolvedValue(null);

      await expect(
        service.updateCartTheme(mockLandingPageId, mockCompanyId, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when landing page belongs to different company', async () => {
      prisma.landingPage.findFirst.mockResolvedValue(null);

      await expect(
        service.updateCartTheme(mockLandingPageId, 'different-company', {}),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.landingPage.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockLandingPageId,
          companyId: 'different-company',
          deletedAt: null,
        },
        select: { theme: true, cartTheme: true },
      });
    });

    it('should validate color format', async () => {
      const landingPage = createMockLandingPage();
      prisma.landingPage.findFirst.mockResolvedValue(landingPage);

      const invalidColors = {
        colors: { primaryButton: 'invalid-color' },
      } as Partial<CartTheme>;

      await expect(
        service.updateCartTheme(mockLandingPageId, mockCompanyId, invalidColors),
      ).rejects.toThrow('Invalid color format');
    });

    it('should merge updates with existing theme', async () => {
      const existingTheme = createMockCartTheme();
      const landingPage = createMockLandingPage({ cartTheme: existingTheme });
      prisma.landingPage.findFirst.mockResolvedValue(landingPage);
      prisma.landingPage.update.mockResolvedValue(landingPage);

      const updates: Partial<CartTheme> = {
        layout: { width: 'wide' },
      } as Partial<CartTheme>;

      await service.updateCartTheme(mockLandingPageId, mockCompanyId, updates);

      expect(prisma.landingPage.update).toHaveBeenCalledWith({
        where: { id: mockLandingPageId },
        data: {
          cartTheme: expect.objectContaining({
            preset: 'ARTISAN',
            colors: expect.any(Object),
            layout: expect.objectContaining({ width: 'wide' }),
          }),
        },
      });
    });

    it('should add updatedAt timestamp', async () => {
      const landingPage = createMockLandingPage();
      prisma.landingPage.findFirst.mockResolvedValue(landingPage);
      prisma.landingPage.update.mockResolvedValue(landingPage);

      await service.updateCartTheme(mockLandingPageId, mockCompanyId, {});

      expect(prisma.landingPage.update).toHaveBeenCalledWith({
        where: { id: mockLandingPageId },
        data: {
          cartTheme: expect.objectContaining({ updatedAt: expect.any(String) }),
        },
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // resetCartTheme TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('resetCartTheme', () => {
    it('should reset cart theme to preset default', async () => {
      const landingPage = createMockLandingPage({ theme: 'ARTISAN' });
      prisma.landingPage.findFirst.mockResolvedValue(landingPage);
      prisma.landingPage.update.mockResolvedValue(landingPage);

      const result = await service.resetCartTheme(mockLandingPageId, mockCompanyId);

      expect(result.preset).toBe('ARTISAN');
      expect(result).toEqual(CART_THEME_PRESETS.ARTISAN);
      expect(prisma.landingPage.update).toHaveBeenCalledWith({
        where: { id: mockLandingPageId },
        data: { cartTheme: {} },
      });
    });

    it('should throw NotFoundException when landing page not found', async () => {
      prisma.landingPage.findFirst.mockResolvedValue(null);

      await expect(
        service.resetCartTheme(mockLandingPageId, mockCompanyId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should verify company ownership before reset', async () => {
      prisma.landingPage.findFirst.mockResolvedValue(null);

      await expect(
        service.resetCartTheme(mockLandingPageId, 'different-company'),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.landingPage.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockLandingPageId,
          companyId: 'different-company',
          deletedAt: null,
        },
        select: { theme: true },
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getThemePreview TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getThemePreview', () => {
    it('should return CSS variables for a theme', () => {
      const theme = CART_THEME_PRESETS.STARTER;

      const result = service.getThemePreview(theme);

      expect(result.cssVariables).toBeDefined();
      expect(result.theme).toBe(theme);
      expect(result.cssVariables['--cart-bg']).toBe(theme.colors.background);
      expect(result.cssVariables['--cart-primary-btn']).toBe(theme.colors.primaryButton);
    });

    it('should include layout CSS variables', () => {
      const theme = CART_THEME_PRESETS.LUXE;

      const result = service.getThemePreview(theme);

      expect(result.cssVariables['--cart-width']).toBeDefined();
      expect(result.cssVariables['--cart-radius']).toBeDefined();
      expect(result.cssVariables['--cart-animation-duration']).toBe('400ms');
      expect(result.cssVariables['--cart-image-size']).toBeDefined();
    });

    it('should include all color variables', () => {
      const theme = CART_THEME_PRESETS.STARTER;

      const result = service.getThemePreview(theme);

      expect(result.cssVariables['--cart-header-bg']).toBeDefined();
      expect(result.cssVariables['--cart-footer-bg']).toBeDefined();
      expect(result.cssVariables['--cart-border']).toBeDefined();
      expect(result.cssVariables['--cart-item-bg']).toBeDefined();
      expect(result.cssVariables['--cart-heading']).toBeDefined();
      expect(result.cssVariables['--cart-body']).toBeDefined();
      expect(result.cssVariables['--cart-muted']).toBeDefined();
      expect(result.cssVariables['--cart-badge']).toBeDefined();
      expect(result.cssVariables['--cart-error']).toBeDefined();
      expect(result.cssVariables['--cart-success']).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getThemePresets TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getThemePresets', () => {
    it('should return all available theme presets', () => {
      const result = service.getThemePresets();

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(9); // 9 presets defined
    });

    it('should include preset metadata', () => {
      const result = service.getThemePresets();
      const starter = result.find((p) => p.preset === 'STARTER');

      expect(starter).toBeDefined();
      expect(starter?.name).toBe('Starter');
      expect(starter?.description).toBeDefined();
      expect(starter?.preview).toBeDefined();
      expect(starter?.preview.primaryColor).toBeDefined();
      expect(starter?.preview.backgroundColor).toBeDefined();
    });

    it('should have valid preset names', () => {
      const result = service.getThemePresets();
      const expectedPresets: CartThemePreset[] = [
        'STARTER',
        'ARTISAN',
        'VELOCITY',
        'LUXE',
        'WELLNESS',
        'FOODIE',
        'PROFESSIONAL',
        'CREATOR',
        'MARKETPLACE',
      ];

      const presetNames = result.map((p) => p.preset);
      expectedPresets.forEach((preset) => {
        expect(presetNames).toContain(preset);
      });
    });

    it('should have descriptions for all presets', () => {
      const result = service.getThemePresets();

      result.forEach((preset) => {
        expect(preset.description).toBeDefined();
        expect(preset.description.length).toBeGreaterThan(0);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // generateFromColors TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('generateFromColors', () => {
    it('should generate theme from primary color in light mode', () => {
      const result = service.generateFromColors('#FF5733', 'light');

      expect(result).toBeDefined();
      expect(result.colors.primaryButton).toBe('#FF5733');
      expect(result.colors.iconHover).toBe('#FF5733');
      expect(result.colors.badge).toBe('#FF5733');
    });

    it('should generate theme from primary color in dark mode', () => {
      const result = service.generateFromColors('#FF5733', 'dark');

      expect(result).toBeDefined();
      expect(result.colors.primaryButton).toBe('#FF5733');
      // Dark mode should use LUXE as base
      expect(result.colors.background).toBe(CART_THEME_PRESETS.LUXE.colors.background);
    });

    it('should default to light mode when not specified', () => {
      const result = service.generateFromColors('#FF5733');

      // Light mode should use STARTER as base
      expect(result.preset).toBe('STARTER');
    });

    it('should preserve base theme properties', () => {
      const result = service.generateFromColors('#FF5733', 'light');

      expect(result.layout).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.colors.headingText).toBe(CART_THEME_PRESETS.STARTER.colors.headingText);
    });
  });
});
