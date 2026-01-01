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
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { ComparisonService } from '../services/comparison.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import {
  CreateComparisonDto,
  AddToComparisonDto,
  ReorderItemsDto,
  ShareComparisonDto,
  UpdateComparisonDto,
  ComparisonQueryDto,
  MergeComparisonsDto,
} from '../dto/comparison.dto';
import { MAX_COMPARISON_ITEMS } from '../types/comparison.types';

/**
 * Authenticated Comparison Controller - for logged-in users
 */
@ApiTags('Comparison')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('comparison')
export class ComparisonController {
  constructor(private readonly comparisonService: ComparisonService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user comparison' })
  @ApiResponse({ status: 200, description: 'Comparison retrieved' })
  async getComparison(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ComparisonQueryDto,
  ) {
    const comparison = await this.comparisonService.getComparisonByCustomerId(
      user.id,
      user.companyId,
    );

    if (!comparison) {
      return this.comparisonService.getOrCreateComparison(user.companyId, {
        customerId: user.id,
        siteId: query.siteId,
      });
    }

    return comparison;
  }

  @Post('items')
  @ApiOperation({ summary: 'Add item to comparison' })
  @ApiResponse({ status: 201, description: 'Item added' })
  @ApiResponse({ status: 400, description: 'Maximum items limit reached' })
  async addItem(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddToComparisonDto,
    @Query('siteId') siteId?: string,
  ) {
    const comparison = await this.comparisonService.getOrCreateComparison(user.companyId, {
      customerId: user.id,
      siteId,
    });

    // Check maximum items limit
    if (comparison.items && comparison.items.length >= MAX_COMPARISON_ITEMS) {
      throw new BadRequestException(
        `Maximum of ${MAX_COMPARISON_ITEMS} items allowed in comparison`,
      );
    }

    return this.comparisonService.addItem(comparison.id, dto, user.id);
  }

  @Delete('items/:itemId')
  @ApiOperation({ summary: 'Remove item from comparison' })
  @ApiResponse({ status: 200, description: 'Item removed' })
  @ApiResponse({ status: 404, description: 'Comparison not found' })
  async removeItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('itemId') itemId: string,
  ) {
    const comparison = await this.comparisonService.getComparisonByCustomerId(
      user.id,
      user.companyId,
    );

    if (!comparison) {
      throw new NotFoundException('Comparison not found');
    }

    return this.comparisonService.removeItem(comparison.id, itemId, user.id);
  }

  @Post('reorder')
  @ApiOperation({ summary: 'Reorder items in comparison' })
  @ApiResponse({ status: 200, description: 'Items reordered' })
  @ApiResponse({ status: 404, description: 'Comparison not found' })
  async reorderItems(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReorderItemsDto,
  ) {
    const comparison = await this.comparisonService.getComparisonByCustomerId(
      user.id,
      user.companyId,
    );

    if (!comparison) {
      throw new NotFoundException('Comparison not found');
    }

    return this.comparisonService.reorderItems(comparison.id, dto, user.id);
  }

  @Patch()
  @ApiOperation({ summary: 'Update comparison metadata' })
  @ApiResponse({ status: 200, description: 'Comparison updated' })
  @ApiResponse({ status: 404, description: 'Comparison not found' })
  async updateComparison(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateComparisonDto,
  ) {
    const comparison = await this.comparisonService.getComparisonByCustomerId(
      user.id,
      user.companyId,
    );

    if (!comparison) {
      throw new NotFoundException('Comparison not found');
    }

    return this.comparisonService.updateComparison(comparison.id, dto, user.id);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear comparison' })
  @ApiResponse({ status: 200, description: 'Comparison cleared' })
  @ApiResponse({ status: 404, description: 'Comparison not found' })
  async clearComparison(@CurrentUser() user: AuthenticatedUser) {
    const comparison = await this.comparisonService.getComparisonByCustomerId(
      user.id,
      user.companyId,
    );

    if (!comparison) {
      throw new NotFoundException('Comparison not found');
    }

    return this.comparisonService.clearComparison(comparison.id, user.id);
  }

  @Post('share')
  @ApiOperation({ summary: 'Create share link for comparison' })
  @ApiResponse({ status: 201, description: 'Share link created' })
  @ApiResponse({ status: 404, description: 'Comparison not found' })
  async shareComparison(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ShareComparisonDto,
  ) {
    const comparison = await this.comparisonService.getComparisonByCustomerId(
      user.id,
      user.companyId,
    );

    if (!comparison) {
      throw new NotFoundException('Comparison not found');
    }

    return this.comparisonService.shareComparison(comparison.id, dto, user.id);
  }

  @Delete('share')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove share link from comparison' })
  @ApiResponse({ status: 200, description: 'Share link removed' })
  @ApiResponse({ status: 404, description: 'Comparison not found' })
  async unshareComparison(@CurrentUser() user: AuthenticatedUser) {
    const comparison = await this.comparisonService.getComparisonByCustomerId(
      user.id,
      user.companyId,
    );

    if (!comparison) {
      throw new NotFoundException('Comparison not found');
    }

    return this.comparisonService.unshareComparison(comparison.id, user.id);
  }

  @Post('merge')
  @ApiOperation({ summary: 'Merge guest comparison into user comparison' })
  @ApiResponse({ status: 200, description: 'Comparisons merged' })
  async mergeComparisons(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: MergeComparisonsDto,
  ) {
    const userComparison = await this.comparisonService.getOrCreateComparison(user.companyId, {
      customerId: user.id,
    });

    return this.comparisonService.mergeComparisons(
      dto.sourceComparisonId,
      userComparison.id,
      user.id,
    );
  }
}

/**
 * Public Comparison Controller - for anonymous users
 *
 * SECURITY: All comparison operations require session token validation.
 * The session token in the header must match the comparison's session token.
 */
@ApiTags('Public Comparison')
@Controller('public/comparison')
export class PublicComparisonController {
  constructor(private readonly comparisonService: ComparisonService) {}

