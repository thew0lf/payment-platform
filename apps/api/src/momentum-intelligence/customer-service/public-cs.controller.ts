import {
  Controller,
  Post,
  Body,
  Param,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PrismaService } from '../../prisma/prisma.service';
import { CustomerServiceService } from './customer-service.service';
import { CSSession, CSMessage, IssueCategory } from '../types/customer-service.types';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Rate limit: 10 requests per minute for session creation */
const SESSION_RATE_LIMIT = { limit: 10, ttl: 60000 };

/** Rate limit: 30 messages per minute for chat */
const MESSAGE_RATE_LIMIT = { limit: 30, ttl: 60000 };

/** Rate limit: 5 callback requests per hour */
const CALLBACK_RATE_LIMIT = { limit: 5, ttl: 3600000 };

/** Rate limit: 10 tickets per hour */
const TICKET_RATE_LIMIT = { limit: 10, ttl: 3600000 };

/** Phone number validation: 10-15 digits, optional + prefix */
const PHONE_REGEX = /^\+?[1-9]\d{9,14}$/;

// =============================================================================
// DTOs
// =============================================================================

interface CreatePublicSessionDto {
  companyId: string;
  sessionToken?: string;
  funnelId?: string;
  channel: 'chat' | 'callback' | 'ticket';
  initialMessage?: string;
}

interface SendPublicMessageDto {
  sessionToken?: string;
  content: string;
}

interface RequestCallbackDto {
  companyId: string;
  sessionToken?: string;
  funnelId?: string;
  phone: string;
  preferredTime?: string;
  message?: string;
}

interface SubmitTicketDto {
  companyId: string;
  sessionToken?: string;
  funnelId?: string;
  subject: string;
  message: string;
  email?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Sanitize user input to prevent XSS
 * Removes HTML tags and trims whitespace
 */
function sanitizeInput(input: string | undefined): string {
  if (!input) return '';
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>]/g, '') // Remove any remaining angle brackets
    .trim();
}

/**
 * Validate phone number format
 * Accepts international format: +1234567890 or 1234567890
 */
function isValidPhoneNumber(phone: string): boolean {
  const digits = phone.replace(/[\s\-\(\)\.]/g, ''); // Remove common separators
  return PHONE_REGEX.test(digits);
}

/**
 * Normalize phone number to digits only with optional +
 */
function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
  return cleaned.startsWith('+') ? cleaned : cleaned;
}

// =============================================================================
// PUBLIC CS CONTROLLER (No JWT Required)
// =============================================================================

@Controller('cs')
export class PublicCSController {
  private readonly logger = new Logger(PublicCSController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly csService: CustomerServiceService,
  ) {}

  /**
   * Validate session token and get related info
   */
  private async validateSessionToken(sessionToken?: string): Promise<{
    funnelSessionId?: string;
    customerId?: string;
    email?: string;
  } | null> {
    if (!sessionToken) return null;

    const funnelSession = await this.prisma.funnelSession.findFirst({
      where: { sessionToken },
      select: {
        id: true,
        customerInfo: true,
        shippingAddress: true,
      },
    });

    if (!funnelSession) return null;

    // Extract customer ID and email from customerInfo JSON
    const customerData = funnelSession.customerInfo as Record<string, unknown> | null;
    const customerId = customerData?.customerId as string | undefined;

    // Extract email from shipping address or customerInfo if available
    const shippingData = funnelSession.shippingAddress as Record<string, unknown> | null;
    const email = (shippingData?.email as string) || (customerData?.email as string) || undefined;

    return {
      funnelSessionId: funnelSession.id,
      customerId,
      email,
    };
  }

