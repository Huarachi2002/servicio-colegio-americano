import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorador para obtener el usuario autenticado actual
 * Uso: @CurrentUser() user: MobileUser
 */
export const CurrentUser = createParamDecorator(
    (datakey: unknown, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        return request.user; // Usuario autenticado por Passport
    },
);
