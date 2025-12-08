import { Module } from '@nestjs/common';
import { AddressController } from './address.controller';
import { AddressService } from './address.service';
import { PrismaModule } from '../prisma/prisma.module';
import { IntegrationsModule } from '../integrations';

@Module({
  imports: [PrismaModule, IntegrationsModule],
  controllers: [AddressController],
  providers: [AddressService],
  exports: [AddressService],
})
export class AddressModule {}
