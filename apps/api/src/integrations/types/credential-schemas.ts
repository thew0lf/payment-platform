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
    accessKeyId: { type: 'string', title: 'Access Key ID', description: 'AWS IAM Access Key ID with SES and SQS permissions. Create in AWS Console → IAM → Users → Security Credentials.' },
    secretAccessKey: { type: 'string', title: 'Secret Access Key', format: 'password', description: 'AWS IAM Secret Access Key. Only shown once when created. Store securely.' },
    fromEmail: { type: 'string', title: 'From Email', format: 'email', description: 'Verified sender email address. Must be verified in SES Console → Verified Identities.' },
    sqsQueueUrl: { type: 'string', title: 'SQS Queue URL', description: 'Optional SQS queue URL for email queuing (e.g., https://sqs.us-east-1.amazonaws.com/123456789012/avnz-email-queue). If not provided, emails will be sent directly.' },
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

// PayPal Classic NVP Credential Schema (Legacy)
export const PAYPAL_CLASSIC_CREDENTIAL_SCHEMA: CredentialSchema = {
  type: 'object',
  required: ['apiUsername', 'apiPassword', 'apiSignature'],
  properties: {
    apiUsername: { type: 'string', title: 'API Username', description: 'Your PayPal API Username. Found in PayPal account → Profile → My Selling Tools → API Access → NVP/SOAP API integration → View API Signature.' },
    apiPassword: { type: 'string', title: 'API Password', format: 'password', description: 'Your PayPal API Password. Generated along with your API credentials. Keep this confidential.' },
    apiSignature: { type: 'string', title: 'API Signature', format: 'password', description: 'Your PayPal API Signature. A long string used to authenticate API requests. Found in the same location as username.' },
  },
  // Test cards for sandbox environment
  testCards: [
    { number: '4032036234479689', expiryMonth: '04', expiryYear: '2030', cvv: '288', brand: 'Visa', description: 'PayPal Sandbox Visa - Approved' },
    { number: '5425233430109903', expiryMonth: '04', expiryYear: '2030', cvv: '123', brand: 'MasterCard', description: 'PayPal Sandbox MasterCard - Approved' },
    { number: '378282246310005', expiryMonth: '04', expiryYear: '2030', cvv: '1234', brand: 'Amex', description: 'PayPal Sandbox Amex - Approved' },
    { number: '6011111111111117', expiryMonth: '04', expiryYear: '2030', cvv: '123', brand: 'Discover', description: 'PayPal Sandbox Discover - Approved' },
  ],
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
    apiVersion: { type: 'string', title: 'API Version', default: '2024-11-06', description: 'Runway API version to use. Use latest version unless you need compatibility with older features.' },
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

// ═══════════════════════════════════════════════════════════════
// ADDITIONAL AUTHENTICATION PROVIDERS
// ═══════════════════════════════════════════════════════════════

// Okta Credential Schema
export const OKTA_CREDENTIAL_SCHEMA: CredentialSchema = {
  type: 'object',
  required: ['domain', 'clientId', 'clientSecret'],
  properties: {
    domain: { type: 'string', title: 'Okta Domain', description: 'Your Okta organization domain (e.g., dev-123456.okta.com). Found in Admin Console → Settings → Account.' },
    clientId: { type: 'string', title: 'Client ID', description: 'OAuth 2.0 Client ID from your Okta application. Found in Applications → Your App → General.' },
    clientSecret: { type: 'string', title: 'Client Secret', format: 'password', description: 'OAuth 2.0 Client Secret. Found in Applications → Your App → General → Client Credentials.' },
    issuer: { type: 'string', title: 'Issuer URL', description: 'Authorization Server issuer URL. Usually https://your-domain.okta.com/oauth2/default.' },
  },
};

// AWS Cognito Credential Schema
export const AWS_COGNITO_CREDENTIAL_SCHEMA: CredentialSchema = {
  type: 'object',
  required: ['region', 'userPoolId', 'clientId'],
  properties: {
    region: { type: 'string', title: 'AWS Region', default: 'us-east-1', description: 'AWS region where your Cognito User Pool is located.' },
    userPoolId: { type: 'string', title: 'User Pool ID', description: 'Cognito User Pool ID (e.g., us-east-1_xxxxxx). Found in Cognito → User Pools → Your Pool → Pool ID.' },
    clientId: { type: 'string', title: 'App Client ID', description: 'App Client ID from Cognito. Found in User Pool → App Integration → App Clients.' },
    clientSecret: { type: 'string', title: 'App Client Secret', format: 'password', description: 'App Client Secret (if enabled). Found in App Client settings.' },
  },
};

// ═══════════════════════════════════════════════════════════════
// EMAIL MARKETING PROVIDERS
// ═══════════════════════════════════════════════════════════════

// SendGrid Credential Schema
export const SENDGRID_CREDENTIAL_SCHEMA: CredentialSchema = {
  type: 'object',
  required: ['apiKey'],
  properties: {
    apiKey: { type: 'string', title: 'API Key', format: 'password', description: 'SendGrid API Key with Mail Send permissions. Create in Settings → API Keys → Create API Key.' },
    fromEmail: { type: 'string', title: 'From Email', format: 'email', description: 'Verified sender email address. Must be verified in Sender Authentication.' },
    fromName: { type: 'string', title: 'From Name', description: 'Default sender name to display in emails.' },
  },
};

// Klaviyo Credential Schema
export const KLAVIYO_CREDENTIAL_SCHEMA: CredentialSchema = {
  type: 'object',
  required: ['privateApiKey'],
  properties: {
    privateApiKey: { type: 'string', title: 'Private API Key', format: 'password', description: 'Klaviyo Private API Key. Found in Account → Settings → API Keys → Create Private API Key.' },
    publicApiKey: { type: 'string', title: 'Public API Key', description: 'Klaviyo Public API Key (Site ID) for client-side tracking. Found in Account → Settings → API Keys.' },
    listId: { type: 'string', title: 'Default List ID', description: 'Default list ID for new subscribers. Found in Lists → Your List → Settings → List ID.' },
  },
};

// ═══════════════════════════════════════════════════════════════
// SMS/VOICE PROVIDERS
// ═══════════════════════════════════════════════════════════════

// AWS SNS Credential Schema
export const AWS_SNS_CREDENTIAL_SCHEMA: CredentialSchema = {
  type: 'object',
  required: ['region', 'accessKeyId', 'secretAccessKey'],
  properties: {
    region: { type: 'string', title: 'AWS Region', default: 'us-east-1', description: 'AWS region for SNS. Choose a region that supports SMS.' },
    accessKeyId: { type: 'string', title: 'Access Key ID', description: 'AWS IAM Access Key ID with SNS permissions (sns:Publish, sns:SetSMSAttributes).' },
    secretAccessKey: { type: 'string', title: 'Secret Access Key', format: 'password', description: 'AWS IAM Secret Access Key. Only shown once when created.' },
    smsType: { type: 'string', title: 'SMS Type', default: 'Transactional', description: 'SMS message type: Transactional (high deliverability) or Promotional (lower cost).' },
  },
};

// ═══════════════════════════════════════════════════════════════
// AI/ML PROVIDERS
// ═══════════════════════════════════════════════════════════════

// OpenAI Credential Schema
export const OPENAI_CREDENTIAL_SCHEMA: CredentialSchema = {
  type: 'object',
  required: ['apiKey'],
  properties: {
    apiKey: { type: 'string', title: 'API Key', format: 'password', description: 'OpenAI API Key. Found in platform.openai.com → API Keys → Create new secret key.' },
    organizationId: { type: 'string', title: 'Organization ID', description: 'Optional organization ID for API usage tracking. Found in Settings → Organization.' },
    defaultModel: { type: 'string', title: 'Default Model', default: 'gpt-4-turbo-preview', description: 'Default model for completions (e.g., gpt-4-turbo-preview, gpt-3.5-turbo).' },
  },
};

// Anthropic Credential Schema
export const ANTHROPIC_CREDENTIAL_SCHEMA: CredentialSchema = {
  type: 'object',
  required: ['apiKey'],
  properties: {
    apiKey: { type: 'string', title: 'API Key', format: 'password', description: 'Anthropic API Key. Found at console.anthropic.com → API Keys → Create Key.' },
    defaultModel: { type: 'string', title: 'Default Model', default: 'claude-sonnet-4-20250514', description: 'Default Claude model (e.g., claude-sonnet-4-20250514, claude-3-5-haiku-20241022, claude-opus-4-20250514).' },
    maxTokens: { type: 'number', title: 'Max Tokens', default: 4096, description: 'Maximum tokens for responses. Claude 3.5 Sonnet supports up to 8192 output tokens.' },
  },
};

// ═══════════════════════════════════════════════════════════════
// MONITORING PROVIDERS
// ═══════════════════════════════════════════════════════════════

// Datadog Credential Schema
export const DATADOG_CREDENTIAL_SCHEMA: CredentialSchema = {
  type: 'object',
  required: ['apiKey', 'appKey'],
  properties: {
    apiKey: { type: 'string', title: 'API Key', format: 'password', description: 'Datadog API Key. Found in Organization Settings → API Keys.' },
    appKey: { type: 'string', title: 'Application Key', format: 'password', description: 'Datadog Application Key. Found in Organization Settings → Application Keys.' },
    site: { type: 'string', title: 'Datadog Site', default: 'datadoghq.com', description: 'Datadog site (e.g., datadoghq.com, datadoghq.eu, us3.datadoghq.com).' },
    env: { type: 'string', title: 'Environment', default: 'production', description: 'Environment name for tagging (e.g., production, staging, development).' },
    service: { type: 'string', title: 'Service Name', default: 'payment-platform', description: 'Service name for APM and logs.' },
  },
};

// Sentry Credential Schema
export const SENTRY_CREDENTIAL_SCHEMA: CredentialSchema = {
  type: 'object',
  required: ['dsn'],
  properties: {
    dsn: { type: 'string', title: 'DSN', description: 'Sentry Data Source Name. Found in Project Settings → Client Keys (DSN).' },
    authToken: { type: 'string', title: 'Auth Token', format: 'password', description: 'Sentry Auth Token for release tracking. Found in Settings → Auth Tokens.' },
    org: { type: 'string', title: 'Organization Slug', description: 'Sentry organization slug. Found in Organization Settings.' },
    project: { type: 'string', title: 'Project Slug', description: 'Sentry project slug. Found in Project Settings.' },
    environment: { type: 'string', title: 'Environment', default: 'production', description: 'Environment name for error filtering.' },
  },
};

// AWS CloudWatch Credential Schema
export const AWS_CLOUDWATCH_CREDENTIAL_SCHEMA: CredentialSchema = {
  type: 'object',
  required: ['region', 'accessKeyId', 'secretAccessKey'],
  properties: {
    region: { type: 'string', title: 'AWS Region', default: 'us-east-1', description: 'AWS region for CloudWatch logs and metrics.' },
    accessKeyId: { type: 'string', title: 'Access Key ID', description: 'AWS IAM Access Key ID with CloudWatch permissions.' },
    secretAccessKey: { type: 'string', title: 'Secret Access Key', format: 'password', description: 'AWS IAM Secret Access Key.' },
    logGroupName: { type: 'string', title: 'Log Group Name', default: '/payment-platform', description: 'CloudWatch Log Group name for application logs.' },
    metricsNamespace: { type: 'string', title: 'Metrics Namespace', default: 'PaymentPlatform', description: 'CloudWatch Metrics namespace for custom metrics.' },
  },
};

// ═══════════════════════════════════════════════════════════════
// FEATURE FLAGS PROVIDERS
// ═══════════════════════════════════════════════════════════════

// LaunchDarkly Credential Schema
export const LAUNCHDARKLY_CREDENTIAL_SCHEMA: CredentialSchema = {
  type: 'object',
  required: ['apiKey'],
  properties: {
    apiKey: { type: 'string', title: 'Access Token', format: 'password', description: 'LaunchDarkly Access Token (API Key) for testing connections. Found in Account Settings → Authorization → Access Tokens. Create a token with "Reader" role.' },
    sdkKey: { type: 'string', title: 'SDK Key', format: 'password', description: 'LaunchDarkly SDK Key for your environment. Found in Account Settings → Projects → Your Project → Environments.' },
    clientSideId: { type: 'string', title: 'Client-side ID', description: 'Client-side ID for frontend flag evaluation. Found in same location as SDK Key.' },
    mobileKey: { type: 'string', title: 'Mobile Key', description: 'Mobile SDK Key for React Native/mobile apps. Found in same location as SDK Key.' },
  },
};

// AWS AppConfig Credential Schema
export const AWS_APPCONFIG_CREDENTIAL_SCHEMA: CredentialSchema = {
  type: 'object',
  required: ['region', 'accessKeyId', 'secretAccessKey', 'applicationId', 'environmentId', 'configurationProfileId'],
  properties: {
    region: { type: 'string', title: 'AWS Region', default: 'us-east-1', description: 'AWS region for AppConfig.' },
    accessKeyId: { type: 'string', title: 'Access Key ID', description: 'AWS IAM Access Key ID with AppConfig permissions.' },
    secretAccessKey: { type: 'string', title: 'Secret Access Key', format: 'password', description: 'AWS IAM Secret Access Key.' },
    applicationId: { type: 'string', title: 'Application ID', description: 'AppConfig Application ID. Found in AppConfig → Applications.' },
    environmentId: { type: 'string', title: 'Environment ID', description: 'AppConfig Environment ID. Found in your Application → Environments.' },
    configurationProfileId: { type: 'string', title: 'Configuration Profile ID', description: 'Configuration Profile ID for your feature flags.' },
  },
};

// ═══════════════════════════════════════════════════════════════
// DEPLOYMENT PROVIDERS
// ═══════════════════════════════════════════════════════════════

// Vercel Credential Schema
export const VERCEL_CREDENTIAL_SCHEMA: CredentialSchema = {
  type: 'object',
  required: ['apiToken'],
  properties: {
    apiToken: { type: 'string', title: 'API Token', format: 'password', description: 'Vercel API Token. Create in Vercel Dashboard → Account Settings → Tokens → Create.' },
    teamId: { type: 'string', title: 'Team ID (Optional)', description: 'Team ID for team deployments. Found in Team Settings → General → Team ID. Leave empty for personal account.' },
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

// ═══════════════════════════════════════════════════════════════
// LOCATION SERVICES PROVIDERS
// ═══════════════════════════════════════════════════════════════

// Google Places Credential Schema
export const GOOGLE_PLACES_CREDENTIAL_SCHEMA: CredentialSchema = {
  type: 'object',
  required: ['apiKey'],
  properties: {
    apiKey: {
      type: 'string',
      title: 'API Key',
      format: 'password',
      description: 'Google Places API Key. Create in Google Cloud Console → APIs & Services → Credentials → Create Credentials → API Key. Enable "Places API" and "Geocoding API" for the key.',
    },
    sessionTokenTTL: {
      type: 'number',
      title: 'Session Token TTL (seconds)',
      default: 180,
      description: 'How long session tokens are valid (default: 180 seconds / 3 minutes). Sessions bundle autocomplete requests for billing. Lower values = more sessions = higher cost.',
    },
  },
};

export const CREDENTIAL_SCHEMAS: Partial<Record<IntegrationProvider, CredentialSchema>> = {
  // Payment Gateways
  [IntegrationProvider.PAYPAL_PAYFLOW]: PAYFLOW_CREDENTIAL_SCHEMA,
  [IntegrationProvider.PAYPAL_REST]: PAYPAL_REST_CREDENTIAL_SCHEMA,
  [IntegrationProvider.PAYPAL_CLASSIC]: PAYPAL_CLASSIC_CREDENTIAL_SCHEMA,
  [IntegrationProvider.NMI]: NMI_CREDENTIAL_SCHEMA,
  [IntegrationProvider.AUTHORIZE_NET]: AUTHORIZE_NET_CREDENTIAL_SCHEMA,
  [IntegrationProvider.STRIPE]: STRIPE_CREDENTIAL_SCHEMA,

  // Authentication providers
  [IntegrationProvider.AUTH0]: AUTH0_CREDENTIAL_SCHEMA,
  [IntegrationProvider.OKTA]: OKTA_CREDENTIAL_SCHEMA,
  [IntegrationProvider.COGNITO]: AWS_COGNITO_CREDENTIAL_SCHEMA,

  // Email providers
  [IntegrationProvider.AWS_SES]: AWS_SES_CREDENTIAL_SCHEMA,
  [IntegrationProvider.SENDGRID]: SENDGRID_CREDENTIAL_SCHEMA,
  [IntegrationProvider.KLAVIYO]: KLAVIYO_CREDENTIAL_SCHEMA,

  // SMS providers
  [IntegrationProvider.TWILIO]: TWILIO_CREDENTIAL_SCHEMA,
  [IntegrationProvider.AWS_SNS]: AWS_SNS_CREDENTIAL_SCHEMA,

  // AI/ML providers
  [IntegrationProvider.AWS_BEDROCK]: AWS_BEDROCK_CREDENTIAL_SCHEMA,
  [IntegrationProvider.OPENAI]: OPENAI_CREDENTIAL_SCHEMA,
  [IntegrationProvider.ANTHROPIC]: ANTHROPIC_CREDENTIAL_SCHEMA,
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

  // Monitoring providers
  [IntegrationProvider.DATADOG]: DATADOG_CREDENTIAL_SCHEMA,
  [IntegrationProvider.SENTRY]: SENTRY_CREDENTIAL_SCHEMA,
  [IntegrationProvider.CLOUDWATCH]: AWS_CLOUDWATCH_CREDENTIAL_SCHEMA,

  // Feature Flags providers
  [IntegrationProvider.LAUNCHDARKLY]: LAUNCHDARKLY_CREDENTIAL_SCHEMA,
  [IntegrationProvider.AWS_APPCONFIG]: AWS_APPCONFIG_CREDENTIAL_SCHEMA,

  // Deployment providers
  [IntegrationProvider.VERCEL]: VERCEL_CREDENTIAL_SCHEMA,

  // OAuth providers use OAUTH_APP_CREDENTIAL_SCHEMA for app configuration
  [IntegrationProvider.GOOGLE]: OAUTH_APP_CREDENTIAL_SCHEMA,
  [IntegrationProvider.MICROSOFT]: OAUTH_APP_CREDENTIAL_SCHEMA,
  [IntegrationProvider.SLACK]: OAUTH_APP_CREDENTIAL_SCHEMA,
  [IntegrationProvider.HUBSPOT]: OAUTH_APP_CREDENTIAL_SCHEMA,
  [IntegrationProvider.SALESFORCE]: OAUTH_APP_CREDENTIAL_SCHEMA,
  [IntegrationProvider.QUICKBOOKS]: OAUTH_APP_CREDENTIAL_SCHEMA,

  // Location Services providers
  [IntegrationProvider.GOOGLE_PLACES]: GOOGLE_PLACES_CREDENTIAL_SCHEMA,
};
