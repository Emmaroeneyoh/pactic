import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { successResponse } from '../common/helpers/response';
import * as validator from '../common/utils/validate-token-user';

describe('TransactionsController', () => {
  let controller: TransactionsController;
  let service: TransactionsService;

  const mockService = {
    getTransactionsForUser: jest.fn(),
    getUserNotifications: jest.fn(),
    getUserLoginLogs: jest.fn(),
  };

  const mockReq = {
    user: { id: 1 },
  };

  const mockRes = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [{ provide: TransactionsService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TransactionsController>(TransactionsController);
    service = module.get<TransactionsService>(TransactionsService);

    jest.spyOn(validator, 'validateTokenUser').mockImplementation(() => true);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get user transactions', async () => {
    const body = { userId: 1 };
    const transactions = [{ id: 101, amount: 500 }];

    mockService.getTransactionsForUser.mockResolvedValue(transactions);

    await controller.getUserTransactions(body, mockReq as any, mockRes as any);

    expect(validator.validateTokenUser).toHaveBeenCalledWith(1, 1);
    expect(mockService.getTransactionsForUser).toHaveBeenCalledWith(1);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(successResponse('Transactions fetched successfully', transactions));
  });

  it('should get user notifications', async () => {
    const body = { userId: 1 };
    const notifications = [{ id: 201, message: 'Fund received' }];

    mockService.getUserNotifications.mockResolvedValue(notifications);

    await controller.getUserNotifications(body, mockReq as any, mockRes as any);

    expect(validator.validateTokenUser).toHaveBeenCalledWith(1, 1);
    expect(mockService.getUserNotifications).toHaveBeenCalledWith(1);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(successResponse('Notifications fetched successfully', notifications));
  });

  it('should get user login logs', async () => {
    const body = { userId: 1 };
    const logs = [{ id: 301, ip: '127.0.0.1', userAgent: 'Postman' }];

    mockService.getUserLoginLogs.mockResolvedValue(logs);

    await controller.getUserLoginLogs(body, mockReq as any, mockRes as any);

    expect(validator.validateTokenUser).toHaveBeenCalledWith(1, 1);
    expect(mockService.getUserLoginLogs).toHaveBeenCalledWith(1);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(successResponse('Login logs fetched successfully', logs));
  });
});
