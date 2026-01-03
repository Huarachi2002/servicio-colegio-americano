import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ApiClient } from '../../database/entities/api-client.entity';

/**
 * Decorador para obtener el cliente API del request
 * Uso: @CurrentApiClient() client: ApiClient
 */
export const CurrentApiClient = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): ApiClient => {
        const request = ctx.switchToHttp().getRequest();
        return request.user as ApiClient;
    },
);
