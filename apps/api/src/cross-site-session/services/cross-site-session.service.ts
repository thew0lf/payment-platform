import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { CartService } from '../../cart/services/cart.service';
import { WishlistService } from '../../wishlist/services/wishlist.service';
import { ComparisonService } from '../../comparison/services/comparison.service';
import { CrossSiteSession, CrossSiteSessionStatus, Prisma } from '@prisma/client';
import { randomBytes, timingSafeEqual } from 'crypto';
import { AuditAction } from '../../audit-logs/types/audit-log.types';
import {
  CrossSiteSessionData,
  SessionDataReference,
  SessionDataType,
  SessionStatus,
  SessionMigrationResult,
  SessionMergeConflict,
  SessionSummary,
  CreateCrossSiteSessionInput,
  TransferSessionInput,
  AttachCustomerInput,
  MAX_SESSION_AGE_DAYS,
  SESSION_TOKEN_LENGTH,
} from '../types/cross-site-session.types';

@Injectable()
export class CrossSiteSessionService {
  private readonly logger = new Logger(CrossSiteSessionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogsService,
    private readonly cartService: CartService,
    private readonly wishlistService: WishlistService,
    private readonly comparisonService: ComparisonService,
  ) {}

  /**
   * Constant-time comparison of session tokens to prevent timing attacks
   */
  private secureTokenCompare(token1: string, token2: string): boolean {
    try {
      const buf1 = Buffer.from(token1, 'utf8');
      const buf2 = Buffer.from(token2, 'utf8');

      // If lengths differ, still do a comparison to avoid timing leaks
      if (buf1.length !== buf2.length) {
        // Compare with self to maintain constant time
        timingSafeEqual(buf1, buf1);
        return false;
      }

      return timingSafeEqual(buf1, buf2);
    } catch {
      return false;
    }
  }

  /**
   * Generate a unique 64-character session token
   */
  generateSessionToken(): string {
    return randomBytes(SESSION_TOKEN_LENGTH / 2).toString('hex');
  }

  /**
   * Create a new cross-site session
   */
  async createSession(
    companyId: string,
    dto: Omit<CreateCrossSiteSessionInput, 'companyId'>,
    actorId?: string,
  ): Promise<CrossSiteSessionData> {
    const sessionToken = this.generateSessionToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + MAX_SESSION_AGE_DAYS);

    const session = await this.prisma.crossSiteSession.create({
      data: {
        companyId,
        sessionToken,
        visitorId: dto.visitorId,
        deviceInfo: dto.deviceInfo
          ? (dto.deviceInfo as Prisma.InputJsonValue)
          : undefined,
        expiresAt,
        dataReferences: [],
      },
      include: {
        company: true,
        customer: true,
      },
    });

    // Audit log
    if (actorId) {
      await this.auditLogService.log(
        AuditAction.CREATE,
        'CrossSiteSession',
        session.id,
        {
          userId: actorId,
          metadata: {
            companyId,
            siteId: dto.siteId,
            hasDeviceInfo: !!dto.deviceInfo,
          },
        },
      );
    }

