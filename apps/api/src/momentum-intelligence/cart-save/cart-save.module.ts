import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CartSaveService } from './cart-save.service';
import { CartSaveController } from './cart-save.controller';
import { CartRecoveryVoiceService } from './cart-recovery-voice.service';
import { CheckoutChurnDetectionService } from './checkout-churn-detection.service';
import { VoiceAIModule } from '../voice-ai/voice-ai.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => VoiceAIModule),
  ],
  controllers: [CartSaveController],
  providers: [
    CartSaveService,
    CartRecoveryVoiceService,
    CheckoutChurnDetectionService,
  ],
  exports: [
    CartSaveService,
    CartRecoveryVoiceService,
    CheckoutChurnDetectionService,
  ],
})
export class CartSaveModule {}
