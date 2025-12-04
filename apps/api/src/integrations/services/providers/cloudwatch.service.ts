import { Injectable, Logger } from '@nestjs/common';
import {
  CloudWatchClient,
  ListMetricsCommand,
  DescribeAlarmsCommand,
} from '@aws-sdk/client-cloudwatch';
import {
  CloudWatchLogsClient,
  DescribeLogGroupsCommand,
} from '@aws-sdk/client-cloudwatch-logs';

export interface CloudWatchCredentials {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

@Injectable()
export class CloudWatchService {
  private readonly logger = new Logger(CloudWatchService.name);
  private metricsClientCache = new Map<string, CloudWatchClient>();
  private logsClientCache = new Map<string, CloudWatchLogsClient>();

  private getMetricsClient(credentials: CloudWatchCredentials): CloudWatchClient {
    const cacheKey = `${credentials.accessKeyId}-${credentials.region}`;

    if (!this.metricsClientCache.has(cacheKey)) {
      const client = new CloudWatchClient({
        region: credentials.region,
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
        },
      });
      this.metricsClientCache.set(cacheKey, client);
    }

    return this.metricsClientCache.get(cacheKey)!;
  }

  private getLogsClient(credentials: CloudWatchCredentials): CloudWatchLogsClient {
    const cacheKey = `${credentials.accessKeyId}-${credentials.region}`;

    if (!this.logsClientCache.has(cacheKey)) {
      const client = new CloudWatchLogsClient({
        region: credentials.region,
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
        },
      });
      this.logsClientCache.set(cacheKey, client);
    }

    return this.logsClientCache.get(cacheKey)!;
  }

  /**
   * List available metrics
   */
  async listMetrics(
    credentials: CloudWatchCredentials,
    namespace?: string,
  ): Promise<{ name: string; namespace: string }[]> {
    const client = this.getMetricsClient(credentials);

    const response = await client.send(new ListMetricsCommand({
      Namespace: namespace,
      RecentlyActive: 'PT3H',
    }));

    return (response.Metrics || []).map(m => ({
      name: m.MetricName || '',
      namespace: m.Namespace || '',
    }));
  }

  /**
   * List alarms
   */
  async listAlarms(
    credentials: CloudWatchCredentials,
  ): Promise<{ name: string; state: string; metric: string }[]> {
    const client = this.getMetricsClient(credentials);

    const response = await client.send(new DescribeAlarmsCommand({
      MaxRecords: 100,
    }));

    return (response.MetricAlarms || []).map(a => ({
      name: a.AlarmName || '',
      state: a.StateValue || '',
      metric: a.MetricName || '',
    }));
  }

  /**
   * List log groups
   */
  async listLogGroups(
    credentials: CloudWatchCredentials,
    prefix?: string,
  ): Promise<{ name: string; storedBytes: number }[]> {
    const client = this.getLogsClient(credentials);

    const response = await client.send(new DescribeLogGroupsCommand({
      logGroupNamePrefix: prefix,
      limit: 50,
    }));

    return (response.logGroups || []).map(g => ({
      name: g.logGroupName || '',
      storedBytes: g.storedBytes || 0,
    }));
  }

  /**
   * Test connection to CloudWatch
   */
  async testConnection(credentials: CloudWatchCredentials): Promise<{
    success: boolean;
    message: string;
    latencyMs?: number;
  }> {
    const startTime = Date.now();
    const client = this.getMetricsClient(credentials);

    try {
      // Try to list metrics as a connection test
      await client.send(new ListMetricsCommand({
        RecentlyActive: 'PT3H',
      }));

      return {
        success: true,
        message: 'Successfully connected to AWS CloudWatch',
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
