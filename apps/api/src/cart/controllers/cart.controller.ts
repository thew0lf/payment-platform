import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { CartService } from '../services/cart.service';
import { ShippingService, ShippingEstimateResult } from '../services/shipping.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import {
  AddToCartDto,
  UpdateCartItemDto,
  ApplyDiscountDto,
  CartQueryDto,
  CreateCartDto,
  SaveForLaterDto,
  MoveToCartDto,
  MergeCartsDto,
  UpdateShippingDto,
  AddBundleToCartDto,
  RemoveBundleDto,
  EstimateShippingDto,
  SelectShippingMethodDto,
} from '../dto/cart.dto';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Authenticated Cart Controller - for logged-in users
 */
@ApiTags('Cart')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(
    private readonly cartService: CartService,
    private readonly shippingService: ShippingService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get current user cart' })
  @ApiResponse({ status: 200, description: 'Cart retrieved' })
  async getCart(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: CartQueryDto,
  ) {
    const cart = await this.cartService.getCartByCustomerId(user.id, user.companyId);

    if (!cart) {
      return this.cartService.getOrCreateCart(user.companyId, {
        customerId: user.id,
        siteId: query.siteId,
      });
    }

    return cart;
  }

  @Post('items')
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiResponse({ status: 201, description: 'Item added' })
  async addItem(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddToCartDto,
    @Query('siteId') siteId?: string,
  ) {
    const cart = await this.cartService.getOrCreateCart(user.companyId, {
      customerId: user.id,
      siteId,
    });

    return this.cartService.addItem(cart.id, dto, user.id);
  }

  @Patch('items/:itemId')
  @ApiOperation({ summary: 'Update cart item' })
  @ApiResponse({ status: 200, description: 'Item updated' })
  async updateItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    const cart = await this.cartService.getCartByCustomerId(user.id, user.companyId);

    if (!cart) {
      throw new NotFoundException('Hmm, we can\'t find your cart. Try adding an item to get started!');
    }

    return this.cartService.updateItem(cart.id, itemId, dto, user.id);
  }

  @Delete('items/:itemId')
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiResponse({ status: 200, description: 'Item removed' })
  async removeItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('itemId') itemId: string,
  ) {
    const cart = await this.cartService.getCartByCustomerId(user.id, user.companyId);

    if (!cart) {
      throw new NotFoundException('Hmm, we can\'t find your cart. Try adding an item to get started!');
    }

    return this.cartService.removeItem(cart.id, itemId, user.id);
  }

  @Post('items/:itemId/save-for-later')
  @ApiOperation({ summary: 'Save item for later' })
  @ApiResponse({ status: 200, description: 'Item saved' })
  async saveForLater(
    @CurrentUser() user: AuthenticatedUser,
    @Param('itemId') itemId: string,
  ) {
    const cart = await this.cartService.getCartByCustomerId(user.id, user.companyId);

    if (!cart) {
      throw new NotFoundException('Hmm, we can\'t find your cart. Try adding an item to get started!');
    }

    return this.cartService.saveForLater(cart.id, itemId, user.id);
  }

  @Post('saved/:savedItemId/move-to-cart')
  @ApiOperation({ summary: 'Move saved item back to cart' })
  @ApiResponse({ status: 200, description: 'Item moved to cart' })
  async moveToCart(
    @CurrentUser() user: AuthenticatedUser,
    @Param('savedItemId') savedItemId: string,
    @Body() dto: MoveToCartDto,
  ) {
    const cart = await this.cartService.getCartByCustomerId(user.id, user.companyId);

    if (!cart) {
      throw new NotFoundException('Hmm, we can\'t find your cart. Try adding an item to get started!');
    }

    return this.cartService.moveToCart(cart.id, savedItemId, dto.quantity, user.id);
  }

  @Post('discount')
  @ApiOperation({ summary: 'Apply discount code' })
  @ApiResponse({ status: 200, description: 'Discount applied' })
  async applyDiscount(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ApplyDiscountDto,
  ) {
    const cart = await this.cartService.getCartByCustomerId(user.id, user.companyId);

    if (!cart) {
      throw new NotFoundException('Hmm, we can\'t find your cart. Try adding an item first, then apply your discount!');
    }

    return this.cartService.applyDiscount(cart.id, dto.code, user.id);
  }

  @Delete('discount/:code')
  @ApiOperation({ summary: 'Remove discount code' })
  @ApiResponse({ status: 200, description: 'Discount removed' })
  async removeDiscount(
    @CurrentUser() user: AuthenticatedUser,
    @Param('code') code: string,
  ) {
    const cart = await this.cartService.getCartByCustomerId(user.id, user.companyId);

    if (!cart) {
      throw new NotFoundException('Hmm, we can\'t find your cart. It may have expired.');
    }

    return this.cartService.removeDiscount(cart.id, code, user.id);
  }

  @Post('shipping/estimate')
  @ApiOperation({ summary: 'Estimate shipping costs for cart' })
  @ApiResponse({ status: 200, description: 'Shipping options returned' })
  async estimateShipping(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: EstimateShippingDto,
  ): Promise<ShippingEstimateResult> {
    const cart = await this.cartService.getCartByCustomerId(user.id, user.companyId);

    if (!cart) {
      throw new NotFoundException('Hmm, we can\'t find your cart. Try adding an item to get started!');
    }

    if (cart.items.length === 0) {
      return {
        options: [],
        cheapestOption: null,
        fastestOption: null,
        freeShippingThreshold: null,
        amountToFreeShipping: null,
      };
    }

    return this.shippingService.calculateShipping({
      companyId: user.companyId,
      country: dto.country,
      state: dto.state,
      zipCode: dto.postalCode,
      cartSubtotal: new Decimal(cart.totals.subtotal),
      cartItems: cart.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        weight: item.productSnapshot?.weight ? new Decimal(item.productSnapshot.weight as number) : undefined,
        lineTotal: new Decimal(item.lineTotal),
      })),
    });
  }

  @Post('shipping/select')
  @ApiOperation({ summary: 'Select a shipping method for the cart' })
  @ApiResponse({ status: 200, description: 'Shipping method selected' })
  async selectShippingMethod(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SelectShippingMethodDto,
  ) {
    const cart = await this.cartService.getCartByCustomerId(user.id, user.companyId);

    if (!cart) {
      throw new NotFoundException('Hmm, we can\'t find your cart. Try adding an item to get started!');
    }

    return this.cartService.selectShippingMethod(cart.id, dto.shippingMethodId, user.id);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear cart' })
  @ApiResponse({ status: 200, description: 'Cart cleared' })
  async clearCart(@CurrentUser() user: AuthenticatedUser) {
    const cart = await this.cartService.getCartByCustomerId(user.id, user.companyId);

    if (!cart) {
      throw new NotFoundException('Hmm, we can\'t find your cart. It may have already been cleared.');
    }

    return this.cartService.clearCart(cart.id, user.id);
  }

  @Post('merge')
  @ApiOperation({ summary: 'Merge guest cart into user cart' })
  @ApiResponse({ status: 200, description: 'Carts merged' })
  async mergeCarts(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: MergeCartsDto,
  ) {
    const userCart = await this.cartService.getOrCreateCart(user.companyId, {
      customerId: user.id,
    });

    return this.cartService.mergeCarts(dto.sourceCartId, userCart.id, user.id);
  }

  @Post('bundles')
  @ApiOperation({ summary: 'Add bundle to cart' })
  @ApiResponse({ status: 201, description: 'Bundle added to cart' })
  async addBundle(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddBundleToCartDto,
    @Query('siteId') siteId?: string,
  ) {
    const cart = await this.cartService.getOrCreateCart(user.companyId, {
      customerId: user.id,
      siteId,
    });

    return this.cartService.addBundleToCart(cart.id, dto, user.id);
  }

  @Delete('bundles/:bundleGroupId')
  @ApiOperation({ summary: 'Remove bundle from cart' })
  @ApiResponse({ status: 200, description: 'Bundle removed' })
  async removeBundle(
    @CurrentUser() user: AuthenticatedUser,
    @Param('bundleGroupId') bundleGroupId: string,
  ) {
    const cart = await this.cartService.getCartByCustomerId(user.id, user.companyId);

    if (!cart) {
      throw new NotFoundException('Hmm, we can\'t find your cart. Try adding an item to get started!');
    }

    return this.cartService.removeBundleFromCart(cart.id, bundleGroupId, user.id);
  }
}

