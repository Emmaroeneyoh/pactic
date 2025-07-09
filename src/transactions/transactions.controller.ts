import {
    Controller,
    Get,
    Query,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../common/types/express-request';
import { successResponse } from '../common/helpers/response';
import { validateTokenUser } from '../common/utils/validate-token-user';

@Controller('transactions')
export class TransactionsController {
    constructor(private readonly transactionsService: TransactionsService) {}

    @UseGuards(JwtAuthGuard)
    @Get('my')
    async getUserTransactions(
        @Query('userId') userId: string,
        @Query('page') page: string = '1',
        @Req() req: AuthenticatedRequest,
        @Res() res: Response,
    ) {
        const numericUserId = parseInt(userId);
        const pageNumber = Math.max(parseInt(page), 1);
        validateTokenUser(numericUserId, req.user.id);

        const result = await this.transactionsService.getTransactionsForUser(numericUserId, pageNumber);
        return res.status(200).json(successResponse('Transactions fetched successfully', result));
    }

    @UseGuards(JwtAuthGuard)
    @Get('notifications')
    async getUserNotifications(
        @Query('userId') userId: string,
        @Query('page') page: string = '1',
        @Req() req: AuthenticatedRequest,
        @Res() res: Response,
    ) {
        const numericUserId = parseInt(userId);
        const pageNumber = Math.max(parseInt(page), 1);
        validateTokenUser(numericUserId, req.user.id);

        const result = await this.transactionsService.getUserNotifications(numericUserId, pageNumber);
        return res.status(200).json(successResponse('Notifications fetched successfully', result));
    }

    @UseGuards(JwtAuthGuard)
    @Get('logs')
    async getUserLoginLogs(
        @Query('userId') userId: string,
        @Query('page') page: string = '1',
        @Req() req: AuthenticatedRequest,
        @Res() res: Response,
    ) {
        const numericUserId = parseInt(userId);
        const pageNumber = Math.max(parseInt(page), 1);
        validateTokenUser(numericUserId, req.user.id);

        const result = await this.transactionsService.getUserLoginLogs(numericUserId, pageNumber);
        return res.status(200).json(successResponse('Login logs fetched successfully', result));
    }
}
