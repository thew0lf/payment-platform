import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { Auth0Strategy } from './strategies/auth0.strategy';
import { Auth0Service } from './services/auth0.service';
import { TokenBlacklistService } from './services/token-blacklist.service';
import { CombinedAuthGuard } from './guards/combined-auth.guard';
import { PasswordResetCleanupJob } from './jobs/password-reset-cleanup.job';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute default
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    Auth0Strategy,
    Auth0Service,
    TokenBlacklistService,
    CombinedAuthGuard,
    PasswordResetCleanupJob,
  ],
  exports: [AuthService, JwtModule, Auth0Service, TokenBlacklistService, CombinedAuthGuard],
})
export class AuthModule {}
