'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Edit2,
  Eye,
  EyeOff,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Trash2,
  Package,
  Users,
  Building2,
  CreditCard,
  Zap,
  Server,
  Shield,
  Loader2,
} from 'lucide-react';
import {
  billingApi,
  PricingPlan,
  formatCurrency,
  formatNumber,
  getFeatureLabel,
  CreatePricingPlanDto,
  UpdatePricingPlanDto,
} from '@/lib/api/billing';

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
  const isEnterprise = plan.metadata && (plan.metadata as any).isCustomPricing;

  return (
    <div
      className={`bg-card border rounded-xl overflow-hidden transition-all ${
        isHidden
          ? 'border-border opacity-60'
          : isDeprecated
            ? 'border-orange-500/30'
            : plan.isDefault
              ? 'border-blue-500'
              : 'border-border'
      }`}
    >
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-semibold text-foreground">{plan.displayName}</h3>
              {plan.isDefault && (
                <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full">
                  Default
                </span>
              )}
              {isHidden && (
                <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-full">
                  Hidden
                </span>
              )}
              {isDeprecated && (
                <span className="text-xs px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded-full">
                  Deprecated
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleStatus(plan)}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              title={isHidden ? 'Show plan' : 'Hide plan'}
            >
              {isHidden ? (
                <Eye className="h-4 w-4 text-muted-foreground" />
              ) : (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            <button
              onClick={() => onEdit(plan)}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <Edit2 className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Price */}
        <div className="mb-4">
          {isEnterprise ? (
            <div className="text-3xl font-bold text-foreground">Custom</div>
          ) : (
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-foreground">
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
              {formatNumber(plan.included.transactions)} txns
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {formatNumber(plan.included.companies)} companies
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{formatNumber(plan.included.users)} users</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Server className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {formatNumber(plan.included.merchantAccounts)} merchants
            </span>
          </div>
        </div>
      </div>

      {/* Expand Toggle */}
      <button
        onClick={onToggleExpand}
        className="w-full px-6 py-3 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors border-t border-border"
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
      </button>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-6 pb-6 border-t border-border space-y-6">
          {/* Included Allowances */}
          <div className="pt-4">
            <h4 className="text-sm font-medium text-foreground mb-3">Included Allowances</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between py-1.5 px-2 bg-muted/50 rounded">
                <span className="text-muted-foreground">Transactions</span>
                <span className="text-foreground">{formatNumber(plan.included.transactions)}</span>
              </div>
              <div className="flex justify-between py-1.5 px-2 bg-muted/50 rounded">
                <span className="text-muted-foreground">Volume</span>
                <span className="text-foreground">
                  {plan.included.volume === 0
                    ? 'Unlimited'
                    : formatCurrency(plan.included.volume, plan.currency)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 px-2 bg-muted/50 rounded">
                <span className="text-muted-foreground">API Calls</span>
                <span className="text-foreground">{formatNumber(plan.included.apiCalls)}</span>
              </div>
              <div className="flex justify-between py-1.5 px-2 bg-muted/50 rounded">
                <span className="text-muted-foreground">Webhooks</span>
                <span className="text-foreground">{formatNumber(plan.included.webhooks)}</span>
              </div>
              <div className="flex justify-between py-1.5 px-2 bg-muted/50 rounded">
                <span className="text-muted-foreground">Vault Entries</span>
                <span className="text-foreground">{formatNumber(plan.included.vaultEntries)}</span>
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
                    {formatCurrency(plan.overage.transactionPrice, plan.currency)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 px-2 bg-muted/50 rounded">
                  <span className="text-muted-foreground">Volume Fee</span>
                  <span className="text-foreground">{(plan.overage.volumePercent * 100).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between py-1.5 px-2 bg-muted/50 rounded">
                  <span className="text-muted-foreground">Per User</span>
                  <span className="text-foreground">
                    {formatCurrency(plan.overage.userPrice, plan.currency)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 px-2 bg-muted/50 rounded">
                  <span className="text-muted-foreground">Per Company</span>
                  <span className="text-foreground">
                    {formatCurrency(plan.overage.companyPrice, plan.currency)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Features */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-3">Features</h4>
            <div className="flex flex-wrap gap-2">
              {plan.features.map((feature) => (
                <span
                  key={feature}
                  className="text-xs px-2 py-1 bg-green-500/10 text-green-400 rounded-full border border-green-500/20"
                >
                  {getFeatureLabel(feature)}
                </span>
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
    </div>
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

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">
            {isEditing ? 'Edit Plan' : 'Create New Plan'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-foreground border-b-2 border-blue-500'
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1.5">Internal Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="e.g., starter"
                    required
                    disabled={isEditing}
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1.5">Display Name</label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="e.g., Starter"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:border-blue-500 focus:outline-none"
                  rows={2}
                  placeholder="Brief description of this plan..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1.5">Base Price (in cents)</label>
                  <input
                    type="number"
                    value={formData.baseCost}
                    onChange={(e) =>
                      setFormData({ ...formData, baseCost: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:border-blue-500 focus:outline-none"
                    min="0"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatCurrency(formData.baseCost, formData.currency || 'USD')}/month
                  </p>
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1.5">Sort Order</label>
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) =>
                      setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:border-blue-500 focus:outline-none"
                    min="0"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    className="rounded border-border bg-muted text-blue-500"
                  />
                  <span className="text-sm text-foreground">Default Plan</span>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'included' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                Set the included allowances for this plan. Use 0 for unlimited.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1.5">Transactions</label>
                  <input
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
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:border-blue-500 focus:outline-none"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1.5">Volume (in cents)</label>
                  <input
                    type="number"
                    value={formData.included.volume}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        included: { ...formData.included, volume: parseInt(e.target.value) || 0 },
                      })
                    }
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:border-blue-500 focus:outline-none"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1.5">Companies</label>
                  <input
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
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:border-blue-500 focus:outline-none"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1.5">Users</label>
                  <input
                    type="number"
                    value={formData.included.users}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        included: { ...formData.included, users: parseInt(e.target.value) || 0 },
                      })
                    }
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:border-blue-500 focus:outline-none"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1.5">Merchant Accounts</label>
                  <input
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
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:border-blue-500 focus:outline-none"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1.5">API Calls</label>
                  <input
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
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:border-blue-500 focus:outline-none"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1.5">Vault Entries</label>
                  <input
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
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:border-blue-500 focus:outline-none"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1.5">Webhooks</label>
                  <input
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
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:border-blue-500 focus:outline-none"
                    min="0"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'overage' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                Set the overage pricing when usage exceeds included amounts.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1.5">
                    Per Transaction (cents)
                  </label>
                  <input
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
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:border-blue-500 focus:outline-none"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1.5">
                    Volume Fee (decimal, e.g., 0.0025 = 0.25%)
                  </label>
                  <input
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
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:border-blue-500 focus:outline-none"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1.5">Per User (cents)</label>
                  <input
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
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:border-blue-500 focus:outline-none"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1.5">Per Company (cents)</label>
                  <input
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
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:border-blue-500 focus:outline-none"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1.5">
                    Per Merchant Account (cents)
                  </label>
                  <input
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
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:border-blue-500 focus:outline-none"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1.5">
                    Per 1K API Calls (cents)
                  </label>
                  <input
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
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:border-blue-500 focus:outline-none"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1.5">
                    Per Vault Entry (cents)
                  </label>
                  <input
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
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:border-blue-500 focus:outline-none"
                    min="0"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'features' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                Select the features included in this plan.
              </p>

              <div className="grid grid-cols-2 gap-2">
                {availableFeatures.map((feature) => (
                  <button
                    key={feature}
                    type="button"
                    onClick={() => toggleFeature(feature)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition-colors ${
                      formData.features.includes(feature)
                        ? 'bg-green-500/10 border-green-500/30 text-green-400'
                        : 'bg-muted border-border text-muted-foreground hover:border-border'
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
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-foreground rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEditing ? 'Save Changes' : 'Create Plan'}
          </button>
        </div>
      </div>
    </div>
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
      await loadPlans();
    } catch (err) {
      console.error('Failed to update plan status:', err);
    }
  };

  const handleSavePlan = async (data: CreatePricingPlanDto | UpdatePricingPlanDto) => {
    try {
      setIsSaving(true);
      if (modalPlan) {
        await billingApi.updatePlan(modalPlan.id, data);
      } else {
        await billingApi.createPlan(data as CreatePricingPlanDto);
      }
      await loadPlans();
      setModalPlan(undefined);
    } catch (err) {
      console.error('Failed to save plan:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Pricing Plans</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage subscription plans for your platform
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={showHidden}
              onChange={(e) => setShowHidden(e.target.checked)}
              className="rounded border-border bg-muted text-blue-500"
            />
            Show hidden
          </label>
          <button
            onClick={() => setModalPlan(null)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-foreground rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Plan
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
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

      {/* Empty State */}
      {!isLoading && plans.length === 0 && (
        <div className="text-center py-20">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No plans found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {showHidden ? 'No pricing plans exist yet.' : 'No active plans. Try showing hidden plans.'}
          </p>
          <button
            onClick={() => setModalPlan(null)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-foreground rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create First Plan
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {modalPlan !== undefined && (
        <PlanModal
          plan={modalPlan}
          onClose={() => setModalPlan(undefined)}
          onSave={handleSavePlan}
          isLoading={isSaving}
        />
      )}
    </div>
  );
}
