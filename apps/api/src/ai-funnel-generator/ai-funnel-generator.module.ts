import { Module } from '@nestjs/common';
import { AIFunnelGeneratorController } from './ai-funnel-generator.controller';
import { FunnelGeneratorService } from './services/funnel-generator.service';
import { PromptBuilderService } from './services/prompt-builder.service';
import { PrismaModule } from '../prisma/prisma.module';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [PrismaModule, IntegrationsModule],
  controllers: [AIFunnelGeneratorController],
  providers: [FunnelGeneratorService, PromptBuilderService],
  exports: [FunnelGeneratorService],
})
export class AIFunnelGeneratorModule {}
