import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from '../prisma/prisma.module';
import { HierarchyModule } from '../hierarchy/hierarchy.module';
import { OrdersModule } from '../orders/orders.module';
import { MerchantAccountService } from './services/merchant-account.service';
import { TestCheckoutService } from './services/test-checkout.service';
import { MerchantAccountsController } from './merchant-accounts.controller';

@Module({
  imports: [
    PrismaModule,
    HierarchyModule,
    OrdersModule,
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
  ],
  controllers: [MerchantAccountsController],
  providers: [MerchantAccountService, TestCheckoutService],
  exports: [MerchantAccountService, TestCheckoutService],
})
export class MerchantAccountsModule {}
