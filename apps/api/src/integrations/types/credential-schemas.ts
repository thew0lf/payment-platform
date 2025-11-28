/**
 * Credential Schemas for Each Provider
 */

import { CredentialSchema, IntegrationProvider } from './integration.types';

export const PAYFLOW_CREDENTIAL_SCHEMA: CredentialSchema = {
  type: 'object',
  required: ['partner', 'vendor', 'user', 'password'],
  properties: {
    partner: { type: 'string', title: 'Partner', description: 'Usually "PayPal". Found in PayPal Manager → Account Administration.', default: 'PayPal' },
    vendor: { type: 'string', title: 'Vendor/Merchant ID', description: 'Your Payflow merchant login ID. Found in PayPal Manager → Account Administration → Manage Users.' },
    user: { type: 'string', title: 'User', description: 'API username. Use same value as Vendor unless you created a separate API user.' },
    password: { type: 'string', title: 'Password', format: 'password', description: 'The password for your Payflow API user. Set in PayPal Manager.' },
  },
};

export const NMI_CREDENTIAL_SCHEMA: CredentialSchema = {
  type: 'object',
  required: ['securityKey'],
  properties: {
    securityKey: { type: 'string', title: 'Security Key', format: 'password', description: 'Your NMI API Security Key. Found in NMI Gateway → Settings → Security Keys. Generate a new key if needed.' },
    username: { type: 'string', title: 'Username (Optional)', description: 'Optional username for legacy API authentication. Only needed if not using Security Key authentication.' },
    password: { type: 'string', title: 'Password (Optional)', format: 'password', description: 'Optional password for legacy API authentication. Only needed if not using Security Key authentication.' },
  },
};

export const AUTHORIZE_NET_CREDENTIAL_SCHEMA: CredentialSchema = {
  type: 'object',
  required: ['apiLoginId', 'transactionKey'],
  properties: {
    apiLoginId: { type: 'string', title: 'API Login ID', description: 'Your Authorize.Net API Login ID. Found in Account → Settings → API Credentials & Keys.' },
    transactionKey: { type: 'string', title: 'Transaction Key', format: 'password', description: 'Your Authorize.Net Transaction Key. Generate in Account → Settings → API Credentials & Keys → Create New Key(s).' },
  },
};

export const STRIPE_CREDENTIAL_SCHEMA: CredentialSchema = {
  type: 'object',
  required: ['secretKey'],
  properties: {
    secretKey: { type: 'string', title: 'Secret Key', format: 'password', pattern: '^sk_(live|test)_', description: 'Your Stripe Secret Key (starts with sk_live_ or sk_test_). Found in Stripe Dashboard → Developers → API Keys.' },
    publishableKey: { type: 'string', title: 'Publishable Key', pattern: '^pk_(live|test)_', description: 'Your Stripe Publishable Key (starts with pk_live_ or pk_test_). Used for client-side integration. Found in Stripe Dashboard → Developers → API Keys.' },
    webhookSecret: { type: 'string', title: 'Webhook Secret', format: 'password', description: 'Webhook signing secret (starts with whsec_). Found in Stripe Dashboard → Developers → Webhooks → Select endpoint → Signing secret.' },
  },
};

export const AUTH0_CREDENTIAL_SCHEMA: CredentialSchema = {
  type: 'object',
  required: ['domain', 'clientId', 'clientSecret', 'audience'],
  properties: {
    domain: { type: 'string', title: 'Domain', description: 'Your Auth0 tenant domain (e.g., your-tenant.us.auth0.com). Found in Auth0 Dashboard → Settings.' },
    clientId: { type: 'string', title: 'Client ID', description: 'The Client ID from your Auth0 Application. Found in Applications → Your App → Settings.' },
    clientSecret: { type: 'string', title: 'Client Secret', format: 'password', description: 'The Client Secret from your Auth0 Application. Keep this confidential.' },
    audience: { type: 'string', title: 'API Audience', description: 'The API Identifier/Audience URL from Auth0 APIs section (e.g., https://api.yourapp.com). Found in APIs → Your API → Settings.' },
  },
};

