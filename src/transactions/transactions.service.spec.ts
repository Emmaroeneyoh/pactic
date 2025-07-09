import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';

describe('TransactionsService', () => {
  let service: TransactionsService;

  const mockPrisma = {
    $transaction: jest.fn(),
    transaction: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    notification: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    loginLog: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockRedisService = {}; // Not used but required for DI

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getTransactionsForUser', () => {
    it('should return paginated transactions for user', async () => {
      const userId = 1;
      const transactions = [{ id: 1, amount: 100 }];
      const total = 1;

      mockPrisma.$transaction.mockResolvedValue([transactions, total]);

      const result = await service.getTransactionsForUser(userId, 1);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result).toEqual({
        items: transactions,
        total,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      });
    });
  });

  describe('getUserNotifications', () => {
    it('should return paginated notifications for user', async () => {
      const userId = 1;
      const notifications = [{ id: 1, message: 'Welcome' }];
      const total = 1;

      mockPrisma.$transaction.mockResolvedValue([notifications, total]);

      const result = await service.getUserNotifications(userId, 1);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result).toEqual({
        items: notifications,
        total,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      });
    });
  });

  describe('getUserLoginLogs', () => {
    it('should return paginated login logs for user', async () => {
      const userId = 1;
      const logs = [{ id: 1, loggedInAt: new Date() }];
      const total = 1;

      mockPrisma.$transaction.mockResolvedValue([logs, total]);

      const result = await service.getUserLoginLogs(userId, 1);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result).toEqual({
        items: logs,
        total,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      });
    });
  });
});
