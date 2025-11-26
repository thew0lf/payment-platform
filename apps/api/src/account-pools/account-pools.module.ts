import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from '../prisma/prisma.module';
import { MerchantAccountsModule } from '../merchant-accounts/merchant-accounts.module';
import { AccountPoolService } from './services/account-pool.service';
import { AccountPoolsController } from './account-pools.controller';

@Module({
  imports: [
    PrismaModule,
    EventEmitterModule.forRoot(),
    MerchantAccountsModule,
  ],
  controllers: [AccountPoolsController],
  providers: [AccountPoolService],
  exports: [AccountPoolService],
})
export class AccountPoolsModule {}
