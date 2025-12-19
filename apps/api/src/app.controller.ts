import { Controller, Get, Inject, Optional } from '@nestjs/common';
import Redis from 'ioredis';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { REDIS_CLIENT } from './redis/redis.module';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
    @Optional() @Inject(REDIS_CLIENT) private readonly redis: Redis | null,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  async getHealth() {
    const dbHealth = await this.prisma.isHealthy();

    let redisHealth = { healthy: false, responseTime: 0, error: 'Not configured' };
    if (this.redis) {
      const start = Date.now();
      try {
        await this.redis.ping();
        redisHealth = { healthy: true, responseTime: Date.now() - start, error: undefined as any };
      } catch (error) {
        redisHealth = { healthy: false, responseTime: Date.now() - start, error: (error as Error).message };
      }
    }

    const overallHealthy = dbHealth.healthy && (redisHealth.healthy || !this.redis);

    return {
      status: overallHealthy ? 'OK' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      service: 'Payment Platform API',
      components: {
        database: {
          status: dbHealth.healthy ? 'UP' : 'DOWN',
          responseTime: `${dbHealth.responseTime}ms`,
          ...(dbHealth.error && { error: dbHealth.error }),
        },
        redis: {
          status: redisHealth.healthy ? 'UP' : this.redis ? 'DOWN' : 'NOT_CONFIGURED',
          responseTime: `${redisHealth.responseTime}ms`,
          ...(redisHealth.error && this.redis && { error: redisHealth.error }),
        },
      },
    };
  }
}
