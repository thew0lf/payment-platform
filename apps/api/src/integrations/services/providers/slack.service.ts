import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface SlackCredentials {
  botToken: string;  // xoxb-... token
  signingSecret?: string;
  appId?: string;
}

export interface SlackTestResult {
  success: boolean;
  message: string;
}

@Injectable()
export class SlackService {
  private readonly logger = new Logger(SlackService.name);

  async testConnection(credentials: SlackCredentials): Promise<SlackTestResult> {
    try {
      if (!credentials.botToken) {
        return { success: false, message: 'Bot Token is required' };
      }

      // Test auth to validate the bot token
      const response = await axios.post(
        'https://slack.com/api/auth.test',
        {},
        {
          headers: {
            Authorization: `Bearer ${credentials.botToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        },
      );

      if (!response.data.ok) {
        return { success: false, message: `Slack error: ${response.data.error}` };
      }

      const { team, user, bot_id } = response.data;

      this.logger.log(`Slack connection test successful. Team: ${team}, Bot: ${bot_id}`);

      return {
        success: true,
        message: `Connected to Slack workspace: ${team} (bot: ${user || bot_id})`,
      };
    } catch (error: any) {
      const message = error.response?.data?.error || error.message || 'Unknown error';
      this.logger.error(`Slack connection test failed: ${message}`);

      if (message === 'invalid_auth') {
        return { success: false, message: 'Invalid bot token' };
      }
      if (message === 'token_revoked') {
        return { success: false, message: 'Bot token has been revoked' };
      }

      return { success: false, message: `Connection failed: ${message}` };
    }
  }
}
