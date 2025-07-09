import {
    Injectable,
    Logger,
    OnModuleInit,
    OnModuleDestroy,
  } from '@nestjs/common';
  import { ConfigService } from '@nestjs/config';
  import * as amqp from 'amqplib';
  
  @Injectable()
  export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
    private connection: amqp.Connection;
    public channel: amqp.Channel;
    private readonly logger = new Logger(RabbitMQService.name);
  
    constructor(private readonly configService: ConfigService) {}
  
    async onModuleInit() {
      const url = this.configService.get<string>('rabbitmq.url');
      const defaultQueue = this.configService.get<string>('rabbitmq.queue');
  
      try {
        this.connection = await amqp.connect(url);
        this.channel = await this.connection.createChannel();
  
        // Dead-letter exchange and queue
        await this.channel.assertExchange('wallet_funding_dead_exchange', 'direct', { durable: true });
        await this.channel.assertQueue('wallet_funding_dead', { durable: true });
        await this.channel.bindQueue('wallet_funding_dead', 'wallet_funding_dead_exchange', 'dead');
  
        // Default queue with dead-letter config
        if (defaultQueue) {
          await this.channel.assertQueue(defaultQueue, {
            durable: true,
            arguments: {
              'x-dead-letter-exchange': 'wallet_funding_dead_exchange',
              'x-dead-letter-routing-key': 'dead',
            },
          });
          this.logger.log(`✅ Asserted default queue: ${defaultQueue}`);
        }
  
        this.logger.log(`✅ Connected to RabbitMQ at ${url}`);
      } catch (err) {
        this.logger.error('❌ RabbitMQ connection error', err);
      }
    }
  
    async onModuleDestroy() {
      try {
        await this.channel?.close();
        await this.connection?.close();
        this.logger.log('❌ RabbitMQ disconnected');
      } catch (err) {
        this.logger.error('❌ Error closing RabbitMQ connection', err);
      }
    }
  
    /**
     * Publishes a message to the given queue (ensures queue exists)
     */
    async sendToQueue(queue: string, data: any, headers: any = {}) {
      try {
        await this.channel.assertQueue(queue, { durable: true });
        const buffer = Buffer.from(JSON.stringify(data));
        this.channel.sendToQueue(queue, buffer, {
          persistent: true,
          headers,
        });
        this.logger.log(`📤 Sent message to queue: ${queue}`);
      } catch (err) {
        this.logger.error(`❌ Failed to send message to queue "${queue}"`, err);
      }
    }
  
    /**
     * Starts consuming messages from the given queue (ensures queue exists)
     */
    async consume(queue: string, handler: (data: any, rawMsg: amqp.ConsumeMessage) => Promise<void>) {
      await this.channel.assertQueue(queue, { durable: true });
  
      this.channel.consume(queue, async (msg) => {
        if (msg) {
          const data = JSON.parse(msg.content.toString());
          const headers = msg.properties.headers || {};
          const attempts = headers['x-attempts'] || 0;
  
          try {
            console.log(`📥 Consumed message from queue: ${queue}`);
            await handler(data, msg); // pass msg so handler can ACK or requeue
  
          } catch (err) {
            console.error(`❌ Error processing message on queue "${queue}":`, err.message);
  
            if (attempts >= 2) {
              console.error('💀 Max retries reached. Sending to dead-letter queue');
              await this.sendToQueue('wallet_funding_dead', data, {
                'x-attempts': attempts + 1,
              });
              this.channel.ack(msg); // prevent loop
            } else {
              // Retry
              console.warn(`🔁 Retrying... Attempt #${attempts + 1}`);
              await this.sendToQueue(queue, data, {
                'x-attempts': attempts + 1,
              });
              this.channel.ack(msg); // ack current so retry happens on next
            }
          }
        }
      })
    }
  }
  