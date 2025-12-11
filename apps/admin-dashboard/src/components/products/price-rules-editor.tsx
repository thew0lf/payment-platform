'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  DollarSign,
  Plus,
  Trash2,
  Pencil,
  Calculator,
  Loader2,
  X,
  ChevronUp,
  ChevronDown,
  Calendar,
  Users,
  Package,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  priceRulesApi,
  ProductPriceRule,
  CreatePriceRuleInput,
  UpdatePriceRuleInput,
  PriceRuleType,
  AdjustmentType,
  CalculatedPrice,
  PRICE_RULE_TYPES,
  ADJUSTMENT_TYPES,
} from '@/lib/api/products';

interface PriceRulesEditorProps {
  productId: string;
  productPrice?: number;
  currency?: string;
  onRulesChange?: (rules: ProductPriceRule[]) => void;
  className?: string;
}

const RULE_TYPE_ICONS: Record<PriceRuleType, React.ReactNode> = {
  QUANTITY_BREAK: <Package className="w-4 h-4" />,
  CUSTOMER_GROUP: <Users className="w-4 h-4" />,
  TIME_BASED: <Clock className="w-4 h-4" />,
  SUBSCRIPTION: <Calendar className="w-4 h-4" />,
};

interface RuleFormData {
  name: string;
  type: PriceRuleType;
  adjustmentType: AdjustmentType;
  adjustmentValue: number;
  minQuantity?: number;
  maxQuantity?: number;
  customerGroupId?: string;
  startDate?: string;
  endDate?: string;
  priority: number;
  isActive: boolean;
}

const defaultFormData: RuleFormData = {
  name: '',
  type: 'QUANTITY_BREAK',
  adjustmentType: 'PERCENTAGE',
  adjustmentValue: 0,
  minQuantity: undefined,
  maxQuantity: undefined,
  customerGroupId: undefined,
  startDate: undefined,
  endDate: undefined,
  priority: 0,
  isActive: true,
};

