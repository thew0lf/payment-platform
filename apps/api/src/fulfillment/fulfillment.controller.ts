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
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { ShipmentsService } from './services/shipments.service';
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
  constructor(private readonly shipmentsService: ShipmentsService) {}

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
  async getShipmentsByOrder(
    @Query('orderId') orderId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Shipment[]> {
    const companyId = this.getCompanyId(user);
    return this.shipmentsService.findByOrderId(orderId, companyId);
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
    throw new Error('User does not have a valid company context');
  }
}
