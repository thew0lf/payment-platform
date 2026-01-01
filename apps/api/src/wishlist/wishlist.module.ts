import { Module } from '@nestjs/common';
import { WishlistService } from './services/wishlist.service';
import { WishlistController, PublicWishlistController } from './controllers/wishlist.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [PrismaModule, AuthModule, AuditLogsModule],
  controllers: [WishlistController, PublicWishlistController],
  providers: [WishlistService],
  exports: [WishlistService],
})
export class WishlistModule {}
