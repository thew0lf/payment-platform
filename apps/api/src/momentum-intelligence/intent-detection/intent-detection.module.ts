import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { EnhancedIntentDetectionService } from './enhanced-intent-detection.service';
import { ChurnPredictorService } from './churn-predictor.service';
import { IntentDetectionController } from './intent-detection.controller';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
  ],
  controllers: [IntentDetectionController],
  providers: [EnhancedIntentDetectionService, ChurnPredictorService],
  exports: [EnhancedIntentDetectionService, ChurnPredictorService],
})
export class IntentDetectionModule {}
