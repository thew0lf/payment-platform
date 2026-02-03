/**
 * Affiliate Postback Controller
 *
 * Handles server-to-server (S2S) postback webhooks from external affiliate networks
 * and tracking systems. Provides endpoints for conversion notifications with various
 * formats including HasOffers, TUNE, Everflow, and custom configurations.
 *
 * Features:
 * - Multiple postback format support (GET/POST)
 * - IP whitelist per affiliate/partnership
 * - HMAC signature validation
 * - Rate limiting
 * - Duplicate (idempotency) handling
 * - Outbound postback firing to affiliates
 * - Comprehensive audit logging
 */

import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Headers,
  Ip,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  UnauthorizedException,
  Param,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { AffiliateTrackingService } from '../services/affiliate-tracking.service';
import { PostbackDto } from '../dto/track-conversion.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { IdempotencyService } from '../../common/services/idempotency.service';
import { AuditAction, AuditEntity } from '../../audit-logs/types/audit-log.types';
import { DataClassification } from '@prisma/client';
import * as crypto from 'crypto';

/**
 * Conversion tracking result type
 */
interface TrackConversionResult {
  attributed: boolean;
  conversionId?: string;
  partnerId?: string;
  commissionAmount?: number;
  reason?: string;
}

/**
 * Postback format types supported by the system
 */
export enum PostbackFormat {
  STANDARD = 'STANDARD',
  HASOFFERS = 'HASOFFERS',
  TUNE = 'TUNE',
  EVERFLOW = 'EVERFLOW',
  CAKE = 'CAKE',
  CUSTOM = 'CUSTOM',
}

/**
 * Postback response status codes
 */
export enum PostbackResponseStatus {
  SUCCESS = 'OK',
  DUPLICATE = 'DUPLICATE',
  INVALID_CLICK = 'INVALID_CLICK',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  IP_NOT_ALLOWED = 'IP_NOT_ALLOWED',
  RATE_LIMITED = 'RATE_LIMITED',
  ERROR = 'ERROR',
}

/**
 * Field mapping configuration for custom postback formats
 */
export interface PostbackFieldMapping {
  clickIdField: string;
  amountField?: string;
  orderIdField?: string;
  statusField?: string;
  conversionTypeField?: string;
  subId1Field?: string;
  subId2Field?: string;
  subId3Field?: string;
  subId4Field?: string;
  subId5Field?: string;
}

/**
 * Outbound postback URL macros
 */
export const POSTBACK_MACROS = {
  CLICK_ID: '{click_id}',
  PAYOUT: '{payout}',
  STATUS: '{status}',
  ORDER_ID: '{order_id}',
  CONVERSION_ID: '{conversion_id}',
  T1: '{t1}',
  T2: '{t2}',
  T3: '{t3}',
  T4: '{t4}',
  T5: '{t5}',
  TIMESTAMP: '{timestamp}',
  SIGNATURE: '{signature}',
};

