import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { CustomerServiceService } from './customer-service.service';
import { CustomerServiceController } from './customer-service.controller';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    EventEmitterModule.forRoot(),
  ],
  controllers: [CustomerServiceController],
  providers: [CustomerServiceService],
  exports: [CustomerServiceService],
})
export class CustomerServiceModule {}
