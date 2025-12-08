/**
 * Integration Failover Configuration
 *
 * Maps primary services to fallback alternatives.
 * When a primary service fails or is unavailable, the system
 * can automatically switch to a compatible fallback.
 */

import { IntegrationProvider, IntegrationCategory } from '../types/integration.types';

// ═══════════════════════════════════════════════════════════════
// FAILOVER GROUPS
// ═══════════════════════════════════════════════════════════════

export interface FailoverGroup {
  category: IntegrationCategory;
  name: string;
  description: string;
  providers: IntegrationProvider[];
  /** Priority order (first = primary, rest = fallbacks) */
  priority: IntegrationProvider[];
  /** Feature compatibility matrix */
  compatibility: FailoverCompatibility;
}

export interface FailoverCompatibility {
  /** Features all providers in group support */
  commonFeatures: string[];
  /** Provider-specific features (may not be available in fallback) */
  providerSpecific: Partial<Record<IntegrationProvider, string[]>>;
}

// ═══════════════════════════════════════════════════════════════
// FAILOVER GROUPS DEFINITION
// ═══════════════════════════════════════════════════════════════

export const FAILOVER_GROUPS: FailoverGroup[] = [
  // ─────────────────────────────────────────────────────────────
  // AI/ML PROVIDERS
  // ─────────────────────────────────────────────────────────────
  {
    category: IntegrationCategory.AI_ML,
    name: 'AI Content Generation',
    description: 'AI providers for content generation, product descriptions, and chat',
    providers: [
      IntegrationProvider.AWS_BEDROCK,
      IntegrationProvider.OPENAI,
    ],
    priority: [
      IntegrationProvider.AWS_BEDROCK,  // Primary - Claude via AWS
      IntegrationProvider.OPENAI,        // Fallback - GPT-4
    ],
    compatibility: {
      commonFeatures: [
        'generateContent',
        'generateProductDescription',
        'generateAltText',
        'suggestCategorization',
        'chatCompletion',
      ],
      providerSpecific: {
        [IntegrationProvider.AWS_BEDROCK]: ['claudeModels', 'titanModels', 'awsIntegration'],
        [IntegrationProvider.OPENAI]: ['gpt4Vision', 'embeddings', 'moderation', 'whisper'],
      },
    },
  },

  // ─────────────────────────────────────────────────────────────
  // EMAIL TRANSACTIONAL
  // ─────────────────────────────────────────────────────────────
  {
    category: IntegrationCategory.EMAIL_TRANSACTIONAL,
    name: 'Transactional Email',
    description: 'Email providers for order confirmations, receipts, notifications',
    providers: [
      IntegrationProvider.AWS_SES,
      IntegrationProvider.SENDGRID,
    ],
    priority: [
      IntegrationProvider.AWS_SES,    // Primary - cost effective, high volume
      IntegrationProvider.SENDGRID,   // Fallback - reliable, good deliverability
    ],
    compatibility: {
      commonFeatures: [
        'sendEmail',
        'sendTemplatedEmail',
        'trackDelivery',
        'bounceHandling',
      ],
      providerSpecific: {
        [IntegrationProvider.AWS_SES]: ['awsIntegration', 'configurationSets', 'dedicatedIPs'],
        [IntegrationProvider.SENDGRID]: ['templateEditor', 'emailValidation', 'inboundParse'],
      },
    },
  },

  // ─────────────────────────────────────────────────────────────
  // EMAIL MARKETING
  // ─────────────────────────────────────────────────────────────
  {
    category: IntegrationCategory.EMAIL_MARKETING,
    name: 'Email Marketing',
    description: 'Email marketing and automation providers',
    providers: [
      IntegrationProvider.KLAVIYO,
      IntegrationProvider.SENDGRID,
    ],
    priority: [
      IntegrationProvider.KLAVIYO,    // Primary - e-commerce focused
      IntegrationProvider.SENDGRID,   // Fallback - general marketing
    ],
    compatibility: {
      commonFeatures: [
        'sendCampaign',
        'manageContacts',
        'segmentation',
        'automations',
      ],
      providerSpecific: {
        [IntegrationProvider.KLAVIYO]: ['ecommerceIntegration', 'predictiveAnalytics', 'smsMarketing'],
        [IntegrationProvider.SENDGRID]: ['templateBuilder', 'abTesting', 'ipWarmup'],
      },
    },
  },

  // ─────────────────────────────────────────────────────────────
  // SMS
  // ─────────────────────────────────────────────────────────────
  {
    category: IntegrationCategory.SMS,
    name: 'SMS Messaging',
    description: 'SMS providers for notifications and alerts',
    providers: [
      IntegrationProvider.TWILIO,
      IntegrationProvider.AWS_SNS,
    ],
    priority: [
      IntegrationProvider.TWILIO,     // Primary - full featured, global
      IntegrationProvider.AWS_SNS,    // Fallback - cost effective, basic
    ],
    compatibility: {
      commonFeatures: [
        'sendSMS',
        'deliveryReceipts',
        'internationalSupport',
      ],
      providerSpecific: {
        [IntegrationProvider.TWILIO]: ['voiceCalls', 'whatsapp', 'programmableMessaging', 'shortCodes'],
        [IntegrationProvider.AWS_SNS]: ['awsIntegration', 'topicSubscriptions', 'pushNotifications'],
      },
    },
  },

  // ─────────────────────────────────────────────────────────────
  // VOICE
  // ─────────────────────────────────────────────────────────────
  {
    category: IntegrationCategory.VOICE,
    name: 'Voice/Phone',
    description: 'Voice and telephony providers for Voice AI',
    providers: [
      IntegrationProvider.TWILIO,
      // Future: Add Amazon Connect, etc.
    ],
    priority: [
      IntegrationProvider.TWILIO,     // Primary - Voice AI
    ],
    compatibility: {
      commonFeatures: [
        'makeCall',
        'receiveCall',
        'twiml',
        'recording',
      ],
      providerSpecific: {
        [IntegrationProvider.TWILIO]: ['voiceAI', 'conferencing', 'transcription', 'sip'],
      },
    },
  },

  // ─────────────────────────────────────────────────────────────
  // PAYMENT GATEWAYS
  // ─────────────────────────────────────────────────────────────
  {
    category: IntegrationCategory.PAYMENT_GATEWAY,
    name: 'Payment Processing',
    description: 'Payment gateway providers for transactions',
    providers: [
      IntegrationProvider.STRIPE,
      IntegrationProvider.PAYPAL_CLASSIC,
      IntegrationProvider.NMI,
      IntegrationProvider.AUTHORIZE_NET,
    ],
    priority: [
      IntegrationProvider.STRIPE,         // Primary - modern API
      IntegrationProvider.NMI,            // Fallback 1 - high volume
      IntegrationProvider.AUTHORIZE_NET,  // Fallback 2 - legacy support
      IntegrationProvider.PAYPAL_CLASSIC, // Fallback 3 - PayPal specific
    ],
    compatibility: {
      commonFeatures: [
        'charge',
        'authorize',
        'capture',
        'refund',
        'void',
      ],
      providerSpecific: {
        [IntegrationProvider.STRIPE]: ['subscriptions', 'paymentIntents', 'radar', 'connect'],
        [IntegrationProvider.PAYPAL_CLASSIC]: ['expressCheckout', 'paypalCredit'],
        [IntegrationProvider.NMI]: ['tokenization', 'customerVault', 'level3Data'],
        [IntegrationProvider.AUTHORIZE_NET]: ['cim', 'arb', 'advancedFraud'],
      },
    },
  },

  // ─────────────────────────────────────────────────────────────
  // MONITORING
  // ─────────────────────────────────────────────────────────────
  {
    category: IntegrationCategory.MONITORING,
    name: 'Application Monitoring',
    description: 'Error tracking and performance monitoring',
    providers: [
      IntegrationProvider.SENTRY,
      IntegrationProvider.DATADOG,
      IntegrationProvider.CLOUDWATCH,
    ],
    priority: [
      IntegrationProvider.SENTRY,      // Primary - error tracking
      IntegrationProvider.DATADOG,     // Fallback 1 - full APM
      IntegrationProvider.CLOUDWATCH,  // Fallback 2 - AWS native
    ],
    compatibility: {
      commonFeatures: [
        'errorTracking',
        'logging',
        'alerting',
      ],
      providerSpecific: {
        [IntegrationProvider.SENTRY]: ['issueGrouping', 'releases', 'userFeedback', 'replays'],
        [IntegrationProvider.DATADOG]: ['apm', 'infrastructure', 'logs', 'synthetics'],
        [IntegrationProvider.CLOUDWATCH]: ['awsIntegration', 'metrics', 'dashboards', 'insights'],
      },
    },
  },

  // ─────────────────────────────────────────────────────────────
  // FEATURE FLAGS
  // ─────────────────────────────────────────────────────────────
  {
    category: IntegrationCategory.FEATURE_FLAGS,
    name: 'Feature Flags',
    description: 'Feature flag and configuration management',
    providers: [
      IntegrationProvider.LAUNCHDARKLY,
      IntegrationProvider.AWS_APPCONFIG,
    ],
    priority: [
      IntegrationProvider.LAUNCHDARKLY,   // Primary - full featured
      IntegrationProvider.AWS_APPCONFIG,  // Fallback - AWS native
    ],
    compatibility: {
      commonFeatures: [
        'getFlag',
        'evaluateFlag',
        'userTargeting',
      ],
      providerSpecific: {
        [IntegrationProvider.LAUNCHDARKLY]: ['experiments', 'segments', 'dataExport', 'webhooks'],
        [IntegrationProvider.AWS_APPCONFIG]: ['awsIntegration', 'deploymentStrategies', 'validators'],
      },
    },
  },

  // ─────────────────────────────────────────────────────────────
  // AUTHENTICATION
  // ─────────────────────────────────────────────────────────────
  {
    category: IntegrationCategory.AUTHENTICATION,
    name: 'Authentication',
    description: 'Identity and access management providers',
    providers: [
      IntegrationProvider.AUTH0,
      IntegrationProvider.OKTA,
      IntegrationProvider.COGNITO,
    ],
    priority: [
      IntegrationProvider.AUTH0,    // Primary - developer friendly
      IntegrationProvider.OKTA,     // Fallback 1 - enterprise
      IntegrationProvider.COGNITO,  // Fallback 2 - AWS native
    ],
    compatibility: {
      commonFeatures: [
        'authenticate',
        'authorize',
        'mfa',
        'sso',
      ],
      providerSpecific: {
        [IntegrationProvider.AUTH0]: ['universalLogin', 'actions', 'organizations', 'passwordless'],
        [IntegrationProvider.OKTA]: ['workforceIdentity', 'lifecycle', 'accessGateway'],
        [IntegrationProvider.COGNITO]: ['awsIntegration', 'userPools', 'identityPools', 'hostedUI'],
      },
    },
  },

  // ─────────────────────────────────────────────────────────────
  // STORAGE
  // ─────────────────────────────────────────────────────────────
  {
    category: IntegrationCategory.STORAGE,
    name: 'File Storage',
    description: 'Object storage for files and media',
    providers: [
      IntegrationProvider.AWS_S3,
      // Future: Add GCS, Azure Blob, Cloudflare R2
    ],
    priority: [
      IntegrationProvider.AWS_S3,  // Primary - industry standard
    ],
    compatibility: {
      commonFeatures: [
        'upload',
        'download',
        'delete',
        'presignedUrls',
      ],
      providerSpecific: {
        [IntegrationProvider.AWS_S3]: ['versioning', 'lifecycle', 'replication', 'glacier'],
      },
    },
  },

  // ─────────────────────────────────────────────────────────────
  // IMAGE PROCESSING
  // ─────────────────────────────────────────────────────────────
  {
    category: IntegrationCategory.IMAGE_PROCESSING,
    name: 'Image Processing',
    description: 'Image optimization and transformation',
    providers: [
      IntegrationProvider.CLOUDINARY,
      // Future: Add imgix, Cloudflare Images
    ],
    priority: [
      IntegrationProvider.CLOUDINARY,  // Primary - full featured
    ],
    compatibility: {
      commonFeatures: [
        'resize',
        'crop',
        'format',
        'optimize',
      ],
      providerSpecific: {
        [IntegrationProvider.CLOUDINARY]: ['backgroundRemoval', 'aiTagging', 'video', 'dam'],
      },
    },
  },
];

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get failover group for a provider
 */
