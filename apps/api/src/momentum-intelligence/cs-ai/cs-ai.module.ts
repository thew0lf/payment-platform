import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { CSAIController } from './cs-ai.controller';
import { CustomerServiceService } from '../customer-service/customer-service.service';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    EventEmitterModule.forRoot(),
  ],
  controllers: [CSAIController],
  providers: [CustomerServiceService],
  exports: [CustomerServiceService],
})
export class CSAIModule {}
