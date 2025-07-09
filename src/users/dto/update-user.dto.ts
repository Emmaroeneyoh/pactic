// ../users/dto/update-user.dto.ts
import { IsOptional, IsEmail, IsString } from 'class-validator';

export class UpdateUserDto {
    @IsOptional()
    @IsString()
    username?: string;

    @IsOptional()
    @IsEmail()
    email?: string;
}
