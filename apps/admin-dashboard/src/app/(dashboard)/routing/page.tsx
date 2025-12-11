'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, GitBranch, ArrowRight, ToggleLeft, ToggleRight, Loader2, Edit, Trash2, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useHierarchy } from '@/contexts/hierarchy-context';
import {
  routingRulesApi,
  RoutingRule,
  CreateRoutingRuleDto,
  RuleActionType,
  RuleConditions,
  RuleAction,
} from '@/lib/api/routing';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const ACTION_TYPES: { value: RuleActionType; label: string; description: string }[] = [
  { value: 'ROUTE_TO_POOL', label: 'Route to Pool', description: 'Route transaction to a specific account pool' },
  { value: 'ROUTE_TO_ACCOUNT', label: 'Route to Account', description: 'Route to a specific merchant account' },
  { value: 'BLOCK', label: 'Block Transaction', description: 'Block the transaction with a reason' },
  { value: 'FLAG_FOR_REVIEW', label: 'Flag for Review', description: 'Mark transaction for manual review' },
  { value: 'REQUIRE_3DS', label: 'Require 3DS', description: 'Enforce 3D Secure authentication' },
  { value: 'APPLY_SURCHARGE', label: 'Apply Surcharge', description: 'Add a processing fee' },
];

const CARD_BRANDS = ['VISA', 'MASTERCARD', 'AMEX', 'DISCOVER', 'JCB', 'DINERS'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'MXN'];
const COUNTRIES = ['US', 'CA', 'GB', 'DE', 'FR', 'AU', 'JP', 'MX', 'BR', 'IN'];

// ═══════════════════════════════════════════════════════════════
// RULE BUILDER MODAL
// ═══════════════════════════════════════════════════════════════

interface RuleBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rule: CreateRoutingRuleDto) => Promise<void>;
  editRule?: RoutingRule | null;
}

