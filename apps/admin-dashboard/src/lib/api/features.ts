import { apiClient as api } from '../api';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export enum FeatureStatus {
  DEVELOPMENT = 'DEVELOPMENT',
  // Code Review Phase (before QA)
  READY_FOR_REVIEW = 'READY_FOR_REVIEW',
  CODE_REVIEW = 'CODE_REVIEW',
  REVIEW_FIXING = 'REVIEW_FIXING',
  // QA Phase (after code review passes)
  READY_FOR_QA = 'READY_FOR_QA',
  QA_IN_PROGRESS = 'QA_IN_PROGRESS',
  QA_COMPLETE = 'QA_COMPLETE',
  SR_REVIEW = 'SR_REVIEW',
  QUESTIONS_READY = 'QUESTIONS_READY',
  AWAITING_ANSWERS = 'AWAITING_ANSWERS',
  SR_FIXING = 'SR_FIXING',
  READY_FOR_RETEST = 'READY_FOR_RETEST',
  APPROVED = 'APPROVED',
  MERGED = 'MERGED',
  CANCELLED = 'CANCELLED',
}

export enum IssueSeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  SUGGESTION = 'SUGGESTION',
}

export enum IssueCategory {
  // Functional Issues
  BUG = 'BUG',
  PERFORMANCE = 'PERFORMANCE',
  UX = 'UX',
  ACCESSIBILITY = 'ACCESSIBILITY',
  TESTING = 'TESTING',
  DOCUMENTATION = 'DOCUMENTATION',
  INTEGRATION = 'INTEGRATION',
  // Code Quality Issues (Code Review)
  CODE_QUALITY = 'CODE_QUALITY',
  ARCHITECTURE = 'ARCHITECTURE',
  MAINTAINABILITY = 'MAINTAINABILITY',
  TYPE_SAFETY = 'TYPE_SAFETY',
  ERROR_HANDLING = 'ERROR_HANDLING',
  // Security Issues (Code Review)
  SECURITY = 'SECURITY',
  PERMISSIONS = 'PERMISSIONS',
  DATA_INTEGRITY = 'DATA_INTEGRITY',
  // Compliance Issues (Code Review - SOC2/ISO/PCI)
  SOC2_COMPLIANCE = 'SOC2_COMPLIANCE',
  ISO27001_COMPLIANCE = 'ISO27001_COMPLIANCE',
  PCI_DSS_COMPLIANCE = 'PCI_DSS_COMPLIANCE',
  GDPR_COMPLIANCE = 'GDPR_COMPLIANCE',
  AUDIT_LOGGING = 'AUDIT_LOGGING',
  DATA_PROTECTION = 'DATA_PROTECTION',
}

export enum IssueStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  WONT_FIX = 'WONT_FIX',
  DUPLICATE = 'DUPLICATE',
  CANNOT_REPRODUCE = 'CANNOT_REPRODUCE',
}

export interface Feature {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  description?: string;
  branch: string;
  status: FeatureStatus;
  priority: number;
  developerId?: string;
  developerName?: string;
  specDocument?: Record<string, unknown>;
  qaChecklist?: Record<string, unknown>;
  qaReport?: Record<string, unknown>;
  reviewQuestions?: ReviewQuestion[];
  humanAnswers?: QuestionAnswer[];
  issuesFound: number;
  issuesResolved: number;
  qaRounds: number;
  qaStartedAt?: string;
  reviewStartedAt?: string;
  questionsReadyAt?: string;
  answeredAt?: string;
  approvedAt?: string;
  mergedAt?: string;
  createdAt: string;
  updatedAt: string;
  issues?: FeatureIssue[];
  activities?: FeatureActivity[];
  testAccounts?: FeatureTestAccount[];
  _count?: {
    issues: number;
    activities: number;
  };
}

