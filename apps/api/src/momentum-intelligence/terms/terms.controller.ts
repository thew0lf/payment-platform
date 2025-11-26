import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TermsService } from './terms.service';
import {
  TermsDocument,
  TermsSummary,
  TermsAcceptance,
  GeneratedTerms,
  CreateTermsDto,
  UpdateTermsDto,
  PublishTermsDto,
  GenerateSummaryDto,
  GenerateTermsDto,
  RecordAcceptanceDto,
  GetTermsDto,
  GetAcceptancesDto,
  TermsAnalyticsDto,
  TermsAnalytics,
  CustomerTermsView,
  TermsType,
} from '../types/terms.types';

@Controller('momentum/terms')
@UseGuards(JwtAuthGuard)
export class TermsController {
  constructor(private readonly termsService: TermsService) {}

  // ═══════════════════════════════════════════════════════════════
  // TERMS MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Create a new terms document
   */
  @Post()
  async createTerms(@Body() dto: CreateTermsDto): Promise<TermsDocument> {
    return this.termsService.createTerms(dto);
  }

  /**
   * Update an existing terms document
   */
  @Put(':termsId')
  async updateTerms(
    @Param('termsId') termsId: string,
    @Body() dto: Omit<UpdateTermsDto, 'termsId'>,
  ): Promise<TermsDocument> {
    return this.termsService.updateTerms({ termsId, ...dto });
  }

  /**
   * Publish terms document
   */
  @Post(':termsId/publish')
  async publishTerms(
    @Param('termsId') termsId: string,
    @Body() dto: Omit<PublishTermsDto, 'termsId'>,
  ): Promise<TermsDocument> {
    return this.termsService.publishTerms({ termsId, ...dto });
  }

  // ═══════════════════════════════════════════════════════════════
  // AI GENERATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Generate terms with AI
   */
  @Post('generate')
  async generateTerms(@Body() dto: GenerateTermsDto): Promise<GeneratedTerms> {
    return this.termsService.generateTermsWithAI({
      companyId: dto.companyId,
      ...dto.config,
    });
  }

  /**
   * Generate a summary for existing terms
   */
  @Post(':termsId/summary')
  async generateSummary(
    @Param('termsId') termsId: string,
    @Body() dto: Omit<GenerateSummaryDto, 'termsId'>,
  ): Promise<TermsSummary> {
    return this.termsService.generateSummary({ termsId, ...dto });
  }

  // ═══════════════════════════════════════════════════════════════
  // ACCEPTANCE
  // ═══════════════════════════════════════════════════════════════

  /**
   * Record terms acceptance
   */
  @Post('accept')
  async recordAcceptance(@Body() dto: RecordAcceptanceDto): Promise<TermsAcceptance> {
    return this.termsService.recordAcceptance(dto);
  }

  /**
   * Get acceptances
   */
  @Get('acceptances')
  async getAcceptances(@Query() dto: GetAcceptancesDto) {
    return this.termsService.getAcceptances(dto);
  }

  /**
   * Check if customer has accepted terms
   */
  @Get(':termsId/accepted/:customerId')
  async checkAcceptance(
    @Param('termsId') termsId: string,
    @Param('customerId') customerId: string,
  ): Promise<{ accepted: boolean }> {
    const accepted = await this.termsService.checkAcceptance(termsId, customerId);
    return { accepted };
  }

  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get terms documents with filters
   */
  @Get()
  async getTermsDocuments(@Query() dto: GetTermsDto) {
    return this.termsService.getTermsDocuments(dto);
  }

  /**
   * Get a specific terms document
   */
  @Get(':termsId')
  async getTermsDocument(@Param('termsId') termsId: string) {
    return this.termsService.getTermsDocument(termsId);
  }

  /**
   * Get active terms of a specific type
   */
  @Get('active/:companyId/:type')
  async getActiveTerms(
    @Param('companyId') companyId: string,
    @Param('type') type: TermsType,
  ): Promise<TermsDocument | null> {
    return this.termsService.getActiveTerms(companyId, type);
  }

  // ═══════════════════════════════════════════════════════════════
  // CUSTOMER-FACING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get customer-friendly terms view
   */
  @Get(':termsId/view')
  async getCustomerTermsView(
    @Param('termsId') termsId: string,
    @Query('customerId') customerId?: string,
  ): Promise<CustomerTermsView> {
    return this.termsService.getCustomerTermsView(termsId, customerId);
  }

  /**
   * Search terms content
   */
  @Get('search/:companyId')
  async searchTerms(
    @Param('companyId') companyId: string,
    @Query('q') query: string,
  ) {
    return this.termsService.searchTerms(query, companyId);
  }

  // ═══════════════════════════════════════════════════════════════
  // ANALYTICS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get terms analytics
   */
  @Get('analytics/:companyId')
  async getAnalytics(
    @Param('companyId') companyId: string,
    @Query() dto: Omit<TermsAnalyticsDto, 'companyId'>,
  ): Promise<TermsAnalytics> {
    return this.termsService.getAnalytics({ companyId, ...dto });
  }
}
