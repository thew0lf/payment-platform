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

// DoDirectPayment interfaces
export interface PayPalCardInfo {
  cardNumber: string;
  expirationMonth: string;  // MM
  expirationYear: string;   // YYYY
  cvv: string;
  cardType?: 'Visa' | 'MasterCard' | 'Amex' | 'Discover' | 'Maestro';
}

export interface PayPalBillingAddress {
  firstName: string;
  lastName: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;  // 2-letter ISO code (US, CA, etc.)
  phone?: string;
  email?: string;
}

export interface PayPalShippingAddress {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
}

export interface PayPalPaymentRequest {
  amount: number;           // Total amount
  currencyCode: string;     // USD, EUR, etc.
  paymentAction?: 'Sale' | 'Authorization' | 'Order';  // Default: Sale
  card: PayPalCardInfo;
  billingAddress: PayPalBillingAddress;
  shippingAddress?: PayPalShippingAddress;
  invoiceId?: string;       // Merchant's invoice/order number
  description?: string;     // Payment description
  custom?: string;          // Custom field (max 256 chars)
  ipAddress?: string;       // Customer IP for fraud prevention
  itemAmount?: number;      // Subtotal before shipping/tax
  shippingAmount?: number;
  taxAmount?: number;
}

export interface PayPalPaymentResult {
  success: boolean;
  transactionId?: string;   // PayPal transaction ID
  correlationId?: string;   // PayPal correlation ID for support
  avsCode?: string;         // Address verification code
  cvv2Match?: string;       // CVV match result
  amount?: number;
  currencyCode?: string;
  paymentStatus?: string;
  pendingReason?: string;
  errorCode?: string;
  errorMessage?: string;
  rawResponse?: Record<string, string>;
}

export interface PayPalRefundRequest {
  transactionId: string;    // Original transaction to refund
  refundType: 'Full' | 'Partial';
  amount?: number;          // Required for partial refunds
  currencyCode?: string;    // Required for partial refunds
  memo?: string;            // Note about the refund
}

export interface PayPalRefundResult {
  success: boolean;
  refundTransactionId?: string;
  correlationId?: string;
  netRefundAmount?: number;
  feeRefundAmount?: number;
  grossRefundAmount?: number;
  currencyCode?: string;
  refundStatus?: string;
  pendingReason?: string;
  errorCode?: string;
  errorMessage?: string;
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

