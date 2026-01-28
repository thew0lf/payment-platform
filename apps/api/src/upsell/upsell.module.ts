import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { HierarchyModule } from '../hierarchy/hierarchy.module';
import { BulkDiscountService } from './services/bulk-discount.service';
import { SubscriptionIntelligenceService } from './services/subscription-intelligence.service';
import { UpsellTargetingService } from './services/upsell-targeting.service';
import { UpsellController } from './controllers/upsell.controller';
import { BulkDiscountController } from './controllers/bulk-discount.controller';

@Module({
  imports: [PrismaModule, HierarchyModule],
  controllers: [UpsellController, BulkDiscountController],
  providers: [
    BulkDiscountService,
    SubscriptionIntelligenceService,
    UpsellTargetingService,
  ],
  exports: [
    BulkDiscountService,
    SubscriptionIntelligenceService,
    UpsellTargetingService,
  ],
})
export class UpsellModule {}
