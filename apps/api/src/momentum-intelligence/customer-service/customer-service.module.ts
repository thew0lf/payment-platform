import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { HierarchyModule } from '../../hierarchy/hierarchy.module';
import { IntegrationsModule } from '../../integrations/integrations.module';
import { CustomerServiceService } from './customer-service.service';
import { CustomerServiceController } from './customer-service.controller';
import { PublicCSController } from './public-cs.controller';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    HierarchyModule,
    IntegrationsModule,
    EventEmitterModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60000,
        limit: 30,
      },
      {
        name: 'long',
        ttl: 3600000,
        limit: 100,
      },
    ]),
  ],
  controllers: [CustomerServiceController, PublicCSController],
  providers: [CustomerServiceService],
  exports: [CustomerServiceService],
})
export class CustomerServiceModule {}
