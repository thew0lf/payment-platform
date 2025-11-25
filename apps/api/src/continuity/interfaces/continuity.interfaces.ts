/**
 * Continuity Framework Interfaces
 * Based on Chase Hughes' NCI: Non-Verbal Communication Influence / Engineered Reality
 */

export interface MomentumConfig {
  enableMicroConfirmations: boolean;
  progressIndicatorStyle: 'steps' | 'progress' | 'minimal';
  autoAdvanceDelay: number;
}

export interface TrustConfig {
  showSecurityIndicators: boolean;
  displaySocialProof: boolean;
  transactionCountThreshold: number;
  showComplianceBadges: string[];
}

export interface FrictionConfig {
  oneClickThreshold: number;
  confirmationRequired: number;
  stepUpAuthThreshold: number;
}

export interface CognitiveConfig {
  maxDecisionPoints: number;
  progressiveDisclosure: boolean;
  inlineValidation: boolean;
}

export interface ContinuityConfig {
  momentum: MomentumConfig;
  trust: TrustConfig;
  friction: FrictionConfig;
  cognitive: CognitiveConfig;
}

export interface FlowState {
  sessionId: string;
  currentStep: number;
  totalSteps: number;
  startedAt: Date;
  lastActivityAt: Date;
  momentumScore: number;
  frictionLevel: FrictionLevel;
  trustSignals: TrustSignal[];
}

export enum FrictionLevel {
  NONE = 'none',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export interface TrustSignal {
  type: TrustSignalType;
  value: string | number;
  displayText: string;
  priority: number;
}

export enum TrustSignalType {
  TRANSACTION_COUNT = 'transaction_count',
  SECURITY_BADGE = 'security_badge',
  COMPLIANCE_CERT = 'compliance_cert',
  USER_RATING = 'user_rating',
  VERIFIED_MERCHANT = 'verified_merchant',
}

export enum ContinuityEvent {
  FLOW_STARTED = 'continuity.flow.started',
  MOMENTUM_MAINTAINED = 'continuity.momentum.maintained',
  MOMENTUM_BROKEN = 'continuity.momentum.broken',
  TRUST_SIGNAL_DISPLAYED = 'continuity.trust.displayed',
  FRICTION_APPLIED = 'continuity.friction.applied',
  FRICTION_BYPASSED = 'continuity.friction.bypassed',
  FLOW_COMPLETED = 'continuity.flow.completed',
  FLOW_ABANDONED = 'continuity.flow.abandoned',
}

export interface ContinuityMetrics {
  flowCompletionRate: number;
  averageTimeToPayment: number;
  abandonmentRate: number;
  trustScoreImpact: number;
  frictionEfficiency: number;
}

export interface PrimeContext {
  userSegment: string;
  previousInteractions: number;
  preferredPaymentMethod?: string;
  riskScore: number;
}

export interface FrameContext {
  productValue: number;
  comparisonAnchor?: number;
  urgencyLevel: 'none' | 'low' | 'medium' | 'high';
  scarcitySignal?: string;
}

export interface AnchorContext {
  referencePrice?: number;
  previousPurchaseAmount?: number;
  marketAverage?: number;
}

export interface EngineeredRealityContext {
  prime: PrimeContext;
  frame: FrameContext;
  anchor: AnchorContext;
}
