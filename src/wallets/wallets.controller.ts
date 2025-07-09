import {
    Controller,
    Post,
    Body,
    Req,
    Res,
    UseGuards,Query , Get
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WalletsService } from './wallets.service';
import { successResponse } from '../common/helpers/response';
import { AuthenticatedRequest } from '../common/types/express-request';
import { validateTokenUser } from '../common/utils/validate-token-user';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { FundWalletDto } from './dto/fund-wallet.dto';
import { WithdrawWalletDto } from './dto/withdraw-wallet.dto';
import { TransferWalletDto } from './dto/transfer-wallet.dto';

@Controller('wallet')
export class WalletsController {
    constructor(private readonly walletService: WalletsService) { }

    @UseGuards(JwtAuthGuard)
    @Post('create')
    async createWallet(
        @Body() body: CreateWalletDto,
        @Req() req: AuthenticatedRequest,
        @Res() res: Response,
    ) {
        const { userId, currency, txId } = body;
        validateTokenUser(userId, req.user.id);

        const wallet = await this.walletService.createWallet(userId, currency, txId);
        return res
            .status(201)
            .json(successResponse('Wallet created successfully', wallet));
    }

    @UseGuards(JwtAuthGuard)
    @Post('fund')
    async fundWallet(
        @Body() body: FundWalletDto,
        @Req() req: AuthenticatedRequest,
        @Res() res: Response,
    ) {
        const { userId, walletId, currency, amount, txId } = body;
        validateTokenUser(userId, req.user.id);
        const funded = await this.walletService.fundWallet(userId, walletId, currency, amount, txId);


        // return res
        //     .status(200)
        //     .json(successResponse('Wallet funded successfully', funded));

        return res.status(funded.status_code).json({
            status_code: funded.status_code,
            status: funded.status,
            message: funded.message,
            data: funded.data,
        });
    }

    @UseGuards(JwtAuthGuard)
    @Get('my-wallets')
    async getUserWallets(
        @Req() req: AuthenticatedRequest,
        @Res() res: Response,
        @Query('userId') userId: string,
    ) {
        const numericUserId = parseInt(userId);
        validateTokenUser(numericUserId, req.user.id);
    
        const wallets = await this.walletService.getUserWallets(numericUserId);
        return res
            .status(200)
            .json(successResponse('User wallets retrieved successfully', wallets));
    }
    

    // wallets.controller.ts
    @UseGuards(JwtAuthGuard)
    @Post('withdraw')
    async withdrawFromWallet(
        @Body() body: WithdrawWalletDto,
        @Req() req: AuthenticatedRequest,
        @Res() res: Response,
    ) {
        const { userId } = body;
        validateTokenUser(userId, req.user.id);

        const withdrawal = await this.walletService.withdrawFromWallet(body);

        return res
            .status(200)
            .json(successResponse('Withdrawal successful', withdrawal));
    }

    // wallets.controller.ts

    @UseGuards(JwtAuthGuard)
    @Post('transfer')
    async transferFunds(
        @Body() body: TransferWalletDto,
        @Req() req: AuthenticatedRequest,
        @Res() res: Response,
    ) {
        validateTokenUser(body.senderId, req.user.id);
        const result = await this.walletService.transferFunds(body);

        return res
            .status(200)
            .json(successResponse('Transfer completed successfully', result));
    }

}
