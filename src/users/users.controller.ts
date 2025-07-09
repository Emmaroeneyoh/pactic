import { Response, Request } from 'express';
import { Controller, Post, Body, Res, Req, Get, UseGuards, Delete,Query } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { UsersService } from './users.service';
import { successResponse } from '../common/helpers/response';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../common/types/express-request';
import { ProfileRequestDto } from './dto/profile-request.dto';
import { validateTokenUser } from '../common/utils/validate-token-user';
import { UpdateUserDto } from './dto/update-user.dto';


@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Post('signup')
    async signup(@Body() createUserDto: CreateUserDto, @Res() res: Response) {
        const user = await this.usersService.create(createUserDto);
        return res.status(201).json(successResponse('Signup process successful', user, 201));
    }


    @Post('login')
    async login(@Body() dto: LoginUserDto, @Req() req: AuthenticatedRequest, @Res() res: Response) {
        const ip = req.ip || '';
        const userAgent: string = req.headers['user-agent'] ?? 'Unknown';

        const user = await this.usersService.login(dto, ip, userAgent);
        return res.status(200).json(successResponse('Login successful', user));
    }


    @UseGuards(JwtAuthGuard)
    @Get('profile')
    async getProfile(
        @Req() req: AuthenticatedRequest,
        @Res() res: Response,
        @Query('userId') userId: string,
    ) {
        const numericUserId = parseInt(userId);
        validateTokenUser(numericUserId, req.user.id);
    
        const profile = await this.usersService.getProfile(numericUserId);
        return res
            .status(200)
            .json(successResponse('Profile fetched successfully', profile));
    }
    
    @UseGuards(JwtAuthGuard)
    @Post('update')
    async updateProfile(
        @Body() body: UpdateUserDto & { userId: number },
        @Req() req: AuthenticatedRequest,
        @Res() res: Response,
    ) {
        const tokenUserId = req.user.id;
        const { userId, ...dto } = body;
        validateTokenUser(userId, tokenUserId);

        const updated = await this.usersService.updateProfile(userId, dto);
        return res
            .status(200)
            .json(successResponse('Profile updated successfully', updated));
    }

    @UseGuards(JwtAuthGuard)
    @Delete('delete')
    async deleteUser(
        @Body() body: { userId: number },
        @Req() req: AuthenticatedRequest,
        @Res() res: Response,
    ) {
        const tokenUserId = req.user.id;
        validateTokenUser(body.userId, tokenUserId);

        const deleted = await this.usersService.deleteUser(body.userId);
        return res
            .status(200)
            .json(successResponse('User deleted (soft) successfully', deleted));
    }
}
