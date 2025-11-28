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
import { OrdersService } from './services/orders.service';
import { Order, OrderStats } from './types/order.types';
import {
  CreateOrderDto,
  UpdateOrderDto,
  OrderQueryDto,
  CancelOrderDto,
  MarkPaidDto,
} from './dto/order.dto';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ═══════════════════════════════════════════════════════════════
  // CRUD
  // ═══════════════════════════════════════════════════════════════

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async create(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Order> {
    // Get companyId from user's context (organization or client)
    const companyId = this.getCompanyId(user);
    return this.ordersService.create(companyId, dto, user.id);
  }

  @Get()
  async findAll(
    @Query() query: OrderQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ orders: Order[]; total: number }> {
    const companyId = this.getCompanyId(user);
    return this.ordersService.findAll(companyId, query);
  }

  @Get('stats')
  async getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<OrderStats> {
    const companyId = this.getCompanyId(user!);
    return this.ordersService.getStats(
      companyId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get(':id')
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Order> {
    const companyId = this.getCompanyId(user);
    return this.ordersService.findById(id, companyId);
  }

  @Get('number/:orderNumber')
  async findByOrderNumber(
    @Param('orderNumber') orderNumber: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Order> {
    const companyId = this.getCompanyId(user);
    return this.ordersService.findByOrderNumber(orderNumber, companyId);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Order> {
    const companyId = this.getCompanyId(user);
    return this.ordersService.update(id, companyId, dto, user.id);
  }

  // ═══════════════════════════════════════════════════════════════
  // STATUS MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  @Post(':id/confirm')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  async confirm(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Order> {
    const companyId = this.getCompanyId(user);
    return this.ordersService.updateStatus(id, companyId, 'CONFIRMED', user.id);
  }

  @Post(':id/process')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  async process(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Order> {
    const companyId = this.getCompanyId(user);
    return this.ordersService.updateStatus(id, companyId, 'PROCESSING', user.id);
  }

  @Post(':id/cancel')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Order> {
    const companyId = this.getCompanyId(user);
    return this.ordersService.updateStatus(id, companyId, 'CANCELED', user.id, dto.reason);
  }

  @Post(':id/complete')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  async complete(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Order> {
    const companyId = this.getCompanyId(user);
    return this.ordersService.updateStatus(id, companyId, 'COMPLETED', user.id);
  }

  // ═══════════════════════════════════════════════════════════════
  // PAYMENT
  // ═══════════════════════════════════════════════════════════════

  @Post(':id/mark-paid')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  async markPaid(
    @Param('id') id: string,
    @Body() dto: MarkPaidDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Order> {
    const companyId = this.getCompanyId(user);
    return this.ordersService.markPaid(id, companyId, user.id, dto.paymentMethod);
  }

  // ═══════════════════════════════════════════════════════════════
  // ADDRESS LOCK
  // ═══════════════════════════════════════════════════════════════

  @Post(':id/lock-address')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  async lockAddress(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Order> {
    const companyId = this.getCompanyId(user);
    return this.ordersService.lockAddress(id, companyId, user.id);
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
