'use client';

import React, { useState } from 'react';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MerchantAccount, AccountRestrictions, merchantAccountsApi } from '@/lib/api/merchant-accounts';

interface RestrictionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: MerchantAccount;
  onSaved: () => void;
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg cursor-pointer hover:bg-zinc-800">
      <span className="text-sm text-zinc-300">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full transition-colors ${checked ? 'bg-cyan-500' : 'bg-zinc-700'}`}
      >
        <span
          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${checked ? 'translate-x-5' : 'translate-x-1'}`}
        />
      </button>
    </label>
  );
}

function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [input, setInput] = useState('');

  const addTag = () => {
    const trimmed = input.trim().toUpperCase();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setInput('');
    }
  };

  const removeTag = (tag: string) => {
    onChange(value.filter(t => t !== tag));
  };

  return (
    <div>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button type="button" variant="outline" size="sm" onClick={addTag}>
          Add
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {value.map(tag => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-800 text-zinc-300 text-xs rounded"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="text-zinc-500 hover:text-white"
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function RestrictionsModal({ isOpen, onClose, account, onSaved }: RestrictionsModalProps) {
  const [restrictions, setRestrictions] = useState<Partial<AccountRestrictions>>({
    allowedCurrencies: ['USD'],
    primaryCurrency: 'USD',
    highRiskAllowed: false,
    achAllowed: true,
    recurringAllowed: true,
    tokenizationAllowed: true,
    threeDSecureRequired: false,
    ...account.restrictions,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await merchantAccountsApi.update(account.id, { restrictions });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save restrictions');
    } finally {
      setSaving(false);
    }
  };

  const updateArray = (key: keyof AccountRestrictions, value: string[]) => {
    setRestrictions(prev => ({ ...prev, [key]: value }));
  };

  const updateBoolean = (key: keyof AccountRestrictions, value: boolean) => {
    setRestrictions(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configure Restrictions"
      description={`Set restrictions for ${account.name}`}
      className="max-w-2xl"
    >
      <div className="p-4 space-y-6">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
            {error}
          </div>
        )}

        <div>
          <h3 className="text-sm font-medium text-zinc-300 mb-3">Currency Settings</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Primary Currency</label>
              <Input
                value={restrictions.primaryCurrency || ''}
                onChange={e => setRestrictions(prev => ({ ...prev, primaryCurrency: e.target.value.toUpperCase() }))}
                placeholder="USD"
                maxLength={3}
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Allowed Currencies</label>
              <TagInput
                value={restrictions.allowedCurrencies || []}
                onChange={v => updateArray('allowedCurrencies', v)}
                placeholder="e.g., USD, EUR, GBP"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-zinc-300 mb-3">Geographic Restrictions</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Allowed Countries</label>
              <TagInput
                value={restrictions.allowedCountries || []}
                onChange={v => updateArray('allowedCountries', v)}
                placeholder="e.g., US, CA"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Blocked Countries</label>
              <TagInput
                value={restrictions.blockedCountries || []}
                onChange={v => updateArray('blockedCountries', v)}
                placeholder="e.g., RU, CN"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-zinc-300 mb-3">Card Restrictions</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Allowed Card Brands</label>
              <TagInput
                value={restrictions.allowedCardBrands || []}
                onChange={v => updateArray('allowedCardBrands', v)}
                placeholder="e.g., VISA, MC, AMEX"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Blocked Card Brands</label>
              <TagInput
                value={restrictions.blockedCardBrands || []}
                onChange={v => updateArray('blockedCardBrands', v)}
                placeholder="e.g., DISCOVER"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-zinc-300 mb-3">Feature Toggles</h3>
          <div className="grid grid-cols-2 gap-2">
            <Toggle
              checked={restrictions.achAllowed ?? true}
              onChange={v => updateBoolean('achAllowed', v)}
              label="ACH Payments"
            />
            <Toggle
              checked={restrictions.recurringAllowed ?? true}
              onChange={v => updateBoolean('recurringAllowed', v)}
              label="Recurring Payments"
            />
            <Toggle
              checked={restrictions.tokenizationAllowed ?? true}
              onChange={v => updateBoolean('tokenizationAllowed', v)}
              label="Tokenization"
            />
            <Toggle
              checked={restrictions.threeDSecureRequired ?? false}
              onChange={v => updateBoolean('threeDSecureRequired', v)}
              label="3D Secure Required"
            />
            <Toggle
              checked={restrictions.highRiskAllowed ?? false}
              onChange={v => updateBoolean('highRiskAllowed', v)}
              label="High Risk Allowed"
            />
          </div>
        </div>
      </div>

      <ModalFooter>
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
