import { Module } from '@nestjs/common';
import { FeaturesController } from './controllers/features.controller';
import { QAChecklistController } from './controllers/qa-checklist.controller';
import { CodeReviewChecklistController } from './controllers/code-review-checklist.controller';
import { FeaturesService } from './services/features.service';
import { FeatureSyncService } from './services/feature-sync.service';
import { QAChecklistService } from './services/qa-checklist.service';
import { CodeReviewChecklistService } from './services/code-review-checklist.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [PrismaModule, AuditLogsModule],
  controllers: [FeaturesController, QAChecklistController, CodeReviewChecklistController],
  providers: [FeaturesService, FeatureSyncService, QAChecklistService, CodeReviewChecklistService],
  exports: [FeaturesService, FeatureSyncService, QAChecklistService, CodeReviewChecklistService],
})
export class FeaturesModule {}
