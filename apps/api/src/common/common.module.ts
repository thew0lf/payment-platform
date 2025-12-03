import { Module, Global } from '@nestjs/common';
import { CodeGeneratorService } from './services/code-generator.service';
import { ShortIdService } from './services/short-id.service';
import { PaginationService } from './pagination/pagination.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [CodeGeneratorService, ShortIdService, PaginationService],
  exports: [CodeGeneratorService, ShortIdService, PaginationService],
})
export class CommonModule {}
