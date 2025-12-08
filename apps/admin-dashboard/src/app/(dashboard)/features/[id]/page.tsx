'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  GitBranch,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Bug,
  MessageSquare,
  Send,
  RefreshCw,
  ChevronRight,
  ExternalLink,
  FileText,
  User,
  Calendar,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { useHierarchy } from '@/contexts/hierarchy-context';
import {
  featuresApi,
  Feature,
  FeatureStatus,
  FeatureIssue,
  FeatureActivity,
  ReviewQuestion,
  QuestionAnswer,
  STATUS_CONFIG,
  SEVERITY_CONFIG,
  IssueSeverity,
  IssueStatus,
} from '@/lib/api/features';

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════

function StatusBadge({ status }: { status: FeatureStatus }) {
  const config = STATUS_CONFIG[status] || { label: status, color: 'text-zinc-400', bgColor: 'bg-zinc-500/10' };
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
      config.bgColor,
      config.color
    )}>
      {config.label}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: IssueSeverity }) {
  const config = SEVERITY_CONFIG[severity] || { label: severity, color: 'text-zinc-400', bgColor: 'bg-zinc-500/10' };
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
      config.bgColor,
      config.color
    )}>
      {config.label}
    </span>
  );
}

function IssueStatusBadge({ status }: { status: IssueStatus }) {
  const config: Record<IssueStatus, { label: string; color: string }> = {
    [IssueStatus.OPEN]: { label: 'Open', color: 'bg-red-500/10 text-red-400' },
    [IssueStatus.IN_PROGRESS]: { label: 'In Progress', color: 'bg-yellow-500/10 text-yellow-400' },
    [IssueStatus.RESOLVED]: { label: 'Resolved', color: 'bg-green-500/10 text-green-400' },
    [IssueStatus.WONT_FIX]: { label: "Won't Fix", color: 'bg-zinc-500/10 text-zinc-400' },
    [IssueStatus.DUPLICATE]: { label: 'Duplicate', color: 'bg-zinc-500/10 text-zinc-400' },
    [IssueStatus.CANNOT_REPRODUCE]: { label: 'Cannot Reproduce', color: 'bg-zinc-500/10 text-zinc-400' },
  };
  const c = config[status] || { label: status, color: 'bg-zinc-500/10 text-zinc-400' };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', c.color)}>
      {c.label}
    </span>
  );
}

function InfoCard({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-zinc-500 mb-1">{label}</p>
          <p className="text-sm text-white">{value}</p>
        </div>
        {Icon && <Icon className="w-4 h-4 text-zinc-500" />}
      </div>
    </div>
  );
}

