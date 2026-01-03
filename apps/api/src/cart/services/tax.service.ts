import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TaxType, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export interface TaxCalculationInput {
  companyId: string;
  country: string;
  state?: string;
  city?: string;
  zipCode?: string;
  lineItems: {
    productId: string;
    categoryId?: string;
    quantity: number;
    lineTotal: Decimal;
    isTaxable?: boolean;
  }[];
}

export interface TaxBreakdown {
  taxRateId: string;
  name: string;
  taxType: TaxType;
  rate: Decimal;
  taxableAmount: Decimal;
  taxAmount: Decimal;
}

export interface TaxCalculationResult {
  totalTax: Decimal;
  breakdown: TaxBreakdown[];
  taxableSubtotal: Decimal;
  effectiveRate: Decimal;
}

export interface CreateTaxRateInput {
  country: string;
  state?: string;
  city?: string;
  zipCode?: string;
  taxType: TaxType;
  name: string;
  rate: number; // As percentage (e.g., 7.25 for 7.25%)
  isCompound?: boolean;
  priority?: number;
  exemptCategories?: string[];
}

@Injectable()
export class TaxService {
  private readonly logger = new Logger(TaxService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new tax rate
   */
  async createTaxRate(companyId: string, data: CreateTaxRateInput) {
    return this.prisma.taxRate.create({
      data: {
        companyId,
        country: data.country.toUpperCase(),
        state: data.state?.toUpperCase(),
        city: data.city,
        zipCode: data.zipCode,
        taxType: data.taxType,
        name: data.name,
        rate: new Decimal(data.rate / 100), // Convert percentage to decimal
        isCompound: data.isCompound || false,
        priority: data.priority || 0,
        exemptCategories: data.exemptCategories || [],
      },
    });
  }

  /**
   * Calculate taxes for cart items based on shipping address
   */
  async calculateTax(input: TaxCalculationInput): Promise<TaxCalculationResult> {
    const { companyId, country, state, city, zipCode, lineItems } = input;

    // Find applicable tax rates (most specific first)
    const taxRates = await this.findApplicableTaxRates(companyId, country, state, city, zipCode);

    if (taxRates.length === 0) {
      return {
        totalTax: new Decimal(0),
        breakdown: [],
        taxableSubtotal: new Decimal(0),
        effectiveRate: new Decimal(0),
      };
    }

    // Calculate taxable amount (exclude exempt categories)
    let taxableSubtotal = new Decimal(0);
    const taxableItems: typeof lineItems = [];

    for (const item of lineItems) {
      if (item.isTaxable === false) {
        continue;
      }

      // Check if item's category is exempt from any tax
      const isExempt = taxRates.some((rate) => {
        const exemptCategories = rate.exemptCategories as string[];
        return item.categoryId && exemptCategories.includes(item.categoryId);
      });

      if (!isExempt) {
        taxableSubtotal = taxableSubtotal.plus(item.lineTotal);
        taxableItems.push(item);
      }
    }

    // Calculate tax for each rate
    const breakdown: TaxBreakdown[] = [];
    let totalTax = new Decimal(0);
    let runningTaxableAmount = taxableSubtotal;

    // Sort by priority (compound taxes calculated later)
    const sortedRates = [...taxRates].sort((a, b) => {
      if (a.isCompound !== b.isCompound) {
        return a.isCompound ? 1 : -1;
      }
      return a.priority - b.priority;
    });

    for (const rate of sortedRates) {
      const taxableAmount = rate.isCompound
        ? runningTaxableAmount.plus(totalTax) // Compound: tax on tax
        : taxableSubtotal;

      const taxAmount = taxableAmount.times(rate.rate);

      breakdown.push({
        taxRateId: rate.id,
        name: rate.name,
        taxType: rate.taxType,
        rate: rate.rate,
        taxableAmount,
        taxAmount,
      });

      totalTax = totalTax.plus(taxAmount);
    }

    // Calculate effective rate
    const effectiveRate = taxableSubtotal.isZero()
      ? new Decimal(0)
      : totalTax.dividedBy(taxableSubtotal);

    this.logger.debug(
      `Tax calculated for ${country}/${state || 'N/A'}: $${totalTax.toFixed(2)} ` +
      `(${effectiveRate.times(100).toFixed(2)}% effective rate)`,
    );

    return {
      totalTax,
      breakdown,
      taxableSubtotal,
      effectiveRate,
    };
  }

  /**
   * Find applicable tax rates for a location
   * Returns rates from most specific to least specific
   */
  private async findApplicableTaxRates(
    companyId: string,
    country: string,
    state?: string,
    city?: string,
    zipCode?: string,
  ) {
    const conditions: Prisma.TaxRateWhereInput[] = [];

    // Build conditions from most specific to least specific
    if (zipCode) {
      conditions.push({
        companyId,
        country: country.toUpperCase(),
        state: state?.toUpperCase(),
        zipCode,
        isActive: true,
      });
    }

    if (city && state) {
      conditions.push({
        companyId,
        country: country.toUpperCase(),
        state: state.toUpperCase(),
        city,
        zipCode: null,
        isActive: true,
      });
    }

    if (state) {
      conditions.push({
        companyId,
        country: country.toUpperCase(),
        state: state.toUpperCase(),
        city: null,
        zipCode: null,
        isActive: true,
      });
    }

    // Country-level
    conditions.push({
      companyId,
      country: country.toUpperCase(),
      state: null,
      city: null,
      zipCode: null,
      isActive: true,
    });

    // Query all potential rates
    const allRates = await this.prisma.taxRate.findMany({
      where: {
        companyId,
        country: country.toUpperCase(),
        isActive: true,
      },
      orderBy: [{ priority: 'desc' }],
    });

    // Filter to most specific match
    // For zip code pattern matching (e.g., "902*")
    const matchingRates = allRates.filter((rate) => {
      // Check zip code pattern
      if (rate.zipCode && zipCode) {
        // Escape special regex characters to prevent ReDoS attacks, then convert * to .*
        const escapeRegex = (str: string) => str.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
        const pattern = escapeRegex(rate.zipCode).replace(/\*/g, '.*');
        const regex = new RegExp(`^${pattern}$`);
        if (!regex.test(zipCode)) {
          return false;
        }
      } else if (rate.zipCode && !zipCode) {
        return false;
      }

      // Check city
      if (rate.city && city) {
        if (rate.city.toLowerCase() !== city.toLowerCase()) {
          return false;
        }
      } else if (rate.city && !city) {
        return false;
      }

      // Check state
      if (rate.state && state) {
        if (rate.state.toUpperCase() !== state.toUpperCase()) {
          return false;
        }
      } else if (rate.state && !state) {
        return false;
      }

      return true;
    });

    // If we have specific rates, filter out less specific ones
    // unless they are compound taxes (which stack)
    const hasZipRate = matchingRates.some((r) => r.zipCode);
    const hasCityRate = matchingRates.some((r) => r.city);
    const hasStateRate = matchingRates.some((r) => r.state);

    return matchingRates.filter((rate) => {
      // Always include compound taxes
      if (rate.isCompound) return true;

      // Use most specific non-compound rate
      if (hasZipRate && !rate.zipCode) return false;
      if (hasCityRate && !hasZipRate && !rate.city) return false;
      if (hasStateRate && !hasCityRate && !hasZipRate && !rate.state) return false;

      return true;
    });
  }

  /**
   * Get tax rates for a company
   */
  async getTaxRates(
    companyId: string,
    options?: {
      country?: string;
      state?: string;
      isActive?: boolean;
    },
  ) {
    const where: Prisma.TaxRateWhereInput = { companyId };

    if (options?.country) {
      where.country = options.country.toUpperCase();
    }
    if (options?.state) {
      where.state = options.state.toUpperCase();
    }
    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    return this.prisma.taxRate.findMany({
      where,
      orderBy: [{ country: 'asc' }, { state: 'asc' }, { priority: 'desc' }],
    });
  }

  /**
   * Get a single tax rate by ID
   */
  async getTaxRateById(id: string, companyId: string) {
    const taxRate = await this.prisma.taxRate.findFirst({
      where: { id, companyId },
    });

    if (!taxRate) {
      throw new NotFoundException('Tax rate not found');
    }

    return taxRate;
  }

  /**
   * Update a tax rate
   */
  async updateTaxRate(
    id: string,
    companyId: string,
    data: Partial<{
      name: string;
      rate: number;
      isCompound: boolean;
      priority: number;
      exemptCategories: string[];
      isActive: boolean;
    }>,
  ) {
    const taxRate = await this.prisma.taxRate.findFirst({
      where: { id, companyId },
    });

    if (!taxRate) {
      throw new NotFoundException('Tax rate not found');
    }

    return this.prisma.taxRate.update({
      where: { id },
      data: {
        ...data,
        rate: data.rate !== undefined ? new Decimal(data.rate / 100) : undefined,
      },
    });
  }

  /**
   * Delete a tax rate
   */
  async deleteTaxRate(id: string, companyId: string): Promise<void> {
    const taxRate = await this.prisma.taxRate.findFirst({
      where: { id, companyId },
    });

    if (!taxRate) {
      throw new NotFoundException('Tax rate not found');
    }

    await this.prisma.taxRate.delete({
      where: { id },
    });
  }

  /**
   * Seed default US tax rates for a company
   */
  async seedDefaultUSTaxRates(companyId: string): Promise<void> {
    const defaultRates = [
      { state: 'CA', name: 'California State Tax', rate: 7.25 },
      { state: 'NY', name: 'New York State Tax', rate: 4.0 },
      { state: 'TX', name: 'Texas State Tax', rate: 6.25 },
      { state: 'FL', name: 'Florida State Tax', rate: 6.0 },
      { state: 'WA', name: 'Washington State Tax', rate: 6.5 },
      { state: 'OR', name: 'Oregon (No Sales Tax)', rate: 0.0 },
      { state: 'MT', name: 'Montana (No Sales Tax)', rate: 0.0 },
      { state: 'NH', name: 'New Hampshire (No Sales Tax)', rate: 0.0 },
      { state: 'DE', name: 'Delaware (No Sales Tax)', rate: 0.0 },
    ];

    for (const rate of defaultRates) {
      // Check if tax rate already exists for this company/country/state
      const existing = await this.prisma.taxRate.findFirst({
        where: {
          companyId,
          country: 'US',
          state: rate.state,
          city: null,
          zipCode: null,
        },
      });

      if (!existing) {
        await this.prisma.taxRate.create({
          data: {
            companyId,
            country: 'US',
            state: rate.state,
            taxType: TaxType.SALES_TAX,
            name: rate.name,
            rate: new Decimal(rate.rate / 100),
          },
        });
      }
    }
  }

  /**
   * Get tax summary for reporting
   */
  async getTaxSummary(
    companyId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalTaxCollected: Decimal;
    byState: { state: string; amount: Decimal }[];
    byType: { type: TaxType; amount: Decimal }[];
  }> {
    // This would query order/invoice data to summarize taxes collected
    // Placeholder implementation
    return {
      totalTaxCollected: new Decimal(0),
      byState: [],
      byType: [],
    };
  }
}
