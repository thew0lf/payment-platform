/**
 * Integration Defaults Seed
 *
 * This file contains default integration configurations that can be restored
 * when the database is wiped. Store your integration credentials in the
 * integration-defaults.json file (gitignored) to persist them across DB resets.
 *
 * PRODUCTION: Set INTEGRATION_DEFAULTS_SECRET_NAME env var to read from AWS Secrets Manager
 * instead of the local file (which won't exist in Docker/ECS).
 *
 * Usage:
 * 1. Create a file at apps/api/prisma/seeds/data/integration-defaults.json
 * 2. Add your integration configurations (see template below)
 * 3. Run `npx prisma db seed` to restore integrations
 *
 * Template (integration-defaults.json):
 * {
 *   "organizationId": "your-organization-id",
 *   "platformIntegrations": [
 *     {
 *       "provider": "AWS_S3",
 *       "name": "AWS S3 Storage",
 *       "description": "Primary storage for files",
 *       "environment": "PRODUCTION",
 *       "isSharedWithClients": true,
 *       "credentials": {
 *         "region": "us-east-1",
 *         "accessKeyId": "YOUR_ACCESS_KEY",
 *         "secretAccessKey": "YOUR_SECRET_KEY",
 *         "bucketName": "your-bucket"
 *       }
 *     }
 *   ]
 * }
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

// Path to the defaults file
const DEFAULTS_FILE = path.join(__dirname, '../data/integration-defaults.json');
const INTEGRATION_DEFAULTS_SECRET_NAME = process.env.INTEGRATION_DEFAULTS_SECRET_NAME;

// Encryption key from environment - MUST be set before seeding integrations
function getEncryptionKey(): string {
  const key = process.env.INTEGRATION_ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      'INTEGRATION_ENCRYPTION_KEY environment variable is required to seed integrations.\n' +
      'Generate a key with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"\n' +
      'Add to .env: INTEGRATION_ENCRYPTION_KEY=<your-64-char-hex-key>'
    );
  }
  if (key.length !== 64) {
    throw new Error(
      `INTEGRATION_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes). Got ${key.length} characters.`
    );
  }
  return key;
}

interface IntegrationDefault {
  provider: string;
  name: string;
  description?: string;
  environment: 'SANDBOX' | 'PRODUCTION';
  isSharedWithClients?: boolean;
  clientPricing?: {
    type: 'per_transaction' | 'monthly' | 'usage_based';
    percentageFee?: number;
    flatFee?: number;
    monthlyMinimum?: number;
    monthlyFee?: number;
    description?: string;
  };
  credentials: Record<string, unknown>;
  settings?: Record<string, unknown>;
}

interface IntegrationDefaults {
  organizationId: string;
  platformIntegrations: IntegrationDefault[];
}

/**
 * Fetch integration defaults from AWS Secrets Manager (for production)
 */
async function fetchDefaultsFromSecretsManager(): Promise<IntegrationDefaults | null> {
  if (!INTEGRATION_DEFAULTS_SECRET_NAME) {
    return null;
  }

  try {
    const region = process.env.AWS_REGION || 'us-east-1';
    const client = new SecretsManagerClient({ region });
    const command = new GetSecretValueCommand({ SecretId: INTEGRATION_DEFAULTS_SECRET_NAME });
    const response = await client.send(command);

    if (response.SecretString) {
      console.log('  📦 Loading integration defaults from AWS Secrets Manager...');
      return JSON.parse(response.SecretString) as IntegrationDefaults;
    }
    return null;
  } catch (error) {
    console.log(`  ⚠️  Failed to fetch from Secrets Manager: ${error.message}`);
    return null;
  }
}

/**
 * Load integration defaults from file (local) or Secrets Manager (production)
 */
async function loadIntegrationDefaults(): Promise<IntegrationDefaults | null> {
  // Priority 1: Local file (for development)
  if (fs.existsSync(DEFAULTS_FILE)) {
    console.log('  📦 Loading integration defaults from local file...');
    const rawData = fs.readFileSync(DEFAULTS_FILE, 'utf8');
    return JSON.parse(rawData) as IntegrationDefaults;
  }

  // Priority 2: AWS Secrets Manager (for production)
  const secretDefaults = await fetchDefaultsFromSecretsManager();
  if (secretDefaults) {
    return secretDefaults;
  }

  return null;
}

/**
 * Encrypt credentials using AES-256-GCM
 */
