import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateDTRDto,
  UpdateDTRDto,
  DTRSummary,
  DTRDetail,
  DTRTarget,
  DTRValueMapping,
} from '../types/ab-testing.types';

@Injectable()
export class DynamicTextService {
  private readonly logger = new Logger(DynamicTextService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════════
  // DYNAMIC TEXT RULE CRUD
  // ═══════════════════════════════════════════════════════════════

  async findAll(companyId: string, landingPageId?: string): Promise<DTRSummary[]> {
    const where: any = { companyId };
    if (landingPageId) {
      where.landingPageId = landingPageId;
    }

    const rules = await this.prisma.dynamicTextRule.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return rules.map(rule => ({
      id: rule.id,
      name: rule.name,
      parameterName: rule.parameterName,
      defaultValue: rule.defaultValue,
      enabled: rule.enabled,
      targetCount: (rule.targets as unknown as DTRTarget[]).length,
      createdAt: rule.createdAt,
    }));
  }

  async findOne(companyId: string, ruleId: string): Promise<DTRDetail> {
    const rule = await this.prisma.dynamicTextRule.findFirst({
      where: { id: ruleId, companyId },
    });

    if (!rule) {
      throw new NotFoundException('Dynamic text rule not found');
    }

    return this.mapToDetail(rule);
  }

  async create(
    companyId: string,
    landingPageId: string,
    dto: CreateDTRDto,
  ): Promise<DTRDetail> {
    // Verify landing page exists and belongs to company
    const page = await this.prisma.landingPage.findFirst({
      where: { id: landingPageId, companyId },
    });

    if (!page) {
      throw new NotFoundException('Landing page not found');
    }

    const rule = await this.prisma.dynamicTextRule.create({
      data: {
        companyId,
        landingPageId,
        name: dto.name,
        parameterName: dto.parameterName,
        defaultValue: dto.defaultValue,
        targets: dto.targets as any,
        valueMappings: dto.valueMappings as any,
      },
    });

    return this.mapToDetail(rule);
  }

  async update(companyId: string, ruleId: string, dto: UpdateDTRDto): Promise<DTRDetail> {
    const rule = await this.prisma.dynamicTextRule.findFirst({
      where: { id: ruleId, companyId },
    });

    if (!rule) {
      throw new NotFoundException('Dynamic text rule not found');
    }

    const updated = await this.prisma.dynamicTextRule.update({
      where: { id: ruleId },
      data: {
        name: dto.name,
        enabled: dto.enabled,
        parameterName: dto.parameterName,
        defaultValue: dto.defaultValue,
        targets: dto.targets as any,
        valueMappings: dto.valueMappings as any,
      },
    });

    return this.mapToDetail(updated);
  }

  async delete(companyId: string, ruleId: string): Promise<void> {
    const rule = await this.prisma.dynamicTextRule.findFirst({
      where: { id: ruleId, companyId },
    });

    if (!rule) {
      throw new NotFoundException('Dynamic text rule not found');
    }

    await this.prisma.dynamicTextRule.delete({
      where: { id: ruleId },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // RUNTIME TEXT REPLACEMENT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get active dynamic text rules for a landing page
   */
  async getActiveRules(landingPageId: string): Promise<DTRDetail[]> {
    const rules = await this.prisma.dynamicTextRule.findMany({
      where: {
        landingPageId,
        enabled: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return rules.map(rule => this.mapToDetail(rule));
  }

  /**
   * Process URL parameters and return text replacements
   * Used by the frontend to apply dynamic text
   */
  processReplacements(
    rules: DTRDetail[],
    urlParams: Record<string, string>,
  ): Map<string, { target: DTRTarget; value: string }[]> {
    const replacements = new Map<string, { target: DTRTarget; value: string }[]>();

    for (const rule of rules) {
      const paramValue = urlParams[rule.parameterName];
      let textValue: string;

      if (paramValue) {
        // Check if there's a value mapping
        if (rule.valueMappings && rule.valueMappings[paramValue]) {
          textValue = rule.valueMappings[paramValue];
        } else {
          // Use the raw parameter value (optionally format it)
          textValue = this.formatValue(paramValue);
        }
      } else {
        // Use default value
        textValue = rule.defaultValue;
      }

      // Group replacements by rule
      const ruleReplacements = rule.targets.map(target => ({
        target,
        value: textValue,
      }));

      replacements.set(rule.id, ruleReplacements);
    }

    return replacements;
  }

  /**
   * Generate JavaScript code for client-side dynamic text replacement
   * This can be injected into the landing page
   */
  generateClientScript(rules: DTRDetail[]): string {
    if (rules.length === 0) return '';

    const rulesJson = JSON.stringify(rules.map(r => ({
      parameterName: r.parameterName,
      defaultValue: r.defaultValue,
      targets: r.targets,
      valueMappings: r.valueMappings || {},
    })));

    return `
(function() {
  const rules = ${rulesJson};
  const params = new URLSearchParams(window.location.search);

  rules.forEach(function(rule) {
    let value = params.get(rule.parameterName);

    if (value && rule.valueMappings[value]) {
      value = rule.valueMappings[value];
    } else if (!value) {
      value = rule.defaultValue;
    } else {
      // Format: replace hyphens/underscores with spaces, title case
      value = value.replace(/[-_]/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase());
    }

    rule.targets.forEach(function(target) {
      if (target.selector) {
        document.querySelectorAll(target.selector).forEach(function(el) {
          if (target.field === 'text' || target.field === 'textContent') {
            el.textContent = value;
          } else if (target.field === 'innerHTML') {
            el.innerHTML = value;
          } else if (target.field === 'value') {
            el.value = value;
          } else {
            el.setAttribute(target.field, value);
          }
        });
      }
    });
  });
})();
`.trim();
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Format a URL parameter value for display
   * e.g., "new-york" -> "New York"
   */
  private formatValue(value: string): string {
    return value
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  private mapToDetail(rule: any): DTRDetail {
    return {
      id: rule.id,
      landingPageId: rule.landingPageId,
      companyId: rule.companyId,
      name: rule.name,
      enabled: rule.enabled,
      parameterName: rule.parameterName,
      defaultValue: rule.defaultValue,
      targets: rule.targets as unknown as DTRTarget[],
      valueMappings: (rule.valueMappings as unknown as DTRValueMapping) || undefined,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    };
  }
}
