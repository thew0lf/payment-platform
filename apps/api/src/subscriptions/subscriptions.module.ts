import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionRebillService } from './services/subscription-rebill.service';
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
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, SubscriptionRebillService],
  exports: [SubscriptionsService, SubscriptionRebillService],
})
export class SubscriptionsModule {}
