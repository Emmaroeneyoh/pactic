// wallet.withdrawal.processor.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';

@Injectable()
export class WalletWithdrawalProcessor implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly rabbit: RabbitMQService,
  ) {}

  async onModuleInit() {
      await this.rabbit.consume('wallet_withdrawal', async (data) => {
        console.log("withdrawing money")
      const { userId, walletId, currency, amount, txId } = data;
      const cacheKey = `wallet_request:${txId}`;

      try {
        // Idempotency
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.status === 'success' || parsed.status === 'failed') return;
          await this.redis.del(cacheKey);
        }

        // Pre-log
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
          if (err.code === 'P2002') return;
          throw err;
        }

        // Withdraw logic
        let transaction;
        await this.prisma.$transaction(async (tx) => {
          const wallet = await tx.wallet.findUnique({ where: { id: walletId } });
          if (!wallet || wallet.userId !== userId || wallet.currency !== currency || wallet.deletedAt) {
            throw new Error('Invalid wallet');
          }

          if (wallet.balance.toNumber() < amount) {
            throw new Error('Insufficient funds');
          }

          await tx.wallet.update({
            where: {
              id: walletId,
              version: wallet.version,
            },
            data: {
              balance: { decrement: amount },
              version: wallet.version + 1,
            },
          });

          await tx.walletRequest.update({
            where: { txId },
            data: { status: 'success' },
          });

          transaction = await tx.transaction.create({
            data: {
              userId,
              walletId,
              type: 'WITHDRAWAL',
              amount,
              fee: 0,
              status: 'success',
              reference: txId,
            },
          });
        });

        // Cache success
        await this.redis.set(cacheKey, JSON.stringify({ status: 'success' }), 300);

        // Invalidate wallet cache
        await this.redis.del(`user_wallets:${userId}`);

        // Append tx to transaction cache
        const txKey = `user:transactions:${userId}`;
        const existing = await this.redis.get(txKey);
        if (existing) {
          const txList = JSON.parse(existing);
          txList.unshift(transaction);
          await this.redis.set(txKey, JSON.stringify(txList), 300);
        }

        // Notify
        await this.rabbit.sendToQueue('notifications', {
          userId,
          title: 'Wallet Withdrawn',
          body: `You have withdrawn ₦${amount.toLocaleString()} from your ${currency} wallet.`,
          type: 'wallet',
        });

        console.log(`✅ Withdrawal completed for ${txId}`);
      } catch (error) {
        await this.prisma.walletRequest.updateMany({
          where: { txId },
          data: { status: 'failed' },
        });

        await this.redis.set(cacheKey, JSON.stringify({ status: 'failed' }), 300);
        console.error(`❌ Withdrawal failed (${txId}):`, error.message);
      }
    });
  }
}