function QuestionCard({
  question,
  index,
  answer,
  onAnswerChange,
  disabled,
}: {
  question: ReviewQuestion;
  index: number;
  answer: string;
  onAnswerChange: (value: string) => void;
  disabled?: boolean;
}) {
  const isAnswered = !!question.answer;

  return (
    <div className={cn(
      'border rounded-xl p-5 transition-all',
      isAnswered
        ? 'bg-green-500/5 border-green-500/20'
        : 'bg-zinc-900/50 border-zinc-800'
    )}>
      <div className="flex items-start gap-3 mb-4">
        <div className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0',
          isAnswered
            ? 'bg-green-500/20 text-green-400'
            : 'bg-cyan-500/20 text-cyan-400'
        )}>
          {isAnswered ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-white">{question.question}</p>
          {question.context && (
            <p className="text-xs text-zinc-500 mt-1">{question.context}</p>
          )}
        </div>
      </div>

      {isAnswered ? (
        <div className="ml-10">
          <div className="bg-zinc-800/50 rounded-lg p-3">
            <p className="text-sm text-zinc-300">{question.answer}</p>
            {question.answeredAt && (
              <p className="text-xs text-zinc-500 mt-2">
                Answered {new Date(question.answeredAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="ml-10">
          <textarea
            value={answer}
            onChange={(e) => onAnswerChange(e.target.value)}
            disabled={disabled}
            placeholder="Enter your answer..."
            rows={3}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none disabled:opacity-50"
          />
        </div>
      )}
    </div>
  );
}

function IssueCard({ issue }: { issue: FeatureIssue }) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-all">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4 text-zinc-400" />
          <span className="text-xs font-mono text-zinc-500">{issue.code}</span>
        </div>
        <div className="flex items-center gap-2">
          <SeverityBadge severity={issue.severity} />
          <IssueStatusBadge status={issue.status} />
        </div>
      </div>
      <h4 className="text-sm font-medium text-white mb-1">{issue.title}</h4>
      <p className="text-xs text-zinc-500 line-clamp-2">{issue.description}</p>
      {issue.filePath && (
        <div className="flex items-center gap-1 mt-2 text-xs text-zinc-500">
          <FileText className="w-3 h-3" />
          {issue.filePath}
          {issue.lineNumber && `:${issue.lineNumber}`}
        </div>
      )}
    </div>
  );
}

function ActivityItem({ activity }: { activity: FeatureActivity }) {
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATED':
        return <GitBranch className="w-4 h-4 text-cyan-400" />;
      case 'STATUS_CHANGED':
        return <RefreshCw className="w-4 h-4 text-purple-400" />;
      case 'ISSUE_CREATED':
        return <Bug className="w-4 h-4 text-red-400" />;
      case 'ISSUE_RESOLVED':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'QUESTION_ANSWERED':
        return <MessageSquare className="w-4 h-4 text-blue-400" />;
      default:
        return <Clock className="w-4 h-4 text-zinc-400" />;
    }
  };

  const formatAction = (action: string, details?: Record<string, unknown>) => {
    switch (action) {
      case 'CREATED':
        return 'Created feature';
      case 'STATUS_CHANGED':
        return `Changed status to ${details?.toStatus || 'unknown'}`;
      case 'ISSUE_CREATED':
        return `Created issue: ${details?.title || details?.issueCode || 'unknown'}`;
      case 'ISSUE_RESOLVED':
        return `Resolved issue: ${details?.issueCode || 'unknown'}`;
      case 'QUESTION_ANSWERED':
        return `Answered ${details?.answersCount || 1} question(s)`;
      default:
        return action.replace(/_/g, ' ').toLowerCase();
    }
  };

  return (
    <div className="flex items-start gap-3 py-3">
      <div className="mt-0.5">{getActionIcon(activity.action)}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-300">{formatAction(activity.action, activity.details)}</p>
        <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
          <span>{activity.performedByName || activity.performedBy}</span>
          <span>&middot;</span>
          <span>{new Date(activity.performedAt).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function FeatureDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { accessLevel } = useHierarchy();
  const featureId = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';

  // State
  const [feature, setFeature] = useState<Feature | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Q&A State
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'overview' | 'issues' | 'questions' | 'activity'>('overview');

  // Check if user has access (org-only)
  const hasAccess = accessLevel === 'ORGANIZATION';

  const fetchFeature = useCallback(async () => {
    if (!hasAccess || !featureId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await featuresApi.get(featureId);
      setFeature(data);

      // Initialize answers state
      if (data.reviewQuestions) {
        const initialAnswers: Record<string, string> = {};
        data.reviewQuestions.forEach((q) => {
          if (!q.answer) {
            initialAnswers[q.id] = '';
          }
        });
        setAnswers(initialAnswers);
      }
    } catch (err) {
      console.error('Failed to fetch feature:', err);
      setError('Failed to load feature. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [hasAccess, featureId]);

  useEffect(() => {
    fetchFeature();
  }, [fetchFeature]);

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmitAnswers = async () => {
    if (!feature) return;

    const answersToSubmit: QuestionAnswer[] = Object.entries(answers)
      .filter(([_, value]) => value.trim())
      .map(([questionId, answer]) => ({ questionId, answer }));

    if (answersToSubmit.length === 0) {
      return;
    }

    setSubmitting(true);
    try {
      await featuresApi.answerQuestions(feature.id, answersToSubmit);
      await fetchFeature();
    } catch (err) {
      console.error('Failed to submit answers:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Check for pending questions
  const pendingQuestions = feature?.reviewQuestions?.filter((q) => !q.answer) || [];
  const hasQuestionsToAnswer = pendingQuestions.length > 0 &&
    (feature?.status === FeatureStatus.QUESTIONS_READY || feature?.status === FeatureStatus.AWAITING_ANSWERS);

  // Access denied view
  if (!hasAccess) {
    return (
      <>
        <Header title="Feature" backLink={{ href: '/features', label: 'Features' }} />
        <div className="p-6">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Lock className="w-12 h-12 text-zinc-600 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Access Restricted</h3>
            <p className="text-sm text-zinc-500 max-w-md">
              The Feature Management system is only available to organization administrators.
            </p>
          </div>
        </div>
      </>
    );
  }

  // Loading state
  if (loading) {
    return (
      <>
        <Header title="Feature" backLink={{ href: '/features', label: 'Features' }} />
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <RefreshCw className="w-6 h-6 text-zinc-500 animate-spin" />
        </div>
      </>
    );
  }

  // Error state
  if (error || !feature) {
    return (
      <>
        <Header title="Feature" backLink={{ href: '/features', label: 'Features' }} />
        <div className="p-6">
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error || 'Feature not found'}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title={feature.code}
        subtitle={feature.name}
        badge={<StatusBadge status={feature.status as FeatureStatus} />}
        backLink={{ href: '/features', label: 'Features' }}
        actions={
          <div className="flex items-center gap-2">
            {hasQuestionsToAnswer && (
              <span className="px-2 py-1 bg-red-500/10 text-red-400 text-xs rounded-full flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {pendingQuestions.length} questions
              </span>
            )}
            <Button variant="outline" size="sm" onClick={fetchFeature}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        }
      />

      <div className="p-4 md:p-6 space-y-6">
        {/* Tab Navigation */}
        <div className="flex items-center gap-1 p-1 bg-zinc-900/50 border border-zinc-800 rounded-lg w-fit">
          {(['overview', 'issues', 'questions', 'activity'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize',
                activeTab === tab
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              )}
            >
              {tab}
              {tab === 'issues' && feature.issuesFound > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-zinc-800 rounded text-xs">
                  {feature.issuesFound}
                </span>
              )}
              {tab === 'questions' && hasQuestionsToAnswer && (
                <span className="ml-2 px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded text-xs">
                  {pendingQuestions.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <InfoCard label="Branch" value={feature.branch} icon={GitBranch} />
              <InfoCard
                label="Developer"
                value={feature.developerName || feature.developerId || 'Unassigned'}
                icon={User}
              />
              <InfoCard
                label="QA Rounds"
                value={feature.qaRounds > 0 ? `Round ${feature.qaRounds}` : 'Not started'}
                icon={RefreshCw}
              />
              <InfoCard
                label="Created"
                value={new Date(feature.createdAt).toLocaleDateString()}
                icon={Calendar}
              />
            </div>

            {/* Issue Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-zinc-500">Issues Found</span>
                  <Bug className="w-4 h-4 text-red-400" />
                </div>
                <p className="text-2xl font-bold text-white">{feature.issuesFound}</p>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-zinc-500">Issues Resolved</span>
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                </div>
                <p className="text-2xl font-bold text-white">{feature.issuesResolved}</p>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-zinc-500">Remaining</span>
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                </div>
                <p className="text-2xl font-bold text-white">
                  {feature.issuesFound - feature.issuesResolved}
                </p>
              </div>
            </div>

            {/* Description */}
            {feature.description && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
                <h3 className="text-sm font-medium text-white mb-3">Description</h3>
                <p className="text-sm text-zinc-400">{feature.description}</p>
              </div>
            )}

            {/* Timeline */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
              <h3 className="text-sm font-medium text-white mb-4">Timeline</h3>
              <div className="space-y-3 text-sm">
                {feature.qaStartedAt && (
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Clock className="w-4 h-4" />
                    QA Started: {new Date(feature.qaStartedAt).toLocaleString()}
                  </div>
                )}
                {feature.reviewStartedAt && (
                  <div className="flex items-center gap-2 text-zinc-400">
                    <User className="w-4 h-4" />
                    Review Started: {new Date(feature.reviewStartedAt).toLocaleString()}
                  </div>
                )}
                {feature.questionsReadyAt && (
                  <div className="flex items-center gap-2 text-zinc-400">
                    <MessageSquare className="w-4 h-4" />
                    Questions Ready: {new Date(feature.questionsReadyAt).toLocaleString()}
                  </div>
                )}
                {feature.answeredAt && (
                  <div className="flex items-center gap-2 text-zinc-400">
                    <CheckCircle2 className="w-4 h-4" />
                    Answered: {new Date(feature.answeredAt).toLocaleString()}
                  </div>
                )}
                {feature.approvedAt && (
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle2 className="w-4 h-4" />
                    Approved: {new Date(feature.approvedAt).toLocaleString()}
                  </div>
                )}
                {feature.mergedAt && (
                  <div className="flex items-center gap-2 text-cyan-400">
                    <GitBranch className="w-4 h-4" />
                    Merged: {new Date(feature.mergedAt).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Issues Tab */}
        {activeTab === 'issues' && (
          <div className="space-y-4">
            {feature.issues && feature.issues.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {feature.issues.map((issue) => (
                  <IssueCard key={issue.id} issue={issue} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Bug className="w-12 h-12 text-zinc-600 mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No issues found</h3>
                <p className="text-sm text-zinc-500">
                  QA has not identified any issues with this feature yet.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Questions Tab */}
        {activeTab === 'questions' && (
          <div className="space-y-6">
            {feature.reviewQuestions && feature.reviewQuestions.length > 0 ? (
              <>
                <div className="space-y-4">
                  {feature.reviewQuestions.map((question, index) => (
                    <QuestionCard
                      key={question.id}
                      question={question}
                      index={index}
                      answer={answers[question.id] || ''}
                      onAnswerChange={(value) => handleAnswerChange(question.id, value)}
                      disabled={!!question.answer || submitting}
                    />
                  ))}
                </div>

                {hasQuestionsToAnswer && (
                  <div className="flex items-center justify-end gap-4 pt-4 border-t border-zinc-800">
                    <p className="text-sm text-zinc-500">
                      {Object.values(answers).filter((a) => a.trim()).length} of {pendingQuestions.length} answered
                    </p>
                    <Button
                      onClick={handleSubmitAnswers}
                      disabled={submitting || Object.values(answers).every((a) => !a.trim())}
                    >
                      {submitting ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 mr-2" />
                      )}
                      Submit Answers
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <MessageSquare className="w-12 h-12 text-zinc-600 mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No questions yet</h3>
                <p className="text-sm text-zinc-500">
                  Senior review has not generated any questions for this feature yet.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl">
            {feature.activities && feature.activities.length > 0 ? (
              <div className="divide-y divide-zinc-800">
                {feature.activities.map((activity) => (
                  <div key={activity.id} className="px-5">
                    <ActivityItem activity={activity} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Clock className="w-12 h-12 text-zinc-600 mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No activity yet</h3>
                <p className="text-sm text-zinc-500">
                  Activity will be recorded as the feature progresses through the pipeline.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
