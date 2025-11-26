import { Injectable, Logger } from '@nestjs/common';
import {
  BehavioralTrigger,
  BehavioralTriggerType,
  TriggerApplication,
  ApplyTriggersDto,
  EnhancedContent,
  GetTriggerSuggestionsDto,
  BEHAVIORAL_TRIGGERS,
} from '../types/triggers.types';

@Injectable()
export class TriggerLibraryService {
  private readonly logger = new Logger(TriggerLibraryService.name);
  private readonly triggers: Map<BehavioralTriggerType, BehavioralTrigger>;

  constructor() {
    this.triggers = new Map(
      BEHAVIORAL_TRIGGERS.map(t => [t.type, t])
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // TRIGGER LIBRARY ACCESS
  // ═══════════════════════════════════════════════════════════════

  getAllTriggers(): BehavioralTrigger[] {
    return BEHAVIORAL_TRIGGERS;
  }

  getTrigger(type: BehavioralTriggerType): BehavioralTrigger | undefined {
    return this.triggers.get(type);
  }

  getTriggersByContext(context: string): BehavioralTrigger[] {
    return BEHAVIORAL_TRIGGERS.filter(t =>
      t.useCases.some(uc => uc.toLowerCase().includes(context.toLowerCase()))
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // TRIGGER APPLICATION
  // ═══════════════════════════════════════════════════════════════

  async applyTriggers(dto: ApplyTriggersDto): Promise<EnhancedContent> {
    const triggersToApply = dto.triggers
      ? dto.triggers.map(t => this.triggers.get(t)).filter(Boolean) as BehavioralTrigger[]
      : this.selectTriggersForContext(dto.context, dto.maxTriggers || 3);

    let enhancedContent = dto.content;
    const applications: TriggerApplication[] = [];

    for (const trigger of triggersToApply) {
      const application = await this.applyTrigger(trigger, enhancedContent, dto.customerData);
      if (application) {
        enhancedContent = application.enhancedContent;
        applications.push(application);
      }
    }

    return {
      original: dto.content,
      enhanced: enhancedContent,
      triggersApplied: applications,
      estimatedLift: this.calculateEstimatedLift(applications),
    };
  }

  private async applyTrigger(
    trigger: BehavioralTrigger,
    content: string,
    customerData?: ApplyTriggersDto['customerData'],
  ): Promise<TriggerApplication | null> {
    let enhancedContent = content;
    const variables: Record<string, unknown> = {};

    switch (trigger.type) {
      case BehavioralTriggerType.LOSS_AVERSION:
        enhancedContent = this.applyLossAversion(content, customerData);
        variables.rewardsBalance = customerData?.rewardsBalance;
        variables.productsExplored = customerData?.productsExplored;
        break;

      case BehavioralTriggerType.SOCIAL_PROOF:
        enhancedContent = this.applySocialProof(content);
        variables.memberCount = 2847; // Would come from actual data
        variables.percentage = 94;
        break;

      case BehavioralTriggerType.IDENTITY_ALIGNMENT:
        enhancedContent = this.applyIdentityAlignment(content, customerData);
        variables.tier = this.getTierName(customerData?.productsExplored || 0);
        break;

      case BehavioralTriggerType.URGENCY:
        enhancedContent = this.applyUrgency(content);
        variables.expiresIn = '10:00';
        break;

      case BehavioralTriggerType.ANCHORING:
        enhancedContent = this.applyAnchoring(content);
        variables.retailValue = 45;
        variables.memberPrice = 26.95;
        break;

      case BehavioralTriggerType.FUTURE_PACING:
        enhancedContent = this.applyFuturePacing(content, customerData);
        break;

      case BehavioralTriggerType.COMMITMENT_CONSISTENCY:
        enhancedContent = this.applyCommitmentConsistency(content, customerData);
        break;

      case BehavioralTriggerType.PATTERN_INTERRUPT:
        enhancedContent = this.applyPatternInterrupt(content, customerData);
        break;

      case BehavioralTriggerType.SCARCITY:
        enhancedContent = this.applyScarcity(content);
        break;

      case BehavioralTriggerType.RECIPROCITY:
        enhancedContent = this.applyReciprocity(content);
        break;

      case BehavioralTriggerType.AUTHORITY:
        enhancedContent = this.applyAuthority(content);
        break;

      case BehavioralTriggerType.OWNERSHIP_VELOCITY:
        enhancedContent = this.applyOwnershipVelocity(content);
        break;

      case BehavioralTriggerType.CONTRAST_PRINCIPLE:
        enhancedContent = this.applyContrastPrinciple(content);
        break;

      default:
        return null;
    }

    if (enhancedContent === content) {
      return null; // No change made
    }

    return {
      triggerType: trigger.type,
      targetElement: 'content',
      originalContent: content,
      enhancedContent,
      variables,
      confidence: 0.8,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // TRIGGER IMPLEMENTATIONS
  // ═══════════════════════════════════════════════════════════════

  private applyLossAversion(content: string, customerData?: ApplyTriggersDto['customerData']): string {
    const rewards = customerData?.rewardsBalance || 0;
    const progress = customerData?.productsExplored || 0;

    if (content.toLowerCase().includes('cancel')) {
      let lossContent = content;

      if (rewards > 0) {
        lossContent += `\n\n⚠️ You'll lose $${rewards.toFixed(2)} in rewards`;
      }
      if (progress > 0) {
        lossContent += `\n📊 Your ${progress} coffee origins explored will be lost`;
      }

      return lossContent;
    }

    return content;
  }

  private applySocialProof(content: string): string {
    // Add social proof elements
    if (content.toLowerCase().includes('subscribe') || content.toLowerCase().includes('join')) {
      return content + '\n\n👥 Join 10,000+ Coffee Explorers';
    }

    if (content.toLowerCase().includes('cancel')) {
      return content + '\n\n💡 94% of members at this point decided to stay';
    }

    return content;
  }

  private applyIdentityAlignment(content: string, customerData?: ApplyTriggersDto['customerData']): string {
    const tier = this.getTierName(customerData?.productsExplored || 0);

    // Replace generic terms with identity-based language
    const enhanced = content
      .replace(/customer/gi, `${tier}`)
      .replace(/subscriber/gi, 'Coffee Explorer')
      .replace(/your subscription/gi, 'your coffee journey');

    return enhanced;
  }

  private applyUrgency(content: string): string {
    // Add urgency elements where appropriate
    if (content.toLowerCase().includes('offer') || content.toLowerCase().includes('discount')) {
      return content + '\n\n⏰ This offer expires in 10:00';
    }
    return content;
  }

  private applyAnchoring(content: string): string {
    // Add price anchoring
    if (content.includes('$') && content.includes('/month')) {
      return content.replace(
        /\$[\d.]+\/month/,
        'Retail value: $45/month. Your price: $26.95'
      );
    }
    return content;
  }

  private applyFuturePacing(content: string, customerData?: ApplyTriggersDto['customerData']): string {
    const progress = customerData?.productsExplored || 0;
    const remaining = 15 - progress;

    if (content.toLowerCase().includes('stay') || content.toLowerCase().includes('continue')) {
      return content + `\n\n🎯 In 3 months, you'll have explored ${progress + 6} origins and be ${remaining - 6 > 0 ? remaining - 6 : 0} away from Connoisseur status`;
    }
    return content;
  }

  private applyCommitmentConsistency(content: string, customerData?: ApplyTriggersDto['customerData']): string {
    const progress = customerData?.productsExplored || 0;
    const tenure = customerData?.tenureMonths || 0;

    if (progress > 0 || tenure > 0) {
      return `You've been with us for ${tenure} months and discovered ${progress} amazing coffees. ` + content;
    }
    return content;
  }

  private applyPatternInterrupt(content: string, customerData?: ApplyTriggersDto['customerData']): string {
    const progress = customerData?.productsExplored || 0;
    const total = 15; // Total to reach connoisseur status

    if (content.toLowerCase().includes('cancel')) {
      const percentage = Math.round((progress / total) * 100);
      return `Wait! You're ${percentage}% through your Coffee Journey...\n\n` + content;
    }
    return content;
  }

  private applyScarcity(content: string): string {
    if (content.toLowerCase().includes('offer') || content.toLowerCase().includes('discount')) {
      return content + '\n\n🔒 This exclusive offer is only available to members like you';
    }
    return content;
  }

  private applyReciprocity(content: string): string {
    if (content.toLowerCase().includes('discount') || content.toLowerCase().includes('off')) {
      return content.replace(
        /get (\d+)% off/gi,
        "we'd like to give you $1% off as a thank you"
      );
    }
    return content;
  }

  private applyAuthority(content: string): string {
    if (content.toLowerCase().includes('coffee') && content.toLowerCase().includes('quality')) {
      return content + '\n\n☕ Selected by certified Q Graders with 85+ cup scores';
    }
    return content;
  }

  private applyOwnershipVelocity(content: string): string {
    // Replace generic language with ownership language
    return content
      .replace(/your order/gi, 'your curated selection')
      .replace(/the subscription/gi, 'your coffee collection')
      .replace(/a subscription/gi, 'your personal coffee journey');
  }

  private applyContrastPrinciple(content: string): string {
    if (content.toLowerCase().includes('discount') || content.toLowerCase().includes('save')) {
      return content + '\n\n💎 Other members pay full price. Your exclusive rate is locked in.';
    }
    return content;
  }

  // ═══════════════════════════════════════════════════════════════
  // SUGGESTIONS
  // ═══════════════════════════════════════════════════════════════

  getSuggestionsForGoal(dto: GetTriggerSuggestionsDto): BehavioralTrigger[] {
    const goalTriggers: Record<string, BehavioralTriggerType[]> = {
      conversion: [
        BehavioralTriggerType.SOCIAL_PROOF,
        BehavioralTriggerType.SCARCITY,
        BehavioralTriggerType.URGENCY,
        BehavioralTriggerType.ANCHORING,
      ],
      retention: [
        BehavioralTriggerType.LOSS_AVERSION,
        BehavioralTriggerType.COMMITMENT_CONSISTENCY,
        BehavioralTriggerType.IDENTITY_ALIGNMENT,
        BehavioralTriggerType.FUTURE_PACING,
      ],
      engagement: [
        BehavioralTriggerType.PATTERN_INTERRUPT,
        BehavioralTriggerType.OWNERSHIP_VELOCITY,
        BehavioralTriggerType.FUTURE_PACING,
      ],
      upsell: [
        BehavioralTriggerType.ANCHORING,
        BehavioralTriggerType.CONTRAST_PRINCIPLE,
        BehavioralTriggerType.SCARCITY,
        BehavioralTriggerType.RECIPROCITY,
      ],
    };

    const triggerTypes = goalTriggers[dto.goal] || [];
    return triggerTypes
      .map(t => this.triggers.get(t))
      .filter(Boolean) as BehavioralTrigger[];
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════

  private selectTriggersForContext(context: string, maxTriggers: number): BehavioralTrigger[] {
    const contextTriggers: Record<string, BehavioralTriggerType[]> = {
      cancel_flow: [
        BehavioralTriggerType.PATTERN_INTERRUPT,
        BehavioralTriggerType.LOSS_AVERSION,
        BehavioralTriggerType.COMMITMENT_CONSISTENCY,
        BehavioralTriggerType.SOCIAL_PROOF,
      ],
      email: [
        BehavioralTriggerType.IDENTITY_ALIGNMENT,
        BehavioralTriggerType.FUTURE_PACING,
        BehavioralTriggerType.RECIPROCITY,
      ],
      sms: [
        BehavioralTriggerType.URGENCY,
        BehavioralTriggerType.SCARCITY,
      ],
      landing_page: [
        BehavioralTriggerType.SOCIAL_PROOF,
        BehavioralTriggerType.AUTHORITY,
        BehavioralTriggerType.ANCHORING,
      ],
      checkout: [
        BehavioralTriggerType.URGENCY,
        BehavioralTriggerType.SOCIAL_PROOF,
        BehavioralTriggerType.OWNERSHIP_VELOCITY,
      ],
      onboarding: [
        BehavioralTriggerType.FUTURE_PACING,
        BehavioralTriggerType.OWNERSHIP_VELOCITY,
        BehavioralTriggerType.IDENTITY_ALIGNMENT,
      ],
    };

    const triggerTypes = contextTriggers[context] || [];
    return triggerTypes
      .slice(0, maxTriggers)
      .map(t => this.triggers.get(t))
      .filter(Boolean) as BehavioralTrigger[];
  }

  private getTierName(productsExplored: number): string {
    if (productsExplored >= 15) return 'Connoisseur';
    if (productsExplored >= 10) return 'Enthusiast';
    if (productsExplored >= 5) return 'Explorer';
    if (productsExplored >= 1) return 'Discoverer';
    return 'Coffee Lover';
  }

  private calculateEstimatedLift(applications: TriggerApplication[]): string {
    // Simple estimate based on number and type of triggers
    const baseLifts: Record<BehavioralTriggerType, number> = {
      [BehavioralTriggerType.PATTERN_INTERRUPT]: 20,
      [BehavioralTriggerType.LOSS_AVERSION]: 25,
      [BehavioralTriggerType.IDENTITY_ALIGNMENT]: 15,
      [BehavioralTriggerType.SOCIAL_PROOF]: 20,
      [BehavioralTriggerType.SCARCITY]: 18,
      [BehavioralTriggerType.URGENCY]: 22,
      [BehavioralTriggerType.RECIPROCITY]: 15,
      [BehavioralTriggerType.ANCHORING]: 20,
      [BehavioralTriggerType.FUTURE_PACING]: 15,
      [BehavioralTriggerType.COMMITMENT_CONSISTENCY]: 20,
      [BehavioralTriggerType.AUTHORITY]: 12,
      [BehavioralTriggerType.OWNERSHIP_VELOCITY]: 15,
      [BehavioralTriggerType.CONTRAST_PRINCIPLE]: 25,
    };

    if (applications.length === 0) return '0%';

    const avgLift = applications.reduce(
      (sum, app) => sum + (baseLifts[app.triggerType] || 10),
      0
    ) / applications.length;

    // Diminishing returns for multiple triggers
    const multiplier = Math.pow(0.9, applications.length - 1);
    const finalLift = Math.round(avgLift * multiplier);

    return `+${finalLift}%`;
  }
}