function RuleBuilderModal({ isOpen, onClose, onSave, editRule }: RuleBuilderModalProps) {
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState(100);

  // Conditions
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedCardBrands, setSelectedCardBrands] = useState<string[]>([]);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [internationalOnly, setInternationalOnly] = useState(false);

  // Action
  const [actionType, setActionType] = useState<RuleActionType>('ROUTE_TO_POOL');
  const [blockReason, setBlockReason] = useState('');
  const [reviewReason, setReviewReason] = useState('');
  const [surchargeValue, setSurchargeValue] = useState('');
  const [surchargeType, setSurchargeType] = useState<'percentage' | 'flat'>('percentage');

  // Initialize form when editing
  useEffect(() => {
    if (editRule) {
      setName(editRule.name);
      setDescription(editRule.description || '');
      setPriority(editRule.priority);

      // Conditions
      setMinAmount(editRule.conditions.amount?.min?.toString() || '');
      setMaxAmount(editRule.conditions.amount?.max?.toString() || '');
      setSelectedCurrencies(editRule.conditions.geo?.currencies || []);
      setSelectedCountries(editRule.conditions.geo?.countries || []);
      setSelectedCardBrands(editRule.conditions.paymentMethod?.cardBrands || []);
      setIsNewCustomer(editRule.conditions.customer?.isNewCustomer || false);
      setInternationalOnly(editRule.conditions.geo?.internationalOnly || false);

      // Action
      if (editRule.actions.length > 0) {
        const action = editRule.actions[0];
        setActionType(action.type);
        setBlockReason(action.blockReason || '');
        setReviewReason(action.reviewReason || '');
        setSurchargeValue(action.surchargeValue?.toString() || '');
        setSurchargeType(action.surchargeType || 'percentage');
      }
    } else {
      // Reset form
      setName('');
      setDescription('');
      setPriority(100);
      setMinAmount('');
      setMaxAmount('');
      setSelectedCurrencies([]);
      setSelectedCountries([]);
      setSelectedCardBrands([]);
      setIsNewCustomer(false);
      setInternationalOnly(false);
      setActionType('ROUTE_TO_POOL');
      setBlockReason('');
      setReviewReason('');
      setSurchargeValue('');
      setSurchargeType('percentage');
    }
    setStep(1);
  }, [editRule, isOpen]);

  const toggleArrayItem = (arr: string[], item: string, setter: (arr: string[]) => void) => {
    if (arr.includes(item)) {
      setter(arr.filter(i => i !== item));
    } else {
      setter([...arr, item]);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter a rule name');
      return;
    }

    setSaving(true);
    try {
      const conditions: RuleConditions = {};

      if (minAmount || maxAmount) {
        conditions.amount = {};
        if (minAmount) conditions.amount.min = parseFloat(minAmount);
        if (maxAmount) conditions.amount.max = parseFloat(maxAmount);
      }

      if (selectedCurrencies.length > 0 || selectedCountries.length > 0 || internationalOnly) {
        conditions.geo = {};
        if (selectedCurrencies.length > 0) conditions.geo.currencies = selectedCurrencies;
        if (selectedCountries.length > 0) conditions.geo.countries = selectedCountries;
        if (internationalOnly) conditions.geo.internationalOnly = true;
      }

      if (selectedCardBrands.length > 0) {
        conditions.paymentMethod = { cardBrands: selectedCardBrands };
      }

      if (isNewCustomer) {
        conditions.customer = { isNewCustomer: true };
      }

      const action: RuleAction = { type: actionType };

      if (actionType === 'BLOCK' && blockReason) {
        action.blockReason = blockReason;
      }
      if (actionType === 'FLAG_FOR_REVIEW' && reviewReason) {
        action.reviewReason = reviewReason;
      }
      if (actionType === 'APPLY_SURCHARGE' && surchargeValue) {
        action.surchargeValue = parseFloat(surchargeValue);
        action.surchargeType = surchargeType;
      }

      const ruleData: CreateRoutingRuleDto = {
        name: name.trim(),
        description: description.trim() || undefined,
        priority,
        conditions,
        actions: [action],
      };

      await onSave(ruleData);
      onClose();
    } catch (error) {
      console.error('Failed to save rule:', error);
      toast.error('Failed to save rule');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {editRule ? 'Edit Routing Rule' : 'Create Routing Rule'}
            </h2>
            <p className="text-sm text-muted-foreground">Step {step} of 3</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-medium text-foreground mb-4">Basic Information</h3>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Rule Name *</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., High Value Transactions"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this rule does..."
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Priority</label>
                <Input
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(parseInt(e.target.value) || 100)}
                  placeholder="100"
                  min={1}
                  max={1000}
                />
                <p className="text-xs text-muted-foreground mt-1">Lower numbers = higher priority (evaluated first)</p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h3 className="font-medium text-foreground mb-4">Conditions (When to apply this rule)</h3>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Transaction Amount</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Input
                      type="number"
                      value={minAmount}
                      onChange={(e) => setMinAmount(e.target.value)}
                      placeholder="Min ($)"
                    />
                  </div>
                  <div>
                    <Input
                      type="number"
                      value={maxAmount}
                      onChange={(e) => setMaxAmount(e.target.value)}
                      placeholder="Max ($)"
                    />
                  </div>
                </div>
              </div>

              {/* Currencies */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Currencies</label>
                <div className="flex flex-wrap gap-2">
                  {CURRENCIES.map(currency => (
                    <button
                      key={currency}
                      type="button"
                      onClick={() => toggleArrayItem(selectedCurrencies, currency, setSelectedCurrencies)}
                      className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                        selectedCurrencies.includes(currency)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted border-border text-muted-foreground hover:border-primary'
                      }`}
                    >
                      {currency}
                    </button>
                  ))}
                </div>
              </div>

              {/* Countries */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Countries</label>
                <div className="flex flex-wrap gap-2">
                  {COUNTRIES.map(country => (
                    <button
                      key={country}
                      type="button"
                      onClick={() => toggleArrayItem(selectedCountries, country, setSelectedCountries)}
                      className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                        selectedCountries.includes(country)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted border-border text-muted-foreground hover:border-primary'
                      }`}
                    >
                      {country}
                    </button>
                  ))}
                </div>
              </div>

              {/* Card Brands */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Card Brands</label>
                <div className="flex flex-wrap gap-2">
                  {CARD_BRANDS.map(brand => (
                    <button
                      key={brand}
                      type="button"
                      onClick={() => toggleArrayItem(selectedCardBrands, brand, setSelectedCardBrands)}
                      className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                        selectedCardBrands.includes(brand)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted border-border text-muted-foreground hover:border-primary'
                      }`}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
              </div>

              {/* Additional flags */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isNewCustomer}
                    onChange={(e) => setIsNewCustomer(e.target.checked)}
                    className="w-4 h-4 rounded border-border bg-muted text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-foreground">New customers only</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={internationalOnly}
                    onChange={(e) => setInternationalOnly(e.target.checked)}
                    className="w-4 h-4 rounded border-border bg-muted text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-foreground">International transactions only</span>
                </label>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h3 className="font-medium text-foreground mb-4">Action (What to do when conditions match)</h3>

              <div className="space-y-3">
                {ACTION_TYPES.map(action => (
                  <label
                    key={action.value}
                    className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                      actionType === action.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="actionType"
                      value={action.value}
                      checked={actionType === action.value}
                      onChange={() => setActionType(action.value)}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-medium text-foreground">{action.label}</p>
                      <p className="text-sm text-muted-foreground">{action.description}</p>
                    </div>
                  </label>
                ))}
              </div>

              {/* Action-specific fields */}
              {actionType === 'BLOCK' && (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Block Reason</label>
                  <Input
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    placeholder="e.g., High risk transaction"
                  />
                </div>
              )}

              {actionType === 'FLAG_FOR_REVIEW' && (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Review Reason</label>
                  <Input
                    value={reviewReason}
                    onChange={(e) => setReviewReason(e.target.value)}
                    placeholder="e.g., Requires manual verification"
                  />
                </div>
              )}

              {actionType === 'APPLY_SURCHARGE' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Surcharge Value</label>
                    <Input
                      type="number"
                      value={surchargeValue}
                      onChange={(e) => setSurchargeValue(e.target.value)}
                      placeholder="e.g., 2.5"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Type</label>
                    <select
                      value={surchargeType}
                      onChange={(e) => setSurchargeType(e.target.value as 'percentage' | 'flat')}
                      className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="flat">Flat Amount ($)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border">
          <div>
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {step < 3 ? (
              <Button onClick={() => setStep(step + 1)}>
                Next
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    {editRule ? 'Update Rule' : 'Create Rule'}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ═══════════════════════════════════════════════════════════════
// DELETE CONFIRMATION MODAL
// ═══════════════════════════════════════════════════════════════

interface DeleteConfirmModalProps {
  isOpen: boolean;
  ruleName: string;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}

function DeleteConfirmModal({ isOpen, ruleName, onConfirm, onCancel, deleting }: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-md p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground">Delete Rule</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Are you sure you want to delete &quot;{ruleName}&quot;? This action cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onCancel} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={deleting}>
            {deleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
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

export default function RoutingPage() {
  const { selectedCompanyId } = useHierarchy();
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showRuleBuilder, setShowRuleBuilder] = useState(false);
  const [editingRule, setEditingRule] = useState<RoutingRule | null>(null);
  const [ruleToDelete, setRuleToDelete] = useState<RoutingRule | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadRules = async () => {
    if (!selectedCompanyId) {
      setRules([]);
      setLoading(false);
      return;
    }

    try {
      const data = await routingRulesApi.list(selectedCompanyId);
      setRules(data);
    } catch (error) {
      console.error('Failed to load routing rules:', error);
      setRules([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadRules();
  }, [selectedCompanyId]);

  const handleCreateRule = async (ruleData: CreateRoutingRuleDto) => {
    if (!selectedCompanyId) return;
    await routingRulesApi.create(selectedCompanyId, ruleData);
    toast.success('Routing rule created');
    await loadRules();
  };

  const handleUpdateRule = async (ruleData: CreateRoutingRuleDto) => {
    if (!editingRule) return;
    await routingRulesApi.update(editingRule.id, ruleData);
    toast.success('Routing rule updated');
    setEditingRule(null);
    await loadRules();
  };

  const handleDeleteRule = async () => {
    if (!ruleToDelete) return;
    setDeleting(true);
    try {
      await routingRulesApi.delete(ruleToDelete.id);
      toast.success(`"${ruleToDelete.name}" deleted`);
      setRuleToDelete(null);
      await loadRules();
    } catch (error) {
      console.error('Failed to delete rule:', error);
      toast.error('Failed to delete rule');
    } finally {
      setDeleting(false);
    }
  };

  const toggleRuleStatus = async (rule: RoutingRule) => {
    try {
      const newStatus = rule.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await routingRulesApi.update(rule.id, { status: newStatus });
      toast.success(`Rule ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'}`);
      await loadRules();
    } catch (error) {
      console.error('Failed to toggle rule status:', error);
      toast.error('Failed to update rule status');
    }
  };

  // Calculate summary stats
  const activeRules = rules.filter(r => r.status === 'ACTIVE').length;
  const totalMatches = rules.reduce((acc, r) => acc + r.matchCount, 0);

  // Format condition for display
  const formatCondition = (rule: RoutingRule): string => {
    const parts: string[] = [];

    if (rule.conditions.amount?.min) parts.push(`amount > $${rule.conditions.amount.min}`);
    if (rule.conditions.amount?.max) parts.push(`amount < $${rule.conditions.amount.max}`);
    if (rule.conditions.geo?.currencies?.length) parts.push(`currency in [${rule.conditions.geo.currencies.join(', ')}]`);
    if (rule.conditions.geo?.countries?.length) parts.push(`country in [${rule.conditions.geo.countries.join(', ')}]`);
    if (rule.conditions.geo?.internationalOnly) parts.push('international only');
    if (rule.conditions.paymentMethod?.cardBrands?.length) parts.push(`card in [${rule.conditions.paymentMethod.cardBrands.join(', ')}]`);
    if (rule.conditions.customer?.isNewCustomer) parts.push('new customer');

    return parts.length > 0 ? parts.join(' && ') : 'All transactions';
  };

  // Format action for display
  const formatAction = (rule: RoutingRule): string => {
    if (rule.actions.length === 0) return 'No action';

    const action = rule.actions[0];
    switch (action.type) {
      case 'ROUTE_TO_POOL': return `Route to Pool`;
      case 'ROUTE_TO_ACCOUNT': return `Route to Account`;
      case 'BLOCK': return `Block: ${action.blockReason || 'Blocked'}`;
      case 'FLAG_FOR_REVIEW': return `Flag for Review`;
      case 'REQUIRE_3DS': return `Require 3DS`;
      case 'APPLY_SURCHARGE': return `+${action.surchargeValue}${action.surchargeType === 'percentage' ? '%' : ''}`;
      default: return action.type.toLowerCase().replace(/_/g, ' ');
    }
  };

  const openCreateModal = () => {
    setEditingRule(null);
    setShowRuleBuilder(true);
  };

  const openEditModal = (rule: RoutingRule) => {
    setEditingRule(rule);
    setShowRuleBuilder(true);
  };

  return (
    <>
      <Header
        title="Routing Rules"
        subtitle="Configure intelligent payment routing"
        actions={
          <Button size="sm" onClick={openCreateModal} disabled={!selectedCompanyId}>
            <Plus className="w-4 h-4 mr-2" />
            Create Rule
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Active Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{activeRules}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{rules.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total Matches</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">{totalMatches.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="bg-card/50 border border-border rounded-xl p-12 flex items-center justify-center">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading routing rules...</span>
            </div>
          </div>
        ) : !selectedCompanyId ? (
          <div className="bg-card/50 border border-border rounded-xl p-12 text-center">
            <p className="text-muted-foreground">Select a company to view routing rules</p>
          </div>
        ) : rules.length === 0 ? (
          <div className="bg-card/50 border border-border rounded-xl p-12 text-center">
            <GitBranch className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No routing rules configured</p>
            <Button size="sm" onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Rule
            </Button>
          </div>
        ) : (
          /* Rules List */
          <div className="space-y-4">
            {rules.map(rule => (
              <Card key={rule.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-muted rounded-lg">
                        <GitBranch className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-foreground">{rule.name}</h3>
                          <Badge variant={rule.status === 'ACTIVE' ? 'success' : rule.status === 'TESTING' ? 'warning' : 'default'}>
                            {rule.status.toLowerCase()}
                          </Badge>
                          <span className="text-xs text-muted-foreground">Priority: {rule.priority}</span>
                        </div>
                        {rule.description && (
                          <p className="text-sm text-muted-foreground mb-2">{rule.description}</p>
                        )}
                        <div className="flex items-center gap-2 text-sm">
                          <code className="px-2 py-1 bg-muted rounded text-primary">
                            {formatCondition(rule)}
                          </code>
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          <span className="text-foreground">{formatAction(rule)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {rule.matchCount > 0 && (
                        <div className="text-right mr-4">
                          <p className="text-sm text-muted-foreground">Matches</p>
                          <p className="text-lg font-semibold text-foreground">{rule.matchCount.toLocaleString()}</p>
                        </div>
                      )}
                      <button
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                        onClick={() => openEditModal(rule)}
                        title="Edit rule"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 text-muted-foreground hover:text-red-500 hover:bg-muted rounded-lg"
                        onClick={() => setRuleToDelete(rule)}
                        title="Delete rule"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 text-muted-foreground hover:text-foreground"
                        onClick={() => toggleRuleStatus(rule)}
                        title={rule.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      >
                        {rule.status === 'ACTIVE' ? (
                          <ToggleRight className="w-6 h-6 text-primary" />
                        ) : (
                          <ToggleLeft className="w-6 h-6" />
                        )}
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Rule Builder Modal */}
      <RuleBuilderModal
        isOpen={showRuleBuilder}
        onClose={() => {
          setShowRuleBuilder(false);
          setEditingRule(null);
        }}
        onSave={editingRule ? handleUpdateRule : handleCreateRule}
        editRule={editingRule}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!ruleToDelete}
        ruleName={ruleToDelete?.name || ''}
        onConfirm={handleDeleteRule}
        onCancel={() => setRuleToDelete(null)}
        deleting={deleting}
      />
    </>
  );
}