export interface FeatureIssue {
  id: string;
  featureId: string;
  code: string;
  severity: IssueSeverity;
  category: IssueCategory;
  title: string;
  description: string;
  stepsToReproduce?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  filePath?: string;
  lineNumber?: number;
  pageUrl?: string;
  apiEndpoint?: string;
  screenshots?: string[];
  errorLogs?: string;
  status: IssueStatus;
  resolution?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  retestStatus?: string;
  retestNotes?: string;
  retestedAt?: string;
  retestedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeatureActivity {
  id: string;
  featureId: string;
  action: string;
  performedBy: string;
  performedByName?: string;
  details?: Record<string, unknown>;
  fromStatus?: FeatureStatus;
  toStatus?: FeatureStatus;
  performedAt: string;
}

export interface FeatureTestAccount {
  id: string;
  featureId: string;
  role: string;
  email: string;
  password: string;
  organizationId?: string;
  clientId?: string;
  companyId?: string;
  purpose: string;
  createdAt: string;
}

export interface ReviewQuestion {
  id: string;
  question: string;
  context?: string;
  relatedIssueIds?: string[];
  answer?: string;
  answeredAt?: string;
}

export interface QuestionAnswer {
  questionId: string;
  answer: string;
}

export interface FeatureStats {
  total: number;
  active: number;
  needsAttention: number;
  pipeline: {
    development: number;
    // Code Review Phase
    readyForReview: number;
    codeReview: number;
    reviewFixing: number;
    // QA Phase
    readyForQA: number;
    qaInProgress: number;
    srReview: number;
    questionsReady: number;
    fixing: number;
    approved: number;
    merged: number;
  };
  issuesByCategory: Record<string, number>;
  issuesBySeverity: Record<string, number>;
}

export interface FeatureQuery {
  status?: FeatureStatus;
  search?: string;
  limit?: number;
  offset?: number;
}

// ═══════════════════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export const featuresApi = {
  // Features
  list: async (query?: FeatureQuery) => {
    const params = new URLSearchParams();
    if (query?.status) params.set('status', query.status);
    if (query?.search) params.set('search', query.search);
    if (query?.limit) params.set('limit', String(query.limit));
    if (query?.offset) params.set('offset', String(query.offset));

    return api.get<{ features: Feature[]; total: number }>(
      `/api/features${params.toString() ? `?${params}` : ''}`
    );
  },

  get: async (id: string) => {
    return api.get<Feature>(`/api/features/${id}`);
  },

  getByCode: async (code: string) => {
    return api.get<Feature>(`/api/features/code/${code}`);
  },

  getStats: async () => {
    return api.get<FeatureStats>('/api/features/stats');
  },

  getNeedsAttention: async () => {
    return api.get<Feature[]>('/api/features/needs-attention');
  },

  create: async (data: {
    code: string;
    name: string;
    description?: string;
    branch: string;
    specDocument?: Record<string, unknown>;
  }) => {
    return api.post<Feature>('/api/features', data);
  },

  update: async (id: string, data: Partial<Feature>) => {
    return api.patch<Feature>(`/api/features/${id}`, data);
  },

  updateStatus: async (id: string, status: FeatureStatus, note?: string) => {
    return api.patch<Feature>(`/api/features/${id}/status`, { status, note });
  },

  answerQuestions: async (id: string, answers: QuestionAnswer[]) => {
    return api.post<Feature>(`/api/features/${id}/answers`, { answers });
  },

  // Issues
  getIssues: async (featureId: string, query?: { status?: IssueStatus; severity?: IssueSeverity; category?: IssueCategory }) => {
    const params = new URLSearchParams();
    if (query?.status) params.set('status', query.status);
    if (query?.severity) params.set('severity', query.severity);
    if (query?.category) params.set('category', query.category);

    return api.get<FeatureIssue[]>(
      `/api/features/${featureId}/issues${params.toString() ? `?${params}` : ''}`
    );
  },

  createIssue: async (featureId: string, data: {
    severity: IssueSeverity;
    category: IssueCategory;
    title: string;
    description: string;
    stepsToReproduce?: string;
    expectedBehavior?: string;
    actualBehavior?: string;
    filePath?: string;
    lineNumber?: number;
    pageUrl?: string;
    apiEndpoint?: string;
    screenshots?: string[];
    errorLogs?: string;
  }) => {
    return api.post<FeatureIssue>(`/api/features/${featureId}/issues`, data);
  },

