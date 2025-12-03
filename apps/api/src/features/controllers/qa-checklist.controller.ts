import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { QAChecklistService, STANDARD_QA_CHECKLIST } from '../services/qa-checklist.service';
import { QACheckCategory } from '../types/feature.types';

@Controller('qa-checklist')
@UseGuards(JwtAuthGuard)
export class QAChecklistController {
  constructor(private readonly qaChecklistService: QAChecklistService) {}

  /**
   * Get the standard QA checklist
   */
  @Get('standard')
  getStandardChecklist() {
    return {
      checklist: STANDARD_QA_CHECKLIST,
      categories: Object.values(QACheckCategory),
      totalChecks: STANDARD_QA_CHECKLIST.length,
    };
  }

  /**
   * Get checklist by category
   */
  @Get('category')
  getByCategory(@Query('category') category: QACheckCategory) {
    const checks = this.qaChecklistService.getChecklistByCategory(category);
    return {
      category,
      checks,
      totalChecks: checks.length,
    };
  }

  /**
   * Generate a feature-specific checklist
   */
  @Post('generate')
  generateFeatureChecklist(
    @Body()
    dto: {
      filesAdded?: string[];
      filesModified?: string[];
      apiEndpoints?: string[];
      uiPages?: string[];
      permissionsAdded?: string[];
    },
  ) {
    const checklist = this.qaChecklistService.createFeatureChecklist(dto);
    return {
      checklist,
      totalChecks: checklist.length,
      byCategory: this.groupByCategory(checklist),
    };
  }

  /**
   * Get QA checklist summary for reporting
   */
  @Get('summary')
  getSummary() {
    const checklist = STANDARD_QA_CHECKLIST;

    const bySeverity = {
      CRITICAL: checklist.filter((c) => c.severity === 'CRITICAL').length,
      HIGH: checklist.filter((c) => c.severity === 'HIGH').length,
      MEDIUM: checklist.filter((c) => c.severity === 'MEDIUM').length,
      LOW: checklist.filter((c) => c.severity === 'LOW').length,
    };

    const byCategory = this.groupByCategory(checklist);

    return {
      totalChecks: checklist.length,
      bySeverity,
      byCategory: Object.fromEntries(
        Object.entries(byCategory).map(([k, v]) => [k, v.length]),
      ),
      categories: Object.values(QACheckCategory),
    };
  }

  private groupByCategory(checklist: Array<{ category: QACheckCategory; [key: string]: unknown }>) {
    return checklist.reduce(
      (acc, check) => {
        if (!acc[check.category]) {
          acc[check.category] = [];
        }
        acc[check.category].push(check);
        return acc;
      },
      {} as Record<QACheckCategory, Array<{ category: QACheckCategory; [key: string]: unknown }>>,
    );
  }
}