  /**
   * Process a credit card payment using DoDirectPayment API
   * This is the core method for charging cards through PayPal Classic NVP
   */
  async doDirectPayment(
    credentials: PayPalClassicCredentials,
    request: PayPalPaymentRequest,
  ): Promise<PayPalPaymentResult> {
    try {
      const endpoint = this.getEndpoint(credentials.environment || 'sandbox');

      // Build NVP parameters
      const params = new URLSearchParams({
        METHOD: 'DoDirectPayment',
        VERSION: '124.0',
        USER: credentials.apiUsername,
        PWD: credentials.apiPassword,
        SIGNATURE: credentials.apiSignature,
        PAYMENTACTION: request.paymentAction || 'Sale',

        // Amount details
        AMT: request.amount.toFixed(2),
        CURRENCYCODE: request.currencyCode,

        // Card info
        CREDITCARDTYPE: request.card.cardType || this.detectCardType(request.card.cardNumber),
        ACCT: request.card.cardNumber.replace(/\s/g, ''),  // Remove any spaces
        EXPDATE: `${request.card.expirationMonth}${request.card.expirationYear}`,
        CVV2: request.card.cvv,

        // Billing address (required)
        FIRSTNAME: request.billingAddress.firstName,
        LASTNAME: request.billingAddress.lastName,
        STREET: request.billingAddress.street1,
        CITY: request.billingAddress.city,
        STATE: request.billingAddress.state,
        ZIP: request.billingAddress.postalCode,
        COUNTRYCODE: request.billingAddress.countryCode,
      });

      // Optional billing fields
      if (request.billingAddress.street2) {
        params.append('STREET2', request.billingAddress.street2);
      }
      if (request.billingAddress.phone) {
        params.append('PHONENUM', request.billingAddress.phone);
      }
      if (request.billingAddress.email) {
        params.append('EMAIL', request.billingAddress.email);
      }

      // Optional shipping address
      if (request.shippingAddress) {
        params.append('SHIPTONAME', request.shippingAddress.name);
        params.append('SHIPTOSTREET', request.shippingAddress.street1);
        if (request.shippingAddress.street2) {
          params.append('SHIPTOSTREET2', request.shippingAddress.street2);
        }
        params.append('SHIPTOCITY', request.shippingAddress.city);
        params.append('SHIPTOSTATE', request.shippingAddress.state);
        params.append('SHIPTOZIP', request.shippingAddress.postalCode);
        params.append('SHIPTOCOUNTRY', request.shippingAddress.countryCode);
      }

      // Optional order details
      if (request.invoiceId) {
        params.append('INVNUM', request.invoiceId);
      }
      if (request.description) {
        params.append('DESC', request.description);
      }
      if (request.custom) {
        params.append('CUSTOM', request.custom);
      }
      if (request.ipAddress) {
        params.append('IPADDRESS', request.ipAddress);
      }

      // Optional amount breakdown
      if (request.itemAmount !== undefined) {
        params.append('ITEMAMT', request.itemAmount.toFixed(2));
      }
      if (request.shippingAmount !== undefined) {
        params.append('SHIPPINGAMT', request.shippingAmount.toFixed(2));
      }
      if (request.taxAmount !== undefined) {
        params.append('TAXAMT', request.taxAmount.toFixed(2));
      }

      this.logger.log(`Processing DoDirectPayment for ${request.amount} ${request.currencyCode}`);

      const response = await axios.post(endpoint, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 30000,  // 30 second timeout for payment
      });

      // Parse NVP response
      const result = this.parseNvpResponse(response.data);
      const ack = result.ACK;
      const transactionId = result.TRANSACTIONID;
      const correlationId = result.CORRELATIONID;

      if (ack === 'Success' || ack === 'SuccessWithWarning') {
        this.logger.log(`DoDirectPayment successful. Transaction ID: ${transactionId}`);
        return {
          success: true,
          transactionId,
          correlationId,
          avsCode: result.AVSCODE,
          cvv2Match: result.CVV2MATCH,
          amount: parseFloat(result.AMT || '0'),
          currencyCode: result.CURRENCYCODE,
          paymentStatus: result.PAYMENTSTATUS,
          pendingReason: result.PENDINGREASON,
          rawResponse: result,
        };
      }

      // Payment failed
      const errorCode = result.L_ERRORCODE0;
      const errorMessage = result.L_LONGMESSAGE0 || result.L_SHORTMESSAGE0 || 'Payment declined';
      this.logger.warn(`DoDirectPayment failed: ${errorCode} - ${errorMessage}`);

      return {
        success: false,
        correlationId,
        errorCode,
        errorMessage,
        rawResponse: result,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`DoDirectPayment exception: ${message}`);

      if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
        return { success: false, errorMessage: 'Payment request timed out. Please try again.' };
      }

