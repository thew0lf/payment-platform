'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  TrendingUp,
  Target,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  ShoppingCart,
  Gift,
  Percent,
  Package,
  Shield,
  Repeat,
  Truck,
  BadgePercent,
  Zap,
} from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  upsellTargetingApi,
  UpsellTargetingRule,
  CreateTargetingRuleInput,
  UpdateTargetingRuleInput,
  UpsellType,
  UpsellUrgency,
  UPSELL_TYPES,
  UPSELL_URGENCY_LEVELS,
  UPSELL_PLACEMENTS,
  CUSTOMER_SEGMENTS,
} from '@/lib/api/upsell';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const UPSELL_TYPE_CONFIG: Record<UpsellType, { icon: typeof TrendingUp; color: string }> = {
  BULK_DISCOUNT: { icon: Package, color: 'text-blue-400 bg-blue-500/10' },
  SUBSCRIPTION: { icon: Repeat, color: 'text-purple-400 bg-purple-500/10' },
  FREE_SHIPPING_ADD: { icon: Truck, color: 'text-green-400 bg-green-500/10' },
  FREE_GIFT_THRESHOLD: { icon: Gift, color: 'text-pink-400 bg-pink-500/10' },
  COMPLEMENTARY: { icon: ShoppingCart, color: 'text-cyan-400 bg-cyan-500/10' },
  BUNDLE_UPGRADE: { icon: Package, color: 'text-orange-400 bg-orange-500/10' },
  PREMIUM_VERSION: { icon: Zap, color: 'text-yellow-400 bg-yellow-500/10' },
  SHIPPING_PROTECTION: { icon: Shield, color: 'text-indigo-400 bg-indigo-500/10' },
  WARRANTY: { icon: Shield, color: 'text-red-400 bg-red-500/10' },
  QUANTITY_DISCOUNT: { icon: BadgePercent, color: 'text-emerald-400 bg-emerald-500/10' },
};

const URGENCY_CONFIG: Record<UpsellUrgency, { label: string; color: string }> = {
  LOW: { label: 'Low', color: 'bg-muted text-muted-foreground' },
  MEDIUM: { label: 'Medium', color: 'bg-yellow-500/10 text-yellow-600' },
  HIGH: { label: 'High', color: 'bg-red-500/10 text-red-600' },
};

// ═══════════════════════════════════════════════════════════════
// RULE CARD COMPONENT
// ═══════════════════════════════════════════════════════════════

