import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PushSendOptions {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  imageUrl?: string;
  badge?: number;
  sound?: string;
  clickAction?: string;
}

export interface PushSendResult {
  successCount: number;
  failureCount: number;
  responses: Array<{
    token: string;
    success: boolean;
    messageId?: string;
    error?: string;
  }>;
}

@Injectable()
export class PushProvider {
  private readonly logger = new Logger(PushProvider.name);
  private readonly firebaseProjectId: string;

  constructor(private readonly config: ConfigService) {
    this.firebaseProjectId = this.config.get('FIREBASE_PROJECT_ID', '');
  }

  async send(options: PushSendOptions): Promise<string> {
    this.logger.log(
      `Sending push notification to ${options.tokens.length} device(s)`,
    );

    if (options.tokens.length === 0) {
      throw new Error('No device tokens provided');
    }

    try {
      // Simulate API call delay
      await this.simulateApiCall();

      // Generate a mock message ID
      const messageId = `fcm-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      this.logger.log(`Push notification sent successfully. MessageId: ${messageId}`);

      // In production:
      // const message = {
      //   notification: {
      //     title: options.title,
      //     body: options.body,
      //     image: options.imageUrl,
      //   },
      //   data: options.data,
      //   android: {
      //     notification: {
      //       clickAction: options.clickAction,
      //       sound: options.sound || 'default',
      //     },
      //   },
      //   apns: {
      //     payload: {
      //       aps: {
      //         badge: options.badge,
      //         sound: options.sound || 'default',
      //       },
      //     },
      //   },
      //   tokens: options.tokens,
      // };
      //
      // const response = await admin.messaging().sendEachForMulticast(message);
      // return response.responses[0]?.messageId || '';

      return messageId;
    } catch (error) {
      this.logger.error('Failed to send push notification', error);
      throw error;
    }
  }

  async sendToTopic(
    topic: string,
    options: Omit<PushSendOptions, 'tokens'>,
  ): Promise<string> {
    this.logger.log(`Sending push notification to topic: ${topic}`);

    try {
      await this.simulateApiCall();

      const messageId = `fcm-topic-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      this.logger.log(
        `Push notification sent to topic ${topic}. MessageId: ${messageId}`,
      );

      return messageId;
    } catch (error) {
      this.logger.error(`Failed to send push to topic ${topic}`, error);
      throw error;
    }
  }

  async sendBatch(
    messages: PushSendOptions[],
  ): Promise<PushSendResult> {
    this.logger.log(`Sending batch of ${messages.length} push notifications`);

    let successCount = 0;
    let failureCount = 0;
    const responses: PushSendResult['responses'] = [];

    for (const message of messages) {
      for (const token of message.tokens) {
        try {
          const messageId = await this.send({ ...message, tokens: [token] });
          successCount++;
          responses.push({ token, success: true, messageId });
        } catch (error) {
          failureCount++;
          responses.push({
            token,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    return { successCount, failureCount, responses };
  }

  async subscribeToTopic(tokens: string[], topic: string): Promise<void> {
    this.logger.log(
      `Subscribing ${tokens.length} token(s) to topic: ${topic}`,
    );

    // In production:
    // await admin.messaging().subscribeToTopic(tokens, topic);
  }

  async unsubscribeFromTopic(tokens: string[], topic: string): Promise<void> {
    this.logger.log(
      `Unsubscribing ${tokens.length} token(s) from topic: ${topic}`,
    );

    // In production:
    // await admin.messaging().unsubscribeFromTopic(tokens, topic);
  }

  async validateToken(token: string): Promise<boolean> {
    // In production, attempt to send a dry-run message to validate the token
    // For now, just do basic validation
    return token.length > 0 && token.length < 200;
  }

  private async simulateApiCall(): Promise<void> {
    // Simulate network latency
    return new Promise((resolve) => setTimeout(resolve, 75));
  }
}
