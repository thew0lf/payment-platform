import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CloudFrontService } from '../../integrations/services/providers/cloudfront.service';
import { Route53Service } from '../../integrations/services/providers/route53.service';
import { S3StorageService } from '../../integrations/services/providers/s3-storage.service';
import { LandingPageStatus, LandingPageHosting, DomainSslStatus } from '@prisma/client';
import { DeploymentResult, AddCustomDomainDto, RequestSubdomainDto } from '../types/landing-page.types';

@Injectable()
export class DeployService {
  private readonly logger = new Logger(DeployService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudFrontService: CloudFrontService,
    private readonly route53Service: Route53Service,
    private readonly s3StorageService: S3StorageService,
  ) {}

  /**
   * Deploy a landing page to the platform (S3 + CloudFront)
   */
  async deployToPlatform(
    companyId: string,
    pageId: string,
    renderedHtml: string,
    assets: { key: string; content: Buffer; contentType: string }[],
  ): Promise<DeploymentResult> {
    const page = await this.prisma.landingPage.findFirst({
      where: { id: pageId, companyId },
      include: { company: true },
    });

    if (!page) {
      throw new NotFoundException('Landing page not found');
    }

    // Get platform S3 and CloudFront credentials from org integrations
    const s3Integration = await this.getPlatformIntegration(companyId, 'AWS_S3');
    const cfIntegration = await this.getPlatformIntegration(companyId, 'AWS_CLOUDFRONT');

    if (!s3Integration || !cfIntegration) {
      throw new BadRequestException('Platform hosting not configured. Contact support.');
    }

    const s3Credentials = s3Integration.credentials as any;
    const cfCredentials = cfIntegration.credentials as any;

    const s3Path = `landing-pages/${companyId}/${pageId}`;

    // Upload HTML
    await this.s3StorageService.uploadFile(
      s3Credentials,
      Buffer.from(renderedHtml, 'utf-8'),
      'index.html',
      { companyId, folder: s3Path, filename: 'index.html', contentType: 'text/html' },
    );

    // Upload assets
    for (const asset of assets) {
      await this.s3StorageService.uploadFile(
        s3Credentials,
        asset.content,
        asset.key,
        { companyId, folder: `${s3Path}/assets`, filename: asset.key, contentType: asset.contentType },
      );
    }

    // Create or update CloudFront distribution
    let distributionId = page.platformDistributionId;
    let distributionDomain: string;

    if (!distributionId) {
      // Create new distribution
      const distribution = await this.cloudFrontService.createDistribution(
        cfCredentials,
        {
          companyId,
          subdomain: page.subdomain || '',
          s3BucketDomain: `${s3Credentials.bucket}.s3.${s3Credentials.region}.amazonaws.com`,
          s3BucketPath: `/${s3Path}`,
          comment: `Landing page: ${page.name}`,
        },
      );
      distributionId = distribution.id;
      distributionDomain = distribution.domainName;
    } else {
      // Invalidate cache on existing distribution
      await this.cloudFrontService.invalidateCache(cfCredentials, distributionId, ['/*']);
      const distribution = await this.cloudFrontService.getDistribution(cfCredentials, distributionId);
      distributionDomain = distribution?.domainName || '';
    }

    // Update landing page with deployment info
    const platformUrl = `https://${distributionDomain}`;
    await this.prisma.landingPage.update({
      where: { id: pageId },
      data: {
        platformDistributionId: distributionId,
        platformS3Path: s3Path,
        platformUrl,
        status: LandingPageStatus.PUBLISHED,
        publishedAt: new Date(),
        lastDeployedAt: new Date(),
        totalDeploys: { increment: 1 },
      },
    });

    return {
      success: true,
      url: platformUrl,
      distributionId,
      deployedAt: new Date(),
      message: 'Landing page deployed successfully',
    };
  }

