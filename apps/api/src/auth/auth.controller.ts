import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Auth0Service } from './services/auth0.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CombinedAuthGuard } from './guards/combined-auth.guard';

class LoginDto {
  email: string;
  password: string;
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
  async getAuthConfig() {
    const auth0Config = await this.auth0Service.getAuth0Config();
    const auth0Enabled = auth0Config !== null;

    return {
      auth0Enabled,
      localEnabled: true, // Local auth is always available as fallback
      auth0Domain: auth0Enabled ? auth0Config.domain : null,
      auth0ClientId: auth0Enabled ? auth0Config.clientId : null,
      auth0Audience: auth0Enabled ? auth0Config.audience : null,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }

  @Get('me')
  @UseGuards(CombinedAuthGuard)
  async getProfile(@Request() req) {
    // The strategy (Auth0 or JWT) already fetches and returns the full user object
    // so we just return it directly
    return { user: req.user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout() {
    // For JWT, logout is handled client-side by removing the token
    // Could add token blacklisting here if needed
    return { message: 'Logged out successfully' };
  }
}