  updateIssue: async (issueId: string, data: Partial<FeatureIssue>) => {
    return api.patch<FeatureIssue>(`/api/features/issues/${issueId}`, data);
  },

  resolveIssue: async (issueId: string, resolution: string) => {
    return api.post<FeatureIssue>(`/api/features/issues/${issueId}/resolve`, { resolution });
  },

  retestIssue: async (issueId: string, retestStatus: 'PASSED' | 'FAILED', retestNotes?: string) => {
    return api.post<FeatureIssue>(`/api/features/issues/${issueId}/retest`, { retestStatus, retestNotes });
  },

  // Test Accounts
  getTestAccounts: async (featureId: string) => {
    return api.get<FeatureTestAccount[]>(`/api/features/${featureId}/test-accounts`);
  },

  createTestAccount: async (featureId: string, data: {
    role: string;
    email: string;
    password: string;
    organizationId?: string;
    clientId?: string;
    companyId?: string;
    purpose: string;
  }) => {
    return api.post<FeatureTestAccount>(`/api/features/${featureId}/test-accounts`, data);
  },
};

// ═══════════════════════════════════════════════════════════════
// QA CHECKLIST API
// ═══════════════════════════════════════════════════════════════

export interface QACheckItem {
  code: string;
  category: string;
  title: string;
  description: string;
  severity: string;
  testSteps?: string[];
}

export const qaChecklistApi = {
  getStandard: async () => {
    return api.get<{
      checklist: QACheckItem[];
      categories: string[];
      totalChecks: number;
    }>('/api/qa-checklist/standard');
  },

  getByCategory: async (category: string) => {
    return api.get<{
      category: string;
      checks: QACheckItem[];
      totalChecks: number;
    }>(`/api/qa-checklist/category?category=${category}`);
  },

  generateForFeature: async (spec: {
    filesAdded?: string[];
    filesModified?: string[];
    apiEndpoints?: string[];
    uiPages?: string[];
    permissionsAdded?: string[];
  }) => {
    return api.post<{
      checklist: QACheckItem[];
      totalChecks: number;
      byCategory: Record<string, QACheckItem[]>;
    }>('/api/qa-checklist/generate', spec);
  },

  getSummary: async () => {
    return api.get<{
      totalChecks: number;
      bySeverity: Record<string, number>;
      byCategory: Record<string, number>;
      categories: string[];
    }>('/api/qa-checklist/summary');
  },
};

// ═══════════════════════════════════════════════════════════════
// CODE REVIEW CHECKLIST API
// ═══════════════════════════════════════════════════════════════

export enum CodeReviewCategory {
  CODE_QUALITY = 'CODE_QUALITY',
  ARCHITECTURE = 'ARCHITECTURE',
  TYPE_SAFETY = 'TYPE_SAFETY',
  ERROR_HANDLING = 'ERROR_HANDLING',
  MAINTAINABILITY = 'MAINTAINABILITY',
  TESTING = 'TESTING',
  SECURITY = 'SECURITY',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  INPUT_VALIDATION = 'INPUT_VALIDATION',
  OUTPUT_ENCODING = 'OUTPUT_ENCODING',
  CRYPTOGRAPHY = 'CRYPTOGRAPHY',
  SOC2 = 'SOC2',
  ISO27001 = 'ISO27001',
  PCI_DSS = 'PCI_DSS',
  GDPR = 'GDPR',
  PERFORMANCE = 'PERFORMANCE',
  DATABASE = 'DATABASE',
  API_DESIGN = 'API_DESIGN',
  LOGGING = 'LOGGING',
}

export interface CodeReviewCheckItem {
  code: string;
  category: CodeReviewCategory;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'SUGGESTION';
  complianceRef?: string;
  checkSteps: string[];
  failureImpact: string;
}

