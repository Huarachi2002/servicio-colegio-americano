import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './controllers/auth.controller';
import { DeviceController } from './controllers/device.controller';
import { AuthService } from './services/auth.service';
import { DeviceService } from './services/device.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { MobileUser } from '../../database/entities/mobile-user.entity';
import { Father } from '../../database/entities/father.entity';
import { Employee } from '../../database/entities/employee.entity';
import { Device } from '../../database/entities/device.entity';

@Module({
    imports: [
        // Entities que necesitamos
        TypeOrmModule.forFeature([MobileUser, Father, Employee, Device]),

        // Passport con estrategia por defecto
        PassportModule.register({ defaultStrategy: 'mobile-api' }),

        // Configuración JWT
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET') || 'default-secret-key',
                signOptions: {
                    expiresIn: (configService.get<string>('JWT_EXPIRATION') || '7d') as any,
                },
            }),
            inject: [ConfigService],
        }),
    ],
    controllers: [AuthController, DeviceController],
    providers: [AuthService, DeviceService, JwtStrategy],
    exports: [AuthService, JwtStrategy, PassportModule],
})
export class AuthModule { }
