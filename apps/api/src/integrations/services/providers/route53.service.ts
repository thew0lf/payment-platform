import { Injectable, Logger } from '@nestjs/common';
import {
  Route53Client,
  ChangeResourceRecordSetsCommand,
  ListHostedZonesCommand,
  ListResourceRecordSetsCommand,
  GetHostedZoneCommand,
  CreateHostedZoneCommand,
  DeleteHostedZoneCommand,
  ChangeInfo,
  GetChangeCommand,
} from '@aws-sdk/client-route-53';

export interface Route53Credentials {
  accessKeyId: string;
  secretAccessKey: string;
  hostedZoneId?: string;
  platformDomain?: string;
}

export interface Route53Settings {
  defaultTTL?: number;
}

export interface DnsRecord {
  name: string;
  type: 'A' | 'AAAA' | 'CNAME' | 'TXT' | 'MX' | 'NS' | 'SOA';
  value: string | string[];
  ttl?: number;
}

export interface HostedZone {
  id: string;
  name: string;
  recordCount: number;
  isPrivate: boolean;
}

export interface RecordSetResult {
  name: string;
  type: string;
  ttl?: number;
  values: string[];
}

@Injectable()
export class Route53Service {
  private readonly logger = new Logger(Route53Service.name);
  private clientCache = new Map<string, Route53Client>();

  private getClient(credentials: Route53Credentials): Route53Client {
    const cacheKey = `${credentials.accessKeyId}`;

    if (!this.clientCache.has(cacheKey)) {
      const client = new Route53Client({
        region: 'us-east-1', // Route53 is global but uses us-east-1
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
        },
      });
      this.clientCache.set(cacheKey, client);
    }

