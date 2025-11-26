import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UpsellService } from './upsell.service';
import { UpsellController } from './upsell.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [UpsellController],
  providers: [UpsellService],
  exports: [UpsellService],
})
export class UpsellModule {}
