import { IsNotEmpty } from 'class-validator';

export class ProfileRequestDto {
  @IsNotEmpty()
  userId: number;
}
