'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Zap,
  Clock,
  Users,
  AlertTriangle,
  Shield,
  Gift,
  CheckCircle,
  Bell,
  Search,
  Filter,
  RefreshCw,
  Copy,
  Eye,
  Play,
  Loader2,
  Tag,
  TrendingUp,
  Sparkles,
  Target,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { triggersApi, BehavioralTrigger, TriggerCategory, getTriggerCategory, BehavioralTriggerType } from '@/lib/api/momentum';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const CATEGORY_CONFIG: Record<TriggerCategory, { label: string; icon: typeof Zap; color: string }> = {
  URGENCY: { label: 'Urgency', icon: Clock, color: 'text-red-400 bg-red-500/10' },
  SCARCITY: { label: 'Scarcity', icon: AlertTriangle, color: 'text-orange-400 bg-orange-500/10' },
  SOCIAL_PROOF: { label: 'Social Proof', icon: Users, color: 'text-blue-400 bg-blue-500/10' },
  LOSS_AVERSION: { label: 'Loss Aversion', icon: Shield, color: 'text-purple-400 bg-purple-500/10' },
  AUTHORITY: { label: 'Authority', icon: CheckCircle, color: 'text-green-400 bg-green-500/10' },
  RECIPROCITY: { label: 'Reciprocity', icon: Gift, color: 'text-pink-400 bg-pink-500/10' },
  COMMITMENT: { label: 'Commitment', icon: Target, color: 'text-cyan-400 bg-cyan-500/10' },
  FOMO: { label: 'FOMO', icon: Bell, color: 'text-yellow-400 bg-yellow-500/10' },
};

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════

function EffectivenessDisplay({ effectiveness }: { effectiveness: { conversionLift: string; bestFor: string[]; avoid: string[] } }) {
  return (
    <div className="flex items-center gap-2">
      <TrendingUp className="w-3 h-3 text-green-400" />
      <span className="text-xs text-green-400 font-medium">{effectiveness.conversionLift}</span>
    </div>
  );
}

