import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from '../prisma/prisma.module';
import { HierarchyModule } from '../hierarchy/hierarchy.module';

// Controllers
import { ProductsController } from './products.controller';
import { CategoryController } from './controllers/category.controller';
import { TagController } from './controllers/tag.controller';
import { CollectionController } from './controllers/collection.controller';

// Services
import { ProductsService } from './services/products.service';
import { CategoryService } from './services/category.service';
import { TagService } from './services/tag.service';
import { CollectionService } from './services/collection.service';

@Module({
  imports: [PrismaModule, EventEmitterModule.forRoot(), HierarchyModule],
  controllers: [
    // More specific routes must come FIRST to avoid being caught by :id param
    CategoryController,
    TagController,
    CollectionController,
    ProductsController,
  ],
  providers: [
    ProductsService,
    CategoryService,
    TagService,
    CollectionService,
  ],
  exports: [
    ProductsService,
    CategoryService,
    TagService,
    CollectionService,
  ],
})
export class ProductsModule {}
