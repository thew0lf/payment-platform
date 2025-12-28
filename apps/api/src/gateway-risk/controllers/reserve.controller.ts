import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../auth/guards/roles.guard';
import { ReserveService } from '../services/reserve.service';
import { ReleaseReserveDto, AdjustReserveDto, CreateReserveHoldDto } from '../dto/reserve.dto';
import { CurrentUser, AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { ReserveTransactionType } from '@prisma/client';

@Controller('admin/gateway-risk/reserves')
@UseGuards(JwtAuthGuard, RolesGuard, ThrottlerGuard)
export class ReserveController {
  constructor(private readonly reserveService: ReserveService) {}

  @Get(':merchantRiskProfileId/summary')
  async getReserveSummary(@Param('merchantRiskProfileId') merchantRiskProfileId: string) {
    return this.reserveService.getReserveSummary(merchantRiskProfileId);
  }

  @Get(':merchantRiskProfileId/transactions')
  async getTransactionHistory(
    @Param('merchantRiskProfileId') merchantRiskProfileId: string,
    @Query('type') type?: ReserveTransactionType,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.reserveService.getTransactionHistory(
      merchantRiskProfileId,
      {
        type,
        fromDate: fromDate ? new Date(fromDate) : undefined,
        toDate: toDate ? new Date(toDate) : undefined,
      },
      {
        skip: skip ? parseInt(skip, 10) : undefined,
        take: take ? parseInt(take, 10) : undefined,
      },
    );
  }

  @Post(':merchantRiskProfileId/hold')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async createReserveHold(
    @Param('merchantRiskProfileId') merchantRiskProfileId: string,
    @Body() dto: CreateReserveHoldDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reserveService.createReserveHold(
      merchantRiskProfileId,
      dto.transactionId,
      dto.transactionAmount,
      dto.reservePercentage,
      dto.holdDays,
      user.id,
    );
  }

  @Post(':merchantRiskProfileId/release')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async releaseReserve(
    @Param('merchantRiskProfileId') merchantRiskProfileId: string,
    @Body() dto: ReleaseReserveDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reserveService.releaseReserve(merchantRiskProfileId, dto, user.id);
  }

  @Post(':merchantRiskProfileId/adjust')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async adjustReserve(
    @Param('merchantRiskProfileId') merchantRiskProfileId: string,
    @Body() dto: AdjustReserveDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reserveService.adjustReserve(merchantRiskProfileId, dto, user.id);
  }

  @Post('process-scheduled-releases')
  @Roles('SUPER_ADMIN')
  async processScheduledReleases(@CurrentUser() user: AuthenticatedUser) {
    // Only SUPER_ADMIN at organization level can trigger scheduled releases
    if (user.scopeType !== 'ORGANIZATION') {
      throw new Error('Only organization administrators can process scheduled releases');
    }
    return this.reserveService.processScheduledReleases();
  }
}