  /**
   * Validate that the provided session token matches the comparison's session token
   */
  private async validateComparisonOwnership(
    comparisonId: string,
    sessionToken: string | undefined,
    companyId: string,
  ): Promise<void> {
    if (!sessionToken) {
      throw new ForbiddenException('Session token required for comparison operations');
    }

    const comparison = await this.comparisonService.getComparisonById(comparisonId);

    if (!comparison) {
      throw new NotFoundException('Comparison not found');
    }

    if (comparison.companyId !== companyId) {
      throw new ForbiddenException('Access denied to this comparison');
    }

    if (comparison.sessionToken !== sessionToken) {
      throw new ForbiddenException('Session token mismatch - access denied');
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get comparison by session token' })
  @ApiHeader({ name: 'x-session-token', description: 'Comparison session token' })
  @ApiHeader({ name: 'x-company-id', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Comparison retrieved' })
  async getComparison(
    @Headers('x-session-token') sessionToken: string,
    @Headers('x-company-id') companyId: string,
  ) {
    if (!sessionToken || !companyId) {
      return { items: [], isShared: false };
    }

    const comparison = await this.comparisonService.getComparisonBySessionToken(
      sessionToken,
      companyId,
    );
    return comparison || { items: [], isShared: false };
  }

  @Post()
  @ApiOperation({ summary: 'Create new anonymous comparison' })
  @ApiHeader({ name: 'x-company-id', description: 'Company ID' })
  @ApiResponse({ status: 201, description: 'Comparison created' })
  async createComparison(
    @Headers('x-company-id') companyId: string,
    @Body() dto: CreateComparisonDto,
  ) {
    if (!companyId) {
      throw new BadRequestException('Company ID is required');
    }

    return this.comparisonService.getOrCreateComparison(companyId, {
      siteId: dto.siteId,
      visitorId: dto.visitorId,
      name: dto.name,
    });
  }

  @Post(':comparisonId/items')
  @ApiOperation({ summary: 'Add item to comparison' })
  @ApiHeader({ name: 'x-session-token', description: 'Comparison session token', required: true })
  @ApiHeader({ name: 'x-company-id', description: 'Company ID', required: true })
  @ApiResponse({ status: 201, description: 'Item added' })
  @ApiResponse({ status: 400, description: 'Maximum items limit reached' })
  @ApiResponse({ status: 403, description: 'Session token mismatch' })
  async addItem(
    @Param('comparisonId') comparisonId: string,
    @Headers('x-session-token') sessionToken: string,
    @Headers('x-company-id') companyId: string,
    @Body() dto: AddToComparisonDto,
  ) {
    await this.validateComparisonOwnership(comparisonId, sessionToken, companyId);

    // Check maximum items limit
    const comparison = await this.comparisonService.getComparisonById(comparisonId);
    if (comparison.items && comparison.items.length >= MAX_COMPARISON_ITEMS) {
      throw new BadRequestException(
        `Maximum of ${MAX_COMPARISON_ITEMS} items allowed in comparison`,
      );
    }

    return this.comparisonService.addItem(comparisonId, dto);
  }

  @Delete(':comparisonId/items/:itemId')
  @ApiOperation({ summary: 'Remove item from comparison' })
  @ApiHeader({ name: 'x-session-token', description: 'Comparison session token', required: true })
  @ApiHeader({ name: 'x-company-id', description: 'Company ID', required: true })
  @ApiResponse({ status: 200, description: 'Item removed' })
  @ApiResponse({ status: 403, description: 'Session token mismatch' })
  async removeItem(
    @Param('comparisonId') comparisonId: string,
    @Param('itemId') itemId: string,
    @Headers('x-session-token') sessionToken: string,
    @Headers('x-company-id') companyId: string,
  ) {
    await this.validateComparisonOwnership(comparisonId, sessionToken, companyId);
    return this.comparisonService.removeItem(comparisonId, itemId);
  }

  @Post(':comparisonId/reorder')
  @ApiOperation({ summary: 'Reorder items in comparison' })
  @ApiHeader({ name: 'x-session-token', description: 'Comparison session token', required: true })
  @ApiHeader({ name: 'x-company-id', description: 'Company ID', required: true })
  @ApiResponse({ status: 200, description: 'Items reordered' })
  @ApiResponse({ status: 403, description: 'Session token mismatch' })
  async reorderItems(
    @Param('comparisonId') comparisonId: string,
    @Headers('x-session-token') sessionToken: string,
    @Headers('x-company-id') companyId: string,
    @Body() dto: ReorderItemsDto,
  ) {
    await this.validateComparisonOwnership(comparisonId, sessionToken, companyId);
    return this.comparisonService.reorderItems(comparisonId, dto);
  }

  @Get('shared/:shareToken')
  @ApiOperation({ summary: 'Get shared comparison by share token' })
  @ApiResponse({ status: 200, description: 'Shared comparison retrieved' })
  @ApiResponse({ status: 404, description: 'Shared comparison not found or expired' })
  async getSharedComparison(@Param('shareToken') shareToken: string) {
    const comparison = await this.comparisonService.getComparisonByShareToken(shareToken);

    if (!comparison) {
      throw new NotFoundException('Shared comparison not found or has expired');
    }

    return comparison;
  }
}
