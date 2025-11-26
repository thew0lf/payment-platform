import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RMAService } from './rma.service';
import {
  RMA,
  RMAPolicy,
  CreateRMADto,
  ApproveRMADto,
  RejectRMADto,
  UpdateRMAStatusDto,
  RecordInspectionDto,
  ProcessResolutionDto,
  GetRMAsDto,
  RMAAnalyticsDto,
  RMAAnalytics,
} from '../types/rma.types';

@Controller('momentum/rma')
@UseGuards(JwtAuthGuard)
export class RMAController {
  constructor(private readonly rmaService: RMAService) {}

  // ═══════════════════════════════════════════════════════════════
  // RMA CREATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Create a new RMA
   */
  @Post()
  async createRMA(@Body() dto: CreateRMADto): Promise<RMA> {
    return this.rmaService.createRMA(dto);
  }

  // ═══════════════════════════════════════════════════════════════
  // APPROVAL WORKFLOW
  // ═══════════════════════════════════════════════════════════════

  /**
   * Approve an RMA
   */
  @Put(':rmaId/approve')
  async approveRMA(
    @Param('rmaId') rmaId: string,
    @Body() dto: Omit<ApproveRMADto, 'rmaId'>,
  ): Promise<RMA> {
    return this.rmaService.approveRMA({ rmaId, ...dto });
  }

  /**
   * Reject an RMA
   */
  @Put(':rmaId/reject')
  async rejectRMA(
    @Param('rmaId') rmaId: string,
    @Body() dto: Omit<RejectRMADto, 'rmaId'>,
  ): Promise<RMA> {
    return this.rmaService.rejectRMA({ rmaId, ...dto });
  }

  // ═══════════════════════════════════════════════════════════════
  // STATUS UPDATES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Update RMA status
   */
  @Put(':rmaId/status')
  async updateStatus(
    @Param('rmaId') rmaId: string,
    @Body() dto: Omit<UpdateRMAStatusDto, 'rmaId'>,
  ): Promise<RMA> {
    return this.rmaService.updateStatus({ rmaId, ...dto });
  }

  // ═══════════════════════════════════════════════════════════════
  // INSPECTION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Record inspection results
   */
  @Post(':rmaId/inspection')
  async recordInspection(
    @Param('rmaId') rmaId: string,
    @Body() dto: Omit<RecordInspectionDto, 'rmaId'>,
  ): Promise<RMA> {
    return this.rmaService.recordInspection({ rmaId, ...dto });
  }

  // ═══════════════════════════════════════════════════════════════
  // RESOLUTION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Process RMA resolution
   */
  @Post(':rmaId/resolve')
  async processResolution(
    @Param('rmaId') rmaId: string,
    @Body() dto: Omit<ProcessResolutionDto, 'rmaId'>,
  ): Promise<RMA> {
    return this.rmaService.processResolution({ rmaId, ...dto });
  }

  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get RMAs with filters
   */
  @Get()
  async getRMAs(@Query() dto: GetRMAsDto) {
    return this.rmaService.getRMAs(dto);
  }

  /**
   * Get a specific RMA by ID
   */
  @Get(':rmaId')
  async getRMA(@Param('rmaId') rmaId: string) {
    return this.rmaService.getRMA(rmaId);
  }

  /**
   * Get RMA by number
   */
  @Get('number/:rmaNumber')
  async getRMAByNumber(@Param('rmaNumber') rmaNumber: string) {
    return this.rmaService.getRMAByNumber(rmaNumber);
  }

  // ═══════════════════════════════════════════════════════════════
  // POLICY
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get RMA policy for a company
   */
  @Get('policy/:companyId')
  async getPolicy(@Param('companyId') companyId: string): Promise<RMAPolicy> {
    return this.rmaService.getRMAPolicy(companyId);
  }

  /**
   * Update RMA policy
   */
  @Put('policy/:companyId')
  async updatePolicy(
    @Param('companyId') companyId: string,
    @Body() policy: Partial<RMAPolicy>,
  ) {
    // Implementation would save to database
    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════════
  // ANALYTICS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get RMA analytics
   */
  @Get('analytics/:companyId')
  async getAnalytics(
    @Param('companyId') companyId: string,
    @Query() dto: Omit<RMAAnalyticsDto, 'companyId'>,
  ): Promise<RMAAnalytics> {
    return this.rmaService.getAnalytics({ companyId, ...dto });
  }
}
