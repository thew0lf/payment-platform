'use client';

import React, { useState } from 'react';
import {
  Key,
  Plus,
  Copy,
  Trash2,
  MoreHorizontal,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  RefreshCw,
  X,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePermissions } from '@/hooks/use-permissions';
import { formatDate, formatRelativeTime, maskApiKey, copyToClipboard } from '@/lib/utils';

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt?: string;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
}

// Mock data
const mockApiKeys: ApiKey[] = [
  {
    id: 'key_1',
    name: 'Production API',
    keyPrefix: 'pk_live_',
    scopes: ['transactions:read', 'transactions:write', 'customers:read'],
    lastUsedAt: new Date(Date.now() - 5 * 60000).toISOString(),
    isActive: true,
    createdAt: new Date('2024-01-15').toISOString(),
  },
  {
    id: 'key_2',
    name: 'Webhook Integration',
    keyPrefix: 'pk_live_',
    scopes: ['webhooks:read', 'webhooks:write'],
    lastUsedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    expiresAt: new Date('2025-01-15').toISOString(),
    isActive: true,
    createdAt: new Date('2024-02-20').toISOString(),
  },
  {
    id: 'key_3',
    name: 'Test Environment',
    keyPrefix: 'pk_test_',
    scopes: ['transactions:read', 'customers:read'],
    isActive: false,
    createdAt: new Date('2024-03-01').toISOString(),
  },
];

const availableScopes = [
  { id: 'transactions:read', label: 'Read Transactions', description: 'View transaction data' },
  { id: 'transactions:write', label: 'Write Transactions', description: 'Create and modify transactions' },
  { id: 'customers:read', label: 'Read Customers', description: 'View customer data' },
  { id: 'customers:write', label: 'Write Customers', description: 'Create and modify customers' },
  { id: 'webhooks:read', label: 'Read Webhooks', description: 'View webhook configurations' },
  { id: 'webhooks:write', label: 'Write Webhooks', description: 'Configure webhooks' },
];

export default function ApiKeysPage() {
  const { canManageApiKeys } = usePermissions();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(mockApiKeys);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>([]);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCreateKey = () => {
    if (!newKeyName.trim()) return;

    const newKey: ApiKey = {
      id: `key_${Date.now()}`,
      name: newKeyName,
      keyPrefix: 'pk_live_',
      scopes: newKeyScopes,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    setApiKeys([newKey, ...apiKeys]);
    // Simulate generated secret key
    setCreatedKey(`pk_live_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`);
  };

  const handleToggleKey = (id: string) => {
    setApiKeys(keys =>
      keys.map(key =>
        key.id === id ? { ...key, isActive: !key.isActive } : key
      )
    );
  };

  const handleDeleteKey = (id: string) => {
    setApiKeys(keys => keys.filter(key => key.id !== id));
  };

  const handleCopy = async (text: string, id: string) => {
    await copyToClipboard(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setNewKeyName('');
    setNewKeyScopes([]);
    setCreatedKey(null);
  };

  return (
    <>
      <Header
        title="API Keys"
        subtitle="Manage your API keys for programmatic access"
        actions={
          canManageApiKeys && (
            <Button size="sm" onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Create API Key</span>
            </Button>
          )
        }
      />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Security notice */}
        <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-400">Keep your API keys secure</p>
            <p className="text-sm text-muted-foreground mt-1">
              Never share your API keys in public repositories or client-side code.
              Rotate keys regularly and use the minimum required scopes.
            </p>
          </div>
        </div>

        {/* API Keys list */}
        <div className="space-y-4">
          {apiKeys.map(key => (
            <Card key={key.id}>
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                    <div className="p-2 bg-muted rounded-lg flex-shrink-0">
                      <Key className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-medium text-foreground">{key.name}</h3>
                        <Badge variant={key.isActive ? 'success' : 'default'}>
                          {key.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <code className="text-sm text-muted-foreground font-mono">
                          {key.keyPrefix}••••••••••••
                        </code>
                        <button
                          onClick={() => handleCopy(`${key.keyPrefix}...`, key.id)}
                          className="p-1 text-muted-foreground hover:text-foreground"
                        >
                          {copiedId === key.id ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {key.scopes.map(scope => (
                          <span
                            key={scope}
                            className="px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded"
                          >
                            {scope}
                          </span>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>Created {formatDate(key.createdAt)}</span>
                        {key.lastUsedAt && (
                          <span>Last used {formatRelativeTime(key.lastUsedAt)}</span>
                        )}
                        {key.expiresAt && (
                          <span className="text-amber-400">
                            Expires {formatDate(key.expiresAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="flex-shrink-0">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleToggleKey(key.id)}>
                        {key.isActive ? (
                          <>
                            <EyeOff className="w-4 h-4 mr-2" />
                            Disable
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4 mr-2" />
                            Enable
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Regenerate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDeleteKey(key.id)}
                        className="text-red-400 focus:text-red-400"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}

          {apiKeys.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Key className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No API keys yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first API key to start integrating with the platform.
                </p>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create API Key
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create API Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">
                {createdKey ? 'API Key Created' : 'Create API Key'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createdKey ? (
              <div className="p-4 space-y-4">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="w-5 h-5 text-emerald-400" />
                    <span className="font-medium text-emerald-400">Key created successfully</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Copy your API key now. You won&apos;t be able to see it again.
                  </p>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Your API Key</label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={createdKey}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleCopy(createdKey, 'new-key')}
                    >
                      {copiedId === 'new-key' ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button className="w-full" onClick={handleCloseModal}>
                  Done
                </Button>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Name</label>
                  <Input
                    placeholder="e.g., Production API"
                    value={newKeyName}
                    onChange={e => setNewKeyName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Permissions</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {availableScopes.map(scope => (
                      <label
                        key={scope.id}
                        className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted"
                      >
                        <input
                          type="checkbox"
                          checked={newKeyScopes.includes(scope.id)}
                          onChange={e => {
                            if (e.target.checked) {
                              setNewKeyScopes([...newKeyScopes, scope.id]);
                            } else {
                              setNewKeyScopes(newKeyScopes.filter(s => s !== scope.id));
                            }
                          }}
                          className="mt-0.5 rounded border-border bg-muted text-primary focus:ring-primary"
                        />
                        <div>
                          <p className="text-sm font-medium text-foreground">{scope.label}</p>
                          <p className="text-xs text-muted-foreground">{scope.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1" onClick={handleCloseModal}>
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleCreateKey}
                    disabled={!newKeyName.trim()}
                  >
                    Create Key
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