      return { success: false, errorMessage: `Payment failed: ${message}` };
    }
  }

  /**
   * Refund a previous transaction using RefundTransaction API
   */
  async refundTransaction(
    credentials: PayPalClassicCredentials,
    request: PayPalRefundRequest,
  ): Promise<PayPalRefundResult> {
    try {
      const endpoint = this.getEndpoint(credentials.environment || 'sandbox');

      const params = new URLSearchParams({
        METHOD: 'RefundTransaction',
        VERSION: '124.0',
        USER: credentials.apiUsername,
        PWD: credentials.apiPassword,
        SIGNATURE: credentials.apiSignature,
        TRANSACTIONID: request.transactionId,
        REFUNDTYPE: request.refundType,
      });

      // Partial refund requires amount
      if (request.refundType === 'Partial') {
        if (!request.amount || !request.currencyCode) {
          return { success: false, errorMessage: 'Partial refund requires amount and currencyCode' };
        }
        params.append('AMT', request.amount.toFixed(2));
        params.append('CURRENCYCODE', request.currencyCode);
      }

      if (request.memo) {
        params.append('NOTE', request.memo);
      }

      this.logger.log(`Processing RefundTransaction for ${request.transactionId} (${request.refundType})`);

      const response = await axios.post(endpoint, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 30000,
      });

      const result = this.parseNvpResponse(response.data);
      const ack = result.ACK;
      const refundTransactionId = result.REFUNDTRANSACTIONID;
      const correlationId = result.CORRELATIONID;

      if (ack === 'Success' || ack === 'SuccessWithWarning') {
        this.logger.log(`RefundTransaction successful. Refund ID: ${refundTransactionId}`);
        return {
          success: true,
          refundTransactionId,
          correlationId,
          netRefundAmount: parseFloat(result.NETREFUNDAMT || '0'),
          feeRefundAmount: parseFloat(result.FEEREFUNDAMT || '0'),
          grossRefundAmount: parseFloat(result.GROSSREFUNDAMT || '0'),
          currencyCode: result.CURRENCYCODE,
          refundStatus: result.REFUNDSTATUS,
          pendingReason: result.PENDINGREASON,
        };
      }

      const errorCode = result.L_ERRORCODE0;
      const errorMessage = result.L_LONGMESSAGE0 || result.L_SHORTMESSAGE0 || 'Refund failed';
      this.logger.warn(`RefundTransaction failed: ${errorCode} - ${errorMessage}`);

      return {
        success: false,
        correlationId,
        errorCode,
        errorMessage,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`RefundTransaction exception: ${message}`);
      return { success: false, errorMessage: `Refund failed: ${message}` };
    }
  }

  /**
   * Get transaction details for a previous transaction
   */
  async getTransactionDetails(
    credentials: PayPalClassicCredentials,
    transactionId: string,
  ): Promise<{ success: boolean; details?: Record<string, string>; errorMessage?: string }> {
    try {
      const endpoint = this.getEndpoint(credentials.environment || 'sandbox');

      const params = new URLSearchParams({
        METHOD: 'GetTransactionDetails',
        VERSION: '124.0',
        USER: credentials.apiUsername,
        PWD: credentials.apiPassword,
        SIGNATURE: credentials.apiSignature,
        TRANSACTIONID: transactionId,
      });

      const response = await axios.post(endpoint, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 15000,
      });

      const result = this.parseNvpResponse(response.data);
      const ack = result.ACK;

      if (ack === 'Success' || ack === 'SuccessWithWarning') {
        return { success: true, details: result };
      }

      const errorMessage = result.L_LONGMESSAGE0 || result.L_SHORTMESSAGE0 || 'Failed to get transaction details';
      return { success: false, errorMessage };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, errorMessage: message };
    }
  }

  /**
   * Parse PayPal NVP response string into object
   */
  private parseNvpResponse(nvpString: string): Record<string, string> {
    const result: Record<string, string> = {};
    const pairs = nvpString.split('&');
    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      if (key) {
        result[key] = decodeURIComponent(value || '');
      }
    }
    return result;
  }

  /**
   * Detect card type from card number
   */
  private detectCardType(cardNumber: string): string {
    const cleanNumber = cardNumber.replace(/\D/g, '');

    if (/^4/.test(cleanNumber)) return 'Visa';
    if (/^5[1-5]/.test(cleanNumber)) return 'MasterCard';
    if (/^3[47]/.test(cleanNumber)) return 'Amex';
    if (/^6(?:011|5)/.test(cleanNumber)) return 'Discover';
    if (/^(?:5018|5020|5038|6304|6759|676[1-3])/.test(cleanNumber)) return 'Maestro';

    return 'Visa';  // Default fallback
  }
}
