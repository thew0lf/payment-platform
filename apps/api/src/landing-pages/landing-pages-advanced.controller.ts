import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { HierarchyService } from '../hierarchy/hierarchy.service';
import { ABTestingService } from './services/ab-testing.service';
import { PopupsService } from './services/popups.service';
import { DynamicTextService } from './services/dynamic-text.service';
import { ConversionTrackingService } from './services/conversion-tracking.service';
import { StockImagesService } from './services/stock-images.service';
import { AIUsageService } from './services/ai-usage.service';
import { AIContentService, GeneratePageBriefRequest, RewriteSectionRequest, GenerateABVariantsRequest, GenerateSectionRequest } from './services/ai-content.service';
import { TemplateGalleryService } from './services/template-gallery.service';
import { SectionType, AIFeature, ScopeType } from '@prisma/client';
import {
  CreateABTestDto,
  UpdateABTestDto,
  CreateVariantDto,
  UpdateVariantDto,
  ABTestSummary,
  ABTestDetail,
  ABTestStats,
  CreatePopupDto,
  UpdatePopupDto,
  PopupSummary,
  PopupDetail,
  CreateDTRDto,
  UpdateDTRDto,
  DTRSummary,
  DTRDetail,
  CreateConversionGoalDto,
  UpdateConversionGoalDto,
  ConversionGoalSummary,
  ConversionGoalDetail,
  TrackConversionDto,
} from './types/ab-testing.types';

