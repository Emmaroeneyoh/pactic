// ../users/users.service.ts
import {
    Injectable,
    UnauthorizedException,
    ConflictException, BadRequestException
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { AuthService } from '../auth/auth.service';
import { RedisService } from '../redis/redis.service';
import { cache } from 'joi';

@Injectable()
export class UsersService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly rabbit: RabbitMQService,
        private readonly authService: AuthService,
        private readonly redisService: RedisService,
    ) { }

    // ✅ Signup
    async create(createUserDto: CreateUserDto) {
        const { email, username, password } = createUserDto;

        const existingUser = await this.prisma.user.findFirst({
            where: {
                OR: [{ email }, { username }],
            },
        });

        if (existingUser && !existingUser.deletedAt) {
            throw new ConflictException('User with this email or username already exists');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await this.prisma.user.upsert({
            where: { email },
            update: {
                username,
                password: hashedPassword,
                deletedAt: null,
            },
            create: {
                email,
                username,
                password: hashedPassword,
            },
        });

        const { password: _, ...result } = user;
        return result;
    }


    // ✅ Login
    async login(data: LoginUserDto, ip: string, userAgent: string) {
        const user = await this.prisma.user.findUnique({
            where: { email: data.email },
        });

        const isMatch = user && await bcrypt.compare(data.password, user.password);
        const success = !!(user && isMatch);

        // Send login log to queue
        await this.rabbit.sendToQueue('login_logs', {
            userId: user?.id,
            email: data.email,
            ipAddress: ip,
            userAgent,
            location: null,
            success,
        });

        if (!user || !isMatch) {
            throw new UnauthorizedException('Invalid credentials');
        }

        if (user.deletedAt) {
            throw new UnauthorizedException('User account is deleted');
        }

        const token = this.authService.generateToken(user);
        const { password, ...rest } = user;

        return { user: rest, token };
    }


    async getProfile(userId: number) {
        const cacheKey = `user:profile:${userId}`;
        const cached = await this.redisService.get(cacheKey);

        if (cached) {
            return JSON.parse(cached);
        }

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                username: true,
                createdAt: true,
            },
        });

        if (user) {
            await this.redisService.set(cacheKey, JSON.stringify(user), 300); // TTL: 5 minutes
        }

        return user;
    }

    async updateProfile(userId: number, dto: UpdateUserDto) {
        const updated = await this.prisma.user.update({
            where: { id: userId },
            data: {
                ...dto,
            },
            select: {
                id: true,
                email: true,
                username: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        // Invalidate Redis cache
        const cacheKey = `user:profile:${userId}`;
        await this.redisService.del(cacheKey);
        await this.redisService.set(cacheKey, JSON.stringify(updated), 300);
        return updated;
    }

    // ../users/users.service.ts
    async deleteUser(userId: number) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { deletedAt: true },
        });

        if (!user) {
            throw new BadRequestException('User not found');
        }

        if (user.deletedAt) {
            throw new BadRequestException('User is already deleted');
        }

        const deleted = await this.prisma.user.update({
            where: { id: userId },
            data: {
                deletedAt: new Date(),
            },
            select: {
                id: true,
                email: true,
                username: true,
                deletedAt: true,
            },
        });

        // Invalidate Redis cache
        const cacheKey = `user:profile:${userId}`;
        await this.redisService.del(cacheKey);

        return deleted;
    }

}
