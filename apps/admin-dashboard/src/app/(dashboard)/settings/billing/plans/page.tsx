'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  Edit2,
  Eye,
  EyeOff,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Package,
  Users,
  Building2,
  CreditCard,
  Zap,
  Server,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  billingApi,
  PricingPlan,
  formatCurrency,
  formatNumber,
  getFeatureLabel,
  CreatePricingPlanDto,
  UpdatePricingPlanDto,
} from '@/lib/api/billing';

// Helper to safely get features as an array (handles JSON fields)
function getFeatures(features: unknown): string[] {
  if (Array.isArray(features)) {
    return features;
  }
  if (typeof features === 'string') {
    try {
      const parsed = JSON.parse(features);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

// ═══════════════════════════════════════════════════════════════
// PLAN CARD COMPONENT
// ═══════════════════════════════════════════════════════════════

interface PlanCardProps {
  plan: PricingPlan;
  onEdit: (plan: PricingPlan) => void;
  onToggleStatus: (plan: PricingPlan) => void;
  expanded: boolean;
  onToggleExpand: () => void;
}

function PlanCard({ plan, onEdit, onToggleStatus, expanded, onToggleExpand }: PlanCardProps) {
  const isHidden = plan.status === 'hidden';
  const isDeprecated = plan.status === 'deprecated';
  const isEnterprise = plan.metadata && (plan.metadata as Record<string, unknown>).isCustomPricing;

  return (
    <Card
      className={`transition-all ${
        isHidden
          ? 'opacity-60'
          : isDeprecated
            ? 'border-orange-500/30'
            : plan.isDefault
              ? 'border-primary ring-1 ring-primary/20'
              : ''
      }`}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-lg">{plan.displayName}</CardTitle>
              {plan.isDefault && (
                <Badge variant="info">Default</Badge>
              )}
              {isHidden && (
                <Badge variant="secondary">Hidden</Badge>
              )}
              {isDeprecated && (
                <Badge variant="warning">Deprecated</Badge>
              )}
            </div>
            <CardDescription>{plan.description}</CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onToggleStatus(plan)}
              title={isHidden ? 'Show plan' : 'Hide plan'}
            >
              {isHidden ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(plan)}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Price */}
        <div>
          {isEnterprise ? (
            <div className="text-2xl font-bold text-foreground">Custom</div>
          ) : (
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-foreground">
                {formatCurrency(plan.baseCost, plan.currency)}
              </span>
              <span className="text-muted-foreground">/mo</span>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-sm">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {formatNumber(plan.included?.transactions || 0)} txns
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {formatNumber(plan.included?.companies || 0)} companies
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {formatNumber(plan.included?.users || 0)} users
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Server className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {formatNumber(plan.included?.merchantAccounts || 0)} merchants
            </span>
          </div>
        </div>

        {/* Expand Toggle */}
        <Button
          variant="ghost"
          className="w-full justify-center gap-2"
          onClick={onToggleExpand}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Hide Details
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              View Details
            </>
          )}
        </Button>

        {/* Expanded Details */}
        {expanded && (
          <div className="space-y-6 pt-4 border-t border-border">
            {/* Included Allowances */}
            <div>
              <h4 className="text-sm font-medium text-foreground mb-3">Included Allowances</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between py-1.5 px-2 bg-muted/50 rounded">
                  <span className="text-muted-foreground">Transactions</span>
                  <span className="text-foreground">{formatNumber(plan.included?.transactions || 0)}</span>
                </div>
                <div className="flex justify-between py-1.5 px-2 bg-muted/50 rounded">
                  <span className="text-muted-foreground">Volume</span>
                  <span className="text-foreground">
                    {(plan.included?.volume || 0) === 0
                      ? 'Unlimited'
                      : formatCurrency(plan.included?.volume || 0, plan.currency)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 px-2 bg-muted/50 rounded">
                  <span className="text-muted-foreground">API Calls</span>
                  <span className="text-foreground">{formatNumber(plan.included?.apiCalls || 0)}</span>
                </div>
                <div className="flex justify-between py-1.5 px-2 bg-muted/50 rounded">
                  <span className="text-muted-foreground">Webhooks</span>
                  <span className="text-foreground">{formatNumber(plan.included?.webhooks || 0)}</span>
                </div>
                <div className="flex justify-between py-1.5 px-2 bg-muted/50 rounded">
                  <span className="text-muted-foreground">Vault Entries</span>
                  <span className="text-foreground">{formatNumber(plan.included?.vaultEntries || 0)}</span>
                </div>
              </div>
            </div>

            {/* Overage Pricing */}
            {!isEnterprise && (
              <div>
                <h4 className="text-sm font-medium text-foreground mb-3">Overage Pricing</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between py-1.5 px-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">Per Transaction</span>
                    <span className="text-foreground">
                      {formatCurrency(plan.overage?.transactionPrice || 0, plan.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 px-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">Volume Fee</span>
                    <span className="text-foreground">{((plan.overage?.volumePercent || 0) * 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between py-1.5 px-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">Per User</span>
                    <span className="text-foreground">
                      {formatCurrency(plan.overage?.userPrice || 0, plan.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 px-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">Per Company</span>
                    <span className="text-foreground">
                      {formatCurrency(plan.overage?.companyPrice || 0, plan.currency)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Features */}
            <div>
              <h4 className="text-sm font-medium text-foreground mb-3">Features</h4>
              <div className="flex flex-wrap gap-2">
                {getFeatures(plan.features).map((feature) => (
                  <Badge
                    key={feature}
                    variant="success"
                    className="text-xs"
                  >
                    {getFeatureLabel(feature)}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Limits */}
            {plan.limits && (
              <div>
                <h4 className="text-sm font-medium text-foreground mb-3">Limits</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {plan.limits.maxCompanies && (
                    <div className="flex justify-between py-1.5 px-2 bg-muted/50 rounded">
                      <span className="text-muted-foreground">Max Companies</span>
                      <span className="text-foreground">{plan.limits.maxCompanies}</span>
                    </div>
                  )}
                  {plan.limits.maxUsers && (
                    <div className="flex justify-between py-1.5 px-2 bg-muted/50 rounded">
                      <span className="text-muted-foreground">Max Users</span>
                      <span className="text-foreground">{plan.limits.maxUsers}</span>
                    </div>
                  )}
                  {plan.limits.maxMerchantAccounts && (
                    <div className="flex justify-between py-1.5 px-2 bg-muted/50 rounded">
                      <span className="text-muted-foreground">Max Merchants</span>
                      <span className="text-foreground">{plan.limits.maxMerchantAccounts}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// CREATE/EDIT PLAN MODAL
// ═══════════════════════════════════════════════════════════════

interface PlanModalProps {
  plan?: PricingPlan | null;
  onClose: () => void;
  onSave: (data: CreatePricingPlanDto | UpdatePricingPlanDto) => Promise<void>;
  isLoading: boolean;
}

function PlanModal({ plan, onClose, onSave, isLoading }: PlanModalProps) {
  const isEditing = !!plan;
  const [activeTab, setActiveTab] = useState<'basic' | 'included' | 'overage' | 'features'>('basic');

  const [formData, setFormData] = useState<CreatePricingPlanDto>({
    name: plan?.name || '',
    displayName: plan?.displayName || '',
    description: plan?.description || '',
    billingInterval: plan?.billingInterval || 'MONTHLY',
    baseCost: plan?.baseCost || 0,
    currency: plan?.currency || 'USD',
    sortOrder: plan?.sortOrder || 0,
    isDefault: plan?.isDefault || false,
    included: plan?.included || {
      transactions: 0,
      volume: 0,
      apiCalls: 0,
      merchantAccounts: 0,
      companies: 0,
      users: 0,
      vaultEntries: 0,
      webhooks: 0,
    },
    overage: plan?.overage || {
      transactionPrice: 0,
      volumePercent: 0,
      apiCallPrice: 0,
      merchantAccountPrice: 0,
      companyPrice: 0,
      userPrice: 0,
      vaultEntryPrice: 0,
    },
    features: plan?.features || [],
    limits: plan?.limits || undefined,
  });

  const availableFeatures = [
    'basicReporting',
    'advancedAnalytics',
    'customReports',
    'dataExport',
    'tokenization',
    'fraudDetection',
    'threeDS',
    'emailSupport',
    'chatSupport',
    'phoneSupport',
    'dedicatedManager',
    'slaGuarantee',
    'apiAccess',
    'webhooks',
    'multipleProviders',
    'routingRules',
    'advancedRouting',
    'loadBalancing',
    'failover',
    'customBranding',
    'whiteLabel',
  ];

  const toggleFeature = (feature: string) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter((f) => f !== feature)
        : [...prev.features, feature],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'included', label: 'Included' },
    { id: 'overage', label: 'Overage' },
    { id: 'features', label: 'Features' },
  ] as const;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">
            {isEditing ? 'Edit Plan' : 'Create New Plan'}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-foreground border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Internal Name</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., starter"
                    required
                    disabled={isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    placeholder="e.g., Starter"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this plan..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="baseCost">Base Price (in cents)</Label>
                  <Input
                    id="baseCost"
                    type="number"
                    value={formData.baseCost}
                    onChange={(e) =>
                      setFormData({ ...formData, baseCost: parseInt(e.target.value) || 0 })
                    }
                    min="0"
                  />
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(formData.baseCost, formData.currency || 'USD')}/month
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sortOrder">Sort Order</Label>
                  <Input
                    id="sortOrder"
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) =>
                      setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })
                    }
                    min="0"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Checkbox
                  id="isDefault"
                  checked={formData.isDefault}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isDefault: checked === true })
                  }
                />
                <Label htmlFor="isDefault" className="cursor-pointer">
                  Default Plan
                </Label>
              </div>
            </div>
          )}

          {activeTab === 'included' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Set the included allowances for this plan. Use 0 for unlimited.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="transactions">Transactions</Label>
                  <Input
                    id="transactions"
                    type="number"
                    value={formData.included.transactions}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        included: {
                          ...formData.included,
                          transactions: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="volume">Volume (in cents)</Label>
                  <Input
                    id="volume"
                    type="number"
                    value={formData.included.volume}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        included: { ...formData.included, volume: parseInt(e.target.value) || 0 },
                      })
                    }
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companies">Companies</Label>
                  <Input
                    id="companies"
                    type="number"
                    value={formData.included.companies}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        included: {
                          ...formData.included,
                          companies: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="users">Users</Label>
                  <Input
                    id="users"
                    type="number"
                    value={formData.included.users}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        included: { ...formData.included, users: parseInt(e.target.value) || 0 },
                      })
                    }
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="merchantAccounts">Merchant Accounts</Label>
                  <Input
                    id="merchantAccounts"
                    type="number"
                    value={formData.included.merchantAccounts}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        included: {
                          ...formData.included,
                          merchantAccounts: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apiCalls">API Calls</Label>
                  <Input
                    id="apiCalls"
                    type="number"
                    value={formData.included.apiCalls}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        included: {
                          ...formData.included,
                          apiCalls: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vaultEntries">Vault Entries</Label>
                  <Input
                    id="vaultEntries"
                    type="number"
                    value={formData.included.vaultEntries}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        included: {
                          ...formData.included,
                          vaultEntries: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="webhooks">Webhooks</Label>
                  <Input
                    id="webhooks"
                    type="number"
                    value={formData.included.webhooks}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        included: {
                          ...formData.included,
                          webhooks: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    min="0"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'overage' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Set the overage pricing when usage exceeds included amounts.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="transactionPrice">Per Transaction (cents)</Label>
                  <Input
                    id="transactionPrice"
                    type="number"
                    value={formData.overage.transactionPrice}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        overage: {
                          ...formData.overage,
                          transactionPrice: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="volumePercent">Volume Fee (decimal, e.g., 0.0025 = 0.25%)</Label>
                  <Input
                    id="volumePercent"
                    type="number"
                    step="0.0001"
                    value={formData.overage.volumePercent}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        overage: {
                          ...formData.overage,
                          volumePercent: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="userPrice">Per User (cents)</Label>
                  <Input
                    id="userPrice"
                    type="number"
                    value={formData.overage.userPrice}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        overage: {
                          ...formData.overage,
                          userPrice: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyPrice">Per Company (cents)</Label>
                  <Input
                    id="companyPrice"
                    type="number"
                    value={formData.overage.companyPrice}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        overage: {
                          ...formData.overage,
                          companyPrice: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="merchantAccountPrice">Per Merchant Account (cents)</Label>
                  <Input
                    id="merchantAccountPrice"
                    type="number"
                    value={formData.overage.merchantAccountPrice}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        overage: {
                          ...formData.overage,
                          merchantAccountPrice: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apiCallPrice">Per 1K API Calls (cents)</Label>
                  <Input
                    id="apiCallPrice"
                    type="number"
                    value={formData.overage.apiCallPrice}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        overage: {
                          ...formData.overage,
                          apiCallPrice: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vaultEntryPrice">Per Vault Entry (cents)</Label>
                  <Input
                    id="vaultEntryPrice"
                    type="number"
                    value={formData.overage.vaultEntryPrice}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        overage: {
                          ...formData.overage,
                          vaultEntryPrice: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    min="0"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'features' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select the features included in this plan.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availableFeatures.map((feature) => (
                  <button
                    key={feature}
                    type="button"
                    onClick={() => toggleFeature(feature)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition-colors ${
                      formData.features.includes(feature)
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                        : 'bg-muted border-border text-muted-foreground hover:border-muted-foreground/30'
                    }`}
                  >
                    {formData.features.includes(feature) ? (
                      <Check className="h-4 w-4 flex-shrink-0" />
                    ) : (
                      <div className="w-4 h-4 border border-border rounded flex-shrink-0" />
                    )}
                    {getFeatureLabel(feature)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? 'Save Changes' : 'Create Plan'}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function BillingPlansPage() {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [expandedPlans, setExpandedPlans] = useState<Set<string>>(new Set());
  const [modalPlan, setModalPlan] = useState<PricingPlan | null | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  const loadPlans = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await billingApi.getPlans(showHidden);
      setPlans(data.sort((a, b) => a.sortOrder - b.sortOrder));
    } catch (err) {
      setError('Failed to load pricing plans');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [showHidden]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const handleToggleExpand = (planId: string) => {
    setExpandedPlans((prev) => {
      const next = new Set(prev);
      if (next.has(planId)) {
        next.delete(planId);
      } else {
        next.add(planId);
      }
      return next;
    });
  };

  const handleToggleStatus = async (plan: PricingPlan) => {
    try {
      const newStatus = plan.status === 'hidden' ? 'active' : 'hidden';
      await billingApi.updatePlan(plan.id, { status: newStatus });
      toast.success(`Plan ${newStatus === 'hidden' ? 'hidden' : 'shown'} successfully`);
      await loadPlans();
    } catch (err) {
      toast.error('Failed to update plan status');
      console.error('Failed to update plan status:', err);
    }
  };

  const handleSavePlan = async (data: CreatePricingPlanDto | UpdatePricingPlanDto) => {
    try {
      setIsSaving(true);
      if (modalPlan) {
        await billingApi.updatePlan(modalPlan.id, data);
        toast.success('Plan updated successfully');
      } else {
        await billingApi.createPlan(data as CreatePricingPlanDto);
        toast.success('Plan created successfully');
      }
      await loadPlans();
      setModalPlan(undefined);
    } catch (err) {
      toast.error('Failed to save plan');
      console.error('Failed to save plan:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <Header title="Pricing Plans" subtitle="Manage subscription plans for your platform" />
        <div className="p-4 md:p-6 flex items-center justify-center min-h-[400px]">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading plans...</span>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header title="Pricing Plans" subtitle="Manage subscription plans for your platform" />
        <div className="p-4 md:p-6">
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-3" />
              <p className="text-destructive">{error}</p>
              <Button variant="outline" className="mt-4" onClick={() => loadPlans()}>
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title="Pricing Plans"
        subtitle="Manage subscription plans for your platform"
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="showHidden"
                checked={showHidden}
                onCheckedChange={(checked) => setShowHidden(checked === true)}
              />
              <Label htmlFor="showHidden" className="text-sm cursor-pointer">
                Show hidden
              </Label>
            </div>
            <Button onClick={() => setModalPlan(null)}>
              <Plus className="h-4 w-4 mr-2" />
              New Plan
            </Button>
          </div>
        }
      />

      <div className="p-4 md:p-6">
        {plans.length === 0 ? (
          /* Empty State */
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No plans found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {showHidden ? 'No pricing plans exist yet.' : 'No active plans. Try showing hidden plans.'}
              </p>
              <Button onClick={() => setModalPlan(null)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Plan
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Plans Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onEdit={setModalPlan}
                onToggleStatus={handleToggleStatus}
                expanded={expandedPlans.has(plan.id)}
                onToggleExpand={() => handleToggleExpand(plan.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {modalPlan !== undefined && (
        <PlanModal
          plan={modalPlan}
          onClose={() => setModalPlan(undefined)}
          onSave={handleSavePlan}
          isLoading={isSaving}
        />
      )}
    </>
  );
}
