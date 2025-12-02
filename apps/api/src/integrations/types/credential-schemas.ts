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

// AWS Bedrock Credential Schema
export const AWS_BEDROCK_CREDENTIAL_SCHEMA: CredentialSchema = {
  type: 'object',
  required: ['region', 'accessKeyId', 'secretAccessKey'],
  properties: {
    region: { type: 'string', title: 'AWS Region', default: 'us-east-1', description: 'AWS region where Bedrock is available (e.g., us-east-1, us-west-2). Ensure Bedrock is enabled in this region.' },
    accessKeyId: { type: 'string', title: 'Access Key ID', description: 'AWS IAM Access Key ID with Bedrock permissions. Create in AWS Console → IAM → Users → Security Credentials.' },
    secretAccessKey: { type: 'string', title: 'Secret Access Key', format: 'password', description: 'AWS IAM Secret Access Key. Only shown once when created. Store securely.' },
    modelId: { type: 'string', title: 'Default Model ID', default: 'anthropic.claude-3-sonnet-20240229-v1:0', description: 'Claude model to use for content generation. Available models depend on your AWS region and account access.' },
  },
};

// AWS S3 Credential Schema
export const AWS_S3_CREDENTIAL_SCHEMA: CredentialSchema = {
  type: 'object',
  required: ['region', 'bucket', 'accessKeyId', 'secretAccessKey'],
  properties: {
    region: { type: 'string', title: 'AWS Region', default: 'us-east-1', description: 'AWS region for the S3 bucket. Should match your bucket location for optimal performance.' },
    bucket: { type: 'string', title: 'Bucket Name', description: 'S3 bucket name for storing files. Bucket must exist and be accessible with the provided credentials.' },
    accessKeyId: { type: 'string', title: 'Access Key ID', description: 'AWS IAM Access Key ID with S3 permissions (s3:PutObject, s3:GetObject, s3:DeleteObject, s3:ListBucket).' },
    secretAccessKey: { type: 'string', title: 'Secret Access Key', format: 'password', description: 'AWS IAM Secret Access Key. Only shown once when created.' },
    cloudfrontDomain: { type: 'string', title: 'CloudFront Domain (Optional)', description: 'CloudFront distribution domain for CDN delivery (e.g., d1234567890.cloudfront.net). Improves image load times.' },
    keyPrefix: { type: 'string', title: 'Key Prefix (Optional)', default: 'products/', description: 'Prefix for all uploaded files (e.g., "uploads/", "products/"). Helps organize files in the bucket.' },
  },
};

// LanguageTool Credential Schema
export const LANGUAGETOOL_CREDENTIAL_SCHEMA: CredentialSchema = {
  type: 'object',
  required: [],
  properties: {
    apiKey: { type: 'string', title: 'API Key (Premium)', format: 'password', description: 'API key for premium features (optional for free tier). Get from LanguageTool.org → Premium → API Access.' },
    username: { type: 'string', title: 'Username (Premium)', description: 'Username for premium API access. Required for premium tier.' },
    baseUrl: { type: 'string', title: 'API Base URL', default: 'https://api.languagetool.org/v2', description: 'API endpoint URL. Use default for cloud API, or your self-hosted instance URL.' },
  },
};

// Cloudinary Credential Schema
export const CLOUDINARY_CREDENTIAL_SCHEMA: CredentialSchema = {
  type: 'object',
  required: ['cloudName', 'apiKey', 'apiSecret'],
  properties: {
    cloudName: { type: 'string', title: 'Cloud Name', description: 'Your Cloudinary cloud name. Found in Cloudinary Dashboard → Account Details → Cloud name.' },
    apiKey: { type: 'string', title: 'API Key', description: 'Cloudinary API key. Found in Cloudinary Dashboard → Account Details → API Key.' },
    apiSecret: { type: 'string', title: 'API Secret', format: 'password', description: 'Cloudinary API secret. Found in Cloudinary Dashboard → Account Details → API Secret. Keep confidential.' },
    uploadPreset: { type: 'string', title: 'Upload Preset (Optional)', description: 'Default upload preset for transformations. Create in Settings → Upload → Upload presets.' },
  },
};

// Runway Credential Schema
export const RUNWAY_CREDENTIAL_SCHEMA: CredentialSchema = {
  type: 'object',
  required: ['apiKey'],
  properties: {
    apiKey: { type: 'string', title: 'API Key', format: 'password', description: 'Runway API key from your account settings. Found in Runway Dashboard → Settings → API Keys.' },
    apiVersion: { type: 'string', title: 'API Version', default: '2024-09-13', description: 'Runway API version to use. Use latest version unless you need compatibility with older features.' },
  },
};

