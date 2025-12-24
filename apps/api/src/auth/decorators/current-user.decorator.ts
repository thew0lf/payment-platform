import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ScopeType } from '@prisma/client';

export interface AuthenticatedUser {
  sub: string;  // JWT subject (user ID)
  id: string;   // Alias for sub
  email: string;
  role: string;
  scopeType: ScopeType;
  scopeId: string;
  organizationId?: string;
  clientId?: string;
  companyId?: string;
  departmentId?: string;
}

/**
 * Decorator to extract authenticated user from request
 * Usage: @CurrentUser() user: AuthenticatedUser
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext): AuthenticatedUser | any => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    if (!user) {
      return null;
    }

    // If a specific field is requested, return just that field
    if (data) {
      return user[data];
    }

    return user;
  },
);
