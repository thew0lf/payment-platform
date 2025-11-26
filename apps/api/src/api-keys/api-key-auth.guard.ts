import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeysService } from './api-keys.service';

export const API_KEY_SCOPES = 'apiKeyScopes';
export const RequireScopes = (...scopes: string[]) => SetMetadata(API_KEY_SCOPES, scopes);

/**
 * Guard for API key authentication
 * Use this guard for public API endpoints that clients access with their API keys
 */
@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(
    private readonly apiKeysService: ApiKeysService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Get API key from header
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    // Validate the API key
    const keyData = await this.apiKeysService.validateApiKey(apiKey);

    if (!keyData) {
      throw new UnauthorizedException('Invalid or expired API key');
    }

    // Check required scopes
    const requiredScopes = this.reflector.getAllAndOverride<string[]>(API_KEY_SCOPES, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredScopes && requiredScopes.length > 0) {
      const hasAllScopes = requiredScopes.every(scope => keyData.scopes.includes(scope));
      if (!hasAllScopes) {
        throw new UnauthorizedException(
          `API key missing required scopes: ${requiredScopes.join(', ')}`
        );
      }
    }

    // Attach key data to request for use in controllers
    request.apiKey = keyData;

    return true;
  }

  private extractApiKey(request: any): string | null {
    // Check Authorization header (Bearer token style)
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      if (token.startsWith('pk_')) {
        return token;
      }
    }

    // Check X-API-Key header
    const apiKeyHeader = request.headers['x-api-key'];
    if (apiKeyHeader) {
      return apiKeyHeader;
    }

    return null;
  }
}
