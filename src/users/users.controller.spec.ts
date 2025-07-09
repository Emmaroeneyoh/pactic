// users.controller.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { successResponse } from '../common/helpers/response';
import * as validator from '../common/utils/validate-token-user';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockService = {
    create: jest.fn(),
    login: jest.fn(),
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
    deleteUser: jest.fn(),
  };

  const mockReq = {
    user: { id: 1 },
    ip: '127.0.0.1',
    headers: { 'user-agent': 'PostmanRuntime/7.29.0' },
  };

  const mockRes = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);

    jest.spyOn(validator, 'validateTokenUser').mockImplementation(() => true);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should signup a user', async () => {
    const dto = { email: 'test@example.com', username: 'test', password: '1234' };
    const createdUser = { id: 1, ...dto };

    mockService.create.mockResolvedValue(createdUser);

    await controller.signup(dto, mockRes as any);

    expect(mockService.create).toHaveBeenCalledWith(dto);
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith(successResponse('Signup process successful', createdUser, 201));
  });

  it('should login user', async () => {
    const dto = { email: 'test@example.com', password: '1234' };
    const user = { id: 1, token: 'fake-jwt' };

    mockService.login.mockResolvedValue(user);

    await controller.login(dto, mockReq as any, mockRes as any);

    expect(mockService.login).toHaveBeenCalledWith(dto, '127.0.0.1', 'PostmanRuntime/7.29.0');
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(successResponse('Login successful', user));
  });
});