    return this.clientCache.get(cacheKey)!;
  }

  /**
   * List all hosted zones
   */
  async listHostedZones(
    credentials: Route53Credentials,
  ): Promise<HostedZone[]> {
    const client = this.getClient(credentials);

    const response = await client.send(new ListHostedZonesCommand({
      MaxItems: 100,
    }));

    return (response.HostedZones || []).map(zone => ({
      id: zone.Id!.replace('/hostedzone/', ''),
      name: zone.Name!,
      recordCount: zone.ResourceRecordSetCount || 0,
      isPrivate: zone.Config?.PrivateZone || false,
    }));
  }

  /**
   * Get hosted zone details
   */
  async getHostedZone(
    credentials: Route53Credentials,
    hostedZoneId: string,
  ): Promise<HostedZone | null> {
    const client = this.getClient(credentials);

    try {
      const response = await client.send(new GetHostedZoneCommand({
        Id: hostedZoneId,
      }));

      const zone = response.HostedZone!;

      return {
        id: zone.Id!.replace('/hostedzone/', ''),
        name: zone.Name!,
        recordCount: zone.ResourceRecordSetCount || 0,
        isPrivate: zone.Config?.PrivateZone || false,
      };
    } catch (error: any) {
      if (error.name === 'NoSuchHostedZone') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Create a subdomain record pointing to CloudFront
   */
  async createSubdomainRecord(
    credentials: Route53Credentials,
    subdomain: string,
    cloudfrontDomain: string,
    hostedZoneId?: string,
  ): Promise<{ changeId: string; status: string }> {
    const client = this.getClient(credentials);
    const zoneId = hostedZoneId || credentials.hostedZoneId;

    if (!zoneId) {
      throw new Error('Hosted zone ID is required');
    }

    const response = await client.send(new ChangeResourceRecordSetsCommand({
      HostedZoneId: zoneId,
      ChangeBatch: {
        Comment: `Create subdomain ${subdomain} for landing page`,
        Changes: [
          {
            Action: 'UPSERT',
            ResourceRecordSet: {
              Name: subdomain,
              Type: 'A',
              AliasTarget: {
                HostedZoneId: 'Z2FDTNDATAQYW2', // CloudFront hosted zone ID (constant)
                DNSName: cloudfrontDomain,
                EvaluateTargetHealth: false,
              },
            },
          },
        ],
      },
    }));

    return {
      changeId: response.ChangeInfo!.Id!.replace('/change/', ''),
      status: response.ChangeInfo!.Status!,
    };
  }

  /**
   * Create DNS validation records for ACM certificate
   */
  async createCertificateValidationRecords(
    credentials: Route53Credentials,
    records: { name: string; type: string; value: string }[],
    hostedZoneId?: string,
  ): Promise<{ changeId: string; status: string }> {
    const client = this.getClient(credentials);
    const zoneId = hostedZoneId || credentials.hostedZoneId;

    if (!zoneId) {
      throw new Error('Hosted zone ID is required');
    }

    const response = await client.send(new ChangeResourceRecordSetsCommand({
      HostedZoneId: zoneId,
      ChangeBatch: {
        Comment: 'ACM certificate DNS validation records',
        Changes: records.map(record => ({
          Action: 'UPSERT',
          ResourceRecordSet: {
            Name: record.name,
            Type: record.type as any,
            TTL: 300,
            ResourceRecords: [{ Value: record.value }],
          },
        })),
      },
    }));

    return {
      changeId: response.ChangeInfo!.Id!.replace('/change/', ''),
      status: response.ChangeInfo!.Status!,
    };
  }

  /**
   * Create a CNAME record for custom domain pointing to CloudFront
   */
  async createCustomDomainRecord(
    credentials: Route53Credentials,
    domain: string,
    cloudfrontDomain: string,
    hostedZoneId: string,
  ): Promise<{ changeId: string; status: string }> {
    const client = this.getClient(credentials);

    const response = await client.send(new ChangeResourceRecordSetsCommand({
      HostedZoneId: hostedZoneId,
      ChangeBatch: {
        Comment: `Point ${domain} to CloudFront distribution`,
        Changes: [
          {
            Action: 'UPSERT',
            ResourceRecordSet: {
              Name: domain,
              Type: 'A',
              AliasTarget: {
                HostedZoneId: 'Z2FDTNDATAQYW2', // CloudFront hosted zone ID
                DNSName: cloudfrontDomain,
                EvaluateTargetHealth: false,
              },
            },
          },
        ],
      },
    }));

    return {
      changeId: response.ChangeInfo!.Id!.replace('/change/', ''),
      status: response.ChangeInfo!.Status!,
    };
  }

  /**
   * Delete a DNS record
   */
  async deleteRecord(
    credentials: Route53Credentials,
    record: DnsRecord,
    hostedZoneId?: string,
  ): Promise<{ changeId: string; status: string }> {
    const client = this.getClient(credentials);
    const zoneId = hostedZoneId || credentials.hostedZoneId;

    if (!zoneId) {
      throw new Error('Hosted zone ID is required');
    }

    const values = Array.isArray(record.value) ? record.value : [record.value];

    const response = await client.send(new ChangeResourceRecordSetsCommand({
      HostedZoneId: zoneId,
      ChangeBatch: {
        Comment: `Delete record ${record.name}`,
        Changes: [
          {
            Action: 'DELETE',
            ResourceRecordSet: {
              Name: record.name,
              Type: record.type,
              TTL: record.ttl || 300,
              ResourceRecords: values.map(v => ({ Value: v })),
            },
          },
        ],
      },
    }));

    return {
      changeId: response.ChangeInfo!.Id!.replace('/change/', ''),
      status: response.ChangeInfo!.Status!,
    };
  }

  /**
   * Delete an alias record (like CloudFront aliases)
   */
  async deleteAliasRecord(
    credentials: Route53Credentials,
    name: string,
    cloudfrontDomain: string,
    hostedZoneId?: string,
  ): Promise<{ changeId: string; status: string }> {
    const client = this.getClient(credentials);
    const zoneId = hostedZoneId || credentials.hostedZoneId;

    if (!zoneId) {
      throw new Error('Hosted zone ID is required');
    }

    const response = await client.send(new ChangeResourceRecordSetsCommand({
      HostedZoneId: zoneId,
      ChangeBatch: {
        Comment: `Delete alias record ${name}`,
        Changes: [
          {
            Action: 'DELETE',
            ResourceRecordSet: {
              Name: name,
              Type: 'A',
              AliasTarget: {
                HostedZoneId: 'Z2FDTNDATAQYW2', // CloudFront hosted zone ID
                DNSName: cloudfrontDomain,
                EvaluateTargetHealth: false,
              },
            },
          },
        ],
      },
    }));

    return {
      changeId: response.ChangeInfo!.Id!.replace('/change/', ''),
      status: response.ChangeInfo!.Status!,
    };
  }

  /**
   * List records in a hosted zone
   */
  async listRecords(
    credentials: Route53Credentials,
    hostedZoneId?: string,
    startRecordName?: string,
  ): Promise<RecordSetResult[]> {
    const client = this.getClient(credentials);
    const zoneId = hostedZoneId || credentials.hostedZoneId;

    if (!zoneId) {
      throw new Error('Hosted zone ID is required');
    }

    const response = await client.send(new ListResourceRecordSetsCommand({
      HostedZoneId: zoneId,
      StartRecordName: startRecordName,
      MaxItems: 100,
    }));

    return (response.ResourceRecordSets || []).map(record => ({
      name: record.Name!,
      type: record.Type!,
      ttl: record.TTL,
      values: record.ResourceRecords?.map(r => r.Value!) ||
        (record.AliasTarget ? [`ALIAS: ${record.AliasTarget.DNSName}`] : []),
    }));
  }

  /**
   * Check if a record exists
   */
  async recordExists(
    credentials: Route53Credentials,
    name: string,
    type: string,
    hostedZoneId?: string,
  ): Promise<boolean> {
    const records = await this.listRecords(credentials, hostedZoneId, name);
    return records.some(r => r.name === name && r.type === type);
  }

  /**
   * Get change status
   */
  async getChangeStatus(
    credentials: Route53Credentials,
    changeId: string,
  ): Promise<string> {
    const client = this.getClient(credentials);

    const response = await client.send(new GetChangeCommand({
      Id: changeId,
    }));

    return response.ChangeInfo!.Status!;
  }

  /**
   * Wait for a change to propagate
   */
  async waitForChange(
    credentials: Route53Credentials,
    changeId: string,
    maxWaitMs: number = 60000,
    intervalMs: number = 5000,
  ): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const status = await this.getChangeStatus(credentials, changeId);
      if (status === 'INSYNC') {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    return false;
  }

  /**
   * Generate subdomain for a landing page
   */
  generateSubdomain(
    slug: string,
    platformDomain: string = 'avnz.io',
  ): string {
    // Clean the slug for DNS
    const cleanSlug = slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    return `${cleanSlug}.${platformDomain}`;
  }

  /**
   * Test connection to Route53
   */
  async testConnection(credentials: Route53Credentials): Promise<{
    success: boolean;
    message: string;
    latencyMs?: number;
  }> {
    const startTime = Date.now();
    const client = this.getClient(credentials);

    try {
      await client.send(new ListHostedZonesCommand({
        MaxItems: 1,
      }));

      return {
        success: true,
        message: 'Successfully connected to AWS Route53',
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
