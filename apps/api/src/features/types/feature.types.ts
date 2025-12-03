// Feature Development Types
// Matches Prisma schema enums

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

export enum RetestStatus {
  PENDING = 'PENDING',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
}

export enum QACheckCategory {
  SECURITY = 'SECURITY',
  PERMISSIONS = 'PERMISSIONS',
  FUNCTIONALITY = 'FUNCTIONALITY',
  ERROR_HANDLING = 'ERROR_HANDLING',
  EDGE_CASES = 'EDGE_CASES',
  PERFORMANCE = 'PERFORMANCE',
  ACCESSIBILITY = 'ACCESSIBILITY',
  RESPONSIVE = 'RESPONSIVE',
  DATA_INTEGRITY = 'DATA_INTEGRITY',
  INTEGRATION = 'INTEGRATION',
  DOCUMENTATION = 'DOCUMENTATION',
}

// Activity actions
export const FEATURE_ACTIVITY_ACTIONS = {
  CREATED: 'CREATED',
  STATUS_CHANGED: 'STATUS_CHANGED',
  ISSUE_CREATED: 'ISSUE_CREATED',
  ISSUE_UPDATED: 'ISSUE_UPDATED',
  ISSUE_RESOLVED: 'ISSUE_RESOLVED',
  QUESTION_CREATED: 'QUESTION_CREATED',
  QUESTION_ANSWERED: 'QUESTION_ANSWERED',
  // Code Review actions
  CODE_REVIEW_STARTED: 'CODE_REVIEW_STARTED',
  CODE_REVIEW_COMPLETED: 'CODE_REVIEW_COMPLETED',
  REVIEW_FIX_STARTED: 'REVIEW_FIX_STARTED',
  // QA actions
  QA_STARTED: 'QA_STARTED',
  QA_COMPLETED: 'QA_COMPLETED',
  REVIEW_STARTED: 'REVIEW_STARTED',
  FIX_STARTED: 'FIX_STARTED',
  APPROVED: 'APPROVED',
  MERGED: 'MERGED',
  FILE_SYNCED: 'FILE_SYNCED',
} as const;

// AI Actors
export const AI_ACTORS = {
  QA_MANAGER: 'AI_QA_MANAGER',
  SR_DEVELOPER: 'AI_SR_DEVELOPER',
  SYSTEM: 'SYSTEM',
} as const;

// Status display config
export const STATUS_CONFIG: Record<FeatureStatus, { label: string; color: string; nextStatuses: FeatureStatus[] }> = {
  [FeatureStatus.DEVELOPMENT]: {
    label: 'Development',
    color: 'blue',
    nextStatuses: [FeatureStatus.READY_FOR_REVIEW, FeatureStatus.CANCELLED],
  },
  // Code Review Phase
  [FeatureStatus.READY_FOR_REVIEW]: {
    label: 'Ready for Review',
    color: 'violet',
    nextStatuses: [FeatureStatus.CODE_REVIEW, FeatureStatus.DEVELOPMENT],
  },
  [FeatureStatus.CODE_REVIEW]: {
    label: 'Code Review',
    color: 'purple',
    nextStatuses: [FeatureStatus.REVIEW_FIXING, FeatureStatus.READY_FOR_QA],
  },
  [FeatureStatus.REVIEW_FIXING]: {
    label: 'Review Fixing',
    color: 'fuchsia',
    nextStatuses: [FeatureStatus.CODE_REVIEW],
  },
  // QA Phase
  [FeatureStatus.READY_FOR_QA]: {
    label: 'Ready for QA',
    color: 'cyan',
    nextStatuses: [FeatureStatus.QA_IN_PROGRESS, FeatureStatus.DEVELOPMENT],
  },
  [FeatureStatus.QA_IN_PROGRESS]: {
    label: 'QA In Progress',
    color: 'yellow',
    nextStatuses: [FeatureStatus.QA_COMPLETE, FeatureStatus.APPROVED],
  },
  [FeatureStatus.QA_COMPLETE]: {
    label: 'QA Complete',
    color: 'orange',
    nextStatuses: [FeatureStatus.SR_REVIEW],
  },
  [FeatureStatus.SR_REVIEW]: {
    label: 'Senior Review',
    color: 'purple',
    nextStatuses: [FeatureStatus.QUESTIONS_READY, FeatureStatus.SR_FIXING, FeatureStatus.APPROVED],
  },
  [FeatureStatus.QUESTIONS_READY]: {
    label: 'Questions Ready',
    color: 'red',
    nextStatuses: [FeatureStatus.AWAITING_ANSWERS],
  },
  [FeatureStatus.AWAITING_ANSWERS]: {
    label: 'Awaiting Answers',
    color: 'red',
    nextStatuses: [FeatureStatus.SR_FIXING],
  },
  [FeatureStatus.SR_FIXING]: {
    label: 'Fixing Issues',
    color: 'indigo',
    nextStatuses: [FeatureStatus.READY_FOR_RETEST],
  },
  [FeatureStatus.READY_FOR_RETEST]: {
    label: 'Ready for Retest',
    color: 'cyan',
    nextStatuses: [FeatureStatus.QA_IN_PROGRESS],
  },
  [FeatureStatus.APPROVED]: {
    label: 'Approved',
    color: 'green',
    nextStatuses: [FeatureStatus.MERGED],
  },
  [FeatureStatus.MERGED]: {
    label: 'Merged',
    color: 'emerald',
    nextStatuses: [],
  },
  [FeatureStatus.CANCELLED]: {
    label: 'Cancelled',
    color: 'gray',
    nextStatuses: [],
  },
};

// Severity display config
export const SEVERITY_CONFIG: Record<IssueSeverity, { label: string; color: string; priority: number }> = {
  [IssueSeverity.CRITICAL]: { label: 'Critical', color: 'red', priority: 5 },
  [IssueSeverity.HIGH]: { label: 'High', color: 'orange', priority: 4 },
  [IssueSeverity.MEDIUM]: { label: 'Medium', color: 'yellow', priority: 3 },
  [IssueSeverity.LOW]: { label: 'Low', color: 'blue', priority: 2 },
  [IssueSeverity.SUGGESTION]: { label: 'Suggestion', color: 'gray', priority: 1 },
};

// Interfaces for API responses
export interface FeaturePipelineStats {
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
}

export interface FeatureStats {
  total: number;
  active: number;
  needsAttention: number;
  pipeline: FeaturePipelineStats;
  issuesByCategory: Record<IssueCategory, number>;
  issuesBySeverity: Record<IssueSeverity, number>;
}

export interface ReviewQuestion {
  id: string;
  question: string;
  context?: string;
  relatedIssueIds?: string[];
  answer?: string;
  answeredAt?: string;
}

export interface SpecDocument {
  summary: string;
  objectives: string[];
  filesAdded: string[];
  filesModified: string[];
  filesDeleted: string[];
  permissionsAdded: string[];
  apiEndpoints?: string[];
  uiPages?: string[];
  notes?: string;
}