/**
 * Public Cart Controller - for anonymous users (funnel checkout)
 *
 * SECURITY: All cart operations require session token validation.
 * The session token in the header must match the cart's session token.
 */
@ApiTags('Public Cart')
@Controller('public/cart')
export class PublicCartController {
  constructor(
    private readonly cartService: CartService,
    private readonly shippingService: ShippingService,
  ) {}

  /**
   * Validate that the provided session token matches the cart's session token
   */
  private async validateCartOwnership(
    cartId: string,
    sessionToken: string | undefined,
    companyId: string,
  ): Promise<void> {
    if (!sessionToken) {
      throw new ForbiddenException('Your session has expired. Please refresh the page to continue shopping.');
    }

    const cart = await this.cartService.getCartById(cartId);

    if (cart.companyId !== companyId) {
      throw new ForbiddenException('This cart doesn\'t belong to your session. Please start a new cart.');
    }

    if (cart.sessionToken !== sessionToken) {
      throw new ForbiddenException('Your session doesn\'t match this cart. Please refresh and try again.');
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get cart by session token' })
  @ApiHeader({ name: 'x-session-token', description: 'Cart session token' })
  @ApiHeader({ name: 'x-company-id', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Cart retrieved' })
  async getCart(
    @Headers('x-session-token') sessionToken: string,
    @Headers('x-company-id') companyId: string,
  ) {
    if (!sessionToken || !companyId) {
      return { items: [], totals: { subtotal: 0, grandTotal: 0, itemCount: 0 } };
    }

    const cart = await this.cartService.getCartBySessionToken(sessionToken, companyId);
    return cart || { items: [], totals: { subtotal: 0, grandTotal: 0, itemCount: 0 } };
  }

  @Post()
  @ApiOperation({ summary: 'Create new anonymous cart' })
  @ApiHeader({ name: 'x-company-id', description: 'Company ID' })
  @ApiResponse({ status: 201, description: 'Cart created' })
  async createCart(
    @Headers('x-company-id') companyId: string,
    @Body() dto: CreateCartDto,
  ) {
    return this.cartService.getOrCreateCart(companyId, {
      siteId: dto.siteId,
      visitorId: dto.visitorId,
      currency: dto.currency,
      utmSource: dto.utmSource,
      utmMedium: dto.utmMedium,
      utmCampaign: dto.utmCampaign,
    });
  }

  @Post(':cartId/items')
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiHeader({ name: 'x-session-token', description: 'Cart session token', required: true })
  @ApiHeader({ name: 'x-company-id', description: 'Company ID', required: true })
  @ApiResponse({ status: 201, description: 'Item added' })
  @ApiResponse({ status: 403, description: 'Session token mismatch' })
  async addItem(
    @Param('cartId') cartId: string,
    @Headers('x-session-token') sessionToken: string,
    @Headers('x-company-id') companyId: string,
    @Body() dto: AddToCartDto,
  ) {
    await this.validateCartOwnership(cartId, sessionToken, companyId);
    return this.cartService.addItem(cartId, dto);
  }

  @Patch(':cartId/items/:itemId')
  @ApiOperation({ summary: 'Update cart item' })
  @ApiHeader({ name: 'x-session-token', description: 'Cart session token', required: true })
  @ApiHeader({ name: 'x-company-id', description: 'Company ID', required: true })
  @ApiResponse({ status: 200, description: 'Item updated' })
  @ApiResponse({ status: 403, description: 'Session token mismatch' })
  async updateItem(
    @Param('cartId') cartId: string,
    @Param('itemId') itemId: string,
    @Headers('x-session-token') sessionToken: string,
    @Headers('x-company-id') companyId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    await this.validateCartOwnership(cartId, sessionToken, companyId);
    return this.cartService.updateItem(cartId, itemId, dto);
  }

  @Delete(':cartId/items/:itemId')
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiHeader({ name: 'x-session-token', description: 'Cart session token', required: true })
  @ApiHeader({ name: 'x-company-id', description: 'Company ID', required: true })
  @ApiResponse({ status: 200, description: 'Item removed' })
  @ApiResponse({ status: 403, description: 'Session token mismatch' })
  async removeItem(
    @Param('cartId') cartId: string,
    @Param('itemId') itemId: string,
    @Headers('x-session-token') sessionToken: string,
    @Headers('x-company-id') companyId: string,
  ) {
    await this.validateCartOwnership(cartId, sessionToken, companyId);
    return this.cartService.removeItem(cartId, itemId);
  }

  @Post(':cartId/discount')
  @ApiOperation({ summary: 'Apply discount code' })
  @ApiHeader({ name: 'x-session-token', description: 'Cart session token', required: true })
  @ApiHeader({ name: 'x-company-id', description: 'Company ID', required: true })
  @ApiResponse({ status: 200, description: 'Discount applied' })
  @ApiResponse({ status: 403, description: 'Session token mismatch' })
  async applyDiscount(
    @Param('cartId') cartId: string,
    @Headers('x-session-token') sessionToken: string,
    @Headers('x-company-id') companyId: string,
    @Body() dto: ApplyDiscountDto,
  ) {
    await this.validateCartOwnership(cartId, sessionToken, companyId);
    return this.cartService.applyDiscount(cartId, dto.code);
  }

  @Delete(':cartId/discount/:code')
  @ApiOperation({ summary: 'Remove discount code' })
  @ApiHeader({ name: 'x-session-token', description: 'Cart session token', required: true })
  @ApiHeader({ name: 'x-company-id', description: 'Company ID', required: true })
  @ApiResponse({ status: 200, description: 'Discount removed' })
  @ApiResponse({ status: 403, description: 'Session token mismatch' })
  async removeDiscount(
    @Param('cartId') cartId: string,
    @Param('code') code: string,
    @Headers('x-session-token') sessionToken: string,
    @Headers('x-company-id') companyId: string,
  ) {
    await this.validateCartOwnership(cartId, sessionToken, companyId);
    return this.cartService.removeDiscount(cartId, code);
  }

  @Patch(':cartId/shipping')
  @ApiOperation({ summary: 'Update shipping info for estimation' })
  @ApiHeader({ name: 'x-session-token', description: 'Cart session token', required: true })
  @ApiHeader({ name: 'x-company-id', description: 'Company ID', required: true })
  @ApiResponse({ status: 200, description: 'Shipping updated' })
  @ApiResponse({ status: 403, description: 'Session token mismatch' })
  async updateShipping(
    @Param('cartId') cartId: string,
    @Headers('x-session-token') sessionToken: string,
    @Headers('x-company-id') companyId: string,
    @Body() dto: UpdateShippingDto,
  ) {
    await this.validateCartOwnership(cartId, sessionToken, companyId);
    return this.cartService.updateShippingAddress(cartId, {
      postalCode: dto.postalCode,
      country: dto.country,
    });
  }

  @Post(':cartId/shipping/estimate')
  @ApiOperation({ summary: 'Estimate shipping costs for cart' })
  @ApiHeader({ name: 'x-session-token', description: 'Cart session token', required: true })
  @ApiHeader({ name: 'x-company-id', description: 'Company ID', required: true })
  @ApiResponse({ status: 200, description: 'Shipping options returned' })
  @ApiResponse({ status: 403, description: 'Session token mismatch' })
  async estimateShipping(
    @Param('cartId') cartId: string,
    @Headers('x-session-token') sessionToken: string,
    @Headers('x-company-id') companyId: string,
    @Body() dto: EstimateShippingDto,
  ): Promise<ShippingEstimateResult> {
    await this.validateCartOwnership(cartId, sessionToken, companyId);

    const cart = await this.cartService.getCartById(cartId);

    if (cart.items.length === 0) {
      return {
        options: [],
        cheapestOption: null,
        fastestOption: null,
        freeShippingThreshold: null,
        amountToFreeShipping: null,
      };
    }

    return this.shippingService.calculateShipping({
      companyId,
      country: dto.country,
      state: dto.state,
      zipCode: dto.postalCode,
      cartSubtotal: new Decimal(cart.totals.subtotal),
      cartItems: cart.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        weight: item.productSnapshot?.weight ? new Decimal(item.productSnapshot.weight as number) : undefined,
        lineTotal: new Decimal(item.lineTotal),
      })),
    });
  }

  @Post(':cartId/shipping/select')
  @ApiOperation({ summary: 'Select a shipping method for the cart' })
  @ApiHeader({ name: 'x-session-token', description: 'Cart session token', required: true })
  @ApiHeader({ name: 'x-company-id', description: 'Company ID', required: true })
  @ApiResponse({ status: 200, description: 'Shipping method selected' })
  @ApiResponse({ status: 403, description: 'Session token mismatch' })
  async selectShippingMethod(
    @Param('cartId') cartId: string,
    @Headers('x-session-token') sessionToken: string,
    @Headers('x-company-id') companyId: string,
    @Body() dto: SelectShippingMethodDto,
  ) {
    await this.validateCartOwnership(cartId, sessionToken, companyId);
    return this.cartService.selectShippingMethod(cartId, dto.shippingMethodId);
  }

  @Post(':cartId/bundles')
  @ApiOperation({ summary: 'Add bundle to cart' })
  @ApiHeader({ name: 'x-session-token', description: 'Cart session token', required: true })
  @ApiHeader({ name: 'x-company-id', description: 'Company ID', required: true })
  @ApiResponse({ status: 201, description: 'Bundle added to cart' })
  @ApiResponse({ status: 403, description: 'Session token mismatch' })
  async addBundle(
    @Param('cartId') cartId: string,
    @Headers('x-session-token') sessionToken: string,
    @Headers('x-company-id') companyId: string,
    @Body() dto: AddBundleToCartDto,
  ) {
    await this.validateCartOwnership(cartId, sessionToken, companyId);
    return this.cartService.addBundleToCart(cartId, dto);
  }

  @Delete(':cartId/bundles/:bundleGroupId')
  @ApiOperation({ summary: 'Remove bundle from cart' })
  @ApiHeader({ name: 'x-session-token', description: 'Cart session token', required: true })
  @ApiHeader({ name: 'x-company-id', description: 'Company ID', required: true })
  @ApiResponse({ status: 200, description: 'Bundle removed' })
  @ApiResponse({ status: 403, description: 'Session token mismatch' })
  async removeBundle(
    @Param('cartId') cartId: string,
    @Param('bundleGroupId') bundleGroupId: string,
    @Headers('x-session-token') sessionToken: string,
    @Headers('x-company-id') companyId: string,
  ) {
    await this.validateCartOwnership(cartId, sessionToken, companyId);
    return this.cartService.removeBundleFromCart(cartId, bundleGroupId);
  }
}
