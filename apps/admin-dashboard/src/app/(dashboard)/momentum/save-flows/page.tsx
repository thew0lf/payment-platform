'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Settings,
  Play,
  Pause,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  RefreshCw,
  ChevronRight,
  Loader2,
  ArrowRight,
  ToggleLeft,
  ToggleRight,
  Zap,
  Target,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useHierarchy } from '@/contexts/hierarchy-context';
import {
  saveFlowApi,
  SaveFlowConfig,
  SaveAttempt,
  SaveFlowStats,
  SaveFlowStage,
} from '@/lib/api/momentum';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const STAGE_CONFIG: Record<SaveFlowStage, { label: string; description: string; color: string }> = {
  PATTERN_INTERRUPT: {
    label: 'Pattern Interrupt',
    description: 'Initial engagement to break cancellation intent',
    color: 'bg-purple-500',
  },
  DIAGNOSIS: {
    label: 'Diagnosis',
    description: 'Understand the reason for cancellation',
    color: 'bg-blue-500',
  },
  BRANCHING: {
    label: 'Branching',
    description: 'Route based on cancellation reason',
    color: 'bg-cyan-500',
  },
  NUCLEAR_OFFER: {
    label: 'Nuclear Offer',
    description: 'Present the best possible retention offer',
    color: 'bg-yellow-500',
  },
  LOSS_VISUALIZATION: {
    label: 'Loss Visualization',
    description: 'Show what they\'ll lose by cancelling',
    color: 'bg-orange-500',
  },
  EXIT_SURVEY: {
    label: 'Exit Survey',
    description: 'Collect feedback if cancellation proceeds',
    color: 'bg-red-500',
  },
  WINBACK: {
    label: 'Winback',
    description: 'Schedule future re-engagement',
    color: 'bg-green-500',
  },
};

const STAGE_ORDER: SaveFlowStage[] = [
  'PATTERN_INTERRUPT',
  'DIAGNOSIS',
  'BRANCHING',
  'NUCLEAR_OFFER',
  'LOSS_VISUALIZATION',
  'EXIT_SURVEY',
  'WINBACK',
];

// Map backend stage property names to frontend stage names
const STAGE_PROPERTY_MAP: Record<string, SaveFlowStage> = {
  patternInterrupt: 'PATTERN_INTERRUPT',
  diagnosisSurvey: 'DIAGNOSIS',
  branchingInterventions: 'BRANCHING',
  nuclearOffer: 'NUCLEAR_OFFER',
  lossVisualization: 'LOSS_VISUALIZATION',
  exitSurvey: 'EXIT_SURVEY',
  winback: 'WINBACK',
};

