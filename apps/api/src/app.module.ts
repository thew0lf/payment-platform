import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { HierarchyModule } from './hierarchy/hierarchy.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { PaymentsModule } from './payments/payments.module';
import { ContinuityModule } from './continuity';
import { MerchantAccountsModule } from './merchant-accounts/merchant-accounts.module';
import { AccountPoolsModule } from './account-pools/account-pools.module';
import { RoutingModule } from './routing/routing.module';
import { BillingModule } from './billing';
import { MomentumIntelligenceModule } from './momentum-intelligence/momentum-intelligence.module';
import { IntegrationsModule } from './integrations';
import { OrdersModule } from './orders/orders.module';
import { ProductsModule } from './products/products.module';
import { FulfillmentModule } from './fulfillment/fulfillment.module';
import { SoftDeleteModule } from './soft-delete/soft-delete.module';
import { InventoryModule } from './inventory/inventory.module';
import { RbacModule } from './rbac/rbac.module';
import { UsersModule } from './users/users.module';
import { VendorsModule } from './vendors/vendors.module';
import { RefundsModule } from './refunds/refunds.module';
import { CustomersModule } from './customers/customers.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { TransactionsModule } from './transactions/transactions.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env.local', '.env'] }),
    PrismaModule,
    CommonModule,
    AuthModule,
    HierarchyModule,
    DashboardModule,
    PaymentsModule,
    ContinuityModule,
    MerchantAccountsModule,
    AccountPoolsModule,
    RoutingModule,
    BillingModule,
    MomentumIntelligenceModule,
    IntegrationsModule,
    OrdersModule,
    ProductsModule,
    FulfillmentModule,
    SoftDeleteModule,
    InventoryModule,
    RbacModule,
    UsersModule,
    VendorsModule,
    RefundsModule,
    CustomersModule,
    AuditLogsModule,
    TransactionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
