import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard para autenticación de API mobile
 * Usa la estrategia 'mobile-api' de Passport
 */
@Injectable()
export class MobileAuthGuard extends AuthGuard('mobile-api') { }
