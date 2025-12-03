import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * FeatureSyncService handles bidirectional sync between:
 * 1. Database (source of truth for feature state)
 * 2. File system (.claude/features/) for AI console handoffs
 *
 * This enables multiple Claude Code consoles to work on different
 * aspects of the same feature (QA, SR review) while maintaining
 * state consistency.
 */
@Injectable()
export class FeatureSyncService {
  private readonly logger = new Logger(FeatureSyncService.name);
  private readonly featuresDir: string;

  constructor(private prisma: PrismaService) {
    // Features directory at project root
    this.featuresDir = path.join(process.cwd(), '..', '..', '.claude', 'features');
  }

  /**
   * Export a feature to file system for AI console handoff
   */
  async exportFeature(featureId: string): Promise<string> {
    const feature = await this.prisma.feature.findUnique({
      where: { id: featureId },
      include: {
        issues: {
          orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
        },
        activities: {
          orderBy: { performedAt: 'desc' },
          take: 100,
        },
        testAccounts: true,
      },
    });

    if (!feature) {
      throw new Error(`Feature ${featureId} not found`);
    }

    // Create feature directory
    const featureDir = path.join(this.featuresDir, feature.code);
    await fs.mkdir(featureDir, { recursive: true });

    // Write feature status file
    const statusFile = path.join(featureDir, 'STATUS.md');
    const statusContent = this.generateStatusMarkdown(feature);
    await fs.writeFile(statusFile, statusContent, 'utf-8');

    // Write issues file
    const issuesFile = path.join(featureDir, 'ISSUES.md');
    const issuesContent = this.generateIssuesMarkdown(feature.issues);
    await fs.writeFile(issuesFile, issuesContent, 'utf-8');

    // Write questions file if any
    if (feature.reviewQuestions) {
      const questionsFile = path.join(featureDir, 'QUESTIONS.md');
      const questionsContent = this.generateQuestionsMarkdown(
        feature.reviewQuestions as Array<Record<string, unknown>>,
        feature.humanAnswers as Array<Record<string, unknown>>,
      );
      await fs.writeFile(questionsFile, questionsContent, 'utf-8');
    }

    // Write spec document
    if (feature.specDocument) {
      const specFile = path.join(featureDir, 'SPEC.md');
      const specContent = this.generateSpecMarkdown(feature.specDocument as Record<string, unknown>);
      await fs.writeFile(specFile, specContent, 'utf-8');
    }

    // Write JSON data for programmatic access
    const dataFile = path.join(featureDir, 'data.json');
    await fs.writeFile(dataFile, JSON.stringify(feature, null, 2), 'utf-8');

    this.logger.log(`Exported feature ${feature.code} to ${featureDir}`);
    return featureDir;
  }

  /**
   * Import updates from file system back to database
   */
  async importFeature(featureCode: string): Promise<void> {
    const featureDir = path.join(this.featuresDir, featureCode);
    const dataFile = path.join(featureDir, 'data.json');

    try {
      const content = await fs.readFile(dataFile, 'utf-8');
      const fileData = JSON.parse(content);

      // Find existing feature
      const existing = await this.prisma.feature.findUnique({
        where: { code: featureCode },
      });

      if (!existing) {
        this.logger.warn(`Feature ${featureCode} not found in database`);
        return;
      }

      // Update feature with file data
      await this.prisma.feature.update({
        where: { id: existing.id },
        data: {
          qaChecklist: fileData.qaChecklist,
          qaReport: fileData.qaReport,
          reviewQuestions: fileData.reviewQuestions,
          // Don't import humanAnswers from file - those come from UI
        },
      });

      // Import new issues from file
      if (fileData.newIssues) {
        for (const issue of fileData.newIssues) {
          await this.prisma.featureIssue.create({
            data: {
              featureId: existing.id,
              ...issue,
            },
          });
        }
      }

      this.logger.log(`Imported feature ${featureCode} from file system`);
    } catch (error) {
      this.logger.error(`Failed to import feature ${featureCode}:`, error);
      throw error;
    }
  }

