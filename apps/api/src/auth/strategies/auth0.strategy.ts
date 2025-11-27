import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { Auth0Service } from '../services/auth0.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth.service';

@Injectable()
export class Auth0Strategy extends PassportStrategy(JwtStrategy, 'auth0') {
  private readonly logger = new Logger(Auth0Strategy.name);

  constructor(
    private readonly auth0Service: Auth0Service,
    private readonly prisma: PrismaService,
  ) {
    // We need to call super() with a placeholder, then dynamically configure
    super({
      secretOrKeyProvider: async (request: any, rawJwtToken: string, done: any) => {
        try {
          const config = await this.auth0Service.getAuth0Config();
          if (!config) {
            return done(new UnauthorizedException('Auth0 not configured'), null);
          }

          const secretProvider = passportJwtSecret({
            cache: true,
            rateLimit: true,
            jwksRequestsPerMinute: 5,
            jwksUri: `https://${config.domain}/.well-known/jwks.json`,
          });

          secretProvider(request, rawJwtToken, done);
        } catch (error) {
          done(error, null);
        }
      },
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      audience: async () => {
        const config = await this.auth0Service.getAuth0Config();
        return config?.audience || '';
      },
      issuer: async () => {
        const config = await this.auth0Service.getAuth0Config();
        return config ? `https://${config.domain}/` : '';
      },
      algorithms: ['RS256'],
      passReqToCallback: true,
    });
  }

  async validate(request: any, payload: any): Promise<AuthenticatedUser> {
    this.logger.debug('Auth0 token payload:', JSON.stringify(payload, null, 2));

    // Auth0 tokens contain:
    // - sub: user ID in Auth0
    // - email: user's email
    // - aud: audience
    // - iss: issuer

    const auth0Email = payload.email || payload['https://avnz.io/email'];
    const auth0Sub = payload.sub;

    if (!auth0Email) {
      this.logger.warn('Auth0 token missing email claim');
      throw new UnauthorizedException('Invalid token: missing email');
    }

    // Find user in our database by email
    const user = await this.prisma.user.findUnique({
      where: { email: auth0Email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        scopeType: true,
        scopeId: true,
        role: true,
        status: true,
        organizationId: true,
        clientId: true,
        companyId: true,
        departmentId: true,
        auth0Id: true,
      },
    });

    if (!user) {
      this.logger.warn(`No user found for Auth0 email: ${auth0Email}`);
      throw new UnauthorizedException('User not found');
    }

    if (user.status !== 'ACTIVE') {
      this.logger.warn(`User ${auth0Email} is not active`);
      throw new UnauthorizedException('User account is not active');
    }

    // Update auth0Id if not set
    if (!user.auth0Id && auth0Sub) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { auth0Id: auth0Sub },
      });
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      scopeType: user.scopeType,
      scopeId: user.scopeId,
      role: user.role,
      organizationId: user.organizationId,
      clientId: user.clientId,
      companyId: user.companyId,
      departmentId: user.departmentId,
    };
  }
}
