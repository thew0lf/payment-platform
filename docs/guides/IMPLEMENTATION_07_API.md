# Implementation Part 7: Backend API Updates

## Overview

These updates add hierarchy-aware endpoints to your existing Nest.js API. The key principle: **data is filtered at the API level based on user's scope**.

---

## File: apps/api/src/auth/auth.module.ts

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
```

---

## File: apps/api/src/auth/auth.service.ts

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { User, ScopeType } from '@prisma/client';

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
```

---

## File: apps/api/src/auth/auth.controller.ts

```typescript
import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

class LoginDto {
  email: string;
  password: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    const user = await this.authService.getUserById(req.user.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return { user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout() {
    // For JWT, logout is handled client-side by removing the token
    // Could add token blacklisting here if needed
    return { message: 'Logged out successfully' };
  }
}
```

---

## File: apps/api/src/auth/strategies/jwt.strategy.ts

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    return {
      sub: payload.sub,
      email: payload.email,
      scopeType: payload.scopeType,
      scopeId: payload.scopeId,
      role: payload.role,
    };
  }
}
```

---

## File: apps/api/src/auth/guards/jwt-auth.guard.ts

```typescript
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';

export const IS_PUBLIC_KEY = 'isPublic';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }
}
```

---

## File: apps/api/src/hierarchy/hierarchy.module.ts

```typescript
import { Module } from '@nestjs/common';
import { HierarchyController } from './hierarchy.controller';
import { HierarchyService } from './hierarchy.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [HierarchyController],
  providers: [HierarchyService],
  exports: [HierarchyService],
})
export class HierarchyModule {}
```

---

## File: apps/api/src/hierarchy/hierarchy.service.ts

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeType } from '@prisma/client';

interface UserContext {
  sub: string;
  scopeType: ScopeType;
  scopeId: string;
  organizationId?: string;
  clientId?: string;
  companyId?: string;
  departmentId?: string;
}

@Injectable()
export class HierarchyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get accessible hierarchy based on user's scope level
   */
  async getAccessibleHierarchy(user: UserContext) {
    const result = {
      clients: [],
      companies: [],
      departments: [],
    };

    switch (user.scopeType) {
      case 'ORGANIZATION':
        // Org level: can see all clients and companies
        result.clients = await this.prisma.client.findMany({
          where: { status: 'ACTIVE' },
          include: {
            _count: {
              select: { companies: true, users: true },
            },
          },
          orderBy: { name: 'asc' },
        });

        result.companies = await this.prisma.company.findMany({
          where: { status: 'ACTIVE' },
          include: {
            _count: {
              select: { departments: true, users: true, transactions: true, customers: true },
            },
          },
          orderBy: { name: 'asc' },
        });

        result.departments = await this.prisma.department.findMany({
          where: { status: 'ACTIVE' },
          include: {
            _count: {
              select: { teams: true, users: true },
            },
          },
          orderBy: { name: 'asc' },
        });
        break;

      case 'CLIENT':
        // Client level: can only see their own companies
        result.companies = await this.prisma.company.findMany({
          where: {
            clientId: user.clientId,
            status: 'ACTIVE',
          },
          include: {
            _count: {
              select: { departments: true, users: true, transactions: true, customers: true },
            },
          },
          orderBy: { name: 'asc' },
        });

        const companyIds = result.companies.map(c => c.id);
        result.departments = await this.prisma.department.findMany({
          where: {
            companyId: { in: companyIds },
            status: 'ACTIVE',
          },
          include: {
            _count: {
              select: { teams: true, users: true },
            },
          },
          orderBy: { name: 'asc' },
        });
        break;

      case 'COMPANY':
        // Company level: can only see their own company
        const company = await this.prisma.company.findUnique({
          where: { id: user.companyId },
          include: {
            _count: {
              select: { departments: true, users: true, transactions: true, customers: true },
            },
          },
        });
        if (company) {
          result.companies = [company];
        }

        result.departments = await this.prisma.department.findMany({
          where: {
            companyId: user.companyId,
            status: 'ACTIVE',
          },
          include: {
            _count: {
              select: { teams: true, users: true },
            },
          },
          orderBy: { name: 'asc' },
        });
        break;

      case 'DEPARTMENT':
        // Department level: can only see their own department
        const department = await this.prisma.department.findUnique({
          where: { id: user.departmentId },
          include: {
            _count: {
              select: { teams: true, users: true },
            },
          },
        });
        if (department) {
          result.departments = [department];
        }
        break;
    }

    return result;
  }

  /**
   * Build a where clause that filters data based on user's scope
   */
  buildScopeFilter(user: UserContext, companyIdField = 'companyId') {
    switch (user.scopeType) {
      case 'ORGANIZATION':
        // No filter - can see all
        return {};

      case 'CLIENT':
        // Filter to companies belonging to their client
        return {
          company: {
            clientId: user.clientId,
          },
        };

      case 'COMPANY':
        // Filter to their company only
        return {
          [companyIdField]: user.companyId,
        };

      case 'DEPARTMENT':
        // Filter to their company (departments don't own transactions directly)
        return {
          [companyIdField]: user.companyId,
        };

      default:
        // Most restrictive - no access
        return {
          [companyIdField]: 'NO_ACCESS',
        };
    }
  }

  /**
   * Check if user can access a specific company
   */
  async canAccessCompany(user: UserContext, companyId: string): Promise<boolean> {
    if (user.scopeType === 'ORGANIZATION') {
      return true;
    }

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { clientId: true },
    });

    if (!company) {
      return false;
    }

    if (user.scopeType === 'CLIENT') {
      return company.clientId === user.clientId;
    }

    if (user.scopeType === 'COMPANY' || user.scopeType === 'DEPARTMENT') {
      return companyId === user.companyId;
    }

    return false;
  }

  /**
   * Get company IDs that user can access
   */
  async getAccessibleCompanyIds(user: UserContext): Promise<string[]> {
    switch (user.scopeType) {
      case 'ORGANIZATION':
        const allCompanies = await this.prisma.company.findMany({
          where: { status: 'ACTIVE' },
          select: { id: true },
        });
        return allCompanies.map(c => c.id);

      case 'CLIENT':
        const clientCompanies = await this.prisma.company.findMany({
          where: { clientId: user.clientId, status: 'ACTIVE' },
          select: { id: true },
        });
        return clientCompanies.map(c => c.id);

      case 'COMPANY':
      case 'DEPARTMENT':
        return user.companyId ? [user.companyId] : [];

      default:
        return [];
    }
  }
}
```

