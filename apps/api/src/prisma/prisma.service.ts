import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

/**
 * PrismaService with connection pooling and health monitoring.
 *
 * Connection Pool Configuration (via DATABASE_URL):
 * - connection_limit: Max connections per instance (default: 10)
 * - pool_timeout: Seconds to wait for a connection (default: 10)
 *
 * Example DATABASE_URL with pool settings:
 * postgresql://user:pass@host:5432/db?connection_limit=10&pool_timeout=10
 *
 * SOC2 CC7.2: System monitoring and availability
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private isConnected = false;

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
      errorFormat: 'minimal',
    });

    // Log slow queries in development (>100ms)
    if (process.env.NODE_ENV !== 'production') {
      (this as any).$on('query', (e: Prisma.QueryEvent) => {
        if (e.duration > 100) {
          this.logger.warn(`Slow query (${e.duration}ms): ${e.query.substring(0, 200)}...`);
        }
      });
    }

    // Log all errors
    (this as any).$on('error', (e: Prisma.LogEvent) => {
      this.logger.error(`Database error: ${e.message}`);
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.isConnected = true;
      this.logger.log('Database connection established');
    } catch (error) {
      this.logger.error(`Failed to connect to database: ${(error as Error).message}`);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.isConnected = false;
    this.logger.log('Database connection closed');
  }

  /**
   * Health check for database connectivity.
   * Used by health check endpoints and monitoring.
   */
  async isHealthy(): Promise<{
    healthy: boolean;
    responseTime: number;
    error?: string;
  }> {
    const start = Date.now();
    try {
      await this.$queryRaw`SELECT 1`;
      return {
        healthy: true,
        responseTime: Date.now() - start,
      };
    } catch (error) {
      return {
        healthy: false,
        responseTime: Date.now() - start,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Get connection status.
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}
