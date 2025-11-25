import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ContinuityModule } from './continuity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ContinuityModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
