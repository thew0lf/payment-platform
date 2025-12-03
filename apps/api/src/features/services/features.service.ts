import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { ScopeType, Prisma } from '@prisma/client';
import {
  CreateFeatureDto,
  UpdateFeatureDto,
  UpdateFeatureStatusDto,
  AnswerQuestionsDto,
  CreateIssueDto,
  UpdateIssueDto,
  ResolveIssueDto,
  RetestIssueDto,
  CreateTestAccountDto,
  FeatureQueryDto,
  IssueQueryDto,
} from '../dto/feature.dto';
import {
  FeatureStatus,
  IssueStatus,
  FEATURE_ACTIVITY_ACTIONS,
  AI_ACTORS,
  STATUS_CONFIG,
  FeatureStats,
} from '../types/feature.types';

@Injectable()
export class FeaturesService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // FEATURE CRUD
  // ═══════════════════════════════════════════════════════════════

  async create(organizationId: string, dto: CreateFeatureDto, userId: string, userName?: string) {
    // Check if code already exists
    const existing = await this.prisma.feature.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new BadRequestException(`Feature with code "${dto.code}" already exists`);
    }

    const feature = await this.prisma.feature.create({
      data: {
        organizationId,
        code: dto.code,
        name: dto.name,
        description: dto.description,
        branch: dto.branch,
        specDocument: dto.specDocument as object,
        developerId: userId,
        developerName: userName,
        status: FeatureStatus.DEVELOPMENT,
      },
      include: {
        issues: true,
        activities: { take: 10, orderBy: { performedAt: 'desc' } },
      },
    });

    // Log activity
    await this.logActivity(feature.id, FEATURE_ACTIVITY_ACTIONS.CREATED, userId, userName, {
      code: feature.code,
      name: feature.name,
    });

    // Audit log
    await this.auditLogs.log('feature:created', 'Feature', feature.id, {
      userId,
      scopeType: ScopeType.ORGANIZATION,
      scopeId: organizationId,
      metadata: { code: feature.code, name: feature.name },
    });

    return feature;
  }

  async findAll(organizationId: string, query: FeatureQueryDto = {}) {
    const where: Record<string, unknown> = { organizationId };

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [features, total] = await Promise.all([
      this.prisma.feature.findMany({
        where,
        include: {
          issues: {
            where: { status: { not: IssueStatus.RESOLVED } },
          },
          _count: {
            select: {
              issues: true,
              activities: true,
            },
          },
        },
        orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
        take: query.limit || 50,
        skip: query.offset || 0,
      }),
      this.prisma.feature.count({ where }),
    ]);

    return { features, total };
  }

  async findOne(id: string, organizationId?: string) {
    const where: Record<string, unknown> = { id };
    if (organizationId) {
      where.organizationId = organizationId;
    }

    const feature = await this.prisma.feature.findFirst({
      where,
      include: {
        issues: {
          orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
        },
        activities: {
          orderBy: { performedAt: 'desc' },
          take: 50,
        },
        testAccounts: true,
      },
    });

    if (!feature) {
      throw new NotFoundException(`Feature with ID "${id}" not found`);
    }

    return feature;
  }

  async findByCode(code: string, organizationId?: string) {
    const where: Record<string, unknown> = { code };
    if (organizationId) {
      where.organizationId = organizationId;
    }

    const feature = await this.prisma.feature.findFirst({
      where,
      include: {
        issues: {
          orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
        },
        activities: {
          orderBy: { performedAt: 'desc' },
          take: 50,
        },
        testAccounts: true,
      },
    });

    if (!feature) {
      throw new NotFoundException(`Feature with code "${code}" not found`);
    }

    return feature;
  }

  async update(id: string, dto: UpdateFeatureDto, userId: string, userName?: string) {
    const feature = await this.findOne(id);

    const updated = await this.prisma.feature.update({
      where: { id },
      data: {
        ...dto,
        specDocument: dto.specDocument as object,
        qaChecklist: dto.qaChecklist as object,
        qaReport: dto.qaReport as object,
        reviewQuestions: dto.reviewQuestions as object,
        humanAnswers: dto.humanAnswers as object,
      },
      include: {
        issues: true,
        activities: { take: 10, orderBy: { performedAt: 'desc' } },
      },
    });

    await this.logActivity(id, 'UPDATED', userId, userName, {
      changes: Object.keys(dto),
    });

    return updated;
  }

  async updateStatus(id: string, dto: UpdateFeatureStatusDto, userId: string, userName?: string) {
    const feature = await this.findOne(id);
    const fromStatus = feature.status as FeatureStatus;
    const toStatus = dto.status;

    // Validate status transition
    const allowedTransitions = STATUS_CONFIG[fromStatus]?.nextStatuses || [];
    if (!allowedTransitions.includes(toStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${fromStatus} to ${toStatus}. Allowed: ${allowedTransitions.join(', ')}`,
      );
    }

    // Prepare update data
    const updateData: Record<string, unknown> = { status: toStatus };

    // Set timestamps based on new status
    if (toStatus === FeatureStatus.QA_IN_PROGRESS && !feature.qaStartedAt) {
      updateData.qaStartedAt = new Date();
      updateData.qaRounds = feature.qaRounds + 1;
    }
    if (toStatus === FeatureStatus.SR_REVIEW && !feature.reviewStartedAt) {
      updateData.reviewStartedAt = new Date();
    }
    if (toStatus === FeatureStatus.QUESTIONS_READY) {
      updateData.questionsReadyAt = new Date();
    }
    if (toStatus === FeatureStatus.APPROVED) {
      updateData.approvedAt = new Date();
    }
    if (toStatus === FeatureStatus.MERGED) {
      updateData.mergedAt = new Date();
    }

    const updated = await this.prisma.feature.update({
      where: { id },
      data: updateData,
      include: {
        issues: true,
        activities: { take: 10, orderBy: { performedAt: 'desc' } },
      },
    });

    // Log activity
    await this.logActivity(id, FEATURE_ACTIVITY_ACTIONS.STATUS_CHANGED, userId, userName, {
      fromStatus,
      toStatus,
      note: dto.note,
    }, fromStatus, toStatus);

    // Audit log
    await this.auditLogs.log('feature:status_changed', 'Feature', id, {
      userId,
      scopeType: ScopeType.ORGANIZATION,
      scopeId: feature.organizationId,
      metadata: { code: feature.code, fromStatus, toStatus },
    });

    return updated;
  }

  async answerQuestions(id: string, dto: AnswerQuestionsDto, userId: string, userName?: string) {
    const feature = await this.findOne(id);

    if (feature.status !== FeatureStatus.QUESTIONS_READY && feature.status !== FeatureStatus.AWAITING_ANSWERS) {
      throw new BadRequestException('Feature is not in a state that accepts answers');
    }

    // Update answers in reviewQuestions
    const questions = (feature.reviewQuestions as Array<Record<string, unknown>>) || [];
    for (const answer of dto.answers) {
      const question = questions.find((q) => q.id === answer.questionId);
      if (question) {
        question.answer = answer.answer;
        question.answeredAt = new Date().toISOString();
      }
    }

    const updated = await this.prisma.feature.update({
      where: { id },
      data: {
        reviewQuestions: questions as Prisma.InputJsonValue,
        humanAnswers: dto.answers as Prisma.InputJsonValue,
        answeredAt: new Date(),
        status: FeatureStatus.SR_FIXING,
      },
      include: {
        issues: true,
        activities: { take: 10, orderBy: { performedAt: 'desc' } },
      },
    });

    await this.logActivity(id, FEATURE_ACTIVITY_ACTIONS.QUESTION_ANSWERED, userId, userName, {
      answersCount: dto.answers.length,
    });

    return updated;
  }

  // ═══════════════════════════════════════════════════════════════
  // ISSUE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  async createIssue(featureId: string, dto: CreateIssueDto, userId: string, userName?: string) {
    const feature = await this.findOne(featureId);

    // Generate issue code
    const issueCount = await this.prisma.featureIssue.count({
      where: { featureId },
    });
    const code = `QA-${String(issueCount + 1).padStart(3, '0')}`;

    const issue = await this.prisma.featureIssue.create({
      data: {
        feature: { connect: { id: featureId } },
        code,
        severity: dto.severity as any,
        category: dto.category as any,
        title: dto.title,
        description: dto.description,
        stepsToReproduce: dto.stepsToReproduce,
        expectedBehavior: dto.expectedBehavior,
        actualBehavior: dto.actualBehavior,
        filePath: dto.filePath,
        lineNumber: dto.lineNumber,
        pageUrl: dto.pageUrl,
        apiEndpoint: dto.apiEndpoint,
        screenshots: dto.screenshots,
        errorLogs: dto.errorLogs,
      },
    });

    // Update feature issue count
    await this.prisma.feature.update({
      where: { id: featureId },
      data: { issuesFound: { increment: 1 } },
    });

    await this.logActivity(featureId, FEATURE_ACTIVITY_ACTIONS.ISSUE_CREATED, userId, userName, {
      issueCode: code,
      severity: dto.severity,
      title: dto.title,
    });

    return issue;
  }

  async getIssues(featureId: string, query: IssueQueryDto = {}) {
    const where: Record<string, unknown> = { featureId };

    if (query.status) where.status = query.status;
    if (query.severity) where.severity = query.severity;
    if (query.category) where.category = query.category;

    return this.prisma.featureIssue.findMany({
      where,
      orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async updateIssue(issueId: string, dto: UpdateIssueDto, userId: string, userName?: string) {
    const issue = await this.prisma.featureIssue.findUnique({
      where: { id: issueId },
    });

    if (!issue) {
      throw new NotFoundException(`Issue with ID "${issueId}" not found`);
    }

    const updated = await this.prisma.featureIssue.update({
      where: { id: issueId },
      data: dto as any,
    });

    await this.logActivity(issue.featureId, FEATURE_ACTIVITY_ACTIONS.ISSUE_UPDATED, userId, userName, {
      issueCode: issue.code,
      changes: Object.keys(dto),
    });

    return updated;
  }

  async resolveIssue(issueId: string, dto: ResolveIssueDto, userId: string, userName?: string) {
    const issue = await this.prisma.featureIssue.findUnique({
      where: { id: issueId },
    });

    if (!issue) {
      throw new NotFoundException(`Issue with ID "${issueId}" not found`);
    }

    const updated = await this.prisma.featureIssue.update({
      where: { id: issueId },
      data: {
        status: IssueStatus.RESOLVED,
        resolution: dto.resolution,
        resolvedBy: userId,
        resolvedAt: new Date(),
        retestStatus: 'PENDING',
      },
    });

    // Update feature resolved count
    await this.prisma.feature.update({
      where: { id: issue.featureId },
      data: { issuesResolved: { increment: 1 } },
    });

    await this.logActivity(issue.featureId, FEATURE_ACTIVITY_ACTIONS.ISSUE_RESOLVED, userId, userName, {
      issueCode: issue.code,
      resolution: dto.resolution,
    });

    return updated;
  }

  async retestIssue(issueId: string, dto: RetestIssueDto, userId: string, userName?: string) {
    const issue = await this.prisma.featureIssue.findUnique({
      where: { id: issueId },
    });

    if (!issue) {
      throw new NotFoundException(`Issue with ID "${issueId}" not found`);
    }

    const updated = await this.prisma.featureIssue.update({
      where: { id: issueId },
      data: {
        retestStatus: dto.retestStatus,
        retestNotes: dto.retestNotes,
        retestedAt: new Date(),
        retestedBy: userId,
        // If failed, reopen the issue
        status: dto.retestStatus === 'FAILED' ? IssueStatus.OPEN : issue.status,
      },
    });

    return updated;
  }

  // ═══════════════════════════════════════════════════════════════
  // TEST ACCOUNTS
  // ═══════════════════════════════════════════════════════════════

  async createTestAccount(featureId: string, dto: CreateTestAccountDto) {
    await this.findOne(featureId);

    return this.prisma.featureTestAccount.create({
      data: {
        featureId,
        ...dto,
      },
    });
  }

  async getTestAccounts(featureId: string) {
    return this.prisma.featureTestAccount.findMany({
      where: { featureId },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // STATISTICS
  // ═══════════════════════════════════════════════════════════════

  async getStats(organizationId: string): Promise<FeatureStats> {
    const features = await this.prisma.feature.findMany({
      where: { organizationId },
      include: {
        issues: true,
      },
    });

    const pipeline = {
      development: 0,
      // Code Review Phase
      readyForReview: 0,
      codeReview: 0,
      reviewFixing: 0,
      // QA Phase
      readyForQA: 0,
      qaInProgress: 0,
      srReview: 0,
      questionsReady: 0,
      fixing: 0,
      approved: 0,
      merged: 0,
    };

    let needsAttention = 0;
    const issuesByCategory: Record<string, number> = {};
    const issuesBySeverity: Record<string, number> = {};

    for (const feature of features) {
      // Pipeline counts
      switch (feature.status) {
        case 'DEVELOPMENT':
          pipeline.development++;
          break;
        // Code Review Phase
        case 'READY_FOR_REVIEW':
          pipeline.readyForReview++;
          needsAttention++;
          break;
        case 'CODE_REVIEW':
          pipeline.codeReview++;
          break;
        case 'REVIEW_FIXING':
          pipeline.reviewFixing++;
          break;
        // QA Phase
        case 'READY_FOR_QA':
          pipeline.readyForQA++;
          break;
        case 'QA_IN_PROGRESS':
          pipeline.qaInProgress++;
          break;
        case 'SR_REVIEW':
          pipeline.srReview++;
          break;
        case 'QUESTIONS_READY':
        case 'AWAITING_ANSWERS':
          pipeline.questionsReady++;
          needsAttention++;
          break;
        case 'SR_FIXING':
        case 'READY_FOR_RETEST':
          pipeline.fixing++;
          break;
        case 'APPROVED':
          pipeline.approved++;
          needsAttention++;
          break;
        case 'MERGED':
          pipeline.merged++;
          break;
      }

      // Issue stats
      for (const issue of feature.issues) {
        issuesByCategory[issue.category] = (issuesByCategory[issue.category] || 0) + 1;
        issuesBySeverity[issue.severity] = (issuesBySeverity[issue.severity] || 0) + 1;
      }
    }

    return {
      total: features.length,
      active: features.filter((f) => f.status !== 'MERGED' && f.status !== 'CANCELLED').length,
      needsAttention,
      pipeline,
      issuesByCategory: issuesByCategory as Record<string, number>,
      issuesBySeverity: issuesBySeverity as Record<string, number>,
    };
  }

  async getNeedsAttention(organizationId: string) {
    return this.prisma.feature.findMany({
      where: {
        organizationId,
        status: {
          in: [FeatureStatus.QUESTIONS_READY, FeatureStatus.AWAITING_ANSWERS, FeatureStatus.APPROVED],
        },
      },
      include: {
        issues: {
          where: { status: { not: IssueStatus.RESOLVED } },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // ACTIVITY LOGGING
  // ═══════════════════════════════════════════════════════════════

  private async logActivity(
    featureId: string,
    action: string,
    userId: string,
    userName?: string,
    details?: Record<string, unknown>,
    fromStatus?: FeatureStatus,
    toStatus?: FeatureStatus,
  ) {
    return this.prisma.featureActivity.create({
      data: {
        featureId,
        action,
        performedBy: userId,
        performedByName: userName,
        details: details as object,
        fromStatus,
        toStatus,
      },
    });
  }
}
