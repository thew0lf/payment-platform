import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface AuthorizeNetCredentials {
  apiLoginId: string;
  transactionKey: string;
  environment: 'sandbox' | 'production';
}

export interface AuthorizeNetTestResult {
  success: boolean;
  message: string;
}

@Injectable()
export class AuthorizeNetService {
  private readonly logger = new Logger(AuthorizeNetService.name);

  private getEndpoint(environment: string): string {
    return environment === 'production'
      ? 'https://api.authorize.net/xml/v1/request.api'
      : 'https://apitest.authorize.net/xml/v1/request.api';
  }

  async testConnection(credentials: AuthorizeNetCredentials): Promise<AuthorizeNetTestResult> {
    try {
      if (!credentials.apiLoginId || !credentials.transactionKey) {
        return { success: false, message: 'API Login ID and Transaction Key are required' };
      }

      const endpoint = this.getEndpoint(credentials.environment || 'sandbox');

      // Use getMerchantDetailsRequest to validate credentials
      const requestBody = {
        getMerchantDetailsRequest: {
          merchantAuthentication: {
            name: credentials.apiLoginId,
            transactionKey: credentials.transactionKey,
          },
        },
      };

      const response = await axios.post(endpoint, requestBody, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      });

      // Authorize.Net returns XML-like JSON response
      const data = response.data;

      // Check for success - resultCode will be "Ok" on success
      if (data.messages?.resultCode === 'Ok') {
        const merchantName = data.merchantName || 'Merchant';
        this.logger.log(`Authorize.Net connection test successful for: ${merchantName}`);
        return {
          success: true,
          message: `Connected to Authorize.Net: ${merchantName} (${credentials.environment})`,
        };
      }

      // Extract error message
      const errorMessage = data.messages?.message?.[0]?.text || 'Unknown error';
      const errorCode = data.messages?.message?.[0]?.code;

      // Common error codes
      if (errorCode === 'E00007') {
        return { success: false, message: 'Invalid API Login ID' };
      }
      if (errorCode === 'E00040') {
        return { success: false, message: 'Invalid Transaction Key' };
      }

      return { success: false, message: `Authorize.Net error: ${errorMessage}` };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Authorize.Net connection test failed: ${message}`);

      if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
        return { success: false, message: 'Connection timeout' };
      }

      return { success: false, message: `Connection failed: ${message}` };
    }
  }
}
