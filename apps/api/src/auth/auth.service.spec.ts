/**
 * Auth Service Unit Tests - Password Reset
 * SOC2 CC6.1 / ISO A.9.4.3 Compliance Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { JwtService, JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { TokenBlacklistService } from './services/token-blacklist.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

describe('AuthService - Password Reset', () => {
  let authService: AuthService;
  let prismaService: PrismaService;
  let configService: ConfigService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    passwordResetToken: {
      count: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn((fn) => fn(mockPrismaService)),
  };

  const mockTokenBlacklistService = {
    isBlacklisted: jest.fn().mockResolvedValue(false),
    blacklistToken: jest.fn().mockResolvedValue(undefined),
    invalidateAllUserTokens: jest.fn().mockResolvedValue(undefined),
    isUserTokenInvalidated: jest.fn().mockResolvedValue(false),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'NODE_ENV') return 'development';
      if (key === 'JWT_SECRET') return 'test-secret';
      return null;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: TokenBlacklistService, useValue: mockTokenBlacklistService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('requestPasswordReset', () => {
    const testEmail = 'test@example.com';
    const testUserId = 'user-123';

    it('should create a password reset token for valid user', async () => {
      mockPrismaService.passwordResetToken.count.mockResolvedValue(0);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: testUserId,
        email: testEmail,
        status: 'ACTIVE',
      });
      mockPrismaService.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.passwordResetToken.create.mockResolvedValue({ id: 'token-1' });

      const result = await authService.requestPasswordReset(testEmail);

      expect(result.success).toBe(true);
      expect(result.message).toContain('If an account exists');
      expect(result.token).toBeDefined(); // Token returned in development mode
      expect(mockPrismaService.passwordResetToken.create).toHaveBeenCalled();
    });

    it('should NOT reveal if user does not exist (security)', async () => {
      mockPrismaService.passwordResetToken.count.mockResolvedValue(0);
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await authService.requestPasswordReset('nonexistent@example.com');

      expect(result.success).toBe(true);
      expect(result.message).toContain('If an account exists');
      expect(result.token).toBeUndefined();
      expect(mockPrismaService.passwordResetToken.create).not.toHaveBeenCalled();
    });

    it('should enforce rate limiting (3 attempts per hour)', async () => {
      mockPrismaService.passwordResetToken.count.mockResolvedValue(3); // Already at limit

      const result = await authService.requestPasswordReset(testEmail);

      expect(result.success).toBe(true); // Still returns success to prevent enumeration
      expect(mockPrismaService.user.findUnique).not.toHaveBeenCalled(); // Should not even look up user
    });

    it('should invalidate previous unused tokens', async () => {
      mockPrismaService.passwordResetToken.count.mockResolvedValue(0);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: testUserId,
        email: testEmail,
        status: 'ACTIVE',
      });
      mockPrismaService.passwordResetToken.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.passwordResetToken.create.mockResolvedValue({ id: 'token-1' });

      await authService.requestPasswordReset(testEmail);

      expect(mockPrismaService.passwordResetToken.updateMany).toHaveBeenCalledWith({
        where: {
          userId: testUserId,
          usedAt: null,
        },
        data: {
          usedAt: expect.any(Date),
        },
      });
    });

    it('should NOT create token for inactive user', async () => {
      mockPrismaService.passwordResetToken.count.mockResolvedValue(0);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: testUserId,
        email: testEmail,
        status: 'SUSPENDED',
      });

      const result = await authService.requestPasswordReset(testEmail);

      expect(result.success).toBe(true);
      expect(result.token).toBeUndefined();
      expect(mockPrismaService.passwordResetToken.create).not.toHaveBeenCalled();
    });

    it('should store hashed token, not raw token', async () => {
      mockPrismaService.passwordResetToken.count.mockResolvedValue(0);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: testUserId,
        email: testEmail,
        status: 'ACTIVE',
      });
      mockPrismaService.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.passwordResetToken.create.mockResolvedValue({ id: 'token-1' });

      const result = await authService.requestPasswordReset(testEmail);

      const createCall = mockPrismaService.passwordResetToken.create.mock.calls[0][0];
      // Token stored should be SHA-256 hash (64 hex chars)
      expect(createCall.data.token).toHaveLength(64);
      // Raw token returned should be 128 hex chars (64 bytes)
      expect(result.token).toHaveLength(128);
    });

    it('should include IP and user agent in token record', async () => {
      const ipAddress = '192.168.1.1';
      const userAgent = 'Mozilla/5.0';

      mockPrismaService.passwordResetToken.count.mockResolvedValue(0);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: testUserId,
        email: testEmail,
        status: 'ACTIVE',
      });
      mockPrismaService.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.passwordResetToken.create.mockResolvedValue({ id: 'token-1' });

      await authService.requestPasswordReset(testEmail, ipAddress, userAgent);

      const createCall = mockPrismaService.passwordResetToken.create.mock.calls[0][0];
      expect(createCall.data.ipAddress).toBe(ipAddress);
      expect(createCall.data.userAgent).toBe(userAgent);
    });
  });

  describe('validateResetToken', () => {
    const rawToken = crypto.randomBytes(64).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    it('should return valid for a fresh, unexpired token', async () => {
      mockPrismaService.passwordResetToken.findUnique.mockResolvedValue({
        id: 'token-1',
        userId: 'user-123',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min from now
        usedAt: null,
        user: { status: 'ACTIVE' },
      });

      const result = await authService.validateResetToken(rawToken);

      expect(result.valid).toBe(true);
      expect(result.userId).toBe('user-123');
    });

    it('should return invalid for non-existent token', async () => {
      mockPrismaService.passwordResetToken.findUnique.mockResolvedValue(null);

      const result = await authService.validateResetToken('invalid-token');

      expect(result.valid).toBe(false);
      expect(result.userId).toBeUndefined();
    });

    it('should return invalid for already-used token', async () => {
      mockPrismaService.passwordResetToken.findUnique.mockResolvedValue({
        id: 'token-1',
        userId: 'user-123',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        usedAt: new Date(), // Already used
        user: { status: 'ACTIVE' },
      });

      const result = await authService.validateResetToken(rawToken);

      expect(result.valid).toBe(false);
    });

    it('should return invalid for expired token', async () => {
      mockPrismaService.passwordResetToken.findUnique.mockResolvedValue({
        id: 'token-1',
        userId: 'user-123',
        expiresAt: new Date(Date.now() - 1000), // Expired
        usedAt: null,
        user: { status: 'ACTIVE' },
      });

      const result = await authService.validateResetToken(rawToken);

      expect(result.valid).toBe(false);
    });

    it('should return invalid for deactivated user', async () => {
      mockPrismaService.passwordResetToken.findUnique.mockResolvedValue({
        id: 'token-1',
        userId: 'user-123',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        usedAt: null,
        user: { status: 'DEACTIVATED' },
      });

      const result = await authService.validateResetToken(rawToken);

      expect(result.valid).toBe(false);
    });
  });

  describe('resetPassword', () => {
    const rawToken = crypto.randomBytes(64).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const newPassword = 'NewSecurePassword123!';

    beforeEach(() => {
      // Mock validateResetToken by mocking findUnique
      mockPrismaService.passwordResetToken.findUnique.mockResolvedValue({
        id: 'token-1',
        userId: 'user-123',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        usedAt: null,
        user: { status: 'ACTIVE' },
      });
    });

    it('should reset password and invalidate token', async () => {
      mockPrismaService.user.update.mockResolvedValue({ id: 'user-123' });
      mockPrismaService.passwordResetToken.update.mockResolvedValue({ id: 'token-1' });

      const result = await authService.resetPassword(rawToken, newPassword);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Password has been reset');
      expect(mockPrismaService.user.update).toHaveBeenCalled();
      expect(mockPrismaService.passwordResetToken.update).toHaveBeenCalled();
    });

    it('should throw error for password too short', async () => {
      await expect(authService.resetPassword(rawToken, 'short')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error for invalid token', async () => {
      mockPrismaService.passwordResetToken.findUnique.mockResolvedValue(null);

      await expect(authService.resetPassword('invalid-token', newPassword)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should invalidate all user tokens after password reset', async () => {
      mockPrismaService.user.update.mockResolvedValue({ id: 'user-123' });
      mockPrismaService.passwordResetToken.update.mockResolvedValue({ id: 'token-1' });

      await authService.resetPassword(rawToken, newPassword);

      expect(mockTokenBlacklistService.invalidateAllUserTokens).toHaveBeenCalledWith('user-123');
    });

    it('should hash password with bcrypt before storing', async () => {
      mockPrismaService.user.update.mockResolvedValue({ id: 'user-123' });
      mockPrismaService.passwordResetToken.update.mockResolvedValue({ id: 'token-1' });

      await authService.resetPassword(rawToken, newPassword);

      const updateCall = mockPrismaService.user.update.mock.calls[0][0];
      const storedHash = updateCall.data.passwordHash;

      // Verify it's a bcrypt hash
      expect(storedHash).toMatch(/^\$2[aby]?\$\d+\$/);

      // Verify the password matches the hash
      const isMatch = await bcrypt.compare(newPassword, storedHash);
      expect(isMatch).toBe(true);
    });

    it('should mark token as used', async () => {
      mockPrismaService.user.update.mockResolvedValue({ id: 'user-123' });
      mockPrismaService.passwordResetToken.update.mockResolvedValue({ id: 'token-1' });

      await authService.resetPassword(rawToken, newPassword);

      expect(mockPrismaService.passwordResetToken.update).toHaveBeenCalledWith({
        where: { token: hashedToken },
        data: { usedAt: expect.any(Date) },
      });
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should delete expired and used tokens', async () => {
      mockPrismaService.passwordResetToken.deleteMany.mockResolvedValue({ count: 5 });

      const result = await authService.cleanupExpiredTokens();

      expect(result).toBe(5);
      expect(mockPrismaService.passwordResetToken.deleteMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { expiresAt: { lt: expect.any(Date) } },
            { usedAt: { not: null } },
          ],
        },
      });
    });
  });
});
