import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { OrdersController } from './orders.controller';
import { PublicOrdersController } from './controllers/public-orders.controller';
import { OrdersService } from './services/orders.service';
import { OrderNumberService } from './services/order-number.service';
import { PrismaModule } from '../prisma/prisma.module';
import { HierarchyModule } from '../hierarchy/hierarchy.module';

@Module({
  imports: [PrismaModule, EventEmitterModule.forRoot(), HierarchyModule],
  controllers: [OrdersController, PublicOrdersController],
  providers: [OrdersService, OrderNumberService],
  exports: [OrdersService, OrderNumberService],
})
export class OrdersModule {}
