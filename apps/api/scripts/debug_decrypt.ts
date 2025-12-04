import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function debugDecrypt() {
  const keyHex = process.env.INTEGRATION_ENCRYPTION_KEY;
  if (!keyHex) {
    console.log('ERROR: INTEGRATION_ENCRYPTION_KEY not set');
    return;
  }

  console.log('Key length:', keyHex.length, 'chars (should be 64)');
  const key = Buffer.from(keyHex, 'hex');
  console.log('Key buffer length:', key.length, 'bytes (should be 32)');

  const integrations = await prisma.platformIntegration.findMany({
    where: { provider: { in: ['AWS_SES', 'AWS_SNS', 'AWS_ROUTE53', 'CLOUDWATCH', 'LAUNCHDARKLY', 'PAYPAL_CLASSIC'] } },
    select: { id: true, provider: true, credentials: true }
  });

  console.log('\nFound', integrations.length, 'integrations to test\n');

  for (const int of integrations) {
    console.log('=== Testing', int.provider, '===');
    const creds = int.credentials as any;

    if (!creds) {
      console.log('  ERROR: No credentials stored');
      continue;
    }

    console.log('  Credential keys:', Object.keys(creds));

    if (!creds.encrypted || !creds.iv || !creds.authTag) {
      console.log('  ERROR: Missing encryption fields');
      console.log('  Data:', JSON.stringify(creds).substring(0, 200));
      continue;
    }

    try {
      const iv = Buffer.from(creds.iv, 'base64');
      const authTag = Buffer.from(creds.authTag, 'base64');
      const ciphertext = Buffer.from(creds.encrypted, 'base64');

      console.log('  iv length:', iv.length, '(should be 16)');
      console.log('  authTag length:', authTag.length, '(should be 16)');
      console.log('  ciphertext length:', ciphertext.length);

      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });
      decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      const result = JSON.parse(decrypted.toString('utf8'));

      console.log('  SUCCESS: Decrypted keys:', Object.keys(result));
      console.log('  Values present:', Object.entries(result).map(([k, v]) => `${k}=${v ? 'SET' : 'EMPTY'}`).join(', '));
    } catch (error: any) {
      console.log('  ERROR:', error.message);
    }
    console.log('');
  }

  await prisma.$disconnect();
}

debugDecrypt().catch(console.error);
