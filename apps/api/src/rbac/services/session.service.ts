import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserSession } from '../types/rbac.types';
import { randomBytes } from 'crypto';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // SESSION MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Create a new session for a user
   */
  async createSession(
    userId: string,
    options: {
      userAgent?: string;
      ipAddress?: string;
      deviceInfo?: Record<string, any>;
      city?: string;
      country?: string;
      expiresInMs?: number;
    } = {},
  ): Promise<UserSession> {
    const sessionToken = this.generateSessionToken();
    const expiresAt = new Date(Date.now() + (options.expiresInMs || 7 * 24 * 60 * 60 * 1000)); // Default 7 days

    const session = await this.prisma.userSession.create({
      data: {
        userId,
        sessionToken,
        userAgent: options.userAgent,
        ipAddress: options.ipAddress,
        deviceInfo: options.deviceInfo,
        city: options.city,
        country: options.country,
        expiresAt,
      },
    });

    this.logger.log(`Created session for user ${userId}`);
    this.eventEmitter.emit('rbac.session.created', { userId, sessionId: session.id });

    return this.mapToUserSession(session);
  }

  /**
   * Validate and get session by token
   */
  async validateSession(sessionToken: string): Promise<UserSession | null> {
    const session = await this.prisma.userSession.findUnique({
      where: { sessionToken },
    });

    if (!session) {
      return null;
    }

    // Check if session is valid
    if (!session.isActive || session.revokedAt || session.expiresAt < new Date()) {
      return null;
    }

    // Update last active
    await this.prisma.userSession.update({
      where: { id: session.id },
      data: { lastActiveAt: new Date() },
    });

    return this.mapToUserSession(session);
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string, activeOnly = true): Promise<UserSession[]> {
    const where: any = { userId };

    if (activeOnly) {
      where.isActive = true;
      where.revokedAt = null;
      where.expiresAt = { gt: new Date() };
    }

    const sessions = await this.prisma.userSession.findMany({
      where,
      orderBy: { lastActiveAt: 'desc' },
    });

    return sessions.map(this.mapToUserSession.bind(this));
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(
    sessionId: string,
    revokedBy?: string,
    reason?: string,
  ): Promise<void> {
    const session = await this.prisma.userSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    await this.prisma.userSession.update({
      where: { id: sessionId },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokedBy,
        revokeReason: reason,
      },
    });

    this.logger.log(`Revoked session ${sessionId} for user ${session.userId}`);
    this.eventEmitter.emit('rbac.session.revoked', { sessionId, userId: session.userId });
  }

  /**
   * Revoke all sessions for a user (except current)
   */
  async revokeAllUserSessions(
    userId: string,
    exceptSessionId?: string,
    revokedBy?: string,
    reason?: string,
  ): Promise<number> {
    const where: any = {
      userId,
      isActive: true,
      revokedAt: null,
    };

    if (exceptSessionId) {
      where.id = { not: exceptSessionId };
    }

    const result = await this.prisma.userSession.updateMany({
      where,
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokedBy,
        revokeReason: reason || 'Revoked all sessions',
      },
    });

    this.logger.log(`Revoked ${result.count} sessions for user ${userId}`);
    this.eventEmitter.emit('rbac.session.revoked_all', { userId, count: result.count });

    return result.count;
  }

  /**
   * Clean up expired sessions (call periodically)
   */
  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.prisma.userSession.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { revokedAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }, // Keep revoked for 30 days
        ],
      },
    });

    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} expired sessions`);
    }

    return result.count;
  }

  /**
   * Get session count for a user
   */
  async getActiveSessionCount(userId: string): Promise<number> {
    return this.prisma.userSession.count({
      where: {
        userId,
        isActive: true,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════

  private generateSessionToken(): string {
    return randomBytes(32).toString('hex');
  }

  private mapToUserSession(data: any): UserSession {
    return {
      id: data.id,
      userId: data.userId,
      sessionToken: data.sessionToken,
      userAgent: data.userAgent,
      ipAddress: data.ipAddress,
      deviceInfo: data.deviceInfo,
      city: data.city,
      country: data.country,
      isActive: data.isActive,
      lastActiveAt: data.lastActiveAt,
      createdAt: data.createdAt,
      expiresAt: data.expiresAt,
      revokedAt: data.revokedAt,
      revokedBy: data.revokedBy,
      revokeReason: data.revokeReason,
    };
  }
}
