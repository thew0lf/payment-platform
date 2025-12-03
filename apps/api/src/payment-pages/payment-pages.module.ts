import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import {
  PaymentPagesController,
  ThemesController,
  CheckoutController,
  DomainsController,
  InsightsController,
  ComplianceController,
} from './payment-pages.controller';
import {
  PaymentPagesService,
  ThemesService,
  SessionsService,
  DomainsService,
  InsightsService,
  PciComplianceService,
} from './services';
import {
  GatewayFactory,
  PaymentGatewayService,
} from './gateways';

@Module({
  imports: [PrismaModule],
  controllers: [
    PaymentPagesController,
    ThemesController,
    CheckoutController,
    DomainsController,
    InsightsController,
    ComplianceController,
  ],
  providers: [
    PaymentPagesService,
    ThemesService,
    SessionsService,
    DomainsService,
    InsightsService,
    PciComplianceService,
    GatewayFactory,
    PaymentGatewayService,
  ],
  exports: [
    PaymentPagesService,
    ThemesService,
    SessionsService,
    DomainsService,
    InsightsService,
    PciComplianceService,
    GatewayFactory,
    PaymentGatewayService,
  ],
})
export class PaymentPagesModule {}
