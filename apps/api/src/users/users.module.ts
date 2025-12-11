import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { ProfileController } from './controllers/profile.controller';
import { UsersService } from './services/users.service';
import { PrismaModule } from '../prisma/prisma.module';
import { HierarchyModule } from '../hierarchy/hierarchy.module';

@Module({
  imports: [PrismaModule, HierarchyModule],
  controllers: [UsersController, ProfileController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
