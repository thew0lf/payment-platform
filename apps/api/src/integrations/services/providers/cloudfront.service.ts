import { Injectable, Logger } from '@nestjs/common';
import {
  CloudFrontClient,
  CreateDistributionCommand,
  GetDistributionCommand,
  UpdateDistributionCommand,
  DeleteDistributionCommand,
  CreateInvalidationCommand,
  ListDistributionsCommand,
  GetDistributionConfigCommand,
} from '@aws-sdk/client-cloudfront';
import {
  ACMClient,
  RequestCertificateCommand,
  DescribeCertificateCommand,
  ListCertificatesCommand,
  DeleteCertificateCommand,
} from '@aws-sdk/client-acm';

export interface CloudFrontCredentials {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  originAccessIdentity?: string;
  priceClass?: string;
  acmCertificateArn?: string;
}

export interface CloudFrontSettings {
  defaultTTL?: number;
  maxTTL?: number;
  minTTL?: number;
  compress?: boolean;
  httpVersion?: 'http1.1' | 'http2' | 'http2and3';
}

export interface CreateDistributionOptions {
  companyId: string;
  subdomain: string;
  s3BucketDomain: string;
  s3BucketPath?: string;
  customDomains?: string[];
  certificateArn?: string;
  comment?: string;
}

export interface DistributionResult {
  id: string;
  arn: string;
  domainName: string;
  status: string;
  enabled: boolean;
  aliases?: string[];
}

export interface CertificateResult {
  arn: string;
  domain: string;
  status: string;
  validationRecords?: {
    name: string;
    type: string;
    value: string;
  }[];
}

@Injectable()
export class CloudFrontService {
  private readonly logger = new Logger(CloudFrontService.name);
  private clientCache = new Map<string, CloudFrontClient>();
  private acmClientCache = new Map<string, ACMClient>();

  private getClient(credentials: CloudFrontCredentials): CloudFrontClient {
    const cacheKey = `${credentials.accessKeyId}`;

    if (!this.clientCache.has(cacheKey)) {
      const client = new CloudFrontClient({
        region: 'us-east-1', // CloudFront API is always us-east-1
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
        },
      });
      this.clientCache.set(cacheKey, client);
    }

