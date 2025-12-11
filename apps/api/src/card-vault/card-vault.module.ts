import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { IntegrationsModule } from '../integrations';
import { CardVaultService } from './services/card-vault.service';
import { CardVaultPublicController } from './controllers/card-vault-public.controller';

@Module({
  imports: [PrismaModule, IntegrationsModule],
  controllers: [CardVaultPublicController],
  providers: [CardVaultService],
  exports: [CardVaultService],
})
export class CardVaultModule {}