export function getFailoverGroup(provider: IntegrationProvider): FailoverGroup | undefined {
  return FAILOVER_GROUPS.find(group => group.providers.includes(provider));
}

/**
 * Get fallback providers for a given provider
 */
export function getFallbackProviders(provider: IntegrationProvider): IntegrationProvider[] {
  const group = getFailoverGroup(provider);
  if (!group) return [];

  const index = group.priority.indexOf(provider);
  if (index === -1) return [];

  // Return all providers after this one in priority order
  return group.priority.slice(index + 1);
}

/**
 * Get the next fallback provider
 */
export function getNextFallback(provider: IntegrationProvider): IntegrationProvider | undefined {
  const fallbacks = getFallbackProviders(provider);
  return fallbacks[0];
}

/**
 * Check if two providers are compatible (in same failover group)
 */
export function areProvidersCompatible(
  provider1: IntegrationProvider,
  provider2: IntegrationProvider,
): boolean {
  const group = getFailoverGroup(provider1);
  return group?.providers.includes(provider2) ?? false;
}

/**
 * Get common features between providers
 */
export function getCommonFeatures(
  provider1: IntegrationProvider,
  provider2: IntegrationProvider,
): string[] {
  if (!areProvidersCompatible(provider1, provider2)) return [];

  const group = getFailoverGroup(provider1);
  return group?.compatibility.commonFeatures ?? [];
}

