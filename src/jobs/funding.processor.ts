import { Injectable, OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class WalletFundingProcessor implements OnModuleInit {
    constructor(
        private readonly rabbit: RabbitMQService,
        private readonly prisma: PrismaService,
        private readonly redisService: RedisService,
    ) { }

    async onModuleInit() {
        console.log('👷 WalletFundingProcessor is listening for jobs on "wallet_funding"...');

        await this.rabbit.consume('wallet_funding', async (data) => {
            console.log('📥 Received wallet funding job:', data);
            const { userId, walletId, currency, amount, txId } = data;
            const cacheKey = `wallet_request:${txId}`;

            try {
                // 1. Redis idempotency check
                const cached = await this.redisService.get(cacheKey);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    if (parsed.status === 'success' || parsed.status === 'failed') {
                        console.log(`⛔ txId ${txId} already processed (${parsed.status}). Skipping...`);
                        return;
                    }
                    await this.redisService.del(cacheKey);
                }

                // 2. Pre-log txId as pending
                try {
                    await this.prisma.walletRequest.create({
                        data: {
                            userId,
                            currency,
                            txId,
                            status: 'pending',
                        },
                    });
                } catch (err) {
                    if (err.code === 'P2002') {
                        console.log(`⛔ txId ${txId} already exists. Skipping...`);
                        return;
                    }
                    throw err;
                }

                // 3. Validate wallet
                const wallet = await this.prisma.wallet.findUnique({ where: { id: walletId } });
                if (!wallet || wallet.userId !== userId || wallet.currency !== currency || wallet.deletedAt) {
                    throw new Error('❌ Wallet not valid or does not belong to user');
                }

                // 4. Calculate 0.5% fee and net amount
                const fee = parseFloat((amount * 0.005).toFixed(2));
                const netAmount = amount - fee;

                // 5. Fund wallet and create transaction
                let newTransaction;
                await this.prisma.$transaction(async (tx) => {
                    const currentWallet = await tx.wallet.findUnique({ where: { id: walletId } });

                    if (!currentWallet) throw new Error('Wallet not found during processing.');

                    await tx.wallet.update({
                        where: {
                            id: walletId,
                            version: currentWallet.version,
                        },
                        data: {
                            balance: { increment: netAmount },
                            version: currentWallet.version + 1,
                        },
                    });

                    await tx.walletRequest.update({
                        where: { txId },
                        data: { status: 'success' },
                    });

                    newTransaction = await tx.transaction.create({
                        data: {
                            userId,
                            walletId,
                            type: 'DEPOSIT',
                            amount: netAmount,
                            fee,
                            status: 'success',
                            reference: txId,
                        },
                    });
                });

                // 6. Cache success
                await this.redisService.set(cacheKey, JSON.stringify({ status: 'success' }), 300);

                // 7. Append transaction to Redis cache
                const txCacheKey = `user:transactions:${userId}`;
                const cachedTx = await this.redisService.get(txCacheKey);
                if (cachedTx) {
                    const transactions = JSON.parse(cachedTx);
                    transactions.unshift(newTransaction); // Add to beginning
                    await this.redisService.set(txCacheKey, JSON.stringify(transactions), 300);
                }

                // 8. Notify user
                await this.rabbit.sendToQueue('notifications', {
                    userId,
                    title: 'Wallet Funded',
                    body: `Your ${currency} wallet has been funded with ₦${netAmount.toLocaleString()} (₦${fee.toLocaleString()} fee applied).`,
                    type: 'wallet',
                });

                console.log(`✅ Wallet funded successfully for user ${userId}`);
            } catch (error) {
                await this.prisma.walletRequest.updateMany({
                    where: { txId },
                    data: { status: 'failed' },
                });

                await this.redisService.set(cacheKey, JSON.stringify({ status: 'failed' }), 300);

                console.error('❌ Wallet funding failed:', error);
                throw error;
            }
        });
    }
}
