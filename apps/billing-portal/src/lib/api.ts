import axios, { AxiosInstance } from 'axios';

/**
 * API Client for connecting to the Payment Platform
 * Handles all communication between Billing Portal and Payment Platform API
 */
class PaymentPlatformAPI {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for adding auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  private getAuthToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  }

  /**
   * Invoices API
   */
  async getInvoices(params?: { status?: string; limit?: number }) {
    const response = await this.client.get('/api/invoices', { params });
    return response.data;
  }

  async getInvoiceById(id: string) {
    const response = await this.client.get(`/api/invoices/${id}`);
    return response.data;
  }

  async createInvoice(data: any) {
    const response = await this.client.post('/api/invoices', data);
    return response.data;
  }

  /**
   * Payments API
   */
  async getPayments(params?: { invoiceId?: string; limit?: number }) {
    const response = await this.client.get('/api/payments', { params });
    return response.data;
  }

  async processPayment(data: {
    invoiceId: string;
    amount: number;
    paymentMethod: string;
  }) {
    const response = await this.client.post('/api/payments', data);
    return response.data;
  }

  /**
   * Subscriptions API
   */
  async getSubscriptions(params?: { status?: string }) {
    const response = await this.client.get('/api/subscriptions', { params });
    return response.data;
  }

  async createSubscription(data: any) {
    const response = await this.client.post('/api/subscriptions', data);
    return response.data;
  }

  async updateSubscription(id: string, data: any) {
    const response = await this.client.put(`/api/subscriptions/${id}`, data);
    return response.data;
  }

  async cancelSubscription(id: string) {
    const response = await this.client.delete(`/api/subscriptions/${id}`);
    return response.data;
  }

  /**
   * Health Check
   */
  async healthCheck() {
    const response = await this.client.get('/api/health');
    return response.data;
  }
}

// Export singleton instance
export const paymentAPI = new PaymentPlatformAPI();
export default paymentAPI;