/**
 * Get provider-specific features that may be lost on failover
 */
export function getFeaturesLostOnFailover(
  fromProvider: IntegrationProvider,
  toProvider: IntegrationProvider,
): string[] {
  const group = getFailoverGroup(fromProvider);
  if (!group) return [];

  const fromFeatures = group.compatibility.providerSpecific[fromProvider] ?? [];
  const toFeatures = group.compatibility.providerSpecific[toProvider] ?? [];

  // Features in 'from' but not in 'to'
  return fromFeatures.filter(f => !toFeatures.includes(f));
}

/**
 * Get all failover groups by category
 */
export function getFailoverGroupsByCategory(
  category: IntegrationCategory,
): FailoverGroup[] {
  return FAILOVER_GROUPS.filter(group => group.category === category);
}

/**
 * Get the primary provider for a category
 */
export function getPrimaryProvider(category: IntegrationCategory): IntegrationProvider | undefined {
  const groups = getFailoverGroupsByCategory(category);
  return groups[0]?.priority[0];
}

// ═══════════════════════════════════════════════════════════════
// QUICK REFERENCE MAP
// ═══════════════════════════════════════════════════════════════

/**
 * Quick lookup: Provider -> Fallback Chain
 */
export const FAILOVER_CHAIN: Record<IntegrationProvider, IntegrationProvider[]> = {
  // AI/ML
  [IntegrationProvider.AWS_BEDROCK]: [IntegrationProvider.OPENAI],
  [IntegrationProvider.OPENAI]: [IntegrationProvider.AWS_BEDROCK],
  [IntegrationProvider.LANGUAGETOOL]: [], // No direct fallback

  // Email
  [IntegrationProvider.AWS_SES]: [IntegrationProvider.SENDGRID],
  [IntegrationProvider.SENDGRID]: [IntegrationProvider.AWS_SES],
  [IntegrationProvider.KLAVIYO]: [IntegrationProvider.SENDGRID],

  // SMS/Voice
  [IntegrationProvider.TWILIO]: [IntegrationProvider.AWS_SNS],
  [IntegrationProvider.AWS_SNS]: [IntegrationProvider.TWILIO],

  // Payment
  [IntegrationProvider.STRIPE]: [IntegrationProvider.NMI, IntegrationProvider.AUTHORIZE_NET],
  [IntegrationProvider.NMI]: [IntegrationProvider.STRIPE, IntegrationProvider.AUTHORIZE_NET],
  [IntegrationProvider.AUTHORIZE_NET]: [IntegrationProvider.STRIPE, IntegrationProvider.NMI],
  [IntegrationProvider.PAYPAL_CLASSIC]: [], // PayPal-specific, no direct fallback
  [IntegrationProvider.PAYPAL_REST]: [IntegrationProvider.PAYPAL_CLASSIC],
  [IntegrationProvider.PAYPAL_PAYFLOW]: [IntegrationProvider.PAYPAL_CLASSIC],

  // Monitoring
  [IntegrationProvider.SENTRY]: [IntegrationProvider.DATADOG, IntegrationProvider.CLOUDWATCH],
  [IntegrationProvider.DATADOG]: [IntegrationProvider.SENTRY, IntegrationProvider.CLOUDWATCH],
  [IntegrationProvider.CLOUDWATCH]: [IntegrationProvider.SENTRY, IntegrationProvider.DATADOG],

  // Feature Flags
  [IntegrationProvider.LAUNCHDARKLY]: [IntegrationProvider.AWS_APPCONFIG],
  [IntegrationProvider.AWS_APPCONFIG]: [IntegrationProvider.LAUNCHDARKLY],

  // Auth
  [IntegrationProvider.AUTH0]: [IntegrationProvider.OKTA, IntegrationProvider.COGNITO],
  [IntegrationProvider.OKTA]: [IntegrationProvider.AUTH0, IntegrationProvider.COGNITO],
  [IntegrationProvider.COGNITO]: [IntegrationProvider.AUTH0, IntegrationProvider.OKTA],

  // Storage/CDN (no direct fallbacks currently)
  [IntegrationProvider.AWS_S3]: [],
  [IntegrationProvider.AWS_CLOUDFRONT]: [],
  [IntegrationProvider.AWS_ROUTE53]: [],
  [IntegrationProvider.CLOUDINARY]: [],
  [IntegrationProvider.RUNWAY]: [],

  // Deployment (no direct fallbacks)
  [IntegrationProvider.VERCEL]: [],

  // OAuth (no failovers - provider specific)
  [IntegrationProvider.GOOGLE]: [],
  [IntegrationProvider.MICROSOFT]: [],
  [IntegrationProvider.SLACK]: [],
  [IntegrationProvider.HUBSPOT]: [],
  [IntegrationProvider.SALESFORCE]: [],
  [IntegrationProvider.QUICKBOOKS]: [],

  // Location Services (no direct fallbacks)
  [IntegrationProvider.GOOGLE_PLACES]: [],
};
