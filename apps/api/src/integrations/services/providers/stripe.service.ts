import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';

export interface StripeCredentials {
  secretKey: string;
  publishableKey?: string;
  webhookSecret?: string;
}

export interface StripeTestResult {
  success: boolean;
  message: string;
  accountId?: string;
  accountName?: string;
}

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);

  async testConnection(credentials: StripeCredentials): Promise<StripeTestResult> {
    try {
      if (!credentials.secretKey) {
        return { success: false, message: 'Secret key is required' };
      }

      const stripe = new Stripe(credentials.secretKey, {
        apiVersion: '2025-11-17.clover',
      });

      // Retrieve account info to validate credentials
      const account = await stripe.accounts.retrieve();

      this.logger.log(`Stripe connection test successful for account: ${account.id}`);

      return {
        success: true,
        message: `Connected to Stripe account: ${account.business_profile?.name || account.id}`,
        accountId: account.id,
        accountName: account.business_profile?.name || undefined,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Stripe connection test failed: ${message}`);

      // Provide more helpful error messages
      if (message.includes('Invalid API Key')) {
        return { success: false, message: 'Invalid API key. Check your secret key.' };
      }
      if (message.includes('api_key_expired')) {
        return { success: false, message: 'API key has expired. Generate a new key in Stripe dashboard.' };
      }

      return { success: false, message: `Connection failed: ${message}` };
    }
  }
}
