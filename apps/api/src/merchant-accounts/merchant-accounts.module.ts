import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from '../prisma/prisma.module';
import { MerchantAccountService } from './services/merchant-account.service';
import { MerchantAccountsController } from './merchant-accounts.controller';

@Module({
  imports: [
    PrismaModule,
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
  ],
  controllers: [MerchantAccountsController],
  providers: [MerchantAccountService],
  exports: [MerchantAccountService],
})
export class MerchantAccountsModule {}
