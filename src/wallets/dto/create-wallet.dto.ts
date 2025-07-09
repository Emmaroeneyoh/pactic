import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class CreateWalletDto {
  @IsNumber()
  userId: number;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsString()
  @IsNotEmpty()
  txId: string;
}
