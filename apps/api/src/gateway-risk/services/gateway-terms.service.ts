import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MerchantRiskLevel } from '@prisma/client';
import {
  CreateGatewayTermsDocumentDto,
  UpdateGatewayTermsDocumentDto,
  AcceptGatewayTermsDto,
} from '../dto/gateway-terms.dto';
import * as crypto from 'crypto';

@Injectable()
export class GatewayTermsService {
  constructor(private readonly prisma: PrismaService) {}

  async createTermsDocument(dto: CreateGatewayTermsDocumentDto, createdBy: string) {
    // Check for existing version
    const existing = await this.prisma.gatewayTermsDocument.findFirst({
      where: {
        platformIntegrationId: dto.platformIntegrationId,
        version: dto.version,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Terms document version ${dto.version} already exists for this integration`,
      );
    }

    // If this is set as current, unset any existing current
    if (dto.isCurrent) {
      await this.prisma.gatewayTermsDocument.updateMany({
        where: {
          platformIntegrationId: dto.platformIntegrationId,
          isCurrent: true,
        },
        data: { isCurrent: false },
      });
    }

    return this.prisma.gatewayTermsDocument.create({
      data: {
        platformIntegrationId: dto.platformIntegrationId,
        version: dto.version,
        title: dto.title,
        content: dto.content,
        summary: dto.summary,
        applicableRiskLevels: dto.applicableRiskLevels,
        effectiveDate: new Date(dto.effectiveDate),
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        isActive: dto.isActive ?? true,
        isCurrent: dto.isCurrent ?? false,
        createdBy,
      },
    });
  }

  async updateTermsDocument(id: string, dto: UpdateGatewayTermsDocumentDto) {
    const doc = await this.prisma.gatewayTermsDocument.findUnique({
      where: { id },
    });

    if (!doc) {
      throw new NotFoundException(`Terms document ${id} not found`);
    }

    // If setting as current, unset any existing current
    if (dto.isCurrent) {
      await this.prisma.gatewayTermsDocument.updateMany({
        where: {
          platformIntegrationId: doc.platformIntegrationId,
          isCurrent: true,
          id: { not: id },
        },
        data: { isCurrent: false },
      });
    }

    return this.prisma.gatewayTermsDocument.update({
      where: { id },
      data: {
        ...dto,
        effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : undefined,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });
  }

  async getTermsDocument(id: string) {
    const doc = await this.prisma.gatewayTermsDocument.findUnique({
      where: { id },
      include: {
        platformIntegration: true,
        acceptances: {
          include: {
            client: true,
          },
        },
      },
    });

    if (!doc) {
      throw new NotFoundException(`Terms document ${id} not found`);
    }

    return doc;
  }

  async getTermsDocumentsForIntegration(platformIntegrationId: string) {
    return this.prisma.gatewayTermsDocument.findMany({
      where: {
        platformIntegrationId,
        isActive: true,
      },
      orderBy: {
        effectiveDate: 'desc',
      },
    });
  }

  async getCurrentTermsForRiskLevel(platformIntegrationId: string, riskLevel: MerchantRiskLevel) {
    return this.prisma.gatewayTermsDocument.findFirst({
      where: {
        platformIntegrationId,
        isActive: true,
        isCurrent: true,
        applicableRiskLevels: {
          has: riskLevel,
        },
      },
    });
  }

  async getRequiredTermsForClient(platformIntegrationId: string, clientId: string, riskLevel: MerchantRiskLevel) {
    // Get all current terms applicable to this risk level
    const requiredTerms = await this.prisma.gatewayTermsDocument.findMany({
      where: {
        platformIntegrationId,
        isActive: true,
        isCurrent: true,
        applicableRiskLevels: {
          has: riskLevel,
        },
      },
    });

    // Get client's existing acceptances
    const acceptances = await this.prisma.gatewayTermsAcceptance.findMany({
      where: {
        clientId,
        isValid: true,
        termsDocument: {
          platformIntegrationId,
        },
      },
      include: {
        termsDocument: true,
      },
    });

    const acceptedDocIds = new Set(acceptances.map((a) => a.termsDocumentId));

    return {
      required: requiredTerms,
      accepted: acceptances,
      pending: requiredTerms.filter((t) => !acceptedDocIds.has(t.id)),
      allAccepted: requiredTerms.every((t) => acceptedDocIds.has(t.id)),
    };
  }

  async acceptTerms(
    dto: AcceptGatewayTermsDto,
    clientId: string,
    acceptedBy: string,
    ipAddress: string,
    userAgent?: string,
  ) {
    const doc = await this.prisma.gatewayTermsDocument.findUnique({
      where: { id: dto.termsDocumentId },
    });

    if (!doc) {
      throw new NotFoundException(`Terms document ${dto.termsDocumentId} not found`);
    }

    if (!doc.isActive) {
      throw new BadRequestException('Terms document is no longer active');
    }

    // Check if already accepted
    const existing = await this.prisma.gatewayTermsAcceptance.findFirst({
      where: {
        termsDocumentId: dto.termsDocumentId,
        clientId,
        isValid: true,
      },
    });

    if (existing) {
      throw new ConflictException('Terms have already been accepted');
    }

    // Create signature hash
    const signatureData = `${clientId}|${dto.termsDocumentId}|${dto.acceptorName}|${dto.acceptorEmail}|${ipAddress}|${Date.now()}`;
    const signatureHash = crypto.createHash('sha256').update(signatureData).digest('hex');

    return this.prisma.gatewayTermsAcceptance.create({
      data: {
        termsDocumentId: dto.termsDocumentId,
        clientId,
        acceptedBy,
        acceptorName: dto.acceptorName,
        acceptorTitle: dto.acceptorTitle,
        acceptorEmail: dto.acceptorEmail,
        ipAddress,
        userAgent,
        signatureHash,
      },
      include: {
        termsDocument: true,
      },
    });
  }

  async getClientAcceptances(clientId: string) {
    return this.prisma.gatewayTermsAcceptance.findMany({
      where: {
        clientId,
        isValid: true,
      },
      include: {
        termsDocument: true,
      },
      orderBy: {
        acceptedAt: 'desc',
      },
    });
  }

  async revokeAcceptance(acceptanceId: string, revokedBy: string, reason: string) {
    const acceptance = await this.prisma.gatewayTermsAcceptance.findUnique({
      where: { id: acceptanceId },
    });

    if (!acceptance) {
      throw new NotFoundException(`Terms acceptance ${acceptanceId} not found`);
    }

    return this.prisma.gatewayTermsAcceptance.update({
      where: { id: acceptanceId },
      data: {
        isValid: false,
        revokedAt: new Date(),
        revokedBy,
        revokedReason: reason,
      },
    });
  }

  async deleteTermsDocument(id: string) {
    const doc = await this.prisma.gatewayTermsDocument.findUnique({
      where: { id },
      include: {
        acceptances: true,
      },
    });

    if (!doc) {
      throw new NotFoundException(`Terms document ${id} not found`);
    }

    if (doc.acceptances.length > 0) {
      throw new ConflictException(
        `Cannot delete terms document with ${doc.acceptances.length} acceptances`,
      );
    }

    return this.prisma.gatewayTermsDocument.delete({
      where: { id },
    });
  }
}
