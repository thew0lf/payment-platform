import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { CustomerSaveService } from './customer-save.service';
import { CustomerSaveController } from './customer-save.controller';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    EventEmitterModule.forRoot(),
  ],
  controllers: [CustomerSaveController],
  providers: [CustomerSaveService],
  exports: [CustomerSaveService],
})
export class CustomerSaveModule {}
