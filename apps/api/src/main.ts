import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS
  app.enableCors();
  
  // Global prefix
  app.setGlobalPrefix('api');
  
  await app.listen(3000);
  console.log('🚀 API Server running on http://localhost:3000');
}
bootstrap();
