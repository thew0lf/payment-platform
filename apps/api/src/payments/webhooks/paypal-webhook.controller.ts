/**
 * PayPal Webhook Controller
 *
 * Endpoint: POST /api/webhooks/paypal
 *
 * This controller receives incoming webhooks from PayPal for:
 * - Subscription lifecycle events (created, activated, cancelled, etc.)
 * - Payment events (completed, refunded, reversed)
 * - Dispute events
 */

import {
  Controller,
  Post,
  Req,
  Res,
  Headers,
  RawBodyRequest,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PayPalWebhookService, PayPalWebhookEvent } from './paypal-webhook.service';

@Controller('webhooks/paypal')
export class PayPalWebhookController {
  private readonly logger = new Logger(PayPalWebhookController.name);

  constructor(private readonly webhookService: PayPalWebhookService) {}

  /**
   * Handle incoming PayPal webhook
   *
   * PayPal requires:
   * - 200 OK response within 30 seconds
   * - Signature verification for production
   */
  @Post()
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
    @Headers() headers: Record<string, string>,
  ): Promise<void> {
    const rawBody = req.rawBody?.toString('utf-8') || '';

    try {
      // Parse the webhook event
      const event: PayPalWebhookEvent = JSON.parse(rawBody);

      this.logger.log(`Received PayPal webhook: ${event.event_type} (${event.id})`);

      // Process the webhook asynchronously
      // Return 200 immediately to meet PayPal's timeout requirement
      setImmediate(async () => {
        try {
          await this.webhookService.handleWebhook(event, headers, rawBody);
        } catch (error) {
          this.logger.error(`Async webhook processing failed for ${event.id}:`, error);
        }
      });

      // Acknowledge receipt immediately
      res.status(HttpStatus.OK).json({
        received: true,
        eventId: event.id,
        eventType: event.event_type,
      });
    } catch (error) {
      this.logger.error('Failed to parse PayPal webhook:', error);
      res.status(HttpStatus.BAD_REQUEST).json({
        error: 'Invalid webhook payload',
        message: (error as Error).message,
      });
    }
  }

  /**
   * Health check endpoint for PayPal webhook configuration verification
   */
  @Post('verify')
  async verifyWebhook(@Res() res: Response): Promise<void> {
    res.status(HttpStatus.OK).json({
      status: 'ok',
      message: 'PayPal webhook endpoint is active',
      timestamp: new Date().toISOString(),
    });
  }
}