export function PriceRulesEditor({
  productId,
  productPrice = 0,
  currency = 'USD',
  onRulesChange,
  className,
}: PriceRulesEditorProps) {
  const [rules, setRules] = useState<ProductPriceRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<ProductPriceRule | null>(null);
  const [formData, setFormData] = useState<RuleFormData>(defaultFormData);
  const [priceCalc, setPriceCalc] = useState<CalculatedPrice | null>(null);
  const [testQuantity, setTestQuantity] = useState<number>(1);
  const [ruleToDelete, setRuleToDelete] = useState<string | null>(null);

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  }, [currency]);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await priceRulesApi.list(productId);
      setRules(data);
      onRulesChange?.(data);
    } catch (err: any) {
      console.error('Failed to load price rules:', err);
      setError(err.message || 'Failed to load price rules');
    } finally {
      setLoading(false);
    }
  }, [productId, onRulesChange]);

  const calculatePrice = useCallback(async () => {
    try {
      const calc = await priceRulesApi.calculate(productId, { quantity: testQuantity });
      setPriceCalc(calc);
    } catch (err: any) {
      console.error('Failed to calculate price:', err);
    }
  }, [productId, testQuantity]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  useEffect(() => {
    if (rules.length > 0) {
      calculatePrice();
    }
  }, [rules, testQuantity, calculatePrice]);

  const openCreateForm = () => {
    setFormData(defaultFormData);
    setEditingRule(null);
    setShowForm(true);
  };

  const openEditForm = (rule: ProductPriceRule) => {
    setFormData({
      name: rule.name,
      type: rule.type,
      adjustmentType: rule.adjustmentType,
      adjustmentValue: rule.adjustmentValue,
      minQuantity: rule.minQuantity ?? undefined,
      maxQuantity: rule.maxQuantity ?? undefined,
      customerGroupId: rule.customerGroupId ?? undefined,
      startDate: rule.startDate ? rule.startDate.split('T')[0] : undefined,
      endDate: rule.endDate ? rule.endDate.split('T')[0] : undefined,
      priority: rule.priority,
      isActive: rule.isActive,
    });
    setEditingRule(rule);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingRule(null);
    setFormData(defaultFormData);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError('Rule name is required');
      return;
    }
    if (formData.adjustmentValue <= 0) {
      setError('Adjustment value must be greater than 0');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingRule) {
        const updateData: UpdatePriceRuleInput = {
          name: formData.name,
          type: formData.type,
          adjustmentType: formData.adjustmentType,
          adjustmentValue: formData.adjustmentValue,
          minQuantity: formData.minQuantity || undefined,
          maxQuantity: formData.maxQuantity || undefined,
          customerGroupId: formData.customerGroupId || undefined,
          startDate: formData.startDate ? new Date(formData.startDate).toISOString() : undefined,
          endDate: formData.endDate ? new Date(formData.endDate).toISOString() : undefined,
          priority: formData.priority,
          isActive: formData.isActive,
        };
        await priceRulesApi.update(productId, editingRule.id, updateData);
      } else {
        const createData: CreatePriceRuleInput = {
          name: formData.name,
          type: formData.type,
          adjustmentType: formData.adjustmentType,
          adjustmentValue: formData.adjustmentValue,
          minQuantity: formData.minQuantity || undefined,
          maxQuantity: formData.maxQuantity || undefined,
          customerGroupId: formData.customerGroupId || undefined,
          startDate: formData.startDate ? new Date(formData.startDate).toISOString() : undefined,
          endDate: formData.endDate ? new Date(formData.endDate).toISOString() : undefined,
          priority: formData.priority,
          isActive: formData.isActive,
        };
        await priceRulesApi.create(productId, createData);
      }
      await fetchRules();
      closeForm();
    } catch (err: any) {
      console.error('Failed to save price rule:', err);
      setError(err.message || 'Failed to save price rule');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRule = (ruleId: string) => {
    setRuleToDelete(ruleId);
  };

  const confirmDeleteRule = async () => {
    if (!ruleToDelete) return;
    setError(null);
    try {
      await priceRulesApi.delete(productId, ruleToDelete);
      await fetchRules();
      toast.success('Price rule deleted');
    } catch (err: any) {
      console.error('Failed to delete price rule:', err);
      toast.error('Failed to delete price rule');
    } finally {
      setRuleToDelete(null);
    }
  };

  const toggleRuleActive = async (rule: ProductPriceRule) => {
    setError(null);
    try {
      await priceRulesApi.update(productId, rule.id, { isActive: !rule.isActive });
      await fetchRules();
    } catch (err: any) {
      console.error('Failed to toggle rule status:', err);
      setError(err.message || 'Failed to toggle rule status');
    }
  };

  const getAdjustmentDisplay = (rule: ProductPriceRule) => {
    switch (rule.adjustmentType) {
      case 'PERCENTAGE':
        return `${rule.adjustmentValue}% off`;
      case 'FIXED_AMOUNT':
        return `${formatCurrency(rule.adjustmentValue)} off`;
      case 'FIXED_PRICE':
        return `Fixed: ${formatCurrency(rule.adjustmentValue)}`;
      default:
        return String(rule.adjustmentValue);
    }
  };

  const getRuleTypeLabel = (type: PriceRuleType) => {
    return PRICE_RULE_TYPES.find(t => t.value === type)?.label || type;
  };

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center py-8', className)}>
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Error message */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" />
          <h4 className="text-sm font-medium text-foreground">Price Rules</h4>
          <span className="text-xs text-muted-foreground">({rules.length} rules)</span>
        </div>
        <Button
          size="sm"
          onClick={openCreateForm}
          className="bg-primary hover:bg-primary/90 text-foreground"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Rule
        </Button>
      </div>

      {/* Rules List */}
      {rules.length > 0 ? (
        <div className="space-y-2">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={cn(
                'flex items-center gap-3 p-3 bg-muted border rounded-lg transition-colors',
                rule.isActive ? 'border-border' : 'border-border opacity-60',
              )}
            >
              <div className="p-2 rounded-lg bg-muted/50 text-primary">
                {RULE_TYPE_ICONS[rule.type]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">{rule.name}</p>
                  {!rule.isActive && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      Inactive
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{getRuleTypeLabel(rule.type)}</span>
                  <span>•</span>
                  <span className="text-green-400">{getAdjustmentDisplay(rule)}</span>
                  {rule.minQuantity && (
                    <>
                      <span>•</span>
                      <span>Min: {rule.minQuantity}</span>
                    </>
                  )}
                  {rule.priority > 0 && (
                    <>
                      <span>•</span>
                      <span>Priority: {rule.priority}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggleRuleActive(rule)}
                  className={cn(
                    'p-1.5 rounded transition-colors',
                    rule.isActive
                      ? 'text-green-400 hover:bg-green-400/10'
                      : 'text-muted-foreground hover:bg-muted',
                  )}
                  title={rule.isActive ? 'Deactivate rule' : 'Activate rule'}
                >
                  {rule.isActive ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => openEditForm(rule)}
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteRule(rule.id)}
                  className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-muted/50 rounded-lg border border-border border-dashed">
          <DollarSign className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No price rules configured</p>
          <p className="text-xs text-muted-foreground mt-1">
            Add rules to offer quantity discounts, customer group pricing, and more.
          </p>
        </div>
      )}

      {/* Price Calculator */}
      {rules.length > 0 && (
        <div className="p-4 bg-muted/50 border border-border rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Calculator className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-medium text-foreground">Price Calculator</h4>
          </div>
          <div className="flex items-center gap-4 mb-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Test Quantity</label>
              <Input
                type="number"
                value={testQuantity}
                onChange={(e) => setTestQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                className="w-24 bg-muted h-9"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={calculatePrice}
              className="mt-5"
            >
              Calculate
            </Button>
          </div>
          {priceCalc && (
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Original Price:</span>
                <span className="text-foreground">{formatCurrency(priceCalc.originalPrice)}</span>
              </div>
              {priceCalc.discount > 0 && (
                <div className="flex justify-between text-green-400">
                  <span>Discount ({priceCalc.discountPercent.toFixed(1)}%):</span>
                  <span>-{formatCurrency(priceCalc.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-medium pt-2 border-t border-border">
                <span className="text-foreground">Final Price:</span>
                <span className="text-primary">{formatCurrency(priceCalc.finalPrice)}</span>
              </div>
              {priceCalc.appliedRules.length > 0 && (
                <div className="mt-3 pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-1">Applied Rules:</p>
                  {priceCalc.appliedRules.map((applied) => (
                    <div key={applied.id} className="flex justify-between text-xs text-muted-foreground">
                      <span>{applied.name}</span>
                      <span>-{formatCurrency(applied.adjustment)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {ruleToDelete && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setRuleToDelete(null)}
          />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm z-50">
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">Delete Price Rule</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Are you sure you want to delete this price rule? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setRuleToDelete(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={confirmDeleteRule}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Create/Edit Form Modal */}
      {showForm && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={closeForm}
          />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-50 max-h-[90vh] overflow-y-auto">
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">
                  {editingRule ? 'Edit Price Rule' : 'Create Price Rule'}
                </h3>
                <button
                  onClick={closeForm}
                  className="p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Rule Name *
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Buy 5+ Get 10% Off"
                    className="bg-muted"
                  />
                </div>

                {/* Rule Type */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Rule Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as PriceRuleType })}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {PRICE_RULE_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label} - {type.description}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Adjustment Type & Value */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Adjustment Type
                    </label>
                    <select
                      value={formData.adjustmentType}
                      onChange={(e) => setFormData({ ...formData, adjustmentType: e.target.value as AdjustmentType })}
                      className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      {ADJUSTMENT_TYPES.map((adj) => (
                        <option key={adj.value} value={adj.value}>
                          {adj.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      {formData.adjustmentType === 'PERCENTAGE' ? 'Discount %' : 'Amount'}
                    </label>
                    <Input
                      type="number"
                      value={formData.adjustmentValue || ''}
                      onChange={(e) => setFormData({ ...formData, adjustmentValue: parseFloat(e.target.value) || 0 })}
                      min="0"
                      max={formData.adjustmentType === 'PERCENTAGE' ? 100 : undefined}
                      step={formData.adjustmentType === 'PERCENTAGE' ? 1 : 0.01}
                      className="bg-muted"
                    />
                  </div>
                </div>

                {/* Quantity Constraints */}
                {formData.type === 'QUANTITY_BREAK' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Min Quantity
                      </label>
                      <Input
                        type="number"
                        value={formData.minQuantity || ''}
                        onChange={(e) => setFormData({ ...formData, minQuantity: parseInt(e.target.value) || undefined })}
                        min="1"
                        placeholder="e.g., 5"
                        className="bg-muted"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Max Quantity
                      </label>
                      <Input
                        type="number"
                        value={formData.maxQuantity || ''}
                        onChange={(e) => setFormData({ ...formData, maxQuantity: parseInt(e.target.value) || undefined })}
                        min="1"
                        placeholder="Optional"
                        className="bg-muted"
                      />
                    </div>
                  </div>
                )}

                {/* Customer Group */}
                {formData.type === 'CUSTOMER_GROUP' && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Customer Group ID
                    </label>
                    <Input
                      value={formData.customerGroupId || ''}
                      onChange={(e) => setFormData({ ...formData, customerGroupId: e.target.value || undefined })}
                      placeholder="Enter customer group ID"
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Only customers in this group will see this price.
                    </p>
                  </div>
                )}

                {/* Time-Based Dates */}
                {formData.type === 'TIME_BASED' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Start Date
                      </label>
                      <Input
                        type="date"
                        value={formData.startDate || ''}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value || undefined })}
                        className="bg-muted"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        End Date
                      </label>
                      <Input
                        type="date"
                        value={formData.endDate || ''}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value || undefined })}
                        className="bg-muted"
                      />
                    </div>
                  </div>
                )}

                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Priority
                  </label>
                  <Input
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                    min="0"
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Higher priority rules are applied first. Only one rule per type applies.
                  </p>
                </div>

                {/* Active Status */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="rule-active"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 rounded border-border bg-muted text-primary focus:ring-primary/50"
                  />
                  <label htmlFor="rule-active" className="text-sm text-foreground">
                    Rule is active
                  </label>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="bg-primary hover:bg-primary/90"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      Saving...
                    </>
                  ) : editingRule ? (
                    'Update Rule'
                  ) : (
                    'Create Rule'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
