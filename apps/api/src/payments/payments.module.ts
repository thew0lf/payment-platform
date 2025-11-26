import { Module, Global } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule } from '@nestjs/config';
import { PaymentProviderFactory } from './providers/payment-provider.factory';
import { PaymentProcessingService } from './services/payment-processing.service';
import { TransactionLoggingService } from './services/transaction-logging.service';
import { PaymentsController } from './payments.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [ConfigModule, PrismaModule, EventEmitterModule.forRoot({ wildcard: true, delimiter: '.', newListener: false, removeListener: false, maxListeners: 20, verboseMemoryLeak: true, ignoreErrors: false })],
  controllers: [PaymentsController],
  providers: [PaymentProviderFactory, PaymentProcessingService, TransactionLoggingService],
  exports: [PaymentProviderFactory, PaymentProcessingService, TransactionLoggingService],
})
export class PaymentsModule {}
