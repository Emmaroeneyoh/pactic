import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../database/prisma.service';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { AuthService } from '../auth/auth.service';
import { RedisService } from '../redis/redis.service';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('UsersService', () => {
  let service: UsersService;

  const mockPrisma = {
    user: {
      findFirst: jest.fn(),
      upsert: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockRabbit = {
    sendToQueue: jest.fn(),
  };

  const mockAuth = {
    generateToken: jest.fn().mockReturnValue('fake-jwt-token'),
  };

  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RabbitMQService, useValue: mockRabbit },
        { provide: AuthService, useValue: mockAuth },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('should throw ConflictException if user exists and not deleted', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 1, deletedAt: null });

      await expect(
        service.create({ email: 'test@example.com', username: 'test', password: '1234' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should hash password and create user if not exists', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.upsert.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        username: 'test',
        password: 'hashed',
      });

      const result = await service.create({ email: 'test@example.com', username: 'test', password: '1234' });

      expect(result).toEqual({
        id: 1,
        email: 'test@example.com',
        username: 'test',
      });
      expect(mockPrisma.user.upsert).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginDto = { email: 'test@example.com', password: '1234' };

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto, '127.0.0.1', 'Postman')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 1,
        password: await bcrypt.hash('wrong-pass', 10),
      });

      await expect(service.login(loginDto, '127.0.0.1', 'Postman')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is soft deleted', async () => {
      const hashed = await bcrypt.hash('1234', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 1,
        password: hashed,
        deletedAt: new Date(),
      });

      await expect(service.login(loginDto, '127.0.0.1', 'Postman')).rejects.toThrow(UnauthorizedException);
    });

    it('should return token and user data if login is successful', async () => {
      const hashed = await bcrypt.hash('1234', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        username: 'test',
        password: hashed,
        deletedAt: null,
      });

      const result = await service.login(loginDto, '127.0.0.1', 'Postman');

      expect(result).toEqual({
        user: {
          id: 1,
          email: 'test@example.com',
          username: 'test',
          deletedAt: null,
        },
        token: 'fake-jwt-token',
      });
    });
  });

  describe('getProfile', () => {
    it('should return cached profile if exists', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify({ id: 1, username: 'cached' }));

      const result = await service.getProfile(1);

      expect(result).toEqual({ id: 1, username: 'cached' });
    });

    it('should fetch from DB and cache if not in Redis', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({ id: 1, username: 'fetched' });

      const result = await service.getProfile(1);

      expect(result).toEqual({ id: 1, username: 'fetched' });
      expect(mockRedis.set).toHaveBeenCalledWith(
        'user:profile:1',
        JSON.stringify({ id: 1, username: 'fetched' }),
        300,
      );
    });
  });

  describe('updateProfile', () => {
    it('should update user and update Redis cache', async () => {
      const updatedUser = {
        id: 1,
        email: 'updated@example.com',
        username: 'new',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateProfile(1, { username: 'new' });

      expect(result).toEqual(updatedUser);
      expect(mockRedis.del).toHaveBeenCalledWith('user:profile:1');
      expect(mockRedis.set).toHaveBeenCalledWith('user:profile:1', JSON.stringify(updatedUser), 300);
    });
  });

  describe('deleteUser', () => {
    it('should throw if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.deleteUser(1)).rejects.toThrow(BadRequestException);
    });

    it('should throw if user already deleted', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ deletedAt: new Date() });

      await expect(service.deleteUser(1)).rejects.toThrow(BadRequestException);
    });

    it('should soft delete user and clear Redis cache', async () => {
      const deletedUser = {
        id: 1,
        deletedAt: new Date().toISOString(),
        email: 'user@example.com',
        username: 'test',
      };

      mockPrisma.user.findUnique.mockResolvedValue({ deletedAt: null });
      mockPrisma.user.update.mockResolvedValue(deletedUser);

      const result = await service.deleteUser(1);

      expect(result).toEqual(deletedUser);
      expect(mockRedis.del).toHaveBeenCalledWith('user:profile:1');
    });
  });
});
