import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { TriggerLibraryService } from './trigger-library.service';
import { TriggersController } from './triggers.controller';

@Module({
  imports: [AuthModule],
  controllers: [TriggersController],
  providers: [TriggerLibraryService],
  exports: [TriggerLibraryService],
})
export class BehavioralTriggersModule {}
