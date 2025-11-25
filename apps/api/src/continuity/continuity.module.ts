import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ContinuityController } from './continuity.controller';
import { ContinuityService } from './continuity.service';
import { TrustSignalService } from './trust-signal.service';
import { MomentumGuard } from './guards/momentum.guard';
import { FrictionInterceptor } from './interceptors/friction.interceptor';

/**
 * ContinuityModule
 *
 * Implements Chase Hughes' NCI (Non-Verbal Communication Influence)
 * and Engineered Reality principles for payment optimization.
 *
 * Features:
 * - Behavioral momentum tracking
 * - Trust signal management
 * - Friction calibration
 * - Cognitive continuity enforcement
 *
 * Usage:
 * Import this module in any feature module that requires
 * behavioral optimization for payment flows.
 */
@Module({
  imports: [EventEmitterModule.forRoot()],
  controllers: [ContinuityController],
  providers: [
    ContinuityService,
    TrustSignalService,
    MomentumGuard,
    FrictionInterceptor,
  ],
  exports: [
    ContinuityService,
    TrustSignalService,
    MomentumGuard,
    FrictionInterceptor,
  ],
})
export class ContinuityModule {}
