/**
 * Subscription Shipping Intelligence Service
 *
 * AI-powered shipping optimization:
 * - Carrier recommendations
 * - Delivery date predictions
 * - Rate shopping
 * - Address validation
 * - Delivery preferences
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import {
  Subscription,
  Address,
} from '@prisma/client';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

export enum ShippingCarrier {
  USPS = 'USPS',
  UPS = 'UPS',
  FEDEX = 'FEDEX',
  DHL = 'DHL',
  AMAZON = 'AMAZON',
  ONTRAC = 'ONTRAC',
  LASERSHIP = 'LASERSHIP',
}

export enum ServiceLevel {
  ECONOMY = 'ECONOMY',
  STANDARD = 'STANDARD',
  EXPRESS = 'EXPRESS',
  OVERNIGHT = 'OVERNIGHT',
  SAME_DAY = 'SAME_DAY',
}

export enum DeliveryConfidence {
  HIGH = 'HIGH',         // 90%+ on-time
  MEDIUM = 'MEDIUM',     // 70-89% on-time
  LOW = 'LOW',           // Below 70%
}

export interface ShippingRate {
  carrier: ShippingCarrier;
  serviceLevel: ServiceLevel;
  serviceName: string;
  rate: number;
  currency: string;
  estimatedDays: number;
  estimatedDelivery: Date;
  deliveryConfidence: DeliveryConfidence;
  isRecommended: boolean;
  savings?: number; // vs standard option
}

export interface CarrierRecommendation {
  subscriptionId: string;
  recommendedCarrier: ShippingCarrier;
  recommendedService: ServiceLevel;
  reason: string;
  confidence: number;
  alternatives: Array<{
    carrier: ShippingCarrier;
    serviceLevel: ServiceLevel;
    reason: string;
  }>;
  factors: ShippingFactor[];
}

export interface ShippingFactor {
  factor: string;
  value: string | number;
  impact: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
}

export interface DeliveryPrediction {
  subscriptionId: string;
  nextShipmentDate: Date;
  estimatedDeliveryDate: Date;
  deliveryWindow: {
    earliest: Date;
    latest: Date;
  };
  confidence: DeliveryConfidence;
  risks: DeliveryRisk[];
}

export interface DeliveryRisk {
  type: 'WEATHER' | 'HOLIDAY' | 'HIGH_VOLUME' | 'CARRIER_DELAY' | 'ADDRESS_ISSUE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
  mitigation?: string;
}

export interface AddressValidation {
  isValid: boolean;
  isDeliverable: boolean;
  normalizedAddress?: {
    address1: string;
    address2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  issues: AddressIssue[];
  suggestions: string[];
  deliveryNotes?: string;
}

export interface AddressIssue {
  field: string;
  issue: string;
  suggestion?: string;
}

export interface DeliveryPreferences {
  customerId: string;
  preferredCarrier?: ShippingCarrier;
  preferredServiceLevel?: ServiceLevel;
  deliveryInstructions?: string;
  signatureRequired: boolean;
  leaveAtDoor: boolean;
  preferredDeliveryTime?: 'MORNING' | 'AFTERNOON' | 'EVENING';
  authorityToLeave: boolean;
  notifyBySms: boolean;
  notifyByEmail: boolean;
}

export interface ShippingAnalytics {
  companyId: string;
  period: string;
  totalShipments: number;
  onTimeRate: number;
  averageDeliveryDays: number;
  carrierPerformance: Array<{
    carrier: ShippingCarrier;
    shipments: number;
    onTimeRate: number;
    avgDeliveryDays: number;
    avgCost: number;
  }>;
  savingsOpportunities: Array<{
    description: string;
    potentialSavings: number;
    recommendation: string;
  }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

@Injectable()
export class SubscriptionShippingService {
  private readonly logger = new Logger(SubscriptionShippingService.name);

  // In-memory storage for delivery preferences (would be database in production)
  private deliveryPreferences: Map<string, DeliveryPreferences> = new Map();

  // Mock carrier performance data
  private carrierPerformance: Map<ShippingCarrier, { onTimeRate: number; avgDays: number }> = new Map([
    [ShippingCarrier.USPS, { onTimeRate: 0.85, avgDays: 4 }],
    [ShippingCarrier.UPS, { onTimeRate: 0.92, avgDays: 3 }],
    [ShippingCarrier.FEDEX, { onTimeRate: 0.94, avgDays: 2.5 }],
    [ShippingCarrier.DHL, { onTimeRate: 0.90, avgDays: 3 }],
    [ShippingCarrier.AMAZON, { onTimeRate: 0.96, avgDays: 2 }],
    [ShippingCarrier.ONTRAC, { onTimeRate: 0.80, avgDays: 3 }],
    [ShippingCarrier.LASERSHIP, { onTimeRate: 0.75, avgDays: 3.5 }],
  ]);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════════
  // RATE SHOPPING
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get shipping rates for a subscription
   */
  async getShippingRates(
    subscriptionId: string,
    options?: {
      weight?: number;
      dimensions?: { length: number; width: number; height: number };
    },
  ): Promise<ShippingRate[]> {
    const subscription = await this.getSubscriptionWithAddress(subscriptionId);

    if (!subscription.shippingAddressId) {
      throw new BadRequestException('Subscription has no shipping address');
    }

    const address = await this.prisma.address.findUnique({
      where: { id: subscription.shippingAddressId },
    });

    if (!address) {
      throw new NotFoundException('Shipping address not found');
    }

    // Generate rates for each carrier (mock implementation)
    const baseRates: ShippingRate[] = [];
    const weight = options?.weight || 1; // Default 1 lb
    const now = new Date();

    for (const [carrier, performance] of this.carrierPerformance) {
      // Economy
      const economyDays = performance.avgDays + 3;
      const economyDate = new Date(now);
      economyDate.setDate(economyDate.getDate() + economyDays);
      baseRates.push({
        carrier,
        serviceLevel: ServiceLevel.ECONOMY,
        serviceName: `${carrier} Economy`,
        rate: this.calculateRate(carrier, ServiceLevel.ECONOMY, weight, address),
        currency: 'USD',
        estimatedDays: economyDays,
        estimatedDelivery: economyDate,
        deliveryConfidence: this.getConfidence(performance.onTimeRate - 0.1),
        isRecommended: false,
      });

      // Standard
      const standardDate = new Date(now);
      standardDate.setDate(standardDate.getDate() + performance.avgDays);
      baseRates.push({
        carrier,
        serviceLevel: ServiceLevel.STANDARD,
        serviceName: `${carrier} Standard`,
        rate: this.calculateRate(carrier, ServiceLevel.STANDARD, weight, address),
        currency: 'USD',
        estimatedDays: Math.round(performance.avgDays),
        estimatedDelivery: standardDate,
        deliveryConfidence: this.getConfidence(performance.onTimeRate),
        isRecommended: false,
      });

      // Express (selected carriers)
      if ([ShippingCarrier.UPS, ShippingCarrier.FEDEX, ShippingCarrier.DHL].includes(carrier)) {
        const expressDate = new Date(now);
        expressDate.setDate(expressDate.getDate() + 2);
        baseRates.push({
          carrier,
          serviceLevel: ServiceLevel.EXPRESS,
          serviceName: `${carrier} Express`,
          rate: this.calculateRate(carrier, ServiceLevel.EXPRESS, weight, address),
          currency: 'USD',
          estimatedDays: 2,
          estimatedDelivery: expressDate,
          deliveryConfidence: this.getConfidence(performance.onTimeRate + 0.03),
          isRecommended: false,
        });
      }
    }

    // Mark recommended option (best value)
    const sortedByValue = [...baseRates].sort((a, b) => {
      const aScore = (1 / a.estimatedDays) * 10 - a.rate;
      const bScore = (1 / b.estimatedDays) * 10 - b.rate;
      return bScore - aScore;
    });

    if (sortedByValue.length > 0) {
      const recommendedIdx = baseRates.findIndex(
        (r) => r.carrier === sortedByValue[0].carrier && r.serviceLevel === sortedByValue[0].serviceLevel,
      );
      if (recommendedIdx >= 0) {
        baseRates[recommendedIdx].isRecommended = true;
      }
    }

    // Calculate savings vs most expensive standard option
    const maxStandardRate = Math.max(
      ...baseRates.filter((r) => r.serviceLevel === ServiceLevel.STANDARD).map((r) => r.rate),
    );
    for (const rate of baseRates) {
      if (rate.serviceLevel === ServiceLevel.STANDARD && rate.rate < maxStandardRate) {
        rate.savings = maxStandardRate - rate.rate;
      }
    }

    // Sort by price
    return baseRates.sort((a, b) => a.rate - b.rate);
  }

  /**
   * Calculate shipping rate (mock)
   */
  private calculateRate(
    carrier: ShippingCarrier,
    serviceLevel: ServiceLevel,
    weight: number,
    address: Address,
  ): number {
    const baseRates: Record<ShippingCarrier, number> = {
      [ShippingCarrier.USPS]: 3.50,
      [ShippingCarrier.UPS]: 8.00,
      [ShippingCarrier.FEDEX]: 9.00,
      [ShippingCarrier.DHL]: 12.00,
      [ShippingCarrier.AMAZON]: 5.00,
      [ShippingCarrier.ONTRAC]: 6.00,
      [ShippingCarrier.LASERSHIP]: 5.50,
    };

    const serviceLevelMultiplier: Record<ServiceLevel, number> = {
      [ServiceLevel.ECONOMY]: 0.8,
      [ServiceLevel.STANDARD]: 1.0,
      [ServiceLevel.EXPRESS]: 1.8,
      [ServiceLevel.OVERNIGHT]: 3.0,
      [ServiceLevel.SAME_DAY]: 5.0,
    };

    const base = baseRates[carrier];
    const multiplier = serviceLevelMultiplier[serviceLevel];
    const weightCharge = Math.max(0, (weight - 1) * 0.75);

    // Zone-based pricing (simplified)
    const zoneMultiplier = this.getZoneMultiplier(address);

    return Number((base * multiplier * zoneMultiplier + weightCharge).toFixed(2));
  }

  private getZoneMultiplier(address: Address): number {
    // Simplified zone calculation based on state
    const remoteStates = ['AK', 'HI', 'PR', 'GU', 'VI'];
    if (remoteStates.includes(address.state)) {
      return 1.5;
    }
    return 1.0;
  }

  private getConfidence(onTimeRate: number): DeliveryConfidence {
    if (onTimeRate >= 0.9) return DeliveryConfidence.HIGH;
    if (onTimeRate >= 0.7) return DeliveryConfidence.MEDIUM;
    return DeliveryConfidence.LOW;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // CARRIER RECOMMENDATIONS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get carrier recommendation for subscription
   */
  async getCarrierRecommendation(subscriptionId: string): Promise<CarrierRecommendation> {
    const subscription = await this.getSubscriptionWithAddress(subscriptionId);

    if (!subscription.shippingAddressId) {
      throw new BadRequestException('Subscription has no shipping address');
    }

    const address = await this.prisma.address.findUnique({
      where: { id: subscription.shippingAddressId },
    });

    if (!address) {
      throw new NotFoundException('Shipping address not found');
    }

    // Collect factors
    const factors: ShippingFactor[] = [];

    // Check customer preferences
    const prefs = this.deliveryPreferences.get(subscription.customerId);
    if (prefs?.preferredCarrier) {
      factors.push({
        factor: 'CUSTOMER_PREFERENCE',
        value: prefs.preferredCarrier,
        impact: 'POSITIVE',
      });
    }

    // Check subscription value
    const subValue = Number(subscription.planAmount);
    if (subValue > 100) {
      factors.push({
        factor: 'HIGH_VALUE_ORDER',
        value: subValue,
        impact: 'POSITIVE',
      });
    }

    // Check address type
    const isRemote = ['AK', 'HI', 'PR'].includes(address.state);
    if (isRemote) {
      factors.push({
        factor: 'REMOTE_LOCATION',
        value: address.state,
        impact: 'NEGATIVE',
      });
    }

    // Determine recommendation
    let recommendedCarrier = ShippingCarrier.FEDEX;
    let recommendedService = ServiceLevel.STANDARD;
    let reason = 'Best balance of speed and reliability';

    if (prefs?.preferredCarrier) {
      recommendedCarrier = prefs.preferredCarrier;
      recommendedService = prefs.preferredServiceLevel || ServiceLevel.STANDARD;
      reason = 'Based on customer preference';
    } else if (isRemote) {
      recommendedCarrier = ShippingCarrier.USPS;
      reason = 'Best coverage for remote areas';
    } else if (subValue > 200) {
      recommendedCarrier = ShippingCarrier.FEDEX;
      recommendedService = ServiceLevel.EXPRESS;
      reason = 'Premium shipping for high-value subscription';
    }

    // Generate alternatives
    const alternatives = [];
    if (recommendedCarrier !== ShippingCarrier.USPS) {
      alternatives.push({
        carrier: ShippingCarrier.USPS,
        serviceLevel: ServiceLevel.STANDARD,
        reason: 'Most economical option',
      });
    }
    if (recommendedCarrier !== ShippingCarrier.UPS) {
      alternatives.push({
        carrier: ShippingCarrier.UPS,
        serviceLevel: ServiceLevel.STANDARD,
        reason: 'Reliable tracking and delivery',
      });
    }

    return {
      subscriptionId,
      recommendedCarrier,
      recommendedService,
      reason,
      confidence: 0.85,
      alternatives,
      factors,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // DELIVERY PREDICTIONS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Predict delivery for next shipment
   */
  async predictDelivery(subscriptionId: string): Promise<DeliveryPrediction> {
    const subscription = await this.getSubscriptionWithAddress(subscriptionId);

    if (!subscription.nextBillingDate) {
      throw new BadRequestException('Subscription has no scheduled billing');
    }

    // Assume ship date is 1 day after billing
    const shipDate = new Date(subscription.nextBillingDate);
    shipDate.setDate(shipDate.getDate() + 1);

    // Get carrier performance data
    const carrierData = this.carrierPerformance.get(ShippingCarrier.FEDEX)!;
    const avgDays = carrierData.avgDays;

    // Calculate delivery window
    const estimatedDelivery = new Date(shipDate);
    estimatedDelivery.setDate(estimatedDelivery.getDate() + avgDays);

    const earliest = new Date(shipDate);
    earliest.setDate(earliest.getDate() + Math.floor(avgDays * 0.8));

    const latest = new Date(shipDate);
    latest.setDate(latest.getDate() + Math.ceil(avgDays * 1.3));

    // Check for risks
    const risks: DeliveryRisk[] = [];

    // Holiday check (simplified)
    const holidays = this.getUpcomingHolidays(shipDate, latest);
    if (holidays.length > 0) {
      risks.push({
        type: 'HOLIDAY',
        severity: 'MEDIUM',
        description: `Holiday period: ${holidays.join(', ')}`,
        mitigation: 'Ship earlier to avoid delays',
      });
    }

    // Weather (would integrate with weather API)
    // High volume periods (simplified)
    if (this.isHighVolumePeriod(shipDate)) {
      risks.push({
        type: 'HIGH_VOLUME',
        severity: 'LOW',
        description: 'Peak shipping season may cause minor delays',
        mitigation: 'Consider express shipping',
      });
    }

    return {
      subscriptionId,
      nextShipmentDate: shipDate,
      estimatedDeliveryDate: estimatedDelivery,
      deliveryWindow: {
        earliest,
        latest,
      },
      confidence: risks.length === 0 ? DeliveryConfidence.HIGH : DeliveryConfidence.MEDIUM,
      risks,
    };
  }

  private getUpcomingHolidays(start: Date, end: Date): string[] {
    const holidays: string[] = [];
    const year = start.getFullYear();

    const usHolidays = [
      { date: new Date(year, 0, 1), name: 'New Year' },
      { date: new Date(year, 6, 4), name: 'Independence Day' },
      { date: new Date(year, 10, 28), name: 'Thanksgiving' },
      { date: new Date(year, 11, 25), name: 'Christmas' },
    ];

    for (const holiday of usHolidays) {
      if (holiday.date >= start && holiday.date <= end) {
        holidays.push(holiday.name);
      }
    }

    return holidays;
  }

  private isHighVolumePeriod(date: Date): boolean {
    const month = date.getMonth();
    // November and December are high volume
    return month === 10 || month === 11;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // ADDRESS VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Validate a shipping address
   */
  async validateAddress(address: {
    address1: string;
    address2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  }): Promise<AddressValidation> {
    const issues: AddressIssue[] = [];
    const suggestions: string[] = [];

    // Basic validation
    if (!address.address1 || address.address1.trim().length < 5) {
      issues.push({
        field: 'address1',
        issue: 'Street address is too short',
        suggestion: 'Include street number and name',
      });
    }

    if (!address.city || address.city.trim().length < 2) {
      issues.push({
        field: 'city',
        issue: 'City is required',
      });
    }

    if (!address.state || !this.isValidState(address.state)) {
      issues.push({
        field: 'state',
        issue: 'Invalid state code',
        suggestion: 'Use 2-letter state abbreviation',
      });
    }

    if (!address.postalCode || !this.isValidZip(address.postalCode)) {
      issues.push({
        field: 'postalCode',
        issue: 'Invalid postal code format',
        suggestion: 'Use format: 12345 or 12345-6789',
      });
    }

    // PO Box detection
    if (this.isPOBox(address.address1)) {
      suggestions.push('Some carriers cannot deliver to PO Boxes');
    }

    // Normalize address
    const normalizedAddress = {
      address1: address.address1.trim().toUpperCase(),
      address2: address.address2?.trim().toUpperCase(),
      city: address.city.trim().toUpperCase(),
      state: address.state.trim().toUpperCase(),
      postalCode: address.postalCode.replace(/[^0-9-]/g, ''),
      country: address.country?.toUpperCase() || 'US',
    };

    // Check deliverability (simplified)
    const isDeliverable = issues.length === 0 && this.isDeliverableZip(normalizedAddress.postalCode);

    if (!isDeliverable && issues.length === 0) {
      issues.push({
        field: 'postalCode',
        issue: 'This area may have limited delivery options',
      });
    }

    // Add delivery notes
    let deliveryNotes: string | undefined;
    if (['AK', 'HI'].includes(normalizedAddress.state)) {
      deliveryNotes = 'Extended delivery times for Alaska/Hawaii';
    }

    return {
      isValid: issues.length === 0,
      isDeliverable,
      normalizedAddress,
      issues,
      suggestions,
      deliveryNotes,
    };
  }

  private isValidState(state: string): boolean {
    const validStates = [
      'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
      'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
      'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
      'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
      'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
      'DC', 'PR', 'VI', 'GU',
    ];
    return validStates.includes(state.toUpperCase());
  }

  private isValidZip(zip: string): boolean {
    return /^\d{5}(-\d{4})?$/.test(zip);
  }

  private isPOBox(address: string): boolean {
    return /\b(P\.?O\.?\s*BOX|POST\s*OFFICE\s*BOX)\b/i.test(address);
  }

  private isDeliverableZip(zip: string): boolean {
    // Mock - would check against USPS deliverability database
    const prefix = zip.substring(0, 3);
    const invalidPrefixes = ['000', '001', '002', '003', '004'];
    return !invalidPrefixes.includes(prefix);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // DELIVERY PREFERENCES
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get delivery preferences for customer
   */
  async getDeliveryPreferences(customerId: string): Promise<DeliveryPreferences | null> {
    return this.deliveryPreferences.get(customerId) || null;
  }

  /**
   * Set delivery preferences for customer
   */
  async setDeliveryPreferences(
    customerId: string,
    preferences: Partial<DeliveryPreferences>,
  ): Promise<DeliveryPreferences> {
    const existing = this.deliveryPreferences.get(customerId) || {
      customerId,
      signatureRequired: false,
      leaveAtDoor: true,
      authorityToLeave: true,
      notifyBySms: true,
      notifyByEmail: true,
    };

    const updated: DeliveryPreferences = {
      ...existing,
      ...preferences,
      customerId, // Ensure customerId is set
    };

    this.deliveryPreferences.set(customerId, updated);

    this.eventEmitter.emit('subscription.shipping.preferences_updated', {
      customerId,
      preferences: updated,
    });

    this.logger.log(`Delivery preferences updated for customer ${customerId}`);

    return updated;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // ANALYTICS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get shipping analytics for company
   */
  async getShippingAnalytics(
    companyId: string,
    period: 'week' | 'month' | 'quarter' = 'month',
  ): Promise<ShippingAnalytics> {
    // Mock analytics data
    const totalShipments = 1250;
    const onTimeRate = 0.91;
    const avgDeliveryDays = 3.2;

    const carrierPerformance = Array.from(this.carrierPerformance.entries()).map(
      ([carrier, data]) => ({
        carrier,
        shipments: Math.floor(Math.random() * 300) + 50,
        onTimeRate: data.onTimeRate,
        avgDeliveryDays: data.avgDays,
        avgCost: this.calculateRate(carrier, ServiceLevel.STANDARD, 1, {
          state: 'CA',
        } as Address),
      }),
    );

    const savingsOpportunities = [
      {
        description: 'Consolidate shipments to reduce costs',
        potentialSavings: 1250,
        recommendation: 'Group orders within 24 hours for same address',
      },
      {
        description: 'Use regional carriers for nearby deliveries',
        potentialSavings: 800,
        recommendation: 'OnTrac for CA, AZ, NV deliveries',
      },
      {
        description: 'Negotiate volume discounts',
        potentialSavings: 2000,
        recommendation: 'Current volume qualifies for UPS tier 2 discount',
      },
    ];

    return {
      companyId,
      period,
      totalShipments,
      onTimeRate,
      averageDeliveryDays: avgDeliveryDays,
      carrierPerformance,
      savingsOpportunities,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════════

  private async getSubscriptionWithAddress(subscriptionId: string): Promise<Subscription> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription ${subscriptionId} not found`);
    }

    return subscription;
  }
}