@Controller('landing-pages')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LandingPagesAdvancedController {
  constructor(
    private readonly hierarchyService: HierarchyService,
    private readonly abTestingService: ABTestingService,
    private readonly popupsService: PopupsService,
    private readonly dynamicTextService: DynamicTextService,
    private readonly conversionTrackingService: ConversionTrackingService,
    private readonly stockImagesService: StockImagesService,
    private readonly aiUsageService: AIUsageService,
    private readonly aiContentService: AIContentService,
    private readonly templateGalleryService: TemplateGalleryService,
  ) {}

  /**
   * Get companyId for READ operations.
   * For COMPANY scope users, uses their scopeId.
   * For ORGANIZATION/CLIENT scope users, validates access if companyId is passed.
   * Returns undefined for ORG/CLIENT users without companyId (allows cross-company queries).
   */
  private async getCompanyIdForQuery(
    user: AuthenticatedUser,
    queryCompanyId?: string,
  ): Promise<string | undefined> {
    // For COMPANY scope users, the scopeId IS the companyId - always filter by it
    if (user.scopeType === 'COMPANY') {
      return user.scopeId;
    }

    // If a specific companyId is requested, validate access
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
        throw new ForbiddenException('You don\'t have access to this company. Please check your permissions.');
      }
      return queryCompanyId;
    }

    // ORG/CLIENT users without specific companyId can see all accessible data
    return undefined;
  }

  /**
   * Get companyId for WRITE operations.
   * For COMPANY scope users, uses their scopeId.
   * For ORGANIZATION/CLIENT scope users, requires companyId to be passed and validates access.
   */
  private async getCompanyIdForWrite(
    user: AuthenticatedUser,
    requestedCompanyId?: string,
  ): Promise<string> {
    // For COMPANY scope users, the scopeId IS the companyId
    if (user.scopeType === 'COMPANY') {
      return user.scopeId;
    }

    // For users with explicit companyId set
    if (user.companyId) {
      return user.companyId;
    }

    // For ORGANIZATION or CLIENT scope admins, they must pass a companyId
    if (user.scopeType === 'ORGANIZATION' || user.scopeType === 'CLIENT') {
      if (!requestedCompanyId) {
        throw new ForbiddenException('Company selection required. Please select a company to continue.');
      }

      // Validate they have access to this company
      const hasAccess = await this.hierarchyService.canAccessCompany(
        {
          sub: user.id,
          scopeType: user.scopeType as ScopeType,
          scopeId: user.scopeId,
          clientId: user.clientId,
          companyId: user.companyId,
        },
        requestedCompanyId,
      );
      if (!hasAccess) {
        throw new ForbiddenException('You don\'t have access to this company. Please check your permissions.');
      }
      return requestedCompanyId;
    }

    throw new ForbiddenException('Unable to determine company context. Please select a company.');
  }

  // ═══════════════════════════════════════════════════════════════
  // A/B TESTING
  // ═══════════════════════════════════════════════════════════════

  @Get('ab-tests')
  async listABTests(
    @CurrentUser() user: AuthenticatedUser,
    @Query('pageId') pageId?: string,
    @Query('companyId') queryCompanyId?: string,
  ): Promise<ABTestSummary[]> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    return this.abTestingService.findAll(companyId, pageId);
  }

  @Get('ab-tests/:testId')
  async getABTest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('testId') testId: string,
    @Query('companyId') queryCompanyId?: string,
  ): Promise<ABTestDetail> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    return this.abTestingService.findOne(companyId, testId);
  }

  @Post(':pageId/ab-tests')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async createABTest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('pageId') pageId: string,
    @Body() dto: CreateABTestDto,
    @Query('companyId') queryCompanyId?: string,
  ): Promise<ABTestDetail> {
    const companyId = await this.getCompanyIdForWrite(user, queryCompanyId);
    return this.abTestingService.create(companyId, pageId, dto, user.id);
  }

  @Put('ab-tests/:testId')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async updateABTest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('testId') testId: string,
    @Body() dto: UpdateABTestDto,
    @Query('companyId') queryCompanyId?: string,
  ): Promise<ABTestDetail> {
    const companyId = await this.getCompanyIdForWrite(user, queryCompanyId);
    return this.abTestingService.update(companyId, testId, dto);
  }

  @Delete('ab-tests/:testId')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async deleteABTest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('testId') testId: string,
    @Query('companyId') queryCompanyId?: string,
  ): Promise<{ success: boolean }> {
    const companyId = await this.getCompanyIdForWrite(user, queryCompanyId);
    await this.abTestingService.delete(companyId, testId);
    return { success: true };
  }

  @Post('ab-tests/:testId/start')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async startABTest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('testId') testId: string,
    @Query('companyId') queryCompanyId?: string,
  ): Promise<ABTestDetail> {
    const companyId = await this.getCompanyIdForWrite(user, queryCompanyId);
    return this.abTestingService.update(companyId, testId, { status: 'RUNNING' as any });
  }

  @Post('ab-tests/:testId/pause')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async pauseABTest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('testId') testId: string,
    @Query('companyId') queryCompanyId?: string,
  ): Promise<ABTestDetail> {
    const companyId = await this.getCompanyIdForWrite(user, queryCompanyId);
    return this.abTestingService.update(companyId, testId, { status: 'PAUSED' as any });
  }

  @Get('ab-tests/:testId/stats')
  async getABTestStats(
    @CurrentUser() user: AuthenticatedUser,
    @Param('testId') testId: string,
    @Query('companyId') queryCompanyId?: string,
  ): Promise<ABTestStats[]> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    return this.abTestingService.getStats(companyId, testId);
  }

  @Post('ab-tests/:testId/declare-winner/:variantId')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async declareWinner(
    @CurrentUser() user: AuthenticatedUser,
    @Param('testId') testId: string,
    @Param('variantId') variantId: string,
    @Query('companyId') queryCompanyId?: string,
  ): Promise<ABTestDetail> {
    const companyId = await this.getCompanyIdForWrite(user, queryCompanyId);
    return this.abTestingService.declareWinner(companyId, testId, variantId);
  }

  // Variant Management
  @Post('ab-tests/:testId/variants')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async addVariant(
    @CurrentUser() user: AuthenticatedUser,
    @Param('testId') testId: string,
    @Body() dto: CreateVariantDto,
    @Query('companyId') queryCompanyId?: string,
  ): Promise<ABTestDetail> {
    const companyId = await this.getCompanyIdForWrite(user, queryCompanyId);
    return this.abTestingService.addVariant(companyId, testId, dto);
  }

  @Put('ab-tests/:testId/variants/:variantId')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async updateVariant(
    @CurrentUser() user: AuthenticatedUser,
    @Param('testId') testId: string,
    @Param('variantId') variantId: string,
    @Body() dto: UpdateVariantDto,
    @Query('companyId') queryCompanyId?: string,
  ): Promise<ABTestDetail> {
    const companyId = await this.getCompanyIdForWrite(user, queryCompanyId);
    return this.abTestingService.updateVariant(companyId, testId, variantId, dto);
  }

  @Delete('ab-tests/:testId/variants/:variantId')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async deleteVariant(
    @CurrentUser() user: AuthenticatedUser,
    @Param('testId') testId: string,
    @Param('variantId') variantId: string,
    @Query('companyId') queryCompanyId?: string,
  ): Promise<ABTestDetail> {
    const companyId = await this.getCompanyIdForWrite(user, queryCompanyId);
    return this.abTestingService.deleteVariant(companyId, testId, variantId);
  }

  // ═══════════════════════════════════════════════════════════════
  // POPUPS & STICKY BARS
  // ═══════════════════════════════════════════════════════════════

  @Get('popups')
  async listPopups(
    @CurrentUser() user: AuthenticatedUser,
    @Query('pageId') pageId?: string,
    @Query('companyId') queryCompanyId?: string,
  ): Promise<PopupSummary[]> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    return this.popupsService.findAll(companyId, pageId);
  }

  @Get('popups/:popupId')
  async getPopup(
    @CurrentUser() user: AuthenticatedUser,
    @Param('popupId') popupId: string,
    @Query('companyId') queryCompanyId?: string,
  ): Promise<PopupDetail> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    return this.popupsService.findOne(companyId, popupId);
  }

  @Post(':pageId/popups')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async createPopup(
    @CurrentUser() user: AuthenticatedUser,
    @Param('pageId') pageId: string,
    @Body() dto: CreatePopupDto,
    @Query('companyId') queryCompanyId?: string,
  ): Promise<PopupDetail> {
    const companyId = await this.getCompanyIdForWrite(user, queryCompanyId);
    return this.popupsService.create(companyId, pageId, dto, user.id);
  }

  @Put('popups/:popupId')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async updatePopup(
    @CurrentUser() user: AuthenticatedUser,
    @Param('popupId') popupId: string,
    @Body() dto: UpdatePopupDto,
    @Query('companyId') queryCompanyId?: string,
  ): Promise<PopupDetail> {
    const companyId = await this.getCompanyIdForWrite(user, queryCompanyId);
    return this.popupsService.update(companyId, popupId, dto);
  }

  @Delete('popups/:popupId')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async deletePopup(
    @CurrentUser() user: AuthenticatedUser,
    @Param('popupId') popupId: string,
    @Query('companyId') queryCompanyId?: string,
  ): Promise<{ success: boolean }> {
    const companyId = await this.getCompanyIdForWrite(user, queryCompanyId);
    await this.popupsService.delete(companyId, popupId);
    return { success: true };
  }

  @Post('popups/:popupId/activate')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async activatePopup(
    @CurrentUser() user: AuthenticatedUser,
    @Param('popupId') popupId: string,
    @Query('companyId') queryCompanyId?: string,
  ): Promise<PopupDetail> {
    const companyId = await this.getCompanyIdForWrite(user, queryCompanyId);
    return this.popupsService.activate(companyId, popupId);
  }

  @Post('popups/:popupId/pause')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async pausePopup(
    @CurrentUser() user: AuthenticatedUser,
    @Param('popupId') popupId: string,
    @Query('companyId') queryCompanyId?: string,
  ): Promise<PopupDetail> {
    const companyId = await this.getCompanyIdForWrite(user, queryCompanyId);
    return this.popupsService.pause(companyId, popupId);
  }

  // ═══════════════════════════════════════════════════════════════
  // DYNAMIC TEXT REPLACEMENT
  // ═══════════════════════════════════════════════════════════════

  @Get('dynamic-text-rules')
  async listDTRRules(
    @CurrentUser() user: AuthenticatedUser,
    @Query('pageId') pageId?: string,
    @Query('companyId') queryCompanyId?: string,
  ): Promise<DTRSummary[]> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    return this.dynamicTextService.findAll(companyId, pageId);
  }

  @Get('dynamic-text-rules/:ruleId')
  async getDTRRule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('ruleId') ruleId: string,
    @Query('companyId') queryCompanyId?: string,
  ): Promise<DTRDetail> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    return this.dynamicTextService.findOne(companyId, ruleId);
  }

  @Post(':pageId/dynamic-text-rules')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async createDTRRule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('pageId') pageId: string,
    @Body() dto: CreateDTRDto,
    @Query('companyId') queryCompanyId?: string,
  ): Promise<DTRDetail> {
    const companyId = await this.getCompanyIdForWrite(user, queryCompanyId);
    return this.dynamicTextService.create(companyId, pageId, dto);
  }

  @Put('dynamic-text-rules/:ruleId')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async updateDTRRule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('ruleId') ruleId: string,
    @Body() dto: UpdateDTRDto,
    @Query('companyId') queryCompanyId?: string,
  ): Promise<DTRDetail> {
    const companyId = await this.getCompanyIdForWrite(user, queryCompanyId);
    return this.dynamicTextService.update(companyId, ruleId, dto);
  }

  @Delete('dynamic-text-rules/:ruleId')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async deleteDTRRule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('ruleId') ruleId: string,
    @Query('companyId') queryCompanyId?: string,
  ): Promise<{ success: boolean }> {
    const companyId = await this.getCompanyIdForWrite(user, queryCompanyId);
    await this.dynamicTextService.delete(companyId, ruleId);
    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════════
  // CONVERSION TRACKING
  // ═══════════════════════════════════════════════════════════════

  @Get('conversion-goals')
  async listConversionGoals(
    @CurrentUser() user: AuthenticatedUser,
    @Query('pageId') pageId?: string,
    @Query('companyId') queryCompanyId?: string,
  ): Promise<ConversionGoalSummary[]> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    return this.conversionTrackingService.findAll(companyId, pageId);
  }

  @Get('conversion-goals/:goalId')
  async getConversionGoal(
    @CurrentUser() user: AuthenticatedUser,
    @Param('goalId') goalId: string,
    @Query('companyId') queryCompanyId?: string,
  ): Promise<ConversionGoalDetail> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    return this.conversionTrackingService.findOne(companyId, goalId);
  }

  @Post(':pageId/conversion-goals')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async createConversionGoal(
    @CurrentUser() user: AuthenticatedUser,
    @Param('pageId') pageId: string,
    @Body() dto: CreateConversionGoalDto,
    @Query('companyId') queryCompanyId?: string,
  ): Promise<ConversionGoalDetail> {
    const companyId = await this.getCompanyIdForWrite(user, queryCompanyId);
    return this.conversionTrackingService.create(companyId, pageId, dto);
  }

  @Put('conversion-goals/:goalId')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async updateConversionGoal(
    @CurrentUser() user: AuthenticatedUser,
    @Param('goalId') goalId: string,
    @Body() dto: UpdateConversionGoalDto,
    @Query('companyId') queryCompanyId?: string,
  ): Promise<ConversionGoalDetail> {
    const companyId = await this.getCompanyIdForWrite(user, queryCompanyId);
    return this.conversionTrackingService.update(companyId, goalId, dto);
  }

  @Delete('conversion-goals/:goalId')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async deleteConversionGoal(
    @CurrentUser() user: AuthenticatedUser,
    @Param('goalId') goalId: string,
    @Query('companyId') queryCompanyId?: string,
  ): Promise<{ success: boolean }> {
    const companyId = await this.getCompanyIdForWrite(user, queryCompanyId);
    await this.conversionTrackingService.delete(companyId, goalId);
    return { success: true };
  }

  @Get('conversion-goals/:goalId/events')
  async getConversionEvents(
    @CurrentUser() user: AuthenticatedUser,
    @Param('goalId') goalId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('companyId') queryCompanyId?: string,
  ) {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    return this.conversionTrackingService.getEvents(
      companyId,
      goalId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      limit ? parseInt(limit, 10) : 100,
    );
  }

  // Public tracking endpoint (no auth required)
  @Post('track/conversion')
  async trackConversion(@Body() dto: TrackConversionDto): Promise<{ success: boolean }> {
    const result = await this.conversionTrackingService.trackConversion(dto);
    return { success: result };
  }

  // ═══════════════════════════════════════════════════════════════
  // STOCK IMAGES (UNSPLASH)
  // ═══════════════════════════════════════════════════════════════

  @Get('stock-images/search')
  async searchStockImages(
    @Query('query') query: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
    @Query('orientation') orientation?: 'landscape' | 'portrait' | 'squarish',
    @Query('color') color?: string,
  ) {
    return this.stockImagesService.searchPhotos(
      query,
      page ? parseInt(page, 10) : 1,
      perPage ? parseInt(perPage, 10) : 20,
      orientation,
      color,
    );
  }

  @Get('stock-images/curated')
  async getCuratedImages(
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    return this.stockImagesService.getCuratedPhotos(
      page ? parseInt(page, 10) : 1,
      perPage ? parseInt(perPage, 10) : 20,
    );
  }

  @Get('stock-images/categories')
  getImageCategories() {
    return this.stockImagesService.getLandingPageCategories();
  }

  @Get('stock-images/categories/:categoryId')
  async getImagesByCategory(
    @Param('categoryId') categoryId: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
    @Query('orientation') orientation?: 'landscape' | 'portrait' | 'squarish',
  ) {
    return this.stockImagesService.getPhotosByCategory(
      categoryId,
      page ? parseInt(page, 10) : 1,
      perPage ? parseInt(perPage, 10) : 20,
      orientation,
    );
  }

  @Get('stock-images/collections')
  async getCollections(
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    return this.stockImagesService.getFeaturedCollections(
      page ? parseInt(page, 10) : 1,
      perPage ? parseInt(perPage, 10) : 10,
    );
  }

  @Get('stock-images/collections/:collectionId')
  async getCollectionPhotos(
    @Param('collectionId') collectionId: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    return this.stockImagesService.getCollectionPhotos(
      collectionId,
      page ? parseInt(page, 10) : 1,
      perPage ? parseInt(perPage, 10) : 20,
    );
  }

  @Get('stock-images/:photoId')
  async getPhoto(@Param('photoId') photoId: string) {
    return this.stockImagesService.getPhoto(photoId);
  }

  @Post('stock-images/:photoId/download')
  async trackPhotoDownload(@Param('photoId') photoId: string) {
    await this.stockImagesService.trackDownload(photoId);
    return { success: true };
  }

  @Get('stock-images/random')
  async getRandomPhoto(@Query('query') query?: string) {
    return this.stockImagesService.getRandomPhoto(query);
  }

  // ═══════════════════════════════════════════════════════════════
  // TEMPLATE GALLERY
  // ═══════════════════════════════════════════════════════════════

  @Get('gallery/templates')
  getTemplateGallery(
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('tags') tags?: string,
    @Query('sortBy') sortBy?: 'popularity' | 'name' | 'newest',
  ) {
    return this.templateGalleryService.getGallery({
      category,
      search,
      tags: tags?.split(','),
      sortBy,
    });
  }

  @Get('gallery/templates/popular')
  getPopularTemplates(@Query('limit') limit?: string) {
    return this.templateGalleryService.getPopularTemplates(
      limit ? parseInt(limit, 10) : 4
    );
  }

  @Get('gallery/templates/new')
  getNewTemplates() {
    return this.templateGalleryService.getNewTemplates();
  }

  @Get('gallery/templates/tags')
  getTemplateTags() {
    return { tags: this.templateGalleryService.getAllTags() };
  }

  @Get('gallery/templates/:templateId')
  getTemplateDetail(@Param('templateId') templateId: string) {
    const template = this.templateGalleryService.getTemplateDetail(templateId);
    if (!template) {
      throw new NotFoundException('We couldn\'t find that template. It may have been removed or the link is incorrect.');
    }
    return template;
  }

  @Get('gallery/templates/:templateId/sections')
  getTemplateSections(@Param('templateId') templateId: string) {
    const sections = this.templateGalleryService.getTemplateSections(templateId);
    if (!sections) {
      throw new NotFoundException('We couldn\'t find that template. It may have been removed or the link is incorrect.');
    }
    return { sections };
  }

  @Get('gallery/templates/:templateId/similar')
  getSimilarTemplates(
    @Param('templateId') templateId: string,
    @Query('limit') limit?: string,
  ) {
    return this.templateGalleryService.getSimilarTemplates(
      templateId,
      limit ? parseInt(limit, 10) : 3
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // AI CONTENT GENERATION
  // ═══════════════════════════════════════════════════════════════

  @Post('ai/generate-page')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async generatePageFromBrief(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GeneratePageBriefRequest,
    @Query('pageId') pageId?: string,
    @Query('companyId') queryCompanyId?: string,
  ) {
    const companyId = await this.getCompanyIdForWrite(user, queryCompanyId);
    return this.aiContentService.generatePageFromBrief(companyId, user.id, dto, pageId);
  }

  @Post('ai/rewrite-section')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async rewriteSection(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RewriteSectionRequest,
    @Query('pageId') pageId?: string,
    @Query('companyId') queryCompanyId?: string,
  ) {
    const companyId = await this.getCompanyIdForWrite(user, queryCompanyId);
    return this.aiContentService.rewriteSection(companyId, user.id, dto, pageId);
  }

  @Post('ai/generate-variants')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async generateABVariants(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GenerateABVariantsRequest,
    @Query('pageId') pageId?: string,
    @Query('companyId') queryCompanyId?: string,
  ) {
    const companyId = await this.getCompanyIdForWrite(user, queryCompanyId);
    const variants = await this.aiContentService.generateABVariants(companyId, user.id, dto, pageId);
    return { variants };
  }

  @Post('ai/generate-section')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async generateSection(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GenerateSectionRequest,
    @Query('pageId') pageId?: string,
    @Query('companyId') queryCompanyId?: string,
  ) {
    const companyId = await this.getCompanyIdForWrite(user, queryCompanyId);
    return this.aiContentService.generateSection(companyId, user.id, dto, pageId);
  }

  @Post('ai/generate-seo')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async generateSEO(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: { headline: string; subheadline?: string; businessName: string },
    @Query('pageId') pageId?: string,
    @Query('companyId') queryCompanyId?: string,
  ) {
    const companyId = await this.getCompanyIdForWrite(user, queryCompanyId);
    return this.aiContentService.generateSEO(companyId, user.id, dto, pageId);
  }

  // ═══════════════════════════════════════════════════════════════
  // AI USAGE TRACKING (For billing dashboard)
  // ═══════════════════════════════════════════════════════════════

  @Get('ai/usage')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async getAIUsage(
    @CurrentUser() user: AuthenticatedUser,
    @Query('companyId') queryCompanyId?: string,
  ) {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    return this.aiUsageService.getMonthlyUsage(companyId);
  }

  @Get('ai/usage/history')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async getAIUsageHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query('feature') feature?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('companyId') queryCompanyId?: string,
  ) {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    return this.aiUsageService.getUsageHistory(companyId, {
      feature: feature as AIFeature | undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }
}
