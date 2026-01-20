import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { LoginDto } from '../dto/login.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { MobileUser } from 'src/database/entities/mobile-user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Father } from 'src/database/entities/father.entity';
import { Employee } from 'src/database/entities/employee.entity';
import { DeviceService } from './device.service';
import { JwtService } from '@nestjs/jwt';
import { User } from 'src/database/entities/users.entity';


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
    private readonly logger = new Logger(AuthService.name);

    constructor(
        @InjectRepository(MobileUser) private readonly mobileUserRepository: Repository<MobileUser>,
        @InjectRepository(User) private readonly userRepository: Repository<User>,

        private deviceService: DeviceService,
        private jwtService: JwtService,
    ) { }

    async attemptLogin(loginDto: LoginDto) {
        this.logger.log('===========Login attempt for user: ' + loginDto.username + "===========");
        const { username, password } = loginDto;

        const user = await this.mobileUserRepository.findOneBy({
            username,
            state: EntityState.ENABLE
        });

        this.logger.log('User found: ' + user);

        // Si no existe el usuario o la contraseña no coincide
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return null;
        }

        this.logger.log("Usuario autenticado exitosamente");
        this.logger.log("========Fin Login attempt for user: " + loginDto.username + "===========")

        return user;
    }

    async sendLoginResponse(user: MobileUser, deviceToken?: string) {

        this.logger.log("========Inicio sendLoginResponse for user: " + user.username + "===========")


        // Actualizar dispositivo si se proporciona token
        if (deviceToken) {
            this.logger.log("Actualizando dispositivo");
            await this.updateDevice(user, deviceToken);
        }

        // Generar el token JWT
        const apiToken = this.generateToken(user);

        // Calcular user_type basado en entity_type
        // Father = 0, Employee = 1, Student = 3
        const userType = this.getUserTypeFromEntityType(user.entity_type);

        this.logger.log("=======Fin sendLoginResponse========");

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
        this.logger.log('===========Login attempt for web user: ' + loginDto.username + "===========");
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

    private async updateDevice(
        user: MobileUser,
        deviceToken: string,
    ): Promise<void> {
        // Actualizar el dispositivo con el owner
        await this.deviceService.updateDeviceToken(
            user.device,
            deviceToken,
        );

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
