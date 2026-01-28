import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from '../prisma/prisma.module';
import { HierarchyModule } from '../hierarchy/hierarchy.module';
import { CartThemeService } from './services/cart-theme.service';
import { ProductCatalogService } from './services/product-catalog.service';
import { CartThemeController } from './controllers/cart-theme.controller';

@Module({
  imports: [
    PrismaModule,
    HierarchyModule,
    ThrottlerModule.forRoot([
      {
        name: 'cart-theme',
        ttl: 60000, // 1 minute
        limit: 120, // 120 requests per minute for authenticated endpoints (default)
      },
    ]),
  ],
  controllers: [CartThemeController],
  providers: [CartThemeService, ProductCatalogService],
  exports: [CartThemeService, ProductCatalogService],
})
export class CartThemeModule {}
