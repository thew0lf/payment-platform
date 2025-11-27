/**
 * Credential Schemas for Each Provider
 */

import { CredentialSchema, IntegrationProvider } from './integration.types';

export const PAYFLOW_CREDENTIAL_SCHEMA: CredentialSchema = {
  type: 'object',
  required: ['partner', 'vendor', 'user', 'password'],
  properties: {
    partner: { type: 'string', title: 'Partner', description: 'Usually "PayPal"', default: 'PayPal' },
    vendor: { type: 'string', title: 'Vendor/Merchant ID', description: 'Your merchant login ID' },
    user: { type: 'string', title: 'User', description: 'API user (same as vendor if not set)' },
    password: { type: 'string', title: 'Password', format: 'password', description: 'API password' },
  },
};

export const NMI_CREDENTIAL_SCHEMA: CredentialSchema = {
  type: 'object',
  required: ['securityKey'],
  properties: {
    securityKey: { type: 'string', title: 'Security Key', format: 'password' },
    username: { type: 'string', title: 'Username (Optional)' },
    password: { type: 'string', title: 'Password (Optional)', format: 'password' },
  },
};

export const AUTHORIZE_NET_CREDENTIAL_SCHEMA: CredentialSchema = {
  type: 'object',
  required: ['apiLoginId', 'transactionKey'],
  properties: {
    apiLoginId: { type: 'string', title: 'API Login ID' },
    transactionKey: { type: 'string', title: 'Transaction Key', format: 'password' },
  },
};

export const STRIPE_CREDENTIAL_SCHEMA: CredentialSchema = {
  type: 'object',
  required: ['secretKey'],
  properties: {
    secretKey: { type: 'string', title: 'Secret Key', format: 'password', pattern: '^sk_(live|test)_' },
    publishableKey: { type: 'string', title: 'Publishable Key', pattern: '^pk_(live|test)_' },
    webhookSecret: { type: 'string', title: 'Webhook Secret', format: 'password' },
  },
};

export const AUTH0_CREDENTIAL_SCHEMA: CredentialSchema = {
  type: 'object',
  required: ['domain', 'clientId', 'clientSecret', 'audience'],
  properties: {
    domain: { type: 'string', title: 'Domain', description: 'your-tenant.auth0.com' },
    clientId: { type: 'string', title: 'Client ID' },
    clientSecret: { type: 'string', title: 'Client Secret', format: 'password' },
    audience: { type: 'string', title: 'API Audience' },
  },
};

export const AWS_SES_CREDENTIAL_SCHEMA: CredentialSchema = {
  type: 'object',
  required: ['region', 'accessKeyId', 'secretAccessKey', 'fromEmail'],
  properties: {
    region: { type: 'string', title: 'AWS Region', default: 'us-east-1' },
    accessKeyId: { type: 'string', title: 'Access Key ID' },
    secretAccessKey: { type: 'string', title: 'Secret Access Key', format: 'password' },
    fromEmail: { type: 'string', title: 'From Email', format: 'email' },
  },
};

export const TWILIO_CREDENTIAL_SCHEMA: CredentialSchema = {
  type: 'object',
  required: ['accountSid', 'authToken'],
  properties: {
    accountSid: { type: 'string', title: 'Account SID', pattern: '^AC' },
    authToken: { type: 'string', title: 'Auth Token', format: 'password' },
    fromNumber: { type: 'string', title: 'From Number' },
  },
};

export const CREDENTIAL_SCHEMAS: Partial<Record<IntegrationProvider, CredentialSchema>> = {
  [IntegrationProvider.PAYPAL_PAYFLOW]: PAYFLOW_CREDENTIAL_SCHEMA,
  [IntegrationProvider.NMI]: NMI_CREDENTIAL_SCHEMA,
  [IntegrationProvider.AUTHORIZE_NET]: AUTHORIZE_NET_CREDENTIAL_SCHEMA,
  [IntegrationProvider.STRIPE]: STRIPE_CREDENTIAL_SCHEMA,
  [IntegrationProvider.AUTH0]: AUTH0_CREDENTIAL_SCHEMA,
  [IntegrationProvider.AWS_SES]: AWS_SES_CREDENTIAL_SCHEMA,
  [IntegrationProvider.TWILIO]: TWILIO_CREDENTIAL_SCHEMA,
};
