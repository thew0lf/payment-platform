import { Module, Global } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { PaymentProviderFactory } from './providers/payment-provider.factory';
import { PaymentProcessingService } from './services/payment-processing.service';
import { TransactionLoggingService } from './services/transaction-logging.service';
import { PaymentsController } from './payments.controller';
import { PayPalWebhookController } from './webhooks/paypal-webhook.controller';
import { PayPalWebhookService } from './webhooks/paypal-webhook.service';
import { PrismaModule } from '../prisma/prisma.module';
import { HierarchyModule } from '../hierarchy/hierarchy.module';

@Global()
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    HierarchyModule,
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        timeout: 30000,
        maxRedirects: 5,
      }),
      inject: [ConfigService],
    }),
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 20,
      verboseMemoryLeak: true,
      ignoreErrors: false,
    }),
  ],
  controllers: [PaymentsController, PayPalWebhookController],
  providers: [
    PaymentProviderFactory,
    PaymentProcessingService,
    TransactionLoggingService,
    PayPalWebhookService,
  ],
  exports: [
    PaymentProviderFactory,
    PaymentProcessingService,
    TransactionLoggingService,
    PayPalWebhookService,
  ],
})
export class PaymentsModule {}
