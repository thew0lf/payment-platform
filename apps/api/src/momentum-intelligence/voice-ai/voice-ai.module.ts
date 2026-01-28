import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { IntegrationsModule } from '../../integrations/integrations.module';
import { HierarchyModule } from '../../hierarchy/hierarchy.module';
import { VoiceAIController } from './voice-ai.controller';
import { VoiceAIService } from './voice-ai.service';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    IntegrationsModule,
    HierarchyModule,
    EventEmitterModule.forRoot(),
  ],
  controllers: [VoiceAIController],
  providers: [VoiceAIService],
  exports: [VoiceAIService],
})
export class VoiceAIModule {}
