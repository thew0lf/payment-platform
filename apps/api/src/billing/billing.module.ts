import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuthModule } from '../auth/auth.module';
import { HierarchyModule } from '../hierarchy/hierarchy.module';
import { PricingPlanService } from './services/pricing-plan.service';
import { SubscriptionService } from './services/subscription.service';
import { UsageTrackingService } from './services/usage-tracking.service';
import { InvoiceService } from './services/invoice.service';
import { BillingController } from './billing.controller';

@Module({
  imports: [
    PrismaModule,
    EventEmitterModule.forRoot(),
    AuthModule,
    HierarchyModule,
  ],
  controllers: [BillingController],
  providers: [
    PricingPlanService,
    SubscriptionService,
    UsageTrackingService,
    InvoiceService,
  ],
  exports: [
    PricingPlanService,
    SubscriptionService,
    UsageTrackingService,
    InvoiceService,
  ],
})
export class BillingModule {}
