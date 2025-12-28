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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { MerchantRiskProfileService } from '../services/merchant-risk-profile.service';
import {
  CreateMerchantRiskProfileDto,
  UpdateMerchantRiskProfileDto,
  TriggerRiskAssessmentDto,
} from '../dto/merchant-risk.dto';
import { CurrentUser, AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { MerchantRiskLevel, MerchantAccountStatus } from '@prisma/client';

@Controller('admin/gateway-risk/merchants')
@UseGuards(JwtAuthGuard)
export class MerchantRiskController {
  constructor(private readonly merchantRiskService: MerchantRiskProfileService) {}

  @Post()
  async createRiskProfile(@Body() dto: CreateMerchantRiskProfileDto) {
    return this.merchantRiskService.createRiskProfile(dto);
  }

  @Get()
  async listRiskProfiles(
    @Query('platformIntegrationId') platformIntegrationId?: string,
    @Query('riskLevel') riskLevel?: MerchantRiskLevel,
    @Query('accountStatus') accountStatus?: MerchantAccountStatus,
    @Query('requiresMonitoring') requiresMonitoring?: string,
    @Query('isHighRiskMCC') isHighRiskMCC?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.merchantRiskService.listRiskProfiles(
      platformIntegrationId,
      {
        riskLevel,
        accountStatus,
        requiresMonitoring: requiresMonitoring ? requiresMonitoring === 'true' : undefined,
        isHighRiskMCC: isHighRiskMCC ? isHighRiskMCC === 'true' : undefined,
      },
      {
        skip: skip ? parseInt(skip, 10) : undefined,
        take: take ? parseInt(take, 10) : undefined,
      },
    );
  }

  @Get('requiring-review')
  async getProfilesRequiringReview() {
    return this.merchantRiskService.getProfilesRequiringReview();
  }

  @Get(':clientId')
  async getRiskProfile(@Param('clientId') clientId: string) {
    return this.merchantRiskService.getRiskProfile(clientId);
  }

  @Get('by-id/:id')
  async getRiskProfileById(@Param('id') id: string) {
    return this.merchantRiskService.getRiskProfileById(id);
  }

  @Patch(':clientId')
  async updateRiskProfile(
    @Param('clientId') clientId: string,
    @Body() dto: UpdateMerchantRiskProfileDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.merchantRiskService.updateRiskProfile(clientId, dto, user.id);
  }

  @Post(':clientId/assess')
  async triggerRiskAssessment(
    @Param('clientId') clientId: string,
    @Body() dto: TriggerRiskAssessmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.merchantRiskService.triggerRiskAssessment(clientId, dto, user.id);
  }

  @Post('assessments/:id/approve')
  async approveRiskAssessment(
    @Param('id') assessmentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.merchantRiskService.approveRiskAssessment(assessmentId, user.id);
  }

  @Post(':clientId/approve')
  async approveAccount(
    @Param('clientId') clientId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.merchantRiskService.approveAccount(clientId, user.id);
  }

  @Post(':clientId/suspend')
  async suspendAccount(
    @Param('clientId') clientId: string,
    @Body('reason') reason: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.merchantRiskService.suspendAccount(clientId, reason, user.id);
  }

  @Post(':clientId/metrics')
  async updateProcessingMetrics(
    @Param('clientId') clientId: string,
    @Body()
    metrics: {
      transactionAmount?: number;
      transactionCount?: number;
      chargebackCount?: number;
      chargebackAmount?: number;
      refundCount?: number;
      refundAmount?: number;
    },
  ) {
    return this.merchantRiskService.updateProcessingMetrics(clientId, metrics);
  }
}
