import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { successResponse } from '../common/helpers/response';

describe('TransactionsController', () => {
  let controller: TransactionsController;
  let transactionsService: TransactionsService;

  const mockTransactionsService = {
    getTransactionsForUser: jest.fn(),
    getUserNotifications: jest.fn(),
    getUserLoginLogs: jest.fn(),
  };

  const mockUser = { id: 1 };

  const mockReq = {
    user: mockUser,
  };

  const mockRes = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [
        {
          provide: TransactionsService,
          useValue: mockTransactionsService,
        },
      ],
    }).compile();

    controller = module.get<TransactionsController>(TransactionsController);
    transactionsService = module.get<TransactionsService>(TransactionsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getUserTransactions', () => {
    it('should return user transactions', async () => {
      const mockResult = { items: [], total: 0, page: 1, totalPages: 0 };
      mockTransactionsService.getTransactionsForUser.mockResolvedValue(mockResult);

      const res = mockRes();
      await controller.getUserTransactions('1', '1', mockReq as any, res);

      expect(mockTransactionsService.getTransactionsForUser).toHaveBeenCalledWith(1, 1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(successResponse('Transactions fetched successfully', mockResult));
    });
  });

  describe('getUserNotifications', () => {
    it('should return user notifications', async () => {
      const mockResult = { items: [], total: 0, page: 1, totalPages: 0 };
      mockTransactionsService.getUserNotifications.mockResolvedValue(mockResult);

      const res = mockRes();
      await controller.getUserNotifications('1', '1', mockReq as any, res);

      expect(mockTransactionsService.getUserNotifications).toHaveBeenCalledWith(1, 1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(successResponse('Notifications fetched successfully', mockResult));
    });
  });

  describe('getUserLoginLogs', () => {
    it('should return user login logs', async () => {
      const mockResult = { items: [], total: 0, page: 1, totalPages: 0 };
      mockTransactionsService.getUserLoginLogs.mockResolvedValue(mockResult);

      const res = mockRes();
      await controller.getUserLoginLogs('1', '1', mockReq as any, res);

      expect(mockTransactionsService.getUserLoginLogs).toHaveBeenCalledWith(1, 1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(successResponse('Login logs fetched successfully', mockResult));
    });
  });
});
