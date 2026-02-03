import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RecaptchaService } from './recaptcha.service';

/**
 * reCAPTCHA Module
 *
 * Provides invisible fraud protection using Google reCAPTCHA v3.
 * Marked as @Global so it can be injected anywhere without explicit imports.
 *
 * Configuration (via environment variables):
 * - RECAPTCHA_SECRET_KEY: Server-side secret key from Google (required to enable)
 * - RECAPTCHA_THRESHOLD: Minimum score threshold (default: 0.3)
 * - RECAPTCHA_ENABLED: Whether to enable reCAPTCHA (default: true if secret key is set)
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [RecaptchaService],
  exports: [RecaptchaService],
})
export class RecaptchaModule {}
