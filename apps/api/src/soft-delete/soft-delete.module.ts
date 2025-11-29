import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SoftDeleteController } from './soft-delete.controller';
import { SoftDeleteService } from './soft-delete.service';
import { RetentionPurgeJob } from './retention-purge.job';
import { PrismaModule } from '../prisma/prisma.module';
import { HierarchyModule } from '../hierarchy/hierarchy.module';

@Module({
  imports: [
    PrismaModule,
    HierarchyModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [SoftDeleteController],
  providers: [SoftDeleteService, RetentionPurgeJob],
  exports: [SoftDeleteService],
})
export class SoftDeleteModule {}
