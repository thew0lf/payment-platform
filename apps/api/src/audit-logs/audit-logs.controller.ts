import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditLogsService } from './audit-logs.service';
import { ScopeType, DataClassification } from '@prisma/client';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  /**
   * List audit logs with filtering and pagination
   */
  @Get()
  async list(
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('actions') actionsParam?: string,
    @Query('entity') entity?: string,
    @Query('entities') entitiesParam?: string,
    @Query('entityId') entityId?: string,
    @Query('scopeType') scopeType?: ScopeType,
    @Query('scopeId') scopeId?: string,
    @Query('dataClassification') dataClassification?: DataClassification,
    @Query('search') search?: string,
    @Query('startDate') startDateParam?: string,
    @Query('endDate') endDateParam?: string,
    @Query('limit') limitParam?: string,
    @Query('offset') offsetParam?: string,
  ) {
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
      scopeType,
      scopeId,
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
   */
  @Get('stats')
  async getStats(
    @Query('scopeId') scopeId?: string,
    @Query('days') daysParam?: string,
  ) {
    const days = daysParam ? parseInt(daysParam, 10) : 30;
    return this.auditLogsService.getStats(scopeId, days);
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
   */
  @Get('entity/:entity/:entityId')
  async getEntityTrail(
    @Param('entity') entity: string,
    @Param('entityId') entityId: string,
    @Query('limit') limitParam?: string,
  ) {
    const limit = limitParam ? parseInt(limitParam, 10) : 100;
    return this.auditLogsService.getEntityTrail(entity, entityId, limit);
  }

  /**
   * Get a single audit log by ID
   */
  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.auditLogsService.findById(id);
  }
}
