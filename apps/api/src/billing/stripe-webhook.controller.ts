import {
  Controller,
  Post,
  Headers,
  Req,
  Logger,
  BadRequestException,
  RawBodyRequest,
} from '@nestjs/common';
import { Request } from 'express';
import { StripeBillingService } from './services/stripe-billing.service';

@Controller('billing/webhooks')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(private readonly stripeBillingService: StripeBillingService) {}

  /**
   * Handle Stripe webhook events
   * NOTE: This endpoint requires raw body parsing for signature verification
   */
  @Post('stripe')
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<{ received: boolean }> {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException('No raw body available for webhook verification');
    }

    try {
      // Verify and construct the event
      const event = this.stripeBillingService.verifyWebhookSignature(rawBody, signature);

      // Handle the event
      await this.stripeBillingService.handleWebhookEvent(event);

      return { received: true };
    } catch (err) {
      this.logger.error(`Webhook signature verification failed: ${err instanceof Error ? err.message : String(err)}`);
      throw new BadRequestException('Webhook signature verification failed');
    }
  }
}
