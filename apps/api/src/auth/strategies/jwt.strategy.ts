import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { JwtPayload, AuthService } from '../auth.service';

/**
 * Custom JWT extractor that checks:
 * 1. Authorization header (Bearer token)
 * 2. Query parameter 'token' (for SSE connections)
 */
function extractJwtFromRequestOrQuery(req: Request): string | null {
  // First, try to extract from Authorization header
  const headerToken = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
  if (headerToken) {
    return headerToken;
  }

  // Fallback: extract from query parameter (for SSE)
  if (req.query && typeof req.query.token === 'string') {
    return req.query.token;
  }

  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: extractJwtFromRequestOrQuery,
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    // Fetch full user data from database to get organizationId, clientId, etc.
    const user = await this.authService.getUserById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}
