import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../auth/guards/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { ProductAIService } from '../services/product-ai.service';
import {
  GenerateDescriptionDto,
  SuggestCategoryDto,
  GenerateAltTextDto,
  CheckGrammarDto,
  ImproveDescriptionDto,
  ApplyAIContentDto,
} from '../dto/product-ai.dto';
import { ScopeType } from '@prisma/client';

// Helper to convert AuthenticatedUser to UserContext
function toUserContext(user: AuthenticatedUser) {
  return {
    sub: user.id,
    scopeType: user.scopeType as ScopeType,
    scopeId: user.scopeId,
    organizationId: user.organizationId,
    clientId: user.clientId,
    companyId: user.companyId,
  };
}

@Controller('products/ai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductAIController {
  constructor(private readonly aiService: ProductAIService) {}

  /**
   * Generate a product description using AI
   */
  @Post('generate-description')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  async generateDescription(
    @Body() dto: GenerateDescriptionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.aiService.generateDescription(dto, toUserContext(user));
  }

  /**
   * Suggest category and tags for a product
   */
  @Post('suggest-category')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  async suggestCategory(
    @Body() dto: SuggestCategoryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.aiService.suggestCategory(dto, toUserContext(user));
  }

  /**
   * Generate alt text for product images
   */
  @Post('generate-alt-text')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  async generateAltText(
    @Body() dto: GenerateAltTextDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const altText = await this.aiService.generateAltText(dto, toUserContext(user));
    return { altText };
  }

  /**
   * Check grammar in text
   */
  @Post('check-grammar')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER')
  @HttpCode(HttpStatus.OK)
  async checkGrammar(
    @Body() dto: CheckGrammarDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.aiService.checkGrammar(dto, toUserContext(user));
  }

  /**
   * Improve an existing product description
   */
  @Post('improve-description')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  async improveDescription(
    @Body() dto: ImproveDescriptionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.aiService.improveDescription(dto, toUserContext(user));
  }

  /**
   * Apply AI-generated content to a product
   */
  @Post(':productId/apply')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  async applyAIContent(
    @Param('productId') productId: string,
    @Body() dto: ApplyAIContentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.aiService.applyAIContent(productId, dto, toUserContext(user));
  }
}
