import { Injectable, CanActivate, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ScopeType } from '@prisma/client';

export const SCOPES_KEY = 'scopes';
export const Scopes = (...scopes: ScopeType[]) => SetMetadata(SCOPES_KEY, scopes);

@Injectable()
export class ScopeGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredScopes = this.reflector.getAllAndOverride<ScopeType[]>(SCOPES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredScopes || requiredScopes.length === 0) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.scopeType) {
      return false;
    }
    return requiredScopes.includes(user.scopeType);
  }
}
