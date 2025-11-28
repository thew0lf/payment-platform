import { Module, Global } from '@nestjs/common';
import { CodeGeneratorService } from './services/code-generator.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [CodeGeneratorService],
  exports: [CodeGeneratorService],
})
export class CommonModule {}
