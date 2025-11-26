/**
 * Delivery Orchestration Types
 * Multi-Channel Message Delivery & Automation
 */

// ═══════════════════════════════════════════════════════════════
// CHANNEL TYPES
// ═══════════════════════════════════════════════════════════════

export enum DeliveryChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH_NOTIFICATION = 'PUSH_NOTIFICATION',
  IN_APP = 'IN_APP',
  VOICE = 'VOICE',
  WEBHOOK = 'WEBHOOK',
}

export enum DeliveryStatus {
  PENDING = 'PENDING',
  QUEUED = 'QUEUED',
  SENDING = 'SENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  OPENED = 'OPENED',
  CLICKED = 'CLICKED',
  CONVERTED = 'CONVERTED',
  FAILED = 'FAILED',
  BOUNCED = 'BOUNCED',
  UNSUBSCRIBED = 'UNSUBSCRIBED',
  COMPLAINED = 'COMPLAINED',
}

export enum DeliveryPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum ScheduleType {
  IMMEDIATE = 'IMMEDIATE',
  SCHEDULED = 'SCHEDULED',
  OPTIMAL = 'OPTIMAL', // AI-determined best time
  EVENT_TRIGGERED = 'EVENT_TRIGGERED',
}

// ═══════════════════════════════════════════════════════════════
// MESSAGE
// ═══════════════════════════════════════════════════════════════

export interface DeliveryMessage {
  id: string;
  companyId: string;

  // Recipient
  customerId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientDeviceTokens?: string[];

  // Channel
  channel: DeliveryChannel;
  priority: DeliveryPriority;

  // Content
  templateId?: string;
  contentId?: string;
  subject?: string;
  body: string;
  bodyHtml?: string;

  // Metadata
  category: string; // e.g., 'save_flow', 'winback', 'transactional'
  tags?: string[];

  // Scheduling
  scheduleType: ScheduleType;
  scheduledFor?: Date;
  optimalSendWindow?: {
    start: Date;
    end: Date;
  };

  // Status
  status: DeliveryStatus;
  statusHistory: StatusChange[];

  // Tracking
  providerMessageId?: string;
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  convertedAt?: Date;
  failedAt?: Date;
  failureReason?: string;

  // Engagement
  opensCount: number;
  clicksCount: number;
  clickedLinks?: string[];

  // A/B testing
  variantId?: string;
  experimentId?: string;

