import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Res,
  Req,
  Headers,
  HttpStatus,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { AffiliateTrackingService } from './services/affiliate-tracking.service';
import { TrackClickDto } from './dto/track-click.dto';
import { TrackConversionDto, PostbackDto } from './dto/track-conversion.dto';
import { HmacGuard, RequireHmac } from '../common/hmac';

@Controller()
export class PublicAffiliatesController {
  private readonly logger = new Logger(PublicAffiliatesController.name);

  constructor(
    private readonly trackingService: AffiliateTrackingService,
  ) {}

  /**
   * Click redirect endpoint - /go/:code
   * Tracks click and redirects to destination URL
   */
  @Get('go/:code')
  async redirectClick(
    @Param('code') code: string,
    @Query() query: Record<string, string>,
    @Req() req: Request,
    @Res() res: Response,
    @Headers('user-agent') userAgent?: string,
    @Headers('referer') referer?: string,
  ) {
    try {
      // Extract IP address
      const ipAddress = this.getClientIp(req);

      // Extract SubID params from query string
      const dto: Omit<TrackClickDto, 'trackingCode'> = {
        ipAddress,
        userAgent,
        referrer: referer,
        subId1: query.sub1 || query.subid1 || query.subId1,
        subId2: query.sub2 || query.subid2 || query.subId2,
        subId3: query.sub3 || query.subid3 || query.subId3,
        subId4: query.sub4 || query.subid4 || query.subId4,
        subId5: query.sub5 || query.subid5 || query.subId5,
        sessionId: query.sid || query.session,
      };

      const result = await this.trackingService.trackClickByShortCode(code, dto);

      // Set affiliate cookie for attribution
      if (result.clickId) {
        res.cookie('aff_click', result.clickId, {
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
        });
      }

      // Redirect to destination
      return res.redirect(HttpStatus.FOUND, result.redirectUrl);
    } catch (error) {
      this.logger.warn(`Click redirect failed for code ${code}: ${error.message}`);
      // Redirect to home page on error (fail gracefully)
      return res.redirect(HttpStatus.FOUND, '/');
    }
  }

  /**
   * Track conversion - POST /api/track/conversion
   * Called after successful order to attribute to affiliate
   *
   * HMAC signed to prevent fraudulent conversion tracking
   * Required headers: X-Signature, X-Timestamp
   */
  @Post('track/conversion')
  @UseGuards(HmacGuard)
  @RequireHmac({ allowCompanyKeys: true })
  async trackConversion(@Body() dto: TrackConversionDto) {
    return this.trackingService.trackConversion(dto);
  }

  /**
   * Postback URL for external systems - GET /api/track/postback
   * Used by third-party networks to report conversions
   */
  @Get('track/postback')
  async handlePostback(
    @Query('click_id') clickId: string,
    @Query('order_id') orderId?: string,
    @Query('amount') amount?: string,
    @Query('status') status?: string,
    @Query('sub1') subId1?: string,
    @Query('sub2') subId2?: string,
    @Query('sub3') subId3?: string,
    @Query('sub4') subId4?: string,
    @Query('sub5') subId5?: string,
  ) {
    const dto: PostbackDto = {
      clickId,
      orderId,
      amount: amount ? parseFloat(amount) : undefined,
      status,
      subId1,
      subId2,
      subId3,
      subId4,
      subId5,
    };

    return this.trackingService.handlePostback(dto);
  }

  /**
   * Alternative postback via POST
   */
  @Post('track/postback')
  async handlePostbackPost(@Body() dto: PostbackDto) {
    return this.trackingService.handlePostback(dto);
  }

  /**
   * Get client IP address from request
   */
  private getClientIp(req: Request): string {
    // Check for forwarded IP (behind proxy)
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
      return ips.trim();
    }

    const realIp = req.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    return req.ip || req.socket?.remoteAddress || '0.0.0.0';
  }
}
