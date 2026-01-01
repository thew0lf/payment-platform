import { Module } from '@nestjs/common';
import { ComparisonService } from './services/comparison.service';
import { ComparisonController, PublicComparisonController } from './controllers/comparison.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [PrismaModule, AuthModule, AuditLogsModule],
  controllers: [ComparisonController, PublicComparisonController],
  providers: [ComparisonService],
  exports: [ComparisonService],
})
export class ComparisonModule {}
