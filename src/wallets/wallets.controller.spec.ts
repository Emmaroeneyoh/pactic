// wallets.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { WalletsController } from './wallets.controller';
import { WalletsService } from './wallets.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { successResponse } from '../common/helpers/response';
import * as validator from '../common/utils/validate-token-user';

describe('WalletsController', () => {
  let controller: WalletsController;
  let service: WalletsService;

  const mockService = {
    createWallet: jest.fn(),
    fundWallet: jest.fn(),
    getUserWallets: jest.fn(),
    withdrawFromWallet: jest.fn(),
    transferFunds: jest.fn(),
  };

  const mockReq = { user: { id: 1 } };
  const mockRes = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WalletsController],
      providers: [{ provide: WalletsService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<WalletsController>(WalletsController);
    service = module.get<WalletsService>(WalletsService);

    jest.spyOn(validator, 'validateTokenUser').mockImplementation(() => true);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create wallet and return response', async () => {
    const body = { userId: 1, currency: 'NGN', txId: 'TX123' };
    const wallet = { id: 1, currency: 'NGN' };

    mockService.createWallet.mockResolvedValue(wallet);

    await controller.createWallet(body, mockReq as any, mockRes as any);

    expect(validator.validateTokenUser).toHaveBeenCalledWith(1, 1);
    expect(mockService.createWallet).toHaveBeenCalledWith(1, 'NGN', 'TX123');
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith(successResponse('Wallet created successfully', wallet));
  });

  it('should fund wallet and return response', async () => {
    const body = { userId: 1, walletId: 2, currency: 'NGN', amount: 1000, txId: 'TX456' };
    const funded = {
      status_code: 200,
      status: true,
      message: 'Wallet funded successfully',
      data: { amount: 1000 },
    };

    mockService.fundWallet.mockResolvedValue(funded);

    await controller.fundWallet(body, mockReq as any, mockRes as any);

    expect(mockService.fundWallet).toHaveBeenCalledWith(1, 2, 'NGN', 1000, 'TX456');
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(funded);
  });

  it('should get user wallets', async () => {
    const wallets = [{ id: 1, balance: 500 }];
    mockService.getUserWallets.mockResolvedValue(wallets);

    await controller.getUserWallets({ userId: 1 }, mockReq as any, mockRes as any);

    expect(validator.validateTokenUser).toHaveBeenCalledWith(1, 1);
    expect(mockService.getUserWallets).toHaveBeenCalledWith(1);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(successResponse('User wallets retrieved successfully', wallets));
  });

  it('should withdraw from wallet', async () => {
    const body = { userId: 1, walletId: 2, currency: 'NGN', amount: 500, txId: 'TX789' };
    const withdrawal = { success: true };

    mockService.withdrawFromWallet.mockResolvedValue(withdrawal);

    await controller.withdrawFromWallet(body, mockReq as any, mockRes as any);

    expect(mockService.withdrawFromWallet).toHaveBeenCalledWith(body);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(successResponse('Withdrawal successful', withdrawal));
  });

  it('should transfer funds', async () => {
    const body = {
      senderId: 1,
      senderWalletId: 2,
      recipientId: 3,
      recipientWalletId: 4,
      currency: 'NGN',
      amount: 200,
      txId: 'TX999',
    };
    const result = { success: true };

    mockService.transferFunds.mockResolvedValue(result);

    await controller.transferFunds(body, mockReq as any, mockRes as any);

    expect(validator.validateTokenUser).toHaveBeenCalledWith(1, 1);
    expect(mockService.transferFunds).toHaveBeenCalledWith(body);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(successResponse('Transfer completed successfully', result));
  });
});
