import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { EncryptedCredentials, IntegrationCredentials } from '../types/integration.types';

@Injectable()
export class CredentialEncryptionService implements OnModuleInit {
  private readonly logger = new Logger(CredentialEncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly authTagLength = 16;
  private encryptionKey: Buffer;
  private currentKeyVersion = 1;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.loadEncryptionKey();
  }

  private async loadEncryptionKey(): Promise<void> {
    const keyHex = this.configService.get<string>('INTEGRATION_ENCRYPTION_KEY');
    if (!keyHex) {
      this.logger.warn('INTEGRATION_ENCRYPTION_KEY not set. Generating temp key. DO NOT USE IN PRODUCTION!');
      this.encryptionKey = crypto.randomBytes(this.keyLength);
      return;
    }
    if (keyHex.length !== 64) {
      throw new Error('INTEGRATION_ENCRYPTION_KEY must be 64 hex characters');
    }
    this.encryptionKey = Buffer.from(keyHex, 'hex');
    this.logger.log('Encryption key loaded');
  }

  encrypt(credentials: IntegrationCredentials): EncryptedCredentials {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv, { authTagLength: this.authTagLength });
    const plaintext = JSON.stringify(credentials);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return {
      encrypted: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      keyVersion: this.currentKeyVersion,
      encryptedAt: new Date(),
    };
  }

  decrypt(encrypted: EncryptedCredentials): IntegrationCredentials {
    const iv = Buffer.from(encrypted.iv, 'base64');
    const authTag = Buffer.from(encrypted.authTag, 'base64');
    const ciphertext = Buffer.from(encrypted.encrypted, 'base64');
    const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv, { authTagLength: this.authTagLength });
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8'));
  }

  maskCredentials(credentials: IntegrationCredentials): Record<string, string> {
    const masked: Record<string, string> = {};
    for (const [key, value] of Object.entries(credentials)) {
      if (typeof value === 'string' && value.length > 8) {
        masked[key] = `${value.slice(0, 4)}****${value.slice(-4)}`;
      } else {
        masked[key] = '****';
      }
    }
    return masked;
  }

  static generateKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