function TriggerCard({
  trigger,
  onPreview,
  onApply,
}: {
  trigger: BehavioralTrigger;
  onPreview: () => void;
  onApply: () => void;
}) {
  const category = getTriggerCategory(trigger.type);
  const categoryConfig = CATEGORY_CONFIG[category];
  const Icon = categoryConfig?.icon || Zap;

  return (
    <Card className="hover:border-primary/30 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={cn('p-2 rounded-lg', categoryConfig?.color)}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium">{trigger.name}</h3>
                <Badge variant="outline" className="text-xs">
                  {categoryConfig?.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">{trigger.description}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <EffectivenessDisplay effectiveness={trigger.effectiveness} />
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {trigger.useCases.slice(0, 3).map((useCase) => (
                  <Badge key={useCase} variant="secondary" className="text-xs">
                    {useCase}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button variant="outline" size="sm" onClick={onPreview}>
              <Eye className="w-4 h-4 mr-1" />
              Preview
            </Button>
            <Button size="sm" onClick={onApply}>
              <Play className="w-4 h-4 mr-1" />
              Apply
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function TriggersPage() {
  const [triggers, setTriggers] = useState<BehavioralTrigger[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedTrigger, setSelectedTrigger] = useState<BehavioralTrigger | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showApply, setShowApply] = useState(false);
  const [applyContent, setApplyContent] = useState('');
  const [applyVariables, setApplyVariables] = useState<Record<string, string>>({});

  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await triggersApi.getAll();
      setTriggers(data);
    } catch (err: any) {
      console.error('Failed to load triggers:', err);
      setError(err.message || 'Failed to load triggers');
      // Clear data on error - no mock/fake data
      setTriggers([]);
      toast.error('Failed to load triggers. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredTriggers = triggers.filter((t) => {
    const matchesSearch =
      search === '' ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());
    const category = getTriggerCategory(t.type);
    const matchesCategory = categoryFilter === 'all' || category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handlePreview = (trigger: BehavioralTrigger) => {
    setSelectedTrigger(trigger);
    setShowPreview(true);
  };

  const handleApply = (trigger: BehavioralTrigger) => {
    setSelectedTrigger(trigger);
    setApplyContent('');
    setApplyVariables({});
    setShowApply(true);
  };

  const handleApplyTrigger = async () => {
    if (!selectedTrigger || !applyContent) return;

    try {
      const result = await triggersApi.applyToContent({
        content: applyContent,
        triggers: [selectedTrigger.type],
        variables: applyVariables,
      });
      toast.success('Trigger applied successfully');
      setApplyContent(result.enhancedContent);
    } catch (err: any) {
      toast.error(err.message || 'Failed to apply trigger. Please try again.');
    }
  };

  const handleCopyExample = (example: { before: string; after: string }) => {
    navigator.clipboard.writeText(example.after);
    toast.success('Example copied to clipboard');
  };

  const categoryStats = triggers.reduce((acc, t) => {
    const category = getTriggerCategory(t.type);
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <>
      <Header
        title="Behavioral Triggers"
        subtitle="Psychological triggers to enhance conversion"
        actions={
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
            Refresh
          </Button>
        }
      />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Category Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Object.entries(CATEGORY_CONFIG).slice(0, 4).map(([category, config]) => {
            const Icon = config.icon;
            return (
              <Card
                key={category}
                className={cn(
                  'cursor-pointer transition-colors',
                  categoryFilter === category && 'border-primary'
                )}
                onClick={() => setCategoryFilter(categoryFilter === category ? 'all' : category)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn('p-2 rounded-lg', config.color)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold">{categoryStats[category] || 0}</p>
                      <p className="text-xs text-muted-foreground">{config.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search triggers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Trigger List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredTriggers.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No triggers found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search or filter criteria.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredTriggers.map((trigger) => (
              <TriggerCard
                key={trigger.type}
                trigger={trigger}
                onPreview={() => handlePreview(trigger)}
                onApply={() => handleApply(trigger)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTrigger?.name}</DialogTitle>
            <DialogDescription>{selectedTrigger?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm text-muted-foreground">Principle</Label>
              <p className="mt-2 text-sm">{selectedTrigger?.principle}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Effectiveness</Label>
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-medium text-green-400">{selectedTrigger?.effectiveness.conversionLift}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">Best for: </span>
                  {selectedTrigger?.effectiveness.bestFor.join(', ')}
                </div>
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">Avoid: </span>
                  {selectedTrigger?.effectiveness.avoid.join(', ')}
                </div>
              </div>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Use Cases</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedTrigger?.useCases.map((useCase) => (
                  <Badge key={useCase} variant="outline">
                    {useCase}
                  </Badge>
                ))}
              </div>
            </div>
            {selectedTrigger?.examples && selectedTrigger.examples.length > 0 && (
              <div>
                <Label className="text-sm text-muted-foreground">Examples</Label>
                <div className="mt-2 space-y-3">
                  {selectedTrigger.examples.slice(0, 2).map((example, i) => (
                    <div key={i} className="p-3 bg-muted rounded-lg text-sm">
                      <p className="text-xs text-muted-foreground mb-2">{example.context}</p>
                      <div className="space-y-1">
                        <p><span className="text-red-400">Before:</span> {example.before}</p>
                        <p><span className="text-green-400">After:</span> {example.after}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">{example.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            {selectedTrigger?.examples && selectedTrigger.examples.length > 0 && (
              <Button
                variant="outline"
                onClick={() => handleCopyExample(selectedTrigger.examples[0])}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Example
              </Button>
            )}
            <Button onClick={() => {
              setShowPreview(false);
              handleApply(selectedTrigger!);
            }}>
              <Play className="w-4 h-4 mr-2" />
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Apply Modal */}
      <Dialog open={showApply} onOpenChange={setShowApply}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Apply Trigger: {selectedTrigger?.name}</DialogTitle>
            <DialogDescription>
              Enter your content to apply this behavioral trigger.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={applyContent}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setApplyContent(e.target.value)}
                placeholder="Enter your email, SMS, or web content here..."
                rows={6}
              />
            </div>
            {selectedTrigger?.useCases && selectedTrigger.useCases.length > 0 && (
              <div>
                <Label className="text-sm text-muted-foreground">Best for these contexts:</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedTrigger.useCases.map((useCase) => (
                    <Badge key={useCase} variant="secondary" className="text-xs">
                      {useCase}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApply(false)}>
              Cancel
            </Button>
            <Button onClick={handleApplyTrigger} disabled={!applyContent}>
              <Sparkles className="w-4 h-4 mr-2" />
              Apply Trigger
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
