import {
    BadRequestException,
    ConflictException,
    Injectable,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { RedisService } from '../redis/redis.service';
import { WithdrawWalletDto } from './dto/withdraw-wallet.dto';
import { TransferWalletDto } from './dto/transfer-wallet.dto';
import { Decimal } from '@prisma/client/runtime/library';


@Injectable()
export class WalletsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly rabbit: RabbitMQService,
        private readonly redisService: RedisService,
    ) { }

    async createWallet(userId: number, currency: string, txId: string) {
        const cacheKey = `wallet_request:${txId}`;
        const cachedRequest = await this.redisService.get(cacheKey);
        if (cachedRequest) {
            const parsed = JSON.parse(cachedRequest);
            if (parsed.status === 'success') {
                throw new ConflictException('Duplicate wallet creation request (cached)');
            }
        }
        const existingRequest = await this.prisma.walletRequest.findUnique({
            where: { txId },
        });

        if (existingRequest && existingRequest.status === 'success') {
            await this.redisService.set(cacheKey, JSON.stringify(existingRequest), 300);
            throw new ConflictException('Duplicate wallet creation request');
        }

        // 3. Check if wallet of the same currency already exists
        const existingWallet = await this.prisma.wallet.findFirst({
            where: {
                userId,
                currency,
                deletedAt: null,
            },
        });

        if (existingWallet) {
            throw new ConflictException(`You already have a ${currency} wallet`);
        }

        // 4. Create wallet
        const wallet = await this.prisma.wallet.create({
            data: {
                userId,
                currency,
                balance: 0,
            },
        });

        // 5. Log wallet request
        const walletRequest = await this.prisma.walletRequest.create({
            data: {
                userId,
                currency,
                txId,
                status: 'success',
            },
        });

        // 6. Cache the wallet request
        await this.redisService.set(cacheKey, JSON.stringify(walletRequest), 300);

        // 7. Notify via RabbitMQ
        await this.rabbit.sendToQueue('notifications', {
            userId,
            title: 'Wallet Created',
            body: `Your ${currency} wallet has been created.`,
            type: 'wallet',
        });
        // ✅ 8. Update user_wallets cache
        const walletCacheKey = `user_wallets:${userId}`;
        const existingWallets = await this.redisService.get(walletCacheKey);

        if (existingWallets) {
            const parsed = JSON.parse(existingWallets);
            parsed.unshift(wallet); // Add new wallet at the top
            await this.redisService.set(walletCacheKey, JSON.stringify(parsed), 300);
        }

        return wallet;

    }
    async fundWallet(
        userId: number,
        walletId: number,
        currency: string,
        amount: number,
        txId: string,
    ) {
        const cacheKey = `wallet_request:${txId}`;

        // Check Redis for existing txId (ignore status)
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return {
                status_code: 409,
                status: 'duplicate',
                message: 'This transaction ID has already been used.',
                data: JSON.parse(cached),
            };
        }

        // Check DB for existing txId (ignore status)
        const existing = await this.prisma.walletRequest.findUnique({
            where: { txId },
        });

        if (existing) {
            await this.redisService.set(cacheKey, JSON.stringify(existing), 300); // cache for next time
            return {
                status_code: 409,
                status: 'duplicate',
                message: 'This transaction ID has already been used.',
                data: existing,
            };
        }

        // Proceed to queue job
        console.log('📤 Sending job to wallet_funding:', {
            userId,
            walletId,
            currency,
            amount,
            txId,
        });

        await this.rabbit.sendToQueue('wallet_funding', {
            userId,
            walletId,
            currency,
            amount,
            txId,
        });

        return {
            status_code: 202,
            status: 'queued',
            message: 'Wallet funding has been queued and is being processed.',
            data: {
                userId,
                walletId,
                currency,
                amount,
                txId,
            },
        };
    }




    async getUserWallets(userId: number) {
        const cacheKey = `user_wallets:${userId}`;

        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
        const wallets = await this.prisma.wallet.findMany({
            where: {
                userId,
                deletedAt: null,
            },
            orderBy: { createdAt: 'desc' },
        });
        await this.redisService.set(cacheKey, JSON.stringify(wallets), 300);
        return wallets;
    }

    async withdrawFromWallet(body: WithdrawWalletDto) {
        const { userId, walletId, amount, currency, txId } = body;
        const cacheKey = `wallet_request:${txId}`;
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            console.log("tranx id is cached") 
          const parsed = JSON.parse(cached);
          if (parsed.status === 'success' || parsed.status === 'failed') {
            throw new ConflictException('This transaction ID has already been used');
          }
        }
        const existing = await this.prisma.walletRequest.findUnique({
          where: { txId },
        });
        if (existing) {
          await this.redisService.set(cacheKey, JSON.stringify(existing), 300);
          throw new ConflictException('This transaction ID has already been used');
        }
        await this.rabbit.sendToQueue('wallet_withdrawal', {
          userId,
          walletId,
          currency,
          amount,
          txId,
        });
      
        return {
          status_code: 202,
          status: 'queued',
          message: 'Wallet withdrawal has been queued and is being processed.',
          data: {
            userId,
            walletId,
            currency,
            amount,
            txId,
          },
        };
      }
    async transferFunds(body: TransferWalletDto) {
        const {
            senderId,
            senderWalletId,
            recipientId,
            recipientWalletId,
            amount,
            currency,
            txId,
        } = body;

        const cacheKey = `wallet_request:${txId}`;
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed.status === 'success' || parsed.status === 'failed') {
                throw new ConflictException('Duplicate transfer request');
            }
        }
        const existing = await this.prisma.walletRequest.findUnique({ where: { txId } });
        if (existing) {
            await this.redisService.set(cacheKey, JSON.stringify(existing), 300);
            throw new ConflictException('Duplicate transfer request');
        }
        await this.rabbit.sendToQueue('wallet_transfer', {
            senderId,
            senderWalletId,
            recipientId,
            recipientWalletId,
            amount,
            currency,
            txId,
        });

        return {
            status_code: 202,
            status: 'queued',
            message: 'Wallet transfer has been queued and is being processed.',
            data: {
                senderId,
                senderWalletId,
                recipientId,
                recipientWalletId,
                amount,
                currency,
                txId,
            },
        };
    }

}
