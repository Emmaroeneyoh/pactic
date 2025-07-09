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

  it('should return user profile', async () => {
    const profile = { id: 1, username: 'test' };

    mockService.getProfile.mockResolvedValue(profile);

    await controller.getProfile({ userId: 1 }, mockReq as any, mockRes as any);

    expect(validator.validateTokenUser).toHaveBeenCalledWith(1, 1);
    expect(mockService.getProfile).toHaveBeenCalledWith(1);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(successResponse('Profile fetched successfully', profile));
  });

  it('should update user profile', async () => {
    const body = { userId: 1, username: 'updated' };
    const updated = { id: 1, username: 'updated' };

    mockService.updateProfile.mockResolvedValue(updated);

    await controller.updateProfile(body, mockReq as any, mockRes as any);

    expect(validator.validateTokenUser).toHaveBeenCalledWith(1, 1);
    expect(mockService.updateProfile).toHaveBeenCalledWith(1, { username: 'updated' });
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(successResponse('Profile updated successfully', updated));
  });

  it('should delete user', async () => {
    const deleted = { id: 1, deletedAt: new Date().toISOString() };

    mockService.deleteUser.mockResolvedValue(deleted);

    await controller.deleteUser({ userId: 1 }, mockReq as any, mockRes as any);

    expect(validator.validateTokenUser).toHaveBeenCalledWith(1, 1);
    expect(mockService.deleteUser).toHaveBeenCalledWith(1);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(successResponse('User deleted (soft) successfully', deleted));
  });
});
