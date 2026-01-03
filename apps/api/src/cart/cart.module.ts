import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CartService } from './services/cart.service';
import { PromotionService } from './services/promotion.service';
import { TaxService } from './services/tax.service';
import { ShippingService } from './services/shipping.service';
import { CartAbandonmentService } from './services/cart-abandonment.service';
import { CartSyncService } from './services/cart-sync.service';
import { CartUpsellService } from './services/cart-upsell.service';
import { ExpressCheckoutService } from './services/express-checkout.service';
import { InventoryHoldService } from './services/inventory-hold.service';
import { CartController, PublicCartController } from './controllers/cart.controller';
import { CartAdminController } from './controllers/cart-admin.controller';
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
  ],
  controllers: [CartController, PublicCartController, CartAdminController],
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
  ],
})
export class CartModule {}
