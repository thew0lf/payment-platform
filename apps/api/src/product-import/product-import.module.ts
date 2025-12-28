import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ProductImportController } from './controllers/product-import.controller';
import { ProductImportService } from './services/product-import.service';
import { FieldMappingService } from './services/field-mapping.service';
import { ImageImportService } from './services/image-import.service';
import { ImportEventService } from './services/import-event.service';
import { ProductImportProcessor } from './processors/product-import.processor';
import { PRODUCT_IMPORT_QUEUE } from './types/product-import.types';
import { IntegrationsModule } from '../integrations';

@Module({
  imports: [
    EventEmitterModule.forRoot({ wildcard: true, delimiter: '.', maxListeners: 20 }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: PRODUCT_IMPORT_QUEUE,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    }),
    IntegrationsModule,
  ],
  controllers: [ProductImportController],
  providers: [
    ProductImportService,
    FieldMappingService,
    ImageImportService,
    ImportEventService,
    ProductImportProcessor,
  ],
  exports: [ProductImportService, FieldMappingService, ImageImportService, ImportEventService],
})
export class ProductImportModule {}
