import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class TransactionsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly redisService: RedisService,
    ) {}

    async getTransactionsForUser(userId: number, page = 1) {
        const limit = 10;
        const skip = (page - 1) * limit;

        const [transactions, total] = await this.prisma.$transaction([
            this.prisma.transaction.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.transaction.count({ where: { userId } }),
        ]);

        return {
            items: transactions,
            total,
            page,
            pageSize: limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async getUserNotifications(userId: number, page = 1) {
        const limit = 10;
        const skip = (page - 1) * limit;

        const [notifications, total] = await this.prisma.$transaction([
            this.prisma.notification.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.notification.count({ where: { userId } }),
        ]);

        return {
            items: notifications,
            total,
            page,
            pageSize: limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async getUserLoginLogs(userId: number, page = 1) {
        const limit = 10;
        const skip = (page - 1) * limit;

        const [logs, total] = await this.prisma.$transaction([
            this.prisma.loginLog.findMany({
                where: { userId },
                orderBy: { loggedInAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.loginLog.count({ where: { userId } }),
        ]);

        return {
            items: logs,
            total,
            page,
            pageSize: limit,
            totalPages: Math.ceil(total / limit),
        };
    }
}