function RuleCard({
  rule,
  onEdit,
  onDelete,
  onToggle,
}: {
  rule: UpsellTargetingRule;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const typeConfig = UPSELL_TYPE_CONFIG[rule.upsellType] || { icon: Target, color: 'text-gray-400 bg-gray-500/10' };
  const urgencyConfig = URGENCY_CONFIG[rule.urgency];
  const Icon = typeConfig.icon;
  const typeLabel = UPSELL_TYPES.find((t) => t.value === rule.upsellType)?.label || rule.upsellType;

  return (
    <Card className={cn('transition-colors', rule.enabled ? 'hover:border-primary/30' : 'opacity-60')}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={cn('p-2 rounded-lg', typeConfig.color)}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium truncate">{rule.name}</h3>
                <Badge variant="outline" className="text-xs">
                  {typeLabel}
                </Badge>
                <Badge className={cn('text-xs', urgencyConfig.color)}>
                  {urgencyConfig.label}
                </Badge>
                {!rule.enabled && (
                  <Badge variant="secondary" className="text-xs">
                    Disabled
                  </Badge>
                )}
              </div>
              {rule.description && (
                <p className="text-sm text-muted-foreground line-clamp-1 mb-2">{rule.description}</p>
              )}
              <p className="text-sm text-foreground mb-2">{rule.message}</p>
              <div className="flex flex-wrap gap-1">
                {rule.placements.slice(0, 3).map((placement) => (
                  <Badge key={placement} variant="secondary" className="text-xs">
                    {UPSELL_PLACEMENTS.find((p) => p.value === placement)?.label || placement}
                  </Badge>
                ))}
                {rule.placements.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{rule.placements.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onToggle} title={rule.enabled ? 'Disable' : 'Enable'}>
              {rule.enabled ? (
                <ToggleRight className="w-5 h-5 text-green-500" />
              ) : (
                <ToggleLeft className="w-5 h-5 text-muted-foreground" />
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// CREATE/EDIT MODAL
// ═══════════════════════════════════════════════════════════════

interface RuleModalProps {
  rule?: UpsellTargetingRule | null;
  open: boolean;
  onClose: () => void;
  onSave: (data: CreateTargetingRuleInput | UpdateTargetingRuleInput) => Promise<void>;
}

function RuleModal({ rule, open, onClose, onSave }: RuleModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateTargetingRuleInput>({
    name: '',
    description: '',
    priority: 100,
    enabled: true,
    conditions: {},
    upsellType: 'BULK_DISCOUNT',
    offer: {},
    message: '',
    urgency: 'MEDIUM',
    placements: ['CART_DRAWER'],
  });

  useEffect(() => {
    if (rule) {
      setFormData({
        name: rule.name,
        description: rule.description || '',
        priority: rule.priority,
        enabled: rule.enabled,
        conditions: rule.conditions,
        upsellType: rule.upsellType,
        offer: rule.offer,
        message: rule.message,
        urgency: rule.urgency,
        placements: rule.placements,
        maxImpressions: rule.maxImpressions,
        maxAcceptances: rule.maxAcceptances,
        validFrom: rule.validFrom,
        validUntil: rule.validUntil,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        priority: 100,
        enabled: true,
        conditions: {},
        upsellType: 'BULK_DISCOUNT',
        offer: {},
        message: '',
        urgency: 'MEDIUM',
        placements: ['CART_DRAWER'],
      });
    }
  }, [rule, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.message.trim()) {
      toast.error('Name and message are required');
      return;
    }

    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save rule:', error);
      toast.error('Failed to save rule');
    } finally {
      setLoading(false);
    }
  };

  const togglePlacement = (placement: string) => {
    setFormData((prev) => ({
      ...prev,
      placements: prev.placements?.includes(placement)
        ? prev.placements.filter((p) => p !== placement)
        : [...(prev.placements || []), placement],
    }));
  };

  const toggleSegment = (segment: string) => {
    const currentSegments = formData.conditions?.segments || [];
    setFormData((prev) => ({
      ...prev,
      conditions: {
        ...prev.conditions,
        segments: currentSegments.includes(segment)
          ? currentSegments.filter((s) => s !== segment)
          : [...currentSegments, segment],
      },
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{rule ? 'Edit Upsell Rule' : 'Create Upsell Rule'}</DialogTitle>
          <DialogDescription>
            Configure targeting conditions and offer details for this upsell.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Rule Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Budget Buyers - Bulk Discount"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Input
                  id="priority"
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData((prev) => ({ ...prev, priority: parseInt(e.target.value) || 100 }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Describe when this rule should apply..."
                rows={2}
              />
            </div>
          </div>

          {/* Upsell Type & Urgency */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Upsell Type</Label>
              <Select
                value={formData.upsellType}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, upsellType: value as UpsellType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UPSELL_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Urgency Level</Label>
              <Select
                value={formData.urgency || 'NONE'}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, urgency: value as UpsellUrgency }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UPSELL_URGENCY_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Upsell Message</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
              placeholder="Buy 2 and save 15%!"
              rows={2}
            />
          </div>

          {/* Offer Details */}
          <div className="space-y-4">
            <Label>Offer Details</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="discountPercent" className="text-sm text-muted-foreground">
                  Discount %
                </Label>
                <Input
                  id="discountPercent"
                  type="number"
                  value={formData.offer?.discountPercent || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      offer: { ...prev.offer, discountPercent: parseInt(e.target.value) || undefined },
                    }))
                  }
                  placeholder="15"
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch
                  checked={formData.offer?.freeShipping || false}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      offer: { ...prev.offer, freeShipping: checked },
                    }))
                  }
                />
                <Label className="text-sm">Free Shipping</Label>
              </div>
            </div>
          </div>

          {/* Placements */}
          <div className="space-y-2">
            <Label>Placements</Label>
            <div className="flex flex-wrap gap-2">
              {UPSELL_PLACEMENTS.map((placement) => (
                <Badge
                  key={placement.value}
                  variant={formData.placements?.includes(placement.value) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => togglePlacement(placement.value)}
                >
                  {placement.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Target Segments */}
          <div className="space-y-2">
            <Label>Target Segments (optional)</Label>
            <div className="flex flex-wrap gap-2">
              {CUSTOMER_SEGMENTS.map((segment) => (
                <Badge
                  key={segment.value}
                  variant={formData.conditions?.segments?.includes(segment.value) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleSegment(segment.value)}
                >
                  {segment.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Cart Value Conditions */}
          <div className="space-y-2">
            <Label>Cart Value Conditions (optional)</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cartValueMin" className="text-sm text-muted-foreground">
                  Min Cart Value
                </Label>
                <Input
                  id="cartValueMin"
                  type="number"
                  value={formData.conditions?.cartValueMin || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      conditions: { ...prev.conditions, cartValueMin: parseFloat(e.target.value) || undefined },
                    }))
                  }
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cartValueMax" className="text-sm text-muted-foreground">
                  Max Cart Value
                </Label>
                <Input
                  id="cartValueMax"
                  type="number"
                  value={formData.conditions?.cartValueMax || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      conditions: { ...prev.conditions, cartValueMax: parseFloat(e.target.value) || undefined },
                    }))
                  }
                  placeholder="No limit"
                />
              </div>
            </div>
          </div>

          {/* Enabled Toggle */}
          <div className="flex items-center gap-2">
            <Switch
              checked={formData.enabled}
              onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, enabled: checked }))}
            />
            <Label>Enabled</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="min-h-[44px] touch-manipulation">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {rule ? 'Save Changes' : 'Create Rule'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function UpsellRulesPage() {
  const [rules, setRules] = useState<UpsellTargetingRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [editingRule, setEditingRule] = useState<UpsellTargetingRule | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteRule, setDeleteRule] = useState<UpsellTargetingRule | null>(null);

  const loadRules = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await upsellTargetingApi.listRules();
      setRules(data);
    } catch (error) {
      console.error('Failed to load rules:', error);
      toast.error('Failed to load upsell rules');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const handleCreateRule = async (data: CreateTargetingRuleInput | UpdateTargetingRuleInput) => {
    const newRule = await upsellTargetingApi.createRule(data as CreateTargetingRuleInput);
    setRules((prev) => [...prev, newRule]);
    toast.success('Upsell rule created');
    setShowCreateModal(false);
  };

  const handleUpdateRule = async (data: CreateTargetingRuleInput | UpdateTargetingRuleInput) => {
    if (!editingRule) return;
    const updated = await upsellTargetingApi.updateRule(editingRule.id, data as UpdateTargetingRuleInput);
    setRules((prev) => prev.map((r) => (r.id === editingRule.id ? updated : r)));
    toast.success('Upsell rule updated');
    setEditingRule(null);
  };

  const handleToggleRule = async (rule: UpsellTargetingRule) => {
    try {
      const updated = await upsellTargetingApi.updateRule(rule.id, { enabled: !rule.enabled });
      setRules((prev) => prev.map((r) => (r.id === rule.id ? updated : r)));
      toast.success(updated.enabled ? 'Rule enabled' : 'Rule disabled');
    } catch (error) {
      console.error('Failed to toggle rule:', error);
      toast.error('Failed to toggle rule');
    }
  };

  const handleDeleteRule = async () => {
    if (!deleteRule) return;
    try {
      await upsellTargetingApi.deleteRule(deleteRule.id);
      setRules((prev) => prev.filter((r) => r.id !== deleteRule.id));
      toast.success('Upsell rule deleted');
      setDeleteRule(null);
    } catch (error) {
      console.error('Failed to delete rule:', error);
      toast.error('Failed to delete rule');
    }
  };

  // Filter rules
  const filteredRules = rules.filter((rule) => {
    const matchesSearch =
      search === '' ||
      rule.name.toLowerCase().includes(search.toLowerCase()) ||
      rule.message.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || rule.upsellType === typeFilter;
    return matchesSearch && matchesType;
  });

  // Stats
  const activeRules = rules.filter((r) => r.enabled).length;
  const totalRules = rules.length;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Upsell Rules</h1>
          <p className="text-muted-foreground">Configure targeted upsell offers for your customers</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="min-h-[44px] touch-manipulation">
          <Plus className="w-4 h-4 mr-2" />
          Create Rule
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Rules</p>
                <p className="text-2xl font-bold">{totalRules}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{activeRules}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Disabled</p>
                <p className="text-2xl font-bold">{totalRules - activeRules}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <TrendingUp className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Types Used</p>
                <p className="text-2xl font-bold">{new Set(rules.map((r) => r.upsellType)).size}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search rules..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full md:w-[200px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {UPSELL_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={loadRules} className="min-h-[44px] touch-manipulation">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Rules List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredRules.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No upsell rules found</h3>
            <p className="text-muted-foreground mb-4">
              {search || typeFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first upsell rule to start converting more customers'}
            </p>
            {!search && typeFilter === 'all' && (
              <Button onClick={() => setShowCreateModal(true)} className="min-h-[44px] touch-manipulation">
                <Plus className="w-4 h-4 mr-2" />
                Create Rule
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onEdit={() => setEditingRule(rule)}
              onDelete={() => setDeleteRule(rule)}
              onToggle={() => handleToggleRule(rule)}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <RuleModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCreateRule}
      />

      {/* Edit Modal */}
      <RuleModal
        rule={editingRule}
        open={!!editingRule}
        onClose={() => setEditingRule(null)}
        onSave={handleUpdateRule}
      />

      {/* Delete Confirmation */}
      <Dialog open={!!deleteRule} onOpenChange={() => setDeleteRule(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Upsell Rule</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteRule?.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteRule(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteRule} className="min-h-[44px] touch-manipulation">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