// AWS CloudFront Credential Schema
export const AWS_CLOUDFRONT_CREDENTIAL_SCHEMA: CredentialSchema = {
  type: 'object',
  required: ['region', 'accessKeyId', 'secretAccessKey'],
  properties: {
    region: { type: 'string', title: 'AWS Region', default: 'us-east-1', description: 'AWS region (CloudFront is global but uses us-east-1 for API calls). Always use us-east-1.' },
    accessKeyId: { type: 'string', title: 'Access Key ID', description: 'AWS IAM Access Key ID with CloudFront permissions (cloudfront:CreateDistribution, cloudfront:UpdateDistribution, etc.).' },
    secretAccessKey: { type: 'string', title: 'Secret Access Key', format: 'password', description: 'AWS IAM Secret Access Key. Only shown once when created.' },
    originAccessIdentity: { type: 'string', title: 'Origin Access Identity (Optional)', description: 'OAI for restricting S3 bucket access to CloudFront. Created in CloudFront → Origin Access → Create.' },
    priceClass: { type: 'string', title: 'Price Class', default: 'PriceClass_100', description: 'Distribution price class: PriceClass_100 (US/Europe), PriceClass_200 (+ Asia), PriceClass_All (global).' },
    acmCertificateArn: { type: 'string', title: 'ACM Certificate ARN (Optional)', description: 'ACM certificate ARN for custom domains. Must be in us-east-1 region.' },
  },
};

// AWS Route53 Credential Schema
export const AWS_ROUTE53_CREDENTIAL_SCHEMA: CredentialSchema = {
  type: 'object',
  required: ['accessKeyId', 'secretAccessKey'],
  properties: {
    accessKeyId: { type: 'string', title: 'Access Key ID', description: 'AWS IAM Access Key ID with Route53 permissions (route53:ChangeResourceRecordSets, route53:ListHostedZones, etc.).' },
    secretAccessKey: { type: 'string', title: 'Secret Access Key', format: 'password', description: 'AWS IAM Secret Access Key. Only shown once when created.' },
    hostedZoneId: { type: 'string', title: 'Hosted Zone ID (Optional)', description: 'Default hosted zone ID for the platform domain. Found in Route53 → Hosted Zones → Zone ID column.' },
    platformDomain: { type: 'string', title: 'Platform Domain (Optional)', default: 'avnz.io', description: 'Platform domain for subdomain landing pages (e.g., client.avnz.io).' },
  },
};

// AWS ACM (Certificate Manager) Credential Schema
export const AWS_ACM_CREDENTIAL_SCHEMA: CredentialSchema = {
  type: 'object',
  required: ['region', 'accessKeyId', 'secretAccessKey'],
  properties: {
    region: { type: 'string', title: 'AWS Region', default: 'us-east-1', description: 'AWS region for ACM. For CloudFront, certificates MUST be in us-east-1.' },
    accessKeyId: { type: 'string', title: 'Access Key ID', description: 'AWS IAM Access Key ID with ACM permissions (acm:RequestCertificate, acm:DescribeCertificate, etc.).' },
    secretAccessKey: { type: 'string', title: 'Secret Access Key', format: 'password', description: 'AWS IAM Secret Access Key. Only shown once when created.' },
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
  // AI/ML providers
  [IntegrationProvider.AWS_BEDROCK]: AWS_BEDROCK_CREDENTIAL_SCHEMA,
  [IntegrationProvider.LANGUAGETOOL]: LANGUAGETOOL_CREDENTIAL_SCHEMA,
  // Storage providers
  [IntegrationProvider.AWS_S3]: AWS_S3_CREDENTIAL_SCHEMA,
  // CDN providers
  [IntegrationProvider.AWS_CLOUDFRONT]: AWS_CLOUDFRONT_CREDENTIAL_SCHEMA,
  // DNS providers
  [IntegrationProvider.AWS_ROUTE53]: AWS_ROUTE53_CREDENTIAL_SCHEMA,
  // Image Processing providers
  [IntegrationProvider.CLOUDINARY]: CLOUDINARY_CREDENTIAL_SCHEMA,
  // Video Generation providers
  [IntegrationProvider.RUNWAY]: RUNWAY_CREDENTIAL_SCHEMA,
  // OAuth providers use OAUTH_APP_CREDENTIAL_SCHEMA for app configuration
  [IntegrationProvider.GOOGLE]: OAUTH_APP_CREDENTIAL_SCHEMA,
  [IntegrationProvider.MICROSOFT]: OAUTH_APP_CREDENTIAL_SCHEMA,
  [IntegrationProvider.SLACK]: OAUTH_APP_CREDENTIAL_SCHEMA,
  [IntegrationProvider.HUBSPOT]: OAUTH_APP_CREDENTIAL_SCHEMA,
  [IntegrationProvider.SALESFORCE]: OAUTH_APP_CREDENTIAL_SCHEMA,
  [IntegrationProvider.QUICKBOOKS]: OAUTH_APP_CREDENTIAL_SCHEMA,
};
