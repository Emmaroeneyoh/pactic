// dto/withdraw-wallet.dto.ts

import { IsNotEmpty, IsString, IsNumber, Min } from 'class-validator';

export class WithdrawWalletDto {
  @IsNumber()
  userId: number;

  @IsNumber()
  walletId: number;

  @IsNumber()
  @Min(0.01, { message: 'Withdrawal amount must be greater than 0' })
  amount: number;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsString()
  @IsNotEmpty()
  txId: string;
}
