/**
 * Payment System Test Script
 *
 * Tests:
 * 1. Card Vault - Temporary encrypted card storage
 * 2. PayPal Classic - DoDirectPayment transaction (requires NVP credentials)
 * 3. PayPal REST - Orders API transaction (requires Client ID + Secret)
 *
 * Usage:
 *   npx ts-node scripts/test-payment.ts
 *
 * Environment Variables:
 *   PayPal Classic (NVP):
 *     PAYPAL_API_USERNAME, PAYPAL_API_PASSWORD, PAYPAL_API_SIGNATURE
 *   PayPal REST:
 *     PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET
 */

import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import * as https from 'https';

const prisma = new PrismaClient();

// Test card data from PayPal
const TEST_CARD = {
  number: '4032036234479689',
  expiryMonth: '04',
  expiryYear: '2030',
  cvv: '288',
  cardholderName: 'Test User',
};

const TEST_BILLING = {
  firstName: 'Test',
  lastName: 'User',
  street1: '123 Test Street',
  city: 'San Jose',
  state: 'CA',
  postalCode: '95131',
  country: 'US',
  email: 'test@example.com',
};

// ═══════════════════════════════════════════════════════════════
// CARD VAULT TESTS
// ═══════════════════════════════════════════════════════════════

async function testCardVaultStorage() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('TEST 1: Card Vault - Temporary Encrypted Storage');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Get a company ID for testing
  const company = await prisma.company.findFirst();
  if (!company) {
    console.log('❌ No company found in database. Run seeds first.');
    return false;
  }
  console.log(`Using company: ${company.name} (${company.id})`);

  // Simulate encryption (in real code, uses CredentialEncryptionService)
  const encryptionKey = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);

  const sensitiveData = {
    cardNumber: TEST_CARD.number,
    cvv: TEST_CARD.cvv,
    expirationMonth: parseInt(TEST_CARD.expiryMonth),
    expirationYear: parseInt(TEST_CARD.expiryYear),
    cardholderName: TEST_CARD.cardholderName,
  };

  // Encrypt using AES-256-GCM (same as CredentialEncryptionService)
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);
  let encrypted = cipher.update(JSON.stringify(sensitiveData), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  const encryptedData = JSON.stringify({
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    encrypted: encrypted,
  });

  console.log('✅ Card data encrypted using AES-256-GCM');
  console.log(`   Card: ****${TEST_CARD.number.slice(-4)}`);
  console.log(`   CVV: *** (encrypted)`);
  console.log(`   Expiry: ${TEST_CARD.expiryMonth}/${TEST_CARD.expiryYear}`);

  // Create card fingerprint
  const cardFingerprint = crypto.createHash('sha256').update(TEST_CARD.number).digest('hex');
  console.log(`   Fingerprint: ${cardFingerprint.substring(0, 16)}...`);

  // Store in database (simulating CardVaultService.storeCardTemporarily)
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  try {
    const encryptedCard = await prisma.encryptedCard.create({
      data: {
        companyId: company.id,
        sessionToken: `test_session_${Date.now()}`,
        encryptedData,
        cardFingerprint,
        expiresAt,
      },
    });

    console.log('\n✅ Encrypted card stored in database');
    console.log(`   ID: ${encryptedCard.id}`);
    console.log(`   Expires: ${expiresAt.toISOString()}`);
    console.log(`   Status: ${encryptedCard.status}`);

    // Test retrieval and decryption
    const retrieved = await prisma.encryptedCard.findUnique({
      where: { id: encryptedCard.id },
    });

    if (retrieved) {
      const storedEncrypted = JSON.parse(retrieved.encryptedData);
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        encryptionKey,
        Buffer.from(storedEncrypted.iv, 'hex')
      );
      decipher.setAuthTag(Buffer.from(storedEncrypted.authTag, 'hex'));

      let decrypted = decipher.update(storedEncrypted.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      const decryptedData = JSON.parse(decrypted);

      console.log('\n✅ Card data decrypted successfully');
      console.log(`   Card Number Match: ${decryptedData.cardNumber === TEST_CARD.number ? '✓' : '✗'}`);
      console.log(`   CVV Match: ${decryptedData.cvv === TEST_CARD.cvv ? '✓' : '✗'}`);
      console.log(`   Expiry Match: ${decryptedData.expirationMonth}/${decryptedData.expirationYear}`);
    }

    // Cleanup test data
    await prisma.encryptedCard.delete({ where: { id: encryptedCard.id } });
    console.log('\n✅ Test data cleaned up');

    return true;
  } catch (error) {
    console.log(`\n❌ Error: ${(error as Error).message}`);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// PAYPAL CLASSIC TESTS
// ═══════════════════════════════════════════════════════════════

interface PayPalCredentials {
  apiUsername: string;
  apiPassword: string;
  apiSignature: string;
}

async function testPayPalClassic(credentials: PayPalCredentials) {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('TEST 2: PayPal Classic - DoDirectPayment');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const endpoint = 'api-3t.sandbox.paypal.com';
  const version = '124.0';

  // Build NVP params
  const params: Record<string, string> = {
    USER: credentials.apiUsername,
    PWD: credentials.apiPassword,
    SIGNATURE: credentials.apiSignature,
    VERSION: version,
    METHOD: 'DoDirectPayment',
    PAYMENTACTION: 'Sale',
    AMT: '1.00',
    CURRENCYCODE: 'USD',
    CREDITCARDTYPE: 'Visa',
    ACCT: TEST_CARD.number,
    EXPDATE: `${TEST_CARD.expiryMonth}${TEST_CARD.expiryYear}`,
    CVV2: TEST_CARD.cvv,
    FIRSTNAME: TEST_BILLING.firstName,
    LASTNAME: TEST_BILLING.lastName,
    STREET: TEST_BILLING.street1,
    CITY: TEST_BILLING.city,
    STATE: TEST_BILLING.state,
    ZIP: TEST_BILLING.postalCode,
    COUNTRYCODE: TEST_BILLING.country,
    EMAIL: TEST_BILLING.email,
    IPADDRESS: '127.0.0.1',
    INVNUM: `TEST-${Date.now()}`,
  };

  const postData = Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');

  console.log('Request Details:');
  console.log(`  Endpoint: https://${endpoint}/nvp`);
  console.log(`  Amount: $${params.AMT} ${params.CURRENCYCODE}`);
  console.log(`  Card: ****${TEST_CARD.number.slice(-4)}`);
  console.log(`  Action: ${params.PAYMENTACTION}`);
  console.log(`  Invoice: ${params.INVNUM}`);

  return new Promise<boolean>((resolve) => {
    const options: https.RequestOptions = {
      hostname: endpoint,
      port: 443,
      path: '/nvp',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        // Parse NVP response
        const response: Record<string, string> = {};
        data.split('&').forEach(pair => {
          const [key, ...valueParts] = pair.split('=');
          response[decodeURIComponent(key)] = decodeURIComponent(valueParts.join('='));
        });

        console.log('\nResponse:');
        console.log(`  ACK: ${response.ACK}`);
        console.log(`  Transaction ID: ${response.TRANSACTIONID || 'N/A'}`);
        console.log(`  Correlation ID: ${response.CORRELATIONID}`);
        console.log(`  AVS Code: ${response.AVSCODE || 'N/A'}`);
        console.log(`  CVV2 Match: ${response.CVV2MATCH || 'N/A'}`);

        if (response.ACK === 'Success' || response.ACK === 'SuccessWithWarning') {
          console.log('\n✅ PayPal Classic transaction SUCCESSFUL');
          console.log(`   Transaction ID: ${response.TRANSACTIONID}`);
          resolve(true);
        } else {
          console.log('\n❌ PayPal Classic transaction FAILED');
          console.log(`   Error Code: ${response.L_ERRORCODE0}`);
          console.log(`   Error Message: ${response.L_LONGMESSAGE0 || response.L_SHORTMESSAGE0}`);
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.log(`\n❌ Connection Error: ${error.message}`);
      resolve(false);
    });

    req.setTimeout(30000, () => {
      req.destroy();
      console.log('\n❌ Request Timeout');
      resolve(false);
    });

    req.write(postData);
    req.end();
  });
}

// ═══════════════════════════════════════════════════════════════
// PAYPAL REST API TESTS
// ═══════════════════════════════════════════════════════════════

interface PayPalRESTCredentials {
  clientId: string;
  clientSecret: string;
}

async function getPayPalAccessToken(credentials: PayPalRESTCredentials): Promise<string> {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString('base64');
    const postData = 'grant_type=client_credentials';

    const options: https.RequestOptions = {
      hostname: 'api-m.sandbox.paypal.com',
      port: 443,
      path: '/v1/oauth2/token',
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.access_token) {
            resolve(response.access_token);
          } else {
            reject(new Error(response.error_description || 'Failed to get access token'));
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Request timeout')); });
    req.write(postData);
    req.end();
  });
}

async function testPayPalREST(credentials: PayPalRESTCredentials) {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('TEST 3: PayPal REST - Orders API');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    // Step 1: Get access token
    console.log('Step 1: Getting OAuth2 access token...');
    const accessToken = await getPayPalAccessToken(credentials);
    console.log(`✅ Access token obtained: ${accessToken.substring(0, 20)}...`);

    // Step 2: Create order
    console.log('\nStep 2: Creating order...');
    const orderBody = JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: `TEST-REST-${Date.now()}`,
        amount: {
          currency_code: 'USD',
          value: '1.00',
        },
        description: 'Test transaction via PayPal REST API',
      }],
      payment_source: {
        card: {
          number: TEST_CARD.number,
          expiry: `${TEST_CARD.expiryYear}-${TEST_CARD.expiryMonth}`,
          security_code: TEST_CARD.cvv,
          name: TEST_CARD.cardholderName,
          billing_address: {
            address_line_1: TEST_BILLING.street1,
            admin_area_2: TEST_BILLING.city,
            admin_area_1: TEST_BILLING.state,
            postal_code: TEST_BILLING.postalCode,
            country_code: TEST_BILLING.country,
          },
        },
      },
    });

    const orderResult = await new Promise<{ success: boolean; orderId?: string; status?: string; error?: string }>((resolve) => {
      const options: https.RequestOptions = {
        hostname: 'api-m.sandbox.paypal.com',
        port: 443,
        path: '/v2/checkout/orders',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(orderBody),
          'PayPal-Request-Id': `req-${Date.now()}`,
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.id) {
              resolve({
                success: true,
                orderId: response.id,
                status: response.status,
              });
            } else {
              resolve({
                success: false,
                error: response.message || response.details?.[0]?.description || JSON.stringify(response),
              });
            }
          } catch (error) {
            resolve({ success: false, error: `Parse error: ${data}` });
          }
        });
      });

      req.on('error', (error) => resolve({ success: false, error: error.message }));
      req.setTimeout(30000, () => { req.destroy(); resolve({ success: false, error: 'Timeout' }); });
      req.write(orderBody);
      req.end();
    });

    if (!orderResult.success) {
      console.log(`\n❌ PayPal REST order creation FAILED`);
      console.log(`   Error: ${orderResult.error}`);
      return false;
    }

    console.log(`✅ Order created: ${orderResult.orderId}`);
    console.log(`   Status: ${orderResult.status}`);

    // If COMPLETED, it means card was charged directly (Advanced Card Payments)
    if (orderResult.status === 'COMPLETED') {
      console.log('\n✅ PayPal REST transaction SUCCESSFUL');
      console.log(`   Order ID: ${orderResult.orderId}`);
      console.log(`   Status: COMPLETED (Paid)`);
      return true;
    }

    // If CREATED, need to capture
    if (orderResult.status === 'CREATED' || orderResult.status === 'APPROVED') {
      console.log('\nStep 3: Capturing payment...');

      const captureResult = await new Promise<{ success: boolean; captureId?: string; status?: string; error?: string }>((resolve) => {
        const options: https.RequestOptions = {
          hostname: 'api-m.sandbox.paypal.com',
          port: 443,
          path: `/v2/checkout/orders/${orderResult.orderId}/capture`,
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Content-Length': 0,
          },
        };

        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            try {
              const response = JSON.parse(data);
              if (response.status === 'COMPLETED') {
                const capture = response.purchase_units?.[0]?.payments?.captures?.[0];
                resolve({
                  success: true,
                  captureId: capture?.id || response.id,
                  status: response.status,
                });
              } else {
                resolve({
                  success: false,
                  error: response.message || response.details?.[0]?.description || `Status: ${response.status}`,
                });
              }
            } catch (error) {
              resolve({ success: false, error: `Parse error: ${data}` });
            }
          });
        });

        req.on('error', (error) => resolve({ success: false, error: error.message }));
        req.setTimeout(30000, () => { req.destroy(); resolve({ success: false, error: 'Timeout' }); });
        req.end();
      });

      if (captureResult.success) {
        console.log('\n✅ PayPal REST transaction SUCCESSFUL');
        console.log(`   Order ID: ${orderResult.orderId}`);
        console.log(`   Capture ID: ${captureResult.captureId}`);
        console.log(`   Status: ${captureResult.status}`);
        return true;
      } else {
        console.log(`\n❌ PayPal REST capture FAILED`);
        console.log(`   Error: ${captureResult.error}`);
        return false;
      }
    }

    // Other status
    console.log(`\n⚠️ Unexpected order status: ${orderResult.status}`);
    return false;

  } catch (error) {
    console.log(`\n❌ PayPal REST Error: ${(error as Error).message}`);
    return false;
  }
}

