import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';

@Injectable()
export class RabbitService implements OnModuleInit {
  private channel!: amqp.Channel;
  private queue!: string;

  constructor(private config: ConfigService) {}

  async onModuleInit() {
    const url = this.config.get<string>('RABBITMQ_URL') || 'amqp://localhost';
    this.queue = this.config.get<string>('RABBITMQ_QUEUE') || 'file-uploads';

    const conn = await amqp.connect(url);
    this.channel = await conn.createChannel();
    await this.channel.assertQueue(this.queue, { durable: true });
  }

  async publish(payload: any) {
    const body = Buffer.from(JSON.stringify(payload));
    this.channel.sendToQueue(this.queue, body, { persistent: true });
  }
}
