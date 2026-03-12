import { Body, Controller, Get, HttpException, HttpStatus, Logger, Param, Post, Put, UseGuards } from "@nestjs/common";
import { CreateApiClient } from "../dto/create-api-client.dto";
import { AdminService } from "../services/admin.service";
import { ApiResponse } from "../../../common/interfaces/api-response.interface";
import { UpdateApiClient } from "../dto/update-api-client.dto";
import { CreateUser } from "../dto/create-user.dto";
import { UpdateUser } from "../dto/update-user.dto";
import { UpdateUserMovil } from "../dto/update-user-movil.dto";
import { CreateUserMovil } from "../dto/create-user-movil.dto";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { User } from "../../../database/entities/users.entity";
import { CreateRol } from "../dto/create-rol.dto";
import { UpdateRol } from "../dto/update-rol.dto";
import { GenerateQrDto } from "../dto/generate-qr.dto";

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
    async getUsers(): Promise<ApiResponse> {
        this.logger.log('Obteniendo lista de usuarios');
        const data = await this.adminService.getUsersWeb();
        return {
            status: 'success',
            message: 'Usuarios obtenidos exitosamente',
            data
        };
    }

    @Get('users-web/:id')
    async getUser(@Param('id') id: string): Promise<ApiResponse> {
        this.logger.log(`Obteniendo información del usuario con ID: ${id}`);
        const data = await this.adminService.getUserWeb(Number(id));
        if (data) {
            return {
                status: 'success',
                message: 'Usuario obtenido exitosamente',
                data
            };
        } else {
            return {
                status: 'error',
                message: 'Usuario no encontrado',
                data: null,
            };
        }
    }

    @Post('users-web')
    async createUser(@Body() createUserDto: CreateUser): Promise<ApiResponse> {
        this.logger.log(`Creando nuevo usuario con username: ${createUserDto.username}`);
        try {
            const data = await this.adminService.createUserWeb(createUserDto);
            return {
                status: 'success',
                message: 'Usuario creado exitosamente',
                data,
            }
        } catch (error) {
            return {
                status: 'error',
                message: error.message,
                data: null,
            }
        }
    }

    @Put('users-web/:id')
    async updateUser(@Param('id') id: string, @Body() updateUserDto: UpdateUser): Promise<ApiResponse> {
        this.logger.log(`Actualizando usuario con ID: ${id}`);
        try {
            const data = await this.adminService.updateUserWeb(Number(id), updateUserDto);
            return {
                status: 'success',
                message: 'Usuario actualizado exitosamente',
                data,
            }
        } catch (error) {
            return {
                status: 'error',
                message: error.message,
                data: null,
            }
        }
    }

    @Get('users-movil')
    async getUsersMovil(): Promise<ApiResponse> {
        this.logger.log('Obteniendo lista de usuarios movil');
        const data = await this.adminService.getUsersMovil();
        return {
            status: 'success',
            message: 'Usuarios movil obtenidos exitosamente',
            data
        };
    }

    @Get('users-movil/:id')
    async getUserMovil(@Param('id') id: string): Promise<ApiResponse> {
        this.logger.log(`Obteniendo información del usuario con ID: ${id}`);
        const data = await this.adminService.getUserMovil(Number(id));
        if (data) {
            return {
                status: 'success',
                message: 'Usuario movil obtenido exitosamente',
                data
            };
        } else {
            return {
                status: 'error',
                message: 'Usuario movil no encontrado',
                data: null,
            };
        }
    }

    @Post('users-movil')
    async createUserMovil(@Body() createUserDto: CreateUserMovil): Promise<ApiResponse> {
        this.logger.log(`Creando nuevo usuario movil con username: ${createUserDto.username}`);
        try {
            const data = await this.adminService.createUserMovil(createUserDto);
            return {
                status: 'success',
                message: 'Usuario movil creado exitosamente',
                data,
            }
        } catch (error) {
            return {
                status: 'error',
                message: error.message,
                data: null,
            }
        }
    }

    @Put('users-movil/:id')
    async updateUserMovil(@Param('id') id: string, @Body() updateUserDto: UpdateUserMovil): Promise<ApiResponse> {
        this.logger.log(`Actualizando usuario movil con ID: ${id}`);
        try {
            const data = await this.adminService.updateUserMovil(Number(id), updateUserDto);
            return {
                status: 'success',
                message: 'Usuario movil actualizado exitosamente',
                data,
            }
        } catch (error) {
            return {
                status: 'error',
                message: error.message,
                data: null,
            }
        }
    }

    @Get('api-client')
    async getApiClient(): Promise<ApiResponse> {
        this.logger.log('Obteniendo información del cliente API');
        const data = await this.adminService.getApiClients();
        return {
            status: 'success',
            message: 'Clientes API obtenidos exitosamente',
            data
        };
    }

    @Get('api-client/:id')
    async getApiClientById(@Param('id') id: string): Promise<ApiResponse> {
        this.logger.log(`Obteniendo información del cliente API con ID: ${id}`);
        const data = await this.adminService.getApiClientInfo(Number(id));
        if (data) {
            return {
                status: 'success',
                message: 'Cliente API obtenido exitosamente',
                data
            };
        } else {
            return {
                status: 'error',
                message: 'Cliente API no encontrado',
                data: null,
            };
        }
    }

    @Post('api-client')
    async createApiClient(@Body() createApiClientDto: CreateApiClient): Promise<ApiResponse> {
        this.logger.log(`Creando nuevo cliente API con nombre: ${createApiClientDto.name}`);
        try {
            const { plainApiKey, ...dataCreate } = await this.adminService.createApiClient(createApiClientDto);
            return {
                status: 'success',
                message: 'Cliente API creado exitosamente',
                data: {
                    dataCreate,
                    apiKey: plainApiKey
                }
            };
        } catch (error) {
            return {
                status: 'error',
                message: error.message,
                data: null,
            }
        }
    }

    @Put('api-client/:id')
    async updateApiClient(@Param('id') id: string, @Body() updateApiClientDto: UpdateApiClient): Promise<ApiResponse> {
        this.logger.log(`Actualizando cliente API con ID: ${id}`);
        try {
            const dataUpdate = await this.adminService.updateApiClient(Number(id), updateApiClientDto);
            return {
                status: 'success',
                message: 'Cliente API actualizado exitosamente',
                data: dataUpdate,
            };
        } catch (error) {
            return {
                status: 'error',
                message: error.message,
                data: null,
            }
        }
    }

    @Get('payment-notify')
    async paymentsNotify(): Promise<ApiResponse> {
        this.logger.log('Obteniendo lista de notificaciones de pago');
        const data = await this.adminService.getPaymentNotifications();
        return {
            status: 'success',
            message: 'Notificaciones de pago obtenidas exitosamente',
            data,
        };
    }

    @Get('payment-notify/:id')
    async paymentNotifyById(@Param('id') id: string): Promise<ApiResponse> {
        this.logger.log(`Obteniendo notificación de pago con ID: ${id}`);
        const data = await this.adminService.getPaymentNotificationById(Number(id));
        if (data) {
            return {
                status: 'success',
                message: 'Notificación de pago obtenida exitosamente',
                data,
            };
        } else {
            return {
                status: 'error',
                message: 'Notificación de pago no encontrada',
                data: null,
            };
        }
    }

    @Get('exchange-rate')
    async getExchangeRate(): Promise<ApiResponse> {
        this.logger.log('Obteniendo tipo de cambio activo');
        try {
            const exchangeRate = await this.adminService.getExchangeRate();
            return {
                status: 'success',
                message: 'Tipo de cambio obtenido exitosamente',
                data: {
                    exchangeRate: exchangeRate
                },
            };
        } catch (error) {
            return {
                status: 'error',
                message: error.message,
                data: null,
            }
        }

    }

    @Get('roles')
    async getRoles(): Promise<ApiResponse> {
        this.logger.log('Obteniendo lista de roles');
        try {
            const data = await this.adminService.getRoles();
            return {
                status: 'success',
                message: 'Roles obtenidos exitosamente',
                data,
            };
        } catch (error) {
            return {
                status: 'error',
                message: error.message,
                data: null,
            }
        }
    }

    @Post('rol')
    async createRol(@Body() createRolDto: CreateRol): Promise<ApiResponse> {
        this.logger.log(`Creando nuevo rol con descripción: ${createRolDto.description}`);
        try {
            const data = await this.adminService.createRol(createRolDto.description);
            return {
                status: 'success',
                message: 'Rol creado exitosamente',
                data,
            };
        } catch (error) {
            return {
                status: 'error',
                message: error.message,
                data: null,
            }
        }
    }

    @Put('rol/:id')
    async updateRol(@Param('id') id: string, @Body() updateRolDto: UpdateRol): Promise<ApiResponse> {
        this.logger.log(`Actualizando rol con ID: ${id}`);
        try {
            const data = await this.adminService.updateRol(Number(id), updateRolDto.description);
            return {
                status: 'success',
                message: 'Rol actualizado exitosamente',
                data,
            };
        } catch (error) {
            return {
                status: 'error',
                message: error.message,
                data: null,
            }
        }

    }
}