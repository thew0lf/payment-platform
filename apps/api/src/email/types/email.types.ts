// Email Types - SOC2/ISO27001 Compliant Email System
import { EmailTemplateCategory, EmailSendStatus, Prisma } from '@prisma/client';

export interface SendEmailOptions {
  to: string;
  toName?: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  fromEmail?: string;
  fromName?: string;
  replyTo?: string;
  templateCode?: string;
  templateId?: string;
  category: EmailTemplateCategory;
  variables?: Record<string, unknown>;
  organizationId?: string;
  clientId?: string;
  companyId?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface SendTemplatedEmailOptions {
  to: string;
  toName?: string;
  templateCode: string;
  variables: Record<string, unknown>;
  organizationId?: string;
  clientId?: string;
  companyId?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  logId?: string;
  error?: string;
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'url';
  required: boolean;
  description?: string;
  defaultValue?: unknown;
}

export interface EmailTemplateWithContent {
  id: string;
  code: string;
  name: string;
  subject: string;
  htmlBody: string;
  textBody: string | null;
  fromName: string | null;
  fromEmail: string | null;
  replyTo: string | null;
  category: EmailTemplateCategory;
  variables: Prisma.JsonValue;
}

// Re-export EmailSendStatus for convenience
export { EmailSendStatus };

export interface RenderedEmail {
  subject: string;
  htmlBody: string;
  textBody?: string;
}

// Default sender configuration
export const DEFAULT_FROM_EMAIL = 'noreply@avnz.io';
export const DEFAULT_FROM_NAME = 'AVNZ Platform';
export const DEFAULT_REPLY_TO = 'support@avnz.io';

// Rate limiting configuration
export const EMAIL_RATE_LIMITS = {
  maxPerMinute: 60,
  maxPerHour: 1000,
  maxPerDay: 10000,
};
