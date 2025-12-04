import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface PayPalClassicCredentials {
  apiUsername: string;      // API Username
  apiPassword: string;      // API Password
  apiSignature: string;     // API Signature
  environment?: 'sandbox' | 'production';
}

export interface PayPalClassicTestResult {
  success: boolean;
  message: string;
  correlationId?: string;
}

@Injectable()
export class PayPalClassicService {
  private readonly logger = new Logger(PayPalClassicService.name);

  private getEndpoint(environment: string): string {
    return environment === 'production'
      ? 'https://api-3t.paypal.com/nvp'
      : 'https://api-3t.sandbox.paypal.com/nvp';
  }

  async testConnection(credentials: PayPalClassicCredentials): Promise<PayPalClassicTestResult> {
    try {
      if (!credentials.apiUsername || !credentials.apiPassword || !credentials.apiSignature) {
        return { success: false, message: 'API Username, Password, and Signature are required' };
      }

      const endpoint = this.getEndpoint(credentials.environment || 'sandbox');

      // Use GetBalance API call to validate credentials
      const params = new URLSearchParams({
        METHOD: 'GetBalance',
        VERSION: '124.0',
        USER: credentials.apiUsername,
        PWD: credentials.apiPassword,
        SIGNATURE: credentials.apiSignature,
      });

      const response = await axios.post(endpoint, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000,
      });

      // Parse NVP response
      const result = new URLSearchParams(response.data);
      const ack = result.get('ACK');
      const correlationId = result.get('CORRELATIONID');

      if (ack === 'Success' || ack === 'SuccessWithWarning') {
        this.logger.log(`PayPal Classic connection test successful. Correlation ID: ${correlationId}`);
        return {
          success: true,
          message: `PayPal Classic credentials verified (${credentials.environment})`,
          correlationId: correlationId || undefined,
        };
      }

      const errorMsg = result.get('L_LONGMESSAGE0') || result.get('L_SHORTMESSAGE0') || 'Unknown error';
      return { success: false, message: `PayPal error: ${errorMsg}` };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`PayPal Classic connection test failed: ${message}`);

      if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
        return { success: false, message: 'Connection timeout. Check network or PayPal status.' };
      }

      return { success: false, message: `Connection failed: ${message}` };
    }
  }
}
