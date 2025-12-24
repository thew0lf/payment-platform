import { Module, forwardRef } from '@nestjs/common';
import { HierarchyController } from './hierarchy.controller';
import { HierarchyService } from './hierarchy.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [PrismaModule, forwardRef(() => AuditLogsModule)],
  controllers: [HierarchyController],
  providers: [HierarchyService],
  exports: [HierarchyService],
})
export class HierarchyModule {}