    return this.clientCache.get(cacheKey)!;
  }

  private getAcmClient(credentials: CloudFrontCredentials): ACMClient {
    const cacheKey = `${credentials.accessKeyId}`;

    if (!this.acmClientCache.has(cacheKey)) {
      const client = new ACMClient({
        region: 'us-east-1', // ACM for CloudFront must be us-east-1
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
        },
      });
      this.acmClientCache.set(cacheKey, client);
    }

    return this.acmClientCache.get(cacheKey)!;
  }

  /**
   * Request a free SSL certificate from ACM for a custom domain
   */
  async requestCertificate(
    credentials: CloudFrontCredentials,
    domain: string,
    subjectAlternativeNames?: string[],
  ): Promise<CertificateResult> {
    const acmClient = this.getAcmClient(credentials);

    const response = await acmClient.send(new RequestCertificateCommand({
      DomainName: domain,
      SubjectAlternativeNames: subjectAlternativeNames,
      ValidationMethod: 'DNS',
      Tags: [
        { Key: 'Service', Value: 'LandingPages' },
        { Key: 'ManagedBy', Value: 'AvnzPlatform' },
      ],
    }));

    // Get certificate details with validation records
    const certDetails = await this.getCertificateStatus(
      credentials,
      response.CertificateArn!,
    );

    return certDetails;
  }

  /**
   * Get certificate status and validation records
   */
  async getCertificateStatus(
    credentials: CloudFrontCredentials,
    certificateArn: string,
  ): Promise<CertificateResult> {
    const acmClient = this.getAcmClient(credentials);

    const response = await acmClient.send(new DescribeCertificateCommand({
      CertificateArn: certificateArn,
    }));

    const cert = response.Certificate!;

    return {
      arn: certificateArn,
      domain: cert.DomainName!,
      status: cert.Status!,
      validationRecords: cert.DomainValidationOptions?.map(opt => ({
        name: opt.ResourceRecord?.Name || '',
        type: opt.ResourceRecord?.Type || 'CNAME',
        value: opt.ResourceRecord?.Value || '',
      })).filter(r => r.name && r.value),
    };
  }

  /**
   * List certificates for the platform
   */
  async listCertificates(
    credentials: CloudFrontCredentials,
  ): Promise<CertificateResult[]> {
    const acmClient = this.getAcmClient(credentials);

    const response = await acmClient.send(new ListCertificatesCommand({
      MaxItems: 100,
    }));

    return (response.CertificateSummaryList || []).map(cert => ({
      arn: cert.CertificateArn!,
      domain: cert.DomainName!,
      status: cert.Status!,
    }));
  }

  /**
   * Delete a certificate
   */
  async deleteCertificate(
    credentials: CloudFrontCredentials,
    certificateArn: string,
  ): Promise<void> {
    const acmClient = this.getAcmClient(credentials);

    await acmClient.send(new DeleteCertificateCommand({
      CertificateArn: certificateArn,
    }));
  }

  /**
   * Create a CloudFront distribution for a landing page
   */
  async createDistribution(
    credentials: CloudFrontCredentials,
    options: CreateDistributionOptions,
    settings?: CloudFrontSettings,
  ): Promise<DistributionResult> {
    const client = this.getClient(credentials);
    const callerReference = `landing-page-${options.companyId}-${Date.now()}`;

    const aliases = options.customDomains || [];
    if (options.subdomain) {
      aliases.push(options.subdomain);
    }

    const distributionConfig: any = {
      CallerReference: callerReference,
      Comment: options.comment || `Landing page for ${options.companyId}`,
      Enabled: true,
      PriceClass: credentials.priceClass || 'PriceClass_100',
      HttpVersion: settings?.httpVersion || 'http2',
      DefaultRootObject: 'index.html',
      Origins: {
        Quantity: 1,
        Items: [
          {
            Id: 's3-origin',
            DomainName: options.s3BucketDomain,
            OriginPath: options.s3BucketPath || '',
            S3OriginConfig: {
              OriginAccessIdentity: credentials.originAccessIdentity
                ? `origin-access-identity/cloudfront/${credentials.originAccessIdentity}`
                : '',
            },
          },
        ],
      },
      DefaultCacheBehavior: {
        TargetOriginId: 's3-origin',
        ViewerProtocolPolicy: 'redirect-to-https',
        AllowedMethods: {
          Quantity: 2,
          Items: ['GET', 'HEAD'],
          CachedMethods: {
            Quantity: 2,
            Items: ['GET', 'HEAD'],
          },
        },
        Compress: settings?.compress !== false,
        CachePolicyId: '658327ea-f89d-4fab-a63d-7e88639e58f6', // CachingOptimized
        ForwardedValues: {
          QueryString: false,
          Cookies: { Forward: 'none' },
        },
        MinTTL: settings?.minTTL || 0,
        DefaultTTL: settings?.defaultTTL || 86400,
        MaxTTL: settings?.maxTTL || 31536000,
      },
      CustomErrorResponses: {
        Quantity: 2,
        Items: [
          {
            ErrorCode: 403,
            ResponseCode: 200,
            ResponsePagePath: '/index.html',
            ErrorCachingMinTTL: 10,
          },
          {
            ErrorCode: 404,
            ResponseCode: 200,
            ResponsePagePath: '/index.html',
            ErrorCachingMinTTL: 10,
          },
        ],
      },
    };

    // Add aliases if provided
    if (aliases.length > 0) {
      distributionConfig.Aliases = {
        Quantity: aliases.length,
        Items: aliases,
      };
    }

    // Add SSL certificate if custom domains
    if (options.certificateArn && aliases.length > 0) {
      distributionConfig.ViewerCertificate = {
        ACMCertificateArn: options.certificateArn,
        SSLSupportMethod: 'sni-only',
        MinimumProtocolVersion: 'TLSv1.2_2021',
      };
    } else {
      distributionConfig.ViewerCertificate = {
        CloudFrontDefaultCertificate: true,
      };
    }

    const response = await client.send(new CreateDistributionCommand({
      DistributionConfig: distributionConfig,
    }));

    const dist = response.Distribution!;

    return {
      id: dist.Id!,
      arn: dist.ARN!,
      domainName: dist.DomainName!,
      status: dist.Status!,
      enabled: true,
      aliases,
    };
  }

  /**
   * Get distribution details
   */
  async getDistribution(
    credentials: CloudFrontCredentials,
    distributionId: string,
  ): Promise<DistributionResult | null> {
    const client = this.getClient(credentials);

    try {
      const response = await client.send(new GetDistributionCommand({
        Id: distributionId,
      }));

      const dist = response.Distribution!;

      return {
        id: dist.Id!,
        arn: dist.ARN!,
        domainName: dist.DomainName!,
        status: dist.Status!,
        enabled: dist.DistributionConfig?.Enabled || false,
        aliases: dist.DistributionConfig?.Aliases?.Items,
      };
    } catch (error: any) {
      if (error.name === 'NoSuchDistribution') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Update distribution with new aliases/certificate
   */
  async updateDistributionAliases(
    credentials: CloudFrontCredentials,
    distributionId: string,
    aliases: string[],
    certificateArn?: string,
  ): Promise<DistributionResult> {
    const client = this.getClient(credentials);

    // Get current config
    const configResponse = await client.send(new GetDistributionConfigCommand({
      Id: distributionId,
    }));

    const config = configResponse.DistributionConfig!;
    const etag = configResponse.ETag!;

    // Update aliases
    config.Aliases = {
      Quantity: aliases.length,
      Items: aliases,
    };

    // Update certificate if provided
    if (certificateArn && aliases.length > 0) {
      config.ViewerCertificate = {
        ACMCertificateArn: certificateArn,
        SSLSupportMethod: 'sni-only',
        MinimumProtocolVersion: 'TLSv1.2_2021',
      };
    }

    const response = await client.send(new UpdateDistributionCommand({
      Id: distributionId,
      DistributionConfig: config,
      IfMatch: etag,
    }));

    const dist = response.Distribution!;

    return {
      id: dist.Id!,
      arn: dist.ARN!,
      domainName: dist.DomainName!,
      status: dist.Status!,
      enabled: dist.DistributionConfig?.Enabled || false,
      aliases,
    };
  }

  /**
   * Disable a distribution (must be done before deletion)
   */
  async disableDistribution(
    credentials: CloudFrontCredentials,
    distributionId: string,
  ): Promise<void> {
    const client = this.getClient(credentials);

    const configResponse = await client.send(new GetDistributionConfigCommand({
      Id: distributionId,
    }));

    const config = configResponse.DistributionConfig!;
    const etag = configResponse.ETag!;

    config.Enabled = false;

    await client.send(new UpdateDistributionCommand({
      Id: distributionId,
      DistributionConfig: config,
      IfMatch: etag,
    }));
  }

  /**
   * Delete a distribution (must be disabled first)
   */
  async deleteDistribution(
    credentials: CloudFrontCredentials,
    distributionId: string,
  ): Promise<void> {
    const client = this.getClient(credentials);

    // Get current etag
    const response = await client.send(new GetDistributionCommand({
      Id: distributionId,
    }));

    await client.send(new DeleteDistributionCommand({
      Id: distributionId,
      IfMatch: response.ETag!,
    }));
  }

  /**
   * Create cache invalidation
   */
  async invalidateCache(
    credentials: CloudFrontCredentials,
    distributionId: string,
    paths: string[] = ['/*'],
  ): Promise<string> {
    const client = this.getClient(credentials);

    const response = await client.send(new CreateInvalidationCommand({
      DistributionId: distributionId,
      InvalidationBatch: {
        CallerReference: `invalidation-${Date.now()}`,
        Paths: {
          Quantity: paths.length,
          Items: paths,
        },
      },
    }));

    return response.Invalidation!.Id!;
  }

  /**
   * List all distributions
   */
  async listDistributions(
    credentials: CloudFrontCredentials,
  ): Promise<DistributionResult[]> {
    const client = this.getClient(credentials);

    const response = await client.send(new ListDistributionsCommand({
      MaxItems: 100,
    }));

    return (response.DistributionList?.Items || []).map(dist => ({
      id: dist.Id!,
      arn: dist.ARN!,
      domainName: dist.DomainName!,
      status: dist.Status!,
      enabled: dist.Enabled!,
      aliases: dist.Aliases?.Items,
    }));
  }

  /**
   * Test connection to CloudFront
   */
  async testConnection(credentials: CloudFrontCredentials): Promise<{
    success: boolean;
    message: string;
    latencyMs?: number;
  }> {
    const startTime = Date.now();
    const client = this.getClient(credentials);

    try {
      await client.send(new ListDistributionsCommand({
        MaxItems: 1,
      }));

      return {
        success: true,
        message: 'Successfully connected to AWS CloudFront',
        latencyMs: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
        latencyMs: Date.now() - startTime,
      };
    }
  }
}