    return this.toSessionData(session);
  }

  /**
   * Get session by session token
   */
  async getSessionByToken(
    sessionToken: string,
    companyId: string,
  ): Promise<CrossSiteSessionData | null> {
    const session = await this.prisma.crossSiteSession.findFirst({
      where: {
        sessionToken,
        companyId,
        status: CrossSiteSessionStatus.ACTIVE,
        expiresAt: { gt: new Date() },
      },
      include: {
        company: true,
        customer: true,
      },
    });

    return session ? this.toSessionData(session) : null;
  }

  /**
   * Get session by ID
   */
  async getSessionById(id: string): Promise<CrossSiteSessionData> {
    const session = await this.prisma.crossSiteSession.findUnique({
      where: { id },
      include: {
        company: true,
        customer: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Cross-site session not found');
    }

    return this.toSessionData(session);
  }

  /**
   * Update session activity timestamp
   */
  async updateSessionActivity(sessionToken: string): Promise<void> {
    const session = await this.prisma.crossSiteSession.findFirst({
      where: {
        sessionToken,
        status: CrossSiteSessionStatus.ACTIVE,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    await this.prisma.crossSiteSession.update({
      where: { id: session.id },
      data: { lastActiveAt: new Date() },
    });
  }

  /**
   * Transfer session data to another site
   * Links cart/wishlist/comparison from source site to this session
   */
  async transferSession(
    sessionToken: string,
    dto: Omit<TransferSessionInput, 'sessionToken'>,
    actorId?: string,
  ): Promise<CrossSiteSessionData> {
    const session = await this.prisma.crossSiteSession.findFirst({
      where: {
        sessionToken,
        status: CrossSiteSessionStatus.ACTIVE,
        expiresAt: { gt: new Date() },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const companyId = session.companyId;
    const dataReferences = (session.dataReferences as unknown as SessionDataReference[]) || [];
    const newReferences: SessionDataReference[] = [];
    const dataTypesToTransfer = dto.dataTypes || [
      SessionDataType.CART,
      SessionDataType.WISHLIST,
      SessionDataType.COMPARISON,
    ];

    // Get or create cart for the new site if requested
    if (dataTypesToTransfer.includes(SessionDataType.CART)) {
      const cart = await this.cartService.getOrCreateCart(companyId, {
        sessionToken,
        siteId: dto.targetSiteId,
      });
      if (cart) {
        newReferences.push({
          type: SessionDataType.CART,
          entityId: cart.id,
          siteId: dto.targetSiteId,
          lastUpdated: new Date(),
        });
      }
    }

    // Get or create wishlist for the new site if requested
    if (dataTypesToTransfer.includes(SessionDataType.WISHLIST)) {
      const wishlist = await this.wishlistService.getOrCreateWishlist(companyId, {
        sessionToken,
        siteId: dto.targetSiteId,
      });
      if (wishlist) {
        newReferences.push({
          type: SessionDataType.WISHLIST,
          entityId: wishlist.id,
          siteId: dto.targetSiteId,
          lastUpdated: new Date(),
        });
      }
    }

    // Get or create comparison for the new site if requested
    if (dataTypesToTransfer.includes(SessionDataType.COMPARISON)) {
      const comparison = await this.comparisonService.getOrCreateComparison(companyId, {
        sessionToken,
        siteId: dto.targetSiteId,
      });
      if (comparison) {
        newReferences.push({
          type: SessionDataType.COMPARISON,
          entityId: comparison.id,
          siteId: dto.targetSiteId,
          lastUpdated: new Date(),
        });
      }
    }

    // Merge existing references with new ones (avoiding duplicates by site + type)
    const mergedReferences = [...dataReferences];
    for (const newRef of newReferences) {
      const existingIndex = mergedReferences.findIndex(
        (ref) => ref.siteId === newRef.siteId && ref.type === newRef.type,
      );
      if (existingIndex >= 0) {
        mergedReferences[existingIndex] = newRef;
      } else {
        mergedReferences.push(newRef);
      }
    }

    const updatedSession = await this.prisma.crossSiteSession.update({
      where: { id: session.id },
      data: {
        dataReferences: mergedReferences as unknown as Prisma.InputJsonValue,
        lastActiveAt: new Date(),
      },
      include: {
        company: true,
        customer: true,
      },
    });

    // Audit log
    if (actorId) {
      await this.auditLogService.log(
        AuditAction.UPDATE,
        'CrossSiteSession',
        session.id,
        {
          userId: actorId,
          metadata: {
            action: 'transfer',
            targetSiteId: dto.targetSiteId,
            dataTypes: dataTypesToTransfer,
          },
        },
      );
    }

    return this.toSessionData(updatedSession);
  }

  /**
   * Merge sessions when user logs in
   * Combines anonymous session data into the customer's session
   */
  async mergeSessionsOnLogin(
    sourceToken: string,
    customerId: string,
    actorId?: string,
  ): Promise<SessionMigrationResult> {
    // Find the source (anonymous) session
    const sourceSession = await this.prisma.crossSiteSession.findFirst({
      where: {
        sessionToken: sourceToken,
        status: CrossSiteSessionStatus.ACTIVE,
      },
    });

    if (!sourceSession) {
      throw new NotFoundException('Source session not found');
    }

    // Verify the customer exists and belongs to the same company
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    if (customer.companyId !== sourceSession.companyId) {
      throw new ForbiddenException('Customer does not belong to this company');
    }

    // Find or create a session for the customer
    let targetSession = await this.prisma.crossSiteSession.findFirst({
      where: {
        customerId,
        companyId: sourceSession.companyId,
        status: CrossSiteSessionStatus.ACTIVE,
        expiresAt: { gt: new Date() },
      },
    });

    if (!targetSession) {
      // Create a new session for the customer
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + MAX_SESSION_AGE_DAYS);

      targetSession = await this.prisma.crossSiteSession.create({
        data: {
          companyId: sourceSession.companyId,
          sessionToken: this.generateSessionToken(),
          customerId,
          deviceInfo: sourceSession.deviceInfo,
          expiresAt,
          dataReferences: [],
        },
      });
    }

    const conflicts: SessionMergeConflict[] = [];
    const migratedData: SessionMigrationResult['migratedData'] = {};

    // Get source session data references
    const sourceReferences = (sourceSession.dataReferences as unknown as SessionDataReference[]) || [];
    const targetReferences = (targetSession.dataReferences as unknown as SessionDataReference[]) || [];

    // Merge cart data
    const sourceCartRef = sourceReferences.find((r) => r.type === SessionDataType.CART);
    const targetCartRef = targetReferences.find((r) => r.type === SessionDataType.CART);

    if (sourceCartRef) {
      try {
        const sourceCart = await this.cartService.getCartBySessionToken(
          sourceToken,
          sourceSession.companyId,
        );
        if (sourceCart && sourceCart.items.length > 0) {
          if (targetCartRef) {
            // Merge carts - source items go into target cart
            await this.cartService.mergeCarts(sourceCart.id, targetCartRef.entityId, actorId);
            const mergedCart = await this.cartService.getCartById(targetCartRef.entityId);
            migratedData.cart = {
              itemCount: mergedCart.totals.itemCount,
              cartId: targetCartRef.entityId,
            };
            conflicts.push({
              type: SessionDataType.CART,
              sourceId: sourceCart.id,
              targetId: targetCartRef.entityId,
              resolution: 'MERGED',
              details: `Merged ${sourceCart.items.length} items from source cart`,
            });
          } else {
            // Just link the source cart to the customer
            await this.prisma.cart.update({
              where: { id: sourceCart.id },
              data: { customerId },
            });
            migratedData.cart = {
              itemCount: sourceCart.items.length,
              cartId: sourceCart.id,
            };
          }
        }
      } catch (error) {
        // Cart merge failed, log but continue
        conflicts.push({
          type: SessionDataType.CART,
          sourceId: sourceCartRef.entityId,
          targetId: targetCartRef?.entityId || '',
          resolution: 'SOURCE_KEPT',
          details: `Cart merge failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }

    // Merge wishlist data
    const sourceWishlistRef = sourceReferences.find((r) => r.type === SessionDataType.WISHLIST);
    const targetWishlistRef = targetReferences.find((r) => r.type === SessionDataType.WISHLIST);

    if (sourceWishlistRef) {
      try {
        const sourceWishlist = await this.wishlistService.getWishlistBySessionToken(
          sourceToken,
          sourceSession.companyId,
        );
        if (sourceWishlist && sourceWishlist.items.length > 0) {
          if (targetWishlistRef) {
            // Merge wishlists
            await this.wishlistService.mergeWishlists(
              sourceWishlist.id,
              targetWishlistRef.entityId,
              actorId,
            );
            const mergedWishlist = await this.wishlistService.getWishlistById(
              targetWishlistRef.entityId,
            );
            migratedData.wishlist = {
              itemCount: mergedWishlist.itemCount,
              wishlistId: targetWishlistRef.entityId,
            };
            conflicts.push({
              type: SessionDataType.WISHLIST,
              sourceId: sourceWishlist.id,
              targetId: targetWishlistRef.entityId,
              resolution: 'MERGED',
              details: `Merged ${sourceWishlist.items.length} items from source wishlist`,
            });
          } else {
            // Just link the source wishlist to the customer
            await this.prisma.wishlist.update({
              where: { id: sourceWishlist.id },
              data: { customerId },
            });
            migratedData.wishlist = {
              itemCount: sourceWishlist.items.length,
              wishlistId: sourceWishlist.id,
            };
          }
        }
      } catch (error) {
        conflicts.push({
          type: SessionDataType.WISHLIST,
          sourceId: sourceWishlistRef.entityId,
          targetId: targetWishlistRef?.entityId || '',
          resolution: 'SOURCE_KEPT',
          details: `Wishlist merge failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }

    // Merge comparison data
    const sourceComparisonRef = sourceReferences.find((r) => r.type === SessionDataType.COMPARISON);
    const targetComparisonRef = targetReferences.find((r) => r.type === SessionDataType.COMPARISON);

    if (sourceComparisonRef) {
      try {
        const sourceComparison = await this.comparisonService.getComparisonBySessionToken(
          sourceToken,
          sourceSession.companyId,
        );
        if (sourceComparison && sourceComparison.items.length > 0) {
          if (targetComparisonRef) {
            // Merge comparisons
            await this.comparisonService.mergeComparisons(
              sourceComparison.id,
              targetComparisonRef.entityId,
              actorId,
            );
            const mergedComparison = await this.comparisonService.getComparisonById(
              targetComparisonRef.entityId,
            );
            migratedData.comparison = {
              itemCount: mergedComparison.items.length,
              comparisonId: targetComparisonRef.entityId,
            };
            conflicts.push({
              type: SessionDataType.COMPARISON,
              sourceId: sourceComparison.id,
              targetId: targetComparisonRef.entityId,
              resolution: 'MERGED',
              details: `Merged ${sourceComparison.items.length} items from source comparison`,
            });
          } else {
            // Just link the source comparison to the customer
            await this.prisma.productComparison.update({
              where: { id: sourceComparison.id },
              data: { customerId },
            });
            migratedData.comparison = {
              itemCount: sourceComparison.items.length,
              comparisonId: sourceComparison.id,
            };
          }
        }
      } catch (error) {
        conflicts.push({
          type: SessionDataType.COMPARISON,
          sourceId: sourceComparisonRef.entityId,
          targetId: targetComparisonRef?.entityId || '',
          resolution: 'SOURCE_KEPT',
          details: `Comparison merge failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }

    // Update target session references with merged data
    const updatedReferences: SessionDataReference[] = [];
    if (migratedData.cart) {
      updatedReferences.push({
        type: SessionDataType.CART,
        entityId: migratedData.cart.cartId,
        siteId: sourceReferences.find((r) => r.type === SessionDataType.CART)?.siteId || 'default',
        lastUpdated: new Date(),
      });
    }
    if (migratedData.wishlist) {
      updatedReferences.push({
        type: SessionDataType.WISHLIST,
        entityId: migratedData.wishlist.wishlistId,
        siteId:
          sourceReferences.find((r) => r.type === SessionDataType.WISHLIST)?.siteId || 'default',
        lastUpdated: new Date(),
      });
    }
    if (migratedData.comparison) {
      updatedReferences.push({
        type: SessionDataType.COMPARISON,
        entityId: migratedData.comparison.comparisonId,
        siteId:
          sourceReferences.find((r) => r.type === SessionDataType.COMPARISON)?.siteId || 'default',
        lastUpdated: new Date(),
      });
    }

    // Merge with existing target references
    const mergedTargetReferences = [...targetReferences];
    for (const newRef of updatedReferences) {
      const existingIndex = mergedTargetReferences.findIndex((r) => r.type === newRef.type);
      if (existingIndex >= 0) {
        mergedTargetReferences[existingIndex] = newRef;
      } else {
        mergedTargetReferences.push(newRef);
      }
    }

    // Use transaction to ensure atomic update of both sessions
    await this.prisma.$transaction(async (tx) => {
      // Mark source session as merged
      await tx.crossSiteSession.update({
        where: { id: sourceSession.id },
        data: {
          status: CrossSiteSessionStatus.MERGED,
        },
      });

      // Update target session with merged data references
      await tx.crossSiteSession.update({
        where: { id: targetSession.id },
        data: {
          dataReferences: mergedTargetReferences as unknown as Prisma.InputJsonValue,
          lastActiveAt: new Date(),
        },
      });
    });

    // Audit log
    if (actorId) {
      await this.auditLogService.log(
        AuditAction.UPDATE,
        'CrossSiteSession',
        targetSession.id,
        {
          userId: actorId,
          metadata: {
            action: 'merge_on_login',
            sourceSessionId: sourceSession.id,
            customerId,
            migratedData,
            conflictCount: conflicts.length,
          },
        },
      );
    }

    return {
      success: true,
      sourceSessionId: sourceSession.id,
      targetSessionId: targetSession.id,
      migratedData,
      conflicts,
    };
  }

  /**
   * Attach a customer to an existing session
   */
  async attachCustomerToSession(
    sessionToken: string,
    dto: Omit<AttachCustomerInput, 'sessionToken'>,
    actorId?: string,
  ): Promise<CrossSiteSessionData> {
    const session = await this.prisma.crossSiteSession.findFirst({
      where: {
        sessionToken,
        status: CrossSiteSessionStatus.ACTIVE,
        expiresAt: { gt: new Date() },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.customerId) {
      throw new BadRequestException('Session already has a customer attached');
    }

    // Verify customer exists and belongs to the same company
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    if (customer.companyId !== session.companyId) {
      throw new ForbiddenException('Customer does not belong to this company');
    }

    // If mergeGuestData is true and there's an existing customer session, merge them
    if (dto.mergeGuestData) {
      const existingCustomerSession = await this.prisma.crossSiteSession.findFirst({
        where: {
          customerId: dto.customerId,
          companyId: session.companyId,
          status: CrossSiteSessionStatus.ACTIVE,
          expiresAt: { gt: new Date() },
          id: { not: session.id },
        },
      });

      if (existingCustomerSession) {
        // Merge this session into the existing customer session
        return (
          await this.mergeSessionsOnLogin(sessionToken, dto.customerId, actorId)
        ).success
          ? this.getSessionById(existingCustomerSession.id)
          : this.getSessionById(session.id);
      }
    }

    // Simply attach the customer to this session
    const updatedSession = await this.prisma.crossSiteSession.update({
      where: { id: session.id },
      data: {
        customerId: dto.customerId,
        lastActiveAt: new Date(),
      },
      include: {
        company: true,
        customer: true,
      },
    });

    // Update related data with customer ID
    const dataReferences = (session.dataReferences as unknown as SessionDataReference[]) || [];
    for (const ref of dataReferences) {
      try {
        if (ref.type === SessionDataType.CART) {
          await this.prisma.cart.updateMany({
            where: { id: ref.entityId },
            data: { customerId: dto.customerId },
          });
        } else if (ref.type === SessionDataType.WISHLIST) {
          await this.prisma.wishlist.updateMany({
            where: { id: ref.entityId },
            data: { customerId: dto.customerId },
          });
        } else if (ref.type === SessionDataType.COMPARISON) {
          await this.prisma.productComparison.updateMany({
            where: { id: ref.entityId },
            data: { customerId: dto.customerId },
          });
        }
      } catch (error) {
        // Log error but continue - data linking is best effort
        this.logger.warn(
          `Failed to link ${ref.type} ${ref.entityId} to customer ${dto.customerId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    // Audit log
    if (actorId) {
      await this.auditLogService.log(
        AuditAction.UPDATE,
        'CrossSiteSession',
        session.id,
        {
          userId: actorId,
          metadata: {
            action: 'attach_customer',
            customerId: dto.customerId,
            mergeGuestData: dto.mergeGuestData,
          },
        },
      );
    }

    return this.toSessionData(updatedSession);
  }

  /**
   * Expire a session
   */
  async expireSession(sessionToken: string, actorId?: string): Promise<void> {
    const session = await this.prisma.crossSiteSession.findFirst({
      where: {
        sessionToken,
        status: CrossSiteSessionStatus.ACTIVE,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    await this.prisma.crossSiteSession.update({
      where: { id: session.id },
      data: {
        status: CrossSiteSessionStatus.EXPIRED,
        expiresAt: new Date(),
      },
    });

    // Audit log
    if (actorId) {
      await this.auditLogService.log(
        AuditAction.UPDATE,
        'CrossSiteSession',
        session.id,
        {
          userId: actorId,
          metadata: { action: 'expire' },
        },
      );
    }
  }

  /**
   * Revoke a session (security action)
   */
  async revokeSession(sessionToken: string, actorId?: string): Promise<void> {
    const session = await this.prisma.crossSiteSession.findFirst({
      where: {
        sessionToken,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    await this.prisma.crossSiteSession.update({
      where: { id: session.id },
      data: {
        status: CrossSiteSessionStatus.REVOKED,
      },
    });

    // Audit log - security action always logged
    await this.auditLogService.log(
      AuditAction.UPDATE,
      'CrossSiteSession',
      session.id,
      {
        userId: actorId,
        metadata: {
          action: 'revoke',
          reason: 'security',
        },
      },
    );
  }

  /**
   * Get session summary with counts from linked data
   * Accepts either session ID or session token
   */
  async getSessionSummary(sessionIdOrToken: string): Promise<SessionSummary> {
    // Try to find by ID first, then by token
    let session = await this.prisma.crossSiteSession.findUnique({
      where: { id: sessionIdOrToken },
    });

    if (!session) {
      session = await this.prisma.crossSiteSession.findFirst({
        where: {
          sessionToken: sessionIdOrToken,
          status: CrossSiteSessionStatus.ACTIVE,
          expiresAt: { gt: new Date() },
        },
      });
    }

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const sessionToken = session.sessionToken;
    const dataReferences = (session.dataReferences as unknown as SessionDataReference[]) || [];
    let cartItemCount = 0;
    let wishlistItemCount = 0;
    let comparisonItemCount = 0;
    const activeSites: string[] = [];

    // Collect unique sites and get item counts
    for (const ref of dataReferences) {
      if (!activeSites.includes(ref.siteId)) {
        activeSites.push(ref.siteId);
      }

      try {
        if (ref.type === SessionDataType.CART) {
          const cart = await this.cartService.getCartBySessionToken(
            sessionToken,
            session.companyId,
          );
          if (cart) {
            cartItemCount = cart.totals.itemCount;
          }
        } else if (ref.type === SessionDataType.WISHLIST) {
          const wishlist = await this.wishlistService.getWishlistBySessionToken(
            sessionToken,
            session.companyId,
          );
          if (wishlist) {
            wishlistItemCount = wishlist.itemCount;
          }
        } else if (ref.type === SessionDataType.COMPARISON) {
          const comparison = await this.comparisonService.getComparisonBySessionToken(
            sessionToken,
            session.companyId,
          );
          if (comparison) {
            comparisonItemCount = comparison.items.length;
          }
        }
      } catch (error) {
        // Data fetch failed, continue with count of 0
      }
    }

    return {
      sessionId: session.id,
      cartItemCount,
      wishlistItemCount,
      comparisonItemCount,
      lastActiveAt: session.lastActiveAt,
      activeSites,
    };
  }

  /**
   * Cleanup expired sessions (batch operation for scheduled job)
   * Returns the number of sessions cleaned up
   */
  async cleanupExpiredSessions(): Promise<number> {
    const now = new Date();

    // Find expired sessions that are still marked as ACTIVE
    const expiredSessions = await this.prisma.crossSiteSession.findMany({
      where: {
        status: CrossSiteSessionStatus.ACTIVE,
        expiresAt: { lt: now },
      },
      select: { id: true },
    });

    if (expiredSessions.length === 0) {
      return 0;
    }

    const sessionIds = expiredSessions.map((s) => s.id);

    // Update all expired sessions to EXPIRED status
    await this.prisma.crossSiteSession.updateMany({
      where: {
        id: { in: sessionIds },
      },
      data: {
        status: CrossSiteSessionStatus.EXPIRED,
      },
    });

    // Audit log for batch cleanup
    await this.auditLogService.log(
      AuditAction.UPDATE,
      'CrossSiteSession',
      undefined,
      {
        metadata: {
          action: 'batch_cleanup',
          expiredCount: sessionIds.length,
          sessionIds: sessionIds.slice(0, 100), // Log first 100 for reference
        },
      },
    );

    return sessionIds.length;
  }

  /**
   * Link data reference to session
   */
  async linkDataToSession(
    sessionToken: string,
    dataType: SessionDataType,
    entityId: string,
    siteId: string,
  ): Promise<void> {
    const session = await this.prisma.crossSiteSession.findFirst({
      where: {
        sessionToken,
        status: CrossSiteSessionStatus.ACTIVE,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const dataReferences = (session.dataReferences as unknown as SessionDataReference[]) || [];
    const existingIndex = dataReferences.findIndex(
      (r) => r.type === dataType && r.siteId === siteId,
    );

    const newReference: SessionDataReference = {
      type: dataType,
      entityId,
      siteId,
      lastUpdated: new Date(),
    };

    if (existingIndex >= 0) {
      dataReferences[existingIndex] = newReference;
    } else {
      dataReferences.push(newReference);
    }

    await this.prisma.crossSiteSession.update({
      where: { id: session.id },
      data: {
        dataReferences: dataReferences as unknown as Prisma.InputJsonValue,
        lastActiveAt: new Date(),
      },
    });
  }

  /**
   * Get session by customer ID
   */
  async getSessionByCustomerId(
    customerId: string,
    companyId: string,
  ): Promise<CrossSiteSessionData | null> {
    const session = await this.prisma.crossSiteSession.findFirst({
      where: {
        customerId,
        companyId,
        status: CrossSiteSessionStatus.ACTIVE,
        expiresAt: { gt: new Date() },
      },
      include: {
        company: true,
        customer: true,
      },
      orderBy: { lastActiveAt: 'desc' },
    });

    return session ? this.toSessionData(session) : null;
  }

  /**
   * Get or create session for a given context
   * Used by controllers to ensure a session exists before operations
   */
  async getOrCreateSession(
    companyId: string,
    options: {
      customerId?: string;
      siteId?: string;
      visitorId?: string;
      deviceFingerprint?: string;
      userAgent?: string;
      ipAddress?: string;
    },
  ): Promise<CrossSiteSessionData> {
    // Try to find an existing session
    if (options.customerId) {
      const existingSession = await this.getSessionByCustomerId(options.customerId, companyId);
      if (existingSession) {
        return existingSession;
      }
    }

    // Create a new session
    const deviceInfo = options.deviceFingerprint || options.userAgent || options.ipAddress
      ? {
          fingerprint: options.deviceFingerprint,
          userAgent: options.userAgent,
          ipAddress: options.ipAddress,
        }
      : undefined;

    const sessionToken = this.generateSessionToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + MAX_SESSION_AGE_DAYS);

    const session = await this.prisma.crossSiteSession.create({
      data: {
        companyId,
        sessionToken,
        customerId: options.customerId,
        visitorId: options.visitorId,
        deviceInfo: deviceInfo ? (deviceInfo as Prisma.InputJsonValue) : undefined,
        expiresAt,
        dataReferences: [],
      },
      include: {
        company: true,
        customer: true,
      },
    });

    return this.toSessionData(session);
  }

  /**
   * Merge two sessions by ID
   * Used when a guest session needs to be merged into a user session
   * Uses transaction for data integrity
   */
  async mergeSessions(
    sourceSessionId: string,
    targetSessionId: string,
    actorId?: string,
  ): Promise<SessionMigrationResult> {
    const sourceSession = await this.prisma.crossSiteSession.findUnique({
      where: { id: sourceSessionId },
    });

    if (!sourceSession) {
      throw new NotFoundException('Source session not found');
    }

    const targetSession = await this.prisma.crossSiteSession.findUnique({
      where: { id: targetSessionId },
    });

    if (!targetSession) {
      throw new NotFoundException('Target session not found');
    }

    if (sourceSession.companyId !== targetSession.companyId) {
      throw new ForbiddenException('Cannot merge sessions from different companies');
    }

    // Use the source session token to call the existing merge logic
    // If target has a customer, use that customer ID
    if (targetSession.customerId) {
      return this.mergeSessionsOnLogin(sourceSession.sessionToken, targetSession.customerId, actorId);
    }

    // If no customer on target, just merge data references
    const sourceReferences = (sourceSession.dataReferences as unknown as SessionDataReference[]) || [];
    const targetReferences = (targetSession.dataReferences as unknown as SessionDataReference[]) || [];

    // Merge references (target takes priority on conflicts)
    const mergedReferences = [...targetReferences];
    for (const sourceRef of sourceReferences) {
      const existingIndex = mergedReferences.findIndex(
        (r) => r.type === sourceRef.type && r.siteId === sourceRef.siteId,
      );
      if (existingIndex === -1) {
        mergedReferences.push(sourceRef);
      }
    }

    // Use transaction to ensure atomic update of both sessions
    await this.prisma.$transaction(async (tx) => {
      // Update target session with merged references
      await tx.crossSiteSession.update({
        where: { id: targetSessionId },
        data: {
          dataReferences: mergedReferences as unknown as Prisma.InputJsonValue,
          lastActiveAt: new Date(),
        },
      });

      // Mark source as merged
      await tx.crossSiteSession.update({
        where: { id: sourceSessionId },
        data: {
          status: CrossSiteSessionStatus.MERGED,
        },
      });
    });

    // Audit log
    if (actorId) {
      await this.auditLogService.log(
        AuditAction.UPDATE,
        'CrossSiteSession',
        targetSessionId,
        {
          userId: actorId,
          metadata: {
            action: 'merge_sessions',
            sourceSessionId,
            referencesAdded: sourceReferences.length,
          },
        },
      );
    }

    return {
      success: true,
      sourceSessionId,
      targetSessionId,
      migratedData: {},
      conflicts: [],
    };
  }

  /**
   * Update session activity with context information
   */
  async updateActivity(
    sessionId: string,
    context?: { currentSiteId?: string; currentPage?: string },
  ): Promise<CrossSiteSessionData> {
    const session = await this.prisma.crossSiteSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const updatedSession = await this.prisma.crossSiteSession.update({
      where: { id: sessionId },
      data: {
        lastActiveAt: new Date(),
      },
      include: {
        company: true,
        customer: true,
      },
    });

    return this.toSessionData(updatedSession);
  }

  /**
   * Convert Prisma session to CrossSiteSessionData
   */
  private toSessionData(
    session: CrossSiteSession & { company?: unknown; customer?: unknown },
  ): CrossSiteSessionData {
    // Type guard for deviceInfo JSON field
    const deviceInfo = session.deviceInfo as Prisma.JsonObject | null;

    return {
      id: session.id,
      companyId: session.companyId,
      sessionToken: session.sessionToken,
      visitorId: session.visitorId || undefined,
      customerId: session.customerId || undefined,
      status: session.status as SessionStatus,
      dataReferences: (session.dataReferences as unknown as SessionDataReference[]) || [],
      deviceInfo: deviceInfo
        ? {
            userAgent: deviceInfo.userAgent as string | undefined,
            ipAddress: deviceInfo.ipAddress as string | undefined,
            fingerprint: deviceInfo.fingerprint as string | undefined,
          }
        : undefined,
      firstSeenAt: session.firstSeenAt,
      lastActiveAt: session.lastActiveAt,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }
}
