import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ChargebackService } from '../services/chargeback.service';
import {
  CreateChargebackRecordDto,
  UpdateChargebackRecordDto,
  SubmitRepresentmentDto,
  ResolveChargebackDto,
} from '../dto/chargeback.dto';
import { ChargebackStatus } from '@prisma/client';

@Controller('admin/gateway-risk/chargebacks')
@UseGuards(JwtAuthGuard, ThrottlerGuard)
export class ChargebackController {
  constructor(private readonly chargebackService: ChargebackService) {}

  @Post()
  async createChargebackRecord(@Body() dto: CreateChargebackRecordDto) {
    return this.chargebackService.createChargebackRecord(dto);
  }

  @Get()
  async listChargebacks(
    @Query('merchantRiskProfileId') merchantRiskProfileId?: string,
    @Query('status') status?: ChargebackStatus,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.chargebackService.listChargebacks(
      merchantRiskProfileId,
      {
        status,
        fromDate: fromDate ? new Date(fromDate) : undefined,
        toDate: toDate ? new Date(toDate) : undefined,
      },
      {
        skip: skip ? parseInt(skip, 10) : undefined,
        take: take ? parseInt(take, 10) : undefined,
      },
    );
  }

  @Get('approaching-deadline')
  async getChargebacksApproachingDeadline(@Query('daysAhead') daysAhead?: string) {
    return this.chargebackService.getChargebacksApproachingDeadline(
      daysAhead ? parseInt(daysAhead, 10) : 3,
    );
  }

  @Get(':id')
  async getChargebackRecord(@Param('id') id: string) {
    return this.chargebackService.getChargebackRecord(id);
  }

  @Get('by-external-id/:chargebackId')
  async getChargebackByExternalId(@Param('chargebackId') chargebackId: string) {
    return this.chargebackService.getChargebackByExternalId(chargebackId);
  }

  @Patch(':id')
  async updateChargebackRecord(
    @Param('id') id: string,
    @Body() dto: UpdateChargebackRecordDto,
  ) {
    return this.chargebackService.updateChargebackRecord(id, dto);
  }

  @Post(':id/representment')
  async submitRepresentment(
    @Param('id') id: string,
    @Body() dto: SubmitRepresentmentDto,
  ) {
    return this.chargebackService.submitRepresentment(id, dto);
  }

  @Post(':id/resolve')
  async resolveChargeback(@Param('id') id: string, @Body() dto: ResolveChargebackDto) {
    return this.chargebackService.resolveChargeback(id, dto);
  }

  @Get('stats/:merchantRiskProfileId')
  async getChargebackStats(@Param('merchantRiskProfileId') merchantRiskProfileId: string) {
    return this.chargebackService.getChargebackStats(merchantRiskProfileId);
  }
}
