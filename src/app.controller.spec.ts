import { Test, TestingModule } from '@nestjs/testing';
import { WalletsService } from './wallets.service';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';

describe('WalletsService', () => {
  let service: WalletsService;
  let prisma: PrismaService;

  const mockPrisma = {
    wallet: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
    },
  };

  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockRabbitMQ = {
    publishToQueue: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: RabbitMQService, useValue: mockRabbitMQ },
      ],
    }).compile();

    service = module.get<WalletsService>(WalletsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('fundWallet', () => {
    it('should fund wallet and return data', async () => {
      const mockWallet = { id: 1, userId: 1, balance: 1000, currency: 'NGN' };
      const mockFunded = { ...mockWallet, balance: 1500 };
      const txId = 'unique-tx-123';

      mockPrisma.wallet.findUnique.mockResolvedValue(mockWallet);
      mockPrisma.wallet.update.mockResolvedValue(mockFunded);
      mockPrisma.transaction.create.mockResolvedValue({});

      const result = await service.fundWallet(1, 1, 'NGN', 500, txId);

      expect(mockPrisma.wallet.update).toHaveBeenCalled();
      expect(result.status).toBe('success');
      expect(result.data.balance).toBe(1500);
    });
  });

  describe('withdrawFromWallet', () => {
    it('should throw if balance is insufficient', async () => {
      const mockWallet = { id: 1, userId: 1, balance: 200, currency: 'NGN' };
      mockPrisma.wallet.findUnique.mockResolvedValue(mockWallet);

      await expect(
        service.withdrawFromWallet({
          userId: 1,
          walletId: 1,
          amount: 500,
          currency: 'NGN',
          txId: 'tx-456',
        }),
      ).rejects.toThrow('Insufficient balance');
    });
  });

  describe('transferFunds', () => {
    it('should publish to RabbitMQ and return success', async () => {
      const dto = {
        senderId: 1,
        receiverId: 2,
        amount: 100,
        currency: 'NGN',
        senderWalletId: 1,
        receiverWalletId: 2,
        txId: 'tx-789',
      };

      const result = await service.transferFunds(dto);

      expect(mockRabbitMQ.publishToQueue).toHaveBeenCalled();
      expect(result).toEqual({ status: 'success', message: 'Transfer request submitted' });
    });
  });
});
