import { Body, Controller, Get, Logger, Param, Post, Put, UseGuards } from "@nestjs/common";
import { CreateApiClient } from "../dto/create-api-client.dto";
import { AdminService } from "../services/admin.service";
import { ApiResponseWeb } from "../../../common/interfaces/api-response-web.interface";
import { UpdateApiClient } from "../dto/update-api-client.dto";
import { CreateUser } from "../dto/create-user.dto";
import { UpdateUser } from "../dto/update-user.dto";
import { UpdateUserMovil } from "../dto/update-user-movil.dto";
import { CreateUserMovil } from "../dto/create-user-movil.dto";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { User } from "../../../database/entities/users.entity";

/**
 * AdminController - Endpoints de administración para usuarios web
 * Protegido con JwtAuthGuard - requiere token de usuario web
 */
@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
    private readonly logger = new Logger(AdminController.name);

    constructor(
        private readonly adminService: AdminService,  
    ) { }

    @Get('users-web')
    async getUsers(): Promise<ApiResponseWeb<any>> {
        this.logger.log('Obteniendo lista de usuarios');
        const data =  await this.adminService.getUsersWeb();
        return {
            success: true,
            message: 'Usuarios obtenidos exitosamente',
            data
        };
    }

    @Get('users-web/:id')
    async getUser(@Param('id') id: string): Promise<ApiResponseWeb<any>> {
        this.logger.log(`Obteniendo información del usuario con ID: ${id}`);
        const data = await this.adminService.getUserWeb(Number(id));
        if (data) {
            return {
                success: true,
                message: 'Usuario obtenido exitosamente',
                data
            };
        } else {
            return {
                success: false,
                message: 'Usuario no encontrado',
                data: null,
            };
        }
    }

    @Post('users-web')
    async createUser(@Body() createUserDto: CreateUser): Promise<ApiResponseWeb<any>> {
        this.logger.log(`Creando nuevo usuario con username: ${createUserDto.username}`);
        try {
            const data = await this.adminService.createUserWeb(createUserDto);
            return {
                success: true,
                message: 'Usuario creado exitosamente',
                data,
            }
        } catch (error) {
            return {
                success: false,
                message: error.message,
                data: null,
            }
        }
    }

    @Put('users-web/:id')
    async updateUser(@Param('id') id: string, @Body() updateUserDto: UpdateUser): Promise<ApiResponseWeb<any>> {
        this.logger.log(`Actualizando usuario con ID: ${id}`);
        try {
            const data = await this.adminService.updateUserWeb(Number(id), updateUserDto);
            return {
                success: true,
                message: 'Usuario actualizado exitosamente',
                data,
            }
        }catch (error) {
            return {
                success: false,
                message: error.message,
                data: null,
            }
        }
    }

    @Get('users-movil')
    async getUsersMovil(): Promise<ApiResponseWeb<any>> {
        this.logger.log('Obteniendo lista de usuarios movil');
        const data =  await this.adminService.getUsersMovil();
        return {
            success: true,
            message: 'Usuarios movil obtenidos exitosamente',
            data
        };
    }

    @Get('users-movil/:id')
    async getUserMovil(@Param('id') id: string): Promise<ApiResponseWeb<any>> {
        this.logger.log(`Obteniendo información del usuario con ID: ${id}`);
        const data = await this.adminService.getUserMovil(Number(id));
        if (data){
            return {
                success: true,
                message: 'Usuario movil obtenido exitosamente',
                data
            };
        } else {
            return {
                success: false,
                message: 'Usuario movil no encontrado',
                data: null,
            };
        }
    }

    @Post('users-movil')
    async createUserMovil(@Body() createUserDto: CreateUserMovil): Promise<ApiResponseWeb<any>> {
        this.logger.log(`Creando nuevo usuario movil con username: ${createUserDto.username}`);
        try {
            const data = await this.adminService.createUserMovil(createUserDto);
            return {
                success: true,
                message: 'Usuario movil creado exitosamente',
                data,
            }
        } catch (error) {
            return {
                success: false,
                message: error.message,
                data: null,
            }
        }
    }

    @Put('users-movil/:id')
    async updateUserMovil(@Param('id') id: string, @Body() updateUserDto: UpdateUserMovil): Promise<ApiResponseWeb<any>> {
        this.logger.log(`Actualizando usuario movil con ID: ${id}`);
        try {
            const data = await this.adminService.updateUserMovil(Number(id), updateUserDto);
            return {
                success: true,
                message: 'Usuario movil actualizado exitosamente',
                data,
            }
        }catch (error) {
            return {
                success: false,
                message: error.message,
                data: null,
            }
        }
    }

    @Get('api-client')
    async getApiClient(): Promise<ApiResponseWeb<any>> {
        this.logger.log('Obteniendo información del cliente API');
        const data = await this.adminService.getApiClients();
        return {
            success: true,
            message: 'Clientes API obtenidos exitosamente',
            data
        };
    }

    @Get('api-client/:id')
    async getApiClientById(@Param('id') id: string): Promise<ApiResponseWeb<any>> {
        this.logger.log(`Obteniendo información del cliente API con ID: ${id}`);
        const data = await this.adminService.getApiClientInfo(Number(id));
        if (data) {
            return {
                success: true,
                message: 'Cliente API obtenido exitosamente',
                data
            };
        }else {
            return {
                success: false,
                message: 'Cliente API no encontrado',
                data: null,
            };
        }
    }

    @Post('api-client')
    async createApiClient(@Body() createApiClientDto: CreateApiClient): Promise<ApiResponseWeb<any>> {
        this.logger.log(`Creando nuevo cliente API con nombre: ${createApiClientDto.name}`);
        try {
            const { plainApiKey, ...dataCreate } = await this.adminService.createApiClient(createApiClientDto);
            return {
                success: true,
                message: 'Cliente API creado exitosamente',
                data: {
                    dataCreate,
                    apiKey: plainApiKey
                }
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
                data: null,
            }
        }
    }

    @Put('api-client/:id')
    async updateApiClient(@Param('id') id: string, @Body() updateApiClientDto: UpdateApiClient): Promise<ApiResponseWeb<any>> {
        this.logger.log(`Actualizando cliente API con ID: ${id}`);
        try {
            const dataUpdate = await this.adminService.updateApiClient(Number(id), updateApiClientDto);
            return {
                success: true,
                message: 'Cliente API actualizado exitosamente',
                data: dataUpdate,
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
                data: null,
            }
        }
    }

    @Get('payment-notify')
    async paymentsNotify(): Promise<ApiResponseWeb<any>> {
        this.logger.log('Obteniendo lista de notificaciones de pago');
        const data = await this.adminService.getPaymentNotifications();
        return {
            success: true,
            message: 'Notificaciones de pago obtenidas exitosamente',
            data,
        };
    }

    @Get('payment-notify/:id')
    async paymentNotifyById(@Param('id') id: string): Promise<ApiResponseWeb<any>> {
        this.logger.log(`Obteniendo notificación de pago con ID: ${id}`);
        const data = await this.adminService.getPaymentNotificationById(Number(id));
        if (data) {
            return {
                success: true,
                message: 'Notificación de pago obtenida exitosamente',
                data,
            };
        } else {
            return {
                success: false,
                message: 'Notificación de pago no encontrada',
                data: null,
            };
        }
    }

    @Get('exchange-rate')
    async getExchangeRate(): Promise<ApiResponseWeb<any>> {
        this.logger.log('Obteniendo tipo de cambio activo');
        try {
            const exchangeRate = await this.adminService.getExchangeRate();
            return {
                success: true,
                message: 'Tipo de cambio obtenido exitosamente',
                data: {
                    exchangeRate: exchangeRate
                },
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
                data: null,
            }
        }
        
    }
}