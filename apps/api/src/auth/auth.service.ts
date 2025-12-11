import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeType } from '@prisma/client';
import { TokenBlacklistService } from './services/token-blacklist.service';

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
    return result;
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
    };
  }
}
