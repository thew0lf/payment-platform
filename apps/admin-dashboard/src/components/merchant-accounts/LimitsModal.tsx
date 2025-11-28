'use client';

import React, { useState } from 'react';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MerchantAccount, AccountLimits, merchantAccountsApi, formatCurrency } from '@/lib/api/merchant-accounts';

interface LimitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: MerchantAccount;
  onSaved: () => void;
}

interface LimitField {
  key: keyof AccountLimits;
  label: string;
  hint?: string;
  isCurrency?: boolean;
}

const limitFields: { section: string; fields: LimitField[] }[] = [
  {
    section: 'Transaction Limits',
    fields: [
      { key: 'minTransactionAmount', label: 'Minimum Amount', isCurrency: true, hint: 'Minimum transaction amount in cents' },
      { key: 'maxTransactionAmount', label: 'Maximum Amount', isCurrency: true, hint: 'Maximum transaction amount in cents' },
    ],
  },
  {
    section: 'Daily Limits',
    fields: [
      { key: 'dailyTransactionLimit', label: 'Transaction Count', hint: 'Max transactions per day' },
      { key: 'dailyVolumeLimit', label: 'Volume Limit', isCurrency: true, hint: 'Max volume per day in cents' },
    ],
  },
  {
    section: 'Weekly Limits',
    fields: [
      { key: 'weeklyTransactionLimit', label: 'Transaction Count', hint: 'Max transactions per week' },
      { key: 'weeklyVolumeLimit', label: 'Volume Limit', isCurrency: true, hint: 'Max volume per week in cents' },
    ],
  },
  {
    section: 'Monthly Limits',
    fields: [
      { key: 'monthlyTransactionLimit', label: 'Transaction Count', hint: 'Max transactions per month' },
      { key: 'monthlyVolumeLimit', label: 'Volume Limit', isCurrency: true, hint: 'Max volume per month in cents' },
    ],
  },
  {
    section: 'Velocity Controls',
    fields: [
      { key: 'velocityWindow', label: 'Window (minutes)', hint: 'Time window for velocity checks' },
      { key: 'velocityMaxTransactions', label: 'Max Transactions', hint: 'Max transactions in window' },
      { key: 'velocityMaxAmount', label: 'Max Amount', isCurrency: true, hint: 'Max amount in window (cents)' },
    ],
  },
];

export function LimitsModal({ isOpen, onClose, account, onSaved }: LimitsModalProps) {
  const [limits, setLimits] = useState<Partial<AccountLimits>>({ ...account.limits });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (key: keyof AccountLimits, value: string) => {
    const numValue = value === '' ? undefined : parseInt(value, 10);
    setLimits(prev => ({ ...prev, [key]: numValue }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await merchantAccountsApi.update(account.id, { limits });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save limits');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configure Limits"
      description={`Set transaction limits for ${account.name}`}
      className="max-w-2xl"
    >
      <div className="p-4 space-y-6">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
            {error}
          </div>
        )}

        {limitFields.map(({ section, fields }) => (
          <div key={section}>
            <h3 className="text-sm font-medium text-zinc-300 mb-3">{section}</h3>
            <div className="grid grid-cols-2 gap-4">
              {fields.map(({ key, label, hint, isCurrency }) => (
                <div key={key}>
                  <label className="block text-sm text-zinc-400 mb-1">{label}</label>
                  <Input
                    type="number"
                    value={limits[key] ?? ''}
                    onChange={e => handleChange(key, e.target.value)}
                    placeholder={hint}
                  />
                  {isCurrency && limits[key] !== undefined && (
                    <p className="text-xs text-zinc-500 mt-1">
                      = {formatCurrency(limits[key] as number)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
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