---

## File: apps/api/src/hierarchy/hierarchy.controller.ts

```typescript
import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { HierarchyService } from './hierarchy.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('hierarchy')
@UseGuards(JwtAuthGuard)
export class HierarchyController {
  constructor(private readonly hierarchyService: HierarchyService) {}

  @Get('accessible')
  async getAccessibleHierarchy(@Request() req) {
    return this.hierarchyService.getAccessibleHierarchy(req.user);
  }
}
```

---

## File: apps/api/src/dashboard/dashboard.module.ts

```typescript
import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { PrismaModule } from '../prisma/prisma.module';
import { HierarchyModule } from '../hierarchy/hierarchy.module';

@Module({
  imports: [PrismaModule, HierarchyModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
```

---

## File: apps/api/src/dashboard/dashboard.service.ts

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HierarchyService } from '../hierarchy/hierarchy.service';
import { ScopeType } from '@prisma/client';

interface UserContext {
  sub: string;
  scopeType: ScopeType;
  scopeId: string;
  clientId?: string;
  companyId?: string;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  async getMetrics(user: UserContext, filters?: { companyId?: string; clientId?: string }) {
    // Get accessible company IDs
    let companyIds = await this.hierarchyService.getAccessibleCompanyIds(user);

    // Apply additional filters
    if (filters?.companyId && companyIds.includes(filters.companyId)) {
      companyIds = [filters.companyId];
    } else if (filters?.clientId && user.scopeType === 'ORGANIZATION') {
      // Filter to specific client's companies
      const clientCompanies = await this.prisma.company.findMany({
        where: { clientId: filters.clientId, status: 'ACTIVE' },
        select: { id: true },
      });
      companyIds = clientCompanies.map(c => c.id).filter(id => companyIds.includes(id));
    }

    // Get current month date range
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Aggregate transactions for current month
    const currentMonthStats = await this.prisma.transaction.aggregate({
      where: {
        companyId: { in: companyIds },
        status: 'COMPLETED',
        createdAt: { gte: startOfMonth },
      },
      _sum: { amount: true },
      _count: { id: true },
    });

    // Aggregate transactions for last month (for comparison)
    const lastMonthStats = await this.prisma.transaction.aggregate({
      where: {
        companyId: { in: companyIds },
        status: 'COMPLETED',
        createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
      _sum: { amount: true },
      _count: { id: true },
    });

    // Count active subscriptions
    const activeSubscriptions = await this.prisma.subscription.count({
      where: {
        companyId: { in: companyIds },
        status: 'ACTIVE',
      },
    });

    // Count failed transactions
    const failedTransactions = await this.prisma.transaction.count({
      where: {
        companyId: { in: companyIds },
        status: 'FAILED',
        createdAt: { gte: startOfMonth },
      },
    });

    // Calculate changes
    const currentRevenue = currentMonthStats._sum.amount?.toNumber() || 0;
    const lastRevenue = lastMonthStats._sum.amount?.toNumber() || 0;
    const revenueChange = lastRevenue > 0 ? ((currentRevenue - lastRevenue) / lastRevenue) * 100 : 0;

    const currentCount = currentMonthStats._count.id || 0;
    const lastCount = lastMonthStats._count.id || 0;
    const countChange = lastCount > 0 ? ((currentCount - lastCount) / lastCount) * 100 : 0;

    return {
      revenue: {
        total: currentRevenue,
        change: revenueChange,
        period: 'this_month',
      },
      transactions: {
        total: currentCount,
        change: countChange,
        successful: currentCount,
        failed: failedTransactions,
      },
      subscriptions: {
        active: activeSubscriptions,
        change: 0, // Would need historical data
        churnRate: 0,
      },
      customers: {
        total: 0, // Add customer count
        change: 0,
        active: 0,
      },
    };
  }

  async getProviderMetrics(user: UserContext, filters?: { companyId?: string }) {
    let companyIds = await this.hierarchyService.getAccessibleCompanyIds(user);

    if (filters?.companyId && companyIds.includes(filters.companyId)) {
      companyIds = [filters.companyId];
    }

    const providers = await this.prisma.paymentProvider.findMany({
      where: {
        companyId: { in: companyIds },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        type: true,
        companyId: true,
      },
    });

    // Get transaction stats per provider
    const providerMetrics = await Promise.all(
      providers.map(async (provider) => {
        const stats = await this.prisma.transaction.aggregate({
          where: {
            paymentProviderId: provider.id,
            createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
          _sum: { amount: true },
          _count: { id: true },
        });

        const successCount = await this.prisma.transaction.count({
          where: {
            paymentProviderId: provider.id,
            status: 'COMPLETED',
            createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        });

        const totalCount = stats._count.id || 1;
        const successRate = (successCount / totalCount) * 100;

        return {
          providerId: provider.id,
          providerName: provider.name,
          providerType: provider.type,
          status: successRate > 98 ? 'healthy' : successRate > 95 ? 'degraded' : 'down',
          volume: stats._sum.amount?.toNumber() || 0,
          transactionCount: stats._count.id || 0,
          successRate,
          averageFee: 0, // Would need fee tracking
        };
      })
    );

    return providerMetrics;
  }

  async getRecentTransactions(user: UserContext, filters?: { companyId?: string; limit?: number }) {
    let companyIds = await this.hierarchyService.getAccessibleCompanyIds(user);

    if (filters?.companyId && companyIds.includes(filters.companyId)) {
      companyIds = [filters.companyId];
    }

    return this.prisma.transaction.findMany({
      where: {
        companyId: { in: companyIds },
      },
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        paymentProvider: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 10,
    });
  }
}
```

---

## File: apps/api/src/dashboard/dashboard.controller.ts

```typescript
import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('metrics')
  async getMetrics(
    @Request() req,
    @Query('companyId') companyId?: string,
    @Query('clientId') clientId?: string,
  ) {
    return this.dashboardService.getMetrics(req.user, { companyId, clientId });
  }

  @Get('providers')
  async getProviderMetrics(
    @Request() req,
    @Query('companyId') companyId?: string,
  ) {
    return this.dashboardService.getProviderMetrics(req.user, { companyId });
  }

  @Get('transactions/recent')
  async getRecentTransactions(
    @Request() req,
    @Query('companyId') companyId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.dashboardService.getRecentTransactions(req.user, {
      companyId,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }
}
```

---

## File: apps/api/src/app.module.ts (Updated)

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { HierarchyModule } from './hierarchy/hierarchy.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { TransactionsModule } from './transactions/transactions.module';
import { CustomersModule } from './customers/customers.module';
import { ContinuityModule } from './continuity';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    HierarchyModule,
    DashboardModule,
    TransactionsModule,
    CustomersModule,
    ContinuityModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Uncomment to make all routes require auth by default
    // {
    //   provide: APP_GUARD,
    //   useClass: JwtAuthGuard,
    // },
  ],
})
export class AppModule {}
```

---

## File: apps/api/src/prisma/prisma.module.ts

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

---

## File: apps/api/src/prisma/prisma.service.ts

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

---

## Seed Data for Testing

## File: apps/api/prisma/seed.ts

```typescript
import { PrismaClient, ScopeType, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create Organization (avnz.io)
  const org = await prisma.organization.upsert({
    where: { slug: 'avnz-io' },
    update: {},
    create: {
      name: 'avnz.io',
      slug: 'avnz-io',
      domain: 'avnz.io',
      billingPlan: 'ENTERPRISE',
      billingStatus: 'ACTIVE',
    },
  });
  console.log('✅ Organization created:', org.name);

  // Create Organization Admin
  const orgAdminPassword = await bcrypt.hash('demo123', 10);
  const orgAdmin = await prisma.user.upsert({
    where: { email: 'admin@avnz.io' },
    update: {},
    create: {
      email: 'admin@avnz.io',
      passwordHash: orgAdminPassword,
      firstName: 'Platform',
      lastName: 'Admin',
      scopeType: ScopeType.ORGANIZATION,
      scopeId: org.id,
      role: UserRole.SUPER_ADMIN,
      status: 'ACTIVE',
      organizationId: org.id,
    },
  });
  console.log('✅ Org admin created:', orgAdmin.email);

  // Create Client 1: Velocity Agency
  const client1 = await prisma.client.upsert({
    where: { organizationId_slug: { organizationId: org.id, slug: 'velocity-agency' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Velocity Agency',
      slug: 'velocity-agency',
      contactName: 'Sarah Chen',
      contactEmail: 'sarah@velocityagency.com',
      plan: 'PREMIUM',
      status: 'ACTIVE',
    },
  });
  console.log('✅ Client created:', client1.name);

  // Create Client Admin
  const clientAdminPassword = await bcrypt.hash('demo123', 10);
  const clientAdmin = await prisma.user.upsert({
    where: { email: 'owner@velocityagency.com' },
    update: {},
    create: {
      email: 'owner@velocityagency.com',
      passwordHash: clientAdminPassword,
      firstName: 'Sarah',
      lastName: 'Chen',
      scopeType: ScopeType.CLIENT,
      scopeId: client1.id,
      role: UserRole.ADMIN,
      status: 'ACTIVE',
      clientId: client1.id,
    },
  });
  console.log('✅ Client admin created:', clientAdmin.email);

  // Create Companies for Client 1
  const companies = [
    { name: 'CoffeeCo', slug: 'coffee-co' },
    { name: 'FitBox', slug: 'fitbox' },
    { name: 'PetPals', slug: 'petpals' },
  ];

  for (const companyData of companies) {
    const company = await prisma.company.upsert({
      where: { clientId_slug: { clientId: client1.id, slug: companyData.slug } },
      update: {},
      create: {
        clientId: client1.id,
        name: companyData.name,
        slug: companyData.slug,
        timezone: 'America/New_York',
        currency: 'USD',
        status: 'ACTIVE',
      },
    });
    console.log('✅ Company created:', company.name);

    // Create Company Manager
    const managerPassword = await bcrypt.hash('demo123', 10);
    const manager = await prisma.user.upsert({
      where: { email: `manager@${companyData.slug}.com` },
      update: {},
      create: {
        email: `manager@${companyData.slug}.com`,
        passwordHash: managerPassword,
        firstName: 'Manager',
        lastName: companyData.name,
        scopeType: ScopeType.COMPANY,
        scopeId: company.id,
        role: UserRole.MANAGER,
        status: 'ACTIVE',
        companyId: company.id,
        clientId: client1.id,
      },
    });
    console.log('✅ Company manager created:', manager.email);

    // Create Payment Provider
    await prisma.paymentProvider.upsert({
      where: { id: `${company.id}-payflow` },
      update: {},
      create: {
        id: `${company.id}-payflow`,
        companyId: company.id,
        name: 'PayPal Payflow',
        type: 'PAYFLOW',
        encryptedCredentials: 'encrypted_placeholder',
        isDefault: true,
        isActive: true,
        priority: 1,
        environment: 'sandbox',
      },
    });

    // Create some test customers
    for (let i = 1; i <= 5; i++) {
      await prisma.customer.upsert({
        where: {
          companyId_email: {
            companyId: company.id,
            email: `customer${i}@example.com`,
          },
        },
        update: {},
        create: {
          companyId: company.id,
          email: `customer${i}@example.com`,
          firstName: `Customer`,
          lastName: `${i}`,
          status: 'ACTIVE',
        },
      });
    }

    // Create some test transactions
    const statuses = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'PENDING', 'FAILED'];
    for (let i = 0; i < 5; i++) {
      await prisma.transaction.create({
        data: {
          companyId: company.id,
          transactionNumber: `txn_${company.slug}_${Date.now()}_${i}`,
          type: 'CHARGE',
          amount: Math.random() * 100 + 10,
          currency: 'USD',
          status: statuses[i] as any,
          createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        },
      });
    }
  }

  // Create Client 2: Digital First
  const client2 = await prisma.client.upsert({
    where: { organizationId_slug: { organizationId: org.id, slug: 'digital-first' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Digital First',
      slug: 'digital-first',
      contactName: 'Mike Torres',
      contactEmail: 'mike@digitalfirst.io',
      plan: 'STANDARD',
      status: 'ACTIVE',
    },
  });
  console.log('✅ Client created:', client2.name);

  // Create companies for Client 2
  const client2Companies = [
    { name: 'SaaSly', slug: 'saasly' },
    { name: 'CloudNine', slug: 'cloudnine' },
  ];

  for (const companyData of client2Companies) {
    const company = await prisma.company.upsert({
      where: { clientId_slug: { clientId: client2.id, slug: companyData.slug } },
      update: {},
      create: {
        clientId: client2.id,
        name: companyData.name,
        slug: companyData.slug,
        timezone: 'UTC',
        currency: 'USD',
        status: 'ACTIVE',
      },
    });
    console.log('✅ Company created:', company.name);
  }

  console.log('✅ Seeding complete!');
  console.log('');
  console.log('📋 Test Accounts:');
  console.log('   Organization: admin@avnz.io / demo123');
  console.log('   Client:       owner@velocityagency.com / demo123');
  console.log('   Company:      manager@coffee-co.com / demo123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Add to `apps/api/package.json`:
```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

Run with: `npx prisma db seed`

---

Continue to the Claude Code Instructions file...
