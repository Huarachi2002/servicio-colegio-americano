import { ConflictException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ApiClient } from "src/database/entities/api-client.entity";
import { User } from "src/database/entities/users.entity";
import { Repository } from "typeorm";
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { CreateApiClient } from "../dto/create-api-client.dto";
import { UpdateApiClient } from "../dto/update-api-client.dto";
import { CreateUser } from "../dto/create-user.dto";
import { UpdateUser } from "../dto/update-user.dto";
import { MobileUser } from "src/database/entities/mobile-user.entity";
import { CreateUserMovil } from "../dto/create-user-movil.dto";
import { UpdateUserMovil } from "../dto/update-user-movil.dto";
import { PaymentNotification } from "src/database/entities/payment-notification.entity";
import { ExchangeRate } from "src/database/entities/exchange-rate.entity";
import { CustomLoggerService } from "src/common/logger";
import { Rol } from "src/database/entities/roles.entity";


@Injectable()
export class AdminService {
    private readonly logger: CustomLoggerService;

    constructor(
        @InjectRepository(ApiClient)
        private readonly apiClientRepository: Repository<ApiClient>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,  
        @InjectRepository(MobileUser)
        private readonly mobileUserRepository: Repository<MobileUser>,
        @InjectRepository(PaymentNotification)
        private readonly paymentNotificationRepository: Repository<PaymentNotification>,
        @InjectRepository(ExchangeRate)
        private readonly exchangeRateRepository: Repository<ExchangeRate>,
        @InjectRepository(Rol)
        private readonly rolRepository: Repository<Rol>,
        private readonly customLogger: CustomLoggerService,
    ) { 
        this.logger = this.customLogger.setContext(AdminService.name);
    }

    async getUsersWeb(): Promise<User[]> {
        this.logger.log('Obteniendo lista de usuarios');
        return await this.userRepository.find();
    }

    async getUserWeb(userId: number): Promise<User | null> {
        this.logger.log(`Obteniendo información del usuario para userId: ${userId}`);
        return await this.userRepository.findOne({ where: { id: userId } });
    }

    async createUserWeb(userData: CreateUser): Promise<User> {
        this.logger.log(`Creando nuevo usuario: ${userData.username}`);
        const existingUser = await this.userRepository.findOne({ where: { username: userData.username } });
        if (existingUser) {
            throw new ConflictException(`Usuario con username '${userData.username}' ya existe.`);
        }
        this.logger.log(`No existe usuario con username '${userData.username}', procediendo a crear.`);
        const rol = await this.rolRepository.findOne({ where: { id: userData.roleId } });
        if (!rol) {
            throw new NotFoundException(`Rol con ID '${userData.roleId}' no encontrado.`);
        }
        const newUser = this.userRepository.create(userData);
        newUser.rol = rol;
        newUser.type = rol.description.toLowerCase();
        newUser.password = await bcrypt.hash(newUser.password, 10);
        return await this.userRepository.save(newUser);
    }

    async updateUserWeb(userId: number, userData: UpdateUser): Promise<User> {
        this.logger.log(`Actualizando usuario ID: ${userId}`);
        const existingUser = await this.userRepository.findOne({ where: { id: userId } });
        if (!existingUser) {
            throw new NotFoundException(`Usuario con ID '${userId}' no encontrado.`);
        }   
        this.logger.log(`Usuario con ID '${userId}' encontrado, procediendo a actualizar.`);
        Object.assign(existingUser, userData);
        if (userData.roleId) {
            const rol = await this.rolRepository.findOne({ where: { id: userData.roleId } });
            if (!rol) {
                throw new NotFoundException(`Rol con ID '${userData.roleId}' no encontrado.`);
            }
            existingUser.rol = rol;
            existingUser.password = userData.password ? await bcrypt.hash(userData.password, 10) : existingUser.password;
            existingUser.type = rol.description.toLowerCase();
        }
        return await this.userRepository.save(existingUser);
    }

    async getUsersMovil(): Promise<MobileUser[]> {
        this.logger.log('Obteniendo lista de usuarios movil');
        return await this.mobileUserRepository.find();
    }

    async getUserMovil(userId: number): Promise<MobileUser | null> {
        this.logger.log(`Obteniendo información del usuario movil para userId: ${userId}`);
        return await this.mobileUserRepository.findOne({ where: { id: userId } });
    }

    async createUserMovil(userData: CreateUserMovil): Promise<MobileUser> {
        this.logger.log(`Creando nuevo usuario: ${userData.username}`);
        const existingUserMovil = await this.mobileUserRepository.findOne({ where: { username: userData.username } });
        if (existingUserMovil) {
            throw new ConflictException(`Usuario movil con username '${userData.username}' ya existe.`);
        }
        this.logger.log(`No existe usuario movil con username '${userData.username}', procediendo a crear.`);
        const newUser = this.mobileUserRepository.create(userData);
        return await this.mobileUserRepository.save(newUser);
    }

    async updateUserMovil(userId: number, userData: UpdateUserMovil): Promise<MobileUser> {
        this.logger.log(`Actualizando usuario movil ID: ${userId}`);
        const existingUser = await this.mobileUserRepository.findOne({ where: { id: userId } });
        if (!existingUser) {
            throw new NotFoundException(`Usuario movil con ID '${userId}' no encontrado.`);
        }   
        this.logger.log(`Usuario movil con ID '${userId}' encontrado, procediendo a actualizar.`);
        Object.assign(existingUser, userData);
        return await this.mobileUserRepository.save(existingUser);
    }

