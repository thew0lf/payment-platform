import {
  Controller,
  Get,
  Put,
  Body,
  Query,
  UseGuards,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Req,
  Inject,
  Optional,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ScopeType, DataClassification } from '@prisma/client';
import { IsString, IsOptional, IsObject, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Request } from 'express';
import Redis from 'ioredis';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { HierarchyService } from '../../hierarchy/hierarchy.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { REDIS_CLIENT } from '../../redis/redis.module';
import { CartTheme, DEFAULT_CART_THEME, CartColors, CartLayout, CartContent, CartThemePreset } from '../types/cart-theme.types';

// Cache configuration
const CART_THEME_CACHE_TTL = 300; // 5 minutes in seconds
const CART_THEME_CACHE_PREFIX = 'cart:theme:';

// =============================================================================
// DTOs with validation
// =============================================================================

class CartColorsDto {
  @IsOptional() @IsString() background?: string;
  @IsOptional() @IsString() headerBackground?: string;
  @IsOptional() @IsString() footerBackground?: string;
  @IsOptional() @IsString() border?: string;
  @IsOptional() @IsString() itemBackground?: string;
  @IsOptional() @IsString() itemBorder?: string;
  @IsOptional() @IsString() headingText?: string;
  @IsOptional() @IsString() bodyText?: string;
  @IsOptional() @IsString() mutedText?: string;
  @IsOptional() @IsString() primaryButton?: string;
  @IsOptional() @IsString() primaryButtonText?: string;
  @IsOptional() @IsString() secondaryButton?: string;
  @IsOptional() @IsString() secondaryButtonText?: string;
  @IsOptional() @IsString() iconColor?: string;
  @IsOptional() @IsString() iconHover?: string;
  @IsOptional() @IsString() badge?: string;
  @IsOptional() @IsString() badgeText?: string;
  @IsOptional() @IsString() error?: string;
  @IsOptional() @IsString() success?: string;
}

class CartLayoutDto {
  @IsOptional() @IsString() position?: string;
  @IsOptional() @IsString() width?: string;
  @IsOptional() @IsString() animation?: string;
  @IsOptional() animationDuration?: number;
  @IsOptional() @IsString() borderRadius?: string;
  @IsOptional() @IsString() shadow?: string;
  @IsOptional() backdropBlur?: boolean;
  @IsOptional() @IsString() itemLayout?: string;
  @IsOptional() showItemImages?: boolean;
  @IsOptional() @IsString() imageSize?: string;
  @IsOptional() @IsString() imageBorderRadius?: string;
}

class CartContentDto {
  @IsOptional() @IsString() @MaxLength(100) headerTitle?: string;
  @IsOptional() showItemCount?: boolean;
  @IsOptional() @IsString() @MaxLength(100) emptyTitle?: string;
  @IsOptional() @IsString() @MaxLength(200) emptySubtitle?: string;
  @IsOptional() @IsString() @MaxLength(50) emptyButtonText?: string;
  @IsOptional() showEmptyIcon?: boolean;
  @IsOptional() @IsString() @MaxLength(50) subtotalLabel?: string;
  @IsOptional() @IsString() @MaxLength(100) shippingNote?: string;
  @IsOptional() @IsString() @MaxLength(50) checkoutButtonText?: string;
  @IsOptional() showSecurityBadge?: boolean;
  @IsOptional() @IsString() @MaxLength(100) securityText?: string;
  @IsOptional() showPaymentIcons?: boolean;
  @IsOptional() showRecommendations?: boolean;
  @IsOptional() @IsString() @MaxLength(100) recommendationsTitle?: string;
}

class CartThemeDto {
  @ApiPropertyOptional({ description: 'Theme preset name' })
  @IsOptional()
  @IsString()
  preset?: string;

  @ApiPropertyOptional({ description: 'Color configuration' })
  @IsOptional()
  @ValidateNested()
  @Type(() => CartColorsDto)
  colors?: Partial<CartColors>;

  @ApiPropertyOptional({ description: 'Layout configuration' })
  @IsOptional()
  @ValidateNested()
  @Type(() => CartLayoutDto)
  layout?: Partial<CartLayout>;

