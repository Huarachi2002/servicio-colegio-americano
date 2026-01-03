import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * El API Key debe enviarse en el header: Api-Key: <api_key>
 */
@Injectable()
export class ApiKeyAuthGuard extends AuthGuard('api-key') {

    handleRequest<TUser = any>(err: any, client: TUser, info: any, context: ExecutionContext): TUser {
        if (err || !client) {
            throw err || new UnauthorizedException('API Key inválida o no proporcionada');
        }
        return client;
    }
}
