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
import { HierarchyModule } from '../hierarchy/hierarchy.module';

@Module({
  imports: [
    EventEmitterModule.forRoot({ wildcard: true, delimiter: '.', maxListeners: 20 }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        // Support both REDIS_URL and separate HOST/PORT
        const redisUrl = configService.get<string>('REDIS_URL');
        if (redisUrl) {
          const url = new URL(redisUrl);
          return {
            redis: {
              host: url.hostname,
              port: parseInt(url.port || '6379', 10),
            },
          };
        }
        return {
          redis: {
            host: configService.get('REDIS_HOST', 'localhost'),
            port: configService.get('REDIS_PORT', 6379),
          },
        };
      },
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
    HierarchyModule, // For RBAC access validation
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
