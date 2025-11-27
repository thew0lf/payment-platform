'use client';

import React from 'react';
import { MoreVertical, Share2, TestTube, Trash2, Star, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  PlatformIntegration,
  ClientIntegration,
  IntegrationProvider,
  IntegrationMode,
  IntegrationCategory,
} from '@/lib/api/integrations';
import { IntegrationStatusBadge } from './integration-status-badge';

type Integration = PlatformIntegration | ClientIntegration;

interface IntegrationCardProps {
  integration: Integration;
  isPlatformView?: boolean;
  onTest?: (id: string) => void;
  onDelete?: (id: string) => void;
  onConfigureSharing?: (integration: PlatformIntegration) => void;
  onSetDefault?: (id: string) => void;
}

const providerLogos: Record<IntegrationProvider, { icon: string; gradient: string }> = {
  [IntegrationProvider.PAYPAL_PAYFLOW]: {
    icon: 'PP',
    gradient: 'from-blue-500 to-blue-600',
  },
  [IntegrationProvider.NMI]: {
    icon: 'NMI',
    gradient: 'from-emerald-500 to-emerald-600',
  },
  [IntegrationProvider.AUTHORIZE_NET]: {
    icon: 'AN',
    gradient: 'from-orange-500 to-orange-600',
  },
  [IntegrationProvider.STRIPE]: {
    icon: 'S',
    gradient: 'from-violet-500 to-violet-600',
  },
  [IntegrationProvider.AUTH0]: {
    icon: 'A0',
    gradient: 'from-rose-500 to-rose-600',
  },
  [IntegrationProvider.OKTA]: {
    icon: 'OK',
    gradient: 'from-blue-600 to-indigo-600',
  },
  [IntegrationProvider.TWILIO]: {
    icon: 'TW',
    gradient: 'from-red-500 to-red-600',
  },
  [IntegrationProvider.SENDGRID]: {
    icon: 'SG',
    gradient: 'from-cyan-500 to-cyan-600',
  },
};

const categoryLabels: Record<IntegrationCategory, string> = {
  [IntegrationCategory.PAYMENT_GATEWAY]: 'Payment Gateway',
  [IntegrationCategory.AUTHENTICATION]: 'Authentication',
  [IntegrationCategory.COMMUNICATION]: 'Communication',
  [IntegrationCategory.ANALYTICS]: 'Analytics',
};

function isPlatformIntegration(integration: Integration): integration is PlatformIntegration {
  return 'isSharedWithClients' in integration;
}

function isClientIntegration(integration: Integration): integration is ClientIntegration {
  return 'mode' in integration;
}

export function IntegrationCard({
  integration,
  isPlatformView = false,
  onTest,
  onDelete,
  onConfigureSharing,
  onSetDefault,
}: IntegrationCardProps) {
  const [showMenu, setShowMenu] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const logo = providerLogos[integration.provider] || {
    icon: integration.provider.charAt(0),
    gradient: 'from-zinc-500 to-zinc-600',
  };

  const categoryLabel = categoryLabels[integration.category] || integration.category;

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-sm bg-gradient-to-br',
              logo.gradient
            )}
          >
            {logo.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-white truncate">{integration.name}</h3>
              {isClientIntegration(integration) && integration.isDefault && (
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              )}
              {isClientIntegration(integration) && integration.mode === IntegrationMode.PLATFORM && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-cyan-500/10 text-cyan-400 text-xs rounded">
                  <Zap className="w-3 h-3" />
                  Platform
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-500 mt-0.5">{categoryLabel}</p>
            {integration.description && (
              <p className="text-sm text-zinc-400 mt-1 line-clamp-2">{integration.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <IntegrationStatusBadge status={integration.status} />
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 overflow-hidden">
                {onTest && (
                  <button
                    onClick={() => {
                      onTest(integration.id);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
                  >
                    <TestTube className="w-4 h-4" />
                    Test Connection
                  </button>
                )}
                {isPlatformView && isPlatformIntegration(integration) && onConfigureSharing && (
                  <button
                    onClick={() => {
                      onConfigureSharing(integration);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
                  >
                    <Share2 className="w-4 h-4" />
                    Configure Sharing
                  </button>
                )}
                {!isPlatformView && isClientIntegration(integration) && !integration.isDefault && onSetDefault && (
                  <button
                    onClick={() => {
                      onSetDefault(integration.id);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
                  >
                    <Star className="w-4 h-4" />
                    Set as Default
                  </button>
                )}
                {onDelete && (
                  <>
                    <div className="border-t border-zinc-700" />
                    <button
                      onClick={() => {
                        onDelete(integration.id);
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-zinc-700"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Platform sharing info */}
      {isPlatformView && isPlatformIntegration(integration) && (
        <div className="mt-4 pt-3 border-t border-zinc-800">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-500">Client Sharing</span>
            {integration.isSharedWithClients ? (
              <span className="flex items-center gap-1 text-emerald-400">
                <Share2 className="w-3.5 h-3.5" />
                Enabled
              </span>
            ) : (
              <span className="text-zinc-500">Disabled</span>
            )}
          </div>
          {integration.isSharedWithClients && integration.clientPricing && (
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-zinc-500">Pricing</span>
              <span className="text-zinc-400">
                {integration.clientPricing.type === 'percentage'
                  ? `${integration.clientPricing.percentage}%`
                  : `$${(integration.clientPricing.amount / 100).toFixed(2)}`}{' '}
                per txn
              </span>
            </div>
          )}
        </div>
      )}

      {/* Client usage info */}
      {!isPlatformView && isClientIntegration(integration) && integration.usageThisMonth && (
        <div className="mt-4 pt-3 border-t border-zinc-800">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-500">This Month</span>
            <span className="text-zinc-400">
              {integration.usageThisMonth.transactionCount.toLocaleString()} txns
            </span>
          </div>
        </div>
      )}

      {/* Last tested info */}
      {integration.lastTestedAt && (
        <div className="mt-2 text-xs text-zinc-600">
          Last tested: {new Date(integration.lastTestedAt).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}
