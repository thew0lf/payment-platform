import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HierarchyService, UserContext } from '../hierarchy/hierarchy.service';
import * as crypto from 'crypto';

export interface CreateApiKeyDto {
  name: string;
  scopes: string[];
  expiresAt?: Date;
}

export interface UpdateApiKeyDto {
  name?: string;
  isActive?: boolean;
}

@Injectable()
export class ApiKeysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  /**
   * Generate a secure API key
   */
  private generateApiKey(prefix: string = 'pk_live_'): { key: string; hash: string } {
    const randomBytes = crypto.randomBytes(32);
    const key = prefix + randomBytes.toString('base64url');
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    return { key, hash };
  }

  /**
   * Hash an API key for storage/lookup
   */
  private hashApiKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  /**
   * Get all API keys for user's organization
   */
  async getApiKeys(user: UserContext) {
    // Only organization-level users can manage API keys
    if (user.scopeType !== 'ORGANIZATION') {
      throw new ForbiddenException('API key management requires organization-level access');
    }

    const apiKeys = await this.prisma.apiKey.findMany({
      where: {
        organizationId: user.organizationId,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        lastUsedAt: true,
        expiresAt: true,
        isActive: true,
        createdAt: true,
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return apiKeys;
  }

  /**
   * Create a new API key
   */
  async createApiKey(user: UserContext, dto: CreateApiKeyDto) {
    // Only organization-level users can create API keys
    if (user.scopeType !== 'ORGANIZATION') {
      throw new ForbiddenException('API key creation requires organization-level access');
    }

    if (!user.organizationId) {
      throw new ForbiddenException('Organization ID is required');
    }

    // Generate the API key
    const prefix = 'pk_live_';
    const { key, hash } = this.generateApiKey(prefix);

    // Create the API key record
    const apiKey = await this.prisma.apiKey.create({
      data: {
        organizationId: user.organizationId,
        name: dto.name,
        keyHash: hash,
        keyPrefix: prefix,
        scopes: dto.scopes,
        expiresAt: dto.expiresAt,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        expiresAt: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Return the full key only on creation - it cannot be retrieved later
    return {
      ...apiKey,
      secretKey: key,
      message: 'Save this key securely. It cannot be retrieved again.',
    };
  }

  /**
   * Update an API key (enable/disable, rename)
   */
  async updateApiKey(user: UserContext, keyId: string, dto: UpdateApiKeyDto) {
    if (user.scopeType !== 'ORGANIZATION') {
      throw new ForbiddenException('API key management requires organization-level access');
    }

    const apiKey = await this.prisma.apiKey.findUnique({
      where: { id: keyId },
      select: {
        id: true,
        organizationId: true,
      },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    // Check access
    if (apiKey.organizationId !== user.organizationId) {
      throw new ForbiddenException('You do not have access to this API key');
    }

    return this.prisma.apiKey.update({
      where: { id: keyId },
      data: {
        name: dto.name,
        isActive: dto.isActive,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        lastUsedAt: true,
        expiresAt: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  /**
   * Regenerate an API key (creates new secret, invalidates old one)
   */
  async regenerateApiKey(user: UserContext, keyId: string) {
    if (user.scopeType !== 'ORGANIZATION') {
      throw new ForbiddenException('API key management requires organization-level access');
    }

    const apiKey = await this.prisma.apiKey.findUnique({
      where: { id: keyId },
      select: {
        id: true,
        organizationId: true,
        name: true,
        scopes: true,
        expiresAt: true,
      },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    // Check access
    if (apiKey.organizationId !== user.organizationId) {
      throw new ForbiddenException('You do not have access to this API key');
    }

    // Generate new key
    const prefix = 'pk_live_';
    const { key, hash } = this.generateApiKey(prefix);

    // Update with new hash
    const updated = await this.prisma.apiKey.update({
      where: { id: keyId },
      data: {
        keyHash: hash,
        keyPrefix: prefix,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        expiresAt: true,
        isActive: true,
        createdAt: true,
      },
    });

    return {
      ...updated,
      secretKey: key,
      message: 'API key regenerated. Save this key securely. The old key is no longer valid.',
    };
  }

  /**
   * Delete an API key
   */
  async deleteApiKey(user: UserContext, keyId: string) {
    if (user.scopeType !== 'ORGANIZATION') {
      throw new ForbiddenException('API key management requires organization-level access');
    }

    const apiKey = await this.prisma.apiKey.findUnique({
      where: { id: keyId },
      select: {
        id: true,
        organizationId: true,
      },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    // Check access
    if (apiKey.organizationId !== user.organizationId) {
      throw new ForbiddenException('You do not have access to this API key');
    }

    await this.prisma.apiKey.delete({
      where: { id: keyId },
    });

    return { message: 'API key deleted successfully' };
  }

  /**
   * Validate an API key (for use in API requests)
   */
  async validateApiKey(key: string) {
    const hash = this.hashApiKey(key);

    const apiKey = await this.prisma.apiKey.findFirst({
      where: {
        keyHash: hash,
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            billingStatus: true,
          },
        },
      },
    });

    if (!apiKey) {
      return null;
    }

    // Check if organization is active
    if (apiKey.organization.billingStatus !== 'ACTIVE') {
      return null;
    }

    // Update last used timestamp
    await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      keyId: apiKey.id,
      organizationId: apiKey.organizationId,
      scopes: apiKey.scopes,
      organization: apiKey.organization,
    };
  }

  /**
   * Get available scopes
   */
  getAvailableScopes() {
    return [
      { id: 'transactions:read', label: 'Read Transactions', description: 'View transaction data' },
      { id: 'transactions:write', label: 'Write Transactions', description: 'Create and modify transactions' },
      { id: 'customers:read', label: 'Read Customers', description: 'View customer data' },
      { id: 'customers:write', label: 'Write Customers', description: 'Create and modify customers' },
      { id: 'webhooks:read', label: 'Read Webhooks', description: 'View webhook configurations' },
      { id: 'webhooks:write', label: 'Write Webhooks', description: 'Configure webhooks' },
      { id: 'payment-methods:read', label: 'Read Payment Methods', description: 'View vaulted payment methods' },
      { id: 'payment-methods:write', label: 'Write Payment Methods', description: 'Create and manage payment methods' },
      { id: 'subscriptions:read', label: 'Read Subscriptions', description: 'View subscription data' },
      { id: 'subscriptions:write', label: 'Write Subscriptions', description: 'Create and manage subscriptions' },
    ];
  }
}
