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
import { WishlistService } from '../services/wishlist.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import {
  AddToWishlistDto,
  UpdateWishlistDto,
  UpdateWishlistItemDto,
  ShareWishlistDto,
  WishlistQueryDto,
  CreateWishlistDto,
} from '../dto/wishlist.dto';

/**
 * Authenticated Wishlist Controller - for logged-in users
 */
@ApiTags('Wishlist')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user wishlist' })
  @ApiResponse({ status: 200, description: 'Wishlist retrieved' })
  async getWishlist(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: WishlistQueryDto,
  ) {
    const wishlist = await this.wishlistService.getWishlistByCustomerId(user.id, user.companyId);

    if (!wishlist) {
      return this.wishlistService.getOrCreateWishlist(user.companyId, {
        customerId: user.id,
        siteId: query.siteId,
      });
    }

    return wishlist;
  }

  @Post('items')
  @ApiOperation({ summary: 'Add item to wishlist' })
  @ApiResponse({ status: 201, description: 'Item added' })
  async addItem(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddToWishlistDto,
    @Query('siteId') siteId?: string,
  ) {
    const wishlist = await this.wishlistService.getOrCreateWishlist(user.companyId, {
      customerId: user.id,
      siteId,
    });

    return this.wishlistService.addItem(wishlist.id, dto, user.id);
  }

  @Patch('items/:itemId')
  @ApiOperation({ summary: 'Update wishlist item' })
  @ApiResponse({ status: 200, description: 'Item updated' })
  async updateItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateWishlistItemDto,
  ) {
    const wishlist = await this.wishlistService.getWishlistByCustomerId(user.id, user.companyId);

    if (!wishlist) {
      throw new NotFoundException('Wishlist not found');
    }

    return this.wishlistService.updateItem(wishlist.id, itemId, dto, user.id);
  }

  @Delete('items/:itemId')
  @ApiOperation({ summary: 'Remove item from wishlist' })
  @ApiResponse({ status: 200, description: 'Item removed' })
  async removeItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('itemId') itemId: string,
  ) {
    const wishlist = await this.wishlistService.getWishlistByCustomerId(user.id, user.companyId);

    if (!wishlist) {
      throw new NotFoundException('Wishlist not found');
    }

    return this.wishlistService.removeItem(wishlist.id, itemId, user.id);
  }

  @Patch()
  @ApiOperation({ summary: 'Update wishlist (name, isPublic)' })
  @ApiResponse({ status: 200, description: 'Wishlist updated' })
  async updateWishlist(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateWishlistDto,
  ) {
    const wishlist = await this.wishlistService.getWishlistByCustomerId(user.id, user.companyId);

    if (!wishlist) {
      throw new NotFoundException('Wishlist not found');
    }

    return this.wishlistService.updateWishlist(wishlist.id, dto, user.id);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear wishlist' })
  @ApiResponse({ status: 200, description: 'Wishlist cleared' })
  async clearWishlist(@CurrentUser() user: AuthenticatedUser) {
    const wishlist = await this.wishlistService.getWishlistByCustomerId(user.id, user.companyId);

    if (!wishlist) {
      throw new NotFoundException('Wishlist not found');
    }

    return this.wishlistService.clearWishlist(wishlist.id, user.id);
  }

  @Post('share')
  @ApiOperation({ summary: 'Toggle public sharing for wishlist' })
  @ApiResponse({ status: 200, description: 'Sharing status updated' })
  async toggleSharing(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ShareWishlistDto,
  ) {
    const wishlist = await this.wishlistService.getWishlistByCustomerId(user.id, user.companyId);

    if (!wishlist) {
      throw new NotFoundException('Wishlist not found');
    }

    return this.wishlistService.shareWishlist(wishlist.id, dto.isPublic, user.id);
  }

  @Post('merge')
  @ApiOperation({ summary: 'Merge guest wishlist into user wishlist' })
  @ApiResponse({ status: 200, description: 'Wishlists merged' })
  async mergeWishlists(
    @CurrentUser() user: AuthenticatedUser,
    @Body('sourceWishlistId') sourceWishlistId: string,
  ) {
    const userWishlist = await this.wishlistService.getOrCreateWishlist(user.companyId, {
      customerId: user.id,
    });

    return this.wishlistService.mergeWishlists(sourceWishlistId, userWishlist.id, user.id);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get wishlist statistics' })
  @ApiResponse({ status: 200, description: 'Stats retrieved' })
  async getStats(@CurrentUser() user: AuthenticatedUser) {
    const wishlist = await this.wishlistService.getWishlistByCustomerId(user.id, user.companyId);

    if (!wishlist) {
      return {
        totalItems: 0,
        totalValue: 0,
        oldestItemDate: null,
        newestItemDate: null,
      };
    }

    return this.wishlistService.getWishlistStats(wishlist.id);
  }
}

/**
 * Public Wishlist Controller - for anonymous users
 *
 * SECURITY: All wishlist operations require session token validation.
 * The session token in the header must match the wishlist's session token.
 */
@ApiTags('Public Wishlist')
@Controller('public/wishlist')
export class PublicWishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  /**
   * Validate that the provided session token matches the wishlist's session token
   */
  private async validateWishlistOwnership(
    wishlistId: string,
    sessionToken: string | undefined,
    companyId: string,
  ): Promise<void> {
    if (!sessionToken) {
      throw new ForbiddenException('Session token required for wishlist operations');
    }

    const wishlist = await this.wishlistService.getWishlistById(wishlistId);

    if (wishlist.companyId !== companyId) {
      throw new ForbiddenException('Access denied to this wishlist');
    }

    if (wishlist.sessionToken !== sessionToken) {
      throw new ForbiddenException('Session token mismatch - access denied');
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get wishlist by session token' })
  @ApiHeader({ name: 'x-session-token', description: 'Wishlist session token' })
  @ApiHeader({ name: 'x-company-id', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Wishlist retrieved' })
  async getWishlist(
    @Headers('x-session-token') sessionToken: string,
    @Headers('x-company-id') companyId: string,
  ) {
    if (!sessionToken || !companyId) {
      return { items: [], itemCount: 0 };
    }

    const wishlist = await this.wishlistService.getWishlistBySessionToken(sessionToken, companyId);
    return wishlist || { items: [], itemCount: 0 };
  }

  @Post()
  @ApiOperation({ summary: 'Create new anonymous wishlist' })
  @ApiHeader({ name: 'x-company-id', description: 'Company ID' })
  @ApiResponse({ status: 201, description: 'Wishlist created' })
  async createWishlist(
    @Headers('x-company-id') companyId: string,
    @Body() dto: CreateWishlistDto,
  ) {
    return this.wishlistService.getOrCreateWishlist(companyId, {
      siteId: dto.siteId,
      name: dto.name,
      isPublic: dto.isPublic,
    });
  }

  @Post(':wishlistId/items')
  @ApiOperation({ summary: 'Add item to wishlist' })
  @ApiHeader({ name: 'x-session-token', description: 'Wishlist session token', required: true })
  @ApiHeader({ name: 'x-company-id', description: 'Company ID', required: true })
  @ApiResponse({ status: 201, description: 'Item added' })
  @ApiResponse({ status: 403, description: 'Session token mismatch' })
  async addItem(
    @Param('wishlistId') wishlistId: string,
    @Headers('x-session-token') sessionToken: string,
    @Headers('x-company-id') companyId: string,
    @Body() dto: AddToWishlistDto,
  ) {
    await this.validateWishlistOwnership(wishlistId, sessionToken, companyId);
    return this.wishlistService.addItem(wishlistId, dto);
  }

  @Patch(':wishlistId/items/:itemId')
  @ApiOperation({ summary: 'Update wishlist item' })
  @ApiHeader({ name: 'x-session-token', description: 'Wishlist session token', required: true })
  @ApiHeader({ name: 'x-company-id', description: 'Company ID', required: true })
  @ApiResponse({ status: 200, description: 'Item updated' })
  @ApiResponse({ status: 403, description: 'Session token mismatch' })
  async updateItem(
    @Param('wishlistId') wishlistId: string,
    @Param('itemId') itemId: string,
    @Headers('x-session-token') sessionToken: string,
    @Headers('x-company-id') companyId: string,
    @Body() dto: UpdateWishlistItemDto,
  ) {
    await this.validateWishlistOwnership(wishlistId, sessionToken, companyId);
    return this.wishlistService.updateItem(wishlistId, itemId, dto);
  }

  @Delete(':wishlistId/items/:itemId')
  @ApiOperation({ summary: 'Remove item from wishlist' })
  @ApiHeader({ name: 'x-session-token', description: 'Wishlist session token', required: true })
  @ApiHeader({ name: 'x-company-id', description: 'Company ID', required: true })
  @ApiResponse({ status: 200, description: 'Item removed' })
  @ApiResponse({ status: 403, description: 'Session token mismatch' })
  async removeItem(
    @Param('wishlistId') wishlistId: string,
    @Param('itemId') itemId: string,
    @Headers('x-session-token') sessionToken: string,
    @Headers('x-company-id') companyId: string,
  ) {
    await this.validateWishlistOwnership(wishlistId, sessionToken, companyId);
    return this.wishlistService.removeItem(wishlistId, itemId);
  }

  @Get('shared/:sharedUrl')
  @ApiOperation({ summary: 'Get public wishlist by shared URL' })
  @ApiResponse({ status: 200, description: 'Public wishlist retrieved' })
  @ApiResponse({ status: 404, description: 'Wishlist not found or not public' })
  async getSharedWishlist(@Param('sharedUrl') sharedUrl: string) {
    const wishlist = await this.wishlistService.getWishlistBySharedUrl(sharedUrl);

    if (!wishlist) {
      throw new NotFoundException('Wishlist not found or not publicly shared');
    }

    if (!wishlist.isPublic) {
      throw new NotFoundException('Wishlist not found or not publicly shared');
    }

    return wishlist;
  }
}
