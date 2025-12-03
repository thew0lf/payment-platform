import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  CodeReviewChecklistService,
  CodeReviewCategory,
  STANDARD_CODE_REVIEW_CHECKLIST,
} from '../services/code-review-checklist.service';

@Controller('code-review-checklist')
@UseGuards(JwtAuthGuard)
export class CodeReviewChecklistController {
  constructor(private readonly codeReviewChecklistService: CodeReviewChecklistService) {}

  /**
   * Get the standard code review checklist
   */
  @Get('standard')
  getStandardChecklist() {
    return {
      checklist: STANDARD_CODE_REVIEW_CHECKLIST,
      categories: Object.values(CodeReviewCategory),
      totalChecks: STANDARD_CODE_REVIEW_CHECKLIST.length,
    };
  }

  /**
   * Get checklist by category
   */
  @Get('category')
  getByCategory(@Query('category') category: CodeReviewCategory) {
    const checks = this.codeReviewChecklistService.getChecklistByCategory(category);
    return {
      category,
      checks,
      totalChecks: checks.length,
    };
  }

  /**
   * Get code review checklist summary for reporting
   */
  @Get('summary')
  getSummary() {
    return this.codeReviewChecklistService.getSummary();
  }

  /**
   * Get all categories with their check counts
   */
  @Get('categories')
  getCategories() {
    const categories = Object.values(CodeReviewCategory);
    const categoryDetails = categories.map((category) => {
      const checks = this.codeReviewChecklistService.getChecklistByCategory(category);
      const criticalCount = checks.filter((c) => c.severity === 'CRITICAL').length;
      const highCount = checks.filter((c) => c.severity === 'HIGH').length;

      return {
        category,
        label: this.getCategoryLabel(category),
        description: this.getCategoryDescription(category),
        totalChecks: checks.length,
        criticalChecks: criticalCount,
        highChecks: highCount,
        isCompliance: this.isComplianceCategory(category),
      };
    });

    return {
      categories: categoryDetails,
      totalCategories: categories.length,
    };
  }

  private getCategoryLabel(category: CodeReviewCategory): string {
    const labels: Record<CodeReviewCategory, string> = {
      [CodeReviewCategory.CODE_QUALITY]: 'Code Quality',
      [CodeReviewCategory.ARCHITECTURE]: 'Architecture',
      [CodeReviewCategory.TYPE_SAFETY]: 'Type Safety',
      [CodeReviewCategory.ERROR_HANDLING]: 'Error Handling',
      [CodeReviewCategory.MAINTAINABILITY]: 'Maintainability',
      [CodeReviewCategory.TESTING]: 'Testing',
      [CodeReviewCategory.SECURITY]: 'Security',
      [CodeReviewCategory.AUTHENTICATION]: 'Authentication',
      [CodeReviewCategory.AUTHORIZATION]: 'Authorization',
      [CodeReviewCategory.INPUT_VALIDATION]: 'Input Validation',
      [CodeReviewCategory.OUTPUT_ENCODING]: 'Output Encoding',
      [CodeReviewCategory.CRYPTOGRAPHY]: 'Cryptography',
      [CodeReviewCategory.SOC2]: 'SOC2 Compliance',
      [CodeReviewCategory.ISO27001]: 'ISO 27001 Compliance',
      [CodeReviewCategory.PCI_DSS]: 'PCI-DSS Compliance',
      [CodeReviewCategory.GDPR]: 'GDPR Compliance',
      [CodeReviewCategory.PERFORMANCE]: 'Performance',
      [CodeReviewCategory.DATABASE]: 'Database',
      [CodeReviewCategory.API_DESIGN]: 'API Design',
      [CodeReviewCategory.LOGGING]: 'Logging',
    };
    return labels[category] || category;
  }

  private getCategoryDescription(category: CodeReviewCategory): string {
    const descriptions: Record<CodeReviewCategory, string> = {
      [CodeReviewCategory.CODE_QUALITY]: 'Code follows conventions, is readable, and maintainable',
      [CodeReviewCategory.ARCHITECTURE]: 'Code follows architectural patterns and design principles',
      [CodeReviewCategory.TYPE_SAFETY]: 'TypeScript types are properly defined and used',
      [CodeReviewCategory.ERROR_HANDLING]: 'Errors are handled gracefully and appropriately',
      [CodeReviewCategory.MAINTAINABILITY]: 'Code is easy to understand and modify',
      [CodeReviewCategory.TESTING]: 'Code has appropriate test coverage',
      [CodeReviewCategory.SECURITY]: 'Code is secure against common vulnerabilities (OWASP)',
      [CodeReviewCategory.AUTHENTICATION]: 'Authentication is properly implemented',
      [CodeReviewCategory.AUTHORIZATION]: 'Authorization checks are in place',
      [CodeReviewCategory.INPUT_VALIDATION]: 'All user inputs are validated',
      [CodeReviewCategory.OUTPUT_ENCODING]: 'Output is properly encoded to prevent XSS',
      [CodeReviewCategory.CRYPTOGRAPHY]: 'Cryptographic operations are secure',
      [CodeReviewCategory.SOC2]: 'Service Organization Control 2 compliance',
      [CodeReviewCategory.ISO27001]: 'ISO 27001 information security compliance',
      [CodeReviewCategory.PCI_DSS]: 'Payment Card Industry Data Security Standard compliance',
      [CodeReviewCategory.GDPR]: 'General Data Protection Regulation compliance',
      [CodeReviewCategory.PERFORMANCE]: 'Code is optimized for performance',
      [CodeReviewCategory.DATABASE]: 'Database operations are safe and efficient',
      [CodeReviewCategory.API_DESIGN]: 'APIs follow RESTful design principles',
      [CodeReviewCategory.LOGGING]: 'Logging is appropriate and secure',
    };
    return descriptions[category] || '';
  }

  private isComplianceCategory(category: CodeReviewCategory): boolean {
    return [
      CodeReviewCategory.SOC2,
      CodeReviewCategory.ISO27001,
      CodeReviewCategory.PCI_DSS,
      CodeReviewCategory.GDPR,
    ].includes(category);
  }
}
