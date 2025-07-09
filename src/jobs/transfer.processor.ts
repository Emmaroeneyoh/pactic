import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';

@Injectable()
export class WalletTransferProcessor implements OnModuleInit {
    constructor(
        private readonly prisma: PrismaService,
        private readonly redisService: RedisService,
        private readonly rabbit: RabbitMQService,
    ) { }

    async onModuleInit() {
        console.log('👷 WalletTransferProcessor is listening on "wallet_transfer"...');

        await this.rabbit.consume('wallet_transfer', async (data) => {
            console.log('📥 Received transfer job:', data);

            const {
                senderId,
                senderWalletId,
                recipientId,
                recipientWalletId,
                amount,
                currency,
                txId,
            } = data;

            const cacheKey = `wallet_request:${txId}`;

            try {
                // 1. Idempotency check
                const cached = await this.redisService.get(cacheKey);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    if (parsed.status === 'success' || parsed.status === 'failed') {
                        console.log(`⛔ txId ${txId} already processed. Skipping...`);
                        return;
                    }
                    await this.redisService.del(cacheKey);
                }

                // 2. Pre-log walletRequest
                try {
                    await this.prisma.walletRequest.create({
                        data: {
                            userId: senderId,
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

                // 3. Transaction
                await this.prisma.$transaction(async (tx) => {
                    const senderWallet = await tx.wallet.findUnique({ where: { id: senderWalletId } });
                    const recipientWallet = await tx.wallet.findUnique({ where: { id: recipientWalletId } });

                    if (
                        !senderWallet ||
                        senderWallet.userId !== senderId ||
                        senderWallet.currency !== currency ||
                        senderWallet.deletedAt
                    ) {
                        throw new Error('Invalid sender wallet');
                    }

                    if (
                        !recipientWallet ||
                        recipientWallet.userId !== recipientId ||
                        recipientWallet.currency !== currency ||
                        recipientWallet.deletedAt
                    ) {
                        throw new Error('Invalid recipient wallet');
                    }

                    if (senderWallet.balance.toNumber() < amount) {
                        throw new Error('Insufficient funds');
                    }

                    // 4. Perform transfer
                    await tx.wallet.update({
                        where: {
                            id: senderWalletId,
                            version: senderWallet.version,
                        },
                        data: {
                            balance: { decrement: amount },
                            version: senderWallet.version + 1,
                        },
                    });

                    await tx.wallet.update({
                        where: {
                            id: recipientWalletId,
                            version: recipientWallet.version,
                        },
                        data: {
                            balance: { increment: amount },
                            version: recipientWallet.version + 1,
                        },
                    });

                    // 5. Log transactions
                    await tx.transaction.createMany({
                        data: [
                            {
                                userId: senderId,
                                walletId: senderWalletId,
                                type: 'TRANSFER',
                                amount,
                                status: 'success',
                                reference: `${txId}-sender`,
                                metadata: { to: recipientWalletId },
                            },
                            {
                                userId: recipientId,
                                walletId: recipientWalletId,
                                type: 'DEPOSIT',
                                amount,
                                status: 'success',
                                reference: `${txId}-recipient`,
                                metadata: { from: senderWalletId },
                            },
                        ],
                    });

                    // 6. Mark request as success
                    await tx.walletRequest.update({
                        where: { txId },
                        data: { status: 'success' },
                    });
                });

                // 7. Cache success
                await this.redisService.set(cacheKey, JSON.stringify({ status: 'success' }), 300);

                // 8. Fetch and cache new transactions individually
                const [senderTx, recipientTx] = await Promise.all([
                    this.prisma.transaction.findFirst({
                        where: { reference: `${txId}-sender` },
                    }),
                    this.prisma.transaction.findFirst({
                        where: { reference: `${txId}-recipient` },
                    }),
                ]);

                // 9. Append to Redis cache for sender
                const senderTxKey = `user:transactions:${senderId}`;
                const cachedSenderTx = await this.redisService.get(senderTxKey);
                if (cachedSenderTx) {
                    const parsed = JSON.parse(cachedSenderTx);
                    parsed.unshift(senderTx);
                    await this.redisService.set(senderTxKey, JSON.stringify(parsed), 300);
                }

                // 10. Append to Redis cache for recipient
                const recipientTxKey = `user:transactions:${recipientId}`;
                const cachedRecipientTx = await this.redisService.get(recipientTxKey);
                if (cachedRecipientTx) {
                    const parsed = JSON.parse(cachedRecipientTx);
                    parsed.unshift(recipientTx);
                    await this.redisService.set(recipientTxKey, JSON.stringify(parsed), 300);
                }

                // 11. Invalidate wallet cache
                const senderWalletKey = `user_wallets:${senderId}`;
                const recipientWalletKey = `user_wallets:${recipientId}`;
                await Promise.all([
                    this.redisService.del(senderWalletKey),
                    this.redisService.del(recipientWalletKey),
                ]);

                // 12. Notify both users
                await Promise.all([
                    this.rabbit.sendToQueue('notifications', {
                        userId: senderId,
                        title: 'Transfer Successful',
                        body: `₦${amount.toLocaleString()} was sent to user ${recipientId}`,
                        type: 'wallet',
                    }),
                    this.rabbit.sendToQueue('notifications', {
                        userId: recipientId,
                        title: 'Wallet Credited',
                        body: `₦${amount.toLocaleString()} was received from user ${senderId}`,
                        type: 'wallet',
                    }),
                ]);

                console.log(`✅ Wallet transfer completed: ${txId}`);
            } catch (error) {
                // 13. Mark failed and cache error
                await this.prisma.walletRequest.updateMany({
                    where: { txId },
                    data: { status: 'failed' },
                });

                await this.redisService.set(cacheKey, JSON.stringify({ status: 'failed' }), 300);
                console.error('❌ Transfer failed:', error);
                throw error;
            }
        });
    }
}
