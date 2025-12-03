import { IsString, IsOptional, IsEnum, IsArray, IsInt, IsObject, Min, MaxLength, MinLength } from 'class-validator';
import { FeatureStatus, IssueSeverity, IssueCategory, IssueStatus } from '../types/feature.types';

// ═══════════════════════════════════════════════════════════════
// FEATURE DTOs
// ═══════════════════════════════════════════════════════════════

export class CreateFeatureDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  code: string; // "01-funnels"

  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsString()
  branch: string; // "feature/01-funnels"

  @IsOptional()
  @IsObject()
  specDocument?: Record<string, unknown>;
}

export class UpdateFeatureDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsEnum(FeatureStatus)
  status?: FeatureStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @IsOptional()
  @IsObject()
  specDocument?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  qaChecklist?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  qaReport?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  reviewQuestions?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  humanAnswers?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  filesAdded?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  filesModified?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  filesDeleted?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionsAdded?: string[];
}

export class UpdateFeatureStatusDto {
  @IsEnum(FeatureStatus)
  status: FeatureStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class AnswerQuestionsDto {
  @IsArray()
  answers: Array<{
    questionId: string;
    answer: string;
  }>;
}

// ═══════════════════════════════════════════════════════════════
// ISSUE DTOs
// ═══════════════════════════════════════════════════════════════

export class CreateIssueDto {
  @IsEnum(IssueSeverity)
  severity: IssueSeverity;

  @IsEnum(IssueCategory)
  category: IssueCategory;

  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(10)
  description: string;

  @IsOptional()
  @IsString()
  stepsToReproduce?: string;

  @IsOptional()
  @IsString()
  expectedBehavior?: string;

  @IsOptional()
  @IsString()
  actualBehavior?: string;

  @IsOptional()
  @IsString()
  filePath?: string;

  @IsOptional()
  @IsInt()
  lineNumber?: number;

  @IsOptional()
  @IsString()
  pageUrl?: string;

  @IsOptional()
  @IsString()
  apiEndpoint?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  screenshots?: string[];

  @IsOptional()
  @IsString()
  errorLogs?: string;
}

export class UpdateIssueDto {
  @IsOptional()
  @IsEnum(IssueSeverity)
  severity?: IssueSeverity;

  @IsOptional()
  @IsEnum(IssueCategory)
  category?: IssueCategory;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  stepsToReproduce?: string;

  @IsOptional()
  @IsString()
  expectedBehavior?: string;

  @IsOptional()
  @IsString()
  actualBehavior?: string;

  @IsOptional()
  @IsEnum(IssueStatus)
  status?: IssueStatus;

  @IsOptional()
  @IsString()
  resolution?: string;
}

export class ResolveIssueDto {
  @IsString()
  @MinLength(10)
  resolution: string;
}

export class RetestIssueDto {
  @IsEnum(IssueStatus)
  retestStatus: 'PASSED' | 'FAILED';

  @IsOptional()
  @IsString()
  retestNotes?: string;
}

// ═══════════════════════════════════════════════════════════════
// TEST ACCOUNT DTOs
// ═══════════════════════════════════════════════════════════════

export class CreateTestAccountDto {
  @IsString()
  role: string;

  @IsString()
  email: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  companyId?: string;

  @IsString()
  purpose: string;
}

// ═══════════════════════════════════════════════════════════════
// QUERY DTOs
// ═══════════════════════════════════════════════════════════════

export class FeatureQueryDto {
  @IsOptional()
  @IsEnum(FeatureStatus)
  status?: FeatureStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}

export class IssueQueryDto {
  @IsOptional()
  @IsEnum(IssueStatus)
  status?: IssueStatus;

  @IsOptional()
  @IsEnum(IssueSeverity)
  severity?: IssueSeverity;

  @IsOptional()
  @IsEnum(IssueCategory)
  category?: IssueCategory;
}
