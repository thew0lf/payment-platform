import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeType } from '@prisma/client';
import { TokenBlacklistService } from './services/token-blacklist.service';
import { EmailService } from '../email/services/email.service';

// SOC2 CC6.1 / ISO A.9.4.3 Compliant Password Reset Configuration
const PASSWORD_RESET_CONFIG = {
  TOKEN_EXPIRY_MINUTES: 15, // SOC2 requirement: short-lived tokens
  MIN_PASSWORD_LENGTH: 8,
  MAX_RESET_ATTEMPTS_PER_HOUR: 3, // Rate limiting for security
  BCRYPT_ROUNDS: 12,
};

export interface JwtPayload {
  sub: string;
  email: string;
  scopeType: ScopeType;
  scopeId: string;
  role: string;
  type?: 'access' | 'refresh';
  iat?: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatar: string | null;
  scopeType: ScopeType;
  scopeId: string;
  role: string;
  organizationId: string | null;
  clientId: string | null;
  companyId: string | null;
  departmentId: string | null;
  client?: {
    id: string;
    name: string;
    plan: string;
    status: string;
  };
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthenticatedUser;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly tokenBlacklistService: TokenBlacklistService,
    private readonly emailService: EmailService,
  ) {
    // Access token: 15 minutes in production, 7 days in development
    this.accessTokenExpiry =
      this.configService.get('NODE_ENV') === 'production' ? '15m' : '7d';
    // Refresh token: 7 days
    this.refreshTokenExpiry = '7d';
  }

  async validateUser(email: string, password: string): Promise<AuthenticatedUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        firstName: true,
        lastName: true,
        avatar: true,
        scopeType: true,
        scopeId: true,
        role: true,
        status: true,
        organizationId: true,
        clientId: true,
        companyId: true,
        departmentId: true,
        client: {
          select: {
            id: true,
            name: true,
            plan: true,
            status: true,
          },
        },
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      return null;
    }

    if (!user.passwordHash) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return null;
    }

    const { passwordHash, status, ...result } = user;
    return {
      ...result,
      client: user.client ? {
        id: user.client.id,
        name: user.client.name,
        plan: user.client.plan,
        status: user.client.status,
      } : undefined,
    };
  }

  private generateTokens(user: AuthenticatedUser): TokenPair {
    const basePayload = {
      sub: user.id,
      email: user.email,
      scopeType: user.scopeType,
      scopeId: user.scopeId,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(
      { ...basePayload, type: 'access' },
      { expiresIn: this.accessTokenExpiry },
    );

    const refreshToken = this.jwtService.sign(
      { ...basePayload, type: 'refresh' },
      { expiresIn: this.refreshTokenExpiry },
    );

    // Calculate expiry in seconds
    const expiresIn = this.accessTokenExpiry.endsWith('m')
      ? parseInt(this.accessTokenExpiry) * 60
      : parseInt(this.accessTokenExpiry) * 24 * 60 * 60;

    return { accessToken, refreshToken, expiresIn };
  }

  async login(user: AuthenticatedUser): Promise<LoginResponse> {
    const tokens = this.generateTokens(user);
    this.logger.log(`User logged in: ${user.id}`);

    return {
      ...tokens,
      user,
    };
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    try {
      // Verify the refresh token
      const payload = this.jwtService.verify<JwtPayload>(refreshToken);

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Check if token is blacklisted
      const isBlacklisted = await this.tokenBlacklistService.isBlacklisted(refreshToken);
      if (isBlacklisted) {
        throw new UnauthorizedException('Token has been revoked');
      }

      // Check if user tokens have been invalidated
      if (payload.iat) {
        const isInvalidated = await this.tokenBlacklistService.isUserTokenInvalidated(
          payload.sub,
          payload.iat * 1000,
        );
        if (isInvalidated) {
          throw new UnauthorizedException('Token has been revoked');
        }
      }

      // Get fresh user data
      const user = await this.getUserById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Blacklist the old refresh token (rotation)
      const decoded = this.jwtService.decode(refreshToken) as { exp: number };
      await this.tokenBlacklistService.blacklistToken(
        refreshToken,
        new Date(decoded.exp * 1000),
      );

      // Generate new tokens
      return this.generateTokens(user);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(accessToken: string, refreshToken?: string): Promise<void> {
    try {
      // Blacklist the access token
      const accessDecoded = this.jwtService.decode(accessToken) as { exp: number; sub: string };
      if (accessDecoded?.exp) {
        await this.tokenBlacklistService.blacklistToken(
          accessToken,
          new Date(accessDecoded.exp * 1000),
        );
      }

      // Blacklist the refresh token if provided
      if (refreshToken) {
        const refreshDecoded = this.jwtService.decode(refreshToken) as { exp: number };
        if (refreshDecoded?.exp) {
          await this.tokenBlacklistService.blacklistToken(
            refreshToken,
            new Date(refreshDecoded.exp * 1000),
          );
        }
      }

      this.logger.log(`User logged out: ${accessDecoded?.sub}`);
    } catch {
      // Still consider logout successful even if token parsing fails
      this.logger.warn('Logout called with invalid token');
    }
  }

  async invalidateAllTokens(userId: string): Promise<void> {
    await this.tokenBlacklistService.invalidateAllUserTokens(userId);
    this.logger.log(`All tokens invalidated for user: ${userId}`);
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    return this.tokenBlacklistService.isBlacklisted(token);
  }

  async getUserById(id: string): Promise<AuthenticatedUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            plan: true,
            status: true,
          },
        },
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      scopeType: user.scopeType,
      scopeId: user.scopeId,
      role: user.role,
      organizationId: user.organizationId,
      clientId: user.clientId,
      companyId: user.companyId,
      departmentId: user.departmentId,
      client: user.client ? {
        id: user.client.id,
        name: user.client.name,
        plan: user.client.plan,
        status: user.client.status,
      } : undefined,
    };
  }

  // =============================================================================
  // PASSWORD RESET - SOC2 CC6.1 / ISO A.9.4.3 Compliant
  // =============================================================================

  /**
   * Request password reset - generates a secure token and returns it
   * In production, this would send an email. For now, returns the token for testing.
   * SOC2 CC6.1: Access control, secure authentication
   * ISO A.9.4.3: Password management system
   */
  async requestPasswordReset(
    email: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ success: boolean; message: string; token?: string }> {
    // Check rate limiting - max 3 requests per hour per email
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentAttempts = await this.prisma.passwordResetToken.count({
      where: {
        user: { email },
        createdAt: { gte: oneHourAgo },
      },
    });

    if (recentAttempts >= PASSWORD_RESET_CONFIG.MAX_RESET_ATTEMPTS_PER_HOUR) {
      this.logger.warn(`Password reset rate limit exceeded for email: ${email}`);
      // Return success to prevent email enumeration attacks
      return {
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link.',
      };
    }

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, firstName: true, status: true },
    });

    // Don't reveal if user exists - always return success
    if (!user || user.status !== 'ACTIVE') {
      this.logger.log(`Password reset requested for non-existent/inactive email: ${email}`);
      return {
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link.',
      };
    }

    // Invalidate any existing unused tokens
    await this.prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
      data: {
        usedAt: new Date(), // Mark as used
      },
    });

    // Generate secure token (64 bytes = 128 hex chars)
    const rawToken = crypto.randomBytes(64).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Calculate expiry
    const expiresAt = new Date(
      Date.now() + PASSWORD_RESET_CONFIG.TOKEN_EXPIRY_MINUTES * 60 * 1000,
    );

    // Store hashed token
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: hashedToken,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    this.logger.log(`Password reset token created for user: ${user.id}`);

    // Send password reset email via AWS SES
    const emailResult = await this.emailService.sendPasswordResetEmail(
      user.email,
      rawToken,
      {
        toName: user.firstName || undefined,
        ipAddress,
        userAgent,
      },
    );

    if (!emailResult.success) {
      this.logger.error(`Failed to send password reset email to ${user.email}: ${emailResult.error}`);
      // Still return success to prevent email enumeration
    } else {
      this.logger.log(`Password reset email sent to ${user.email}`);
    }

    // For development, also return the token for testing
    const isDevelopment = this.configService.get('NODE_ENV') !== 'production';

    return {
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link.',
      ...(isDevelopment && { token: rawToken }), // Only expose token in development
    };
  }

  /**
   * Validate password reset token
   */
  async validateResetToken(token: string): Promise<{ valid: boolean; userId?: string }> {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token: hashedToken },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        usedAt: true,
        user: { select: { status: true } },
      },
    });

    if (!resetToken) {
      return { valid: false };
    }

    // Check if already used
    if (resetToken.usedAt) {
      this.logger.warn(`Attempted to use already-used reset token`);
      return { valid: false };
    }

    // Check if expired
    if (resetToken.expiresAt < new Date()) {
      this.logger.warn(`Attempted to use expired reset token`);
      return { valid: false };
    }

    // Check if user is still active
    if (resetToken.user.status !== 'ACTIVE') {
      return { valid: false };
    }

    return { valid: true, userId: resetToken.userId };
  }

  /**
   * Reset password using token
   * SOC2 CC6.1: Secure password change
   * ISO A.9.4.3: Password management
   */
  async resetPassword(
    token: string,
    newPassword: string,
    ipAddress?: string,
  ): Promise<{ success: boolean; message: string }> {
    // Validate password strength
    if (newPassword.length < PASSWORD_RESET_CONFIG.MIN_PASSWORD_LENGTH) {
      throw new BadRequestException(
        `Password must be at least ${PASSWORD_RESET_CONFIG.MIN_PASSWORD_LENGTH} characters`,
      );
    }

    // Validate token
    const validation = await this.validateResetToken(token);
    if (!validation.valid || !validation.userId) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, PASSWORD_RESET_CONFIG.BCRYPT_ROUNDS);

    // Update password and mark token as used in a transaction
    await this.prisma.$transaction(async (tx) => {
      // Update user password
      await tx.user.update({
        where: { id: validation.userId },
        data: { passwordHash },
      });

      // Mark token as used
      await tx.passwordResetToken.update({
        where: { token: hashedToken },
        data: { usedAt: new Date() },
      });

      // Invalidate all user's tokens (force re-login)
      // Safe assertion: validation.userId is verified above (line 414)
      await this.invalidateAllTokens(validation.userId as string);
    });

    this.logger.log(`Password reset completed for user: ${validation.userId}`);

    return {
      success: true,
      message: 'Password has been reset successfully. Please log in with your new password.',
    };
  }

  /**
   * Clean up expired tokens (should be run periodically)
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.prisma.passwordResetToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { usedAt: { not: null } },
        ],
      },
    });
    this.logger.log(`Cleaned up ${result.count} expired/used password reset tokens`);
    return result.count;
  }
}