    async getApiClientInfo(clientId: number): Promise<ApiClient | null> {
        this.logger.log(`Obteniendo información del cliente API para clientId: ${clientId}`);
        return await this.apiClientRepository.findOne({ where: { id: clientId } });
    }

    async getApiClients(): Promise<ApiClient[]> {
        this.logger.log('Obteniendo lista de clientes API');
        return await this.apiClientRepository.find();
    }

    async createApiClient(apiClient: CreateApiClient): Promise<ApiClient & { plainApiKey: string }> {
        this.logger.log(`Creando nuevo cliente API: ${apiClient.name}`);

        const existingClient = await this.apiClientRepository.findOne({ where: { name: apiClient.name } });
        if (existingClient) {
            throw new ConflictException(`Cliente API con nombre '${apiClient.name}' ya existe.`);
        }

        // Generar API Key y su hash
        const { plainApiKey, hashedApiKey } = this.generateApiKeyWithHash();
        this.logger.log(`API Key generada para nuevo cliente API: ${apiClient.name}`);
        
        const dataCliente = {
            name: apiClient.name,
            apiSecret: hashedApiKey,
            allowedIps: apiClient.allowedIps || null,
            active: true,
            rateLimit: apiClient.rateLimit || 100
        }

        this.logger.log(`Creando registro en base de datos para cliente API: ${apiClient.name}`);

        const newClient = this.apiClientRepository.create(dataCliente);
        const savedClient = await this.apiClientRepository.save(newClient);
        this.logger.log(`Cliente API creado exitosamente: ${apiClient.name}`);
        return Object.assign(savedClient, { plainApiKey });
    }

    async updateApiClient(id:number, apiClient: UpdateApiClient): Promise<ApiClient> {
        this.logger.log(`Actualizando cliente API: ${apiClient.name}`);
        const existingClient = await this.apiClientRepository.findOne({ where: { id } });
        if (!existingClient) {
            throw new NotFoundException(`Cliente API con ID '${id}' no encontrado.`);
        }
        this.logger.log(`Cliente API con ID '${id}' encontrado, procediendo a actualizar.`);
        Object.assign(existingClient, apiClient);
        return await this.apiClientRepository.save(existingClient);
    }   

    async getPaymentNotifications(): Promise<PaymentNotification[]> {
        this.logger.log('Obteniendo lista de notificaciones de pago');
        return await this.paymentNotificationRepository.find();
    }

    async getPaymentNotificationById(notificationId: number): Promise<PaymentNotification | null> {
        this.logger.log(`Obteniendo notificación de pago para ID: ${notificationId}`);
        return await this.paymentNotificationRepository.findOne({ where: { id: notificationId } });
    }

    async getExchangeRate(): Promise<number> {
        this.logger.log('Obteniendo tipo de cambio activo');
        const activeExchangeRate = await this.exchangeRateRepository.findOne({ where: { enabled: true } });
        if (!activeExchangeRate) {
            throw new NotFoundException('Tipo de cambio activo no encontrado.');
        }
        return activeExchangeRate.exchangeRate;
    }

    async getRoles(): Promise<Rol[]> {
        this.logger.log('Obteniendo lista de roles');
        return await this.rolRepository.find();
    }

    async createRol(description: string): Promise<Rol> {
        this.logger.log(`Creando nuevo rol: ${description}`);
        const existingRol = await this.rolRepository.findOne({ where: { description } });
        if (existingRol) {
            throw new ConflictException(`Rol con descripción '${description}' ya existe.`);
        }
        this.logger.log(`No existe rol con descripción '${description}', procediendo a crear.`);
        const newRol = this.rolRepository.create({ description });
        return await this.rolRepository.save(newRol);
    }

    async updateRol(id: number, description: string): Promise<Rol> {
        this.logger.log(`Actualizando rol ID: ${id} con nueva descripción: ${description}`);
        const existingRol = await this.rolRepository.findOne({ where: { id } });
        if (!existingRol) {
            throw new NotFoundException(`Rol con ID '${id}' no encontrado.`);
        }
        this.logger.log(`Rol con ID '${id}' encontrado, procediendo a actualizar.`);
        existingRol.description = description;
        return await this.rolRepository.save(existingRol);
    }

    private generateApiKeyWithHash(): { plainApiKey: string; hashedApiKey: string } {
        // Generar API Key aleatorio
        this.logger.log('Generando nueva API Key');
        const plainApiKey = crypto.randomBytes(32).toString('hex');
        // Hashear con SHA256 para almacenar en BD (mismo hash siempre = búsqueda directa)
        const hashedApiKey = crypto.createHash('sha256').update(plainApiKey).digest('hex');
        this.logger.log('API Key generada y hasheada exitosamente');
        return { plainApiKey, hashedApiKey };
    }

    /**
     * Regenerar API Key para un cliente existente
     * @returns El nuevo API Key en texto plano (solo visible una vez)
     */
    async regenerateApiKey(clientId: number): Promise<{ client: ApiClient; plainApiKey: string }> {
        const client = await this.apiClientRepository.findOne({ where: { id: clientId } });
        if (!client) {
            throw new NotFoundException(`Cliente API con ID '${clientId}' no encontrado.`);
        }
        this.logger.log(`Regenerando API Key para cliente: ${client.name}`);

        const { plainApiKey, hashedApiKey } = this.generateApiKeyWithHash();
        client.apiSecret = hashedApiKey;
        const savedClient = await this.apiClientRepository.save(client);

        this.logger.log(`API Key regenerada para cliente: ${client.name}`);
        return { client: savedClient, plainApiKey };
    }
}