import { ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    canActivate(context: ExecutionContext) {
        // Delega la validación a JwtStrategy
        return super.canActivate(context);
    }

    handleRequest(err, user, info) {
        // Si hay error o no hay usuario, lanzar excepción
        if (err || !user) {
            throw err || new UnauthorizedException('Token inválido o expirado');
        }

        // Retornar el usuario (se adjuntará a request.user)
        return user;
    }
}