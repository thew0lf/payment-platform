import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeType } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  scopeType: ScopeType;
  scopeId: string;
  role: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatar: string | null;
  scopeType: ScopeType;
  scopeId: string;
  role: string;
  organizationId: string | null;
  clientId: string | null;
  companyId: string | null;
  departmentId: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<AuthenticatedUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        firstName: true,
        lastName: true,
        avatar: true,
        scopeType: true,
        scopeId: true,
        role: true,
        status: true,
        organizationId: true,
        clientId: true,
        companyId: true,
        departmentId: true,
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      return null;
    }

    if (!user.passwordHash) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return null;
    }

    const { passwordHash, status, ...result } = user;
    return result;
  }

  async login(user: AuthenticatedUser): Promise<{ accessToken: string; user: AuthenticatedUser }> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      scopeType: user.scopeType,
      scopeId: user.scopeId,
      role: user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user,
    };
  }

  async getUserById(id: string): Promise<AuthenticatedUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        scopeType: true,
        scopeId: true,
        role: true,
        status: true,
        organizationId: true,
        clientId: true,
        companyId: true,
        departmentId: true,
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      return null;
    }

    const { status, ...result } = user;
    return result;
  }
}
