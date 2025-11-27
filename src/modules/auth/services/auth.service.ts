import { Injectable, Logger } from '@nestjs/common';
import { LoginDto } from '../dto/login.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { MobileUser } from 'src/database/entities/mobile-user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Father } from 'src/database/entities/father.entity';
import { Employee } from 'src/database/entities/employee.entity';
import { DeviceService } from './device.service';
import { JwtService } from '@nestjs/jwt';


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
        @InjectRepository(Employee) private readonly employeeRepository: Repository<Employee>,
        @InjectRepository(Father) private readonly fatherRepository: Repository<Father>,

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
        let modelId: number | null = null;
        let modelType: string | null = null;
        let entityId: number;
        let entityType: string;

        this.logger.log("========Inicio sendLoginResponse for user: " + user.username + "===========")

        // Determinar IDs basados en el tipo de usuario
        if (user.user_type === MobileUserType.EMPLOYEE) {
            this.logger.log("Usuario es empleado");
            modelType = 'Employee';
            modelId = user.entity_id;
            entityId = user.entity_id;
            entityType = 'Employee';
        } else {
            this.logger.log("Usuario es padre");
            // FATHER
            entityId = user.entity_id;
            entityType = 'Father';
        }

        // Si el usuario es tipo FATHER_EMPLOYEE (dual)
        if (user.user_type === MobileUserType.FATHER_EMPLOYEE) {
            this.logger.log("Usuario es padre y empleado");
            // En este caso asumimos que el entity_id principal apunta al Father
            entityId = user.entity_id;
            entityType = 'Father';

            // Necesitamos encontrar el Employee asociado.
            // La lógica original buscaba por contact_code vs erp_code.
            // Asumiremos que necesitamos buscar el empleado cuyo contact_code coincida con el erp_code del padre.
            this.logger.log("Buscando empleado asociado");
            const father = await this.fatherRepository.findOneBy({ id: entityId });
            if (father) {
                this.logger.log("Encontrado padre");
                // Buscar empleado asociado (necesitarías inyectar EmployeeRepository)
                const employee = await this.employeeRepository.findOneBy({ erpCode: father.erpCode });
                if (employee) {
                    this.logger.log("Encontrado empleado");
                    modelId = employee.id;
                    modelType = 'Employee';
                }
            }
            this.logger.log("Empleado asociado: " + modelId);
        }

        // Actualizar dispositivo si se proporciona token
        if (deviceToken) {
            this.logger.log("Actualizando dispositivo");
            await this.updateDevice(entityId, entityType, modelId, modelType, deviceToken);
        }

        // Generar el token JWT
        const apiToken = this.generateToken(user);

        this.logger.log("=======Fin sendLoginResponse========");

        // Respuesta estructurada para la app móvil
        // La app espera: id, name, userType, entityType, entityId, apiToken
        return {
            id: user.id,
            name: user.name,
            userType: user.user_type,
            entityType: entityType,
            entityId: entityId,
            apiToken: apiToken,
        };
    }

    private async updateDevice(
        entityId: number,
        entityType: string,
        modelId: number | null,
        modelType: string | null,
        deviceToken: string,
    ): Promise<void> {
        // Actualizar el dispositivo con el owner
        await this.deviceService.updateModelOwnerByToken(
            entityType,
            entityId,
            deviceToken,
        );

        // Si hay un modelo adicional (empleado), actualizarlo también
        if (modelType && modelId) {
            await this.deviceService.updateModelOwnerByToken(
                modelType,
                modelId,
                deviceToken,
            );
        }
    }

    private generateToken(user: MobileUser): string {
        // Payload del JWT con información del usuario
        const payload = {
            sub: user.id, // Subject (ID del usuario)
            username: user.username,
            entityId: user.entity_id,
            entityType: user.entity_type,
            userType: user.user_type,
            email: user.email,
        };

        // Generar y retornar el token JWT
        return this.jwtService.sign(payload);
    }


}
