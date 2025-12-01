import { Module, Global } from '@nestjs/common';
import { CodeGeneratorService } from './services/code-generator.service';
import { PaginationService } from './pagination/pagination.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [CodeGeneratorService, PaginationService],
  exports: [CodeGeneratorService, PaginationService],
})
export class CommonModule {}
