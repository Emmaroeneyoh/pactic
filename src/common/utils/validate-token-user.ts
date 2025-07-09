// ../common/utils/validate-token-user.ts
import { UnauthorizedException } from '@nestjs/common';

export function validateTokenUser(requestUserId: number, tokenUserId: number) {
    if (requestUserId !== tokenUserId) {
        throw new UnauthorizedException('Invalid token for this user');
    }
}
