import { Test, TestingModule } from '@nestjs/testing';
import { WalletsService } from './wallets.service';
import { PrismaService } from '../database/prisma.service';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { RedisService } from '../redis/redis.service';
import { ConflictException } from '@nestjs/common';

describe('WalletsService', () => {
  let service: WalletsService;

  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockRabbit = {
    sendToQueue: jest.fn(),
  };

  const mockPrisma = {
    walletRequest: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    wallet: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RabbitMQService, useValue: mockRabbit },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<WalletsService>(WalletsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('createWallet', () => {
    it('should throw ConflictException if wallet already exists', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.walletRequest.findUnique.mockResolvedValue(null);
      mockPrisma.wallet.findFirst.mockResolvedValue({ id: 1 });

      await expect(service.createWallet(1, 'USD', 'tx123')).rejects.toThrow(ConflictException);
    });

    it('should create wallet and send notification', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.walletRequest.findUnique.mockResolvedValue(null);
      mockPrisma.wallet.findFirst.mockResolvedValue(null);
      mockPrisma.wallet.create.mockResolvedValue({ id: 1, currency: 'USD' });
      mockPrisma.walletRequest.create.mockResolvedValue({ status: 'success' });

      const result = await service.createWallet(1, 'USD', 'tx123');

      expect(mockPrisma.wallet.create).toHaveBeenCalled();
      expect(mockRabbit.sendToQueue).toHaveBeenCalledWith(
        'notifications',
        expect.objectContaining({ userId: 1, title: 'Wallet Created' }),
      );
      expect(result).toEqual({ id: 1, currency: 'USD' });
    });
  });

  describe('fundWallet', () => {
    it('should return duplicate if txId exists in Redis', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify({ txId: 'tx123' }));

      const result = await service.fundWallet(1, 10, 'USD', 500, 'tx123');

      expect(result.status_code).toBe(409);
      expect(result.status).toBe('duplicate');
    });

    it('should send job to wallet_funding queue if new', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.walletRequest.findUnique.mockResolvedValue(null);

      const result = await service.fundWallet(1, 10, 'USD', 500, 'tx124');

      expect(mockRabbit.sendToQueue).toHaveBeenCalledWith(
        'wallet_funding',
        expect.objectContaining({ userId: 1, walletId: 10, currency: 'USD', amount: 500 }),
      );
      expect(result.status).toBe('queued');
    });
  });

  describe('withdrawFromWallet', () => {
    it('should throw ConflictException if txId is cached and status is success/failed', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify({ status: 'success' }));

      await expect(
        service.withdrawFromWallet({
          userId: 1,
          walletId: 10,
          amount: 100,
          currency: 'USD',
          txId: 'tx999',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should send withdrawal job to queue', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.walletRequest.findUnique.mockResolvedValue(null);

      const body = {
        userId: 1,
        walletId: 10,
        amount: 200,
        currency: 'USD',
        txId: 'tx125',
      };

      const result = await service.withdrawFromWallet(body);

      expect(mockRabbit.sendToQueue).toHaveBeenCalledWith('wallet_withdrawal', body);
      expect(result.status).toBe('queued');
    });
  });

  describe('transferFunds', () => {
    it('should throw ConflictException if txId is cached', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify({ status: 'success' }));

      await expect(
        service.transferFunds({
          senderId: 1,
          senderWalletId: 11,
          recipientId: 2,
          recipientWalletId: 22,
          amount: 300,
          currency: 'USD',
          txId: 'tx128',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should queue wallet transfer job', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.walletRequest.findUnique.mockResolvedValue(null);

      const body = {
        senderId: 1,
        senderWalletId: 11,
        recipientId: 2,
        recipientWalletId: 22,
        amount: 300,
        currency: 'USD',
        txId: 'tx129',
      };

      const result = await service.transferFunds(body);

      expect(mockRabbit.sendToQueue).toHaveBeenCalledWith('wallet_transfer', body);
      expect(result.status).toBe('queued');
    });
  });
});
