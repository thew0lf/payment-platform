import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ShippingRuleType, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export interface ShippingEstimateInput {
  companyId: string;
  country: string;
  state?: string;
  zipCode?: string;
  cartSubtotal: Decimal;
  cartItems: {
    productId: string;
    quantity: number;
    weight?: Decimal;
    lineTotal: Decimal;
  }[];
  hasFreeShippingPromotion?: boolean;
}

export interface ShippingOption {
  id: string;
  name: string;
  description: string | null;
  carrier: string | null;
  serviceCode: string | null;
  rate: Decimal;
  estimatedDaysMin: number | null;
  estimatedDaysMax: number | null;
  isFree: boolean;
  freeShippingReason?: string;
}

export interface ShippingEstimateResult {
  options: ShippingOption[];
  cheapestOption: ShippingOption | null;
  fastestOption: ShippingOption | null;
  freeShippingThreshold: Decimal | null;
  amountToFreeShipping: Decimal | null;
}

export interface CreateShippingZoneInput {
  name: string;
  description?: string;
  countries: string[];
  states?: string[];
  zipCodes?: string[];
  priority?: number;
}

export interface CreateShippingRuleInput {
  name: string;
  description?: string;
  carrier?: string;
  serviceCode?: string;
  type: ShippingRuleType;
  baseRate: number;
  perItemRate?: number;
  perWeightUnitRate?: number;
  weightUnit?: string;
  freeShippingThreshold?: number;
  minWeight?: number;
  maxWeight?: number;
  minOrderTotal?: number;
  maxOrderTotal?: number;
  estimatedDaysMin?: number;
  estimatedDaysMax?: number;
  sortOrder?: number;
}

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new shipping zone
   */
  async createShippingZone(companyId: string, data: CreateShippingZoneInput) {
    return this.prisma.shippingZone.create({
      data: {
        companyId,
        name: data.name,
        description: data.description,
        countries: data.countries.map((c) => c.toUpperCase()),
        states: data.states?.map((s) => s.toUpperCase()) || [],
        zipCodes: data.zipCodes || [],
        priority: data.priority || 0,
      },
      include: { rules: true },
    });
  }

  /**
   * Add a shipping rule to a zone
   */
  async addShippingRule(zoneId: string, data: CreateShippingRuleInput) {
    return this.prisma.shippingRule.create({
      data: {
        shippingZoneId: zoneId,
        name: data.name,
        description: data.description,
        carrier: data.carrier,
        serviceCode: data.serviceCode,
        type: data.type,
        baseRate: new Decimal(data.baseRate),
        perItemRate: data.perItemRate ? new Decimal(data.perItemRate) : null,
        perWeightUnitRate: data.perWeightUnitRate ? new Decimal(data.perWeightUnitRate) : null,
        weightUnit: data.weightUnit || 'lb',
        freeShippingThreshold: data.freeShippingThreshold
          ? new Decimal(data.freeShippingThreshold)
          : null,
        minWeight: data.minWeight ? new Decimal(data.minWeight) : null,
        maxWeight: data.maxWeight ? new Decimal(data.maxWeight) : null,
        minOrderTotal: data.minOrderTotal ? new Decimal(data.minOrderTotal) : null,
        maxOrderTotal: data.maxOrderTotal ? new Decimal(data.maxOrderTotal) : null,
        estimatedDaysMin: data.estimatedDaysMin,
        estimatedDaysMax: data.estimatedDaysMax,
        sortOrder: data.sortOrder || 0,
      },
    });
  }

  /**
   * Calculate shipping options for a cart
   */
  async calculateShipping(input: ShippingEstimateInput): Promise<ShippingEstimateResult> {
    const { companyId, country, state, zipCode, cartSubtotal, cartItems, hasFreeShippingPromotion } = input;

    // Find applicable shipping zone
    const zone = await this.findApplicableZone(companyId, country, state, zipCode);

    if (!zone) {
      this.logger.warn(`No shipping zone found for ${country}/${state || 'N/A'}/${zipCode || 'N/A'}`);
      return {
        options: [],
        cheapestOption: null,
        fastestOption: null,
        freeShippingThreshold: null,
        amountToFreeShipping: null,
      };
    }

    // Get active rules for the zone
    const rules = await this.prisma.shippingRule.findMany({
      where: {
        shippingZoneId: zone.id,
        isActive: true,
      },
      orderBy: { sortOrder: 'asc' },
    });

    // Calculate total weight
    const totalWeight = cartItems.reduce(
      (sum, item) => sum.plus(item.weight?.times(item.quantity) || new Decimal(0)),
      new Decimal(0),
    );

    // Calculate total quantity
    const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    // Calculate shipping for each rule
    const options: ShippingOption[] = [];
    let lowestFreeShippingThreshold: Decimal | null = null;

    for (const rule of rules) {
      // Check weight limits
      if (rule.minWeight && totalWeight.lessThan(rule.minWeight)) continue;
      if (rule.maxWeight && totalWeight.greaterThan(rule.maxWeight)) continue;

      // Check order total limits
      if (rule.minOrderTotal && cartSubtotal.lessThan(rule.minOrderTotal)) continue;
      if (rule.maxOrderTotal && cartSubtotal.greaterThan(rule.maxOrderTotal)) continue;

      // Calculate rate
      const rate = this.calculateRuleRate(rule, cartSubtotal, totalQuantity, totalWeight);

      // Check for free shipping
      let isFree = false;
      let freeShippingReason: string | undefined;

      if (hasFreeShippingPromotion) {
        isFree = true;
        freeShippingReason = 'Free shipping promotion applied';
      } else if (rule.type === ShippingRuleType.FREE) {
        isFree = true;
        freeShippingReason = 'Free shipping included';
      } else if (rule.freeShippingThreshold && cartSubtotal.greaterThanOrEqualTo(rule.freeShippingThreshold)) {
        isFree = true;
        freeShippingReason = `Free shipping on orders over $${rule.freeShippingThreshold.toFixed(2)}`;
      }

      // Track lowest free shipping threshold
      if (rule.freeShippingThreshold) {
        if (!lowestFreeShippingThreshold || rule.freeShippingThreshold.lessThan(lowestFreeShippingThreshold)) {
          lowestFreeShippingThreshold = rule.freeShippingThreshold;
        }
      }

      options.push({
        id: rule.id,
        name: rule.name,
        description: rule.description,
        carrier: rule.carrier,
        serviceCode: rule.serviceCode,
        rate: isFree ? new Decimal(0) : rate,
        estimatedDaysMin: rule.estimatedDaysMin,
        estimatedDaysMax: rule.estimatedDaysMax,
        isFree,
        freeShippingReason,
      });
    }

    // Find cheapest and fastest options
    const cheapestOption = options.length > 0
      ? options.reduce((min, opt) => opt.rate.lessThan(min.rate) ? opt : min)
      : null;

    const fastestOption = options.length > 0
      ? options
          .filter((opt) => opt.estimatedDaysMin !== null)
          .reduce((min, opt) =>
            (opt.estimatedDaysMin || 999) < (min.estimatedDaysMin || 999) ? opt : min,
            options[0],
          )
      : null;

    // Calculate amount to free shipping
    const amountToFreeShipping = lowestFreeShippingThreshold
      ? Decimal.max(lowestFreeShippingThreshold.minus(cartSubtotal), new Decimal(0))
      : null;

    this.logger.debug(
      `Shipping calculated for ${country}/${state || 'N/A'}: ${options.length} options, ` +
      `cheapest: $${cheapestOption?.rate.toFixed(2) || 'N/A'}`,
    );

    return {
      options,
      cheapestOption,
      fastestOption,
      freeShippingThreshold: lowestFreeShippingThreshold,
      amountToFreeShipping,
    };
  }

  /**
   * Calculate rate for a shipping rule
   */
  private calculateRuleRate(
    rule: {
      type: ShippingRuleType;
      baseRate: Decimal;
      perItemRate: Decimal | null;
      perWeightUnitRate: Decimal | null;
    },
    cartSubtotal: Decimal,
    totalQuantity: number,
    totalWeight: Decimal,
  ): Decimal {
    let rate = rule.baseRate;

    switch (rule.type) {
      case ShippingRuleType.FLAT_RATE:
        // Just the base rate
        break;

      case ShippingRuleType.PER_ITEM:
        if (rule.perItemRate) {
          rate = rate.plus(rule.perItemRate.times(totalQuantity));
        }
        break;

      case ShippingRuleType.WEIGHT_BASED:
        if (rule.perWeightUnitRate && !totalWeight.isZero()) {
          rate = rate.plus(rule.perWeightUnitRate.times(totalWeight));
        }
        break;

      case ShippingRuleType.PRICE_BASED:
        // Base rate might vary by price tier (simplified)
        break;

      case ShippingRuleType.FREE:
        rate = new Decimal(0);
        break;

      case ShippingRuleType.CALCULATED:
        // Would call carrier API (future feature)
        break;
    }

    return rate;
  }

  /**
   * Find the most applicable shipping zone for a location
   */
  private async findApplicableZone(
    companyId: string,
    country: string,
    state?: string,
    zipCode?: string,
  ) {
    const zones = await this.prisma.shippingZone.findMany({
      where: {
        companyId,
        isActive: true,
      },
      orderBy: { priority: 'desc' },
    });

    // Find best matching zone (most specific first)
    for (const zone of zones) {
      // Check country
      if (!zone.countries.includes(country.toUpperCase())) {
        continue;
      }

      // Check state if specified
      if (zone.states.length > 0) {
        const stateWithCountry = state ? `${country.toUpperCase()}-${state.toUpperCase()}` : null;
        if (!stateWithCountry || !zone.states.includes(stateWithCountry)) {
          continue;
        }
      }

      // Check zip code patterns if specified
      if (zone.zipCodes.length > 0 && zipCode) {
        // Escape special regex characters to prevent ReDoS attacks, then convert * to .*
        const escapeRegex = (str: string) => str.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
        const matches = zone.zipCodes.some((pattern) => {
          const escapedPattern = escapeRegex(pattern).replace(/\*/g, '.*');
          const regex = new RegExp(`^${escapedPattern}$`);
          return regex.test(zipCode);
        });
        if (!matches) {
          continue;
        }
      }

      return zone;
    }

    // Return zone matching country only (least specific)
    return zones.find((zone) =>
      zone.countries.includes(country.toUpperCase()) &&
      zone.states.length === 0 &&
      zone.zipCodes.length === 0,
    );
  }

  /**
   * Get shipping zones for a company
   */
  async getShippingZones(companyId: string, options?: { isActive?: boolean }) {
    const where: Prisma.ShippingZoneWhereInput = { companyId };

    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    return this.prisma.shippingZone.findMany({
      where,
      include: {
        rules: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { priority: 'desc' },
    });
  }

  /**
   * Get a single shipping zone by ID
   */
  async getShippingZoneById(id: string, companyId: string) {
    const zone = await this.prisma.shippingZone.findFirst({
      where: { id, companyId },
      include: {
        rules: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!zone) {
      throw new NotFoundException('We couldn\'t find that shipping zone. It may have been removed.');
    }

    return zone;
  }

  /**
   * Update a shipping zone
   */
  async updateShippingZone(
    id: string,
    companyId: string,
    data: Partial<{
      name: string;
      description: string;
      countries: string[];
      states: string[];
      zipCodes: string[];
      priority: number;
      isActive: boolean;
    }>,
  ) {
    const zone = await this.prisma.shippingZone.findFirst({
      where: { id, companyId },
    });

    if (!zone) {
      throw new NotFoundException('We couldn\'t find that shipping zone. It may have been removed.');
    }

    return this.prisma.shippingZone.update({
      where: { id },
      data: {
        ...data,
        countries: data.countries?.map((c) => c.toUpperCase()),
        states: data.states?.map((s) => s.toUpperCase()),
      },
      include: { rules: true },
    });
  }

  /**
   * Update a shipping rule
   */
  async updateShippingRule(
    ruleId: string,
    companyId: string,
    data: Partial<CreateShippingRuleInput & { isActive: boolean }>,
  ) {
    // Verify the rule belongs to a zone owned by this company
    const rule = await this.prisma.shippingRule.findFirst({
      where: { id: ruleId },
      include: { zone: true },
    });

    if (!rule || rule.zone.companyId !== companyId) {
      throw new NotFoundException('We couldn\'t find that shipping rule. It may have been removed.');
    }

    return this.prisma.shippingRule.update({
      where: { id: ruleId },
      data: {
        ...data,
        baseRate: data.baseRate !== undefined ? new Decimal(data.baseRate) : undefined,
        perItemRate: data.perItemRate !== undefined ? new Decimal(data.perItemRate) : undefined,
        perWeightUnitRate: data.perWeightUnitRate !== undefined
          ? new Decimal(data.perWeightUnitRate)
          : undefined,
        freeShippingThreshold: data.freeShippingThreshold !== undefined
          ? new Decimal(data.freeShippingThreshold)
          : undefined,
        minWeight: data.minWeight !== undefined ? new Decimal(data.minWeight) : undefined,
        maxWeight: data.maxWeight !== undefined ? new Decimal(data.maxWeight) : undefined,
        minOrderTotal: data.minOrderTotal !== undefined ? new Decimal(data.minOrderTotal) : undefined,
        maxOrderTotal: data.maxOrderTotal !== undefined ? new Decimal(data.maxOrderTotal) : undefined,
      },
    });
  }

  /**
   * Delete a shipping zone and its rules
   */
  async deleteShippingZone(id: string, companyId: string): Promise<void> {
    const zone = await this.prisma.shippingZone.findFirst({
      where: { id, companyId },
    });

    if (!zone) {
      throw new NotFoundException('We couldn\'t find that shipping zone. It may have been removed.');
    }

    // Cascade delete rules
    await this.prisma.shippingZone.delete({
      where: { id },
    });
  }

  /**
   * Delete a shipping rule
   */
  async deleteShippingRule(ruleId: string, companyId: string): Promise<void> {
    const rule = await this.prisma.shippingRule.findFirst({
      where: { id: ruleId },
      include: { zone: true },
    });

    if (!rule || rule.zone.companyId !== companyId) {
      throw new NotFoundException('We couldn\'t find that shipping rule. It may have been removed.');
    }

    await this.prisma.shippingRule.delete({
      where: { id: ruleId },
    });
  }

  /**
   * Seed default shipping zones for a company
   */
  async seedDefaultShippingZones(companyId: string): Promise<void> {
    // Create US domestic zone
    const usZone = await this.prisma.shippingZone.create({
      data: {
        companyId,
        name: 'United States',
        description: 'Domestic US shipping',
        countries: ['US'],
        states: [],
        zipCodes: [],
        priority: 10,
      },
    });

    // Add default US shipping rules
    await this.prisma.shippingRule.createMany({
      data: [
        {
          shippingZoneId: usZone.id,
          name: 'Standard Shipping',
          description: 'Delivered in 5-7 business days',
          carrier: 'USPS',
          serviceCode: 'USPS_GROUND_ADVANTAGE',
          type: ShippingRuleType.FLAT_RATE,
          baseRate: new Decimal(5.99),
          freeShippingThreshold: new Decimal(50),
          estimatedDaysMin: 5,
          estimatedDaysMax: 7,
          sortOrder: 1,
        },
        {
          shippingZoneId: usZone.id,
          name: 'Express Shipping',
          description: 'Delivered in 2-3 business days',
          carrier: 'USPS',
          serviceCode: 'USPS_PRIORITY',
          type: ShippingRuleType.FLAT_RATE,
          baseRate: new Decimal(12.99),
          estimatedDaysMin: 2,
          estimatedDaysMax: 3,
          sortOrder: 2,
        },
        {
          shippingZoneId: usZone.id,
          name: 'Overnight Shipping',
          description: 'Delivered next business day',
          carrier: 'USPS',
          serviceCode: 'USPS_EXPRESS',
          type: ShippingRuleType.FLAT_RATE,
          baseRate: new Decimal(24.99),
          estimatedDaysMin: 1,
          estimatedDaysMax: 1,
          sortOrder: 3,
        },
      ],
    });

    // Create international zone
    const intlZone = await this.prisma.shippingZone.create({
      data: {
        companyId,
        name: 'International',
        description: 'International shipping',
        countries: ['CA', 'MX', 'GB', 'DE', 'FR', 'AU', 'JP'],
        states: [],
        zipCodes: [],
        priority: 5,
      },
    });

    // Add default international shipping rules
    await this.prisma.shippingRule.createMany({
      data: [
        {
          shippingZoneId: intlZone.id,
          name: 'International Standard',
          description: 'Delivered in 10-20 business days',
          carrier: 'USPS',
          serviceCode: 'USPS_FIRST_CLASS_INTERNATIONAL',
          type: ShippingRuleType.FLAT_RATE,
          baseRate: new Decimal(19.99),
          estimatedDaysMin: 10,
          estimatedDaysMax: 20,
          sortOrder: 1,
        },
        {
          shippingZoneId: intlZone.id,
          name: 'International Express',
          description: 'Delivered in 5-10 business days',
          carrier: 'USPS',
          serviceCode: 'USPS_PRIORITY_INTERNATIONAL',
          type: ShippingRuleType.FLAT_RATE,
          baseRate: new Decimal(39.99),
          estimatedDaysMin: 5,
          estimatedDaysMax: 10,
          sortOrder: 2,
        },
      ],
    });

    this.logger.log(`Seeded default shipping zones for company ${companyId}`);
  }
}
