import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { HierarchyModule } from '../../hierarchy/hierarchy.module';
import { TermsService } from './terms.service';
import { TermsController } from './terms.controller';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    HierarchyModule,
    EventEmitterModule.forRoot(),
  ],
  controllers: [TermsController],
  providers: [TermsService],
  exports: [TermsService],
})
export class TermsModule {}
