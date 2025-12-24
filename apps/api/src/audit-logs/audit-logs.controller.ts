import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { AuditLogsService } from './audit-logs.service';
import { ScopeType, DataClassification } from '@prisma/client';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  /**
   * Get the user's accessible scope for audit log queries.
   * Users can only view audit logs within their own scope hierarchy.
   */
  private getUserScope(user: AuthenticatedUser): { scopeType: ScopeType; scopeId: string } {
    // Security: Return the user's scope - they can only see logs at or below their scope
    return {
      scopeType: user.scopeType as ScopeType,
      scopeId: user.scopeId,
    };
  }

  /**
   * List audit logs with filtering and pagination
   * Security: Users can only view logs at or below their scope level
   */
  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('actions') actionsParam?: string,
    @Query('entity') entity?: string,
    @Query('entities') entitiesParam?: string,
    @Query('entityId') entityId?: string,
    @Query('scopeType') queryScopeType?: ScopeType,
    @Query('scopeId') queryScopeId?: string,
    @Query('dataClassification') dataClassification?: DataClassification,
    @Query('search') search?: string,
    @Query('startDate') startDateParam?: string,
    @Query('endDate') endDateParam?: string,
    @Query('limit') limitParam?: string,
    @Query('offset') offsetParam?: string,
  ) {
    // Security: Enforce user's scope - they can only see logs at or below their scope
    const userScope = this.getUserScope(user);

    // Determine effective scope - user's scope takes precedence, query can narrow but not widen
    let effectiveScopeType = userScope.scopeType;
    let effectiveScopeId = userScope.scopeId;

    // If query specifies a scope, validate it's within user's access
    if (queryScopeType && queryScopeId) {
      // Users can filter to a narrower scope within their hierarchy
      // For now, we enforce their own scope - they can't access broader scopes
      if (queryScopeType !== userScope.scopeType || queryScopeId !== userScope.scopeId) {
        // Only allow if it's a valid sub-scope (e.g., COMPANY user can't query ORGANIZATION logs)
        throw new ForbiddenException('Cannot access audit logs outside your scope');
      }
    }

    const actions = actionsParam ? actionsParam.split(',') : undefined;
    const entities = entitiesParam ? entitiesParam.split(',') : undefined;
    const startDate = startDateParam ? new Date(startDateParam) : undefined;
    const endDate = endDateParam ? new Date(endDateParam) : undefined;
    const limit = limitParam ? parseInt(limitParam, 10) : 50;
    const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

    return this.auditLogsService.list({
      userId,
      action,
      actions,
      entity,
      entities,
      entityId,
      scopeType: effectiveScopeType,
      scopeId: effectiveScopeId,
      dataClassification,
      search,
      startDate,
      endDate,
      limit,
      offset,
    });
  }

  /**
   * Get audit log statistics
   * Security: Stats are scoped to the user's accessible scope
   */
  @Get('stats')
  async getStats(
    @CurrentUser() user: AuthenticatedUser,
    @Query('scopeId') queryScopeId?: string,
    @Query('days') daysParam?: string,
  ) {
    const userScope = this.getUserScope(user);

    // Security: Use user's scope - query param can narrow but not widen
    let effectiveScopeId = userScope.scopeId;
    if (queryScopeId && queryScopeId !== userScope.scopeId) {
      throw new ForbiddenException('Cannot access audit log stats outside your scope');
    }

    const days = daysParam ? parseInt(daysParam, 10) : 30;
    return this.auditLogsService.getStats(effectiveScopeId, days);
  }

  /**
   * Get available filter options
   */
  @Get('filters')
  async getFilters() {
    const [actions, entities] = await Promise.all([
      this.auditLogsService.getAvailableActions(),
      this.auditLogsService.getAvailableEntities(),
    ]);

    return {
      actions,
      entities,
      dataClassifications: Object.values(DataClassification),
      scopeTypes: Object.values(ScopeType),
    };
  }

  /**
   * Get audit trail for a specific entity
   * Security: Entity trail is filtered at database level to user's accessible scope
   */
  @Get('entity/:entity/:entityId')
  async getEntityTrail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('entity') entity: string,
    @Param('entityId') entityId: string,
    @Query('limit') limitParam?: string,
  ) {
    const limit = limitParam ? parseInt(limitParam, 10) : 100;
    const userScope = this.getUserScope(user);

    // Security: Pass scope filter to service for database-level filtering
    // This prevents N+1 query issues and fetching records outside user's scope
    return this.auditLogsService.getEntityTrail(entity, entityId, limit, userScope);
  }

  /**
   * Get a single audit log by ID
   * Security: Validates the log is within user's accessible scope
   */
  @Get(':id')
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    const log = await this.auditLogsService.findById(id);

    if (!log) {
      return null;
    }

    // Security: Verify the log is within user's scope
    const userScope = this.getUserScope(user);
    if (log.scopeType !== userScope.scopeType || log.scopeId !== userScope.scopeId) {
      throw new ForbiddenException('Access denied to this audit log');
    }

    return log;
  }
}
