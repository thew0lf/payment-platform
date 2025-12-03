import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { HierarchyModule } from '../hierarchy/hierarchy.module';
import { LandingPagesController } from './landing-pages.controller';
import { LandingPagesAdvancedController } from './landing-pages-advanced.controller';
import { LandingPagesService } from './services/landing-pages.service';
import { DeployService } from './services/deploy.service';
import { RendererService } from './services/renderer.service';
import { ABTestingService } from './services/ab-testing.service';
import { PopupsService } from './services/popups.service';
import { DynamicTextService } from './services/dynamic-text.service';
import { ConversionTrackingService } from './services/conversion-tracking.service';
import { StockImagesService } from './services/stock-images.service';
import { AIUsageService } from './services/ai-usage.service';
import { AIContentService } from './services/ai-content.service';
import { TemplateGalleryService } from './services/template-gallery.service';

@Module({
  imports: [PrismaModule, IntegrationsModule, HierarchyModule],
  controllers: [LandingPagesController, LandingPagesAdvancedController],
  providers: [
    LandingPagesService,
    DeployService,
    RendererService,
    ABTestingService,
    PopupsService,
    DynamicTextService,
    ConversionTrackingService,
    StockImagesService,
    AIUsageService,
    AIContentService,
    TemplateGalleryService,
  ],
  exports: [
    LandingPagesService,
    DeployService,
    RendererService,
    ABTestingService,
    PopupsService,
    DynamicTextService,
    ConversionTrackingService,
    StockImagesService,
    AIUsageService,
    AIContentService,
    TemplateGalleryService,
  ],
})
export class LandingPagesModule {}
