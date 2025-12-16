import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/services/email.service';
import { WaitlistStatus } from '@prisma/client';
import {
  WaitlistEntry,
  CreateWaitlistDto,
  UpdateWaitlistDto,
  WaitlistStats,
  WaitlistFilter,
  SendInviteResult,
  CompleteRegistrationDto,
  RegistrationResult,
} from './types/waitlist.types';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';

const POSITION_BOOST_PER_REFERRAL = 10;
const INVITE_EXPIRY_DAYS = 7;

@Injectable()
export class WaitlistService {
  private readonly logger = new Logger(WaitlistService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Generate a unique founder number (FND-XXXX format)
   */
  private async generateFounderNumber(organizationId: string): Promise<string> {
    const count = await this.prisma.waitlist.count({ where: { organizationId } });
    const nextNumber = (count + 1).toString().padStart(4, '0');
    return `FND-${nextNumber}`;
  }

  /**
   * Generate a unique invite token
   */
  private generateInviteToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Add a new entry to the waitlist
   */
  async create(organizationId: string, dto: CreateWaitlistDto): Promise<WaitlistEntry> {
    // Check for duplicate email
    const existing = await this.prisma.waitlist.findUnique({
      where: { organizationId_email: { organizationId, email: dto.email } },
    });
    if (existing) {
      throw new ConflictException('This email is already on the waitlist');
    }

    // Generate founder number and determine position
    const founderNumber = await this.generateFounderNumber(organizationId);
    const currentCount = await this.prisma.waitlist.count({ where: { organizationId } });
    const position = currentCount + 1;

    // Validate referral code if provided
    let referrerEntry: any = null;
    if (dto.referralCode) {
      referrerEntry = await this.prisma.waitlist.findFirst({
        where: { referralCode: dto.referralCode },
      });
      if (!referrerEntry) {
        this.logger.warn(`Invalid referral code: ${dto.referralCode}`);
      }
    }

    // Create the waitlist entry
    const entry = await this.prisma.waitlist.create({
      data: {
        organizationId,
        email: dto.email,
        phone: dto.phone,
        companyName: dto.companyName,
        firstName: dto.firstName,
        lastName: dto.lastName,
        founderNumber,
        basePosition: position,
        currentPosition: position,
        referralCode: founderNumber, // Use founder number as referral code
        referredBy: referrerEntry ? dto.referralCode : null,
        source: dto.source,
        medium: dto.medium,
        campaign: dto.campaign,
        variant: dto.variant,
        status: 'PENDING',
      },
    });

    // Boost referrer's position if valid referral
    if (referrerEntry) {
      await this.prisma.waitlist.update({
        where: { id: referrerEntry.id },
        data: {
          currentPosition: Math.max(1, referrerEntry.currentPosition - POSITION_BOOST_PER_REFERRAL),
          referralCount: { increment: 1 },
        },
      });
      this.logger.log(`Referrer ${referrerEntry.founderNumber} boosted by ${POSITION_BOOST_PER_REFERRAL} positions`);
    }

    this.logger.log(`New waitlist signup: ${founderNumber} (${dto.email})`);
    return this.mapToEntry(entry);
  }

  /**
   * Get a waitlist entry by ID
   */
  async findById(organizationId: string, id: string): Promise<WaitlistEntry> {
    const entry = await this.prisma.waitlist.findFirst({
      where: { id, organizationId },
    });
    if (!entry) {
      throw new NotFoundException('Waitlist entry not found');
    }
    return this.mapToEntry(entry);
  }

  /**
   * Get a waitlist entry by founder number
   */
  async findByFounderNumber(founderNumber: string): Promise<WaitlistEntry | null> {
    const entry = await this.prisma.waitlist.findUnique({
      where: { founderNumber },
    });
    return entry ? this.mapToEntry(entry) : null;
  }

  /**
   * Get a waitlist entry by invite token
   */
  async findByInviteToken(token: string): Promise<WaitlistEntry | null> {
    const entry = await this.prisma.waitlist.findUnique({
      where: { inviteToken: token },
    });
    if (!entry) return null;

    // Check if invite is expired
    if (entry.inviteExpiresAt && entry.inviteExpiresAt < new Date()) {
      return null;
    }

    return this.mapToEntry(entry);
  }

  /**
   * Get all waitlist entries with filtering and pagination
   */
  async findAll(
    organizationId: string,
    filter: WaitlistFilter = {},
    limit = 50,
    offset = 0,
  ): Promise<{ items: WaitlistEntry[]; total: number }> {
    const where: any = { organizationId };

    if (filter.status) {
      where.status = filter.status;
    }

    if (filter.search) {
      where.OR = [
        { email: { contains: filter.search, mode: 'insensitive' } },
        { firstName: { contains: filter.search, mode: 'insensitive' } },
        { lastName: { contains: filter.search, mode: 'insensitive' } },
        { companyName: { contains: filter.search, mode: 'insensitive' } },
        { founderNumber: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    if (filter.startDate) {
      where.createdAt = { ...where.createdAt, gte: filter.startDate };
    }

    if (filter.endDate) {
      where.createdAt = { ...where.createdAt, lte: filter.endDate };
    }

    if (filter.hasReferrals) {
      where.referralCount = { gt: 0 };
    }

    const [items, total] = await Promise.all([
      this.prisma.waitlist.findMany({
        where,
        orderBy: [{ currentPosition: 'asc' }, { createdAt: 'asc' }],
        take: limit,
        skip: offset,
      }),
      this.prisma.waitlist.count({ where }),
    ]);

    return {
      items: items.map(this.mapToEntry.bind(this)),
      total,
    };
  }

  /**
   * Get waitlist statistics
   */
  async getStats(organizationId: string): Promise<WaitlistStats> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [total, pending, verified, invited, registered, declined, todaySignups, weekSignups] = await Promise.all([
      this.prisma.waitlist.count({ where: { organizationId } }),
      this.prisma.waitlist.count({ where: { organizationId, status: 'PENDING' } }),
      this.prisma.waitlist.count({ where: { organizationId, status: 'VERIFIED' } }),
      this.prisma.waitlist.count({ where: { organizationId, status: 'INVITED' } }),
      this.prisma.waitlist.count({ where: { organizationId, status: 'REGISTERED' } }),
      this.prisma.waitlist.count({ where: { organizationId, status: 'DECLINED' } }),
      this.prisma.waitlist.count({
        where: { organizationId, createdAt: { gte: todayStart } },
      }),
      this.prisma.waitlist.count({
        where: { organizationId, createdAt: { gte: weekStart } },
      }),
    ]);

    return { total, pending, verified, invited, registered, declined, todaySignups, weekSignups };
  }

  /**
   * Update a waitlist entry
   */
  async update(
    organizationId: string,
    id: string,
    dto: UpdateWaitlistDto,
  ): Promise<WaitlistEntry> {
    const existing = await this.prisma.waitlist.findFirst({
      where: { id, organizationId },
    });
    if (!existing) {
      throw new NotFoundException('Waitlist entry not found');
    }

    const updated = await this.prisma.waitlist.update({
      where: { id },
      data: {
        companyName: dto.companyName,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        status: dto.status,
      },
    });

    return this.mapToEntry(updated);
  }

  /**
   * Send an invite to a waitlist entry
   */
  async sendInvite(organizationId: string, id: string): Promise<SendInviteResult> {
    const entry = await this.prisma.waitlist.findFirst({
      where: { id, organizationId },
    });
    if (!entry) {
      throw new NotFoundException('Waitlist entry not found');
    }

    if (entry.status === 'REGISTERED') {
      throw new BadRequestException('This founder has already registered');
    }

    // Generate invite token and expiry
    const inviteToken = this.generateInviteToken();
    const inviteExpiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    // Update entry with invite details
    await this.prisma.waitlist.update({
      where: { id },
      data: {
        inviteToken,
        inviteExpiresAt,
        invitedAt: new Date(),
        status: 'INVITED',
      },
    });

    // Build invite URL
    const baseUrl = process.env.ADMIN_DASHBOARD_URL || 'https://app.avnz.io';
    const inviteUrl = `${baseUrl}/register?token=${inviteToken}`;

    // Send invite email using the templated email system
    const emailResult = await this.emailService.sendTemplatedEmail({
      to: entry.email,
      toName: entry.firstName || undefined,
      templateCode: 'waitlist-invite',
      variables: {
        userName: entry.firstName || entry.email.split('@')[0],
        founderNumber: entry.founderNumber,
        position: entry.currentPosition,
        companyName: entry.companyName || 'your company',
        inviteUrl,
        expiresIn: `${INVITE_EXPIRY_DAYS} days`,
        supportEmail: 'support@avnz.io',
      },
      organizationId,
      relatedEntityType: 'waitlist_invite',
      relatedEntityId: id,
    });

    if (emailResult.success) {
      this.logger.log(`Invite sent to ${entry.founderNumber} (${entry.email})`);
      return {
        success: true,
        message: 'Invite sent successfully!',
        inviteToken,
        inviteUrl,
      };
    } else {
      this.logger.error(`Failed to send invite to ${entry.email}: ${emailResult.error}`);
      return {
        success: false,
        message: emailResult.error || 'Failed to send invite email',
      };
    }
  }

  /**
   * Send bulk invites to multiple waitlist entries
   */
  async sendBulkInvites(
    organizationId: string,
    ids: string[],
  ): Promise<{ sent: number; failed: number; results: SendInviteResult[] }> {
    const results: SendInviteResult[] = [];
    let sent = 0;
    let failed = 0;

    for (const id of ids) {
      try {
        const result = await this.sendInvite(organizationId, id);
        results.push(result);
        if (result.success) sent++;
        else failed++;
      } catch (error) {
        results.push({
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        failed++;
      }
    }

    return { sent, failed, results };
  }

  /**
   * Mark a waitlist entry as registered and link to client
   */
  async markAsRegistered(id: string, clientId: string): Promise<WaitlistEntry> {
    const updated = await this.prisma.waitlist.update({
      where: { id },
      data: {
        status: 'REGISTERED',
        registeredAt: new Date(),
        clientId,
      },
    });

    this.logger.log(`Waitlist entry ${updated.founderNumber} registered as client ${clientId}`);
    return this.mapToEntry(updated);
  }

  /**
   * Delete a waitlist entry
   */
  async delete(organizationId: string, id: string): Promise<void> {
    const entry = await this.prisma.waitlist.findFirst({
      where: { id, organizationId },
    });
    if (!entry) {
      throw new NotFoundException('Waitlist entry not found');
    }

    if (entry.status === 'REGISTERED') {
      throw new BadRequestException('Cannot delete a registered entry');
    }

    await this.prisma.waitlist.delete({ where: { id } });
    this.logger.log(`Waitlist entry ${entry.founderNumber} deleted`);
  }

  /**
   * Complete founder registration - creates Client and User accounts
   */
  async completeRegistration(dto: CompleteRegistrationDto): Promise<RegistrationResult> {
    // Validate invite token
    const entry = await this.prisma.waitlist.findUnique({
      where: { inviteToken: dto.token },
    });

    if (!entry) {
      throw new BadRequestException('Invalid invite token');
    }

    // Check if invite is expired
    if (entry.inviteExpiresAt && entry.inviteExpiresAt < new Date()) {
      throw new BadRequestException('Invite has expired. Please request a new invite.');
    }

    // Check if already registered
    if (entry.status === 'REGISTERED') {
      throw new BadRequestException('This invite has already been used');
    }

    // Check if email already exists as a user
    const existingUser = await this.prisma.user.findUnique({
      where: { email: entry.email },
    });
    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    // Get organization (required for client creation)
    const organization = await this.prisma.organization.findUnique({
      where: { id: entry.organizationId },
    });
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Use transaction to create Client, User, and update Waitlist atomically
    const result = await this.prisma.$transaction(async (tx) => {
      // Generate client code from company name
      const companyName = dto.companyName || entry.companyName || 'Founder';
      const clientCode = await this.generateClientCode(companyName, tx);

      // Create the Client (agency)
      const client = await tx.client.create({
        data: {
          organizationId: entry.organizationId,
          name: companyName,
          slug: clientCode.toLowerCase(),
          code: clientCode,
          contactName: `${dto.firstName || entry.firstName || ''} ${dto.lastName || entry.lastName || ''}`.trim() || undefined,
          contactEmail: entry.email,
          plan: 'FOUNDERS', // Special founders plan
          status: 'ACTIVE',
        },
      });

      // Hash password
      const passwordHash = await bcrypt.hash(dto.password, 10);

      // Create the User with OWNER role
      const user = await tx.user.create({
        data: {
          email: entry.email,
          passwordHash,
          firstName: dto.firstName || entry.firstName,
          lastName: dto.lastName || entry.lastName,
          phone: entry.phone,
          emailVerified: true, // Verified through invite flow
          scopeType: 'CLIENT',
          scopeId: client.id,
          role: 'ADMIN', // Client admin
          status: 'ACTIVE',
          clientId: client.id,
        },
      });

      // Update waitlist entry to REGISTERED
      await tx.waitlist.update({
        where: { id: entry.id },
        data: {
          status: 'REGISTERED',
          registeredAt: new Date(),
          clientId: client.id,
          firstName: dto.firstName || entry.firstName,
          lastName: dto.lastName || entry.lastName,
          companyName: companyName,
          inviteToken: null, // Clear token after use
        },
      });

      return { client, user };
    });

    this.logger.log(
      `Founder ${entry.founderNumber} registered as client ${result.client.code} (${result.client.name})`,
    );

    return {
      success: true,
      message: 'Registration complete! Welcome to avnz.io, Founder!',
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName || undefined,
        lastName: result.user.lastName || undefined,
      },
      client: {
        id: result.client.id,
        name: result.client.name,
        code: result.client.code || undefined,
      },
    };
  }

  /**
   * Generate a unique 4-character client code
   */
  private async generateClientCode(name: string, tx: any): Promise<string> {
    // Extract first 4 alphanumeric characters, uppercase
    let baseCode = name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 4);

    // Pad if less than 4 chars
    while (baseCode.length < 4) {
      baseCode += 'X';
    }

    // Check if code exists
    const existing = await tx.client.findUnique({ where: { code: baseCode } });
    if (!existing) {
      return baseCode;
    }

    // Try numeric suffixes
    const prefix = baseCode.substring(0, 2);
    for (let i = 1; i < 100; i++) {
      const code = `${prefix}${i.toString().padStart(2, '0')}`;
      const exists = await tx.client.findUnique({ where: { code } });
      if (!exists) {
        return code;
      }
    }

    // Fallback to random
    const randomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    return randomCode;
  }

  private mapToEntry(data: any): WaitlistEntry {
    return {
      id: data.id,
      organizationId: data.organizationId,
      email: data.email,
      phone: data.phone || undefined,
      companyName: data.companyName || undefined,
      firstName: data.firstName || undefined,
      lastName: data.lastName || undefined,
      founderNumber: data.founderNumber,
      basePosition: data.basePosition,
      currentPosition: data.currentPosition,
      referralCode: data.referralCode,
      referredBy: data.referredBy || undefined,
      referralCount: data.referralCount,
      status: data.status,
      emailVerified: data.emailVerified,
      phoneVerified: data.phoneVerified,
      invitedAt: data.invitedAt || undefined,
      inviteExpiresAt: data.inviteExpiresAt || undefined,
      registeredAt: data.registeredAt || undefined,
      clientId: data.clientId || undefined,
      source: data.source || undefined,
      medium: data.medium || undefined,
      campaign: data.campaign || undefined,
      variant: data.variant || undefined,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
}
