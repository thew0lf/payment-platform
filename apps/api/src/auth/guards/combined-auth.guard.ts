import { Injectable, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Auth0Service } from '../services/auth0.service';

/**
 * Combined Auth Guard that tries Auth0 first (if configured), then falls back to local JWT.
 * This allows the system to work with:
 * 1. Auth0 tokens (when Auth0 integration is active)
 * 2. Local JWT tokens (always available as fallback)
 */
@Injectable()
export class CombinedAuthGuard extends AuthGuard(['auth0', 'jwt']) {
  private readonly logger = new Logger(CombinedAuthGuard.name);

  constructor(private readonly auth0Service: Auth0Service) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('No authorization header');
    }

    // Check if Auth0 is enabled
    const auth0Enabled = await this.auth0Service.isAuth0Enabled();

    if (auth0Enabled) {
      // Try Auth0 first
      try {
        const auth0Guard = new (AuthGuard('auth0'))();
        const result = await auth0Guard.canActivate(context);
        if (result) {
          this.logger.debug('Authenticated via Auth0');
          return true;
        }
      } catch (error) {
        this.logger.debug('Auth0 auth failed, trying local JWT:', error.message);
      }
    }

    // Fall back to local JWT
    try {
      const jwtGuard = new (AuthGuard('jwt'))();
      const result = await jwtGuard.canActivate(context);
      if (result) {
        this.logger.debug('Authenticated via local JWT');
        return true;
      }
    } catch (error) {
      this.logger.debug('Local JWT auth failed:', error.message);
      throw new UnauthorizedException('Invalid token');
    }

    throw new UnauthorizedException('Authentication failed');
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw err || new UnauthorizedException();
    }
    return user;
  }
}
