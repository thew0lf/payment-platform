/**
 * Affiliates Module
 *
 * Handles affiliate partner management, click tracking, conversions, and payouts.
 * Provides public endpoints for click redirect and postback, and admin endpoints
 * for managing the affiliate program.
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { HierarchyModule } from '../hierarchy/hierarchy.module';
import { CommonModule } from '../common/common.module';

// Services
import { AffiliatePartnersService } from './services/affiliate-partners.service';
import { AffiliateLinksService } from './services/affiliate-links.service';
import { AffiliateTrackingService } from './services/affiliate-tracking.service';
import { AffiliateConversionsService } from './services/affiliate-conversions.service';
import { AffiliatePayoutsService } from './services/affiliate-payouts.service';
import { AffiliateAnalyticsService } from './services/affiliate-analytics.service';
import { AffiliateApplicationService } from './services/affiliate-application.service';
import { AffiliateClicksService } from './services/affiliate-clicks.service';
import { AffiliatePartnershipsService } from './services/affiliate-partnerships.service';
import { AffiliateReportsService } from './services/affiliate-reports.service';
import { ClickQueueService } from './services/click-queue.service';

// Controllers
import { AffiliatesController } from './affiliates.controller';
import { AffiliatePublicController } from './controllers/affiliate-public.controller';
import { AffiliatePostbackController } from './controllers/affiliate-postback.controller';
import { AffiliateApplicationsController } from './controllers/affiliate-applications.controller';
import { AffiliatePortalController } from './controllers/affiliate-portal.controller';
import { AffiliatePayoutsController } from './controllers/affiliate-payouts.controller';
import { AffiliateLinksController } from './controllers/affiliate-links.controller';
import { AffiliateConversionsController } from './controllers/affiliate-conversions.controller';
import { AffiliateClicksController } from './controllers/affiliate-clicks.controller';
import { AffiliatePartnershipsController } from './controllers/affiliate-partnerships.controller';
import { AffiliateReportsController } from './controllers/affiliate-reports.controller';
import { PublicAffiliatesController } from './public-affiliates.controller';

@Module({
  imports: [
    PrismaModule,
    EmailModule,
    AuditLogsModule,
    HierarchyModule,
    CommonModule,
  ],
  controllers: [
    AffiliatesController,
    AffiliatePublicController,
    AffiliatePostbackController,
    AffiliateApplicationsController,
    AffiliatePortalController,
    AffiliatePayoutsController,
    AffiliateLinksController,
    AffiliateConversionsController,
    AffiliateClicksController,
    AffiliatePartnershipsController,
    AffiliateReportsController,
    PublicAffiliatesController,
  ],
  providers: [
    AffiliatePartnersService,
    AffiliatePartnershipsService,
    AffiliateLinksService,
    AffiliateTrackingService,
    AffiliateConversionsService,
    AffiliatePayoutsService,
    AffiliateAnalyticsService,
    AffiliateApplicationService,
    AffiliateClicksService,
    ClickQueueService,
  ],
  exports: [
    AffiliatePartnersService,
    AffiliatePartnershipsService,
    AffiliateLinksService,
    AffiliateTrackingService,
    AffiliateConversionsService,
    AffiliatePayoutsService,
    AffiliateAnalyticsService,
    AffiliateApplicationService,
    AffiliateClicksService,
    ClickQueueService,
  ],
})
export class AffiliatesModule {}
