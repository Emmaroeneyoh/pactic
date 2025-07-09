// ../jobs/login.processor.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class LoginProcessor implements OnModuleInit {
    constructor(
        private readonly rabbit: RabbitMQService,
        private readonly prisma: PrismaService,
    ) { }

    async onModuleInit() {
        await this.rabbit.consume('login_logs', async (log) => {
            const {
                userId,
                email,
                ipAddress,
                userAgent,
                location,
                success,
            } = log;

            const data: any = {
                ipAddress: ipAddress || '',
                userAgent: userAgent || '',
                location: location || '',
            };

            if (typeof userId === 'number' && !isNaN(userId)) {
                data.userId = userId;
            }

            await this.prisma.loginLog.create({ data });

            console.log(
                `🪵 Login attempt: ${success ? '✅ Success' : '❌ Failed'} - ${email}`
            );
        });
    }
}