  /**
   * Sync all active features to file system
   */
  async syncAllActive(): Promise<void> {
    const activeFeatures = await this.prisma.feature.findMany({
      where: {
        status: {
          notIn: ['MERGED', 'CANCELLED'],
        },
      },
    });

    for (const feature of activeFeatures) {
      try {
        await this.exportFeature(feature.id);
      } catch (error) {
        this.logger.error(`Failed to export feature ${feature.code}:`, error);
      }
    }
  }

  /**
   * Watch for file changes and auto-import
   * (Called by a background job or manually)
   */
  async checkForUpdates(): Promise<string[]> {
    const updated: string[] = [];

    try {
      const dirs = await fs.readdir(this.featuresDir);

      for (const dir of dirs) {
        const dataFile = path.join(this.featuresDir, dir, 'data.json');

        try {
          const stat = await fs.stat(dataFile);
          const feature = await this.prisma.feature.findUnique({
            where: { code: dir },
          });

          if (feature && stat.mtime > feature.updatedAt) {
            await this.importFeature(dir);
            updated.push(dir);
          }
        } catch {
          // File doesn't exist or can't be read
        }
      }
    } catch {
      // Features directory doesn't exist yet
    }

    return updated;
  }

  // ═══════════════════════════════════════════════════════════════
  // MARKDOWN GENERATORS
  // ═══════════════════════════════════════════════════════════════

  private generateStatusMarkdown(feature: Record<string, unknown>): string {
    return `# Feature: ${feature.name}

## Status: ${feature.status}

- **Code:** ${feature.code}
- **Branch:** ${feature.branch}
- **Developer:** ${feature.developerName || 'Unknown'}
- **Created:** ${new Date(feature.createdAt as string).toLocaleString()}
- **Updated:** ${new Date(feature.updatedAt as string).toLocaleString()}

## Progress

- QA Rounds: ${feature.qaRounds}
- Issues Found: ${feature.issuesFound}
- Issues Resolved: ${feature.issuesResolved}

## Timeline

| Milestone | Date |
|-----------|------|
| Created | ${feature.createdAt ? new Date(feature.createdAt as string).toLocaleDateString() : '-'} |
| QA Started | ${feature.qaStartedAt ? new Date(feature.qaStartedAt as string).toLocaleDateString() : '-'} |
| Review Started | ${feature.reviewStartedAt ? new Date(feature.reviewStartedAt as string).toLocaleDateString() : '-'} |
| Questions Ready | ${feature.questionsReadyAt ? new Date(feature.questionsReadyAt as string).toLocaleDateString() : '-'} |
| Answered | ${feature.answeredAt ? new Date(feature.answeredAt as string).toLocaleDateString() : '-'} |
| Approved | ${feature.approvedAt ? new Date(feature.approvedAt as string).toLocaleDateString() : '-'} |
| Merged | ${feature.mergedAt ? new Date(feature.mergedAt as string).toLocaleDateString() : '-'} |

## Description

${feature.description || 'No description provided.'}
`;
  }

