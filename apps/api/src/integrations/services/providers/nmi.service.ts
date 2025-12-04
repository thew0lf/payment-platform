import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface NMICredentials {
  securityKey: string;   // API Security Key
  environment?: 'sandbox' | 'production';
}

export interface NMITestResult {
  success: boolean;
  message: string;
}

@Injectable()
export class NMIService {
  private readonly logger = new Logger(NMIService.name);

  // NMI uses the same endpoint for both sandbox and production
  // The account type determines the environment
  private readonly endpoint = 'https://secure.nmi.com/api/transact.php';

  async testConnection(credentials: NMICredentials): Promise<NMITestResult> {
    try {
      if (!credentials.securityKey) {
        return { success: false, message: 'Security Key is required' };
      }

      // Use a validate request to test credentials
      // This performs a $0 auth that validates the API key without charging
      const params = new URLSearchParams({
        security_key: credentials.securityKey,
        type: 'validate',
        ccnumber: '4111111111111111',  // Test card
        ccexp: '1225',
        cvv: '999',
      });

      const response = await axios.post(this.endpoint, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000,
      });

      // Parse NMI response
      const result = new URLSearchParams(response.data);
      const responseCode = result.get('response');
      const responseText = result.get('responsetext');

      // Response code 1 = Approved, 2 = Declined, 3 = Error
      // For validate, we expect either 1 (approved) or specific decline codes
      // Authentication failures return response=3 with specific error text
      if (responseCode === '1') {
        this.logger.log('NMI connection test successful');
        return { success: true, message: 'NMI credentials verified successfully' };
      }

      // Check for authentication errors
      if (responseText?.toLowerCase().includes('authentication failed') ||
          responseText?.toLowerCase().includes('invalid security key')) {
        return { success: false, message: 'Invalid Security Key' };
      }

      // A decline on test card validation still means credentials work
      if (responseCode === '2') {
        this.logger.log('NMI connection test successful (test card declined as expected)');
        return { success: true, message: 'NMI credentials verified successfully' };
      }

      return { success: false, message: `NMI error: ${responseText || 'Unknown error'}` };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`NMI connection test failed: ${message}`);

      if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
        return { success: false, message: 'Connection timeout' };
      }

      return { success: false, message: `Connection failed: ${message}` };
    }
  }
}
