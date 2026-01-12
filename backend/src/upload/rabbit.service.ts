import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';

@Injectable()
export class RabbitService implements OnModuleInit {
  private readonly logger = new Logger(RabbitService.name);

  private channel?: amqp.Channel;
  private queue = 'file-uploads';

  private connecting?: Promise<void>;

  constructor(private config: ConfigService) {}

  async onModuleInit() {
    this.queue = this.config.get<string>('RABBITMQ_QUEUE') || 'file-uploads';
    try {
      await this.ensureConnected();
      this.logger.log(`Rabbit ready. queue=${this.queue}`);
    } catch (e) {
      this.logger.warn(`Rabbit not ready on boot. Will retry on publish.`);
    }
  }

  private async ensureConnected() {
    if (this.channel) return;
    if (this.connecting) return this.connecting;

    const url =
      this.config.get<string>('RABBITMQ_URL') ||
      'amqp://guest:guest@rabbitmq:5672';

    this.connecting = (async () => {
      const conn = await amqp.connect(url);
      this.channel = await conn.createChannel();
      await this.channel.assertQueue(this.queue, { durable: true });

      conn.on('close', () => {
        this.logger.warn('Rabbit connection closed. Will reconnect on next publish.');
        this.channel = undefined;
      });
      conn.on('error', (err) => {
        this.logger.warn(`Rabbit connection error: ${String(err)}`);
        this.channel = undefined;
      });
    })().finally(() => {
      this.connecting = undefined;
    });

    return this.connecting;
  }

  async publish(payload: any) {
    try {
      await this.ensureConnected();
      if (!this.channel) throw new Error('Rabbit channel not available');

      const body = Buffer.from(JSON.stringify(payload));
      this.channel.sendToQueue(this.queue, body, { persistent: true });

      this.logger.log(`Message published to queue=${this.queue}`);
    } catch (e) {
      this.logger.error(`Publish failed: ${String(e)}`);
      throw e;
    }
  }
}
