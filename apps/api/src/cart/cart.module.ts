import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { CartService } from './services/cart.service';
import { PromotionService } from './services/promotion.service';
import { TaxService } from './services/tax.service';
import { ShippingService } from './services/shipping.service';
import { CartAbandonmentService } from './services/cart-abandonment.service';
import { CartSyncService } from './services/cart-sync.service';
import { CartUpsellService } from './services/cart-upsell.service';
import { ExpressCheckoutService } from './services/express-checkout.service';
import { InventoryHoldService } from './services/inventory-hold.service';
import { CompanyCartSettingsService } from './services/company-cart-settings.service';
import { CartController, PublicCartController } from './controllers/cart.controller';
import { CartAdminController } from './controllers/cart-admin.controller';
import { CartSettingsController } from './controllers/cart-settings.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { OrdersModule } from '../orders/orders.module';
import { HierarchyModule } from '../hierarchy/hierarchy.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    PrismaModule,
    AuditLogsModule,
    OrdersModule,
    HierarchyModule,
    forwardRef(() => EmailModule),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        name: 'cart',
        ttl: 60000, // 1 minute
        limit: 120, // 120 requests per minute for authenticated endpoints (default)
      },
    ]),
  ],
  controllers: [CartController, PublicCartController, CartAdminController, CartSettingsController],
  providers: [
    CartService,
    PromotionService,
    TaxService,
    ShippingService,
    CartAbandonmentService,
    CartSyncService,
    CartUpsellService,
    ExpressCheckoutService,
    InventoryHoldService,
    CompanyCartSettingsService,
  ],
  exports: [
    CartService,
    PromotionService,
    TaxService,
    ShippingService,
    CartAbandonmentService,
    CartSyncService,
    CartUpsellService,
    ExpressCheckoutService,
    InventoryHoldService,
    CompanyCartSettingsService,
  ],
})
export class CartModule {}
