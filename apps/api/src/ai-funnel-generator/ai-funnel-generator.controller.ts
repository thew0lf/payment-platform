import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { FunnelGeneratorService } from './services/funnel-generator.service';
import { StartGenerationDto, SaveFunnelDto, RegenerateSectionDto } from './dto/funnel-generator.dto';
import { MarketingMethodology } from './types/funnel-generator.types';

@Controller('ai-funnel')
@UseGuards(JwtAuthGuard)
export class AIFunnelGeneratorController {
  constructor(private readonly generatorService: FunnelGeneratorService) {}

  /**
   * Get all available methodologies for the wizard
   */
  @Get('methodologies')
  getMethodologies() {
    const methodologies = this.generatorService.getMethodologies();
    return {
      methodologies: methodologies.map(m => ({
        id: m.id,
        name: m.name,
        tagline: m.tagline,
        description: m.description,
        bestFor: m.bestFor,
      })),
    };
  }

  /**
   * Get discovery questions for a specific methodology
   */
  @Get('methodologies/:id/questions')
  getMethodologyQuestions(@Param('id') methodologyId: MarketingMethodology) {
    return this.generatorService.getMethodologyQuestions(methodologyId);
  }

  /**
   * Start a new funnel generation
   */
  @Post('generate')
  async startGeneration(
    @Body() dto: StartGenerationDto,
    @Query('companyId') companyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const resolvedCompanyId = companyId || user.companyId;
    if (!resolvedCompanyId) {
      throw new Error('Company ID is required');
    }

    return this.generatorService.startGeneration({
      companyId: resolvedCompanyId,
      productIds: dto.productIds,
      primaryProductId: dto.primaryProductId,
      methodology: dto.methodology,
      discoveryAnswers: dto.discoveryAnswers,
      userId: user.id,
    });
  }

  /**
   * Get generation status and content
   */
  @Get('generations/:id')
  async getGeneration(
    @Param('id') generationId: string,
    @Query('companyId') companyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const resolvedCompanyId = companyId || user.companyId;
    if (!resolvedCompanyId) {
      throw new Error('Company ID is required');
    }

    return this.generatorService.getGeneration(generationId, resolvedCompanyId);
  }

  /**
   * Regenerate a specific section
   */
  @Post('generations/:id/regenerate')
  async regenerateSection(
    @Param('id') generationId: string,
    @Body() dto: RegenerateSectionDto,
    @Query('companyId') companyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const resolvedCompanyId = companyId || user.companyId;
    if (!resolvedCompanyId) {
      throw new Error('Company ID is required');
    }

    const newContent = await this.generatorService.regenerateSection(
      generationId,
      resolvedCompanyId,
      dto.section,
    );

    return { section: dto.section, content: newContent };
  }

  /**
   * Save generation as a funnel
   */
  @Post('generations/:id/save')
  async saveAsFunnel(
    @Param('id') generationId: string,
    @Body() dto: SaveFunnelDto,
    @Query('companyId') companyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const resolvedCompanyId = companyId || user.companyId;
    if (!resolvedCompanyId) {
      throw new Error('Company ID is required');
    }

    return this.generatorService.saveAsFunnel(
      generationId,
      resolvedCompanyId,
      dto.name,
      user.id,
      dto.content as any,
    );
  }

  /**
   * Discard a generation
   */
  @Delete('generations/:id')
  async discardGeneration(
    @Param('id') generationId: string,
    @Query('companyId') companyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const resolvedCompanyId = companyId || user.companyId;
    if (!resolvedCompanyId) {
      throw new Error('Company ID is required');
    }

    await this.generatorService.discardGeneration(generationId, resolvedCompanyId);
    return { success: true };
  }
}
