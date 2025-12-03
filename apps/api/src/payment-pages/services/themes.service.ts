import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateThemeDto } from '../dto';
import {
  CheckoutPageTheme,
  CheckoutPageThemeCategory,
  Prisma,
} from '@prisma/client';
import {
  ThemeStyles,
  ThemeLayout,
  ComponentStyles,
} from '../types';

export interface ThemeFilters {
  category?: CheckoutPageThemeCategory;
  isPublic?: boolean;
  isSystem?: boolean;
  search?: string;
}

@Injectable()
export class ThemesService {
  private readonly logger = new Logger(ThemesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    filters: ThemeFilters = {},
    companyId?: string,
  ): Promise<CheckoutPageTheme[]> {
    const { category, isPublic, isSystem, search } = filters;

    const where: Prisma.CheckoutPageThemeWhereInput = {
      ...(category && { category }),
      ...(isPublic !== undefined && { isPublic }),
      ...(isSystem !== undefined && { isSystem }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
      // Include system themes + company's custom themes
      OR: [
        { isSystem: true },
        { isPublic: true },
        ...(companyId ? [{ companyId }] : []),
      ],
    };

    return this.prisma.checkoutPageTheme.findMany({
      where,
      orderBy: [
        { isSystem: 'desc' },
        { usageCount: 'desc' },
        { name: 'asc' },
      ],
    });
  }

  async findById(id: string): Promise<CheckoutPageTheme> {
    const theme = await this.prisma.checkoutPageTheme.findUnique({
      where: { id },
    });

    if (!theme) {
      throw new NotFoundException(`Theme with ID ${id} not found`);
    }

    return theme;
  }

  async create(
    dto: CreateThemeDto,
    companyId?: string,
    userId?: string,
  ): Promise<CheckoutPageTheme> {
    const theme = await this.prisma.checkoutPageTheme.create({
      data: {
        name: dto.name,
        description: dto.description,
        category: dto.category,
        previewImageUrl: dto.previewImageUrl,
        isSystem: dto.isSystem || false,
        isPublic: dto.isPublic || false,
        styles: dto.styles as unknown as Prisma.InputJsonValue,
        layout: dto.layout as unknown as Prisma.InputJsonValue,
        components: dto.components as unknown as Prisma.InputJsonValue,
        darkModeStyles: dto.darkModeStyles as unknown as Prisma.InputJsonValue,
        companyId,
        createdBy: userId,
      },
    });

    this.logger.log(`Created theme ${theme.id}: ${theme.name}`);

    return theme;
  }

  async update(
    id: string,
    dto: Partial<CreateThemeDto>,
    _userId?: string,
  ): Promise<CheckoutPageTheme> {
    await this.findById(id);

    const theme = await this.prisma.checkoutPageTheme.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.category && { category: dto.category }),
        ...(dto.previewImageUrl !== undefined && { previewImageUrl: dto.previewImageUrl }),
        ...(dto.isPublic !== undefined && { isPublic: dto.isPublic }),
        ...(dto.styles && { styles: dto.styles as unknown as Prisma.InputJsonValue }),
        ...(dto.layout && { layout: dto.layout as unknown as Prisma.InputJsonValue }),
        ...(dto.components && { components: dto.components as unknown as Prisma.InputJsonValue }),
        ...(dto.darkModeStyles !== undefined && { darkModeStyles: dto.darkModeStyles as unknown as Prisma.InputJsonValue }),
      },
    });

    this.logger.log(`Updated theme ${theme.id}`);

    return theme;
  }

  async delete(id: string, _userId?: string): Promise<void> {
    const theme = await this.findById(id);

    if (theme.isSystem) {
      throw new ConflictException('Cannot delete system themes');
    }

    // Hard delete since CheckoutPageTheme doesn't have soft delete fields
    await this.prisma.checkoutPageTheme.delete({
      where: { id },
    });

    this.logger.log(`Deleted theme ${id}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // PRE-BUILT THEMES (8 complete themes)
  // ═══════════════════════════════════════════════════════════════

  getSystemThemes(): CreateThemeDto[] {
    return [
      this.getMinimalTheme(),
      this.getModernTheme(),
      this.getEnterpriseTheme(),
      this.getLuxuryTheme(),
      this.getFriendlyTheme(),
      this.getDarkTheme(),
      this.getSpeedTheme(),
      this.getTrustTheme(),
    ];
  }

  private getMinimalTheme(): CreateThemeDto {
    return {
      name: 'Minimal',
      description: 'Clean, Stripe-inspired design with minimal distractions',
      category: CheckoutPageThemeCategory.MINIMAL,
      previewImageUrl: '/themes/minimal-preview.png',
      isSystem: true,
      isPublic: true,
      styles: {
        primaryColor: '#635BFF',
        secondaryColor: '#0A2540',
        accentColor: '#00D4FF',
        backgroundColor: '#FFFFFF',
        surfaceColor: '#F7F9FC',
        textColor: '#1A1A1A',
        textSecondaryColor: '#6B7280',
        borderColor: '#E5E7EB',
        errorColor: '#DC2626',
        successColor: '#16A34A',
        warningColor: '#F59E0B',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        headingFontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: {
          xs: '0.75rem',
          sm: '0.875rem',
          base: '1rem',
          lg: '1.125rem',
          xl: '1.25rem',
          '2xl': '1.5rem',
          '3xl': '1.875rem',
        },
        fontWeight: {
          normal: 400,
          medium: 500,
          semibold: 600,
          bold: 700,
        },
        borderRadius: {
          none: '0',
          sm: '0.25rem',
          md: '0.375rem',
          lg: '0.5rem',
          xl: '0.75rem',
          full: '9999px',
        },
        spacing: {
          xs: '0.5rem',
          sm: '0.75rem',
          md: '1rem',
          lg: '1.5rem',
          xl: '2rem',
        },
        shadows: {
          sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
          md: '0 4px 6px rgba(0, 0, 0, 0.07)',
          lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
          xl: '0 20px 25px rgba(0, 0, 0, 0.15)',
        },
      },
      layout: {
        type: 'single-column',
        headerPosition: 'top',
        summaryPosition: 'right',
        formWidth: 'narrow',
        contentAlignment: 'center',
        showProgressIndicator: true,
        progressStyle: 'steps',
      },
      components: {
        input: {
          height: '44px',
          padding: '12px 16px',
          borderWidth: '1px',
          borderStyle: 'solid',
          focusRingWidth: '2px',
          focusRingColor: '#635BFF',
        },
        button: {
          height: '48px',
          padding: '12px 24px',
          borderRadius: '6px',
          fontWeight: 600,
          textTransform: 'none',
        },
        card: {
          padding: '24px',
          borderRadius: '12px',
          borderWidth: '1px',
          shadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
        },
        paymentMethod: {
          style: 'tabs',
          iconSize: '24px',
          showLabels: true,
        },
      },
    };
  }

  private getModernTheme(): CreateThemeDto {
    return {
      name: 'Modern',
      description: 'Contemporary design with gradients and smooth animations',
      category: CheckoutPageThemeCategory.MODERN,
      previewImageUrl: '/themes/modern-preview.png',
      isSystem: true,
      isPublic: true,
      styles: {
        primaryColor: '#6366F1',
        secondaryColor: '#4F46E5',
        accentColor: '#EC4899',
        backgroundColor: '#F8FAFC',
        surfaceColor: '#FFFFFF',
        textColor: '#0F172A',
        textSecondaryColor: '#64748B',
        borderColor: '#E2E8F0',
        errorColor: '#EF4444',
        successColor: '#10B981',
        warningColor: '#F59E0B',
        fontFamily: 'Inter, -apple-system, sans-serif',
        headingFontFamily: 'Inter, -apple-system, sans-serif',
        fontSize: {
          xs: '0.75rem',
          sm: '0.875rem',
          base: '1rem',
          lg: '1.125rem',
          xl: '1.25rem',
          '2xl': '1.5rem',
          '3xl': '2rem',
        },
        fontWeight: {
          normal: 400,
          medium: 500,
          semibold: 600,
          bold: 700,
        },
        borderRadius: {
          none: '0',
          sm: '0.375rem',
          md: '0.5rem',
          lg: '0.75rem',
          xl: '1rem',
          full: '9999px',
        },
        spacing: {
          xs: '0.5rem',
          sm: '1rem',
          md: '1.5rem',
          lg: '2rem',
          xl: '3rem',
        },
        shadows: {
          sm: '0 1px 3px rgba(0, 0, 0, 0.1)',
          md: '0 4px 6px rgba(0, 0, 0, 0.1)',
          lg: '0 10px 20px rgba(0, 0, 0, 0.15)',
          xl: '0 25px 50px rgba(0, 0, 0, 0.25)',
        },
      },
      layout: {
        type: 'two-column',
        headerPosition: 'top',
        summaryPosition: 'right',
        formWidth: 'medium',
        contentAlignment: 'left',
        showProgressIndicator: true,
        progressStyle: 'bar',
      },
      components: {
        input: {
          height: '48px',
          padding: '14px 18px',
          borderWidth: '2px',
          borderStyle: 'solid',
          focusRingWidth: '3px',
          focusRingColor: '#6366F1',
        },
        button: {
          height: '52px',
          padding: '14px 28px',
          borderRadius: '10px',
          fontWeight: 600,
          textTransform: 'none',
        },
        card: {
          padding: '28px',
          borderRadius: '16px',
          borderWidth: '0',
          shadow: '0 10px 20px rgba(0, 0, 0, 0.15)',
        },
        paymentMethod: {
          style: 'cards',
          iconSize: '28px',
          showLabels: true,
        },
      },
    };
  }

  private getEnterpriseTheme(): CreateThemeDto {
    return {
      name: 'Enterprise',
      description: 'Professional, trust-building design for B2B transactions',
      category: CheckoutPageThemeCategory.ENTERPRISE,
      previewImageUrl: '/themes/enterprise-preview.png',
      isSystem: true,
      isPublic: true,
      styles: {
        primaryColor: '#0052CC',
        secondaryColor: '#172B4D',
        accentColor: '#36B37E',
        backgroundColor: '#FFFFFF',
        surfaceColor: '#F4F5F7',
        textColor: '#172B4D',
        textSecondaryColor: '#5E6C84',
        borderColor: '#DFE1E6',
        errorColor: '#DE350B',
        successColor: '#00875A',
        warningColor: '#FF991F',
        fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", sans-serif',
        headingFontFamily: '"Segoe UI", Roboto, "Helvetica Neue", sans-serif',
        fontSize: {
          xs: '0.75rem',
          sm: '0.875rem',
          base: '0.9375rem',
          lg: '1.0625rem',
          xl: '1.1875rem',
          '2xl': '1.375rem',
          '3xl': '1.75rem',
        },
        fontWeight: {
          normal: 400,
          medium: 500,
          semibold: 600,
          bold: 700,
        },
        borderRadius: {
          none: '0',
          sm: '3px',
          md: '4px',
          lg: '6px',
          xl: '8px',
          full: '9999px',
        },
        spacing: {
          xs: '0.5rem',
          sm: '0.75rem',
          md: '1rem',
          lg: '1.25rem',
          xl: '1.5rem',
        },
        shadows: {
          sm: '0 1px 1px rgba(9, 30, 66, 0.25)',
          md: '0 3px 5px rgba(9, 30, 66, 0.2)',
          lg: '0 8px 16px rgba(9, 30, 66, 0.25)',
          xl: '0 12px 24px rgba(9, 30, 66, 0.3)',
        },
      },
      layout: {
        type: 'two-column',
        headerPosition: 'top',
        summaryPosition: 'right',
        formWidth: 'wide',
        contentAlignment: 'left',
        showProgressIndicator: true,
        progressStyle: 'steps',
      },
      components: {
        input: {
          height: '40px',
          padding: '10px 14px',
          borderWidth: '2px',
          borderStyle: 'solid',
          focusRingWidth: '2px',
          focusRingColor: '#0052CC',
        },
        button: {
          height: '44px',
          padding: '10px 20px',
          borderRadius: '4px',
          fontWeight: 600,
          textTransform: 'none',
        },
        card: {
          padding: '20px',
          borderRadius: '6px',
          borderWidth: '1px',
          shadow: '0 1px 1px rgba(9, 30, 66, 0.25)',
        },
        paymentMethod: {
          style: 'list',
          iconSize: '24px',
          showLabels: true,
        },
      },
    };
  }

  private getLuxuryTheme(): CreateThemeDto {
    return {
      name: 'Luxury',
      description: 'Premium, elegant design for high-value transactions',
      category: CheckoutPageThemeCategory.LUXURY,
      previewImageUrl: '/themes/luxury-preview.png',
      isSystem: true,
      isPublic: true,
      styles: {
        primaryColor: '#B8860B',
        secondaryColor: '#1A1A1A',
        accentColor: '#DAA520',
        backgroundColor: '#0D0D0D',
        surfaceColor: '#1A1A1A',
        textColor: '#FFFFFF',
        textSecondaryColor: '#A0A0A0',
        borderColor: '#333333',
        errorColor: '#FF4D4F',
        successColor: '#52C41A',
        warningColor: '#FAAD14',
        fontFamily: '"Cormorant Garamond", Georgia, serif',
        headingFontFamily: '"Playfair Display", Georgia, serif',
        fontSize: {
          xs: '0.8rem',
          sm: '0.9rem',
          base: '1rem',
          lg: '1.15rem',
          xl: '1.35rem',
          '2xl': '1.75rem',
          '3xl': '2.25rem',
        },
        fontWeight: {
          normal: 400,
          medium: 500,
          semibold: 600,
          bold: 700,
        },
        borderRadius: {
          none: '0',
          sm: '2px',
          md: '4px',
          lg: '6px',
          xl: '8px',
          full: '9999px',
        },
        spacing: {
          xs: '0.75rem',
          sm: '1rem',
          md: '1.5rem',
          lg: '2rem',
          xl: '3rem',
        },
        shadows: {
          sm: '0 2px 4px rgba(0, 0, 0, 0.3)',
          md: '0 4px 8px rgba(0, 0, 0, 0.4)',
          lg: '0 8px 16px rgba(0, 0, 0, 0.5)',
          xl: '0 16px 32px rgba(0, 0, 0, 0.6)',
        },
      },
      layout: {
        type: 'split-screen',
        headerPosition: 'none',
        summaryPosition: 'right',
        formWidth: 'medium',
        contentAlignment: 'center',
        showProgressIndicator: false,
        progressStyle: 'none',
      },
      components: {
        input: {
          height: '52px',
          padding: '16px 20px',
          borderWidth: '1px',
          borderStyle: 'solid',
          focusRingWidth: '1px',
          focusRingColor: '#B8860B',
        },
        button: {
          height: '56px',
          padding: '16px 32px',
          borderRadius: '2px',
          fontWeight: 500,
          textTransform: 'uppercase',
        },
        card: {
          padding: '32px',
          borderRadius: '4px',
          borderWidth: '1px',
          shadow: '0 4px 8px rgba(0, 0, 0, 0.4)',
        },
        paymentMethod: {
          style: 'cards',
          iconSize: '32px',
          showLabels: true,
        },
      },
      darkModeStyles: {
        backgroundColor: '#000000',
        surfaceColor: '#0D0D0D',
      },
    };
  }

  private getFriendlyTheme(): CreateThemeDto {
    return {
      name: 'Friendly',
      description: 'Warm, approachable design with playful elements',
      category: CheckoutPageThemeCategory.FRIENDLY,
      previewImageUrl: '/themes/friendly-preview.png',
      isSystem: true,
      isPublic: true,
      styles: {
        primaryColor: '#FF6B6B',
        secondaryColor: '#4ECDC4',
        accentColor: '#FFE66D',
        backgroundColor: '#FFF9F0',
        surfaceColor: '#FFFFFF',
        textColor: '#2D3436',
        textSecondaryColor: '#636E72',
        borderColor: '#DFE6E9',
        errorColor: '#FF7675',
        successColor: '#00B894',
        warningColor: '#FDCB6E',
        fontFamily: '"Nunito", "Quicksand", sans-serif',
        headingFontFamily: '"Poppins", "Nunito", sans-serif',
        fontSize: {
          xs: '0.75rem',
          sm: '0.9rem',
          base: '1rem',
          lg: '1.15rem',
          xl: '1.35rem',
          '2xl': '1.65rem',
          '3xl': '2rem',
        },
        fontWeight: {
          normal: 400,
          medium: 500,
          semibold: 600,
          bold: 700,
        },
        borderRadius: {
          none: '0',
          sm: '8px',
          md: '12px',
          lg: '16px',
          xl: '24px',
          full: '9999px',
        },
        spacing: {
          xs: '0.5rem',
          sm: '1rem',
          md: '1.5rem',
          lg: '2rem',
          xl: '2.5rem',
        },
        shadows: {
          sm: '0 2px 8px rgba(0, 0, 0, 0.08)',
          md: '0 4px 12px rgba(0, 0, 0, 0.1)',
          lg: '0 8px 24px rgba(0, 0, 0, 0.12)',
          xl: '0 16px 32px rgba(0, 0, 0, 0.15)',
        },
      },
      layout: {
        type: 'single-column',
        headerPosition: 'top',
        summaryPosition: 'bottom',
        formWidth: 'medium',
        contentAlignment: 'center',
        showProgressIndicator: true,
        progressStyle: 'dots',
      },
      components: {
        input: {
          height: '50px',
          padding: '14px 18px',
          borderWidth: '2px',
          borderStyle: 'solid',
          focusRingWidth: '3px',
          focusRingColor: '#FF6B6B',
        },
        button: {
          height: '54px',
          padding: '14px 28px',
          borderRadius: '27px',
          fontWeight: 700,
          textTransform: 'none',
        },
        card: {
          padding: '24px',
          borderRadius: '20px',
          borderWidth: '2px',
          shadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        },
        paymentMethod: {
          style: 'cards',
          iconSize: '32px',
          showLabels: true,
        },
      },
    };
  }

  private getDarkTheme(): CreateThemeDto {
    return {
      name: 'Dark',
      description: 'Sleek dark mode design for modern applications',
      category: CheckoutPageThemeCategory.DARK,
      previewImageUrl: '/themes/dark-preview.png',
      isSystem: true,
      isPublic: true,
      styles: {
        primaryColor: '#00D4FF',
        secondaryColor: '#7C3AED',
        accentColor: '#10B981',
        backgroundColor: '#0F0F0F',
        surfaceColor: '#1A1A1A',
        textColor: '#FFFFFF',
        textSecondaryColor: '#9CA3AF',
        borderColor: '#2D2D2D',
        errorColor: '#EF4444',
        successColor: '#10B981',
        warningColor: '#F59E0B',
        fontFamily: '"SF Pro Display", -apple-system, sans-serif',
        headingFontFamily: '"SF Pro Display", -apple-system, sans-serif',
        fontSize: {
          xs: '0.75rem',
          sm: '0.875rem',
          base: '1rem',
          lg: '1.125rem',
          xl: '1.25rem',
          '2xl': '1.5rem',
          '3xl': '1.875rem',
        },
        fontWeight: {
          normal: 400,
          medium: 500,
          semibold: 600,
          bold: 700,
        },
        borderRadius: {
          none: '0',
          sm: '6px',
          md: '8px',
          lg: '12px',
          xl: '16px',
          full: '9999px',
        },
        spacing: {
          xs: '0.5rem',
          sm: '0.75rem',
          md: '1rem',
          lg: '1.5rem',
          xl: '2rem',
        },
        shadows: {
          sm: '0 2px 4px rgba(0, 0, 0, 0.5)',
          md: '0 4px 8px rgba(0, 0, 0, 0.6)',
          lg: '0 8px 16px rgba(0, 0, 0, 0.7)',
          xl: '0 16px 32px rgba(0, 0, 0, 0.8)',
        },
      },
      layout: {
        type: 'single-column',
        headerPosition: 'top',
        summaryPosition: 'floating',
        formWidth: 'narrow',
        contentAlignment: 'center',
        showProgressIndicator: true,
        progressStyle: 'bar',
      },
      components: {
        input: {
          height: '48px',
          padding: '12px 16px',
          borderWidth: '1px',
          borderStyle: 'solid',
          focusRingWidth: '2px',
          focusRingColor: '#00D4FF',
        },
        button: {
          height: '50px',
          padding: '12px 24px',
          borderRadius: '8px',
          fontWeight: 600,
          textTransform: 'none',
        },
        card: {
          padding: '24px',
          borderRadius: '12px',
          borderWidth: '1px',
          shadow: '0 4px 8px rgba(0, 0, 0, 0.6)',
        },
        paymentMethod: {
          style: 'tabs',
          iconSize: '24px',
          showLabels: true,
        },
      },
    };
  }

  private getSpeedTheme(): CreateThemeDto {
    return {
      name: 'Speed',
      description: 'Optimized for fast, one-click checkout experiences',
      category: CheckoutPageThemeCategory.SPEED,
      previewImageUrl: '/themes/speed-preview.png',
      isSystem: true,
      isPublic: true,
      styles: {
        primaryColor: '#22C55E',
        secondaryColor: '#16A34A',
        accentColor: '#14B8A6',
        backgroundColor: '#FFFFFF',
        surfaceColor: '#F0FDF4',
        textColor: '#14532D',
        textSecondaryColor: '#4B5563',
        borderColor: '#D1FAE5',
        errorColor: '#DC2626',
        successColor: '#22C55E',
        warningColor: '#EAB308',
        fontFamily: '"Inter", -apple-system, sans-serif',
        headingFontFamily: '"Inter", -apple-system, sans-serif',
        fontSize: {
          xs: '0.75rem',
          sm: '0.875rem',
          base: '1rem',
          lg: '1.125rem',
          xl: '1.25rem',
          '2xl': '1.5rem',
          '3xl': '1.875rem',
        },
        fontWeight: {
          normal: 400,
          medium: 500,
          semibold: 600,
          bold: 700,
        },
        borderRadius: {
          none: '0',
          sm: '4px',
          md: '6px',
          lg: '8px',
          xl: '12px',
          full: '9999px',
        },
        spacing: {
          xs: '0.25rem',
          sm: '0.5rem',
          md: '0.75rem',
          lg: '1rem',
          xl: '1.5rem',
        },
        shadows: {
          sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
          md: '0 2px 4px rgba(0, 0, 0, 0.07)',
          lg: '0 4px 8px rgba(0, 0, 0, 0.1)',
          xl: '0 8px 16px rgba(0, 0, 0, 0.12)',
        },
      },
      layout: {
        type: 'minimal',
        headerPosition: 'top',
        summaryPosition: 'none',
        formWidth: 'narrow',
        contentAlignment: 'center',
        showProgressIndicator: false,
        progressStyle: 'none',
      },
      components: {
        input: {
          height: '40px',
          padding: '8px 12px',
          borderWidth: '1px',
          borderStyle: 'solid',
          focusRingWidth: '2px',
          focusRingColor: '#22C55E',
        },
        button: {
          height: '44px',
          padding: '10px 20px',
          borderRadius: '6px',
          fontWeight: 600,
          textTransform: 'none',
        },
        card: {
          padding: '16px',
          borderRadius: '8px',
          borderWidth: '1px',
          shadow: '0 2px 4px rgba(0, 0, 0, 0.07)',
        },
        paymentMethod: {
          style: 'radio',
          iconSize: '20px',
          showLabels: false,
        },
      },
    };
  }

  private getTrustTheme(): CreateThemeDto {
    return {
      name: 'Trust',
      description: 'Security-focused design with trust indicators and compliance badges',
      category: CheckoutPageThemeCategory.TRUST,
      previewImageUrl: '/themes/trust-preview.png',
      isSystem: true,
      isPublic: true,
      styles: {
        primaryColor: '#1E40AF',
        secondaryColor: '#1E3A8A',
        accentColor: '#3B82F6',
        backgroundColor: '#F8FAFC',
        surfaceColor: '#FFFFFF',
        textColor: '#1E293B',
        textSecondaryColor: '#64748B',
        borderColor: '#CBD5E1',
        errorColor: '#DC2626',
        successColor: '#059669',
        warningColor: '#D97706',
        fontFamily: '"Source Sans Pro", -apple-system, sans-serif',
        headingFontFamily: '"Source Sans Pro", -apple-system, sans-serif',
        fontSize: {
          xs: '0.75rem',
          sm: '0.875rem',
          base: '1rem',
          lg: '1.0625rem',
          xl: '1.1875rem',
          '2xl': '1.375rem',
          '3xl': '1.625rem',
        },
        fontWeight: {
          normal: 400,
          medium: 500,
          semibold: 600,
          bold: 700,
        },
        borderRadius: {
          none: '0',
          sm: '4px',
          md: '6px',
          lg: '8px',
          xl: '10px',
          full: '9999px',
        },
        spacing: {
          xs: '0.5rem',
          sm: '0.75rem',
          md: '1rem',
          lg: '1.25rem',
          xl: '1.75rem',
        },
        shadows: {
          sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
          md: '0 2px 4px rgba(0, 0, 0, 0.08)',
          lg: '0 4px 8px rgba(0, 0, 0, 0.1)',
          xl: '0 8px 16px rgba(0, 0, 0, 0.12)',
        },
      },
      layout: {
        type: 'two-column',
        headerPosition: 'top',
        summaryPosition: 'right',
        formWidth: 'wide',
        contentAlignment: 'left',
        showProgressIndicator: true,
        progressStyle: 'steps',
      },
      components: {
        input: {
          height: '46px',
          padding: '12px 14px',
          borderWidth: '2px',
          borderStyle: 'solid',
          focusRingWidth: '2px',
          focusRingColor: '#1E40AF',
        },
        button: {
          height: '48px',
          padding: '12px 24px',
          borderRadius: '6px',
          fontWeight: 600,
          textTransform: 'none',
        },
        card: {
          padding: '24px',
          borderRadius: '8px',
          borderWidth: '2px',
          shadow: '0 2px 4px rgba(0, 0, 0, 0.08)',
        },
        paymentMethod: {
          style: 'list',
          iconSize: '28px',
          showLabels: true,
        },
      },
    };
  }

  async seedSystemThemes(): Promise<CheckoutPageTheme[]> {
    const themes = this.getSystemThemes();
    const createdThemes: CheckoutPageTheme[] = [];

    for (const themeDto of themes) {
      // Check if theme already exists
      const existing = await this.prisma.checkoutPageTheme.findFirst({
        where: {
          name: themeDto.name,
          isSystem: true,
        },
      });

      if (existing) {
        this.logger.log(`Theme "${themeDto.name}" already exists, skipping`);
        createdThemes.push(existing);
        continue;
      }

      const theme = await this.create(themeDto);
      createdThemes.push(theme);
      this.logger.log(`Created system theme: ${theme.name}`);
    }

    return createdThemes;
  }
}
