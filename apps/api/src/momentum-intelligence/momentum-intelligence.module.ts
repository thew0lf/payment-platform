import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { MomentumIntelligenceController } from './momentum-intelligence.controller';
import { IntentDetectionService } from './intent-detection/intent-detection.service';
import { CustomerSaveService } from './customer-save/customer-save.service';
import { VoiceAIService } from './voice-ai/voice-ai.service';
import { ContentGenerationService } from './content-generation/content-generation.service';
import { TriggerLibraryService } from './behavioral-triggers/trigger-library.service';
import { UpsellService } from './upsell/upsell.service';
import { UpsellController } from './upsell/upsell.controller';
import { AnalyticsService } from './analytics/analytics.service';
import { AnalyticsController } from './analytics/analytics.controller';
import { DeliveryService } from './delivery/delivery.service';
import { AutomationService } from './delivery/automation.service';
import { DeliveryController } from './delivery/delivery.controller';
import { EmailProvider } from './delivery/providers/email.provider';
import { SmsProvider } from './delivery/providers/sms.provider';
import { PushProvider } from './delivery/providers/push.provider';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ConfigModule,
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
  ],
  controllers: [MomentumIntelligenceController, UpsellController, DeliveryController, AnalyticsController],
  providers: [
    IntentDetectionService,
    CustomerSaveService,
    VoiceAIService,
    ContentGenerationService,
    TriggerLibraryService,
    UpsellService,
    AnalyticsService,
    DeliveryService,
    AutomationService,
    EmailProvider,
    SmsProvider,
    PushProvider,
  ],
  exports: [
    IntentDetectionService,
    CustomerSaveService,
    VoiceAIService,
    ContentGenerationService,
    UpsellService,
    AnalyticsService,
    DeliveryService,
    AutomationService,
  ],
})
export class MomentumIntelligenceModule {}