export const AWS_SES_CREDENTIAL_SCHEMA: CredentialSchema = {
  type: 'object',
  required: ['region', 'accessKeyId', 'secretAccessKey', 'fromEmail'],
  properties: {
    region: { type: 'string', title: 'AWS Region', default: 'us-east-1', description: 'AWS region where SES is configured (e.g., us-east-1, eu-west-1). Ensure SES is enabled in this region.' },
    accessKeyId: { type: 'string', title: 'Access Key ID', description: 'AWS IAM Access Key ID with SES permissions. Create in AWS Console → IAM → Users → Security Credentials.' },
    secretAccessKey: { type: 'string', title: 'Secret Access Key', format: 'password', description: 'AWS IAM Secret Access Key. Only shown once when created. Store securely.' },
    fromEmail: { type: 'string', title: 'From Email', format: 'email', description: 'Verified sender email address. Must be verified in SES Console → Verified Identities.' },
  },
};

export const TWILIO_CREDENTIAL_SCHEMA: CredentialSchema = {
  type: 'object',
  required: ['accountSid', 'authToken'],
  properties: {
    accountSid: { type: 'string', title: 'Account SID', pattern: '^AC', description: 'Your Twilio Account SID (starts with AC). Found on Twilio Console Dashboard.' },
    authToken: { type: 'string', title: 'Auth Token', format: 'password', description: 'Your Twilio Auth Token. Found on Twilio Console Dashboard. Click to reveal.' },
    fromNumber: { type: 'string', title: 'From Number', description: 'Twilio phone number to send from (e.g., +1234567890). Purchase in Console → Phone Numbers → Buy a Number.' },
  },
};

export const PAYPAL_REST_CREDENTIAL_SCHEMA: CredentialSchema = {
  type: 'object',
  required: ['clientId', 'clientSecret'],
  properties: {
    clientId: { type: 'string', title: 'Client ID', description: 'Your PayPal REST API Client ID. Found in PayPal Developer Dashboard → My Apps & Credentials → Select your app → Client ID.' },
    clientSecret: { type: 'string', title: 'Client Secret', format: 'password', description: 'Your PayPal REST API Secret. Found in PayPal Developer Dashboard → My Apps & Credentials → Select your app → Secret (click Show).' },
  },
};

// OAuth Provider Credential Schema (for configuring the OAuth app - admin only)
export const OAUTH_APP_CREDENTIAL_SCHEMA: CredentialSchema = {
  type: 'object',
  required: ['clientId', 'clientSecret'],
  properties: {
    clientId: { type: 'string', title: 'Client ID', description: 'OAuth application Client ID. Create an OAuth app in the provider\'s developer console and copy the Client ID.' },
    clientSecret: { type: 'string', title: 'Client Secret', format: 'password', description: 'OAuth application Client Secret. Keep this confidential. Generated when creating the OAuth app.' },
  },
};

export const CREDENTIAL_SCHEMAS: Partial<Record<IntegrationProvider, CredentialSchema>> = {
  [IntegrationProvider.PAYPAL_PAYFLOW]: PAYFLOW_CREDENTIAL_SCHEMA,
  [IntegrationProvider.PAYPAL_REST]: PAYPAL_REST_CREDENTIAL_SCHEMA,
  [IntegrationProvider.NMI]: NMI_CREDENTIAL_SCHEMA,
  [IntegrationProvider.AUTHORIZE_NET]: AUTHORIZE_NET_CREDENTIAL_SCHEMA,
  [IntegrationProvider.STRIPE]: STRIPE_CREDENTIAL_SCHEMA,
  [IntegrationProvider.AUTH0]: AUTH0_CREDENTIAL_SCHEMA,
  [IntegrationProvider.AWS_SES]: AWS_SES_CREDENTIAL_SCHEMA,
  [IntegrationProvider.TWILIO]: TWILIO_CREDENTIAL_SCHEMA,
  // OAuth providers use OAUTH_APP_CREDENTIAL_SCHEMA for app configuration
  [IntegrationProvider.GOOGLE]: OAUTH_APP_CREDENTIAL_SCHEMA,
  [IntegrationProvider.MICROSOFT]: OAUTH_APP_CREDENTIAL_SCHEMA,
  [IntegrationProvider.SLACK]: OAUTH_APP_CREDENTIAL_SCHEMA,
  [IntegrationProvider.HUBSPOT]: OAUTH_APP_CREDENTIAL_SCHEMA,
  [IntegrationProvider.SALESFORCE]: OAUTH_APP_CREDENTIAL_SCHEMA,
  [IntegrationProvider.QUICKBOOKS]: OAUTH_APP_CREDENTIAL_SCHEMA,
};
