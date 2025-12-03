/**
 * Multi-Product Subscription Controller
 *
 * Endpoints for managing subscription boxes with multiple products:
 * - Box configuration
 * - Product swapping
 * - Build-your-own box
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Query,
  Param,
  Body,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  SubscriptionMultiProductService,
  BoxType,
  BoxConfiguration,
  BoxPreview,
  AvailableSwap,
  BoxProduct,
} from '../services/subscription-multi-product.service';
import { CurrentUser, AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsNumber,
  IsBoolean,
  IsArray,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// ═══════════════════════════════════════════════════════════════════════════════
// DTOs
// ═══════════════════════════════════════════════════════════════════════════════

class ConfigureBoxDto {
  @IsString()
  planId: string;

  @IsEnum(BoxType)
  boxType: BoxType;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  minItems: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxItems: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxQuantityPerItem: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  bundleDiscountPct?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  freeItemsIncluded?: number;

  @IsOptional()
  @IsBoolean()
  allowSwaps?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  swapDeadlineDays?: number;

  @IsOptional()
  @IsBoolean()
  allowAddOns?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  addOnMaxValue?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredCategories?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludedCategories?: string[];
}

class AddItemDto {
  @IsString()
  productId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsBoolean()
  isAddOn?: boolean;
}

class UpdateQuantityDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;
}

class SwapProductDto {
  @IsString()
  newProductId: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number;
}

class BoxProductDto {
  @IsString()
  productId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;
}

class BuildBoxDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BoxProductDto)
  products: BoxProductDto[];
}

class CalculatePriceDto {
  @IsString()
  planId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BoxProductDto)
  products: BoxProductDto[];
}

class CuratedProductDto {
  @IsString()
  productId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsBoolean()
  isSwappable?: boolean;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  addedPrice?: number;
}

class SetCuratedProductsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CuratedProductDto)
  products: CuratedProductDto[];
}

@Controller('subscriptions/box')
@UseGuards(AuthGuard('jwt'))
export class SubscriptionMultiProductController {
  private readonly logger = new Logger(SubscriptionMultiProductController.name);

  constructor(
    private readonly multiProductService: SubscriptionMultiProductService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════════
  // BOX CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Configure box settings for a plan
   */
  @Post('config')
  async configureBox(
    @Body() dto: ConfigureBoxDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BoxConfiguration> {
    return this.multiProductService.configureBox({
      planId: dto.planId,
      boxType: dto.boxType,
      minItems: dto.minItems,
      maxItems: dto.maxItems,
      maxQuantityPerItem: dto.maxQuantityPerItem,
      bundleDiscountPct: dto.bundleDiscountPct || 0,
      freeItemsIncluded: dto.freeItemsIncluded || 0,
      allowSwaps: dto.allowSwaps ?? true,
      swapDeadlineDays: dto.swapDeadlineDays || 3,
      allowAddOns: dto.allowAddOns ?? true,
      addOnMaxValue: dto.addOnMaxValue || 100,
      requiredCategories: dto.requiredCategories,
      excludedCategories: dto.excludedCategories,
    });
  }

  /**
   * Get box configuration for a plan
   */
  @Get('config/:planId')
  async getBoxConfiguration(
    @Param('planId') planId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BoxConfiguration | null> {
    return this.multiProductService.getBoxConfiguration(planId);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // ITEM MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Add item to subscription
   */
  @Post(':subscriptionId/items')
  async addItem(
    @Param('subscriptionId') subscriptionId: string,
    @Body() dto: AddItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.multiProductService.addItem({
      subscriptionId,
      productId: dto.productId,
      quantity: dto.quantity,
      isAddOn: dto.isAddOn,
    });
  }

  /**
   * Update item quantity
   */
  @Patch(':subscriptionId/items/:productId')
  async updateItemQuantity(
    @Param('subscriptionId') subscriptionId: string,
    @Param('productId') productId: string,
    @Body() dto: UpdateQuantityDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.multiProductService.updateItemQuantity(
      subscriptionId,
      productId,
      dto.quantity,
    );
  }

  /**
   * Remove item from subscription
   */
  @Delete(':subscriptionId/items/:productId')
  async removeItem(
    @Param('subscriptionId') subscriptionId: string,
    @Param('productId') productId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ success: boolean }> {
    await this.multiProductService.removeItem({
      subscriptionId,
      productId,
    });
    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // PRODUCT SWAPPING
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get swap status for subscription
   */
  @Get(':subscriptionId/swap-status')
  async getSwapStatus(
    @Param('subscriptionId') subscriptionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.multiProductService.getSwapStatus(subscriptionId);
  }

  /**
   * Get available products for swap
   */
  @Get(':subscriptionId/items/:productId/available-swaps')
  async getAvailableSwaps(
    @Param('subscriptionId') subscriptionId: string,
    @Param('productId') productId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AvailableSwap[]> {
    return this.multiProductService.getAvailableSwaps(subscriptionId, productId);
  }

  /**
   * Swap a product
   */
  @Post(':subscriptionId/items/:productId/swap')
  async swapProduct(
    @Param('subscriptionId') subscriptionId: string,
    @Param('productId') productId: string,
    @Body() dto: SwapProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.multiProductService.swapProduct({
      subscriptionId,
      oldProductId: productId,
      newProductId: dto.newProductId,
      quantity: dto.quantity,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // BUILD YOUR OWN BOX
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Build/replace entire box contents
   */
  @Post(':subscriptionId/build')
  async buildBox(
    @Param('subscriptionId') subscriptionId: string,
    @Body() dto: BuildBoxDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.multiProductService.buildBox({
      subscriptionId,
      products: dto.products,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // BOX PREVIEW & PRICING
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get box preview with pricing
   */
  @Get(':subscriptionId/preview')
  async getBoxPreview(
    @Param('subscriptionId') subscriptionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BoxPreview> {
    return this.multiProductService.getBoxPreview(subscriptionId);
  }

  /**
   * Calculate price for a potential box
   */
  @Post('calculate-price')
  async calculateBoxPrice(
    @Body() dto: CalculatePriceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.multiProductService.calculateBoxPrice(dto.planId, dto.products);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // CURATED BOX MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Set curated products for a plan
   */
  @Post('plans/:planId/curated')
  async setCuratedProducts(
    @Param('planId') planId: string,
    @Body() dto: SetCuratedProductsDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ success: boolean }> {
    await this.multiProductService.setCuratedProducts(
      planId,
      dto.products.map((p) => ({
        productId: p.productId,
        quantity: p.quantity,
        isSwappable: p.isSwappable ?? true,
        isRequired: p.isRequired ?? false,
        addedPrice: p.addedPrice,
      })),
    );
    return { success: true };
  }

  /**
   * Get curated products for a plan
   */
  @Get('plans/:planId/curated')
  async getCuratedProducts(
    @Param('planId') planId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BoxProduct[]> {
    return this.multiProductService.getCuratedProducts(planId);
  }

  /**
   * Apply curated products to a subscription
   */
  @Post(':subscriptionId/apply-curated')
  async applyCuratedProducts(
    @Param('subscriptionId') subscriptionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.multiProductService.applyCuratedProducts(subscriptionId);
  }
}
