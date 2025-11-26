import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { RefundService } from './refund.service';
import { RefundController } from './refund.controller';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    EventEmitterModule.forRoot(),
  ],
  controllers: [RefundController],
  providers: [RefundService],
  exports: [RefundService],
})
export class RefundModule {}
