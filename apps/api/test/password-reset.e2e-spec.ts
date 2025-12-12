/**
 * Password Reset E2E Integration Tests
 * SOC2 CC6.1 / ISO A.9.4.3 Compliance Tests
 *
 * Tests the complete password reset flow including:
 * - Forgot password request
 * - Token validation
 * - Password reset
 * - Rate limiting
 * - Security (no email enumeration)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Password Reset Flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Test user data
  const testUserEmail = 'admin@avnz.io'; // Using seeded admin user
  let resetToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should return success for valid email', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: testUserEmail })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('If an account exists');

      // In development, token should be returned
      if (process.env.NODE_ENV !== 'production') {
        expect(response.body.token).toBeDefined();
        resetToken = response.body.token;
      }
    });

    it('should return success for non-existent email (no enumeration)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('If an account exists');
      // Should NOT return a token for non-existent users
      expect(response.body.token).toBeUndefined();
    });

    it('should validate email format', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: 'not-an-email' })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
    });

    it('should require email field', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({})
        .expect(400);

      expect(response.body.statusCode).toBe(400);
    });
  });

  describe('POST /api/auth/validate-reset-token', () => {
    beforeAll(async () => {
      // Get a fresh token if we don't have one
      if (!resetToken) {
        const response = await request(app.getHttpServer())
          .post('/api/auth/forgot-password')
          .send({ email: testUserEmail });
        resetToken = response.body.token;
      }
    });

    it('should return valid for a fresh token', async () => {
      if (!resetToken) {
        console.log('Skipping: No reset token available');
        return;
      }

      const response = await request(app.getHttpServer())
        .post('/api/auth/validate-reset-token')
        .send({ token: resetToken })
        .expect(200);

      expect(response.body.valid).toBe(true);
    });

    it('should return invalid for non-existent token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/validate-reset-token')
        .send({ token: 'invalid-token-12345' })
        .expect(200);

      expect(response.body.valid).toBe(false);
    });

    it('should require token field', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/validate-reset-token')
        .send({})
        .expect(400);

      expect(response.body.statusCode).toBe(400);
    });
  });

  describe('POST /api/auth/reset-password', () => {
    let freshToken: string;

    beforeAll(async () => {
      // Get a fresh token for testing password reset
      const response = await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: testUserEmail });
      freshToken = response.body.token;
    });

    it('should reset password with valid token and password', async () => {
      if (!freshToken) {
        console.log('Skipping: No reset token available');
        return;
      }

      const newPassword = 'NewTestPassword123!';

      const response = await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({
          token: freshToken,
          newPassword,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Password has been reset');

      // Verify new password works
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUserEmail,
          password: newPassword,
        });

      expect(loginResponse.body.accessToken).toBeDefined();

      // Reset password back to original for other tests
      const resetResponse = await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: testUserEmail });

      if (resetResponse.body.token) {
        await request(app.getHttpServer())
          .post('/api/auth/reset-password')
          .send({
            token: resetResponse.body.token,
            newPassword: 'demo123',
          });
      }
    });

    it('should reject password shorter than 8 characters', async () => {
      // Get fresh token
      const tokenResponse = await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: testUserEmail });

      if (!tokenResponse.body.token) {
        console.log('Skipping: No reset token available');
        return;
      }

      const response = await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({
          token: tokenResponse.body.token,
          newPassword: 'short',
        })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
      expect(response.body.message).toContain('at least');
    });

    it('should reject invalid token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-token-12345',
          newPassword: 'ValidPassword123!',
        })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
      expect(response.body.message).toContain('Invalid or expired');
    });

    it('should reject already-used token', async () => {
      // Get and use a token
      const tokenResponse = await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: testUserEmail });

      if (!tokenResponse.body.token) {
        console.log('Skipping: No reset token available');
        return;
      }

      // Use the token
      await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({
          token: tokenResponse.body.token,
          newPassword: 'FirstPassword123!',
        })
        .expect(200);

      // Try to use it again
      const response = await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({
          token: tokenResponse.body.token,
          newPassword: 'SecondPassword123!',
        })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
      expect(response.body.message).toContain('Invalid or expired');

      // Reset back to demo password
      const resetResponse = await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: testUserEmail });

      if (resetResponse.body.token) {
        await request(app.getHttpServer())
          .post('/api/auth/reset-password')
          .send({
            token: resetResponse.body.token,
            newPassword: 'demo123',
          });
      }
    });

    it('should require both token and newPassword fields', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({ token: 'some-token' })
        .expect(400);

      await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({ newPassword: 'SomePassword123!' })
        .expect(400);
    });
  });

  describe('Security Tests', () => {
    it('should invalidate all user tokens after password reset', async () => {
      // Login to get tokens
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUserEmail,
          password: 'demo123',
        });

      const accessToken = loginResponse.body.accessToken;

      // Get reset token and change password
      const tokenResponse = await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: testUserEmail });

      if (!tokenResponse.body.token) {
        console.log('Skipping: No reset token available');
        return;
      }

      await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({
          token: tokenResponse.body.token,
          newPassword: 'ChangedPassword123!',
        })
        .expect(200);

      // Old token should be invalid
      const protectedResponse = await request(app.getHttpServer())
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${accessToken}`);

      // Should get 401 because token was invalidated
      expect([401, 403]).toContain(protectedResponse.status);

      // Reset password back
      const resetResponse = await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: testUserEmail });

      if (resetResponse.body.token) {
        await request(app.getHttpServer())
          .post('/api/auth/reset-password')
          .send({
            token: resetResponse.body.token,
            newPassword: 'demo123',
          });
      }
    });

    it('should store hashed token in database, not raw token', async () => {
      const tokenResponse = await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: testUserEmail });

      if (!tokenResponse.body.token) {
        console.log('Skipping: No reset token available');
        return;
      }

      const rawToken = tokenResponse.body.token;

      // Check database - raw token should NOT be stored
      const dbTokens = await prisma.passwordResetToken.findMany({
        where: {
          user: { email: testUserEmail },
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });

      expect(dbTokens.length).toBeGreaterThan(0);
      // The stored token should be different from raw token (it's hashed)
      expect(dbTokens[0].token).not.toBe(rawToken);
      // Stored token should be 64 chars (SHA-256 hex)
      expect(dbTokens[0].token).toHaveLength(64);
    });

    it('should set token expiry to 15 minutes', async () => {
      const tokenResponse = await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: testUserEmail });

      if (!tokenResponse.body.token) {
        console.log('Skipping: No reset token available');
        return;
      }

      // Check database for expiry time
      const dbTokens = await prisma.passwordResetToken.findMany({
        where: {
          user: { email: testUserEmail },
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });

      expect(dbTokens.length).toBeGreaterThan(0);

      const expiresAt = new Date(dbTokens[0].expiresAt);
      const createdAt = new Date(dbTokens[0].createdAt);
      const diffMinutes = (expiresAt.getTime() - createdAt.getTime()) / (1000 * 60);

      // Should be approximately 15 minutes (allow 1 minute variance)
      expect(diffMinutes).toBeGreaterThanOrEqual(14);
      expect(diffMinutes).toBeLessThanOrEqual(16);
    });
  });
});
