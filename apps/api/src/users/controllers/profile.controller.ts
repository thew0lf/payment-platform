import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { UsersService } from '../services/users.service';
import { User, UserPreferences } from '../types/user.types';
import { UpdatePreferencesDto } from '../dto/user.dto';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly usersService: UsersService) {}

  // ═══════════════════════════════════════════════════════════════
  // CURRENT USER PROFILE
  // ═══════════════════════════════════════════════════════════════

  @Get()
  async getProfile(@CurrentUser() user: AuthenticatedUser): Promise<User> {
    return this.usersService.findById(user.id);
  }

  // ═══════════════════════════════════════════════════════════════
  // USER PREFERENCES
  // ═══════════════════════════════════════════════════════════════

  @Get('preferences')
  async getPreferences(@CurrentUser() user: AuthenticatedUser): Promise<UserPreferences> {
    return this.usersService.getPreferences(user.id);
  }

  @Patch('preferences')
  async updatePreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePreferencesDto,
  ): Promise<UserPreferences> {
    return this.usersService.updatePreferences(user.id, dto);
  }
}
