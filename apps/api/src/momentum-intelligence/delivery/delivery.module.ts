import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { DeliveryService } from './delivery.service';
import { AutomationService } from './automation.service';
import { DeliveryController } from './delivery.controller';
import { EmailProvider } from './providers/email.provider';
import { SmsProvider } from './providers/sms.provider';
import { PushProvider } from './providers/push.provider';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule, ScheduleModule.forRoot()],
  controllers: [DeliveryController],
  providers: [
    DeliveryService,
    AutomationService,
    EmailProvider,
    SmsProvider,
    PushProvider,
  ],
  exports: [DeliveryService, AutomationService],
})
export class DeliveryModule {}
