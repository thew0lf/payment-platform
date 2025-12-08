import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface ShippingMethod {
  id: string;
  name: string;
  carrier: string;
  estimatedDays: { min: number; max: number };
  baseCost: number;
  perItemCost: number;
  freeShippingThreshold: number | null;
  isActive: boolean;
}

export interface ShippingZone {
  id: string;
  name: string;
  countries: string[];
  states: string[];
  postalCodes: string[];
  methods: ShippingMethod[];
}

export interface ShippingSettings {
  defaultCurrency: string;
  weightUnit: 'oz' | 'lb' | 'g' | 'kg';
  dimensionUnit: 'in' | 'cm';
  handlingFee: number;
  zones: ShippingZone[];
}

export interface CompanySettings {
  shipping?: ShippingSettings;
  [key: string]: unknown;
}

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all settings for a company
   */
  async getSettings(companyId: string): Promise<CompanySettings> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { settings: true },
    });

    if (!company) {
      throw new NotFoundException(`Company with id "${companyId}" not found`);
    }

    return (company.settings as CompanySettings) || {};
  }

  /**
   * Get shipping settings for a company
   */
  async getShippingSettings(companyId: string): Promise<ShippingSettings | null> {
    const settings = await this.getSettings(companyId);
    return settings.shipping || null;
  }

  /**
   * Update shipping settings for a company
   */
  async updateShippingSettings(companyId: string, shipping: ShippingSettings): Promise<ShippingSettings> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { settings: true },
    });

    if (!company) {
      throw new NotFoundException(`Company with id "${companyId}" not found`);
    }

    const currentSettings = (company.settings as CompanySettings) || {};
    const newSettings = {
      ...currentSettings,
      shipping,
    };

    await this.prisma.company.update({
      where: { id: companyId },
      data: { settings: newSettings as unknown as Prisma.InputJsonValue },
    });

    return shipping;
  }

  /**
   * Calculate shipping cost based on settings
   */
  calculateShippingCost(
    settings: ShippingSettings,
    destination: { country: string; state?: string; postalCode?: string },
    orderTotal: number,
    itemCount: number = 1,
  ): { methods: Array<ShippingMethod & { calculatedCost: number }> } | null {
    // Find matching zone
    const zone = settings.zones.find((z) => {
      if (z.countries.length > 0 && !z.countries.includes(destination.country)) {
        return false;
      }
      if (z.states.length > 0 && destination.state && !z.states.includes(destination.state)) {
        return false;
      }
      return true;
    });

    if (!zone) {
      return null;
    }

    // Calculate costs for active methods
    const methods = zone.methods
      .filter((m) => m.isActive)
      .map((method) => {
        let calculatedCost = method.baseCost + method.perItemCost * itemCount + settings.handlingFee;

        // Apply free shipping if threshold met
        if (method.freeShippingThreshold && orderTotal >= method.freeShippingThreshold) {
          calculatedCost = 0;
        }

        return {
          ...method,
          calculatedCost,
        };
      });

    return { methods };
  }
}
