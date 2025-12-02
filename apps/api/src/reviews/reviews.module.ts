import { Module } from '@nestjs/common';
import { ReviewsController } from './reviews.controller';
import { WidgetController } from './widget.controller';
import { ReviewsService } from './services/reviews.service';
import { ReviewConfigService } from './services/review-config.service';
import { PrismaModule } from '../prisma/prisma.module';
import { HierarchyModule } from '../hierarchy/hierarchy.module';

@Module({
  imports: [PrismaModule, HierarchyModule],
  controllers: [ReviewsController, WidgetController],
  providers: [ReviewsService, ReviewConfigService],
  exports: [ReviewsService, ReviewConfigService],
})
export class ReviewsModule {}
