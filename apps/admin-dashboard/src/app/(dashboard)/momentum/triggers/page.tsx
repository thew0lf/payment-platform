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
import { triggersApi, BehavioralTrigger, TriggerCategory } from '@/lib/api/momentum';

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

// Mock triggers data
const MOCK_TRIGGERS: BehavioralTrigger[] = [
  {
    id: '1',
    name: 'Limited Time Offer',
    code: 'URGENCY_LIMITED_TIME',
    category: 'URGENCY',
    description: 'Creates urgency with a countdown timer or deadline',
    template: 'Offer expires in {{timeRemaining}}! Act now to save {{discount}}.',
    variables: ['timeRemaining', 'discount'],
    effectiveness: 85,
    usageCount: 1250,
    isActive: true,
    contexts: ['email', 'web', 'sms'],
  },
  {
    id: '2',
    name: 'Low Stock Alert',
    code: 'SCARCITY_LOW_STOCK',
    category: 'SCARCITY',
    description: 'Shows limited inventory to encourage quick decisions',
    template: 'Only {{quantity}} left in stock! {{viewerCount}} people viewing now.',
    variables: ['quantity', 'viewerCount'],
    effectiveness: 78,
    usageCount: 890,
    isActive: true,
    contexts: ['web', 'email'],
  },
  {
    id: '3',
    name: 'Recent Purchases',
    code: 'SOCIAL_RECENT_PURCHASES',
    category: 'SOCIAL_PROOF',
    description: 'Shows recent customer activity and purchases',
    template: '{{customerName}} from {{location}} just purchased this {{timeAgo}}.',
    variables: ['customerName', 'location', 'timeAgo'],
    effectiveness: 72,
    usageCount: 2100,
    isActive: true,
    contexts: ['web'],
  },
  {
    id: '4',
    name: 'You\'ll Miss Out',
    code: 'LOSS_AVERSION_MISS_OUT',
    category: 'LOSS_AVERSION',
    description: 'Highlights what the customer will lose by not acting',
    template: 'Don\'t miss out on {{benefit}}! Your {{reward}} expires {{deadline}}.',
    variables: ['benefit', 'reward', 'deadline'],
    effectiveness: 81,
    usageCount: 560,
    isActive: true,
    contexts: ['email', 'sms'],
  },
  {
    id: '5',
    name: 'Expert Recommendation',
    code: 'AUTHORITY_EXPERT',
    category: 'AUTHORITY',
    description: 'Leverages expert endorsements and certifications',
    template: 'Recommended by {{expertName}}, {{expertTitle}}. Trusted by {{customerCount}}+ customers.',
    variables: ['expertName', 'expertTitle', 'customerCount'],
    effectiveness: 68,
    usageCount: 340,
    isActive: true,
    contexts: ['web', 'email'],
  },
  {
    id: '6',
    name: 'Free Gift',
    code: 'RECIPROCITY_FREE_GIFT',
    category: 'RECIPROCITY',
    description: 'Offers something free to encourage reciprocal action',
    template: 'Get a FREE {{giftName}} (worth ${{giftValue}}) with your order today!',
    variables: ['giftName', 'giftValue'],
    effectiveness: 76,
    usageCount: 720,
    isActive: true,
    contexts: ['email', 'web', 'sms'],
  },
  {
    id: '7',
    name: 'Almost There',
    code: 'COMMITMENT_ALMOST_THERE',
    category: 'COMMITMENT',
    description: 'Leverages progress and sunk cost to encourage completion',
    template: 'You\'re {{progress}}% there! Just {{remaining}} left to unlock {{reward}}.',
    variables: ['progress', 'remaining', 'reward'],
    effectiveness: 74,
    usageCount: 480,
    isActive: true,
    contexts: ['email', 'web'],
  },
  {
    id: '8',
    name: 'Last Chance',
    code: 'FOMO_LAST_CHANCE',
    category: 'FOMO',
    description: 'Creates fear of missing out on exclusive opportunities',
    template: '🚨 LAST CHANCE: {{offerName}} ends tonight! {{claimedCount}} already claimed.',
    variables: ['offerName', 'claimedCount'],
    effectiveness: 83,
    usageCount: 1100,
    isActive: true,
    contexts: ['email', 'sms', 'push'],
  },
];

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════

function EffectivenessBar({ value }: { value: number }) {
  const getColor = (v: number) => {
    if (v >= 80) return 'bg-green-500';
    if (v >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full', getColor(value))}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground">{value}%</span>
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
  const categoryConfig = CATEGORY_CONFIG[trigger.category];
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
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {trigger.usageCount} uses
                </span>
                <EffectivenessBar value={trigger.effectiveness} />
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {trigger.contexts.map((ctx) => (
                  <Badge key={ctx} variant="secondary" className="text-xs">
                    {ctx}
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

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await triggersApi.getAll();
      setTriggers(data);
    } catch (err) {
      console.error('Failed to load triggers:', err);
      // Use mock data
      setTriggers(MOCK_TRIGGERS);
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
    const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handlePreview = (trigger: BehavioralTrigger) => {
    setSelectedTrigger(trigger);
    setShowPreview(true);
  };

  const handleApply = (trigger: BehavioralTrigger) => {
    setSelectedTrigger(trigger);
    setApplyContent('');
    setApplyVariables(
      trigger.variables.reduce((acc, v) => ({ ...acc, [v]: '' }), {})
    );
    setShowApply(true);
  };

  const handleApplyTrigger = async () => {
    if (!selectedTrigger || !applyContent) return;

    try {
      const result = await triggersApi.applyToContent({
        content: applyContent,
        triggers: [selectedTrigger.code],
        variables: applyVariables,
      });
      toast.success('Trigger applied successfully');
      setApplyContent(result.enhancedContent);
    } catch (err) {
      // Mock the enhancement
      let enhanced = applyContent;
      let template = selectedTrigger.template;
      Object.entries(applyVariables).forEach(([key, value]) => {
        template = template.replace(`{{${key}}}`, value || `[${key}]`);
      });
      enhanced = applyContent + '\n\n' + template;
      setApplyContent(enhanced);
      toast.success('Trigger applied');
    }
  };

  const handleCopyTemplate = (template: string) => {
    navigator.clipboard.writeText(template);
    toast.success('Template copied to clipboard');
  };

  const categoryStats = triggers.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + 1;
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
                key={trigger.id}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedTrigger?.name}</DialogTitle>
            <DialogDescription>{selectedTrigger?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm text-muted-foreground">Template</Label>
              <div className="mt-2 p-4 bg-muted rounded-lg font-mono text-sm">
                {selectedTrigger?.template}
              </div>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Variables</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedTrigger?.variables.map((v) => (
                  <Badge key={v} variant="secondary">
                    {`{{${v}}}`}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Contexts</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedTrigger?.contexts.map((ctx) => (
                  <Badge key={ctx} variant="outline">
                    {ctx}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleCopyTemplate(selectedTrigger?.template || '')}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Template
            </Button>
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
              Enter your content and variable values to apply this trigger.
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
            {selectedTrigger?.variables && selectedTrigger.variables.length > 0 && (
              <div className="space-y-3">
                <Label>Variables</Label>
                <div className="grid grid-cols-2 gap-3">
                  {selectedTrigger.variables.map((v) => (
                    <div key={v} className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{v}</Label>
                      <Input
                        value={applyVariables[v] || ''}
                        onChange={(e) =>
                          setApplyVariables({ ...applyVariables, [v]: e.target.value })
                        }
                        placeholder={`Enter ${v}...`}
                      />
                    </div>
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
