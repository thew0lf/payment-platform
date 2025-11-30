import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';

// Controllers
import { VendorController } from './controllers/vendor.controller';
import { VendorCompanyController } from './controllers/vendor-company.controller';
import { VendorConnectionController } from './controllers/vendor-connection.controller';
import { VendorProductController } from './controllers/vendor-product.controller';

// Services
import { VendorService } from './services/vendor.service';
import { VendorCompanyService } from './services/vendor-company.service';
import { VendorConnectionService } from './services/vendor-connection.service';
import { VendorProductService } from './services/vendor-product.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    VendorController,
    VendorCompanyController,
    VendorConnectionController,
    VendorProductController,
  ],
  providers: [
    VendorService,
    VendorCompanyService,
    VendorConnectionService,
    VendorProductService,
  ],
  exports: [
    VendorService,
    VendorCompanyService,
    VendorConnectionService,
    VendorProductService,
  ],
})
export class VendorsModule {}
