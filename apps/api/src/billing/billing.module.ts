import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuthModule } from '../auth/auth.module';
import { HierarchyModule } from '../hierarchy/hierarchy.module';
import { PricingPlanService } from './services/pricing-plan.service';
import { SubscriptionService } from './services/subscription.service';
import { UsageTrackingService } from './services/usage-tracking.service';
import { InvoiceService } from './services/invoice.service';
import { StripeBillingService } from './services/stripe-billing.service';
import { BillingController } from './billing.controller';
import { StripeWebhookController } from './stripe-webhook.controller';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    EventEmitterModule.forRoot(),
    AuthModule,
    HierarchyModule,
  ],
  controllers: [BillingController, StripeWebhookController],
  providers: [
    PricingPlanService,
    SubscriptionService,
    UsageTrackingService,
    InvoiceService,
    StripeBillingService,
  ],
  exports: [
    PricingPlanService,
    SubscriptionService,
    UsageTrackingService,
    InvoiceService,
    StripeBillingService,
  ],
})
export class BillingModule {}
