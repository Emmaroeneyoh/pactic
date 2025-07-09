// dto/transfer-wallet.dto.ts
import { IsNotEmpty, IsString, IsNumber, Min } from 'class-validator';

export class TransferWalletDto {
  @IsNumber()
  senderId: number;

  @IsNumber()
  senderWalletId: number;

  @IsNumber()
  recipientId: number;

  @IsNumber()
  recipientWalletId: number;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsString()
  @IsNotEmpty()
  txId: string;
}
