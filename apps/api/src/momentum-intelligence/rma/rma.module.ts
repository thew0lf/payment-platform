import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { RMAService } from './rma.service';
import { RMAController } from './rma.controller';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    EventEmitterModule.forRoot(),
  ],
  controllers: [RMAController],
  providers: [RMAService],
  exports: [RMAService],
})
export class RMAModule {}
