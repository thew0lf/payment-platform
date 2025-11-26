import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TriggerLibraryService } from './trigger-library.service';
import {
  BehavioralTrigger,
  BehavioralTriggerType,
  ApplyTriggersDto,
  EnhancedContent,
  GetTriggerSuggestionsDto,
} from '../types/triggers.types';

@Controller('momentum/triggers')
@UseGuards(JwtAuthGuard)
export class TriggersController {
  constructor(private readonly triggerService: TriggerLibraryService) {}

  // ═══════════════════════════════════════════════════════════════
  // TRIGGER LIBRARY
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get all behavioral triggers in the library
   */
  @Get()
  getAllTriggers(): BehavioralTrigger[] {
    return this.triggerService.getAllTriggers();
  }

  /**
   * Get a specific trigger by type
   */
  @Get('type/:type')
  getTrigger(@Param('type') type: BehavioralTriggerType): BehavioralTrigger | undefined {
    return this.triggerService.getTrigger(type);
  }

  /**
   * Get triggers for a specific context
   */
  @Get('context/:context')
  getTriggersByContext(@Param('context') context: string): BehavioralTrigger[] {
    return this.triggerService.getTriggersByContext(context);
  }

  // ═══════════════════════════════════════════════════════════════
  // TRIGGER APPLICATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Apply behavioral triggers to content
   */
  @Post('apply')
  async applyTriggers(@Body() dto: ApplyTriggersDto): Promise<EnhancedContent> {
    return this.triggerService.applyTriggers(dto);
  }

  // ═══════════════════════════════════════════════════════════════
  // SUGGESTIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get trigger suggestions for a specific goal
   */
  @Post('suggestions')
  getSuggestions(@Body() dto: GetTriggerSuggestionsDto): BehavioralTrigger[] {
    return this.triggerService.getSuggestionsForGoal(dto);
  }

  // ═══════════════════════════════════════════════════════════════
  // UTILITY ENDPOINTS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get all trigger types
   */
  @Get('types')
  getTriggerTypes() {
    return Object.values(BehavioralTriggerType);
  }

  /**
   * Get triggers grouped by effectiveness category
   */
  @Get('by-effectiveness')
  getTriggersByEffectiveness() {
    const triggers = this.triggerService.getAllTriggers();

    return {
      highImpact: triggers.filter(t =>
        t.effectiveness.conversionLift.includes('25') ||
        t.effectiveness.conversionLift.includes('30') ||
        t.effectiveness.conversionLift.includes('35')
      ),
      mediumImpact: triggers.filter(t =>
        t.effectiveness.conversionLift.includes('15') ||
        t.effectiveness.conversionLift.includes('20')
      ),
      lowImpact: triggers.filter(t =>
        t.effectiveness.conversionLift.includes('10') ||
        t.effectiveness.conversionLift.includes('12')
      ),
    };
  }

  /**
   * Get triggers by use case category
   */
  @Get('by-use-case')
  getTriggersByUseCase() {
    const triggers = this.triggerService.getAllTriggers();

    const categories = {
      retention: ['Cancel', 'Retention', 'Cancellation'],
      conversion: ['Cart', 'Checkout', 'Purchase', 'Subscribe'],
      pricing: ['Pricing', 'Discount', 'Offer'],
      onboarding: ['Onboarding', 'New'],
      engagement: ['Engagement', 'Loyalty'],
    };

    const result: Record<string, BehavioralTrigger[]> = {};

    for (const [category, keywords] of Object.entries(categories)) {
      result[category] = triggers.filter(t =>
        t.useCases.some(uc =>
          keywords.some(kw => uc.toLowerCase().includes(kw.toLowerCase()))
        )
      );
    }

    return result;
  }
}
