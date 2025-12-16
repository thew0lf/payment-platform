/**
 * Funnel Pricing Service
 *
 * Calculates shipping costs and sales tax for funnel checkouts.
 * For alpha launch - simplified US-only calculations.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface ShippingAddress {
  state: string;
  postalCode: string;
  country: string;
}

export interface ShippingCalculationResult {
  shippingAmount: number;
  carrier: string;
  estimatedDays: number;
  method: string;
}

export interface TaxCalculationResult {
  taxAmount: number;
  taxRate: number;
  taxJurisdiction: string;
}

export interface PricingCalculationResult {
  subtotal: number;
  shipping: ShippingCalculationResult;
  tax: TaxCalculationResult;
  total: number;
}

// US State Sales Tax Rates (simplified - actual rates vary by locality)
const US_STATE_TAX_RATES: Record<string, number> = {
  AL: 0.04,
  AK: 0.00, // No state sales tax
  AZ: 0.056,
  AR: 0.065,
  CA: 0.0725,
  CO: 0.029,
  CT: 0.0635,
  DE: 0.00, // No state sales tax
  FL: 0.06,
  GA: 0.04,
  HI: 0.04,
  ID: 0.06,
  IL: 0.0625,
  IN: 0.07,
  IA: 0.06,
  KS: 0.065,
  KY: 0.06,
  LA: 0.0445,
  ME: 0.055,
  MD: 0.06,
  MA: 0.0625,
  MI: 0.06,
  MN: 0.06875,
  MS: 0.07,
  MO: 0.04225,
  MT: 0.00, // No state sales tax
  NE: 0.055,
  NV: 0.0685,
  NH: 0.00, // No state sales tax
  NJ: 0.06625,
  NM: 0.05125,
  NY: 0.04,
  NC: 0.0475,
  ND: 0.05,
  OH: 0.0575,
  OK: 0.045,
  OR: 0.00, // No state sales tax
  PA: 0.06,
  RI: 0.07,
  SC: 0.06,
  SD: 0.045,
  TN: 0.07,
  TX: 0.0625,
  UT: 0.0485,
  VT: 0.06,
  VA: 0.053,
  WA: 0.065,
  WV: 0.06,
  WI: 0.05,
  WY: 0.04,
  DC: 0.06,
  PR: 0.105, // Puerto Rico
};

// Shipping base rates by zone
const SHIPPING_ZONES = {
  REMOTE: ['AK', 'HI', 'PR', 'GU', 'VI'], // Alaska, Hawaii, territories
  WEST: ['WA', 'OR', 'CA', 'NV', 'AZ', 'UT', 'ID', 'MT', 'WY', 'CO', 'NM'],
  CENTRAL: ['ND', 'SD', 'NE', 'KS', 'MN', 'IA', 'MO', 'WI', 'IL', 'MI', 'IN', 'OH', 'OK', 'TX', 'AR', 'LA'],
  EAST: ['ME', 'NH', 'VT', 'MA', 'RI', 'CT', 'NY', 'NJ', 'PA', 'DE', 'MD', 'DC', 'VA', 'WV', 'NC', 'SC', 'GA', 'FL', 'AL', 'MS', 'TN', 'KY'],
};

@Injectable()
export class FunnelPricingService {
  private readonly logger = new Logger(FunnelPricingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate shipping cost based on products and destination
   */
  async calculateShipping(
    productIds: string[],
    quantities: number[],
    shippingAddress: ShippingAddress,
  ): Promise<ShippingCalculationResult> {
    // Get product weights
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, weight: true, weightUnit: true },
    });

    // Calculate total weight in ounces
    let totalWeightOz = 0;
    for (let i = 0; i < productIds.length; i++) {
      const product = products.find((p) => p.id === productIds[i]);
      if (product?.weight) {
        const weight = Number(product.weight);
        const quantity = quantities[i] || 1;

        // Convert to ounces
        let weightOz = weight;
        switch (product.weightUnit?.toLowerCase()) {
          case 'lb':
          case 'lbs':
            weightOz = weight * 16;
            break;
          case 'g':
          case 'gram':
          case 'grams':
            weightOz = weight * 0.035274;
            break;
          case 'kg':
          case 'kilogram':
          case 'kilograms':
            weightOz = weight * 35.274;
            break;
          // oz is default
        }
        totalWeightOz += weightOz * quantity;
      } else {
        // Default weight per item if not specified (assume 12 oz)
        totalWeightOz += 12 * (quantities[i] || 1);
      }
    }

    // Get zone multiplier
    const state = shippingAddress.state?.toUpperCase();
    const zoneMultiplier = this.getZoneMultiplier(state);

    // Calculate shipping cost
    // Base: $5.99 for first 16oz, $1.50 per additional 16oz
    const baseShipping = 5.99;
    const additionalWeight = Math.max(0, totalWeightOz - 16);
    const additionalCharges = Math.ceil(additionalWeight / 16) * 1.5;
    const shippingAmount = Number(((baseShipping + additionalCharges) * zoneMultiplier).toFixed(2));

    // Determine estimated delivery
    let estimatedDays = 5;
    let method = 'Standard Ground';
    const carrier = 'USPS';

    if (SHIPPING_ZONES.REMOTE.includes(state)) {
      estimatedDays = 10;
      method = 'Priority Mail';
    } else if (SHIPPING_ZONES.WEST.includes(state)) {
      estimatedDays = 5;
    } else if (SHIPPING_ZONES.CENTRAL.includes(state)) {
      estimatedDays = 4;
    } else {
      estimatedDays = 3;
    }

    this.logger.debug(
      `Shipping calculated: ${totalWeightOz}oz to ${state} = $${shippingAmount} (${estimatedDays} days)`,
    );

    return {
      shippingAmount,
      carrier,
      estimatedDays,
      method,
    };
  }

  /**
   * Calculate sales tax based on shipping address
   */
  calculateTax(
    subtotal: number,
    shippingAmount: number,
    shippingAddress: ShippingAddress,
  ): TaxCalculationResult {
    const state = shippingAddress.state?.toUpperCase();
    const country = shippingAddress.country?.toUpperCase() || 'US';

    // Only calculate tax for US addresses
    if (country !== 'US' && country !== 'USA') {
      return {
        taxAmount: 0,
        taxRate: 0,
        taxJurisdiction: 'International - No Tax',
      };
    }

    const taxRate = US_STATE_TAX_RATES[state] || 0;

    // Most states tax goods but not shipping (simplified)
    // Some states like TX, NM, NY tax shipping too
    const shippingTaxStates = ['TX', 'NM', 'NY', 'AR', 'HI', 'KS', 'NE'];
    const taxableAmount = shippingTaxStates.includes(state)
      ? subtotal + shippingAmount
      : subtotal;

    const taxAmount = Number((taxableAmount * taxRate).toFixed(2));

    this.logger.debug(
      `Tax calculated: $${taxableAmount} in ${state} @ ${(taxRate * 100).toFixed(2)}% = $${taxAmount}`,
    );

    return {
      taxAmount,
      taxRate,
      taxJurisdiction: state ? `${state}, US` : 'US',
    };
  }

  /**
   * Calculate complete pricing for funnel checkout
   */
  async calculatePricing(
    products: Array<{ productId: string; quantity: number; price: number }>,
    shippingAddress: ShippingAddress,
  ): Promise<PricingCalculationResult> {
    // Calculate subtotal
    const subtotal = products.reduce((sum, p) => sum + p.price * p.quantity, 0);

    // Calculate shipping
    const productIds = products.map((p) => p.productId);
    const quantities = products.map((p) => p.quantity);
    const shipping = await this.calculateShipping(productIds, quantities, shippingAddress);

    // Calculate tax
    const tax = this.calculateTax(subtotal, shipping.shippingAmount, shippingAddress);

    // Calculate total
    const total = Number((subtotal + shipping.shippingAmount + tax.taxAmount).toFixed(2));

    return {
      subtotal,
      shipping,
      tax,
      total,
    };
  }

  /**
   * Get zone multiplier for shipping
   */
  private getZoneMultiplier(state: string): number {
    if (SHIPPING_ZONES.REMOTE.includes(state)) {
      return 2.0; // Remote areas cost double
    }
    // All continental US has same base rate for simplicity
    return 1.0;
  }

  /**
   * Get free shipping threshold for company (future feature)
   */
  async getFreeShippingThreshold(companyId: string): Promise<number | null> {
    // Could be configured per company - for now return null (no free shipping)
    return null;
  }
}
