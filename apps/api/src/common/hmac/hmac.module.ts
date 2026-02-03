import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HmacService } from './hmac.service';
import { HmacGuard } from './hmac.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../../audit-logs/audit-logs.module';

/**
 * HMAC Request Signing Module
 *
 * Provides HMAC-based request authentication for public APIs to prevent:
 * - Request tampering
 * - Replay attacks
 * - Unauthorized API access
 *
 * Features:
 * - Multiple algorithm support (SHA256, SHA512)
 * - Timestamp validation (configurable drift tolerance)
 * - Per-company secret keys
 * - SOC2 CC6.1 compliant audit logging
 *
 * Usage:
 * 1. Import HmacModule in your module
 * 2. Apply @RequireHmac() decorator to routes
 * 3. Optionally use @UseGuards(HmacGuard) at class level
 *
 * Required headers for clients:
 * - X-Signature: HMAC signature
 * - X-Timestamp: Unix timestamp (seconds)
 * - X-Key-Id: (optional) Company key identifier
 */
@Global()
@Module({
  imports: [ConfigModule, PrismaModule, AuditLogsModule],
  providers: [HmacService, HmacGuard],
  exports: [HmacService, HmacGuard],
})
export class HmacModule {}
