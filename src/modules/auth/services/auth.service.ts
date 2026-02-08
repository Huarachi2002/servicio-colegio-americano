import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { LoginDto } from '../dto/login.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { MobileUser } from 'src/database/entities/mobile-user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { DeviceService } from './device.service';
import { JwtService } from '@nestjs/jwt';
import { User } from 'src/database/entities/users.entity';
import { CustomLoggerService } from 'src/common/logger';


export enum EntityState {
    ENABLE = 1,
    DISABLE = 0,
}

export enum MobileUserType {
    FATHER = 1,
    EMPLOYEE = 2,
    FATHER_EMPLOYEE = 3,
}

@Injectable()
export class AuthService {
    private readonly logger: CustomLoggerService;

    constructor(
        @InjectRepository(MobileUser) private readonly mobileUserRepository: Repository<MobileUser>,
        @InjectRepository(User) private readonly userRepository: Repository<User>,

        private deviceService: DeviceService,
        private jwtService: JwtService,
        private readonly customLogger: CustomLoggerService,
    ) {
        this.logger = this.customLogger.setContext(AuthService.name);
    }

    async attemptLogin(loginDto: LoginDto) {
        this.logger.logIntegrationProcess('MOBILE_AUTH', 'attemptLogin', 'START', {
            username: loginDto.username
        })
        const { username, password } = loginDto;

        const user = await this.mobileUserRepository.findOne({
            where: {
                username,
                state: EntityState.ENABLE
            },
            relations: ['device']
        });

        this.logger.log('User found: ' + user);

        // Si no existe el usuario o la contraseña no coincide
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return null;
        }

        this.logger.log("Usuario autenticado exitosamente");
        this.logger.logIntegrationProcess('MOBILE_AUTH', 'attemptLogin', 'SUCCESS', {
            user
        })

        return user;
    }

    async sendLoginResponse(user: MobileUser, deviceToken?: string) {

        this.logger.logIntegrationProcess('MOBILE_AUTH', 'sendLoginResponse', 'START', {
            userId: user.id,
            deviceTokenProvided: !!deviceToken,
        })


        // Crear o actualizar dispositivo y vincularlo al usuario
        if (deviceToken) {
            this.logger.log("Procesando dispositivo");
            await this.processUserDevice(user, deviceToken);
        }

        // Generar el token JWT
        const apiToken = this.generateToken(user);

        // Calcular user_type basado en entity_type
        // Father = 0, Employee = 1, Student = 3
        const userType = this.getUserTypeFromEntityType(user.entity_type);

        this.logger.logIntegrationProcess('MOBILE_AUTH', 'sendLoginResponse', 'SUCCESS', {
            userId: user.id,
            apiToken,
            userType,
        })

        // Respuesta estructurada para la app móvil
        // La app espera: id, name, userType, entityType, entityId, apiToken
        return {
            id: user.id,
            name: user.name,
            api_token: apiToken,
            entity_type: user.entity_type,
            entity_id: user.entity_id,
            user_type: userType.toString(),
        };
    }

    /**
     * Calcula el user_type basado en entity_type
     * Father = 0, Employee = 1, Father_Employee = 2, Student = 3
     */
    private getUserTypeFromEntityType(entityType: string): number {
        switch (entityType) {
            case 'Father':
                return 0; // FATHER_TYPE
            case 'Employee':
                return 1; // EMPLOYEE_TYPE
            case 'Student':
                return 3; // STUDENT_TYPE
            default:
                return 0; // Por defecto Father (padres)
        }
    }

    async loginWeb(loginDto: LoginDto): Promise<string> {
        this.logger.logIntegrationProcess('WEB_AUTH', 'loginWeb', 'START', {
            username: loginDto.username
        })
        this.logger.log("========Inicio Login web user: " + loginDto.username + "===========")
        const { username, password } = loginDto;
        const user = await this.userRepository.findOneBy({
            username,
            state: EntityState.ENABLE
        });
        this.logger.log('Web User found: ' + user);

        // Si no existe el usuario o la contraseña no coincide
        if (!user || !(await bcrypt.compare(password, user.password))) {
            throw new NotFoundException('Invalid credentials');
        }
        this.logger.log("Web Usuario autenticado exitosamente");
        this.logger.log("========Fin Login web user: " + loginDto.username + "===========")
        
        // Payload del JWT para usuario web
        const payload = {
            sub: user.id,
            username: user.username,
            email: user.email,
            isMobileUser: false, // Flag para identificar usuario web
        };
        
        const apiToken = this.jwtService.sign(payload);
        return apiToken;
    }

    /**
     * Procesa el dispositivo del usuario: crea si no existe, actualiza si existe,
     * y vincula el dispositivo al usuario en la base de datos
     */
    private async processUserDevice(
        user: MobileUser,
        deviceToken: string,
    ): Promise<void> {
        try {
            // Buscar si ya existe un dispositivo con este token en la BD
            const existingDevice = await this.deviceService.findDeviceByToken(deviceToken);
            
            if (existingDevice) {
                // Dispositivo existe: actualizar token FCM y owner
                this.logger.log(`Dispositivo existente encontrado (ID: ${existingDevice.id}), actualizando...`);
                await this.deviceService.updateDeviceOwnerAndToken(
                    existingDevice,
                    deviceToken,
                    user.entity_type,
                    user.entity_id
                );
                
                // Vincular dispositivo al usuario si no está vinculado
                if (!user.device || user.device.id !== existingDevice.id) {
                    await this.deviceService.linkDeviceToUser(user.id, existingDevice.id);
                    this.logger.log(`Dispositivo ${existingDevice.id} vinculado al usuario ${user.id}`);
                }
            } else {
                // Dispositivo no existe: crear uno nuevo
                this.logger.log('Dispositivo no encontrado, creando nuevo...');
                const newDevice = await this.deviceService.createDevice({
                    token: deviceToken,
                    token_fcm: deviceToken,
                    entity_id: user.entity_id,
                    entity_type: user.entity_type,
                });
                
                // Vincular el nuevo dispositivo al usuario
                await this.deviceService.linkDeviceToUser(user.id, newDevice.id);
                this.logger.log(`Nuevo dispositivo ${newDevice.id} creado y vinculado al usuario ${user.id}`);
            }
        } catch (error) {
            this.logger.error(`Error procesando dispositivo: ${error.message}`);
            throw error;
        }
    }

    private generateToken(user: MobileUser): string {
        // Payload del JWT con información del usuario móvil
        const payload = {
            sub: user.id, // Subject (ID del usuario)
            username: user.username,
            entityId: user.entity_id,
            entityType: user.entity_type,
            email: user.email,
            isMobileUser: true, // Flag para identificar usuario móvil
        };

        // Generar y retornar el token JWT
        return this.jwtService.sign(payload);
    }


}