  /**
   * Request a subdomain for the landing page
   */
  async requestSubdomain(
    companyId: string,
    pageId: string,
    dto: RequestSubdomainDto,
  ): Promise<{ subdomain: string; fullDomain: string }> {
    const page = await this.prisma.landingPage.findFirst({
      where: { id: pageId, companyId },
    });

    if (!page) {
      throw new NotFoundException('Landing page not found');
    }

    // Check if subdomain is already taken
    const existingSubdomain = await this.prisma.landingPage.findFirst({
      where: {
        subdomain: dto.subdomain,
        id: { not: pageId },
      },
    });

    if (existingSubdomain) {
      throw new BadRequestException(`Subdomain "${dto.subdomain}" is already taken`);
    }

    // Get Route53 integration for platform domain
    const r53Integration = await this.getPlatformIntegration(companyId, 'AWS_ROUTE53');
    const platformDomain = (r53Integration?.credentials as any)?.platformDomain || 'avnz.io';

    const fullDomain = this.route53Service.generateSubdomain(dto.subdomain, platformDomain);

    // Update landing page with subdomain
    await this.prisma.landingPage.update({
      where: { id: pageId },
      data: { subdomain: fullDomain },
    });

    // If page is already deployed, update CloudFront with the new alias
    if (page.platformDistributionId) {
      const cfIntegration = await this.getPlatformIntegration(companyId, 'AWS_CLOUDFRONT');
      if (cfIntegration) {
        const cfCredentials = cfIntegration.credentials as any;

        // Request SSL certificate for subdomain
        const cert = await this.cloudFrontService.requestCertificate(cfCredentials, fullDomain);

        // Create DNS validation records
        if (cert.validationRecords && cert.validationRecords.length > 0) {
          await this.route53Service.createCertificateValidationRecords(
            r53Integration?.credentials as any,
            cert.validationRecords,
          );
        }

        // Update CloudFront with new alias (after SSL is validated)
        // Note: In production, this would be done asynchronously after SSL validation
        await this.cloudFrontService.updateDistributionAliases(
          cfCredentials,
          page.platformDistributionId,
          [fullDomain],
          cert.arn,
        );

        // Create DNS record pointing to CloudFront
        const distribution = await this.cloudFrontService.getDistribution(
          cfCredentials,
          page.platformDistributionId,
        );
        if (distribution) {
          await this.route53Service.createSubdomainRecord(
            r53Integration?.credentials as any,
            fullDomain,
            distribution.domainName,
          );
        }
      }
    }

    return { subdomain: dto.subdomain, fullDomain };
  }

  /**
   * Add a custom domain to a landing page
   */
  async addCustomDomain(
    companyId: string,
    pageId: string,
    dto: AddCustomDomainDto,
  ): Promise<{ domain: string; validationRecords: { name: string; type: string; value: string }[] }> {
    const page = await this.prisma.landingPage.findFirst({
      where: { id: pageId, companyId },
    });

    if (!page) {
      throw new NotFoundException('Landing page not found');
    }

    // Check if domain is already used
    const existingDomain = await this.prisma.landingPageDomain.findFirst({
      where: { domain: dto.domain },
    });

    if (existingDomain) {
      throw new BadRequestException(`Domain "${dto.domain}" is already in use`);
    }

    // Get CloudFront integration
    const cfIntegration = await this.getPlatformIntegration(companyId, 'AWS_CLOUDFRONT');
    if (!cfIntegration) {
      throw new BadRequestException('CloudFront integration not configured');
    }

    const cfCredentials = cfIntegration.credentials as any;

    // Request SSL certificate
    const cert = await this.cloudFrontService.requestCertificate(cfCredentials, dto.domain);

    // Get pricing for custom domains
    const company = await this.prisma.company.findFirst({
      where: { id: companyId },
      include: { client: { include: { organization: true } } },
    });

    let customDomainFee = 499; // $4.99 default
    if (company?.client?.organization) {
      const pricing = await this.prisma.landingPagePricing.findFirst({
        where: { organizationId: company.client.organization.id },
      });
      customDomainFee = pricing?.customDomainFee || 499;
    }

    // Create domain record
    await this.prisma.landingPageDomain.create({
      data: {
        landingPageId: pageId,
        domain: dto.domain,
        sslCertArn: cert.arn,
        sslStatus: DomainSslStatus.PENDING,
        monthlyFee: customDomainFee,
      },
    });

    return {
      domain: dto.domain,
      validationRecords: cert.validationRecords || [],
    };
  }

