import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { BehavioralTriggersModule } from '../behavioral-triggers/triggers.module';
import { ContentGenerationService } from './content-generation.service';
import { ContentGenerationController } from './content-generation.controller';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ConfigModule,
    EventEmitterModule.forRoot(),
    BehavioralTriggersModule,
  ],
  controllers: [ContentGenerationController],
  providers: [ContentGenerationService],
  exports: [ContentGenerationService],
})
export class ContentGenerationModule {}
