import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
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
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { ReviewsModule } from './reviews/reviews.module';
import { LandingPagesModule } from './landing-pages/landing-pages.module';
import { PaymentPagesModule } from './payment-pages/payment-pages.module';
import { FunnelsModule } from './funnels/funnels.module';
import { FeaturesModule } from './features/features.module';
import { LeadsModule } from './leads/leads.module';
import { CardVaultModule } from './card-vault/card-vault.module';
import { SettingsModule } from './settings/settings.module';
import { AddressModule } from './address/address.module';
import { AIFunnelGeneratorModule } from './ai-funnel-generator/ai-funnel-generator.module';
import { EmailModule } from './email/email.module';
import { WaitlistModule } from './waitlist/waitlist.module';
import { ClientsModule } from './clients/clients.module';
import { CompaniesModule } from './companies/companies.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env.local', '.env'] }),
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
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
    SubscriptionsModule,
    ReviewsModule,
    LandingPagesModule,
    PaymentPagesModule,
    FunnelsModule,
    FeaturesModule,
    LeadsModule,
    CardVaultModule,
    SettingsModule,
    AddressModule,
    AIFunnelGeneratorModule,
    EmailModule,
    WaitlistModule,
    ClientsModule,
    CompaniesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
