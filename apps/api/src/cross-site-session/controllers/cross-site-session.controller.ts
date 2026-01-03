import * as crypto from 'crypto';
import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Headers,
  UseGuards,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { CrossSiteSessionService } from '../services/cross-site-session.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import {
  CreateSessionDto,
  TransferSessionDto,
  MergeSessionDto,
  UpdateActivityDto,
} from '../dto/cross-site-session.dto';

/**
 * Authenticated Cross-Site Session Controller - for logged-in users
 *
 * Provides session management for authenticated users, enabling:
 * - Session retrieval for current user
 * - Session transfer across sites
 * - Merging guest sessions when user logs in
 * - Unified session summary with all data counts
 */
@ApiTags('Cross-Site Session')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cross-site-session')
export class CrossSiteSessionController {
  constructor(private readonly crossSiteSessionService: CrossSiteSessionService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user session' })
  @ApiResponse({ status: 200, description: 'Session retrieved' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async getSession(@CurrentUser() user: AuthenticatedUser) {
    const session = await this.crossSiteSessionService.getSessionByCustomerId(
      user.id,
      user.companyId,
    );

    if (!session) {
      // Auto-create session for authenticated users
      return this.crossSiteSessionService.getOrCreateSession(user.companyId, {
        customerId: user.id,
      });
    }

    return session;
  }

  @Post('transfer')
  @ApiOperation({ summary: 'Transfer session to another site' })
  @ApiResponse({ status: 200, description: 'Session transferred' })
  @ApiResponse({ status: 400, description: 'Invalid target site' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async transferSession(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: TransferSessionDto,
  ) {
    const session = await this.crossSiteSessionService.getSessionByCustomerId(
      user.id,
      user.companyId,
    );

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return this.crossSiteSessionService.transferSession(
      session.sessionToken,
      { targetSiteId: dto.targetSiteId, dataTypes: dto.dataTypes },
      user.id,
    );
  }

  @Post('merge')
  @ApiOperation({ summary: 'Merge guest session into user session' })
  @ApiResponse({ status: 200, description: 'Sessions merged' })
  @ApiResponse({ status: 400, description: 'Invalid source session' })
  async mergeSession(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: MergeSessionDto,
  ) {
    // Get or create the user's authenticated session
    const userSession = await this.crossSiteSessionService.getOrCreateSession(user.companyId, {
      customerId: user.id,
    });

    // Merge the guest session into the user session
    return this.crossSiteSessionService.mergeSessions(
      dto.sourceSessionId,
      userSession.id,
      user.id,
    );
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get session summary with all data counts' })
  @ApiResponse({ status: 200, description: 'Summary retrieved' })
  async getSessionSummary(@CurrentUser() user: AuthenticatedUser) {
    const session = await this.crossSiteSessionService.getSessionByCustomerId(
      user.id,
      user.companyId,
    );

    if (!session) {
      return {
        sessionId: null,
        cartItemCount: 0,
        wishlistItemCount: 0,
        comparisonItemCount: 0,
        totalItemCount: 0,
        lastActivity: null,
      };
    }

    return this.crossSiteSessionService.getSessionSummary(session.id);
  }
}

/**
 * Public Cross-Site Session Controller - for anonymous users
 *
 * SECURITY: All session operations require session token validation.
 * The session token in the header must match the session's token.
 *
 * Provides:
 * - Session creation for anonymous visitors
 * - Session retrieval by token
 * - Session transfer between sites
 * - Activity timestamp updates
 * - Session summary for UI badges
 */
@ApiTags('Public Cross-Site Session')
@Controller('public/cross-site-session')
export class PublicCrossSiteSessionController {
  constructor(private readonly crossSiteSessionService: CrossSiteSessionService) {}

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
        crypto.timingSafeEqual(buf1, buf1);
        return false;
      }

      return crypto.timingSafeEqual(buf1, buf2);
    } catch {
      return false;
    }
  }

  /**
   * Validate session token format (must be 64 hex characters)
   */
  private isValidSessionTokenFormat(token: string): boolean {
    return /^[a-f0-9]{64}$/i.test(token);
  }

  /**
   * Validate that the provided session token matches the session's token
   * Uses constant-time comparison to prevent timing attacks
   */
  private async validateSessionOwnership(
    sessionId: string,
    sessionToken: string | undefined,
    companyId: string,
  ): Promise<void> {
    if (!sessionToken) {
      throw new ForbiddenException('Session token required for session operations');
    }

    // Validate token format before processing
    if (!this.isValidSessionTokenFormat(sessionToken)) {
      throw new ForbiddenException('Invalid session token format');
    }

    const session = await this.crossSiteSessionService.getSessionById(sessionId);

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.companyId !== companyId) {
      throw new ForbiddenException('Access denied to this session');
    }

    // Use constant-time comparison to prevent timing attacks
    if (!this.secureTokenCompare(session.sessionToken, sessionToken)) {
      throw new ForbiddenException('Session token mismatch - access denied');
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get session by token' })
  @ApiHeader({ name: 'x-session-token', description: 'Cross-site session token' })
  @ApiHeader({ name: 'x-company-id', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Session retrieved' })
  async getSession(
    @Headers('x-session-token') sessionToken: string,
    @Headers('x-company-id') companyId: string,
  ) {
    if (!sessionToken || !companyId) {
      return {
        id: null,
        sessionToken: null,
        cartItemCount: 0,
        wishlistItemCount: 0,
        comparisonItemCount: 0,
      };
    }

    const session = await this.crossSiteSessionService.getSessionByToken(
      sessionToken,
      companyId,
    );

    return session || {
      id: null,
      sessionToken: null,
      cartItemCount: 0,
      wishlistItemCount: 0,
      comparisonItemCount: 0,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create new anonymous session' })
  @ApiHeader({ name: 'x-company-id', description: 'Company ID', required: true })
  @ApiResponse({ status: 201, description: 'Session created' })
  @ApiResponse({ status: 400, description: 'Company ID is required' })
  async createSession(
    @Headers('x-company-id') companyId: string,
    @Body() dto: CreateSessionDto,
  ) {
    if (!companyId) {
      throw new BadRequestException('Company ID is required');
    }

    return this.crossSiteSessionService.getOrCreateSession(companyId, {
      siteId: dto.siteId,
      visitorId: dto.visitorId,
      deviceFingerprint: dto.deviceFingerprint,
      userAgent: dto.userAgent,
      ipAddress: dto.ipAddress,
    });
  }

  @Post(':sessionId/transfer')
  @ApiOperation({ summary: 'Transfer session to another site' })
  @ApiHeader({ name: 'x-session-token', description: 'Cross-site session token', required: true })
  @ApiHeader({ name: 'x-company-id', description: 'Company ID', required: true })
  @ApiResponse({ status: 200, description: 'Session transferred' })
  @ApiResponse({ status: 400, description: 'Invalid target site' })
  @ApiResponse({ status: 403, description: 'Session token mismatch' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async transferSession(
    @Param('sessionId') sessionId: string,
    @Headers('x-session-token') sessionToken: string,
    @Headers('x-company-id') companyId: string,
    @Body() dto: TransferSessionDto,
  ) {
    await this.validateSessionOwnership(sessionId, sessionToken, companyId);

    return this.crossSiteSessionService.transferSession(
      sessionToken,
      { targetSiteId: dto.targetSiteId, dataTypes: dto.dataTypes },
    );
  }

  @Patch(':sessionId/activity')
  @ApiOperation({ summary: 'Update session activity timestamp' })
  @ApiHeader({ name: 'x-session-token', description: 'Cross-site session token', required: true })
  @ApiHeader({ name: 'x-company-id', description: 'Company ID', required: true })
  @ApiResponse({ status: 200, description: 'Activity updated' })
  @ApiResponse({ status: 403, description: 'Session token mismatch' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async updateActivity(
    @Param('sessionId') sessionId: string,
    @Headers('x-session-token') sessionToken: string,
    @Headers('x-company-id') companyId: string,
    @Body() dto: UpdateActivityDto,
  ) {
    await this.validateSessionOwnership(sessionId, sessionToken, companyId);

    return this.crossSiteSessionService.updateActivity(sessionId, {
      currentSiteId: dto.currentSiteId,
      currentPage: dto.currentPage,
    });
  }

  @Get(':sessionId/summary')
  @ApiOperation({ summary: 'Get session summary with all data counts' })
  @ApiHeader({ name: 'x-session-token', description: 'Cross-site session token', required: true })
  @ApiHeader({ name: 'x-company-id', description: 'Company ID', required: true })
  @ApiResponse({ status: 200, description: 'Summary retrieved' })
  @ApiResponse({ status: 403, description: 'Session token mismatch' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async getSessionSummary(
    @Param('sessionId') sessionId: string,
    @Headers('x-session-token') sessionToken: string,
    @Headers('x-company-id') companyId: string,
  ) {
    await this.validateSessionOwnership(sessionId, sessionToken, companyId);

    return this.crossSiteSessionService.getSessionSummary(sessionId);
  }
}