function encryptCredentials(credentials: Record<string, unknown>): {
  encrypted: string;
  iv: string;
  authTag: string;
  keyVersion: number;
  encryptedAt: string;
} {
  const encryptionKey = getEncryptionKey();
  const key = crypto.scryptSync(encryptionKey, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const jsonData = JSON.stringify(credentials);
  let encrypted = cipher.update(jsonData, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    keyVersion: 1,
    encryptedAt: new Date().toISOString(),
  };
}

/**
 * Get the category for a provider
 */
function getCategory(provider: string): string {
  const categoryMap: Record<string, string> = {
    // Authentication
    AUTH0: 'AUTHENTICATION',
    OKTA: 'AUTHENTICATION',
    COGNITO: 'AUTHENTICATION',

    // Payment Gateways
    PAYPAL_PAYFLOW: 'PAYMENT_GATEWAY',
    PAYPAL_REST: 'PAYMENT_GATEWAY',
    NMI: 'PAYMENT_GATEWAY',
    AUTHORIZE_NET: 'PAYMENT_GATEWAY',
    STRIPE: 'PAYMENT_GATEWAY',

    // Email
    AWS_SES: 'EMAIL_TRANSACTIONAL',
    SENDGRID: 'EMAIL_TRANSACTIONAL',
    KLAVIYO: 'EMAIL_MARKETING',

    // SMS
    AWS_SNS: 'SMS',
    TWILIO: 'SMS',

    // AI
    AWS_BEDROCK: 'AI_ML',
    OPENAI: 'AI_ML',
    LANGUAGETOOL: 'AI_ML',

    // Storage
    AWS_S3: 'STORAGE',

    // CDN
    AWS_CLOUDFRONT: 'CDN',

    // DNS
    AWS_ROUTE53: 'DNS',

    // Image Processing
    CLOUDINARY: 'IMAGE_PROCESSING',

    // Video
    RUNWAY: 'VIDEO_GENERATION',

    // Monitoring
    DATADOG: 'MONITORING',
    SENTRY: 'MONITORING',
    CLOUDWATCH: 'MONITORING',

    // Feature Flags
    LAUNCHDARKLY: 'FEATURE_FLAGS',
    AWS_APPCONFIG: 'FEATURE_FLAGS',

    // OAuth
    GOOGLE: 'OAUTH',
    MICROSOFT: 'OAUTH',
    SLACK: 'OAUTH',
    HUBSPOT: 'OAUTH',
    SALESFORCE: 'OAUTH',
    QUICKBOOKS: 'OAUTH',

    // Location/Address
    GOOGLE_PLACES: 'LOCATION',
  };

  return categoryMap[provider] || 'OTHER';
}

export async function seedIntegrations(prisma: PrismaClient) {
  // Check if encryption key is set before proceeding
  if (!process.env.INTEGRATION_ENCRYPTION_KEY) {
    console.log('  ⚠️  INTEGRATION_ENCRYPTION_KEY not set - skipping integration seeding');
    console.log('     Set this env var to seed integrations');
    return;
  }

  try {
    // Load defaults from file or Secrets Manager
    const defaults = await loadIntegrationDefaults();

    if (!defaults) {
      console.log('  ⏭️  No integration defaults found');
      console.log('     Local: Create integration-defaults.json');
      console.log('     Production: Set INTEGRATION_DEFAULTS_SECRET_NAME env var');
      return;
    }

    if (!defaults.platformIntegrations) {
      console.log('  ⚠️  Invalid integration defaults file format');
      return;
    }

    // Try to find organization - first by ID from defaults, then fallback to first org
    let organization = defaults.organizationId
      ? await prisma.organization.findUnique({ where: { id: defaults.organizationId } })
      : null;

    if (!organization) {
      // Fallback: find the first organization (for production where org ID may differ)
      organization = await prisma.organization.findFirst();
      if (organization) {
        console.log(`  📋 Using organization: ${organization.name} (${organization.id})`);
      }
    }

    if (!organization) {
      console.log('  ⚠️  No organization found in database');
      return;
    }

    const organizationId = organization.id;

    let created = 0;
    let skipped = 0;

    for (const integration of defaults.platformIntegrations) {
      // Check if integration already exists
      const existing = await prisma.platformIntegration.findFirst({
        where: {
          organizationId,
          provider: integration.provider,
          environment: integration.environment,
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      // Encrypt credentials
      const encryptedCredentials = encryptCredentials(integration.credentials);

      // Create the integration
      await prisma.platformIntegration.create({
        data: {
          organizationId,
          provider: integration.provider,
          category: getCategory(integration.provider),
          name: integration.name,
          description: integration.description,
          credentials: encryptedCredentials as object,
          settings: (integration.settings || {}) as object,
          environment: integration.environment,
          isSharedWithClients: integration.isSharedWithClients ?? false,
          clientPricing: (integration.clientPricing || null) as object | null,
          status: 'ACTIVE',
          createdBy: 'SYSTEM_SEED',
        },
      });

      created++;
    }

    console.log(`  ✅ Integrations seeded: ${created} created, ${skipped} skipped (already exist)`);
  } catch (error) {
    console.error('  ❌ Failed to seed integrations:', error);
  }
}

/**
 * Export current integrations to defaults file
 * Run this to backup your integrations before a DB wipe
 */
export async function exportIntegrations(prisma: PrismaClient, organizationId: string) {
  console.log('  📤 Exporting integrations...');

  const integrations = await prisma.platformIntegration.findMany({
    where: { organizationId },
  });

  if (integrations.length === 0) {
    console.log('  ⚠️  No integrations found to export');
    return;
  }

  // Note: This exports encrypted credentials, not decrypted
  // You would need the decryption logic to export actual credentials
  const defaults: IntegrationDefaults = {
    organizationId,
    platformIntegrations: integrations.map((i) => ({
      provider: i.provider,
      name: i.name,
      description: i.description || undefined,
      environment: i.environment as 'SANDBOX' | 'PRODUCTION',
      isSharedWithClients: i.isSharedWithClients,
      clientPricing: i.clientPricing as IntegrationDefault['clientPricing'],
      credentials: {}, // Placeholder - actual credentials need manual entry
      settings: i.settings as Record<string, unknown>,
    })),
  };

  // Ensure data directory exists
  const dataDir = path.dirname(DEFAULTS_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(DEFAULTS_FILE, JSON.stringify(defaults, null, 2));
  console.log(`  ✅ Exported ${integrations.length} integrations to: ${DEFAULTS_FILE}`);
  console.log('  ⚠️  Note: Credentials are NOT exported - add them manually to the file');
}

// Default export for seed script
export default seedIntegrations;
