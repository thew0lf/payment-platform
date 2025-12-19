import { Module, Global, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService) => {
        const logger = new Logger('RedisModule');
        const redisUrl = configService.get<string>('REDIS_URL');

        if (!redisUrl) {
          logger.warn('REDIS_URL not configured - using in-memory fallback for development');
          return null;
        }

        const client = new Redis(redisUrl, {
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => Math.min(times * 100, 3000),
          enableReadyCheck: true,
          lazyConnect: true,
        });

        client.on('connect', () => {
          logger.log('Connected to Redis');
        });

        client.on('error', (err) => {
          logger.error(`Redis error: ${err.message}`);
        });

        client.on('ready', () => {
          logger.log('Redis client ready');
        });

        // Connect immediately
        client.connect().catch((err) => {
          logger.error(`Failed to connect to Redis: ${err.message}`);
        });

        return client;
      },
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnModuleDestroy {
  constructor(private readonly configService: ConfigService) {}

  async onModuleDestroy() {
    // Clean disconnect handled by ioredis
  }
}