export interface CodeReviewCategoryInfo {
  category: CodeReviewCategory;
  label: string;
  description: string;
  totalChecks: number;
  criticalChecks: number;
  highChecks: number;
  isCompliance: boolean;
}

export const codeReviewChecklistApi = {
  getStandard: async () => {
    return api.get<{
      checklist: CodeReviewCheckItem[];
      categories: CodeReviewCategory[];
      totalChecks: number;
    }>('/api/code-review-checklist/standard');
  },

  getByCategory: async (category: CodeReviewCategory) => {
    return api.get<{
      category: CodeReviewCategory;
      checks: CodeReviewCheckItem[];
      totalChecks: number;
    }>(`/api/code-review-checklist/category?category=${category}`);
  },

  getSummary: async () => {
    return api.get<{
      totalChecks: number;
      bySeverity: Record<string, number>;
      byCategory: Record<string, number>;
      complianceBreakdown: {
        soc2: number;
        iso27001: number;
        pciDss: number;
        gdpr: number;
      };
    }>('/api/code-review-checklist/summary');
  },

  getCategories: async () => {
    return api.get<{
      categories: CodeReviewCategoryInfo[];
      totalCategories: number;
    }>('/api/code-review-checklist/categories');
  },
};

// ═══════════════════════════════════════════════════════════════
// STATUS HELPERS
// ═══════════════════════════════════════════════════════════════

export const STATUS_CONFIG: Record<FeatureStatus, { label: string; color: string; bgColor: string }> = {
  [FeatureStatus.DEVELOPMENT]: { label: 'Development', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  // Code Review Phase
  [FeatureStatus.READY_FOR_REVIEW]: { label: 'Ready for Review', color: 'text-violet-600', bgColor: 'bg-violet-100' },
  [FeatureStatus.CODE_REVIEW]: { label: 'Code Review', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  [FeatureStatus.REVIEW_FIXING]: { label: 'Review Fixing', color: 'text-fuchsia-600', bgColor: 'bg-fuchsia-100' },
  // QA Phase
  [FeatureStatus.READY_FOR_QA]: { label: 'Ready for QA', color: 'text-cyan-600', bgColor: 'bg-cyan-100' },
  [FeatureStatus.QA_IN_PROGRESS]: { label: 'QA In Progress', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  [FeatureStatus.QA_COMPLETE]: { label: 'QA Complete', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  [FeatureStatus.SR_REVIEW]: { label: 'Senior Review', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  [FeatureStatus.QUESTIONS_READY]: { label: 'Questions Ready', color: 'text-red-600', bgColor: 'bg-red-100' },
  [FeatureStatus.AWAITING_ANSWERS]: { label: 'Awaiting Answers', color: 'text-red-600', bgColor: 'bg-red-100' },
  [FeatureStatus.SR_FIXING]: { label: 'Fixing Issues', color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  [FeatureStatus.READY_FOR_RETEST]: { label: 'Ready for Retest', color: 'text-cyan-600', bgColor: 'bg-cyan-100' },
  [FeatureStatus.APPROVED]: { label: 'Approved', color: 'text-green-600', bgColor: 'bg-green-100' },
  [FeatureStatus.MERGED]: { label: 'Merged', color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  [FeatureStatus.CANCELLED]: { label: 'Cancelled', color: 'text-gray-600', bgColor: 'bg-gray-100' },
};

export const SEVERITY_CONFIG: Record<IssueSeverity, { label: string; color: string; bgColor: string }> = {
  [IssueSeverity.CRITICAL]: { label: 'Critical', color: 'text-red-600', bgColor: 'bg-red-100' },
  [IssueSeverity.HIGH]: { label: 'High', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  [IssueSeverity.MEDIUM]: { label: 'Medium', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  [IssueSeverity.LOW]: { label: 'Low', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  [IssueSeverity.SUGGESTION]: { label: 'Suggestion', color: 'text-gray-600', bgColor: 'bg-gray-100' },
};
