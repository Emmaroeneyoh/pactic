import { Injectable, OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class NotificationProcessor implements OnModuleInit {
  constructor(
    private readonly rabbit: RabbitMQService,
    private readonly prisma: PrismaService,
  ) { }

  async onModuleInit() {
    await this.rabbit.consume('notifications', async (data) => {
      const { userId, title, body, type } = data;

      if (!userId || !title || !body || !type) {
        console.error('❌ Invalid notification payload:', data);
        return;
      }

      try {
        await this.prisma.notification.create({
          data: {
            userId,
            title,
            body,
            type,
          },
        });

        console.log(`📨 Notification saved for user ${userId}: ${title}`);
      } catch (error) {
        console.error('❌ Failed to save notification:', error.message);
      }
    });
  }
}
