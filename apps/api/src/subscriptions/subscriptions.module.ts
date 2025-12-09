import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionPlanController } from './controllers/subscription-plan.controller';
import { SubscriptionTrialController } from './controllers/subscription-trial.controller';
import { SubscriptionRetentionController } from './controllers/subscription-retention.controller';
import { SubscriptionGiftingController } from './controllers/subscription-gifting.controller';
import { SubscriptionMultiProductController } from './controllers/subscription-multi-product.controller';
import { SubscriptionAIActionsController } from './controllers/subscription-ai-actions.controller';
import { SubscriptionIntelligenceController } from './controllers/subscription-intelligence.controller';
import { SubscriptionShippingController } from './controllers/subscription-shipping.controller';
import { SubscriptionNotificationsController } from './controllers/subscription-notifications.controller';
import { SubscriptionAnalyticsController } from './controllers/subscription-analytics.controller';
import { PublicSubscriptionController } from './controllers/public-subscription.controller';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionRebillService } from './services/subscription-rebill.service';
import { SubscriptionPlanService } from './services/subscription-plan.service';
import { SubscriptionTrialService } from './services/subscription-trial.service';
import { SubscriptionLifecycleService } from './services/subscription-lifecycle.service';
import { SubscriptionPricingService } from './services/subscription-pricing.service';
import { SubscriptionRetentionService } from './services/subscription-retention.service';
import { SubscriptionGiftingService } from './services/subscription-gifting.service';
import { SubscriptionMultiProductService } from './services/subscription-multi-product.service';
import { SubscriptionAIActionsService } from './services/subscription-ai-actions.service';
import { SubscriptionIntelligenceService } from './services/subscription-intelligence.service';
import { SubscriptionShippingService } from './services/subscription-shipping.service';
import { SubscriptionNotificationsService } from './services/subscription-notifications.service';
import { SubscriptionAnalyticsService } from './services/subscription-analytics.service';
import { PrismaModule } from '../prisma/prisma.module';
import { HierarchyModule } from '../hierarchy/hierarchy.module';
import { CommonModule } from '../common/common.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    PrismaModule,
    HierarchyModule,
    CommonModule,
    PaymentsModule,
    EventEmitterModule.forRoot({ wildcard: true, delimiter: '.', maxListeners: 20 }),
  ],
  controllers: [
    SubscriptionsController,
    SubscriptionPlanController,
    SubscriptionTrialController,
    SubscriptionRetentionController,
    SubscriptionGiftingController,
    SubscriptionMultiProductController,
    SubscriptionAIActionsController,
    SubscriptionIntelligenceController,
    SubscriptionShippingController,
    SubscriptionNotificationsController,
    SubscriptionAnalyticsController,
    PublicSubscriptionController,
  ],
  providers: [
    SubscriptionsService,
    SubscriptionRebillService,
    SubscriptionPlanService,
    SubscriptionTrialService,
    SubscriptionLifecycleService,
    SubscriptionPricingService,
    SubscriptionRetentionService,
    SubscriptionGiftingService,
    SubscriptionMultiProductService,
    SubscriptionAIActionsService,
    SubscriptionIntelligenceService,
    SubscriptionShippingService,
    SubscriptionNotificationsService,
    SubscriptionAnalyticsService,
  ],
  exports: [
    SubscriptionsService,
    SubscriptionRebillService,
    SubscriptionPlanService,
    SubscriptionTrialService,
    SubscriptionLifecycleService,
    SubscriptionPricingService,
    SubscriptionRetentionService,
    SubscriptionGiftingService,
    SubscriptionMultiProductService,
    SubscriptionAIActionsService,
    SubscriptionIntelligenceService,
    SubscriptionShippingService,
    SubscriptionNotificationsService,
    SubscriptionAnalyticsService,
  ],
})
export class SubscriptionsModule {}
