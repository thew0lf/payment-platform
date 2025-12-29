import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
  ForbiddenException,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { ThrottlerGuard, SkipThrottle } from '@nestjs/throttler';
import { Observable, map, catchError, of } from 'rxjs';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { HierarchyService, UserContext } from '../../hierarchy/hierarchy.service';
import { ScopeType } from '@prisma/client';
import { ProductImportService } from '../services/product-import.service';
import { ImportEventService } from '../services/import-event.service';
import {
  CreateImportJobDto,
  PreviewImportDto,
  CreateFieldMappingProfileDto,
  UpdateFieldMappingProfileDto,
  ListImportJobsQueryDto,
} from '../dto/product-import.dto';

@Controller('product-import')
@UseGuards(JwtAuthGuard, ThrottlerGuard)
export class ProductImportController {
  constructor(
    private readonly productImportService: ProductImportService,
    private readonly importEventService: ImportEventService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // RBAC HELPER METHODS (SOC2/ISO27001 Compliance)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Convert AuthenticatedUser to UserContext for HierarchyService
   */
  private toUserContext(user: AuthenticatedUser): UserContext {
    return {
      sub: user.id,
      scopeType: user.scopeType as ScopeType,
      scopeId: user.scopeId,
      organizationId: user.organizationId,
      clientId: user.clientId,
      companyId: user.companyId,
    };
  }

  /**
   * Get company ID for WRITE operations (create, update, delete)
   * Validates user has access and requires company context
   */
  private async getCompanyIdForWrite(
    user: AuthenticatedUser,
    queryCompanyId?: string,
  ): Promise<string> {
    // COMPANY-scoped users ALWAYS use their own company - ignore query param
    if (user.scopeType === 'COMPANY' || user.scopeType === 'DEPARTMENT' || user.scopeType === 'TEAM') {
      if (!user.companyId) {
        throw new BadRequestException('Company context required for this operation');
      }
      return user.companyId;
    }

    // ORG/CLIENT users must specify a company
    const companyId = queryCompanyId || user.companyId;
    if (!companyId) {
      throw new BadRequestException('Company ID is required');
    }

    // Validate access to the specified company
    const canAccess = await this.hierarchyService.canAccessCompany(
      this.toUserContext(user),
      companyId,
    );
    if (!canAccess) {
      throw new ForbiddenException('Access denied to this company');
    }

    return companyId;
  }

  /**
   * Get company ID for READ operations
   * Validates access when company is specified
   */
  private async getCompanyIdForRead(
    user: AuthenticatedUser,
    queryCompanyId?: string,
  ): Promise<string> {
    // COMPANY-scoped users ALWAYS filtered by their company
    if (user.scopeType === 'COMPANY' || user.scopeType === 'DEPARTMENT' || user.scopeType === 'TEAM') {
      if (!user.companyId) {
        throw new BadRequestException('Company context required');
      }
      return user.companyId;
    }

    // ORG/CLIENT users need a company specified for product import operations
    const companyId = queryCompanyId || user.companyId;
    if (!companyId) {
      throw new BadRequestException('Company ID is required');
    }

    // Validate access
    const canAccess = await this.hierarchyService.canAccessCompany(
      this.toUserContext(user),
      companyId,
    );
    if (!canAccess) {
      throw new ForbiddenException('Access denied to this company');
    }

    return companyId;
  }

  // ═══════════════════════════════════════════════════════════════
  // IMPORT JOB ENDPOINTS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Create a new product import job
   * @route POST /api/product-import/jobs
   */
  @Post('jobs')
  async createImportJob(
    @Body() dto: CreateImportJobDto,
    @Query('companyId') companyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Validate RBAC access to company
    const resolvedCompanyId = await this.getCompanyIdForWrite(user, companyId);

    if (!user.clientId) {
      throw new BadRequestException('User must belong to a client to import products');
    }

    return this.productImportService.createImportJob(
      dto,
      resolvedCompanyId,
      user.clientId,
      user.id,
    );
  }

  /**
   * Preview products before import
   * @route POST /api/product-import/preview
   */
  @Post('preview')
  @SkipThrottle()
  async previewImport(
    @Body() dto: PreviewImportDto,
    @Query('companyId') companyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Validate RBAC access to company
    const resolvedCompanyId = await this.getCompanyIdForRead(user, companyId);

    if (!user.clientId) {
      throw new BadRequestException('User must belong to a client to preview products');
    }

    return this.productImportService.previewImport(dto, resolvedCompanyId, user.clientId);
  }

  /**
   * List import jobs for a company
   * @route GET /api/product-import/jobs
   */
  @Get('jobs')
  async listImportJobs(
    @Query() query: ListImportJobsQueryDto,
    @Query('companyId') companyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Validate RBAC access to company
    const resolvedCompanyId = await this.getCompanyIdForRead(user, companyId);

    return this.productImportService.listImportJobs(resolvedCompanyId, query);
  }

  /**
   * Get import job details
   * @route GET /api/product-import/jobs/:jobId
   */
  @Get('jobs/:jobId')
  async getImportJob(
    @Param('jobId') jobId: string,
    @Query('companyId') companyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Validate RBAC access to company
    const resolvedCompanyId = await this.getCompanyIdForRead(user, companyId);

    return this.productImportService.getImportJob(jobId, resolvedCompanyId);
  }

  /**
   * Cancel a running import job
   * @route POST /api/product-import/jobs/:jobId/cancel
   */
  @Post('jobs/:jobId/cancel')
  async cancelImportJob(
    @Param('jobId') jobId: string,
    @Query('companyId') companyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Validate RBAC access to company (write operation)
    const resolvedCompanyId = await this.getCompanyIdForWrite(user, companyId);

    return this.productImportService.cancelImportJob(jobId, resolvedCompanyId);
  }

  /**
   * Retry a failed import job
   * @route POST /api/product-import/jobs/:jobId/retry
   */
  @Post('jobs/:jobId/retry')
  async retryImportJob(
    @Param('jobId') jobId: string,
    @Query('companyId') companyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Validate RBAC access to company (write operation)
    const resolvedCompanyId = await this.getCompanyIdForWrite(user, companyId);

    return this.productImportService.retryImportJob(jobId, resolvedCompanyId, user.id);
  }

  // ═══════════════════════════════════════════════════════════════
  // REAL-TIME PROGRESS (SSE)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Subscribe to real-time import job progress via Server-Sent Events
   * Note: SSE endpoint validation is synchronous, so we do basic checks here
   * and rely on service-level validation for the actual job access
   * @route GET /api/product-import/jobs/:jobId/events
   */
  @Sse('jobs/:jobId/events')
  subscribeToJobEvents(
    @Param('jobId') jobId: string,
    @Query('companyId') companyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Observable<MessageEvent> {
    // Determine company ID based on user scope
    let resolvedCompanyId: string;

    if (user.scopeType === 'COMPANY' || user.scopeType === 'DEPARTMENT' || user.scopeType === 'TEAM') {
      // COMPANY-scoped users can only access their own company's events
      if (!user.companyId) {
        throw new BadRequestException('Company context required');
      }
      resolvedCompanyId = user.companyId;
    } else {
      // ORG/CLIENT users - require companyId and validate async via service
      resolvedCompanyId = companyId || user.companyId || '';
      if (!resolvedCompanyId) {
        throw new BadRequestException('Company ID is required');
      }
    }

    // Note: Full RBAC validation happens in the service/event subscription
    // The subscribeToJob method will only return events for jobs belonging to the company
    return this.importEventService.subscribeToJob(jobId, resolvedCompanyId).pipe(
      map((event) => ({
        data: event,
        type: event.type,
        id: `${event.jobId}-${event.timestamp.getTime()}`,
      } as MessageEvent)),
      catchError((error) => {
        return of({
          data: { error: error.message || 'Stream error' },
          type: 'error',
        } as MessageEvent);
      }),
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // FIELD MAPPING PROFILE ENDPOINTS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Create a new field mapping profile
   * @route POST /api/product-import/field-mappings
   */
  @Post('field-mappings')
  async createFieldMappingProfile(
    @Body() dto: CreateFieldMappingProfileDto,
    @Query('companyId') companyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Validate RBAC access to company (write operation)
    const resolvedCompanyId = await this.getCompanyIdForWrite(user, companyId);

    return this.productImportService.createFieldMappingProfile(
      dto,
      resolvedCompanyId,
      user.id,
    );
  }

  /**
   * List field mapping profiles
   * @route GET /api/product-import/field-mappings
   */
  @Get('field-mappings')
  async listFieldMappingProfiles(
    @Query('companyId') companyId: string,
    @Query('provider') provider: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Validate RBAC access to company
    const resolvedCompanyId = await this.getCompanyIdForRead(user, companyId);

    return this.productImportService.listFieldMappingProfiles(resolvedCompanyId, provider);
  }

  /**
   * Update a field mapping profile
   * @route PATCH /api/product-import/field-mappings/:profileId
   */
  @Patch('field-mappings/:profileId')
  async updateFieldMappingProfile(
    @Param('profileId') profileId: string,
    @Body() dto: UpdateFieldMappingProfileDto,
    @Query('companyId') companyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Validate RBAC access to company (write operation)
    const resolvedCompanyId = await this.getCompanyIdForWrite(user, companyId);

    return this.productImportService.updateFieldMappingProfile(profileId, dto, resolvedCompanyId);
  }

  /**
   * Delete a field mapping profile
   * @route DELETE /api/product-import/field-mappings/:profileId
   */
  @Delete('field-mappings/:profileId')
  async deleteFieldMappingProfile(
    @Param('profileId') profileId: string,
    @Query('companyId') companyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Validate RBAC access to company (write operation)
    const resolvedCompanyId = await this.getCompanyIdForWrite(user, companyId);

    await this.productImportService.deleteFieldMappingProfile(profileId, resolvedCompanyId);
    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════════
  // STORAGE & BILLING ENDPOINTS (Phase 6)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get storage usage statistics
   * @route GET /api/product-import/storage
   */
  @Get('storage')
  async getStorageUsage(
    @Query('companyId') companyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Validate RBAC access to company
    const resolvedCompanyId = await this.getCompanyIdForRead(user, companyId);

    return this.productImportService.getStorageUsage(resolvedCompanyId);
  }

  /**
   * Get import history statistics
   * @route GET /api/product-import/history
   */
  @Get('history')
  async getImportHistory(
    @Query('companyId') companyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Validate RBAC access to company
    const resolvedCompanyId = await this.getCompanyIdForRead(user, companyId);

    return this.productImportService.getImportHistory(resolvedCompanyId);
  }

  /**
   * Estimate import costs
   * @route GET /api/product-import/estimate-cost
   */
  @Get('estimate-cost')
  async estimateImportCost(
    @Query('companyId') companyId: string,
    @Query('productCount') productCount: string,
    @Query('imageCount') imageCount: string,
    @Query('generateThumbnails') generateThumbnails: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Validate RBAC access to company
    const resolvedCompanyId = await this.getCompanyIdForRead(user, companyId);

    const parsedProductCount = parseInt(productCount || '0', 10);
    const parsedImageCount = parseInt(imageCount || '0', 10);
    const parsedGenerateThumbnails = generateThumbnails !== 'false';

    if (isNaN(parsedProductCount) || parsedProductCount < 0) {
      throw new BadRequestException('Product count must be a non-negative number');
    }
    if (isNaN(parsedImageCount) || parsedImageCount < 0) {
      throw new BadRequestException('Image count must be a non-negative number');
    }

    return this.productImportService.estimateImportCost(
      resolvedCompanyId,
      parsedProductCount,
      parsedImageCount,
      parsedGenerateThumbnails,
    );
  }
}