  /**
   * Check and update SSL status for a custom domain
   */
  async checkDomainSslStatus(companyId: string, pageId: string, domainId: string): Promise<DomainSslStatus> {
    const domain = await this.prisma.landingPageDomain.findFirst({
      where: {
        id: domainId,
        landingPageId: pageId,
        landingPage: { companyId },
      },
    });

    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    if (!domain.sslCertArn) {
      return DomainSslStatus.FAILED;
    }

    const cfIntegration = await this.getPlatformIntegration(companyId, 'AWS_CLOUDFRONT');
    if (!cfIntegration) {
      return domain.sslStatus;
    }

    const cfCredentials = cfIntegration.credentials as any;
    const certStatus = await this.cloudFrontService.getCertificateStatus(cfCredentials, domain.sslCertArn);

    let newStatus: DomainSslStatus;
    switch (certStatus.status) {
      case 'ISSUED':
        newStatus = DomainSslStatus.ACTIVE;
        break;
      case 'PENDING_VALIDATION':
        newStatus = DomainSslStatus.VALIDATING;
        break;
      case 'FAILED':
      case 'REVOKED':
        newStatus = DomainSslStatus.FAILED;
        break;
      case 'EXPIRED':
        newStatus = DomainSslStatus.EXPIRED;
        break;
      default:
        newStatus = DomainSslStatus.PENDING;
    }

    // Update domain status
    await this.prisma.landingPageDomain.update({
      where: { id: domainId },
      data: { sslStatus: newStatus },
    });

    // If SSL is now active, update CloudFront distribution
    if (newStatus === DomainSslStatus.ACTIVE) {
      const page = await this.prisma.landingPage.findFirst({
        where: { id: pageId },
        include: { domains: { where: { sslStatus: DomainSslStatus.ACTIVE } } },
      });

      if (page?.platformDistributionId) {
        const aliases = page.domains.map(d => d.domain);
        if (page.subdomain) aliases.push(page.subdomain);

        await this.cloudFrontService.updateDistributionAliases(
          cfCredentials,
          page.platformDistributionId,
          aliases,
          domain.sslCertArn,
        );
      }
    }

    return newStatus;
  }

  /**
   * Remove a custom domain
   */
  async removeCustomDomain(companyId: string, pageId: string, domainId: string): Promise<void> {
    const domain = await this.prisma.landingPageDomain.findFirst({
      where: {
        id: domainId,
        landingPageId: pageId,
        landingPage: { companyId },
      },
    });

    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    // Update CloudFront distribution to remove the alias
    const page = await this.prisma.landingPage.findFirst({
      where: { id: pageId },
      include: { domains: { where: { sslStatus: DomainSslStatus.ACTIVE } } },
    });

    if (page?.platformDistributionId) {
      const cfIntegration = await this.getPlatformIntegration(companyId, 'AWS_CLOUDFRONT');
      if (cfIntegration) {
        const cfCredentials = cfIntegration.credentials as any;
        const aliases = page.domains.filter(d => d.id !== domainId).map(d => d.domain);
        if (page.subdomain) aliases.push(page.subdomain);

        await this.cloudFrontService.updateDistributionAliases(
          cfCredentials,
          page.platformDistributionId,
          aliases,
        );
      }
    }

    // Delete the SSL certificate if it exists
    if (domain.sslCertArn) {
      try {
        const cfIntegration = await this.getPlatformIntegration(companyId, 'AWS_CLOUDFRONT');
        if (cfIntegration) {
          await this.cloudFrontService.deleteCertificate(
            cfIntegration.credentials as any,
            domain.sslCertArn,
          );
        }
      } catch (error: any) {
        this.logger.warn(`Failed to delete certificate: ${error.message}`);
      }
    }

    // Delete the domain record
    await this.prisma.landingPageDomain.delete({
      where: { id: domainId },
    });
  }

  /**
   * Unpublish a landing page
   */
  async unpublish(companyId: string, pageId: string): Promise<void> {
    const page = await this.prisma.landingPage.findFirst({
      where: { id: pageId, companyId },
    });

    if (!page) {
      throw new NotFoundException('Landing page not found');
    }

    // Update status to draft
    await this.prisma.landingPage.update({
      where: { id: pageId },
      data: { status: LandingPageStatus.DRAFT },
    });

    // Optionally disable CloudFront distribution
    // In production, you might keep it running but return 403
  }

  /**
   * Get platform integration credentials
   */
  private async getPlatformIntegration(companyId: string, provider: string): Promise<any> {
    // Get the company's client and then organization
    const company = await this.prisma.company.findFirst({
      where: { id: companyId },
      include: { client: { include: { organization: true } } },
    });

    if (!company?.client?.organization) {
      return null;
    }

    const integration = await this.prisma.platformIntegration.findFirst({
      where: {
        organizationId: company.client.organization.id,
        provider,
        status: 'ACTIVE',
        isSharedWithClients: true,
      },
    });

    if (!integration) {
      return null;
    }

    // Decrypt credentials
    // Note: In production, you'd use the CredentialEncryptionService
    return {
      credentials: integration.credentials,
      settings: integration.settings,
    };
  }
}
