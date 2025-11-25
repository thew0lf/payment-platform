// Module
export { ContinuityModule } from './continuity.module';

// Services
export { ContinuityService } from './continuity.service';
export { TrustSignalService } from './trust-signal.service';

// Guards
export { MomentumGuard, MomentumThreshold, SkipMomentumCheck } from './guards/momentum.guard';

// Interceptors
export {
  FrictionInterceptor,
  FrictionAmountField,
  IncludeFrictionResponse,
} from './interceptors/friction.interceptor';

// Interfaces
export {
  ContinuityConfig,
  MomentumConfig,
  TrustConfig,
  FrictionConfig,
  CognitiveConfig,
  FlowState,
  FrictionLevel,
  TrustSignal,
  TrustSignalType,
  ContinuityEvent,
  ContinuityMetrics,
  PrimeContext,
  FrameContext,
  AnchorContext,
  EngineeredRealityContext,
} from './interfaces/continuity.interfaces';

// DTOs
export {
  StartFlowDto,
  UpdateFlowDto,
  FlowStateResponseDto,
  TrustSignalDto,
  MomentumConfigDto,
  TrustConfigDto,
  FrictionConfigDto,
  CognitiveConfigDto,
  ContinuityConfigDto,
  UpdateConfigDto,
  ContinuityMetricsDto,
  CalculateFrictionDto,
  FrictionResultDto,
} from './dto/continuity.dto';
