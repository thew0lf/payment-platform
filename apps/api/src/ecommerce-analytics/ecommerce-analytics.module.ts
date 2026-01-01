import { Module } from '@nestjs/common';
import { EcommerceAnalyticsService } from './services/ecommerce-analytics.service';
import { EcommerceAnalyticsController } from './controllers/ecommerce-analytics.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { HierarchyModule } from '../hierarchy/hierarchy.module';

@Module({
  imports: [PrismaModule, HierarchyModule],
  controllers: [EcommerceAnalyticsController],
  providers: [EcommerceAnalyticsService],
  exports: [EcommerceAnalyticsService],
})
export class EcommerceAnalyticsModule {}
