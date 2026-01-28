import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProductRecommendationService } from './services/product-recommendation.service';
import { RecommendationsController } from './controllers/recommendations.controller';

@Module({
  imports: [PrismaModule],
  controllers: [RecommendationsController],
  providers: [ProductRecommendationService],
  exports: [ProductRecommendationService],
})
export class RecommendationsModule {}
