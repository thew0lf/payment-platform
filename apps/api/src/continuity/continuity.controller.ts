import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { ContinuityService } from './continuity.service';
import { TrustSignalService } from './trust-signal.service';
import {
  StartFlowDto,
  UpdateFlowDto,
  FlowStateResponseDto,
  ContinuityConfigDto,
  UpdateConfigDto,
  ContinuityMetricsDto,
  CalculateFrictionDto,
  FrictionResultDto,
} from './dto/continuity.dto';

@ApiTags('Continuity')
@Controller('continuity')
export class ContinuityController {
  constructor(
    private readonly continuityService: ContinuityService,
    private readonly trustSignalService: TrustSignalService,
  ) {}

  // ============================================
  // Configuration Endpoints
  // ============================================

  @Get('config')
  @ApiOperation({
    summary: 'Get continuity configuration',
    description: 'Returns the current NCI-based continuity framework configuration',
  })
  @ApiResponse({ status: 200, type: ContinuityConfigDto })
  getConfig(): ContinuityConfigDto {
    return this.continuityService.getConfig() as ContinuityConfigDto;
  }

  @Put('config')
  @ApiOperation({
    summary: 'Update continuity configuration',
    description: 'Update behavioral momentum, trust, friction, or cognitive settings',
  })
  @ApiResponse({ status: 200, type: ContinuityConfigDto })
  updateConfig(@Body() dto: UpdateConfigDto): ContinuityConfigDto {
    return this.continuityService.updateConfig(dto as any) as ContinuityConfigDto;
  }

  // ============================================
  // Flow Management Endpoints
  // ============================================

  @Post('flow')
  @ApiOperation({
    summary: 'Start a new payment flow',
    description: 'Initializes a new payment flow with momentum tracking (PRIME phase)',
  })
  @ApiResponse({ status: 201, type: FlowStateResponseDto })
  startFlow(@Body() dto: StartFlowDto): FlowStateResponseDto {
    return this.continuityService.startFlow(dto) as FlowStateResponseDto;
  }

  @Get('flow/:sessionId')
  @ApiOperation({
    summary: 'Get flow state',
    description: 'Returns current state of a payment flow including momentum score',
  })
  @ApiParam({ name: 'sessionId', description: 'Unique session identifier' })
  @ApiResponse({ status: 200, type: FlowStateResponseDto })
  @ApiResponse({ status: 404, description: 'Flow not found' })
  getFlowState(@Param('sessionId') sessionId: string): FlowStateResponseDto {
    const state = this.continuityService.getFlowState(sessionId);
    if (!state) {
      throw new NotFoundException(`Flow not found: ${sessionId}`);
    }
    return state as FlowStateResponseDto;
  }

  @Put('flow/:sessionId')
  @ApiOperation({
    summary: 'Update flow progress',
    description: 'Updates the current step and recalculates momentum (COMMIT phase)',
  })
  @ApiParam({ name: 'sessionId', description: 'Unique session identifier' })
  @ApiResponse({ status: 200, type: FlowStateResponseDto })
  @ApiResponse({ status: 404, description: 'Flow not found' })
  updateFlow(
    @Param('sessionId') sessionId: string,
    @Body() dto: UpdateFlowDto,
  ): FlowStateResponseDto {
    const state = this.continuityService.updateFlow(sessionId, dto);
    if (!state) {
      throw new NotFoundException(`Flow not found: ${sessionId}`);
    }
    return state as FlowStateResponseDto;
  }