  /**
   * Generate a temporary customer ID for anonymous users
   */
  private generateAnonymousCustomerId(): string {
    return `anon_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Log audit event for CS actions
   */
  private async logAuditEvent(
    action: string,
    entityId: string,
    companyId: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action,
          entity: 'CSSession',
          entityId,
          metadata: {
            ...metadata,
            companyId,
            source: 'public_cs_widget',
          },
          ipAddress: null,
          userAgent: null,
        },
      });
    } catch (error) {
      // Don't fail the main operation if audit logging fails
      this.logger.warn(`Failed to log audit event: ${error}`);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // SESSION ENDPOINTS
  // ─────────────────────────────────────────────────────────────

  /**
   * Start a new CS session
   * POST /api/cs/sessions
   * Rate limited: 10 requests per minute
   */
  @Post('sessions')
  @Throttle({ default: SESSION_RATE_LIMIT })
  async startSession(@Body() dto: CreatePublicSessionDto): Promise<CSSession> {
    if (!dto.companyId) {
      throw new BadRequestException('Company ID is required');
    }

    // Validate company exists
    const company = await this.prisma.company.findFirst({
      where: { id: dto.companyId, deletedAt: null },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Get customer info from session token if available
    const sessionInfo = await this.validateSessionToken(dto.sessionToken);
    const customerId = sessionInfo?.customerId || this.generateAnonymousCustomerId();

    // Sanitize initial message
    const sanitizedMessage = sanitizeInput(dto.initialMessage);

    // Create CS session
    const session = await this.csService.startSession({
      companyId: dto.companyId,
      customerId,
      channel: dto.channel === 'callback' || dto.channel === 'ticket' ? 'chat' : dto.channel,
      initialMessage: sanitizedMessage || undefined,
      metadata: {
        funnelSessionId: sessionInfo?.funnelSessionId,
        funnelId: dto.funnelId,
        isAnonymous: !sessionInfo?.customerId,
      },
    });

    // Link CS session to funnel session if available
    if (sessionInfo?.funnelSessionId) {
      await this.prisma.funnelSession.update({
        where: { id: sessionInfo.funnelSessionId },
        data: { csSessionId: session.id },
      });
    }

    // Audit log
    await this.logAuditEvent('CS_SESSION_CREATED', session.id, dto.companyId, {
      channel: dto.channel,
      isAnonymous: !sessionInfo?.customerId,
      hasFunnelSession: !!sessionInfo?.funnelSessionId,
    });

    this.logger.log(`CS session created: ${session.id} for company ${dto.companyId}`);

    return session;
  }

  /**
   * Send a message in an existing CS session
   * POST /api/cs/sessions/:sessionId/messages
   * Rate limited: 30 messages per minute
   */
  @Post('sessions/:sessionId/messages')
  @Throttle({ default: MESSAGE_RATE_LIMIT })
  async sendMessage(
    @Param('sessionId') sessionId: string,
    @Body() dto: SendPublicMessageDto,
  ): Promise<{ session: CSSession; customerMessage: CSMessage; response: CSMessage }> {
    // Sanitize and validate content
    const sanitizedContent = sanitizeInput(dto.content);
    if (!sanitizedContent) {
      throw new BadRequestException('Message content is required');
    }

    // Verify session exists
    const existingSession = await this.csService.getSessionById(sessionId);
    if (!existingSession) {
      throw new NotFoundException('Session not found');
    }

    // Send message and get AI response
    const result = await this.csService.sendMessage({
      sessionId,
      message: sanitizedContent,
    });

    // Audit log
    await this.logAuditEvent('CS_MESSAGE_SENT', sessionId, existingSession.companyId, {
      messageLength: sanitizedContent.length,
    });

    return {
      session: result.session,
      customerMessage: {
        id: `msg_${Date.now()}`,
        role: 'customer',
        content: sanitizedContent,
        timestamp: new Date(),
      },
      response: result.response,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // CALLBACK REQUEST
  // ─────────────────────────────────────────────────────────────

  /**
   * Request a callback
   * POST /api/cs/callback
   * Rate limited: 5 requests per hour
   */
  @Post('callback')
  @Throttle({ default: CALLBACK_RATE_LIMIT })
  async requestCallback(@Body() dto: RequestCallbackDto): Promise<{ success: boolean; message: string }> {
    if (!dto.companyId) {
      throw new BadRequestException('Company ID is required');
    }

    // Validate and normalize phone number
    const sanitizedPhone = sanitizeInput(dto.phone);
    if (!sanitizedPhone) {
      throw new BadRequestException('Phone number is required');
    }
    if (!isValidPhoneNumber(sanitizedPhone)) {
      throw new BadRequestException('Please provide a valid phone number (10-15 digits)');
    }
    const normalizedPhone = normalizePhone(sanitizedPhone);

    // Validate company exists
    const company = await this.prisma.company.findFirst({
      where: { id: dto.companyId, deletedAt: null },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Get session info if available
    const sessionInfo = await this.validateSessionToken(dto.sessionToken);
    const customerId = sessionInfo?.customerId || this.generateAnonymousCustomerId();

    // Sanitize optional message
    const sanitizedMessage = sanitizeInput(dto.message);
    const sanitizedTime = sanitizeInput(dto.preferredTime);

    // Create a CS session for the callback request
    const session = await this.csService.startSession({
      companyId: dto.companyId,
      customerId,
      channel: 'voice',
      initialMessage: `Callback requested: ${normalizedPhone}${sanitizedTime ? ` (Preferred: ${sanitizedTime})` : ''}${sanitizedMessage ? `\n\nMessage: ${sanitizedMessage}` : ''}`,
      issueCategory: IssueCategory.GENERAL_INQUIRY,
      metadata: {
        type: 'callback_request',
        phone: normalizedPhone,
        preferredTime: sanitizedTime,
        funnelSessionId: sessionInfo?.funnelSessionId,
        funnelId: dto.funnelId,
      },
    });

    // Link to funnel session if available
    if (sessionInfo?.funnelSessionId) {
      await this.prisma.funnelSession.update({
        where: { id: sessionInfo.funnelSessionId },
        data: { csSessionId: session.id },
      });
    }

    // Audit log
    await this.logAuditEvent('CS_CALLBACK_REQUESTED', session.id, dto.companyId, {
      hasPreferredTime: !!sanitizedTime,
      hasMessage: !!sanitizedMessage,
      hasFunnelSession: !!sessionInfo?.funnelSessionId,
    });

    this.logger.log(`Callback requested: ${session.id} for company ${dto.companyId}`);

    return {
      success: true,
      message: 'Callback request submitted successfully. We will call you soon!',
    };
  }

  // ─────────────────────────────────────────────────────────────
  // TICKET SUBMISSION
  // ─────────────────────────────────────────────────────────────

  /**
   * Submit a support ticket
   * POST /api/cs/tickets
   * Rate limited: 10 tickets per hour
   */
  @Post('tickets')
  @Throttle({ default: TICKET_RATE_LIMIT })
  async submitTicket(@Body() dto: SubmitTicketDto): Promise<{ success: boolean; message: string; ticketId: string }> {
    if (!dto.companyId) {
      throw new BadRequestException('Company ID is required');
    }

    // Sanitize and validate inputs
    const sanitizedSubject = sanitizeInput(dto.subject);
    const sanitizedMessage = sanitizeInput(dto.message);
    const sanitizedEmail = sanitizeInput(dto.email);

    if (!sanitizedSubject) {
      throw new BadRequestException('Subject is required');
    }
    if (!sanitizedMessage) {
      throw new BadRequestException('Message is required');
    }
    if (sanitizedMessage.length < 10) {
      throw new BadRequestException('Message must be at least 10 characters');
    }

    // Validate email format if provided
    if (sanitizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
      throw new BadRequestException('Please provide a valid email address');
    }

    // Validate company exists
    const company = await this.prisma.company.findFirst({
      where: { id: dto.companyId, deletedAt: null },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Get session info if available
    const sessionInfo = await this.validateSessionToken(dto.sessionToken);
    const customerId = sessionInfo?.customerId || this.generateAnonymousCustomerId();
    const email = sanitizedEmail || sessionInfo?.email;

    // Create a CS session for the ticket
    const session = await this.csService.startSession({
      companyId: dto.companyId,
      customerId,
      channel: 'email',
      initialMessage: `Subject: ${sanitizedSubject}\n\n${sanitizedMessage}`,
      issueCategory: IssueCategory.GENERAL_INQUIRY,
      metadata: {
        type: 'support_ticket',
        subject: sanitizedSubject,
        email,
        funnelSessionId: sessionInfo?.funnelSessionId,
        funnelId: dto.funnelId,
      },
    });

    // Link to funnel session if available
    if (sessionInfo?.funnelSessionId) {
      await this.prisma.funnelSession.update({
        where: { id: sessionInfo.funnelSessionId },
        data: { csSessionId: session.id },
      });
    }

    // Audit log
    await this.logAuditEvent('CS_TICKET_SUBMITTED', session.id, dto.companyId, {
      hasEmail: !!email,
      subjectLength: sanitizedSubject.length,
      messageLength: sanitizedMessage.length,
      hasFunnelSession: !!sessionInfo?.funnelSessionId,
    });

    this.logger.log(`Ticket submitted: ${session.id} for company ${dto.companyId}`);

    return {
      success: true,
      message: 'Your ticket has been submitted. We will respond shortly!',
      ticketId: session.id,
    };
  }
}