  private generateIssuesMarkdown(issues: Array<Record<string, unknown>>): string {
    if (!issues || issues.length === 0) {
      return '# Issues\n\nNo issues found.\n';
    }

    let content = `# Issues (${issues.length} total)\n\n`;

    const byStatus = {
      OPEN: issues.filter((i) => i.status === 'OPEN'),
      IN_PROGRESS: issues.filter((i) => i.status === 'IN_PROGRESS'),
      RESOLVED: issues.filter((i) => i.status === 'RESOLVED'),
      OTHER: issues.filter((i) => !['OPEN', 'IN_PROGRESS', 'RESOLVED'].includes(i.status as string)),
    };

    for (const [status, statusIssues] of Object.entries(byStatus)) {
      if (statusIssues.length === 0) continue;

      content += `## ${status} (${statusIssues.length})\n\n`;

      for (const issue of statusIssues) {
        content += `### ${issue.code}: ${issue.title}\n\n`;
        content += `- **Severity:** ${issue.severity}\n`;
        content += `- **Category:** ${issue.category}\n`;
        content += `- **File:** ${issue.filePath || 'N/A'}\n`;
        content += `- **Line:** ${issue.lineNumber || 'N/A'}\n\n`;
        content += `**Description:**\n${issue.description}\n\n`;

        if (issue.stepsToReproduce) {
          content += `**Steps to Reproduce:**\n${issue.stepsToReproduce}\n\n`;
        }

        if (issue.resolution) {
          content += `**Resolution:**\n${issue.resolution}\n\n`;
        }

        content += '---\n\n';
      }
    }

    return content;
  }

  private generateQuestionsMarkdown(
    questions: Array<Record<string, unknown>>,
    answers?: Array<Record<string, unknown>>,
  ): string {
    if (!questions || questions.length === 0) {
      return '# Questions\n\nNo questions.\n';
    }

    let content = `# Questions for Human Review\n\n`;

    for (const q of questions) {
      const answer = answers?.find((a) => a.questionId === q.id);

      content += `## Question: ${q.id}\n\n`;
      content += `**${q.question}**\n\n`;

      if (q.context) {
        content += `*Context:* ${q.context}\n\n`;
      }

      if (answer) {
        content += `### Answer\n\n${answer.answer}\n\n`;
        content += `*Answered at: ${answer.answeredAt || 'Unknown'}*\n\n`;
      } else {
        content += `### Answer\n\n*Pending*\n\n`;
      }

      content += '---\n\n';
    }

    return content;
  }

  private generateSpecMarkdown(spec: Record<string, unknown>): string {
    let content = `# Feature Specification\n\n`;

    if (spec.summary) {
      content += `## Summary\n\n${spec.summary}\n\n`;
    }

    if (spec.objectives && Array.isArray(spec.objectives)) {
      content += `## Objectives\n\n`;
      for (const obj of spec.objectives) {
        content += `- ${obj}\n`;
      }
      content += '\n';
    }

    if (spec.filesAdded && Array.isArray(spec.filesAdded) && spec.filesAdded.length > 0) {
      content += `## Files Added\n\n`;
      for (const file of spec.filesAdded) {
        content += `- \`${file}\`\n`;
      }
      content += '\n';
    }

    if (spec.filesModified && Array.isArray(spec.filesModified) && spec.filesModified.length > 0) {
      content += `## Files Modified\n\n`;
      for (const file of spec.filesModified) {
        content += `- \`${file}\`\n`;
      }
      content += '\n';
    }

    if (spec.filesDeleted && Array.isArray(spec.filesDeleted) && spec.filesDeleted.length > 0) {
      content += `## Files Deleted\n\n`;
      for (const file of spec.filesDeleted) {
        content += `- \`${file}\`\n`;
      }
      content += '\n';
    }

    if (spec.permissionsAdded && Array.isArray(spec.permissionsAdded) && spec.permissionsAdded.length > 0) {
      content += `## Permissions Added\n\n`;
      for (const perm of spec.permissionsAdded) {
        content += `- \`${perm}\`\n`;
      }
      content += '\n';
    }

    if (spec.apiEndpoints && Array.isArray(spec.apiEndpoints)) {
      content += `## API Endpoints\n\n`;
      for (const endpoint of spec.apiEndpoints) {
        content += `- \`${endpoint}\`\n`;
      }
      content += '\n';
    }

    if (spec.uiPages && Array.isArray(spec.uiPages)) {
      content += `## UI Pages\n\n`;
      for (const page of spec.uiPages) {
        content += `- \`${page}\`\n`;
      }
      content += '\n';
    }

    if (spec.notes) {
      content += `## Notes\n\n${spec.notes}\n`;
    }

    return content;
  }
}
