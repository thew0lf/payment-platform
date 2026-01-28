import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ScopeType } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { HierarchyService } from '../../hierarchy/hierarchy.service';
import { CartThemeService } from '../services/cart-theme.service';
import { ProductCatalogService } from '../services/product-catalog.service';
import { CartTheme, ProductCatalog } from '../types/cart-theme.types';
import {
  UpdateCartThemeDto,
  UpdateProductCatalogDto,
  ReorderProductsDto,
  AddProductsDto,
  GenerateThemeDto,
} from '../dto/cart-theme.dto';

// =============================================================================
// CONTROLLER
// =============================================================================

@ApiTags('Cart Theme')
@Controller('landing-pages')
@UseGuards(ThrottlerGuard)
export class CartThemeController {
  constructor(
    private readonly cartThemeService: CartThemeService,
    private readonly productCatalogService: ProductCatalogService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  // ===========================================================================
  // CART THEME ENDPOINTS
  // ===========================================================================

  @Get(':id/cart-theme')
  @Throttle({ default: { limit: 60, ttl: 60000 } }) // 60 requests per minute (public endpoint)
  @ApiOperation({ summary: 'Get cart theme for a landing page' })
  async getCartTheme(@Param('id') landingPageId: string): Promise<CartTheme> {
    return this.cartThemeService.getCartTheme(landingPageId);
  }

  @Patch(':id/cart-theme')
  @Throttle({ default: { limit: 120, ttl: 60000 } }) // 120 requests per minute (authenticated)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update cart theme for a landing page' })
  async updateCartTheme(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') landingPageId: string,
    @Body() dto: UpdateCartThemeDto,
  ): Promise<CartTheme> {
    const companyId = this.getCompanyId(user);
    return this.cartThemeService.updateCartTheme(
      landingPageId,
      companyId,
      dto as unknown as Partial<CartTheme>,
    );
  }

  @Delete(':id/cart-theme')
  @Throttle({ default: { limit: 120, ttl: 60000 } }) // 120 requests per minute (authenticated)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reset cart theme to preset default' })
  async resetCartTheme(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') landingPageId: string,
  ): Promise<CartTheme> {
    const companyId = this.getCompanyId(user);
    return this.cartThemeService.resetCartTheme(landingPageId, companyId);
  }

  @Get(':id/cart-theme/preview')
  @Throttle({ default: { limit: 60, ttl: 60000 } }) // 60 requests per minute (public endpoint)
  @ApiOperation({ summary: 'Get cart theme preview with CSS variables' })
  async getCartThemePreview(@Param('id') landingPageId: string) {
    const theme = await this.cartThemeService.getCartTheme(landingPageId);
    return this.cartThemeService.getThemePreview(theme);
  }

  // ===========================================================================
  // PRODUCT CATALOG ENDPOINTS
  // ===========================================================================

  @Get(':id/product-catalog')
  @Throttle({ default: { limit: 60, ttl: 60000 } }) // 60 requests per minute (public endpoint)
  @ApiOperation({ summary: 'Get product catalog configuration' })
  async getProductCatalog(
    @Param('id') landingPageId: string,
  ): Promise<ProductCatalog> {
    return this.productCatalogService.getProductCatalog(landingPageId);
  }

  @Patch(':id/product-catalog')
  @Throttle({ default: { limit: 120, ttl: 60000 } }) // 120 requests per minute (authenticated)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product catalog configuration' })
  async updateProductCatalog(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') landingPageId: string,
    @Body() dto: UpdateProductCatalogDto,
  ): Promise<ProductCatalog> {
    const companyId = this.getCompanyId(user);
    return this.productCatalogService.updateProductCatalog(
      landingPageId,
      companyId,
      dto as Partial<ProductCatalog>,
    );
  }

  @Get(':id/products')
  @Throttle({ default: { limit: 120, ttl: 60000 } }) // 120 requests per minute (authenticated)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get resolved products for landing page' })
  async getProducts(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') landingPageId: string,
    @Query('companyId') queryCompanyId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    // Validate and get company ID with proper access control
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);

    // Company context is required for this operation
    if (!companyId) {
      throw new ForbiddenException('Heads up! Please select a company from the sidebar first to view products.');
    }

    return this.productCatalogService.getProducts(landingPageId, companyId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Post(':id/product-catalog/products')
  @Throttle({ default: { limit: 120, ttl: 60000 } }) // 120 requests per minute (authenticated)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add products to catalog' })
  async addProducts(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') landingPageId: string,
    @Body() dto: AddProductsDto,
  ): Promise<{ success: boolean }> {
    const companyId = this.getCompanyId(user);
    await this.productCatalogService.addProducts(
      landingPageId,
      companyId,
      dto.productIds,
    );
    return { success: true };
  }

  @Delete(':id/product-catalog/products')
  @Throttle({ default: { limit: 120, ttl: 60000 } }) // 120 requests per minute (authenticated)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove products from catalog' })
  async removeProducts(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') landingPageId: string,
    @Body() dto: AddProductsDto,
  ): Promise<{ success: boolean }> {
    const companyId = this.getCompanyId(user);
    await this.productCatalogService.removeProducts(
      landingPageId,
      companyId,
      dto.productIds,
    );
    return { success: true };
  }

  @Post(':id/product-catalog/reorder')
  @Throttle({ default: { limit: 120, ttl: 60000 } }) // 120 requests per minute (authenticated)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reorder products in catalog' })
  async reorderProducts(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') landingPageId: string,
    @Body() dto: ReorderProductsDto,
  ): Promise<{ success: boolean }> {
    const companyId = this.getCompanyId(user);
    await this.productCatalogService.reorderProducts(
      landingPageId,
      companyId,
      dto.productIds,
    );
    return { success: true };
  }

  // ===========================================================================
  // THEME PRESETS ENDPOINTS
  // ===========================================================================

  @Get('cart-themes/presets')
  @Throttle({ default: { limit: 60, ttl: 60000 } }) // 60 requests per minute (public endpoint)
  @ApiOperation({ summary: 'Get all available cart theme presets' })
  getThemePresets() {
    return this.cartThemeService.getThemePresets();
  }

  @Post('cart-themes/generate')
  @Throttle({ default: { limit: 60, ttl: 60000 } }) // 60 requests per minute (public endpoint)
  @ApiOperation({ summary: 'Generate cart theme from brand colors' })
  generateThemeFromColors(@Body() dto: GenerateThemeDto): CartTheme {
    return this.cartThemeService.generateFromColors(
      dto.primaryColor,
      dto.mode || 'light',
    );
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  private getCompanyId(user: AuthenticatedUser): string {
    if (user.scopeType === 'COMPANY') {
      return user.scopeId;
    }
    if (user.companyId) {
      return user.companyId;
    }
    throw new ForbiddenException('Heads up! Please select a company from the sidebar first.');
  }

  /**
   * Get company ID for READ operations
   * Returns undefined for ORG/CLIENT users (allows cross-company queries)
   * Validates company access when query param is provided
   */
  private async getCompanyIdForQuery(
    user: AuthenticatedUser,
    queryCompanyId?: string,
  ): Promise<string | undefined> {
    if (user.scopeType === 'COMPANY') {
      return user.scopeId; // COMPANY users always filtered by their company
    }

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

    // For ORG/CLIENT users without explicit company, try to use companyId from user context
    if (user.companyId) {
      return user.companyId;
    }

    return undefined; // ORG/CLIENT admins without company context
  }
}
