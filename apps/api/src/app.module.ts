import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { HierarchyModule } from './hierarchy/hierarchy.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { PaymentsModule } from './payments/payments.module';
import { ContinuityModule } from './continuity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env.local', '.env'] }),
    PrismaModule,
    AuthModule,
    HierarchyModule,
    DashboardModule,
    PaymentsModule,
    ContinuityModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
