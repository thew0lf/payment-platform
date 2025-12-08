import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface VercelCredentials {
  apiToken: string;
  teamId?: string;
}

export interface VercelTestResult {
  success: boolean;
  message: string;
}

export interface VercelProject {
  id: string;
  name: string;
  framework?: string;
  createdAt: number;
}

export interface VercelDeployment {
  uid: string;
  name: string;
  url: string;
  state: string;
  createdAt: number;
}

@Injectable()
export class VercelService {
  private readonly logger = new Logger(VercelService.name);
  private readonly baseUrl = 'https://api.vercel.com';

  async testConnection(credentials: VercelCredentials): Promise<VercelTestResult> {
    try {
      if (!credentials.apiToken) {
        return { success: false, message: 'API Token is required' };
      }

      // Get user info to validate the token
      const response = await axios.get(`${this.baseUrl}/v2/user`, {
        headers: {
          Authorization: `Bearer ${credentials.apiToken}`,
        },
        timeout: 10000,
      });

      const user = response.data.user;
      const username = user?.username || user?.email || 'Unknown';

      this.logger.log(`Vercel connection test successful. User: ${username}`);

      return {
        success: true,
        message: `Connected to Vercel as ${username}`,
      };
    } catch (error: any) {
      const message = error.response?.data?.error?.message || error.message || 'Unknown error';
      this.logger.error(`Vercel connection test failed: ${message}`);

      if (error.response?.status === 401) {
        return { success: false, message: 'Invalid API token' };
      }
      if (error.response?.status === 403) {
        return { success: false, message: 'Token lacks required permissions' };
      }

      return { success: false, message: `Connection failed: ${message}` };
    }
  }

  async listProjects(credentials: VercelCredentials): Promise<VercelProject[]> {
    const params = credentials.teamId ? { teamId: credentials.teamId } : {};

    const response = await axios.get(`${this.baseUrl}/v9/projects`, {
      headers: {
        Authorization: `Bearer ${credentials.apiToken}`,
      },
      params,
      timeout: 10000,
    });

    return response.data.projects || [];
  }

  async listDeployments(credentials: VercelCredentials, projectId?: string): Promise<VercelDeployment[]> {
    const params: Record<string, string> = {};
    if (credentials.teamId) params.teamId = credentials.teamId;
    if (projectId) params.projectId = projectId;

    const response = await axios.get(`${this.baseUrl}/v6/deployments`, {
      headers: {
        Authorization: `Bearer ${credentials.apiToken}`,
      },
      params,
      timeout: 10000,
    });

    return response.data.deployments || [];
  }

  async getDeployment(credentials: VercelCredentials, deploymentId: string): Promise<VercelDeployment | null> {
    try {
      const params = credentials.teamId ? { teamId: credentials.teamId } : {};

      const response = await axios.get(`${this.baseUrl}/v13/deployments/${deploymentId}`, {
        headers: {
          Authorization: `Bearer ${credentials.apiToken}`,
        },
        params,
        timeout: 10000,
      });

      return response.data;
    } catch {
      return null;
    }
  }

  async createDeployment(
    credentials: VercelCredentials,
    projectName: string,
    files: Array<{ file: string; data: string }>,
  ): Promise<VercelDeployment> {
    const params = credentials.teamId ? { teamId: credentials.teamId } : {};

    const response = await axios.post(
      `${this.baseUrl}/v13/deployments`,
      {
        name: projectName,
        files,
      },
      {
        headers: {
          Authorization: `Bearer ${credentials.apiToken}`,
          'Content-Type': 'application/json',
        },
        params,
        timeout: 30000,
      },
    );

    return response.data;
  }

  async listDomains(credentials: VercelCredentials): Promise<Array<{ name: string; verified: boolean }>> {
    const params = credentials.teamId ? { teamId: credentials.teamId } : {};

    const response = await axios.get(`${this.baseUrl}/v5/domains`, {
      headers: {
        Authorization: `Bearer ${credentials.apiToken}`,
      },
      params,
      timeout: 10000,
    });

    return response.data.domains || [];
  }
}
