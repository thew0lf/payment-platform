import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { FunnelInterventionsService, InterventionConfig, SocialProofNotification } from '../services/funnel-interventions.service';

// ═══════════════════════════════════════════════════════════════════════════════
// DTOs
// ═══════════════════════════════════════════════════════════════════════════════

class TrackInterventionDto {
  sessionId!: string;
  interventionType!: string;
  action!: 'shown' | 'clicked' | 'dismissed' | 'converted';
  metadata?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTROLLER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Public Funnel Interventions Controller
 * Provides MI intervention data for funnel pages
 */
@Controller('funnels/public/:funnelId/interventions')
export class FunnelInterventionsController {
  constructor(private readonly interventionsService: FunnelInterventionsService) {}

  /**
   * Get intervention configuration for a funnel
   * GET /api/funnels/public/:funnelId/interventions/config
   */
  @Get('config')
  async getInterventionConfig(
    @Param('funnelId') funnelId: string,
  ): Promise<InterventionConfig> {
    return this.interventionsService.getInterventionConfig(funnelId);
  }

  /**
   * Get social proof notifications
   * GET /api/funnels/public/:funnelId/interventions/social-proof
   */
  @Get('social-proof')
  async getSocialProofNotifications(
    @Param('funnelId') funnelId: string,
    @Query('count') count?: string,
  ): Promise<{ notifications: SocialProofNotification[] }> {
    const notificationCount = count ? parseInt(count, 10) : 10;
    const notifications = await this.interventionsService.getSocialProofNotifications(
      funnelId,
      notificationCount,
    );
    return { notifications };
  }

  /**
   * Track intervention interaction
   * POST /api/funnels/public/:funnelId/interventions/track
   */
  @Post('track')
  async trackInteraction(
    @Param('funnelId') funnelId: string,
    @Body() dto: TrackInterventionDto,
  ): Promise<{ success: boolean }> {
    await this.interventionsService.trackInterventionEvent(
      dto.sessionId,
      dto.interventionType,
      dto.action,
      dto.metadata,
    );
    return { success: true };
  }
}