  @ApiPropertyOptional({ description: 'Content configuration' })
  @IsOptional()
  @ValidateNested()
  @Type(() => CartContentDto)
  content?: Partial<CartContent>;

  @ApiPropertyOptional({ description: 'Custom CSS (max 10KB, sanitized)' })
  @IsOptional()
  @IsString()
  @MaxLength(10240) // 10KB max
  customCss?: string;
}

class UpdateCartThemeBodyDto {
  @ValidateNested()
  @Type(() => CartThemeDto)
  theme: CartThemeDto;
}

// =============================================================================
// CSS Sanitization
// =============================================================================

/**
 * Sanitize custom CSS to prevent XSS attacks
 * Removes dangerous patterns while allowing safe styling
 */
function sanitizeCustomCss(css: string | undefined): string | undefined {
  if (!css) return css;

  // Remove JavaScript URLs
  let sanitized = css.replace(/javascript\s*:/gi, '');

  // Remove expression() - IE CSS expression
  sanitized = sanitized.replace(/expression\s*\(/gi, '');

  // Remove behavior: url() - IE htc
  sanitized = sanitized.replace(/behavior\s*:\s*url/gi, '');

  // Remove -moz-binding
  sanitized = sanitized.replace(/-moz-binding\s*:/gi, '');

  // Remove @import (could load external resources)
  sanitized = sanitized.replace(/@import/gi, '');

  // Remove url() with data: or javascript:
  sanitized = sanitized.replace(/url\s*\(\s*["']?\s*(data:|javascript:)/gi, 'url(blocked:');

  // Remove HTML comments (can break out of style blocks)
  sanitized = sanitized.replace(/<!--/g, '').replace(/-->/g, '');

  // Remove script tags (shouldn't be here but just in case)
  sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '');

  return sanitized;
}

// =============================================================================
// CONTROLLER
// =============================================================================

@ApiTags('Cart Settings')
@Controller('cart')
export class CartSettingsController {
  private readonly logger = new Logger(CartSettingsController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
    private readonly auditLogsService: AuditLogsService,
    @Optional() @Inject(REDIS_CLIENT) private readonly redis: Redis | null,
  ) {
    if (this.redis) {
      this.logger.log('Redis caching enabled for cart theme settings');
    } else {
      this.logger.warn('Redis not available - cart theme caching disabled');
    }
  }

  // ===========================================================================
  // HEALTH CHECK ENDPOINT (No Auth Required)
  // ===========================================================================

  @Get('health')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 60, ttl: 60000 } }) // 60 requests per minute (public endpoint)
  @ApiOperation({ summary: 'Health check for cart module' })
  async healthCheck() {
    const redisHealthy = await this.checkRedisHealth();
    const dbHealthy = await this.checkDbHealth();

    return {
      status: redisHealthy && dbHealthy ? 'healthy' : 'degraded',
      module: 'cart',
      timestamp: new Date().toISOString(),
      dependencies: {
        redis: redisHealthy ? 'connected' : 'unavailable',
        database: dbHealthy ? 'connected' : 'unavailable',
      },
    };
  }

  // ===========================================================================
  // CART THEME ENDPOINTS (Company-level)
  // ===========================================================================

  @Get('theme')
  @UseGuards(JwtAuthGuard, ThrottlerGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 120, ttl: 60000 } }) // 120 requests per minute (authenticated)
  @ApiOperation({ summary: 'Get cart theme for a company' })
  async getCartTheme(
    @CurrentUser() user: AuthenticatedUser,
    @Query('companyId') queryCompanyId?: string,
  ): Promise<{ theme: CartTheme }> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);

    if (!companyId) {
      throw new ForbiddenException('Heads up! Please select a company from the sidebar first.');
    }

    // Try to get from cache first
    const cachedTheme = await this.getThemeFromCache(companyId);
    if (cachedTheme) {
      this.logger.debug(`Cache hit for cart theme: ${companyId}`);
      return { theme: cachedTheme };
    }

    this.logger.debug(`Cache miss for cart theme: ${companyId}`);

    // Include soft-delete check for data integrity
    const company = await this.prisma.company.findFirst({
      where: {
        id: companyId,
        deletedAt: null, // Soft-delete check
      },
      select: { settings: true },
    });

    if (!company) {
      throw new NotFoundException('We couldn\'t find that company. It may have been removed or you might need to select a different one.');
    }

    const settings = company.settings as Record<string, unknown> | null;
    const cartTheme = settings?.cartTheme as CartTheme | undefined;
    const theme = cartTheme ? { ...DEFAULT_CART_THEME, ...cartTheme } : DEFAULT_CART_THEME;

    // Cache the theme
    await this.setThemeInCache(companyId, theme);

    return { theme };
  }

  @Put('theme')
  @UseGuards(JwtAuthGuard, ThrottlerGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 120, ttl: 60000 } }) // 120 requests per minute (authenticated)
  @ApiOperation({ summary: 'Update cart theme for a company' })
  async updateCartTheme(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateCartThemeBodyDto,
    @Query('companyId') queryCompanyId?: string,
    @Req() request?: Request,
  ): Promise<{ theme: CartTheme; success: boolean }> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);

    if (!companyId) {
      throw new ForbiddenException('Heads up! Please select a company from the sidebar first.');
    }

    // Verify company exists (with soft-delete check)
    const company = await this.prisma.company.findFirst({
      where: {
        id: companyId,
        deletedAt: null, // Soft-delete check
      },
      select: { settings: true },
    });

    if (!company) {
      throw new NotFoundException('We couldn\'t find that company. It may have been removed or you might need to select a different one.');
    }

    // Sanitize custom CSS if provided
    if (body.theme.customCss) {
      body.theme.customCss = sanitizeCustomCss(body.theme.customCss);
    }

    // Merge with existing settings
    const existingSettings = company.settings as Record<string, unknown> | null || {};
    const existingCartTheme = existingSettings.cartTheme as CartTheme | undefined;

    // Deep merge the theme
    const newTheme: CartTheme = {
      ...DEFAULT_CART_THEME,
      ...existingCartTheme,
      preset: (body.theme.preset as CartThemePreset) || existingCartTheme?.preset || DEFAULT_CART_THEME.preset,
      colors: {
        ...DEFAULT_CART_THEME.colors,
        ...existingCartTheme?.colors,
        ...body.theme.colors,
      },
      layout: {
        ...DEFAULT_CART_THEME.layout,
        ...existingCartTheme?.layout,
        ...body.theme.layout,
      },
      content: {
        ...DEFAULT_CART_THEME.content,
        ...existingCartTheme?.content,
        ...body.theme.content,
      },
      customCss: body.theme.customCss ?? existingCartTheme?.customCss,
      updatedAt: new Date().toISOString(),
    };

    // Update company settings
    await this.prisma.company.update({
      where: { id: companyId },
      data: {
        settings: {
          ...existingSettings,
          cartTheme: newTheme,
        } as object,
      },
    });

    // Invalidate cache for this company's theme
    await this.invalidateThemeCache(companyId);

    // Audit log the theme change (SOC2 compliance)
    await this.auditLogsService.log(
      'CART_THEME_UPDATED',
      'Company',
      companyId,
      {
        userId: user.id,
        scopeType: user.scopeType as ScopeType,
        scopeId: user.scopeId,
        changes: {
          cartTheme: {
            before: existingCartTheme || null,
            after: newTheme,
          },
        },
        metadata: {
          preset: newTheme.preset,
          hasCustomCss: !!newTheme.customCss,
        },
        ipAddress: request?.ip,
        userAgent: request?.get('user-agent'),
        dataClassification: DataClassification.INTERNAL,
      },
    );

    return { theme: newTheme, success: true };
  }

  @Get('theme/presets')
  @UseGuards(JwtAuthGuard, ThrottlerGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 120, ttl: 60000 } }) // 120 requests per minute (authenticated)
  @ApiOperation({ summary: 'Get all available cart theme presets' })
  getThemePresets() {
    return {
      presets: [
        { id: 'STARTER', name: 'Starter', description: 'Clean, minimal design for any brand' },
        { id: 'ARTISAN', name: 'Artisan', description: 'Warm, handcrafted feel for boutique shops' },
        { id: 'VELOCITY', name: 'Velocity', description: 'Bold, high-energy for sports & tech' },
        { id: 'LUXE', name: 'Luxe', description: 'Elegant, premium feel for luxury brands' },
        { id: 'WELLNESS', name: 'Wellness', description: 'Calm, natural aesthetic for health products' },
        { id: 'FOODIE', name: 'Foodie', description: 'Appetizing colors for food & beverage' },
        { id: 'PROFESSIONAL', name: 'Professional', description: 'Corporate, trustworthy for B2B' },
        { id: 'CREATOR', name: 'Creator', description: 'Vibrant, creative for digital products' },
        { id: 'MARKETPLACE', name: 'Marketplace', description: 'Familiar, conversion-focused design' },
      ],
    };
  }

  // ===========================================================================
  // CACHE HELPERS
  // ===========================================================================

  /**
   * Get cart theme from Redis cache
   */
  private async getThemeFromCache(companyId: string): Promise<CartTheme | null> {
    if (!this.redis) {
      return null;
    }

    try {
      const cached = await this.redis.get(`${CART_THEME_CACHE_PREFIX}${companyId}`);
      if (cached) {
        return JSON.parse(cached) as CartTheme;
      }
    } catch (error) {
      this.logger.error(`Failed to get cart theme from cache: ${error.message}`);
    }

    return null;
  }

  /**
   * Set cart theme in Redis cache with TTL
   */
  private async setThemeInCache(companyId: string, theme: CartTheme): Promise<void> {
    if (!this.redis) {
      return;
    }

    try {
      await this.redis.setex(
        `${CART_THEME_CACHE_PREFIX}${companyId}`,
        CART_THEME_CACHE_TTL,
        JSON.stringify(theme),
      );
      this.logger.debug(`Cached cart theme for company: ${companyId} (TTL: ${CART_THEME_CACHE_TTL}s)`);
    } catch (error) {
      this.logger.error(`Failed to cache cart theme: ${error.message}`);
    }
  }

  /**
   * Invalidate cart theme cache for a company
   */
  private async invalidateThemeCache(companyId: string): Promise<void> {
    if (!this.redis) {
      return;
    }

    try {
      await this.redis.del(`${CART_THEME_CACHE_PREFIX}${companyId}`);
      this.logger.debug(`Invalidated cart theme cache for company: ${companyId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate cart theme cache: ${error.message}`);
    }
  }

  // ===========================================================================
  // HEALTH CHECK HELPERS
  // ===========================================================================

  /**
   * Check Redis connectivity
   */
  private async checkRedisHealth(): Promise<boolean> {
    if (!this.redis) {
      return true; // No Redis configured is acceptable (fallback mode)
    }
    try {
      await this.redis.ping();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check database connectivity
   */
  private async checkDbHealth(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  // ===========================================================================
  // SCOPE HELPERS
  // ===========================================================================

  /**
   * Get company ID for operations
   * Returns the company ID from user context or query parameter
   * Validates access for CLIENT/ORG users
   */
  private async getCompanyIdForQuery(
    user: AuthenticatedUser,
    queryCompanyId?: string,
  ): Promise<string | undefined> {
    // COMPANY scoped users always use their company
    if (user.scopeType === 'COMPANY') {
      return user.scopeId;
    }

    // Use explicit query param if provided
    if (queryCompanyId) {
      // Validate user can access the requested company
      const canAccess = await this.hierarchyService.canAccessCompany(
        {
          sub: user.id,
          scopeType: user.scopeType as ScopeType,
          scopeId: user.scopeId,
          clientId: user.clientId,
          companyId: user.companyId,
        },
        queryCompanyId,
      );
      if (!canAccess) {
        throw new ForbiddenException('Hmm, you don\'t have access to that company. Double-check your permissions or try a different one.');
      }
      return queryCompanyId;
    }

    // Fall back to user's companyId if set
    if (user.companyId) {
      return user.companyId;
    }

    return undefined;
  }
}
