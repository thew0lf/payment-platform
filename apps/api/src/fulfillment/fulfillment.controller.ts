import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { ShipmentsService } from './services/shipments.service';
import { HierarchyService } from '../hierarchy/hierarchy.service';
import { Shipment, ShipmentEvent } from './types/fulfillment.types';
import {
  CreateShipmentDto,
  UpdateShipmentDto,
  AddTrackingEventDto,
  MarkShippedDto,
  MarkDeliveredDto,
} from './dto/shipment.dto';

@Controller('fulfillment')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FulfillmentController {
  constructor(
    private readonly shipmentsService: ShipmentsService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // SHIPMENTS
  // ═══════════════════════════════════════════════════════════════

  @Post('shipments')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async createShipment(
    @Body() dto: CreateShipmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Shipment> {
    const companyId = this.getCompanyId(user);
    return this.shipmentsService.create(companyId, dto, user.id);
  }

  @Get('shipments')
  async getShipments(
    @Query('orderId') orderId: string,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Shipment[]> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    // Pass clientId for cross-client boundary filtering when companyId is undefined
    const clientId = !companyId && user.scopeType === 'CLIENT' ? user.scopeId : user.clientId;
    return this.shipmentsService.findAll(orderId, companyId, clientId);
  }

  @Get('shipments/:id')
  async getShipment(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Shipment> {
    const companyId = this.getCompanyId(user);
    return this.shipmentsService.findById(id, companyId);
  }

  @Patch('shipments/:id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async updateShipment(
    @Param('id') id: string,
    @Body() dto: UpdateShipmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Shipment> {
    const companyId = this.getCompanyId(user);
    return this.shipmentsService.update(id, companyId, dto, user.id);
  }

  // ═══════════════════════════════════════════════════════════════
  // STATUS ACTIONS
  // ═══════════════════════════════════════════════════════════════

  @Post('shipments/:id/ship')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  async markShipped(
    @Param('id') id: string,
    @Body() dto: MarkShippedDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Shipment> {
    const companyId = this.getCompanyId(user);
    return this.shipmentsService.markShipped(id, companyId, user.id, dto.trackingNumber);
  }

  @Post('shipments/:id/deliver')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  async markDelivered(
    @Param('id') id: string,
    @Body() dto: MarkDeliveredDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Shipment> {
    const companyId = this.getCompanyId(user);
    return this.shipmentsService.markDelivered(id, companyId, user.id, dto.signedBy);
  }

  // ═══════════════════════════════════════════════════════════════
  // TRACKING EVENTS
  // ═══════════════════════════════════════════════════════════════

  @Post('shipments/:id/events')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.CREATED)
  async addEvent(
    @Param('id') id: string,
    @Body() dto: AddTrackingEventDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ShipmentEvent> {
    const companyId = this.getCompanyId(user);
    return this.shipmentsService.addEvent(id, companyId, dto, user.id);
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPER
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get companyId for write operations (create/update/delete).
   * Requires explicit company context.
   */
  private getCompanyId(user: AuthenticatedUser): string {
    // For COMPANY scope users, the scopeId IS the companyId
    if (user.scopeType === 'COMPANY') {
      return user.scopeId;
    }
    // For other scopes, check explicit companyId or clientId
    if (user.companyId) {
      return user.companyId;
    }
    if (user.clientId) {
      return user.clientId;
    }
    throw new ForbiddenException('Company context required for this operation');
  }

  /**
   * Get companyId for query operations.
   * For ORGANIZATION/CLIENT scope users, allows:
   * - Passing companyId query param to filter by specific company (with validation)
   * - Returns undefined to query all accessible shipments (when no companyId passed)
   */
  private async getCompanyIdForQuery(user: AuthenticatedUser, queryCompanyId?: string): Promise<string | undefined> {
    // For COMPANY scope users, always filter by their company
    if (user.scopeType === 'COMPANY') {
      return user.scopeId;
    }

    // For users with explicit companyId/clientId, use that
    if (user.companyId) {
      return user.companyId;
    }

    // For ORGANIZATION or CLIENT scope admins
    if (user.scopeType === 'ORGANIZATION' || user.scopeType === 'CLIENT') {
      // If they passed a companyId query param, validate access first
      if (queryCompanyId) {
        const hasAccess = await this.hierarchyService.canAccessCompany(
          { sub: user.id, scopeType: user.scopeType as any, scopeId: user.scopeId, clientId: user.clientId, companyId: user.companyId },
          queryCompanyId,
        );
        if (!hasAccess) {
          throw new ForbiddenException("Hmm, you don't have access to that company. Double-check your permissions or try a different one.");
        }
        return queryCompanyId;
      }
      // Otherwise return undefined to allow querying all shipments they have access to
      return undefined;
    }

    throw new ForbiddenException('Unable to determine company context');
  }
}