/**
 * Rate limit tracking (in-memory, should be Redis in production)
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per minute per IP

@Controller('affiliates/postback')
export class AffiliatePostbackController {
  private readonly logger = new Logger(AffiliatePostbackController.name);

  constructor(
    private readonly trackingService: AffiliateTrackingService,
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  /**
   * Standard postback endpoint (GET)
   * Compatible with most affiliate networks
   * URL format: /api/affiliates/postback?click_id=xxx&amount=99.99&order_id=123
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async handleGetPostback(
    @Query('click_id') clickId: string,
    @Query('aff_sub') affSub: string,
    @Query('transaction_id') transactionId: string,
    @Query('order_id') orderId?: string,
    @Query('amount') amount?: string,
    @Query('payout') payout?: string,
    @Query('revenue') revenue?: string,
    @Query('status') status?: string,
    @Query('goal_id') goalId?: string,
    @Query('event_type') eventType?: string,
    @Query('sub1') subId1?: string,
    @Query('sub2') subId2?: string,
    @Query('sub3') subId3?: string,
    @Query('sub4') subId4?: string,
    @Query('sub5') subId5?: string,
    @Query('t1') t1?: string,
    @Query('t2') t2?: string,
    @Query('t3') t3?: string,
    @Query('t4') t4?: string,
    @Query('t5') t5?: string,
    @Query('currency') currency?: string,
    @Query('signature') signature?: string,
    @Query('sig') sig?: string,
    @Ip() ipAddress?: string,
    @Headers('x-forwarded-for') forwardedFor?: string,
    @Res() res?: Response,
  ) {
    const realIp = this.extractRealIp(ipAddress, forwardedFor);

    // Normalize click_id from various sources
    const normalizedClickId = clickId || affSub || transactionId;

    this.logger.log(
      `Postback received (GET): click_id=${normalizedClickId}, order_id=${orderId}, amount=${amount || payout || revenue}, ip=${realIp}`,
    );

    // Rate limit check
    const rateLimitResult = this.checkRateLimit(realIp);
    if (!rateLimitResult.allowed) {
      await this.logPostbackAttempt(normalizedClickId, realIp, 'GET', 'RATE_LIMITED');
      return this.sendPostbackResponse(res, PostbackResponseStatus.RATE_LIMITED, 429);
    }

    // Validate required parameter
    if (!normalizedClickId) {
      await this.logPostbackAttempt(null, realIp, 'GET', 'MISSING_CLICK_ID');
      return this.sendPostbackResponse(res, PostbackResponseStatus.INVALID_CLICK, 400);
    }

    // Find click to get company/partnership config
    const click = await this.findClickByIdempotencyKey(normalizedClickId);
    if (!click) {
      await this.logPostbackAttempt(normalizedClickId, realIp, 'GET', 'CLICK_NOT_FOUND');
      return this.sendPostbackResponse(res, PostbackResponseStatus.INVALID_CLICK, 400);
    }

    // Verify IP whitelist
    const ipCheckResult = await this.checkIpWhitelist(click.companyId, click.partnerId, realIp);
    if (!ipCheckResult.allowed) {
      await this.logPostbackAttempt(normalizedClickId, realIp, 'GET', 'IP_NOT_WHITELISTED');
      return this.sendPostbackResponse(res, PostbackResponseStatus.IP_NOT_ALLOWED, 401);
    }

    // Verify postback signature if provided
    const providedSignature = signature || sig;
    if (providedSignature) {
      const signatureValid = await this.verifyPostbackSignature(
        normalizedClickId,
        amount || payout || revenue,
        providedSignature,
        click.companyId,
      );
      if (!signatureValid) {
        await this.logPostbackAttempt(normalizedClickId, realIp, 'GET', 'INVALID_SIGNATURE');
        return this.sendPostbackResponse(res, PostbackResponseStatus.INVALID_SIGNATURE, 401);
      }
    }

    // Check for duplicate postback
    const idempotencyKey = `postback-${normalizedClickId}-${orderId || 'default'}-${amount || payout || revenue || '0'}`;
    const duplicateCheck = await this.idempotencyService.checkAndLock(idempotencyKey);
    if (duplicateCheck.isDuplicate) {
      await this.logPostbackAttempt(normalizedClickId, realIp, 'GET', 'DUPLICATE');
      return this.sendPostbackResponse(res, PostbackResponseStatus.DUPLICATE, 200);
    }

    try {
      // Normalize subIds (support both sub1-5 and t1-5 formats)
      const dto: PostbackDto = {
        clickId: normalizedClickId,
        orderId,
        amount: this.parseAmount(amount || payout || revenue),
        status: status || eventType || goalId,
        subId1: subId1 || t1,
        subId2: subId2 || t2,
        subId3: subId3 || t3,
        subId4: subId4 || t4,
        subId5: subId5 || t5,
      };

      // Log the postback
      await this.logPostback(normalizedClickId, dto, realIp, 'GET', PostbackFormat.STANDARD);

      const result = await this.trackingService.handlePostback(dto) as TrackConversionResult;

      // Complete idempotency
      await this.idempotencyService.complete(idempotencyKey, result);

      // Fire outbound postback to affiliate if configured
      if (result.attributed && result.conversionId) {
        await this.fireOutboundPostback(click.partnerId, click.companyId, {
          clickId: normalizedClickId,
          conversionId: result.conversionId,
          payout: dto.amount,
          status: 'approved',
          subId1: dto.subId1,
          subId2: dto.subId2,
          subId3: dto.subId3,
          subId4: dto.subId4,
          subId5: dto.subId5,
        });
      }

      return this.sendPostbackResponse(res, PostbackResponseStatus.SUCCESS, 200, {
        attributed: result.attributed,
        conversionId: result.conversionId,
      });
    } catch (error) {
      await this.idempotencyService.fail(idempotencyKey);
      this.logger.error(`Postback processing error: ${error.message}`, error.stack);
      return this.sendPostbackResponse(res, PostbackResponseStatus.ERROR, 500);
    }
  }

  /**
   * Standard postback endpoint (POST)
   * For networks that prefer POST requests with JSON body
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async handlePostPostback(
    @Body() body: Record<string, any>,
    @Ip() ipAddress?: string,
    @Headers('x-forwarded-for') forwardedFor?: string,
    @Headers('x-postback-signature') headerSignature?: string,
    @Headers('x-api-key') apiKey?: string,
    @Res() res?: Response,
  ) {
    const realIp = this.extractRealIp(ipAddress, forwardedFor);

    // Normalize click_id from various body fields
    const clickId = body.clickId || body.click_id || body.aff_sub || body.transaction_id || body.tid;

    this.logger.log(
      `Postback received (POST): click_id=${clickId}, order_id=${body.orderId || body.order_id}, ip=${realIp}`,
    );

    // Rate limit check
    const rateLimitResult = this.checkRateLimit(realIp);
    if (!rateLimitResult.allowed) {
      await this.logPostbackAttempt(clickId, realIp, 'POST', 'RATE_LIMITED');
      return this.sendPostbackResponse(res, PostbackResponseStatus.RATE_LIMITED, 429);
    }

    // Validate required parameter
    if (!clickId) {
      await this.logPostbackAttempt(null, realIp, 'POST', 'MISSING_CLICK_ID');
      return this.sendPostbackResponse(res, PostbackResponseStatus.INVALID_CLICK, 400);
    }

    // Find click to get company/partnership config
    const click = await this.findClickByIdempotencyKey(clickId);
    if (!click) {
      await this.logPostbackAttempt(clickId, realIp, 'POST', 'CLICK_NOT_FOUND');
      return this.sendPostbackResponse(res, PostbackResponseStatus.INVALID_CLICK, 400);
    }

    // Verify IP whitelist
    const ipCheckResult = await this.checkIpWhitelist(click.companyId, click.partnerId, realIp);
    if (!ipCheckResult.allowed) {
      await this.logPostbackAttempt(clickId, realIp, 'POST', 'IP_NOT_WHITELISTED');
      return this.sendPostbackResponse(res, PostbackResponseStatus.IP_NOT_ALLOWED, 401);
    }

    // Verify signature/API key if provided
    if (headerSignature) {
      const amount = body.amount || body.payout || body.revenue;
      const signatureValid = await this.verifyPostbackSignature(
        clickId,
        amount?.toString(),
        headerSignature,
        click.companyId,
      );
      if (!signatureValid) {
        await this.logPostbackAttempt(clickId, realIp, 'POST', 'INVALID_SIGNATURE');
        return this.sendPostbackResponse(res, PostbackResponseStatus.INVALID_SIGNATURE, 401);
      }
    }

    if (apiKey) {
      const apiKeyValid = await this.verifyApiKey(click.companyId, apiKey);
      if (!apiKeyValid) {
        await this.logPostbackAttempt(clickId, realIp, 'POST', 'INVALID_API_KEY');
        return this.sendPostbackResponse(res, PostbackResponseStatus.INVALID_SIGNATURE, 401);
      }
    }

    // Check for duplicate postback
    const orderId = body.orderId || body.order_id;
    const amount = body.amount || body.payout || body.revenue;
    const idempotencyKey = `postback-${clickId}-${orderId || 'default'}-${amount || '0'}`;
    const duplicateCheck = await this.idempotencyService.checkAndLock(idempotencyKey);
    if (duplicateCheck.isDuplicate) {
      await this.logPostbackAttempt(clickId, realIp, 'POST', 'DUPLICATE');
      return this.sendPostbackResponse(res, PostbackResponseStatus.DUPLICATE, 200);
    }

    try {
      const dto: PostbackDto = {
        clickId,
        orderId,
        amount: this.parseAmount(amount),
        status: body.status || body.event_type || body.goal_id,
        subId1: body.subId1 || body.sub1 || body.t1,
        subId2: body.subId2 || body.sub2 || body.t2,
        subId3: body.subId3 || body.sub3 || body.t3,
        subId4: body.subId4 || body.sub4 || body.t4,
        subId5: body.subId5 || body.sub5 || body.t5,
      };

      // Log the postback
      await this.logPostback(clickId, dto, realIp, 'POST', PostbackFormat.STANDARD);

      const result = await this.trackingService.handlePostback(dto) as TrackConversionResult;

      // Complete idempotency
      await this.idempotencyService.complete(idempotencyKey, result);

      // Fire outbound postback to affiliate if configured
      if (result.attributed && result.conversionId) {
        await this.fireOutboundPostback(click.partnerId, click.companyId, {
          clickId,
          conversionId: result.conversionId,
          payout: dto.amount,
          status: 'approved',
          subId1: dto.subId1,
          subId2: dto.subId2,
          subId3: dto.subId3,
          subId4: dto.subId4,
          subId5: dto.subId5,
        });
      }

      return this.sendPostbackResponse(res, PostbackResponseStatus.SUCCESS, 200, {
        attributed: result.attributed,
        conversionId: result.conversionId,
      });
    } catch (error) {
      await this.idempotencyService.fail(idempotencyKey);
      this.logger.error(`Postback processing error: ${error.message}`, error.stack);
      return this.sendPostbackResponse(res, PostbackResponseStatus.ERROR, 500);
    }
  }

  /**
   * Server-to-server (S2S) postback with API key authentication
   * Requires X-Api-Key header for verification
   */
  @Post('s2s')
  @HttpCode(HttpStatus.OK)
  async handleS2SPostback(
    @Body() dto: PostbackDto,
    @Headers('x-api-key') apiKey: string,
    @Ip() ipAddress?: string,
    @Headers('x-forwarded-for') forwardedFor?: string,
    @Res() res?: Response,
  ) {
    const realIp = this.extractRealIp(ipAddress, forwardedFor);

    this.logger.log(
      `S2S Postback received: click_id=${dto.clickId}, ip=${realIp}`,
    );

    // Rate limit check
    const rateLimitResult = this.checkRateLimit(realIp);
    if (!rateLimitResult.allowed) {
      await this.logPostbackAttempt(dto.clickId, realIp, 'S2S', 'RATE_LIMITED');
      return this.sendPostbackResponse(res, PostbackResponseStatus.RATE_LIMITED, 429);
    }

    // Validate API key
    if (!apiKey) {
      await this.logPostbackAttempt(dto.clickId, realIp, 'S2S', 'MISSING_API_KEY');
      return this.sendPostbackResponse(res, PostbackResponseStatus.INVALID_SIGNATURE, 401);
    }

    // Validate click_id
    if (!dto.clickId) {
      await this.logPostbackAttempt(null, realIp, 'S2S', 'MISSING_CLICK_ID');
      return this.sendPostbackResponse(res, PostbackResponseStatus.INVALID_CLICK, 400);
    }

    // Look up click to get company config
    const click = await this.findClickByIdempotencyKey(dto.clickId);
    if (!click) {
      await this.logPostbackAttempt(dto.clickId, realIp, 'S2S', 'CLICK_NOT_FOUND');
      return this.sendPostbackResponse(res, PostbackResponseStatus.INVALID_CLICK, 400);
    }

    // Verify API key against company config
    const apiKeyValid = await this.verifyApiKey(click.companyId, apiKey);
    if (!apiKeyValid) {
      await this.logPostbackAttempt(dto.clickId, realIp, 'S2S', 'INVALID_API_KEY');
      return this.sendPostbackResponse(res, PostbackResponseStatus.INVALID_SIGNATURE, 401);
    }

    // Check IP whitelist if configured
    const ipCheckResult = await this.checkIpWhitelist(click.companyId, click.partnerId, realIp);
    if (!ipCheckResult.allowed) {
      this.logger.warn(`S2S postback from non-whitelisted IP: ${this.hashIp(realIp)}`);
      await this.logPostbackAttempt(dto.clickId, realIp, 'S2S', 'IP_NOT_WHITELISTED');
      return this.sendPostbackResponse(res, PostbackResponseStatus.IP_NOT_ALLOWED, 401);
    }

    // Check for duplicate
    const idempotencyKey = `postback-s2s-${dto.clickId}-${dto.orderId || 'default'}`;
    const duplicateCheck = await this.idempotencyService.checkAndLock(idempotencyKey);
    if (duplicateCheck.isDuplicate) {
      await this.logPostbackAttempt(dto.clickId, realIp, 'S2S', 'DUPLICATE');
      return this.sendPostbackResponse(res, PostbackResponseStatus.DUPLICATE, 200);
    }

    try {
      // Log the postback
      await this.logPostback(dto.clickId, dto, realIp, 'S2S', PostbackFormat.STANDARD);

      const result = await this.trackingService.handlePostback(dto) as TrackConversionResult;

      await this.idempotencyService.complete(idempotencyKey, result);

      // Fire outbound postback
      if (result.attributed && result.conversionId) {
        await this.fireOutboundPostback(click.partnerId, click.companyId, {
          clickId: dto.clickId,
          conversionId: result.conversionId,
          payout: dto.amount,
          status: 'approved',
          subId1: dto.subId1,
          subId2: dto.subId2,
          subId3: dto.subId3,
          subId4: dto.subId4,
          subId5: dto.subId5,
        });
      }

      return this.sendPostbackResponse(res, PostbackResponseStatus.SUCCESS, 200, {
        attributed: result.attributed,
        conversionId: result.conversionId,
      });
    } catch (error) {
      await this.idempotencyService.fail(idempotencyKey);
      this.logger.error(`S2S postback error: ${error.message}`, error.stack);
      return this.sendPostbackResponse(res, PostbackResponseStatus.ERROR, 500);
    }
  }

  /**
   * HasOffers/TUNE compatible postback
   * Format: ?transaction_id=X&payout=Y&aff_id=Z
   */
  @Get('hasoffers')
  @HttpCode(HttpStatus.OK)
  async handleHasOffersPostback(
    @Query('transaction_id') clickId: string,
    @Query('advertiser_id') advertiserId?: string,
    @Query('offer_id') offerId?: string,
    @Query('aff_id') affiliateId?: string,
    @Query('payout') amount?: string,
    @Query('adv_sub') subId1?: string,
    @Query('adv_sub2') subId2?: string,
    @Query('adv_sub3') subId3?: string,
    @Query('adv_sub4') subId4?: string,
    @Query('adv_sub5') subId5?: string,
    @Query('goal_id') goalId?: string,
    @Query('status') status?: string,
    @Ip() ipAddress?: string,
    @Headers('x-forwarded-for') forwardedFor?: string,
    @Res() res?: Response,
  ) {
    const realIp = this.extractRealIp(ipAddress, forwardedFor);

    this.logger.log(
      `HasOffers postback: transaction_id=${clickId}, affiliate_id=${affiliateId}`,
    );

    // Rate limit check
    const rateLimitResult = this.checkRateLimit(realIp);
    if (!rateLimitResult.allowed) {
      await this.logPostbackAttempt(clickId, realIp, 'HASOFFERS', 'RATE_LIMITED');
      return this.sendPostbackResponse(res, PostbackResponseStatus.RATE_LIMITED, 429);
    }

    if (!clickId) {
      await this.logPostbackAttempt(null, realIp, 'HASOFFERS', 'MISSING_TRANSACTION_ID');
      return this.sendPostbackResponse(res, PostbackResponseStatus.INVALID_CLICK, 400);
    }

    const click = await this.findClickByIdempotencyKey(clickId);
    if (!click) {
      await this.logPostbackAttempt(clickId, realIp, 'HASOFFERS', 'CLICK_NOT_FOUND');
      return this.sendPostbackResponse(res, PostbackResponseStatus.INVALID_CLICK, 400);
    }

    // Check for duplicate
    const idempotencyKey = `postback-hasoffers-${clickId}-${goalId || 'default'}`;
    const duplicateCheck = await this.idempotencyService.checkAndLock(idempotencyKey);
    if (duplicateCheck.isDuplicate) {
      await this.logPostbackAttempt(clickId, realIp, 'HASOFFERS', 'DUPLICATE');
      return this.sendPostbackResponse(res, PostbackResponseStatus.DUPLICATE, 200);
    }

    try {
      const dto: PostbackDto = {
        clickId,
        amount: this.parseAmount(amount),
        status: status || goalId,
        subId1,
        subId2,
        subId3,
        subId4,
        subId5,
      };

      await this.logPostback(clickId, dto, realIp, 'HASOFFERS', PostbackFormat.HASOFFERS);

      const result = await this.trackingService.handlePostback(dto) as TrackConversionResult;

      await this.idempotencyService.complete(idempotencyKey, result);

      // Fire outbound postback
      if (result.attributed && result.conversionId) {
        await this.fireOutboundPostback(click.partnerId, click.companyId, {
          clickId,
          conversionId: result.conversionId,
          payout: dto.amount,
          status: 'approved',
          subId1,
          subId2,
          subId3,
          subId4,
          subId5,
        });
      }

      return this.sendPostbackResponse(res, PostbackResponseStatus.SUCCESS, 200, {
        attributed: result.attributed,
      });
    } catch (error) {
      await this.idempotencyService.fail(idempotencyKey);
      this.logger.error(`HasOffers postback error: ${error.message}`, error.stack);
      return this.sendPostbackResponse(res, PostbackResponseStatus.ERROR, 500);
    }
  }

  /**
   * TUNE compatible postback
   * Format: ?aff_sub=X&amount=Y&adv_sub=Z
   */
  @Get('tune')
  @HttpCode(HttpStatus.OK)
  async handleTunePostback(
    @Query('aff_sub') clickId: string,
    @Query('amount') amount?: string,
    @Query('adv_sub') advSub?: string,
    @Query('adv_sub2') advSub2?: string,
    @Query('adv_sub3') advSub3?: string,
    @Query('adv_sub4') advSub4?: string,
    @Query('adv_sub5') advSub5?: string,
    @Query('goal_name') goalName?: string,
    @Query('event_id') eventId?: string,
    @Ip() ipAddress?: string,
    @Headers('x-forwarded-for') forwardedFor?: string,
    @Res() res?: Response,
  ) {
    const realIp = this.extractRealIp(ipAddress, forwardedFor);

    this.logger.log(`TUNE postback: aff_sub=${clickId}, event=${eventId || goalName}`);

    const rateLimitResult = this.checkRateLimit(realIp);
    if (!rateLimitResult.allowed) {
      await this.logPostbackAttempt(clickId, realIp, 'TUNE', 'RATE_LIMITED');
      return this.sendPostbackResponse(res, PostbackResponseStatus.RATE_LIMITED, 429);
    }

    if (!clickId) {
      await this.logPostbackAttempt(null, realIp, 'TUNE', 'MISSING_AFF_SUB');
      return this.sendPostbackResponse(res, PostbackResponseStatus.INVALID_CLICK, 400);
    }

    const click = await this.findClickByIdempotencyKey(clickId);
    if (!click) {
      await this.logPostbackAttempt(clickId, realIp, 'TUNE', 'CLICK_NOT_FOUND');
      return this.sendPostbackResponse(res, PostbackResponseStatus.INVALID_CLICK, 400);
    }

    const idempotencyKey = `postback-tune-${clickId}-${eventId || goalName || 'default'}`;
    const duplicateCheck = await this.idempotencyService.checkAndLock(idempotencyKey);
    if (duplicateCheck.isDuplicate) {
      await this.logPostbackAttempt(clickId, realIp, 'TUNE', 'DUPLICATE');
      return this.sendPostbackResponse(res, PostbackResponseStatus.DUPLICATE, 200);
    }

    try {
      const dto: PostbackDto = {
        clickId,
        amount: this.parseAmount(amount),
        status: goalName || eventId,
        subId1: advSub,
        subId2: advSub2,
        subId3: advSub3,
        subId4: advSub4,
        subId5: advSub5,
      };

      await this.logPostback(clickId, dto, realIp, 'TUNE', PostbackFormat.TUNE);

      const result = await this.trackingService.handlePostback(dto) as TrackConversionResult;

      await this.idempotencyService.complete(idempotencyKey, result);

      if (result.attributed && result.conversionId) {
        await this.fireOutboundPostback(click.partnerId, click.companyId, {
          clickId,
          conversionId: result.conversionId,
          payout: dto.amount,
          status: 'approved',
          subId1: advSub,
          subId2: advSub2,
          subId3: advSub3,
          subId4: advSub4,
          subId5: advSub5,
        });
      }

      return this.sendPostbackResponse(res, PostbackResponseStatus.SUCCESS, 200, {
        attributed: result.attributed,
      });
    } catch (error) {
      await this.idempotencyService.fail(idempotencyKey);
      this.logger.error(`TUNE postback error: ${error.message}`, error.stack);
      return this.sendPostbackResponse(res, PostbackResponseStatus.ERROR, 500);
    }
  }

  /**
   * Everflow compatible postback
   * Format: ?tid=X&amount=Y&oid=Z
   */
  @Get('everflow')
  @HttpCode(HttpStatus.OK)
  async handleEverflowPostback(
    @Query('tid') clickId: string,
    @Query('oid') orderId?: string,
    @Query('amount') amount?: string,
    @Query('sub1') subId1?: string,
    @Query('sub2') subId2?: string,
    @Query('sub3') subId3?: string,
    @Query('sub4') subId4?: string,
    @Query('sub5') subId5?: string,
    @Query('event') event?: string,
    @Query('coupon') coupon?: string,
    @Ip() ipAddress?: string,
    @Headers('x-forwarded-for') forwardedFor?: string,
    @Res() res?: Response,
  ) {
    const realIp = this.extractRealIp(ipAddress, forwardedFor);

    this.logger.log(`Everflow postback: tid=${clickId}, event=${event}`);

    const rateLimitResult = this.checkRateLimit(realIp);
    if (!rateLimitResult.allowed) {
      await this.logPostbackAttempt(clickId, realIp, 'EVERFLOW', 'RATE_LIMITED');
      return this.sendPostbackResponse(res, PostbackResponseStatus.RATE_LIMITED, 429);
    }

    if (!clickId) {
      await this.logPostbackAttempt(null, realIp, 'EVERFLOW', 'MISSING_TID');
      return this.sendPostbackResponse(res, PostbackResponseStatus.INVALID_CLICK, 400);
    }

    const click = await this.findClickByIdempotencyKey(clickId);
    if (!click) {
      await this.logPostbackAttempt(clickId, realIp, 'EVERFLOW', 'CLICK_NOT_FOUND');
      return this.sendPostbackResponse(res, PostbackResponseStatus.INVALID_CLICK, 400);
    }

    const idempotencyKey = `postback-everflow-${clickId}-${orderId || event || 'default'}`;
    const duplicateCheck = await this.idempotencyService.checkAndLock(idempotencyKey);
    if (duplicateCheck.isDuplicate) {
      await this.logPostbackAttempt(clickId, realIp, 'EVERFLOW', 'DUPLICATE');
      return this.sendPostbackResponse(res, PostbackResponseStatus.DUPLICATE, 200);
    }

    try {
      const dto: PostbackDto = {
        clickId,
        orderId,
        amount: this.parseAmount(amount),
        status: event,
        subId1,
        subId2,
        subId3,
        subId4,
        subId5,
      };

      await this.logPostback(clickId, dto, realIp, 'EVERFLOW', PostbackFormat.EVERFLOW);

      const result = await this.trackingService.handlePostback(dto) as TrackConversionResult;

      await this.idempotencyService.complete(idempotencyKey, result);

      if (result.attributed && result.conversionId) {
        await this.fireOutboundPostback(click.partnerId, click.companyId, {
          clickId,
          conversionId: result.conversionId,
          payout: dto.amount,
          status: 'approved',
          subId1,
          subId2,
          subId3,
          subId4,
          subId5,
        });
      }

      return this.sendPostbackResponse(res, PostbackResponseStatus.SUCCESS, 200, {
        attributed: result.attributed,
      });
    } catch (error) {
      await this.idempotencyService.fail(idempotencyKey);
      this.logger.error(`Everflow postback error: ${error.message}`, error.stack);
      return this.sendPostbackResponse(res, PostbackResponseStatus.ERROR, 500);
    }
  }

  /**
   * CAKE compatible postback
   * Format: ?s=X&p=Y&e=Z
   */
  @Get('cake')
  @HttpCode(HttpStatus.OK)
  async handleCakePostback(
    @Query('s') clickId: string, // session_id / click_id
    @Query('p') payout?: string,
    @Query('e') eventId?: string,
    @Query('oid') orderId?: string,
    @Query('s1') s1?: string,
    @Query('s2') s2?: string,
    @Query('s3') s3?: string,
    @Query('s4') s4?: string,
    @Query('s5') s5?: string,
    @Ip() ipAddress?: string,
    @Headers('x-forwarded-for') forwardedFor?: string,
    @Res() res?: Response,
  ) {
    const realIp = this.extractRealIp(ipAddress, forwardedFor);

    this.logger.log(`CAKE postback: s=${clickId}, e=${eventId}`);

    const rateLimitResult = this.checkRateLimit(realIp);
    if (!rateLimitResult.allowed) {
      await this.logPostbackAttempt(clickId, realIp, 'CAKE', 'RATE_LIMITED');
      return this.sendPostbackResponse(res, PostbackResponseStatus.RATE_LIMITED, 429);
    }

    if (!clickId) {
      await this.logPostbackAttempt(null, realIp, 'CAKE', 'MISSING_S');
      return this.sendPostbackResponse(res, PostbackResponseStatus.INVALID_CLICK, 400);
    }

    const click = await this.findClickByIdempotencyKey(clickId);
    if (!click) {
      await this.logPostbackAttempt(clickId, realIp, 'CAKE', 'CLICK_NOT_FOUND');
      return this.sendPostbackResponse(res, PostbackResponseStatus.INVALID_CLICK, 400);
    }

    const idempotencyKey = `postback-cake-${clickId}-${eventId || orderId || 'default'}`;
    const duplicateCheck = await this.idempotencyService.checkAndLock(idempotencyKey);
    if (duplicateCheck.isDuplicate) {
      await this.logPostbackAttempt(clickId, realIp, 'CAKE', 'DUPLICATE');
      return this.sendPostbackResponse(res, PostbackResponseStatus.DUPLICATE, 200);
    }

    try {
      const dto: PostbackDto = {
        clickId,
        orderId,
        amount: this.parseAmount(payout),
        status: eventId,
        subId1: s1,
        subId2: s2,
        subId3: s3,
        subId4: s4,
        subId5: s5,
      };

      await this.logPostback(clickId, dto, realIp, 'CAKE', PostbackFormat.CAKE);

      const result = await this.trackingService.handlePostback(dto) as TrackConversionResult;

      await this.idempotencyService.complete(idempotencyKey, result);

      if (result.attributed && result.conversionId) {
        await this.fireOutboundPostback(click.partnerId, click.companyId, {
          clickId,
          conversionId: result.conversionId,
          payout: dto.amount,
          status: 'approved',
          subId1: s1,
          subId2: s2,
          subId3: s3,
          subId4: s4,
          subId5: s5,
        });
      }

      return this.sendPostbackResponse(res, PostbackResponseStatus.SUCCESS, 200, {
        attributed: result.attributed,
      });
    } catch (error) {
      await this.idempotencyService.fail(idempotencyKey);
      this.logger.error(`CAKE postback error: ${error.message}`, error.stack);
      return this.sendPostbackResponse(res, PostbackResponseStatus.ERROR, 500);
    }
  }

  /**
   * Test postback endpoint with signature validation
   * Used to verify postback configuration is correct
   */
  @Get('test')
  @HttpCode(HttpStatus.OK)
  async testPostback(
    @Query('click_id') clickId: string,
    @Query('signature') signature?: string,
    @Query('api_key') apiKey?: string,
    @Ip() ipAddress?: string,
    @Headers('x-forwarded-for') forwardedFor?: string,
    @Res() res?: Response,
  ) {
    const realIp = this.extractRealIp(ipAddress, forwardedFor);

    this.logger.log(`Test postback: click_id=${clickId}, ip_hash=${this.hashIp(realIp)}`);

    const testResult: {
      clickFound: boolean;
      ipAllowed: boolean;
      signatureValid: boolean | null;
      apiKeyValid: boolean | null;
      clickDetails?: {
        partnerId: string;
        companyId: string;
        clickedAt: Date;
      };
      errors: string[];
    } = {
      clickFound: false,
      ipAllowed: false,
      signatureValid: null,
      apiKeyValid: null,
      errors: [],
    };

    if (!clickId) {
      testResult.errors.push('click_id is required');
      return res?.status(400).json(testResult) ?? testResult;
    }

    // Find click
    const click = await this.findClickByIdempotencyKey(clickId);
    if (!click) {
      testResult.errors.push('Click not found');
      return res?.status(200).json(testResult) ?? testResult;
    }

    testResult.clickFound = true;
    testResult.clickDetails = {
      partnerId: click.partnerId,
      companyId: click.companyId,
      clickedAt: click.clickedAt,
    };

    // Check IP whitelist
    const ipCheckResult = await this.checkIpWhitelist(click.companyId, click.partnerId, realIp);
    testResult.ipAllowed = ipCheckResult.allowed;
    if (!ipCheckResult.allowed) {
      testResult.errors.push(`IP ${realIp} is not in the whitelist`);
    }

    // Verify signature if provided
    if (signature) {
      testResult.signatureValid = await this.verifyPostbackSignature(
        clickId,
        undefined,
        signature,
        click.companyId,
      );
      if (!testResult.signatureValid) {
        testResult.errors.push('Invalid signature');
      }
    }

    // Verify API key if provided
    if (apiKey) {
      testResult.apiKeyValid = await this.verifyApiKey(click.companyId, apiKey);
      if (!testResult.apiKeyValid) {
        testResult.errors.push('Invalid API key');
      }
    }

    return res?.status(200).json(testResult) ?? testResult;
  }

  /**
   * Custom format postback with configurable field mapping
   * Reads field mapping from partnership configuration
   */
  @Get('custom/:partnerId')
  @HttpCode(HttpStatus.OK)
  async handleCustomPostback(
    @Param('partnerId') partnerId: string,
    @Query() query: Record<string, string>,
    @Ip() ipAddress?: string,
    @Headers('x-forwarded-for') forwardedFor?: string,
    @Res() res?: Response,
  ) {
    const realIp = this.extractRealIp(ipAddress, forwardedFor);

    this.logger.log(`Custom postback for partner ${partnerId}`);

    const rateLimitResult = this.checkRateLimit(realIp);
    if (!rateLimitResult.allowed) {
      await this.logPostbackAttempt(null, realIp, 'CUSTOM', 'RATE_LIMITED');
      return this.sendPostbackResponse(res, PostbackResponseStatus.RATE_LIMITED, 429);
    }

    // Get partner with custom field mapping
    const partner = await this.prisma.affiliatePartner.findFirst({
      where: {
        id: partnerId,
        deletedAt: null,
      },
      select: {
        id: true,
        companyId: true,
        customTerms: true,
      },
    });

    if (!partner) {
      await this.logPostbackAttempt(null, realIp, 'CUSTOM', 'PARTNER_NOT_FOUND');
      return this.sendPostbackResponse(res, PostbackResponseStatus.INVALID_CLICK, 400);
    }

    // Get field mapping from customTerms or use defaults
    const fieldMapping = this.getFieldMapping(partner.customTerms as Record<string, any>);

    // Extract values using field mapping
    const clickId = query[fieldMapping.clickIdField];
    if (!clickId) {
      await this.logPostbackAttempt(null, realIp, 'CUSTOM', 'MISSING_CLICK_ID');
      return this.sendPostbackResponse(res, PostbackResponseStatus.INVALID_CLICK, 400);
    }

    const click = await this.findClickByIdempotencyKey(clickId);
    if (!click) {
      await this.logPostbackAttempt(clickId, realIp, 'CUSTOM', 'CLICK_NOT_FOUND');
      return this.sendPostbackResponse(res, PostbackResponseStatus.INVALID_CLICK, 400);
    }

    // Verify partner matches
    if (click.partnerId !== partnerId) {
      await this.logPostbackAttempt(clickId, realIp, 'CUSTOM', 'PARTNER_MISMATCH');
      return this.sendPostbackResponse(res, PostbackResponseStatus.INVALID_CLICK, 400);
    }

    const idempotencyKey = `postback-custom-${clickId}-${query[fieldMapping.orderIdField || 'order_id'] || 'default'}`;
    const duplicateCheck = await this.idempotencyService.checkAndLock(idempotencyKey);
    if (duplicateCheck.isDuplicate) {
      await this.logPostbackAttempt(clickId, realIp, 'CUSTOM', 'DUPLICATE');
      return this.sendPostbackResponse(res, PostbackResponseStatus.DUPLICATE, 200);
    }

    try {
      const dto: PostbackDto = {
        clickId,
        orderId: query[fieldMapping.orderIdField || 'order_id'],
        amount: this.parseAmount(query[fieldMapping.amountField || 'amount']),
        status: query[fieldMapping.statusField || 'status'],
        subId1: query[fieldMapping.subId1Field || 'sub1'],
        subId2: query[fieldMapping.subId2Field || 'sub2'],
        subId3: query[fieldMapping.subId3Field || 'sub3'],
        subId4: query[fieldMapping.subId4Field || 'sub4'],
        subId5: query[fieldMapping.subId5Field || 'sub5'],
      };

      await this.logPostback(clickId, dto, realIp, 'CUSTOM', PostbackFormat.CUSTOM);

      const result = await this.trackingService.handlePostback(dto) as TrackConversionResult;

      await this.idempotencyService.complete(idempotencyKey, result);

      if (result.attributed && result.conversionId) {
        await this.fireOutboundPostback(partnerId, click.companyId, {
          clickId,
          conversionId: result.conversionId,
          payout: dto.amount,
          status: 'approved',
          subId1: dto.subId1,
          subId2: dto.subId2,
          subId3: dto.subId3,
          subId4: dto.subId4,
          subId5: dto.subId5,
        });
      }

      return this.sendPostbackResponse(res, PostbackResponseStatus.SUCCESS, 200, {
        attributed: result.attributed,
      });
    } catch (error) {
      await this.idempotencyService.fail(idempotencyKey);
      this.logger.error(`Custom postback error: ${error.message}`, error.stack);
      return this.sendPostbackResponse(res, PostbackResponseStatus.ERROR, 500);
    }
  }

  // ==================== Helper Methods ====================

  /**
   * Extract real IP from request, handling proxy headers
   */
  private extractRealIp(ipAddress?: string, forwardedFor?: string): string {
    if (forwardedFor) {
      return forwardedFor.split(',')[0]?.trim() || ipAddress || 'unknown';
    }
    return ipAddress || 'unknown';
  }

  /**
   * Parse amount string to number
   */
  private parseAmount(amount?: string): number | undefined {
    if (!amount) return undefined;
    const parsed = parseFloat(amount);
    return isNaN(parsed) ? undefined : parsed;
  }

  /**
   * Find click by idempotency key
   */
  private async findClickByIdempotencyKey(clickId: string) {
    return this.prisma.affiliateClick.findFirst({
      where: { idempotencyKey: clickId },
      select: {
        id: true,
        partnerId: true,
        companyId: true,
        clickedAt: true,
        subId1: true,
        subId2: true,
        subId3: true,
        subId4: true,
        subId5: true,
      },
    });
  }

  /**
   * Check rate limit for IP address
   */
  private checkRateLimit(ipAddress: string): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const key = `rate-limit-${ipAddress}`;
    const record = rateLimitMap.get(key);

    if (!record || now > record.resetAt) {
      rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
      return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1 };
    }

    if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
      return { allowed: false, remaining: 0 };
    }

    record.count++;
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - record.count };
  }

  /**
   * Check IP whitelist for company/partner
   */
  private async checkIpWhitelist(
    companyId: string,
    partnerId: string,
    ipAddress: string,
  ): Promise<{ allowed: boolean }> {
    // Get company config
    const config = await this.prisma.affiliateProgramConfig.findUnique({
      where: { companyId },
      select: { postbackAllowedIps: true },
    });

    // If no whitelist configured, allow all
    if (!config?.postbackAllowedIps) {
      return { allowed: true };
    }

    const allowedIps = config.postbackAllowedIps as string[];
    if (!allowedIps.length) {
      return { allowed: true };
    }

    // Check if IP is in whitelist (support CIDR notation in future)
    return { allowed: allowedIps.includes(ipAddress) };
  }

  /**
   * Verify postback signature using HMAC-SHA256
   */
  private async verifyPostbackSignature(
    clickId: string,
    amount: string | undefined,
    signature: string,
    companyId: string,
  ): Promise<boolean> {
    // Get company's secret key
    const config = await this.prisma.affiliateProgramConfig.findUnique({
      where: { companyId },
      select: { postbackSecretKey: true },
    });

    if (!config?.postbackSecretKey) {
      // No secret configured, signature verification not required
      return true;
    }

    // Generate expected signature
    const payload = `${clickId}:${amount || ''}`;
    const expectedSignature = crypto
      .createHmac('sha256', config.postbackSecretKey)
      .update(payload)
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature),
      );
    } catch {
      return false;
    }
  }

  /**
   * Verify API key against company configuration
   */
  private async verifyApiKey(companyId: string, apiKey: string): Promise<boolean> {
    const config = await this.prisma.affiliateProgramConfig.findUnique({
      where: { companyId },
      select: { postbackApiKey: true },
    });

    if (!config?.postbackApiKey) {
      return false;
    }

    // Constant-time comparison
    try {
      return crypto.timingSafeEqual(
        Buffer.from(apiKey),
        Buffer.from(config.postbackApiKey),
      );
    } catch {
      return false;
    }
  }

  /**
   * Get field mapping from partner configuration
   */
  private getFieldMapping(customTerms?: Record<string, any>): PostbackFieldMapping {
    const defaultMapping: PostbackFieldMapping = {
      clickIdField: 'click_id',
      amountField: 'amount',
      orderIdField: 'order_id',
      statusField: 'status',
      subId1Field: 'sub1',
      subId2Field: 'sub2',
      subId3Field: 'sub3',
      subId4Field: 'sub4',
      subId5Field: 'sub5',
    };

    if (!customTerms?.postbackFieldMapping) {
      return defaultMapping;
    }

    return {
      ...defaultMapping,
      ...customTerms.postbackFieldMapping,
    };
  }

  /**
   * Send standardized postback response
   */
  private sendPostbackResponse(
    res: Response | undefined,
    status: PostbackResponseStatus,
    httpStatus: number,
    data?: Record<string, any>,
  ) {
    const response = {
      status,
      ...data,
    };

    // Some affiliate networks expect just "1" or "OK" as response
    if (status === PostbackResponseStatus.SUCCESS) {
      if (res) {
        return res.status(httpStatus).send('1');
      }
      return '1';
    }

    if (status === PostbackResponseStatus.DUPLICATE) {
      if (res) {
        return res.status(httpStatus).send('DUPLICATE');
      }
      return 'DUPLICATE';
    }

    if (res) {
      return res.status(httpStatus).json(response);
    }
    return response;
  }

  /**
   * Fire outbound postback to affiliate's configured URL
   * Includes macro replacement and retry logic
   */
  private async fireOutboundPostback(
    partnerId: string,
    companyId: string,
    data: {
      clickId: string;
      conversionId: string;
      payout?: number;
      status: string;
      subId1?: string;
      subId2?: string;
      subId3?: string;
      subId4?: string;
      subId5?: string;
    },
  ): Promise<void> {
    try {
      // Get partner's postback URL configuration
      const partner = await this.prisma.affiliatePartner.findUnique({
        where: { id: partnerId },
        select: {
          customTerms: true,
          affiliateCode: true,
        },
      });

      if (!partner) return;

      const customTerms = partner.customTerms as Record<string, any>;
      const postbackUrl = customTerms?.postbackUrl;

      if (!postbackUrl) {
        this.logger.debug(`No postback URL configured for partner ${partnerId}`);
        return;
      }

      // Replace macros in URL
      let finalUrl = postbackUrl
        .replace(POSTBACK_MACROS.CLICK_ID, encodeURIComponent(data.clickId))
        .replace(POSTBACK_MACROS.CONVERSION_ID, encodeURIComponent(data.conversionId))
        .replace(POSTBACK_MACROS.PAYOUT, encodeURIComponent(data.payout?.toString() || '0'))
        .replace(POSTBACK_MACROS.STATUS, encodeURIComponent(data.status))
        .replace(POSTBACK_MACROS.ORDER_ID, encodeURIComponent(data.conversionId))
        .replace(POSTBACK_MACROS.T1, encodeURIComponent(data.subId1 || ''))
        .replace(POSTBACK_MACROS.T2, encodeURIComponent(data.subId2 || ''))
        .replace(POSTBACK_MACROS.T3, encodeURIComponent(data.subId3 || ''))
        .replace(POSTBACK_MACROS.T4, encodeURIComponent(data.subId4 || ''))
        .replace(POSTBACK_MACROS.T5, encodeURIComponent(data.subId5 || ''))
        .replace(POSTBACK_MACROS.TIMESTAMP, encodeURIComponent(Date.now().toString()));

      // Generate signature if secret key is configured
      if (customTerms?.postbackSecretKey) {
        const payload = `${data.clickId}:${data.payout || ''}`;
        const signature = crypto
          .createHmac('sha256', customTerms.postbackSecretKey)
          .update(payload)
          .digest('hex');
        finalUrl = finalUrl.replace(POSTBACK_MACROS.SIGNATURE, encodeURIComponent(signature));
      }

      // Fire the postback with retry logic
      await this.executeOutboundPostback(finalUrl, partnerId, data.conversionId, 0);
    } catch (error) {
      this.logger.error(`Failed to fire outbound postback: ${error.message}`, error.stack);
    }
  }

  /**
   * Execute outbound postback with exponential backoff retry
   */
  private async executeOutboundPostback(
    url: string,
    partnerId: string,
    conversionId: string,
    attempt: number,
  ): Promise<void> {
    const MAX_RETRIES = 3;
    const BASE_DELAY_MS = 1000;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'AVNZ-Postback/1.0',
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (response.ok) {
        this.logger.log(`Outbound postback successful for conversion ${conversionId}`);

        // Log success
        await this.auditLogsService.log(
          AuditAction.CREATE,
          AuditEntity.AFFILIATE_CONVERSION,
          conversionId,
          {
            dataClassification: DataClassification.INTERNAL,
            metadata: {
              action: 'outbound_postback_sent',
              partnerId,
              url: url.substring(0, 200), // Truncate for logging
              status: response.status,
            },
          },
        );
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      this.logger.warn(
        `Outbound postback attempt ${attempt + 1} failed for conversion ${conversionId}: ${error.message}`,
      );

      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        this.logger.debug(`Retrying outbound postback in ${delay}ms`);

        setTimeout(() => {
          this.executeOutboundPostback(url, partnerId, conversionId, attempt + 1);
        }, delay);
      } else {
        this.logger.error(`Outbound postback failed after ${MAX_RETRIES} retries for conversion ${conversionId}`);

        // Log failure
        await this.auditLogsService.log(
          AuditAction.CREATE,
          AuditEntity.AFFILIATE_CONVERSION,
          conversionId,
          {
            dataClassification: DataClassification.INTERNAL,
            metadata: {
              action: 'outbound_postback_failed',
              partnerId,
              url: url.substring(0, 200),
              error: error.message,
              attempts: MAX_RETRIES + 1,
            },
          },
        );
      }
    }
  }

  /**
   * Log postback attempt for audit trail
   */
  private async logPostbackAttempt(
    clickId: string | null,
    ipAddress: string,
    source: string,
    status: string,
  ): Promise<void> {
    try {
      await this.auditLogsService.log(
        AuditAction.CREATE,
        AuditEntity.AFFILIATE_CONVERSION,
        `postback-attempt-${Date.now()}`,
        {
          dataClassification: DataClassification.INTERNAL,
          metadata: {
            action: 'postback_attempt',
            source,
            status,
            clickId,
            ipAddress,
          },
        },
      );
    } catch (error) {
      this.logger.error(`Failed to log postback attempt: ${error.message}`);
    }
  }

  /**
   * Log successful postback for audit trail
   */
  private async logPostback(
    clickId: string,
    dto: PostbackDto,
    ipAddress: string | undefined,
    source: string,
    format: PostbackFormat,
  ): Promise<void> {
    try {
      await this.auditLogsService.log(
        AuditAction.CREATE,
        AuditEntity.AFFILIATE_CONVERSION,
        `postback-${clickId}`,
        {
          dataClassification: DataClassification.INTERNAL,
          metadata: {
            source,
            format,
            clickId: dto.clickId,
            orderId: dto.orderId,
            amount: dto.amount,
            status: dto.status,
            ipAddress,
            subId1: dto.subId1,
            subId2: dto.subId2,
            subId3: dto.subId3,
            subId4: dto.subId4,
            subId5: dto.subId5,
          },
        },
      );
    } catch (error) {
      this.logger.error(`Failed to log postback: ${error.message}`);
    }
  }

  /**
   * Hash IP address for privacy-safe logging
   */
  private hashIp(ip: string): string {
    return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 8);
  }
}
