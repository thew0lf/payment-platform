import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { FulfillmentController } from './fulfillment.controller';
import { ShipmentsService } from './services/shipments.service';
import { PrismaModule } from '../prisma/prisma.module';
import { OrdersModule } from '../orders/orders.module';
import { HierarchyModule } from '../hierarchy/hierarchy.module';

@Module({
  imports: [PrismaModule, EventEmitterModule.forRoot(), OrdersModule, HierarchyModule],
  controllers: [FulfillmentController],
  providers: [ShipmentsService],
  exports: [ShipmentsService],
})
export class FulfillmentModule {}
