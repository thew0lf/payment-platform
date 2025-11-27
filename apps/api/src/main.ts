import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for dev.avnz.io subdomains
  app.enableCors({
    origin: [
      'http://dev.avnz.io:3000',
      'http://admin.dev.avnz.io:3002',
      'http://portal.dev.avnz.io:3003',
      'http://localhost:3000',
      'http://localhost:3002',
      'http://localhost:3003',
    ],
    credentials: true,
  });
  
  // Global prefix
  app.setGlobalPrefix('api');
  
  const port = process.env.API_PORT || 3001;
  await app.listen(port);
  console.log(`🚀 API Server running on http://api.dev.avnz.io:${port}`);
}
bootstrap();
