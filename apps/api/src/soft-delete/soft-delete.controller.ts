import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { SoftDeleteService } from './soft-delete.service';
import { UserContext } from '../hierarchy/hierarchy.service';
import { SoftDeleteModel, isSoftDeleteModel } from './soft-delete.constants';
import {
  DeleteEntityDto,
  RestoreEntityDto,
  PermanentDeleteDto,
  ListDeletedDto,
  EntityTypeParamDto,
  DeletedRecord,
  DeletionPreview,
  DeletionDetails,
  DeleteResult,
  RestoreResult,
  PurgeResult,
} from './soft-delete.dto';

@Controller('deleted')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SoftDeleteController {
  constructor(private readonly softDeleteService: SoftDeleteService) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // LIST & SEARCH DELETED RECORDS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * GET /api/deleted
   * List all deleted records (Trash view)
   */
  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async listDeleted(
    @Query() query: ListDeletedDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ items: DeletedRecord[]; total: number }> {
    const userContext = this.toUserContext(user);
    return this.softDeleteService.listDeleted(userContext, {
      entityType: query.entityType,
      search: query.search,
      deletedAfter: query.deletedAfter,
      deletedBefore: query.deletedBefore,
      limit: query.limit,
      offset: query.offset,
    });
  }

  /**
   * GET /api/deleted/:entityType
   * List deleted records of a specific type
   */
  @Get(':entityType')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async listDeletedByType(
    @Param() params: EntityTypeParamDto,
    @Query() query: ListDeletedDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ items: DeletedRecord[]; total: number }> {
    const userContext = this.toUserContext(user);
    return this.softDeleteService.listDeleted(userContext, {
      entityType: params.entityType,
      search: query.search,
      deletedAfter: query.deletedAfter,
      deletedBefore: query.deletedBefore,
      limit: query.limit,
      offset: query.offset,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETION PREVIEW
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * GET /api/deleted/:entityType/:id/preview
   * Preview deletion impact before confirming
   */
  @Get(':entityType/:id/preview')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async previewDelete(
    @Param('entityType') entityType: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DeletionPreview> {
    this.validateEntityType(entityType);
    const userContext = this.toUserContext(user);
    return this.softDeleteService.previewDelete(
      entityType as SoftDeleteModel,
      id,
      userContext,
      user.role,
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SOFT DELETE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * DELETE /api/deleted/:entityType/:id
   * Soft delete an entity
   */
  @Delete(':entityType/:id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  async softDelete(
    @Param('entityType') entityType: string,
    @Param('id') id: string,
    @Body() dto: DeleteEntityDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DeleteResult> {
    this.validateEntityType(entityType);
    const userContext = this.toUserContext(user);
    return this.softDeleteService.softDelete(
      entityType as SoftDeleteModel,
      id,
      userContext,
      user.role,
      dto.reason,
      dto.cascade,
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RESTORE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * POST /api/deleted/:entityType/:id/restore
   * Restore a soft-deleted entity
   */
  @Post(':entityType/:id/restore')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  async restore(
    @Param('entityType') entityType: string,
    @Param('id') id: string,
    @Body() dto: RestoreEntityDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RestoreResult> {
    this.validateEntityType(entityType);
    const userContext = this.toUserContext(user);
    return this.softDeleteService.restore(
      entityType as SoftDeleteModel,
      id,
      userContext,
      user.role,
      dto.cascade,
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETION DETAILS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * GET /api/deleted/:entityType/:id/details
   * Get detailed information about a deleted entity
   */
  @Get(':entityType/:id/details')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async getDeletionDetails(
    @Param('entityType') entityType: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DeletionDetails> {
    this.validateEntityType(entityType);
    const userContext = this.toUserContext(user);
    return this.softDeleteService.getDeletionDetails(
      entityType as SoftDeleteModel,
      id,
      userContext,
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PERMANENT DELETE (GDPR / Admin)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * DELETE /api/deleted/:entityType/:id/permanent
   * Permanently delete (GDPR/compliance only)
   */
  @Delete(':entityType/:id/permanent')
  @Roles('SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  async permanentDelete(
    @Param('entityType') entityType: string,
    @Param('id') id: string,
    @Body() dto: PermanentDeleteDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DeleteResult> {
    this.validateEntityType(entityType);
    const userContext = this.toUserContext(user);
    return this.softDeleteService.permanentlyDelete(
      entityType as SoftDeleteModel,
      id,
      userContext,
      user.role,
      dto.reason,
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PURGE (Admin scheduled job endpoint)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * POST /api/deleted/purge
   * Manually trigger retention purge (normally scheduled)
   */
  @Post('purge')
  @Roles('SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  async purgeExpired(): Promise<PurgeResult> {
    return this.softDeleteService.purgeExpiredRecords();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private validateEntityType(entityType: string): void {
    if (!isSoftDeleteModel(entityType)) {
      throw new Error(`Invalid entity type: ${entityType}`);
    }
  }

  private toUserContext(user: AuthenticatedUser): UserContext {
    return {
      sub: user.id,
      scopeType: user.scopeType as any,
      scopeId: user.scopeId,
      organizationId: user.organizationId,
      clientId: user.clientId,
      companyId: user.companyId,
      departmentId: user.departmentId,
    };
  }
}
