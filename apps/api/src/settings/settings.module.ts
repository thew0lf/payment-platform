import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { CompanyBrandKitController } from './controllers/company-brand-kit.controller';
import { CompanyBrandKitService } from './services/company-brand-kit.service';
import { PrismaModule } from '../prisma/prisma.module';
import { HierarchyModule } from '../hierarchy/hierarchy.module';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [PrismaModule, HierarchyModule, IntegrationsModule],
  controllers: [SettingsController, CompanyBrandKitController],
  providers: [SettingsService, CompanyBrandKitService],
  exports: [SettingsService, CompanyBrandKitService],
})
export class SettingsModule {}
