import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { IntegrationsModule } from '../integrations';
import { CardVaultService } from './services/card-vault.service';

@Module({
  imports: [PrismaModule, IntegrationsModule],
  providers: [CardVaultService],
  exports: [CardVaultService],
})
export class CardVaultModule {}
