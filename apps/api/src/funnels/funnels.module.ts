import { Module, forwardRef } from '@nestjs/common';
import { FunnelsController, PublicFunnelController } from './funnels.controller';
import { FunnelTemplatesController } from './funnel-templates.controller';
import { FunnelInterventionsController } from './controllers/funnel-interventions.controller';
import { FunnelLogoController } from './controllers/funnel-logo.controller';
import { BrandKitController } from './controllers/brand-kit.controller';
import { FunnelsService, FunnelSessionsService, FunnelAnalyticsService, FunnelTemplatesService } from './services';
import { FunnelPaymentService } from './services/funnel-payment.service';
import { FunnelPricingService } from './services/funnel-pricing.service';
import { FunnelInterventionsService } from './services/funnel-interventions.service';
import { FunnelImageService } from './services/funnel-image.service';
import { FunnelVideoService } from './services/funnel-video.service';
import { FunnelLogoService } from './services/funnel-logo.service';
import { BrandKitService } from './services/brand-kit.service';
import { PrismaModule } from '../prisma/prisma.module';
import { HierarchyModule } from '../hierarchy/hierarchy.module';
import { CardVaultModule } from '../card-vault/card-vault.module';
import { PaymentsModule } from '../payments/payments.module';
import { OrdersModule } from '../orders/orders.module';
import { LeadsModule } from '../leads/leads.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [
    PrismaModule,
    HierarchyModule,
    CardVaultModule,
    IntegrationsModule,
    AuditLogsModule,
    forwardRef(() => PaymentsModule),
    forwardRef(() => OrdersModule),
    LeadsModule,
  ],
  controllers: [FunnelsController, PublicFunnelController, FunnelTemplatesController, FunnelInterventionsController, FunnelLogoController, BrandKitController],
  providers: [FunnelsService, FunnelSessionsService, FunnelAnalyticsService, FunnelPaymentService, FunnelPricingService, FunnelTemplatesService, FunnelInterventionsService, FunnelImageService, FunnelVideoService, FunnelLogoService, BrandKitService],
  exports: [FunnelsService, FunnelSessionsService, FunnelAnalyticsService, FunnelPaymentService, FunnelPricingService, FunnelTemplatesService, FunnelInterventionsService, FunnelImageService, FunnelVideoService, FunnelLogoService, BrandKitService],
})
export class FunnelsModule {}
