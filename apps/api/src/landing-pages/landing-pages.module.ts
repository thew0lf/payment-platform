import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { HierarchyModule } from '../hierarchy/hierarchy.module';
import { CartModule } from '../cart/cart.module';
import { LandingPagesController } from './landing-pages.controller';
import { LandingPagesAdvancedController } from './landing-pages-advanced.controller';
import { LandingPagePublicController } from './landing-page-public.controller';
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
import { LandingPageSessionService } from './services/landing-page-session.service';
import { LandingPageCartFacade } from './services/landing-page-cart.facade';

@Module({
  imports: [
    PrismaModule,
    IntegrationsModule,
    HierarchyModule,
    forwardRef(() => CartModule),
  ],
  controllers: [LandingPagesController, LandingPagesAdvancedController, LandingPagePublicController],
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
    LandingPageSessionService,
    LandingPageCartFacade,
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
    LandingPageSessionService,
    LandingPageCartFacade,
  ],
})
export class LandingPagesModule {}