async function testPayPalVault(credentials: PayPalRESTCredentials) {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('TEST 4: PayPal Vault - Card Tokenization');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    // Step 1: Get access token
    console.log('Step 1: Getting OAuth2 access token...');
    const accessToken = await getPayPalAccessToken(credentials);
    console.log(`✅ Access token obtained`);

    // Step 2: Create setup token (required for vault)
    console.log('\nStep 2: Creating setup token for vault...');
    const setupBody = JSON.stringify({
      payment_source: {
        card: {
          number: TEST_CARD.number,
          expiry: `${TEST_CARD.expiryYear}-${TEST_CARD.expiryMonth}`,
          security_code: TEST_CARD.cvv,
          name: TEST_CARD.cardholderName,
          billing_address: {
            address_line_1: TEST_BILLING.street1,
            admin_area_2: TEST_BILLING.city,
            admin_area_1: TEST_BILLING.state,
            postal_code: TEST_BILLING.postalCode,
            country_code: TEST_BILLING.country,
          },
        },
      },
    });

    const setupResult = await new Promise<{ success: boolean; setupToken?: string; error?: string }>((resolve) => {
      const options: https.RequestOptions = {
        hostname: 'api-m.sandbox.paypal.com',
        port: 443,
        path: '/v3/vault/setup-tokens',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(setupBody),
          'PayPal-Request-Id': `setup-${Date.now()}`,
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.id) {
              resolve({ success: true, setupToken: response.id });
            } else {
              resolve({ success: false, error: response.message || response.details?.[0]?.description || JSON.stringify(response) });
            }
          } catch (error) {
            resolve({ success: false, error: `Parse error: ${data}` });
          }
        });
      });

      req.on('error', (error) => resolve({ success: false, error: error.message }));
      req.setTimeout(30000, () => { req.destroy(); resolve({ success: false, error: 'Timeout' }); });
      req.write(setupBody);
      req.end();
    });

    if (!setupResult.success) {
      console.log(`❌ Setup token creation failed: ${setupResult.error}`);
      return false;
    }

    console.log(`✅ Setup token created: ${setupResult.setupToken}`);

    // Step 3: Create payment token from setup token
    console.log('\nStep 3: Creating payment token (vaulting card)...');
    const vaultBody = JSON.stringify({
      payment_source: {
        token: {
          id: setupResult.setupToken,
          type: 'SETUP_TOKEN',
        },
      },
    });

    const vaultResult = await new Promise<{ success: boolean; paymentToken?: string; last4?: string; brand?: string; error?: string }>((resolve) => {
      const options: https.RequestOptions = {
        hostname: 'api-m.sandbox.paypal.com',
        port: 443,
        path: '/v3/vault/payment-tokens',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(vaultBody),
          'PayPal-Request-Id': `vault-${Date.now()}`,
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.id) {
              resolve({
                success: true,
                paymentToken: response.id,
                last4: response.payment_source?.card?.last_digits,
                brand: response.payment_source?.card?.brand,
              });
            } else {
              resolve({ success: false, error: response.message || response.details?.[0]?.description || JSON.stringify(response) });
            }
          } catch (error) {
            resolve({ success: false, error: `Parse error: ${data}` });
          }
        });
      });

      req.on('error', (error) => resolve({ success: false, error: error.message }));
      req.setTimeout(30000, () => { req.destroy(); resolve({ success: false, error: 'Timeout' }); });
      req.write(vaultBody);
      req.end();
    });

    if (!vaultResult.success) {
      console.log(`❌ Payment token creation failed: ${vaultResult.error}`);
      return false;
    }

    console.log(`✅ Card vaulted successfully!`);
    console.log(`   Payment Token: ${vaultResult.paymentToken}`);
    console.log(`   Last 4: ${vaultResult.last4}`);
    console.log(`   Brand: ${vaultResult.brand}`);

    // Step 4: Use the vaulted card to create an order
    console.log('\nStep 4: Testing payment with vaulted card...');
    const orderBody = JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: `TEST-VAULT-${Date.now()}`,
        amount: {
          currency_code: 'USD',
          value: '1.00',
        },
        description: 'Test transaction with vaulted card',
      }],
      payment_source: {
        card: {
          vault_id: vaultResult.paymentToken,
        },
      },
    });

    const orderResult = await new Promise<{ success: boolean; orderId?: string; status?: string; error?: string }>((resolve) => {
      const options: https.RequestOptions = {
        hostname: 'api-m.sandbox.paypal.com',
        port: 443,
        path: '/v2/checkout/orders',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(orderBody),
          'PayPal-Request-Id': `order-vault-${Date.now()}`,
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.id) {
              resolve({ success: true, orderId: response.id, status: response.status });
            } else {
              resolve({ success: false, error: response.message || response.details?.[0]?.description || JSON.stringify(response) });
            }
          } catch (error) {
            resolve({ success: false, error: `Parse error: ${data}` });
          }
        });
      });

      req.on('error', (error) => resolve({ success: false, error: error.message }));
      req.setTimeout(30000, () => { req.destroy(); resolve({ success: false, error: 'Timeout' }); });
      req.write(orderBody);
      req.end();
    });

    if (!orderResult.success) {
      console.log(`❌ Order with vaulted card failed: ${orderResult.error}`);
      return false;
    }

    console.log(`✅ Payment with vaulted card SUCCESSFUL`);
    console.log(`   Order ID: ${orderResult.orderId}`);
    console.log(`   Status: ${orderResult.status}`);

    // Step 5: Delete the vaulted card
    console.log('\nStep 5: Deleting vaulted card...');
    const deleteResult = await new Promise<{ success: boolean; error?: string }>((resolve) => {
      const options: https.RequestOptions = {
        hostname: 'api-m.sandbox.paypal.com',
        port: 443,
        path: `/v3/vault/payment-tokens/${vaultResult.paymentToken}`,
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode === 204 || res.statusCode === 200) {
            resolve({ success: true });
          } else {
            resolve({ success: false, error: `HTTP ${res.statusCode}: ${data}` });
          }
        });
      });

      req.on('error', (error) => resolve({ success: false, error: error.message }));
      req.setTimeout(30000, () => { req.destroy(); resolve({ success: false, error: 'Timeout' }); });
      req.end();
    });

    if (deleteResult.success) {
      console.log(`✅ Vaulted card deleted successfully`);
    } else {
      console.log(`⚠️ Card deletion: ${deleteResult.error}`);
    }

    console.log('\n✅ PayPal Vault tokenization SUCCESSFUL');
    return true;

  } catch (error) {
    console.log(`\n❌ PayPal Vault Error: ${(error as Error).message}`);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║           PAYMENT SYSTEM TEST SUITE                           ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');

  const results: { test: string; passed: boolean }[] = [];

  // Test 1: Card Vault
  const vaultResult = await testCardVaultStorage();
  results.push({ test: 'Card Vault Encrypted Storage', passed: vaultResult });

  // Test 2: PayPal Classic (only if credentials provided via env)
  const paypalUser = process.env.PAYPAL_API_USERNAME;
  const paypalPass = process.env.PAYPAL_API_PASSWORD;
  const paypalSig = process.env.PAYPAL_API_SIGNATURE;

  if (paypalUser && paypalPass && paypalSig) {
    const paypalResult = await testPayPalClassic({
      apiUsername: paypalUser,
      apiPassword: paypalPass,
      apiSignature: paypalSig,
    });
    results.push({ test: 'PayPal Classic DoDirectPayment', passed: paypalResult });
  } else {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('⚠️  SKIPPED: PayPal Classic Test');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('\nTo run PayPal Classic test, set these environment variables:');
    console.log('  PAYPAL_API_USERNAME=<your-sandbox-username>');
    console.log('  PAYPAL_API_PASSWORD=<your-sandbox-password>');
    console.log('  PAYPAL_API_SIGNATURE=<your-sandbox-signature>');
  }

  // Test 3: PayPal REST API (only if credentials provided via env)
  const paypalClientId = process.env.PAYPAL_CLIENT_ID;
  const paypalClientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (paypalClientId && paypalClientSecret) {
    const restResult = await testPayPalREST({
      clientId: paypalClientId,
      clientSecret: paypalClientSecret,
    });
    results.push({ test: 'PayPal REST Orders API', passed: restResult });

    // Test 4: PayPal Vault (only if REST credentials work)
    const vaultResult = await testPayPalVault({
      clientId: paypalClientId,
      clientSecret: paypalClientSecret,
    });
    results.push({ test: 'PayPal Vault Tokenization', passed: vaultResult });
  } else {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('⚠️  SKIPPED: PayPal REST & Vault Tests');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('\nTo run PayPal REST/Vault tests, set these environment variables:');
    console.log('  PAYPAL_CLIENT_ID=<your-client-id>');
    console.log('  PAYPAL_CLIENT_SECRET=<your-client-secret>');
    console.log('\nGet these from: https://developer.paypal.com/dashboard/applications/sandbox');
  }

  // Summary
  console.log('\n\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                     TEST SUMMARY                              ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  results.forEach(r => {
    const status = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`║ ${status.padEnd(8)} │ ${r.test.padEnd(48)} ║`);
  });
  console.log('╚═══════════════════════════════════════════════════════════════╝');

  await prisma.$disconnect();
}

main().catch(console.error);
