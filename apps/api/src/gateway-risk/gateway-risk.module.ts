import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

// Services
import { GatewayPricingService } from './services/gateway-pricing.service';
import { GatewayTermsService } from './services/gateway-terms.service';
import { MerchantRiskProfileService } from './services/merchant-risk-profile.service';
import { RiskAssessmentService } from './services/risk-assessment.service';
import { ReserveService } from './services/reserve.service';
import { ChargebackService } from './services/chargeback.service';

// Controllers
import { GatewayPricingController } from './controllers/gateway-pricing.controller';
import { GatewayTermsController } from './controllers/gateway-terms.controller';
import { MerchantRiskController } from './controllers/merchant-risk.controller';
import { ReserveController } from './controllers/reserve.controller';
import { ChargebackController } from './controllers/chargeback.controller';

@Module({
  imports: [
    PrismaModule,
    AuditLogsModule,
    ThrottlerModule.forRoot([
      {
        name: 'gateway-risk',
        ttl: 60000, // 1 minute
        limit: 20, // 20 financial operations per minute (stricter for reserve/chargeback ops)
      },
    ]),
  ],
  controllers: [
    GatewayPricingController,
    GatewayTermsController,
    MerchantRiskController,
    ReserveController,
    ChargebackController,
  ],
  providers: [
    GatewayPricingService,
    GatewayTermsService,
    MerchantRiskProfileService,
    RiskAssessmentService,
    ReserveService,
    ChargebackService,
  ],
  exports: [
    GatewayPricingService,
    GatewayTermsService,
    MerchantRiskProfileService,
    RiskAssessmentService,
    ReserveService,
    ChargebackService,
  ],
})
export class GatewayRiskModule {}
