import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Headers,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
  Ip,
} from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { IsEmail, IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';
import { AuthService } from './auth.service';
import { Auth0Service } from './services/auth0.service';
import { CombinedAuthGuard } from './guards/combined-auth.guard';

class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}

class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

class LogoutDto {
  @IsString()
  refreshToken?: string;
}

// Password Reset DTOs - SOC2/ISO Compliant
class ForgotPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

class ValidateResetTokenDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}

class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  newPassword: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly auth0Service: Auth0Service,
  ) {}

  /**
   * Get authentication configuration
   * Returns which auth methods are available (Auth0, local, or both)
   */
  @Get('config')
  @SkipThrottle()
  async getAuthConfig() {
    const auth0Config = await this.auth0Service.getAuth0Config();
    const auth0Enabled = auth0Config !== null;

    return {
      auth0Enabled,
      localEnabled: true,
      auth0Domain: auth0Enabled ? auth0Config.domain : null,
      auth0ClientId: auth0Enabled ? auth0Config.clientId : null,
      auth0Audience: auth0Enabled ? auth0Config.audience : null,
    };
  }

  /**
   * Login with email/password
   * Rate limited: 5 attempts per 15 minutes
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 900000 } }) // 5 attempts per 15 minutes
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }

  /**
   * Refresh tokens
   * Rate limited: 10 attempts per minute
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 attempts per minute
  async refreshTokens(@Body() refreshDto: RefreshTokenDto) {
    return this.authService.refreshTokens(refreshDto.refreshToken);
  }

  /**
   * Get current user profile
   */
  @Get('me')
  @UseGuards(CombinedAuthGuard)
  @SkipThrottle()
  async getProfile(@Request() req) {
    return { user: req.user };
  }

  /**
   * Logout - blacklist tokens
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @SkipThrottle()
  async logout(
    @Headers('authorization') authHeader: string,
    @Body() logoutDto: LogoutDto,
  ) {
    const accessToken = authHeader?.replace('Bearer ', '');
    if (accessToken) {
      await this.authService.logout(accessToken, logoutDto.refreshToken);
    }
    return { message: 'Logged out successfully' };
  }

  // =============================================================================
  // PASSWORD RESET - SOC2 CC6.1 / ISO A.9.4.3 Compliant
  // =============================================================================

  /**
   * Request password reset
   * Rate limited: 3 attempts per 15 minutes per IP
   * SOC2 CC6.1: Access control
   */
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 900000 } }) // 3 attempts per 15 minutes
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.authService.requestPasswordReset(
      forgotPasswordDto.email,
      ip,
      userAgent,
    );
  }

  /**
   * Validate password reset token (check if still valid)
   */
  @Post('validate-reset-token')
  @HttpCode(HttpStatus.OK)
  @SkipThrottle()
  async validateResetToken(@Body() validateDto: ValidateResetTokenDto) {
    const result = await this.authService.validateResetToken(validateDto.token);
    return { valid: result.valid };
  }

  /**
   * Reset password with token
   * Rate limited: 5 attempts per hour per IP
   * SOC2 CC6.1: Secure password change
   * ISO A.9.4.3: Password management
   */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 3600000 } }) // 5 attempts per hour
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
    @Ip() ip: string,
  ) {
    return this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
      ip,
    );
  }
}
