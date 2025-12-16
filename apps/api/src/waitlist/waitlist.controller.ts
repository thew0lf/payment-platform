import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { WaitlistService } from './waitlist.service';
import {
  WaitlistEntry,
  CreateWaitlistDto,
  UpdateWaitlistDto,
  WaitlistStats,
  WaitlistFilter,
  WaitlistStatus,
  CompleteRegistrationDto,
  RegistrationResult,
} from './types/waitlist.types';

@Controller('admin/waitlist')
@UseGuards(JwtAuthGuard)
export class WaitlistController {
  private readonly logger = new Logger(WaitlistController.name);

  constructor(private readonly waitlistService: WaitlistService) {}

  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: WaitlistStatus,
    @Query('search') search?: string,
    @Query('hasReferrals') hasReferrals?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<{ items: WaitlistEntry[]; total: number }> {
    const filter: WaitlistFilter = {};
    if (status) filter.status = status;
    if (search) filter.search = search;
    if (hasReferrals === 'true') filter.hasReferrals = true;

    return this.waitlistService.findAll(
      user.organizationId,
      filter,
      limit ? parseInt(limit, 10) : 50,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  @Get('stats')
  async getStats(@CurrentUser() user: AuthenticatedUser): Promise<WaitlistStats> {
    return this.waitlistService.getStats(user.organizationId);
  }

  @Get(':id')
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<WaitlistEntry> {
    return this.waitlistService.findById(user.organizationId, id);
  }

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateWaitlistDto,
  ): Promise<WaitlistEntry> {
    return this.waitlistService.create(user.organizationId, dto);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateWaitlistDto,
  ): Promise<WaitlistEntry> {
    return this.waitlistService.update(user.organizationId, id, dto);
  }

  @Post(':id/invite')
  async sendInvite(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.waitlistService.sendInvite(user.organizationId, id);
  }

  @Post('bulk-invite')
  async sendBulkInvites(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { ids: string[] },
  ) {
    return this.waitlistService.sendBulkInvites(user.organizationId, body.ids);
  }

  @Delete(':id')
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    await this.waitlistService.delete(user.organizationId, id);
    return { success: true };
  }
}

/**
 * Public waitlist controller for signup (no auth required)
 */
@Controller('waitlist')
export class PublicWaitlistController {
  private readonly logger = new Logger(PublicWaitlistController.name);

  constructor(private readonly waitlistService: WaitlistService) {}

  @Post('signup')
  async signup(
    @Body() dto: CreateWaitlistDto & { organizationId: string },
  ): Promise<WaitlistEntry> {
    return this.waitlistService.create(dto.organizationId, dto);
  }

  @Get('position/:founderNumber')
  async getPosition(@Param('founderNumber') founderNumber: string) {
    const entry = await this.waitlistService.findByFounderNumber(founderNumber);
    if (!entry) {
      return { found: false };
    }
    return {
      found: true,
      founderNumber: entry.founderNumber,
      currentPosition: entry.currentPosition,
      referralCode: entry.referralCode,
      referralCount: entry.referralCount,
    };
  }

  @Get('verify-invite/:token')
  async verifyInvite(@Param('token') token: string) {
    const entry = await this.waitlistService.findByInviteToken(token);
    if (!entry) {
      return { valid: false, message: 'Invalid or expired invite' };
    }
    return {
      valid: true,
      founderNumber: entry.founderNumber,
      email: entry.email,
      firstName: entry.firstName,
      lastName: entry.lastName,
      companyName: entry.companyName,
    };
  }

  @Post('register')
  async completeRegistration(
    @Body() dto: CompleteRegistrationDto,
  ): Promise<RegistrationResult> {
    return this.waitlistService.completeRegistration(dto);
  }
}
