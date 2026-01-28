import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CartTheme,
  CartThemePreset,
  CartColors,
  DEFAULT_CART_THEME,
  CART_WIDTH_VALUES,
  CART_RADIUS_VALUES,
  CART_IMAGE_SIZE_VALUES,
} from '../types/cart-theme.types';
import {
  CART_THEME_PRESETS,
  mergeCartTheme,
  getCartThemePreset,
} from '../constants/cart-theme-presets';

@Injectable()
export class CartThemeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get cart theme for a landing page
   */
  async getCartTheme(landingPageId: string): Promise<CartTheme> {
    const landingPage = await this.prisma.landingPage.findFirst({
      where: {
        id: landingPageId,
        deletedAt: null,
      },
      select: {
        theme: true,
        cartTheme: true,
      },
    });

    if (!landingPage) {
      throw new NotFoundException('Hmm, we can\'t find that landing page. It may have been removed or the link might be incorrect.');
    }

    return this.resolveCartTheme(
      landingPage.theme as string,
      landingPage.cartTheme as Partial<CartTheme> | null,
    );
  }

  /**
   * Update cart theme for a landing page
   */
  async updateCartTheme(
    landingPageId: string,
    companyId: string,
    updates: Partial<CartTheme>,
  ): Promise<CartTheme> {
    // Verify landing page belongs to company
    const landingPage = await this.prisma.landingPage.findFirst({
      where: {
        id: landingPageId,
        companyId,
        deletedAt: null,
      },
      select: { theme: true, cartTheme: true },
    });

    if (!landingPage) {
      throw new NotFoundException('Hmm, we can\'t find that landing page. It may have been removed or doesn\'t belong to your company.');
    }

    // Merge with existing theme
    const existingTheme = landingPage.cartTheme as Partial<CartTheme> | null;
    const newTheme: Partial<CartTheme> = {
      ...existingTheme,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // Validate colors if provided
    if (updates.colors) {
      this.validateColors(updates.colors);
    }

    // Update landing page
    await this.prisma.landingPage.update({
      where: { id: landingPageId },
      data: { cartTheme: newTheme as unknown as object },
    });

    return this.resolveCartTheme(landingPage.theme as string, newTheme);
  }

  /**
   * Reset cart theme to preset default
   */
  async resetCartTheme(
    landingPageId: string,
    companyId: string,
  ): Promise<CartTheme> {
    const landingPage = await this.prisma.landingPage.findFirst({
      where: {
        id: landingPageId,
        companyId,
        deletedAt: null,
      },
      select: { theme: true },
    });

    if (!landingPage) {
      throw new NotFoundException('Hmm, we can\'t find that landing page. It may have been removed or doesn\'t belong to your company.');
    }

    await this.prisma.landingPage.update({
      where: { id: landingPageId },
      data: { cartTheme: {} },
    });

    return getCartThemePreset(landingPage.theme as CartThemePreset);
  }

  /**
   * Get preview of cart theme with CSS variables
   */
  getThemePreview(theme: CartTheme): {
    cssVariables: Record<string, string>;
    theme: CartTheme;
  } {
    return {
      cssVariables: this.generateCssVariables(theme),
      theme,
    };
  }

  /**
   * Get all available theme presets
   */
  getThemePresets(): Array<{
    preset: CartThemePreset;
    name: string;
    description: string;
    preview: { primaryColor: string; backgroundColor: string };
  }> {
    return Object.entries(CART_THEME_PRESETS).map(([key, theme]) => ({
      preset: key as CartThemePreset,
      name: this.formatPresetName(key),
      description: this.getPresetDescription(key as CartThemePreset),
      preview: {
        primaryColor: theme.colors.primaryButton,
        backgroundColor: theme.colors.background,
      },
    }));
  }

  /**
   * Generate cart theme from brand colors
   */
  generateFromColors(
    primaryColor: string,
    mode: 'light' | 'dark' = 'light',
  ): CartTheme {
    const basePreset = mode === 'dark' ? 'LUXE' : 'STARTER';
    const base = getCartThemePreset(basePreset);

    // Generate complementary colors based on primary
    const colors = {
      primaryButton: primaryColor,
      iconHover: primaryColor,
      badge: primaryColor,
    };

    return mergeCartTheme(basePreset, { colors } as Partial<CartTheme>);
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private resolveCartTheme(
    landingPageTheme: string,
    customTheme: Partial<CartTheme> | null,
  ): CartTheme {
    const preset = (landingPageTheme as CartThemePreset) || 'STARTER';
    const baseTheme = getCartThemePreset(preset);

    if (!customTheme || Object.keys(customTheme).length === 0) {
      return baseTheme;
    }

    return mergeCartTheme(preset, customTheme);
  }

  private validateColors(colors: Partial<CartColors>): void {
    const hexPattern = /^#[0-9A-Fa-f]{6}$/;

    for (const [key, value] of Object.entries(colors)) {
      if (value && !hexPattern.test(value)) {
        throw new BadRequestException(
          `Oops! The color "${key}" doesn't look quite right. Try a hex format like #FF5733.`,
        );
      }
    }
  }

  private generateCssVariables(theme: CartTheme): Record<string, string> {
    const { colors, layout } = theme;

    return {
      // Colors
      '--cart-bg': colors.background,
      '--cart-header-bg': colors.headerBackground,
      '--cart-footer-bg': colors.footerBackground,
      '--cart-border': colors.border,
      '--cart-item-bg': colors.itemBackground,
      '--cart-item-border': colors.itemBorder,
      '--cart-heading': colors.headingText,
      '--cart-body': colors.bodyText,
      '--cart-muted': colors.mutedText,
      '--cart-primary-btn': colors.primaryButton,
      '--cart-primary-btn-text': colors.primaryButtonText,
      '--cart-secondary-btn': colors.secondaryButton,
      '--cart-secondary-btn-text': colors.secondaryButtonText,
      '--cart-icon': colors.iconColor,
      '--cart-icon-hover': colors.iconHover,
      '--cart-badge': colors.badge,
      '--cart-badge-text': colors.badgeText,
      '--cart-error': colors.error,
      '--cart-success': colors.success,

      // Layout
      '--cart-width': CART_WIDTH_VALUES[layout.width],
      '--cart-radius': CART_RADIUS_VALUES[layout.borderRadius],
      '--cart-animation-duration': `${layout.animationDuration}ms`,
      '--cart-image-size': CART_IMAGE_SIZE_VALUES[layout.imageSize],
    };
  }

  private formatPresetName(key: string): string {
    return key.charAt(0) + key.slice(1).toLowerCase();
  }

  private getPresetDescription(preset: CartThemePreset): string {
    const descriptions: Record<CartThemePreset, string> = {
      STARTER: 'Clean, minimal design for any brand',
      ARTISAN: 'Warm, handcrafted feel for artisanal products',
      VELOCITY: 'Bold, dynamic style for high-energy brands',
      LUXE: 'Elegant, premium look for luxury products',
      WELLNESS: 'Calm, natural tones for health & beauty',
      FOODIE: 'Appetizing, warm colors for food & beverage',
      PROFESSIONAL: 'Corporate, trustworthy for B2B',
      CREATOR: 'Vibrant, expressive for creative brands',
      MARKETPLACE: 'Functional, efficient for multi-vendor',
    };

    return descriptions[preset];
  }
}
