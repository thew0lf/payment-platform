import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PrismaModule } from '../prisma/prisma.module';
import { HierarchyModule } from '../hierarchy/hierarchy.module';
import { IntegrationsModule } from '../integrations/integrations.module';

// Controllers
import { ProductsController } from './products.controller';
import { PublicProductsController } from './controllers/public-products.controller';
import { CategoryController } from './controllers/category.controller';
import { TagController } from './controllers/tag.controller';
import { CollectionController } from './controllers/collection.controller';
import { ProductMediaController } from './controllers/product-media.controller';
import { ProductAIController } from './controllers/product-ai.controller';
import { VariantOptionController } from './controllers/variant-option.controller';
import { ProductVariantController } from './controllers/product-variant.controller';
import { BundleController } from './controllers/bundle.controller';
import { MarketingVideoController } from './controllers/marketing-video.controller';
import { PriceRuleController } from './controllers/price-rule.controller';

// Services
import { ProductsService } from './services/products.service';
import { CategoryService } from './services/category.service';
import { TagService } from './services/tag.service';
import { CollectionService } from './services/collection.service';
import { ProductMediaService } from './services/product-media.service';
import { ProductAIService } from './services/product-ai.service';
import { VariantOptionService } from './services/variant-option.service';
import { ProductVariantService } from './services/product-variant.service';
import { BundleService } from './services/bundle.service';
import { MarketingVideoService } from './services/marketing-video.service';
import { PriceRuleService } from './services/price-rule.service';

@Module({
  imports: [
    PrismaModule,
    EventEmitterModule.forRoot(),
    HierarchyModule,
    IntegrationsModule,
    MulterModule.register({
      storage: memoryStorage(),
    }),
  ],
  controllers: [
    // More specific routes must come FIRST to avoid being caught by :id param
    PublicProductsController, // Public endpoints (no auth) - must be before ProductsController
    CategoryController,
    TagController,
    CollectionController,
    ProductMediaController,
    ProductAIController,
    VariantOptionController,
    ProductVariantController,
    BundleController,
    MarketingVideoController,
    PriceRuleController,
    ProductsController,
  ],
  providers: [
    ProductsService,
    CategoryService,
    TagService,
    CollectionService,
    ProductMediaService,
    ProductAIService,
    VariantOptionService,
    ProductVariantService,
    BundleService,
    MarketingVideoService,
    PriceRuleService,
  ],
  exports: [
    ProductsService,
    CategoryService,
    TagService,
    CollectionService,
    ProductMediaService,
    ProductAIService,
    VariantOptionService,
    ProductVariantService,
    BundleService,
    MarketingVideoService,
    PriceRuleService,
  ],
})
export class ProductsModule {}
