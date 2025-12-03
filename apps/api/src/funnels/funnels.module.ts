import { Module } from '@nestjs/common';
import { FunnelsController, PublicFunnelController } from './funnels.controller';
import { FunnelsService, FunnelSessionsService, FunnelAnalyticsService } from './services';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FunnelsController, PublicFunnelController],
  providers: [FunnelsService, FunnelSessionsService, FunnelAnalyticsService],
  exports: [FunnelsService, FunnelSessionsService, FunnelAnalyticsService],
})
export class FunnelsModule {}
