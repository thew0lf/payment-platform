import { Module } from '@nestjs/common';
import { CrossSiteSessionService } from './services/cross-site-session.service';
import {
  CrossSiteSessionController,
  PublicCrossSiteSessionController,
} from './controllers/cross-site-session.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { CartModule } from '../cart/cart.module';
import { WishlistModule } from '../wishlist/wishlist.module';
import { ComparisonModule } from '../comparison/comparison.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    AuditLogsModule,
    CartModule,
    WishlistModule,
    ComparisonModule,
  ],
  controllers: [CrossSiteSessionController, PublicCrossSiteSessionController],
  providers: [CrossSiteSessionService],
  exports: [CrossSiteSessionService],
})
export class CrossSiteSessionModule {}
