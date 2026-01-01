import { Module } from '@nestjs/common';
import { CartService } from './services/cart.service';
import { CartController, PublicCartController } from './controllers/cart.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [PrismaModule, AuditLogsModule],
  controllers: [CartController, PublicCartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
