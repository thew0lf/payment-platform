'use client';

import React from 'react';
import Image from 'next/image';
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

// Provider configuration with icons and brand colors
const providerConfig: Record<string, { icon: string; iconUrl?: string; bgColor: string; gradient: string }> = {
  // Payment Gateways
  [IntegrationProvider.PAYPAL_PAYFLOW]: {
    icon: 'PP',
    iconUrl: '/integrations/paypal.svg',
    bgColor: 'bg-[#003087]',
    gradient: 'from-[#003087] to-[#009cde]',
  },
  [IntegrationProvider.PAYPAL_REST]: {
    icon: 'PP',
    iconUrl: '/integrations/paypal.svg',
    bgColor: 'bg-[#003087]',
    gradient: 'from-[#003087] to-[#009cde]',
  },
  [IntegrationProvider.STRIPE]: {
    icon: 'S',
    iconUrl: '/integrations/stripe.svg',
    bgColor: 'bg-[#635BFF]',
    gradient: 'from-[#635BFF] to-[#8B85FF]',
  },
  [IntegrationProvider.AUTHORIZE_NET]: {
    icon: 'AN',
    iconUrl: '/integrations/authorize-net.svg',
    bgColor: 'bg-[#F26722]',
    gradient: 'from-[#F26722] to-[#FF8B4D]',
  },
  [IntegrationProvider.NMI]: {
    icon: 'NMI',
    iconUrl: '/integrations/nmi.svg',
    bgColor: 'bg-[#00A651]',
    gradient: 'from-[#00A651] to-[#00D468]',
  },
  // Authentication
  [IntegrationProvider.AUTH0]: {
    icon: 'A0',
    iconUrl: '/integrations/auth0.svg',
    bgColor: 'bg-[#EB5424]',
    gradient: 'from-[#EB5424] to-[#FF7A4D]',
  },
  [IntegrationProvider.OKTA]: {
    icon: 'OK',
    iconUrl: '/integrations/okta.svg',
    bgColor: 'bg-[#007DC1]',
    gradient: 'from-[#007DC1] to-[#00A3E0]',
  },
  [IntegrationProvider.COGNITO]: {
    icon: 'CG',
    iconUrl: '/integrations/cognito.svg',
    bgColor: 'bg-[#DD344C]',
    gradient: 'from-[#DD344C] to-[#FF5A6E]',
  },
  // Communication
  [IntegrationProvider.TWILIO]: {
    icon: 'TW',
    iconUrl: '/integrations/twilio.svg',
    bgColor: 'bg-[#F22F46]',
    gradient: 'from-[#F22F46] to-[#FF5A6E]',
  },
  [IntegrationProvider.SENDGRID]: {
    icon: 'SG',
    iconUrl: '/integrations/sendgrid.svg',
    bgColor: 'bg-[#1A82E2]',
    gradient: 'from-[#1A82E2] to-[#4DA3FF]',
  },
  [IntegrationProvider.AWS_SES]: {
    icon: 'SES',
    iconUrl: '/integrations/aws-ses.svg',
    bgColor: 'bg-[#232F3E]',
    gradient: 'from-[#232F3E] to-[#FF9900]',
  },
  [IntegrationProvider.AWS_SNS]: {
    icon: 'SNS',
    bgColor: 'bg-[#232F3E]',
    gradient: 'from-[#232F3E] to-[#FF9900]',
  },
  [IntegrationProvider.KLAVIYO]: {
    icon: 'KL',
    iconUrl: '/integrations/klaviyo.svg',
    bgColor: 'bg-[#111111]',
    gradient: 'from-[#111111] to-[#5DCB7E]',
  },
  // OAuth Providers
  [IntegrationProvider.GOOGLE]: {
    icon: 'G',
    iconUrl: '/integrations/google.svg',
    bgColor: 'bg-white',
    gradient: 'from-[#4285F4] to-[#34A853]',
  },
  [IntegrationProvider.MICROSOFT]: {
    icon: 'MS',
    iconUrl: '/integrations/microsoft.svg',
    bgColor: 'bg-white',
    gradient: 'from-[#00A4EF] to-[#7FBA00]',
  },
  [IntegrationProvider.SLACK]: {
    icon: 'SL',
    iconUrl: '/integrations/slack.svg',
    bgColor: 'bg-[#4A154B]',
    gradient: 'from-[#4A154B] to-[#E01E5A]',
  },
  [IntegrationProvider.HUBSPOT]: {
    icon: 'HS',
    iconUrl: '/integrations/hubspot.svg',
    bgColor: 'bg-[#FF7A59]',
    gradient: 'from-[#FF7A59] to-[#FF9A7A]',
  },
  [IntegrationProvider.SALESFORCE]: {
    icon: 'SF',
    iconUrl: '/integrations/salesforce.svg',
    bgColor: 'bg-[#00A1E0]',
    gradient: 'from-[#00A1E0] to-[#1ECBE1]',
  },
  [IntegrationProvider.QUICKBOOKS]: {
    icon: 'QB',
    iconUrl: '/integrations/quickbooks.svg',
    bgColor: 'bg-[#2CA01C]',
    gradient: 'from-[#2CA01C] to-[#4CD93A]',
  },
  // AI & ML
  [IntegrationProvider.AWS_BEDROCK]: {
    icon: 'BR',
    iconUrl: '/integrations/aws-bedrock.svg',
    bgColor: 'bg-[#232F3E]',
    gradient: 'from-[#232F3E] to-[#FF9900]',
  },
  [IntegrationProvider.OPENAI]: {
    icon: 'AI',
    iconUrl: '/integrations/openai.svg',
    bgColor: 'bg-[#10A37F]',
    gradient: 'from-[#10A37F] to-[#1ED9A4]',
  },
  [IntegrationProvider.LANGUAGETOOL]: {
    icon: 'LT',
    iconUrl: '/integrations/languagetool.svg',
    bgColor: 'bg-[#0A2540]',
    gradient: 'from-[#0A2540] to-[#486BF7]',
  },
  // Storage
  [IntegrationProvider.AWS_S3]: {
    icon: 'S3',
    iconUrl: '/integrations/aws-s3.svg',
    bgColor: 'bg-[#232F3E]',
    gradient: 'from-[#232F3E] to-[#569A31]',
  },
  // Image Processing (NOT storage - processes images on-demand)
  [IntegrationProvider.CLOUDINARY]: {
    icon: 'CL',
    iconUrl: '/integrations/cloudinary.svg',
    bgColor: 'bg-[#3448C5]',
    gradient: 'from-[#3448C5] to-[#F5BD51]',
  },
  // Monitoring
  [IntegrationProvider.DATADOG]: {
    icon: 'DD',
    bgColor: 'bg-[#632CA6]',
    gradient: 'from-[#632CA6] to-[#9B59D0]',
  },
  [IntegrationProvider.SENTRY]: {
    icon: 'ST',
    bgColor: 'bg-[#362D59]',
    gradient: 'from-[#362D59] to-[#6C5FC7]',
  },
  [IntegrationProvider.CLOUDWATCH]: {
    icon: 'CW',
    bgColor: 'bg-[#232F3E]',
    gradient: 'from-[#232F3E] to-[#FF9900]',
  },
  // Feature Flags
  [IntegrationProvider.LAUNCHDARKLY]: {
    icon: 'LD',
    bgColor: 'bg-[#405BFF]',
    gradient: 'from-[#405BFF] to-[#7B8CFF]',
  },
  [IntegrationProvider.AWS_APPCONFIG]: {
    icon: 'AC',
    bgColor: 'bg-[#232F3E]',
    gradient: 'from-[#232F3E] to-[#FF9900]',
  },
};

