import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ProductsController } from './products.controller';
import { ProductsService } from './services/products.service';
import { PrismaModule } from '../prisma/prisma.module';
import { HierarchyModule } from '../hierarchy/hierarchy.module';

@Module({
  imports: [PrismaModule, EventEmitterModule.forRoot(), HierarchyModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
