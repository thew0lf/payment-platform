import { Module } from '@nestjs/common';
import { WaitlistService } from './waitlist.service';
import { WaitlistController, PublicWaitlistController } from './waitlist.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [WaitlistController, PublicWaitlistController],
  providers: [WaitlistService],
  exports: [WaitlistService],
})
export class WaitlistModule {}