// Legacy support - map old providerLogos to new structure
const providerLogos = providerConfig;

const categoryLabels: Record<IntegrationCategory, string> = {
  [IntegrationCategory.PAYMENT_GATEWAY]: 'Payment Gateway',
  [IntegrationCategory.AUTHENTICATION]: 'Authentication',
  [IntegrationCategory.COMMUNICATION]: 'Communication',
  [IntegrationCategory.ANALYTICS]: 'Analytics',
  [IntegrationCategory.OAUTH]: 'Connected Services',
  [IntegrationCategory.EMAIL_TRANSACTIONAL]: 'Email',
  [IntegrationCategory.SMS]: 'SMS',
  [IntegrationCategory.AI_ML]: 'AI & Machine Learning',
  [IntegrationCategory.STORAGE]: 'Storage',
  [IntegrationCategory.IMAGE_PROCESSING]: 'Image Processing',
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

  // Get provider config or generate a fallback with initials (never a question mark)
  const getProviderInitials = (provider: string) => {
    // Convert PAYPAL_REST -> PR, AUTHORIZE_NET -> AN, etc.
    return provider.split('_').map(word => word.charAt(0)).join('').substring(0, 3);
  };

  const config = providerConfig[integration.provider] || {
    icon: getProviderInitials(integration.provider),
    bgColor: 'bg-zinc-700',
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
              'w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden',
              config.iconUrl ? config.bgColor : `bg-gradient-to-br ${config.gradient}`
            )}
          >
            {config.iconUrl ? (
              <Image
                src={config.iconUrl}
                alt={integration.name}
                width={32}
                height={32}
                className="w-8 h-8 object-contain"
              />
            ) : (
              <span className="text-white font-bold text-sm">{config.icon}</span>
            )}
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