  @Post('flow/:sessionId/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Complete a payment flow',
    description: 'Marks the flow as completed and cleans up (CLOSE phase)',
  })
  @ApiParam({ name: 'sessionId', description: 'Unique session identifier' })
  @ApiResponse({ status: 200, type: FlowStateResponseDto })
  @ApiResponse({ status: 404, description: 'Flow not found' })
  completeFlow(@Param('sessionId') sessionId: string): FlowStateResponseDto {
    const state = this.continuityService.completeFlow(sessionId);
    if (!state) {
      throw new NotFoundException(`Flow not found: ${sessionId}`);
    }
    return state as FlowStateResponseDto;
  }

  @Delete('flow/:sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Abandon a payment flow',
    description: 'Marks the flow as abandoned for analytics',
  })
  @ApiParam({ name: 'sessionId', description: 'Unique session identifier' })
  @ApiResponse({ status: 204, description: 'Flow abandoned' })
  abandonFlow(@Param('sessionId') sessionId: string): void {
    this.continuityService.abandonFlow(sessionId);
  }

  // ============================================
  // Friction Calculation Endpoints
  // ============================================

  @Post('friction/calculate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Calculate friction level',
    description: 'Determines appropriate friction level for a transaction amount',
  })
  @ApiResponse({ status: 200, type: FrictionResultDto })
  calculateFriction(@Body() dto: CalculateFrictionDto): FrictionResultDto {
    return this.continuityService.calculateFriction(dto);
  }

  // ============================================
  // Trust Signal Endpoints
  // ============================================

  @Get('trust-signals')
  @ApiOperation({
    summary: 'Get trust signals',
    description: 'Returns trust signals based on platform metrics',
  })
  @ApiResponse({ status: 200, description: 'Array of trust signals' })
  getTrustSignals() {
    const metrics = {
      totalTransactions: 52847,
      successRate: 99.2,
      averageRating: 4.8,
      verifiedMerchant: true,
      complianceCertifications: ['PCI-DSS', 'SOC2', 'GDPR'],
    };
    return this.trustSignalService.generateSignals(metrics);
  }

  @Get('trust-signals/:context')
  @ApiOperation({
    summary: 'Get contextual trust signals',
    description: 'Returns trust signals appropriate for a specific context',
  })
  @ApiParam({
    name: 'context',
    enum: ['checkout', 'confirmation', 'receipt'],
    description: 'The context in which signals will be displayed',
  })
  @ApiResponse({ status: 200, description: 'Array of contextual trust signals' })
  getContextualTrustSignals(
    @Param('context') context: 'checkout' | 'confirmation' | 'receipt',
  ) {
    const metrics = {
      totalTransactions: 52847,
      successRate: 99.2,
      averageRating: 4.8,
      verifiedMerchant: true,
      complianceCertifications: ['PCI-DSS', 'SOC2', 'GDPR'],
    };
    const signals = this.trustSignalService.generateSignals(metrics);
    return this.trustSignalService.getContextualSignals(signals, context);
  }

  @Get('trust-score')
  @ApiOperation({
    summary: 'Get aggregate trust score',
    description: 'Returns calculated trust score based on all available signals',
  })
  @ApiResponse({ status: 200, description: 'Trust score (0-100)' })
  getTrustScore(): { score: number; signals: number } {
    const metrics = {
      totalTransactions: 52847,
      successRate: 99.2,
      averageRating: 4.8,
      verifiedMerchant: true,
      complianceCertifications: ['PCI-DSS', 'SOC2', 'GDPR'],
    };
    const signals = this.trustSignalService.generateSignals(metrics);
    return {
      score: this.trustSignalService.calculateTrustScore(signals),
      signals: signals.length,
    };
  }

  // ============================================
  // Metrics Endpoints
  // ============================================

  @Get('metrics')
  @ApiOperation({
    summary: 'Get continuity metrics',
    description: 'Returns KPIs for the continuity framework',
  })
  @ApiResponse({ status: 200, type: ContinuityMetricsDto })
  getMetrics(): ContinuityMetricsDto {
    return this.continuityService.getMetrics();
  }

  // ============================================
  // Engineered Reality Context
  // ============================================

  @Post('context/engineered')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate Engineered Reality context',
    description: 'Creates PRIME/FRAME/ANCHOR context for optimal payment experience',
  })
  @ApiResponse({ status: 200, description: 'Engineered Reality context object' })
  generateEngineeredContext(
    @Body()
    body: {
      userSegment: string;
      transactionAmount: number;
      previousPurchases?: number[];
    },
  ) {
    return this.continuityService.generateEngineeredContext(
      body.userSegment,
      body.transactionAmount,
      body.previousPurchases,
    );
  }
}
