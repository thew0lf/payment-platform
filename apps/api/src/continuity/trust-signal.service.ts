import { Injectable, Logger } from '@nestjs/common';
import { TrustSignal, TrustSignalType } from './interfaces/continuity.interfaces';

interface TrustMetrics {
  totalTransactions: number;
  successRate: number;
  averageRating: number;
  verifiedMerchant: boolean;
  complianceCertifications: string[];
}

@Injectable()
export class TrustSignalService {
  private readonly logger = new Logger(TrustSignalService.name);

  /**
   * Generate trust signals based on merchant/platform metrics
   * Implements the Trust Architecture principle from NCI
   */
  generateSignals(metrics: TrustMetrics): TrustSignal[] {
    const signals: TrustSignal[] = [];

    // Transaction count signal (social proof)
    if (metrics.totalTransactions >= 100) {
      signals.push(this.createTransactionCountSignal(metrics.totalTransactions));
    }

    // Success rate signal
    if (metrics.successRate >= 95) {
      signals.push(this.createSuccessRateSignal(metrics.successRate));
    }

    // User rating signal
    if (metrics.averageRating >= 4.0) {
      signals.push(this.createRatingSignal(metrics.averageRating));
    }

    // Verified merchant signal
    if (metrics.verifiedMerchant) {
      signals.push(this.createVerifiedMerchantSignal());
    }

    // Compliance signals
    metrics.complianceCertifications.forEach((cert, index) => {
      signals.push(this.createComplianceSignal(cert, 20 + index));
    });

    // Security indicator (always show)
    signals.push(this.createSecuritySignal());

    return signals.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get signals appropriate for a specific context
   */
  getContextualSignals(
    signals: TrustSignal[],
    context: 'checkout' | 'confirmation' | 'receipt'
  ): TrustSignal[] {
    const contextPriorities: Record<string, TrustSignalType[]> = {
      checkout: [
        TrustSignalType.SECURITY_BADGE,
        TrustSignalType.TRANSACTION_COUNT,
        TrustSignalType.VERIFIED_MERCHANT,
      ],
      confirmation: [
        TrustSignalType.COMPLIANCE_CERT,
        TrustSignalType.SECURITY_BADGE,
      ],
      receipt: [
        TrustSignalType.USER_RATING,
        TrustSignalType.VERIFIED_MERCHANT,
      ],
    };

    const relevantTypes = contextPriorities[context] || [];
    return signals.filter(signal => relevantTypes.includes(signal.type));
  }

  /**
   * Calculate aggregate trust score
   */
  calculateTrustScore(signals: TrustSignal[]): number {
    if (signals.length === 0) return 0;

    const weights: Record<TrustSignalType, number> = {
      [TrustSignalType.TRANSACTION_COUNT]: 25,
      [TrustSignalType.SECURITY_BADGE]: 20,
      [TrustSignalType.COMPLIANCE_CERT]: 20,
      [TrustSignalType.USER_RATING]: 20,
      [TrustSignalType.VERIFIED_MERCHANT]: 15,
    };

    let totalWeight = 0;
    let earnedWeight = 0;

    Object.values(TrustSignalType).forEach(type => {
      totalWeight += weights[type];
      if (signals.some(s => s.type === type)) {
        earnedWeight += weights[type];
      }
    });

    return Math.round((earnedWeight / totalWeight) * 100);
  }

  /**
   * Format trust signal for display
   */
  formatForDisplay(signal: TrustSignal): {
    icon: string;
    text: string;
    tooltip: string;
  } {
    const icons: Record<TrustSignalType, string> = {
      [TrustSignalType.TRANSACTION_COUNT]: 'chart-bar',
      [TrustSignalType.SECURITY_BADGE]: 'shield-check',
      [TrustSignalType.COMPLIANCE_CERT]: 'badge-check',
      [TrustSignalType.USER_RATING]: 'star',
      [TrustSignalType.VERIFIED_MERCHANT]: 'check-circle',
    };

    const tooltips: Record<TrustSignalType, string> = {
      [TrustSignalType.TRANSACTION_COUNT]: 'Based on verified transaction history',
      [TrustSignalType.SECURITY_BADGE]: 'Your payment is protected with bank-level security',
      [TrustSignalType.COMPLIANCE_CERT]: 'Certified compliant with industry standards',
      [TrustSignalType.USER_RATING]: 'Based on verified customer reviews',
      [TrustSignalType.VERIFIED_MERCHANT]: 'This merchant has been verified by our team',
    };

    return {
      icon: icons[signal.type],
      text: signal.displayText,
      tooltip: tooltips[signal.type],
    };
  }

  private createTransactionCountSignal(count: number): TrustSignal {
    const formatted = this.formatNumber(count);
    return {
      type: TrustSignalType.TRANSACTION_COUNT,
      value: count,
      displayText: `${formatted}+ successful transactions`,
      priority: 1,
    };
  }

  private createSuccessRateSignal(rate: number): TrustSignal {
    return {
      type: TrustSignalType.SECURITY_BADGE,
      value: rate,
      displayText: `${rate.toFixed(1)}% success rate`,
      priority: 5,
    };
  }

  private createRatingSignal(rating: number): TrustSignal {
    return {
      type: TrustSignalType.USER_RATING,
      value: rating,
      displayText: `${rating.toFixed(1)}/5.0 customer rating`,
      priority: 10,
    };
  }

  private createVerifiedMerchantSignal(): TrustSignal {
    return {
      type: TrustSignalType.VERIFIED_MERCHANT,
      value: 'verified',
      displayText: 'Verified Merchant',
      priority: 3,
    };
  }

  private createComplianceSignal(certification: string, priority: number): TrustSignal {
    return {
      type: TrustSignalType.COMPLIANCE_CERT,
      value: certification,
      displayText: `${certification} Compliant`,
      priority,
    };
  }

  private createSecuritySignal(): TrustSignal {
    return {
      type: TrustSignalType.SECURITY_BADGE,
      value: 'ssl_256',
      displayText: '256-bit SSL Encryption',
      priority: 2,
    };
  }

  private formatNumber(num: number): string {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(0)}K`;
    }
    return num.toString();
  }
}
