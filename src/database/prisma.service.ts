// ../database/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);

    async onModuleInit() {
        await this.$connect();
        this.logger.log('✅ Connected to MySQL database via Prisma');
    }

    async onModuleDestroy() {
        await this.$disconnect();
        this.logger.log('❌ Disconnected from database');
    }
}
