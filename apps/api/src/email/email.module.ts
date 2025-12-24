// Email Module - SOC2/ISO27001 Compliant Email System with SQS Queue
import { Module, Global, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { EmailService } from './services/email.service';
import { TemplateRendererService } from './services/template-renderer.service';
import { EmailQueueService } from './services/email-queue.service';
import { EmailQueueProcessorService } from './services/email-queue-processor.service';
import { EmailQueueController } from './controllers/email-queue.controller';

@Global()
@Module({
  imports: [
    PrismaModule,
    forwardRef(() => AuditLogsModule),
    forwardRef(() => IntegrationsModule),
  ],
  controllers: [EmailQueueController],
  providers: [
    EmailService,
    TemplateRendererService,
    EmailQueueService,
    EmailQueueProcessorService,
  ],
  exports: [
    EmailService,
    TemplateRendererService,
    EmailQueueService,
  ],
})
export class EmailModule {}
