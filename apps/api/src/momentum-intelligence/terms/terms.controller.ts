import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ScopeType } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { HierarchyService } from '../../hierarchy/hierarchy.service';
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
  constructor(
    private readonly termsService: TermsService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════

  private async getCompanyId(
    user: AuthenticatedUser,
    queryCompanyId?: string,
  ): Promise<string> {
    // COMPANY scoped users use their own company
    if (user.scopeType === 'COMPANY') {
      return user.scopeId;
    }

    // Use companyId from user context if available
    if (user.companyId) {
      return user.companyId;
    }

    // CLIENT/ORG users need to specify or have access
    if (queryCompanyId) {
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
        throw new ForbiddenException(
          "Hmm, you don't have access to that company. Double-check your permissions or try a different one.",
        );
      }
      return queryCompanyId;
    }

    throw new BadRequestException(
      'Company ID is required. Please select a company or provide companyId parameter.',
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // TERMS MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Create a new terms document
   */
  @Post()
  async createTerms(
    @Body() dto: CreateTermsDto,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TermsDocument> {
    const companyId = await this.getCompanyId(user, queryCompanyId || dto.companyId);
    return this.termsService.createTerms({ ...dto, companyId });
  }

  /**
   * Update an existing terms document
   */
  @Put(':termsId')
  async updateTerms(
    @Param('termsId') termsId: string,
    @Body() dto: Omit<UpdateTermsDto, 'termsId'>,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TermsDocument> {
    // Validate company access
    await this.getCompanyId(user, queryCompanyId);
    return this.termsService.updateTerms({ termsId, ...dto });
  }

  /**
   * Publish terms document
   */
  @Post(':termsId/publish')
  async publishTerms(
    @Param('termsId') termsId: string,
    @Body() dto: Omit<PublishTermsDto, 'termsId'>,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TermsDocument> {
    // Validate company access
    await this.getCompanyId(user, queryCompanyId);
    return this.termsService.publishTerms({ termsId, ...dto });
  }

  // ═══════════════════════════════════════════════════════════════
  // AI GENERATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Generate terms with AI
   */
  @Post('generate')
  async generateTerms(
    @Body() dto: GenerateTermsDto,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<GeneratedTerms> {
    const companyId = await this.getCompanyId(user, queryCompanyId || dto.companyId);
    return this.termsService.generateTermsWithAI({
      companyId,
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
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TermsSummary> {
    // Validate company access
    await this.getCompanyId(user, queryCompanyId);
    return this.termsService.generateSummary({ termsId, ...dto });
  }

  // ═══════════════════════════════════════════════════════════════
  // ACCEPTANCE
  // ═══════════════════════════════════════════════════════════════

  /**
   * Record terms acceptance
   */
  @Post('accept')
  async recordAcceptance(
    @Body() dto: RecordAcceptanceDto,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TermsAcceptance> {
    // Validate company access
    await this.getCompanyId(user, queryCompanyId);
    return this.termsService.recordAcceptance(dto);
  }

  /**
   * Get acceptances
   */
  @Get('acceptances')
  async getAcceptances(
    @Query() dto: GetAcceptancesDto & { companyId?: string },
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId || dto.companyId);
    return this.termsService.getAcceptances({ ...dto, companyId } as any);
  }

  /**
   * Check if customer has accepted terms
   */
  @Get(':termsId/accepted/:customerId')
  async checkAcceptance(
    @Param('termsId') termsId: string,
    @Param('customerId') customerId: string,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ accepted: boolean }> {
    // Validate company access
    await this.getCompanyId(user, queryCompanyId);
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
  async getTermsDocuments(
    @Query() dto: GetTermsDto,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId || dto.companyId);
    return this.termsService.getTermsDocuments({ ...dto, companyId });
  }

  /**
   * Get a specific terms document
   */
  @Get(':termsId')
  async getTermsDocument(
    @Param('termsId') termsId: string,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Validate company access
    await this.getCompanyId(user, queryCompanyId);
    return this.termsService.getTermsDocument(termsId);
  }

  /**
   * Get active terms of a specific type
   */
  @Get('active/:companyId/:type')
  async getActiveTerms(
    @Param('companyId') paramCompanyId: string,
    @Param('type') type: TermsType,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TermsDocument | null> {
    const companyId = await this.getCompanyId(user, queryCompanyId || paramCompanyId);
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
    @Query('customerId') customerId: string,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CustomerTermsView> {
    // Validate company access
    await this.getCompanyId(user, queryCompanyId);
    return this.termsService.getCustomerTermsView(termsId, customerId);
  }

  /**
   * Search terms content
   */
  @Get('search/:companyId')
  async searchTerms(
    @Param('companyId') paramCompanyId: string,
    @Query('q') query: string,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId || paramCompanyId);
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
    @Param('companyId') paramCompanyId: string,
    @Query('companyId') queryCompanyId: string,
    @Query() dto: Omit<TermsAnalyticsDto, 'companyId'>,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TermsAnalytics> {
    const companyId = await this.getCompanyId(user, queryCompanyId || paramCompanyId);
    return this.termsService.getAnalytics({ companyId, ...dto });
  }
}
