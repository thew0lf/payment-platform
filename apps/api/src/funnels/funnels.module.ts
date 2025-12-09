import { Module, forwardRef } from '@nestjs/common';
import { FunnelsController, PublicFunnelController } from './funnels.controller';
import { FunnelTemplatesController } from './funnel-templates.controller';
import { FunnelInterventionsController } from './controllers/funnel-interventions.controller';
import { FunnelsService, FunnelSessionsService, FunnelAnalyticsService, FunnelTemplatesService } from './services';
import { FunnelPaymentService } from './services/funnel-payment.service';
import { FunnelPricingService } from './services/funnel-pricing.service';
import { FunnelInterventionsService } from './services/funnel-interventions.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CardVaultModule } from '../card-vault/card-vault.module';
import { PaymentsModule } from '../payments/payments.module';
import { OrdersModule } from '../orders/orders.module';
import { LeadsModule } from '../leads/leads.module';

@Module({
  imports: [
    PrismaModule,
    CardVaultModule,
    forwardRef(() => PaymentsModule),
    forwardRef(() => OrdersModule),
    LeadsModule,
  ],
  controllers: [FunnelsController, PublicFunnelController, FunnelTemplatesController, FunnelInterventionsController],
  providers: [FunnelsService, FunnelSessionsService, FunnelAnalyticsService, FunnelPaymentService, FunnelPricingService, FunnelTemplatesService, FunnelInterventionsService],
  exports: [FunnelsService, FunnelSessionsService, FunnelAnalyticsService, FunnelPaymentService, FunnelPricingService, FunnelTemplatesService, FunnelInterventionsService],
})
export class FunnelsModule {}