  // Automation
  automationId?: string;
  automationStepId?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface StatusChange {
  status: DeliveryStatus;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════
// AUTOMATION / JOURNEY
// ═══════════════════════════════════════════════════════════════

export interface Automation {
  id: string;
  companyId: string;

  // Automation details
  name: string;
  description?: string;
  category: string;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';

  // Trigger
  trigger: AutomationTrigger;

  // Steps
  steps: AutomationStep[];

  // Settings
  settings: {
    allowReentry: boolean;
    reentryDelay?: number; // Hours
    exitOnConversion: boolean;
    maxEnrollmentsPerDay?: number;
    respectQuietHours: boolean;
    quietHours?: {
      start: string;
      end: string;
      timezone: string;
    };
  };

  // Stats
  enrollmentCount: number;
  completionCount: number;
  conversionCount: number;
  conversionRate?: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  activatedAt?: Date;
}

export interface AutomationTrigger {
  type: AutomationTriggerType;
  conditions?: TriggerCondition[];
  filters?: CustomerFilter[];
}

export enum AutomationTriggerType {
  // Customer lifecycle
  CUSTOMER_CREATED = 'CUSTOMER_CREATED',
  SUBSCRIPTION_CREATED = 'SUBSCRIPTION_CREATED',
  SUBSCRIPTION_CANCELLED = 'SUBSCRIPTION_CANCELLED',
  SUBSCRIPTION_PAUSED = 'SUBSCRIPTION_PAUSED',
  SUBSCRIPTION_RESUMED = 'SUBSCRIPTION_RESUMED',

  // Engagement
  ORDER_PLACED = 'ORDER_PLACED',
  ORDER_SHIPPED = 'ORDER_SHIPPED',
  ORDER_DELIVERED = 'ORDER_DELIVERED',
  CART_ABANDONED = 'CART_ABANDONED',

  // Churn signals
  CHURN_RISK_HIGH = 'CHURN_RISK_HIGH',
  CANCEL_PAGE_VISIT = 'CANCEL_PAGE_VISIT',
  SAVE_FLOW_COMPLETED = 'SAVE_FLOW_COMPLETED',

  // Custom
  CUSTOM_EVENT = 'CUSTOM_EVENT',
  SCHEDULED = 'SCHEDULED',
  API_TRIGGER = 'API_TRIGGER',
}

export interface TriggerCondition {
  field: string;
  operator:
    | 'equals'
    | 'not_equals'
    | 'greater_than'
    | 'less_than'
    | 'contains'
    | 'in';
  value: string | number | string[];
}

export interface CustomerFilter {
  field: string;
  operator: string;
  value: unknown;
}

export interface AutomationStep {
  id: string;
  order: number;
  type: AutomationStepType;
  config: StepConfig;
  nextSteps?: ConditionalNext[];
}

export enum AutomationStepType {
  SEND_EMAIL = 'SEND_EMAIL',
  SEND_SMS = 'SEND_SMS',
  SEND_PUSH = 'SEND_PUSH',
  SEND_IN_APP = 'SEND_IN_APP',
  INITIATE_CALL = 'INITIATE_CALL',
  WAIT = 'WAIT',
  CONDITION = 'CONDITION',
  SPLIT = 'SPLIT',
  WEBHOOK = 'WEBHOOK',
  UPDATE_CUSTOMER = 'UPDATE_CUSTOMER',
  ADD_TAG = 'ADD_TAG',
  REMOVE_TAG = 'REMOVE_TAG',
  GOAL = 'GOAL',
  END = 'END',
}

export interface StepConfig {
  // For send steps
  templateId?: string;
  contentId?: string;
  subject?: string;
  body?: string;

  // For wait steps
  waitDuration?: number;
  waitUnit?: 'minutes' | 'hours' | 'days';
  waitUntil?: string; // Time of day

  // For condition steps
  conditions?: TriggerCondition[];

  // For split steps
  splitType?: 'random' | 'attribute';
  splitRatio?: number[];
  splitAttribute?: string;

  // For webhook
  webhookUrl?: string;
  webhookMethod?: 'GET' | 'POST';
  webhookHeaders?: Record<string, string>;
  webhookBody?: string;

  // For update customer
  updateFields?: Record<string, unknown>;

  // For tags
  tagName?: string;

  // For goal
  goalEvent?: string;
  goalTimeout?: number;
}

export interface ConditionalNext {
  condition: 'yes' | 'no' | 'default' | string;
  nextStepId: string;
}

// ═══════════════════════════════════════════════════════════════
// AUTOMATION ENROLLMENT
// ═══════════════════════════════════════════════════════════════

export interface AutomationEnrollment {
  id: string;
  automationId: string;
  customerId: string;

  status: 'ACTIVE' | 'COMPLETED' | 'EXITED' | 'PAUSED' | 'FAILED';

  currentStepId?: string;
  currentStepStartedAt?: Date;

  stepsCompleted: string[];
  messagesSent: string[];

  triggerData?: Record<string, unknown>;

  enrolledAt: Date;
  completedAt?: Date;
  exitedAt?: Date;
  exitReason?: string;

  convertedAt?: Date;
  conversionValue?: number;
}

// ═══════════════════════════════════════════════════════════════
// CHANNEL PROVIDERS
// ═══════════════════════════════════════════════════════════════

export interface ChannelProvider {
  id: string;
  companyId: string;

  channel: DeliveryChannel;
  provider: string; // e.g., 'ses', 'sendgrid', 'twilio'

  isDefault: boolean;
  isActive: boolean;

  config: ProviderConfig;

  // Rate limiting
  rateLimit?: {
    maxPerSecond: number;
    maxPerMinute: number;
    maxPerHour: number;
    maxPerDay: number;
  };

  // Stats
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  deliveryRate?: number;

  createdAt: Date;
  updatedAt: Date;
}

export interface ProviderConfig {
  // Email (SES)
  sesRegion?: string;
  sesFromEmail?: string;
  sesFromName?: string;

  // Email (SendGrid)
  sendgridApiKey?: string;
  sendgridFromEmail?: string;

  // SMS (Twilio)
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioFromNumber?: string;

  // Push (Firebase)
  firebaseProjectId?: string;
  firebaseCredentials?: string;

  // Webhook
  webhookSecret?: string;
}

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

export interface DeliveryConfig {
  companyId: string;

  // Channel preferences
  channelPriority: DeliveryChannel[];
  defaultChannel: DeliveryChannel;

  // Send time optimization
  sendTimeOptimization: {
    enabled: boolean;
    defaultSendHour: number;
    respectTimezone: boolean;
    quietHoursEnabled: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
  };

  // Rate limiting
  globalRateLimits: {
    maxMessagesPerCustomerPerDay: number;
    maxMessagesPerCustomerPerWeek: number;
    channelLimits: Record<DeliveryChannel, number>;
  };

  // Preferences
  honorUnsubscribes: boolean;
  doubleOptIn: boolean;

  // Tracking
  trackOpens: boolean;
  trackClicks: boolean;
  trackConversions: boolean;

  // Retry settings
  retrySettings: {
    maxRetries: number;
    retryDelayMinutes: number;
    exponentialBackoff: boolean;
  };
}

// ═══════════════════════════════════════════════════════════════
// DTOs
// ═══════════════════════════════════════════════════════════════

export interface SendMessageDto {
  companyId: string;
  customerId: string;
  channel: DeliveryChannel;

  // Content
  templateId?: string;
  subject?: string;
  body: string;
  bodyHtml?: string;

  // Options
  priority?: DeliveryPriority;
  scheduleType?: ScheduleType;
  scheduledFor?: Date;

  // Metadata
  category: string;
  tags?: string[];

  // Automation
  automationId?: string;
  automationStepId?: string;
}

export interface CreateAutomationDto {
  companyId: string;
  name: string;
  description?: string;
  category: string;
  trigger: AutomationTrigger;
  steps: Omit<AutomationStep, 'id'>[];
  settings?: Automation['settings'];
}

export interface EnrollCustomerDto {
  automationId: string;
  customerId: string;
  triggerData?: Record<string, unknown>;
}

export interface TrackEventDto {
  messageId: string;
  event:
    | 'delivered'
    | 'opened'
    | 'clicked'
    | 'converted'
    | 'bounced'
    | 'complained'
    | 'unsubscribed';
  metadata?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════════════════════

export interface MessageSentEvent {
  messageId: string;
  channel: DeliveryChannel;
  customerId: string;
  providerMessageId: string;
}

export interface MessageDeliveredEvent {
  messageId: string;
  deliveredAt: Date;
}

export interface MessageOpenedEvent {
  messageId: string;
  openedAt: Date;
  userAgent?: string;
}

export interface MessageClickedEvent {
  messageId: string;
  clickedAt: Date;
  link: string;
}

export interface AutomationEnrolledEvent {
  enrollmentId: string;
  automationId: string;
  customerId: string;
}

export interface AutomationCompletedEvent {
  enrollmentId: string;
  automationId: string;
  customerId: string;
  converted: boolean;
}