// Transform backend config format to frontend expected format
function transformConfigFromBackend(backendConfig: any): SaveFlowConfig {
  // If config already has stages array, return as-is
  if (backendConfig.stages && Array.isArray(backendConfig.stages)) {
    return backendConfig as SaveFlowConfig;
  }

  // Transform individual stage properties into stages array
  const stages = STAGE_ORDER.map((stageName) => {
    const propertyName = Object.entries(STAGE_PROPERTY_MAP).find(
      ([_, v]) => v === stageName
    )?.[0];

    const stageConfig = propertyName ? backendConfig[propertyName] : null;

    return {
      stage: stageName,
      enabled: stageConfig?.enabled ?? false,
      template: stageConfig?.template,
      retryCount: stageConfig?.retryCount ?? 0,
      delayMinutes: stageConfig?.delayMinutes ?? 0,
    };
  });

  return {
    id: backendConfig.id || '',
    companyId: backendConfig.companyId || '',
    isEnabled: backendConfig.enabled ?? false,
    stages,
    defaultOffers: backendConfig.defaultOffers || [],
    escalationThreshold: backendConfig.escalationThreshold || 0,
    createdAt: backendConfig.createdAt || new Date().toISOString(),
    updatedAt: backendConfig.updatedAt || new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════

function StageCard({
  stage,
  config,
  onToggle,
}: {
  stage: SaveFlowStage;
  config: { enabled: boolean; retryCount: number; delayMinutes: number };
  onToggle: () => void;
}) {
  const stageInfo = STAGE_CONFIG[stage];
  const stageIndex = STAGE_ORDER.indexOf(stage);

  return (
    <div className="flex items-center gap-4">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center text-white font-bold',
            config.enabled ? stageInfo.color : 'bg-muted text-muted-foreground'
          )}
        >
          {stageIndex + 1}
        </div>
        {stageIndex < STAGE_ORDER.length - 1 && (
          <div className={cn('w-0.5 h-8 mt-2', config.enabled ? 'bg-border' : 'bg-muted')} />
        )}
      </div>
      <Card className={cn('flex-1', !config.enabled && 'opacity-50')}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-medium">{stageInfo.label}</h3>
                {config.enabled ? (
                  <Badge variant="outline" className="text-green-400 bg-green-500/10 border-green-500/20">
                    Active
                  </Badge>
                ) : (
                  <Badge variant="secondary">Disabled</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{stageInfo.description}</p>
              {config.enabled && (
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span>Retry: {config.retryCount}x</span>
                  <span>Delay: {config.delayMinutes}min</span>
                </div>
              )}
            </div>
            <Switch checked={config.enabled} onCheckedChange={onToggle} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AttemptCard({ attempt }: { attempt: SaveAttempt }) {
  const currentStageIndex = STAGE_ORDER.indexOf(attempt.currentStage);
  const progress = ((currentStageIndex + 1) / STAGE_ORDER.length) * 100;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <Link
              href={`/customers/${attempt.customerId}`}
              className="font-medium hover:text-primary"
            >
              {attempt.customer?.firstName} {attempt.customer?.lastName}
            </Link>
            <p className="text-sm text-muted-foreground">{attempt.customer?.email}</p>
          </div>
          <Badge variant="secondary">
            {STAGE_CONFIG[attempt.currentStage]?.label || attempt.currentStage}
          </Badge>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <span>Started: {new Date(attempt.startedAt).toLocaleString()}</span>
          <span>Stage {currentStageIndex + 1} of {STAGE_ORDER.length}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function SaveFlowsPage() {
  const { selectedCompanyId } = useHierarchy();
  const [config, setConfig] = useState<SaveFlowConfig | null>(null);
  const [activeAttempts, setActiveAttempts] = useState<SaveAttempt[]>([]);
  const [stats, setStats] = useState<SaveFlowStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);

  const companyId = selectedCompanyId || 'default';

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [configData, attemptsData, statsData] = await Promise.all([
        saveFlowApi.getConfig(companyId).catch(() => null),
        saveFlowApi.getActiveAttempts(companyId, { limit: 10 }).catch(() => ({ items: [], total: 0 })),
        saveFlowApi.getStats(companyId).catch(() => null),
      ]);

      if (configData) {
        // Transform backend format to frontend expected format
        setConfig(transformConfigFromBackend(configData));
      } else {
        // Set default empty config - no mock data
        setConfig({
          id: '',
          companyId,
          isEnabled: false,
          stages: STAGE_ORDER.map((stage) => ({
            stage,
            enabled: false,
            retryCount: 0,
            delayMinutes: 0,
          })),
          defaultOffers: [],
          escalationThreshold: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      setActiveAttempts(attemptsData.items);

      if (statsData) {
        setStats(statsData);
      } else {
        // Empty stats - no mock data
        setStats({
          totalAttempts: 0,
          inProgress: 0,
          saved: 0,
          cancelled: 0,
          paused: 0,
          downgraded: 0,
          successRate: 0,
          avgTimeToSave: 0,
          stagePerformance: [],
          revenuePreserved: 0,
        });
      }
    } catch (err: any) {
      console.error('Failed to load save flow data:', err);
      toast.error('Failed to load save flow data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleEnabled = async () => {
    if (!config) return;
    const newConfig = { ...config, isEnabled: !config.isEnabled };
    setConfig(newConfig);
    try {
      await saveFlowApi.updateConfig(companyId, { isEnabled: newConfig.isEnabled });
      toast.success(newConfig.isEnabled ? 'Save flow enabled' : 'Save flow disabled');
    } catch (err) {
      toast.error('Failed to update config');
      setConfig(config);
    }
  };

  const handleToggleStage = async (stage: SaveFlowStage) => {
    if (!config) return;
    const newStages = config.stages.map((s) =>
      s.stage === stage ? { ...s, enabled: !s.enabled } : s
    );
    const newConfig = { ...config, stages: newStages };
    setConfig(newConfig);
    try {
      await saveFlowApi.updateConfig(companyId, { stages: newStages });
      toast.success('Stage updated');
    } catch (err) {
      toast.error('Failed to update stage');
      setConfig(config);
    }
  };

  if (isLoading) {
    return (
      <>
        <Header title="Save Flows" subtitle="Customer retention automation" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title="Save Flows"
        subtitle="Customer retention automation"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setShowConfigModal(true)}>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
        }
      />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Master Toggle */}
        <Card className={cn(config?.isEnabled ? 'border-green-500/30 bg-green-500/5' : 'border-border')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {config?.isEnabled ? (
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <Zap className="w-5 h-5 text-green-400" />
                  </div>
                ) : (
                  <div className="p-2 bg-muted rounded-lg">
                    <Pause className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <h2 className="font-semibold">Save Flow Engine</h2>
                  <p className="text-sm text-muted-foreground">
                    {config?.isEnabled
                      ? 'Actively intercepting cancellation attempts'
                      : 'Paused - cancellations will proceed normally'}
                  </p>
                </div>
              </div>
              <Switch
                checked={config?.isEnabled || false}
                onCheckedChange={handleToggleEnabled}
              />
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Target className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">{stats.totalAttempts}</p>
                    <p className="text-xs text-muted-foreground">Total Attempts</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">{stats.successRate.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">Success Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <DollarSign className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">${(stats.revenuePreserved / 1000).toFixed(1)}k</p>
                    <p className="text-xs text-muted-foreground">Revenue Preserved</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <Clock className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">{stats.avgTimeToSave.toFixed(1)}m</p>
                    <p className="text-xs text-muted-foreground">Avg Time to Save</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Flow Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Flow Stages</CardTitle>
              <CardDescription>Configure each stage of the save flow</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {config?.stages?.map((stage) => (
                <StageCard
                  key={stage.stage}
                  stage={stage.stage}
                  config={stage}
                  onToggle={() => handleToggleStage(stage.stage)}
                />
              ))}
            </CardContent>
          </Card>

          {/* Active Attempts */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Active Save Attempts</CardTitle>
                  <CardDescription>{stats?.inProgress || 0} customers in flow</CardDescription>
                </div>
                <Badge variant="secondary">{activeAttempts.length} shown</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeAttempts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No active save attempts</p>
                </div>
              ) : (
                activeAttempts.map((attempt) => (
                  <AttemptCard key={attempt.id} attempt={attempt} />
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Stage Performance */}
        {stats?.stagePerformance && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Stage Performance</CardTitle>
              <CardDescription>Save rate by flow stage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.stagePerformance.map((stage, i) => (
                  <div key={stage.stage} className="flex items-center gap-4">
                    <div className="w-32 text-sm font-medium truncate">
                      {STAGE_CONFIG[stage.stage as SaveFlowStage]?.label || stage.stage}
                    </div>
                    <div className="flex-1">
                      <Progress value={stage.rate} className="h-3" />
                    </div>
                    <div className="w-20 text-right">
                      <span className="text-sm font-medium">{stage.rate}%</span>
                      <span className="text-xs text-muted-foreground ml-1">({stage.saves})</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
