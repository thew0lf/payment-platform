/**
 * One-time migration script to add SQS queue URL to AWS_SES integration
 * Run with: npx ts-node prisma/seeds/utils/update-ses-sqs.ts
 */
import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// Match the format used by CredentialEncryptionService
interface EncryptedCredentials {
  encrypted: string;  // base64
  iv: string;         // base64
  authTag: string;    // base64
  keyVersion: number;
  encryptedAt: Date;
}

function decrypt(encrypted: EncryptedCredentials): Record<string, any> {
  const key = process.env.INTEGRATION_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('INTEGRATION_ENCRYPTION_KEY not set');
  }
  const keyBuffer = Buffer.from(key, 'hex');
  const iv = Buffer.from(encrypted.iv, 'base64');
  const authTag = Buffer.from(encrypted.authTag, 'base64');
  const ciphertext = Buffer.from(encrypted.encrypted, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv, { authTagLength: 16 });
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8'));
}

function encrypt(data: Record<string, any>): EncryptedCredentials {
  const key = process.env.INTEGRATION_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('INTEGRATION_ENCRYPTION_KEY not set');
  }
  const keyBuffer = Buffer.from(key, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv, { authTagLength: 16 });
  const plaintext = JSON.stringify(data);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    encrypted: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    keyVersion: 1,
    encryptedAt: new Date(),
  };
}

async function main() {
  console.log('Updating AWS_SES integration with SQS queue URL...');

  const integration = await prisma.platformIntegration.findFirst({
    where: { provider: 'AWS_SES' },
  });

  if (!integration) {
    console.log('No AWS_SES integration found');
    return;
  }

  console.log('Found AWS_SES integration:', integration.id);

  // Decrypt current credentials
  const currentCredentials = decrypt(integration.credentials as unknown as EncryptedCredentials);
  console.log('Current credentials (keys):', Object.keys(currentCredentials));

  // Check if already has SQS URL
  if (currentCredentials.sqsQueueUrl) {
    console.log('SQS queue URL already configured:', currentCredentials.sqsQueueUrl);
    return;
  }

  // Add SQS queue URL
  const updatedCredentials = {
    ...currentCredentials,
    sqsQueueUrl: 'https://sqs.us-east-1.amazonaws.com/211125754104/avnz-email-queue',
  };

  console.log('Updated credentials (keys):', Object.keys(updatedCredentials));

  // Encrypt and save
  const encrypted = encrypt(updatedCredentials);
  await prisma.platformIntegration.update({
    where: { id: integration.id },
    data: {
      credentials: encrypted as any,
      updatedAt: new Date(),
    },
  });

  console.log('✅ Successfully added SQS queue URL to AWS_SES integration');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
