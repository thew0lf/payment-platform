import { Module, Global } from '@nestjs/common';
import { CodeGeneratorService } from './services/code-generator.service';
import { ShortIdService } from './services/short-id.service';
import { IdempotencyService } from './services/idempotency.service';
import { PaginationService } from './pagination/pagination.service';
import { ThrottleModule } from './throttle/throttle.module';
import { HmacModule } from './hmac/hmac.module';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule, ThrottleModule, HmacModule],
  providers: [CodeGeneratorService, ShortIdService, IdempotencyService, PaginationService],
  exports: [CodeGeneratorService, ShortIdService, IdempotencyService, PaginationService, ThrottleModule, HmacModule],
})
export class CommonModule {}
