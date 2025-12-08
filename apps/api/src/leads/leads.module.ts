import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LeadsController } from './leads.controller';
import { LeadCaptureService } from './services/lead-capture.service';

@Module({
  imports: [PrismaModule],
  controllers: [LeadsController],
  providers: [LeadCaptureService],
  exports: [LeadCaptureService],
})
export class LeadsModule {}
