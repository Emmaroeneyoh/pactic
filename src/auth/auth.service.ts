// ../auth/auth.service.ts
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';

@Injectable()
export class AuthService {
    constructor(private jwtService: JwtService) { }

    generateToken(user: User) {
        const payload = { sub: user.id, email: user.email };
        return this.jwtService.sign(payload);
    }
}
