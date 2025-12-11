'use client';

import React, { useState } from 'react';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MerchantAccount, AccountFees, merchantAccountsApi } from '@/lib/api/merchant-accounts';

interface FeesModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: MerchantAccount;
  onSaved: () => void;
}

interface FeeField {
  key: keyof AccountFees;
  label: string;
  hint?: string;
  isPercentage?: boolean;
  isCurrency?: boolean;
}

const feeFields: { section: string; fields: FeeField[] }[] = [
  {
    section: 'Base Fees',
    fields: [
      { key: 'basePercentage', label: 'Base Percentage', isPercentage: true, hint: 'e.g., 2.9 for 2.9%' },
      { key: 'baseFlatFee', label: 'Base Flat Fee', isCurrency: true, hint: 'Per-transaction fee in cents' },
    ],
  },
  {
    section: 'Card-Specific Fees',
    fields: [
      { key: 'amexPercentage', label: 'AMEX Percentage', isPercentage: true, hint: 'Additional % for AMEX' },
      { key: 'amexFlatFee', label: 'AMEX Flat Fee', isCurrency: true },
      { key: 'corporateCardPercentage', label: 'Corporate Card %', isPercentage: true, hint: 'Additional % for corporate cards' },
    ],
  },
  {
    section: 'International Fees',
    fields: [
      { key: 'internationalPercentage', label: 'International %', isPercentage: true },
      { key: 'internationalFlatFee', label: 'International Flat', isCurrency: true },
      { key: 'currencyConversionPercent', label: 'Currency Conversion %', isPercentage: true },
    ],
  },
  {
    section: 'ACH Fees',
    fields: [
      { key: 'achPercentage', label: 'ACH Percentage', isPercentage: true },
      { key: 'achFlatFee', label: 'ACH Flat Fee', isCurrency: true },
      { key: 'achMaxFee', label: 'ACH Max Fee', isCurrency: true, hint: 'Fee cap per transaction' },
    ],
  },
  {
    section: 'Other Fees',
    fields: [
      { key: 'chargebackFee', label: 'Chargeback Fee', isCurrency: true },
      { key: 'refundFee', label: 'Refund Fee', isCurrency: true },
      { key: 'monthlyFee', label: 'Monthly Fee', isCurrency: true },
    ],
  },
];

export function FeesModal({ isOpen, onClose, account, onSaved }: FeesModalProps) {
  const [fees, setFees] = useState<Partial<AccountFees>>({ ...account.fees });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (key: keyof AccountFees, value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    setFees(prev => ({ ...prev, [key]: numValue }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await merchantAccountsApi.update(account.id, { fees });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save fees');
    } finally {
      setSaving(false);
    }
  };

  const formatValue = (value: number | undefined, isPercentage?: boolean, isCurrency?: boolean) => {
    if (value === undefined) return '';
    if (isPercentage) return `${value}%`;
    if (isCurrency) return `$${(value / 100).toFixed(2)}`;
    return value.toString();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configure Fees"
      description={`Set fee structure for ${account.name}`}
      className="max-w-2xl"
    >
      <div className="p-4 space-y-6">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
            {error}
          </div>
        )}

        {feeFields.map(({ section, fields }) => (
          <div key={section}>
            <h3 className="text-sm font-medium text-foreground mb-3">{section}</h3>
            <div className="grid grid-cols-2 gap-4">
              {fields.map(({ key, label, hint, isPercentage, isCurrency }) => (
                <div key={key}>
                  <label className="block text-sm text-muted-foreground mb-1">{label}</label>
                  <Input
                    type="number"
                    step={isPercentage ? '0.01' : '1'}
                    value={fees[key] ?? ''}
                    onChange={e => handleChange(key, e.target.value)}
                    placeholder={hint}
                  />
                  {fees[key] !== undefined && (
                    <p className="text-xs text-muted-foreground mt-1">
                      = {formatValue(fees[key] as number, isPercentage, isCurrency)}
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
