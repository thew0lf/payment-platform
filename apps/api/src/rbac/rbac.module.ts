import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { RbacController } from './rbac.controller';
import { PermissionService } from './services/permission.service';
import { RoleService } from './services/role.service';
import { PermissionGrantService } from './services/permission-grant.service';
import { SessionService } from './services/session.service';
import { PermissionGuard } from './guards/permission.guard';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [RbacController],
  providers: [
    PermissionService,
    RoleService,
    PermissionGrantService,
    SessionService,
    PermissionGuard,
  ],
  exports: [
    PermissionService,
    RoleService,
    PermissionGrantService,
    SessionService,
    PermissionGuard,
  ],
})
export class RbacModule {}
