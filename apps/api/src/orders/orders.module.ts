import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { OrdersController } from './orders.controller';
import { OrdersService } from './services/orders.service';
import { OrderNumberService } from './services/order-number.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, EventEmitterModule.forRoot()],
  controllers: [OrdersController],
  providers: [OrdersService, OrderNumberService],
  exports: [OrdersService, OrderNumberService],
})
export class OrdersModule {}
