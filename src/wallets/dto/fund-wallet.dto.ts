import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class FundWalletDto {
  @IsNumber()
  userId: number;

  @IsNumber()
  walletId: number;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsNumber()
  amount: number;

  @IsString()
  @IsNotEmpty()
  txId: string;
}
