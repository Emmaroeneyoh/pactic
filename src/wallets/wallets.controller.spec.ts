import { Test, TestingModule } from '@nestjs/testing';
import { WalletsController } from './wallets.controller';
import { WalletsService } from './wallets.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { successResponse } from '../common/helpers/response';

describe('WalletsController', () => {
  let controller: WalletsController;
  let service: WalletsService;

  const mockWalletsService = {
    createWallet: jest.fn(),
    fundWallet: jest.fn(),
    getUserWallets: jest.fn(),
    withdrawFromWallet: jest.fn(),
    transferFunds: jest.fn(),
  };

  const mockReq = {
    user: { id: 1 },
  };

  const mockRes = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WalletsController],
      providers: [
        { provide: WalletsService, useValue: mockWalletsService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<WalletsController>(WalletsController);
    service = module.get<WalletsService>(WalletsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('createWallet', () => {
    it('should create a wallet', async () => {
      const res = mockRes();
      const result = { id: 1, currency: 'USD' };
      mockWalletsService.createWallet.mockResolvedValue(result);

      await controller.createWallet({ userId: 1, currency: 'USD', txId: 'tx123' }, mockReq as any, res);
      expect(service.createWallet).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(successResponse('Wallet created successfully', result));
    });
  });

  describe('fundWallet', () => {
    it('should fund a wallet', async () => {
      const res = mockRes();
      const result = {
        status_code: 200,
        status: 'success',
        message: 'Wallet funded',
        data: { amount: 100 },
      };

      mockWalletsService.fundWallet.mockResolvedValue(result);

      await controller.fundWallet({
        userId: 1,
        walletId: 1,
        currency: 'USD',
        amount: 100,
        txId: 'tx456',
      }, mockReq as any, res);

      expect(service.fundWallet).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(result);
    });
  });

  describe('getUserWallets', () => {
    it('should return user wallets', async () => {
      const res = mockRes();
      const wallets = [{ id: 1, balance: 200 }];
      mockWalletsService.getUserWallets.mockResolvedValue(wallets);

      await controller.getUserWallets(mockReq as any, res, '1');
      expect(service.getUserWallets).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(successResponse('User wallets retrieved successfully', wallets));
    });
  });

  describe('withdrawFromWallet', () => {
    it('should withdraw from wallet', async () => {
      const res = mockRes();
      const result = { id: 1, amount: 50 };

      mockWalletsService.withdrawFromWallet.mockResolvedValue(result);

      await controller.withdrawFromWallet({
        userId: 1,
        walletId: 1,
        currency: 'USD',
        amount: 50,
        txId: 'tx789',
      }, mockReq as any, res);

      expect(service.withdrawFromWallet).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(successResponse('Withdrawal successful', result));
    });
  });

  describe('transferFunds', () => {
    it('should transfer funds and return success', async () => {
      const res = mockRes();
      const body = {
        senderId: 1,
        recipientId: 2,
        senderWalletId: 11,
        recipientWalletId: 22,
        amount: 50,
        currency: 'USD',
        txId: 'tx999',
      };
      const result = { transactionId: 'tx999' };
      mockWalletsService.transferFunds.mockResolvedValue(result);

      await controller.transferFunds(body, mockReq as any, res);

      expect(service.transferFunds).toHaveBeenCalledWith(body);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(successResponse('Transfer completed successfully', result));
    });
  });
});
