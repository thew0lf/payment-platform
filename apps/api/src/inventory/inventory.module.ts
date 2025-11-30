import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { HierarchyModule } from '../hierarchy/hierarchy.module';

import { InventoryLocationService } from './services/inventory-location.service';
import { InventoryLevelService } from './services/inventory-level.service';

import { InventoryLocationController } from './controllers/inventory-location.controller';
import { InventoryLevelController } from './controllers/inventory-level.controller';

@Module({
  imports: [PrismaModule, HierarchyModule],
  controllers: [InventoryLocationController, InventoryLevelController],
  providers: [InventoryLocationService, InventoryLevelService],
  exports: [InventoryLocationService, InventoryLevelService],
})
export class InventoryModule {}
