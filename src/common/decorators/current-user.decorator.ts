import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { MobileUser } from '../../database/entities/mobile-user.entity';
import { User } from '../../database/entities/users.entity';

export const CurrentUser = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): MobileUser | User => {
        const request = ctx.switchToHttp().getRequest();
        return request.user; // Usuario autenticado por JwtStrategy
    },
);
