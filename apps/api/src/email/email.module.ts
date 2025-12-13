// Email Module - SOC2/ISO27001 Compliant Email System
import { Module, Global } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailService } from './services/email.service';
import { TemplateRendererService } from './services/template-renderer.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [EmailService, TemplateRendererService],
  exports: [EmailService, TemplateRendererService],
})
export class EmailModule {}
