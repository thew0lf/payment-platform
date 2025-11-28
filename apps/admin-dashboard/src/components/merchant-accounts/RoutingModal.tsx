'use client';

import React, { useState } from 'react';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MerchantAccount, AccountRouting, merchantAccountsApi } from '@/lib/api/merchant-accounts';

interface RoutingModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: MerchantAccount;
  onSaved: () => void;
}

function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <label className="flex items-start justify-between p-3 bg-zinc-800/50 rounded-lg cursor-pointer hover:bg-zinc-800">
      <div>
        <span className="text-sm text-zinc-300 font-medium">{label}</span>
        {description && <p className="text-xs text-zinc-500 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ml-4 ${checked ? 'bg-cyan-500' : 'bg-zinc-700'}`}
      >
        <span
          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${checked ? 'translate-x-5' : 'translate-x-1'}`}
        />
      </button>
    </label>
  );
}

export function RoutingModal({ isOpen, onClose, account, onSaved }: RoutingModalProps) {
  const [routing, setRouting] = useState<Partial<AccountRouting>>({
    ...{
      priority: 1,
      weight: 100,
      isDefault: false,
      isBackupOnly: false,
    },
    ...account.routing,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await merchantAccountsApi.update(account.id, { routing });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save routing');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configure Routing"
      description={`Set routing rules for ${account.name}`}
    >
      <div className="p-4 space-y-6">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
            {error}
          </div>
        )}

        <div>
          <h3 className="text-sm font-medium text-zinc-300 mb-3">Priority & Weight</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Priority</label>
              <Input
                type="number"
                min={1}
                max={100}
                value={routing.priority ?? 1}
                onChange={e => setRouting(prev => ({ ...prev, priority: parseInt(e.target.value, 10) || 1 }))}
              />
              <p className="text-xs text-zinc-500 mt-1">Lower = higher priority (1 is highest)</p>
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Weight</label>
              <Input
                type="number"
                min={0}
                max={100}
                value={routing.weight ?? 100}
                onChange={e => setRouting(prev => ({ ...prev, weight: parseInt(e.target.value, 10) || 0 }))}
              />
              <p className="text-xs text-zinc-500 mt-1">% of traffic when same priority</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-zinc-300 mb-3">Routing Behavior</h3>
          <div className="space-y-2">
            <Toggle
              checked={routing.isDefault ?? false}
              onChange={v => setRouting(prev => ({ ...prev, isDefault: v }))}
              label="Default Account"
              description="Use this account as the default when no specific routing rules match"
            />
            <Toggle
              checked={routing.isBackupOnly ?? false}
              onChange={v => setRouting(prev => ({ ...prev, isBackupOnly: v }))}
              label="Backup Only"
              description="Only route to this account when primary accounts are unavailable"
            />
          </div>
        </div>

        <div className="p-3 bg-zinc-800/50 rounded-lg">
          <h4 className="text-sm font-medium text-zinc-300 mb-2">Routing Summary</h4>
          <ul className="text-xs text-zinc-400 space-y-1">
            <li>
              <span className="text-zinc-500">Priority:</span>{' '}
              {routing.priority === 1 ? 'Highest (1)' : `Level ${routing.priority}`}
            </li>
            <li>
              <span className="text-zinc-500">Traffic Share:</span>{' '}
              {routing.weight}% of traffic at this priority level
            </li>
            <li>
              <span className="text-zinc-500">Role:</span>{' '}
              {routing.isDefault ? 'Default fallback' : routing.isBackupOnly ? 'Backup only' : 'Standard routing'}
            </li>
          </ul>
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
