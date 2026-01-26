import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Query,
    UseGuards,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { ApiKeyAuthGuard } from '../../../common/guards/api-key-auth.guard';
import { CurrentApiClient } from '../../../common/decorators/current-api-client.decorator';
import { ApiClient } from '../../../database/entities/api-client.entity';
import { ExternalApiService } from '../services/external-api.service';
import { PaymentNotificationDto } from '../dto/payment-notification.dto';
import { ExternalApiResponse } from '../interfaces/external-api-response.interface';
import { BnbService } from '../services/bnb.service';
import { ConfigService } from '@nestjs/config';

@Controller('external')
@UseGuards(ApiKeyAuthGuard)
export class ExternalApiController {
    private readonly logger = new Logger(ExternalApiController.name);

    constructor(
        private readonly externalApiService: ExternalApiService,
        private readonly bnbService: BnbService,
        private readonly configService: ConfigService,
    ) { }

    @Get('debtors')
    async findDebtorsByDocument(
        @Query('method') method: string,
        @Query('document') document: string,
        @CurrentApiClient() client: ApiClient,
    ): Promise<ExternalApiResponse<any>> {
        const requestId = this.externalApiService.generateRequestId();
        this.logger.log(`[${requestId}] ${client.name} - Buscando deudores por documento: ${document}`);

        try {
            if (!document || document.length === 0) {
                return this.createResponse(requestId, false, 'INVALID_DATA', 'Documento requerido', null);
            }

            const debtors = await this.externalApiService.findDebtorsByDocument(method, document);

            if (debtors.length === 0) {
                return this.createResponse(requestId, true, 'NOT_FOUND', 'No se encontraron deudores', []);
            }

            return this.createResponse(requestId, true, 'OK', 'Deudores encontrados', debtors);
        } catch (error) {
            this.logger.error(`[${requestId}] Error: ${error.message}`);
            return this.createResponse(requestId, false, 'ERROR', 'Error interno', null);
        }
    }

    @Get('students/:studentCode/debts')
    async getStudentDebts(
        @Param('studentCode') studentCode: string,
        @CurrentApiClient() client: ApiClient,
    ): Promise<ExternalApiResponse<any>> {
        const requestId = this.externalApiService.generateRequestId();
        this.logger.log(`[${requestId}] ${client.name} - Obteniendo deudas de estudiante: ${studentCode}`);

        try {
            const debts = await this.externalApiService.getStudentDebts(studentCode);

            if (!debts) {
                return this.createResponse(requestId, true, 'NOT_FOUND', 'No hay deudas pendientes', []);
            }

            return this.createResponse(requestId, true, 'OK', 'Deudas encontradas', debts);
        } catch (error) {
            this.logger.error(`[${requestId}] Error: ${error.message}`);
            return this.createResponse(requestId, false, 'ERROR', 'Error interno', null);
        }
    }

    @Get('family/:parentDocument/debts')
    async getFamilyDebts(
        @Param('parentDocument') parentDocument: string,
        @CurrentApiClient() client: ApiClient,
    ): Promise<ExternalApiResponse<any>> {
        const requestId = this.externalApiService.generateRequestId();
        this.logger.log(`[${requestId}] ${client.name} - Obteniendo deudas de familia: ${parentDocument}`);

        try {
            const debts = await this.externalApiService.getFamilyDebts(parentDocument);

            if (!debts) {
                return this.createResponse(requestId, true, 'NOT_FOUND', 'No hay deudas pendientes', []);
            }

            return this.createResponse(requestId, true, 'OK', 'Deudas encontradas', debts);
        } catch (error) {
            this.logger.error(`[${requestId}] Error: ${error.message}`);
            return this.createResponse(requestId, false, 'ERROR', 'Error interno', null);
        }
    }


    @Get('students/:studentCode/debts/priority')
    async getPriorityDebt(
        @Param('studentCode') studentCode: string,
        @CurrentApiClient() client: ApiClient,
    ): Promise<ExternalApiResponse<any>> {
        const requestId = this.externalApiService.generateRequestId();
        this.logger.log(`[${requestId}] ${client.name} - Obteniendo deuda prioritaria: ${studentCode}`);

        try {
            const debt = await this.externalApiService.getPriorityDebt(studentCode);

            if (!debt) {
                return this.createResponse(requestId, true, 'NOT_FOUND', 'No hay deudas pendientes', null);
            }

            return this.createResponse(requestId, true, 'OK', 'Deuda encontrada', debt);
        } catch (error) {
            this.logger.error(`[${requestId}] Error: ${error.message}`);
            return this.createResponse(requestId, false, 'ERROR', 'Error interno', null);
        }
    }

    @Post('payments/notify')
    async notifyPayment(
        @Body() dto: PaymentNotificationDto,
        @CurrentApiClient() client: ApiClient,
    ): Promise<ExternalApiResponse<any>> {
        const requestId = this.externalApiService.generateRequestId();
        const studentCount = dto.students?.length || 0;
        const studentCodes = dto.students?.map(s => s.studentCode).join(', ') || 'N/A';

        this.logger.log(`[${requestId}] ${client.name} - Notificación de pago recibida: ${dto.transactionId} | Padre: ${dto.parentCardCode} | Estudiantes: ${studentCount} (${studentCodes})`);

        try {
            // Validar que hay estudiantes
            if (!dto.students || dto.students.length === 0) {
                return this.createResponse(
                    requestId,
                    false,
                    'INVALID_DATA',
                    'Debe incluir al menos un estudiante con líneas de pago',
                    null,
                );
            }

            // Validar idempotencia de forma sincrónica
            let existingNotification = null;
            // Si el transactionId es null o vacio, no se puede validar idempotencia
            if (dto.transactionId && dto.transactionId.length > 0) {
                existingNotification = await this.externalApiService.checkExistingNotification(dto.transactionId);
            }

            if (existingNotification) {
                this.logger.log(`[${requestId}] Pago ya procesado: ${dto.transactionId}`);
                return this.createResponse(
                    requestId,
                    true,
                    'ALREADY_PROCESSED',
                    'El pago ya fue procesado anteriormente',
                    existingNotification,
                );
            }

            let totalAmount = 0;
            dto.students.forEach(student => {
                totalAmount += student.orderLines.reduce((total, orderLine) => total + orderLine.amount, 0);
            });

            // Crear registro inicial de la notificación (sincrónico)
            const initialNotification = await this.externalApiService.createInitialNotification(dto, client.id, totalAmount);

            // Iniciar procesamiento en background
            this.externalApiService.processPaymentNotificationAsync(dto, client.id, requestId, totalAmount).catch((error) => {
                this.logger.error(`[${requestId}] Error en procesamiento async: ${error.message}`);
            });

            // Retornar inmediatamente con estado ACCEPTED
            return this.createResponse(
                requestId,
                true,
                'OK',
                'Notificación recibida.',
                {
                    internalId: initialNotification.id,
                    transactionId: dto.transactionId,
                    parentCardCode: dto.parentCardCode,
                    studentCount,
                    studentCodes,
                    totalAmount,
                },
            );
        } catch (error) {
            this.logger.error(`[${requestId}] Error: ${error.message}`);
            return this.createResponse(
                requestId,
                false,
                'ERROR',
                `Error al recibir notificación: ${error.message}`,
                null,
            );
        }
    }

    /**
     * Obtener estado actual de una notificación de pago
     * GET /api/external/payments/:transactionId/status
     */
    @Get('payments/:transactionId/status')
    async getPaymentStatus(
        @Param('transactionId') transactionId: string,
        @CurrentApiClient() client: ApiClient,
    ): Promise<ExternalApiResponse<any>> {
        const requestId = this.externalApiService.generateRequestId();
        this.logger.log(`[${requestId}] Consultando estado de pago: ${transactionId}`);

        try {
            const notification = await this.externalApiService.getNotificationStatus(transactionId);

            if (!notification) {
                return this.createResponse(
                    requestId,
                    false,
                    'NOT_FOUND',
                    'Notificación no encontrada',
                    null,
                );
            }

            return this.createResponse(
                requestId,
                true,
                'OK',
                `Estado actual: ${notification.status}`,
                notification,
            );
        } catch (error) {
            this.logger.error(`[${requestId}] Error: ${error.message}`);
            return this.createResponse(requestId, false, 'ERROR', 'Error consultando estado', null);
        }
    }

    /**
     * Health check del servicio
     * GET /api/external/health
     */
    @Get('health')
    async healthCheck(
        @CurrentApiClient() client: ApiClient,
    ): Promise<ExternalApiResponse<any>> {
        const requestId = this.externalApiService.generateRequestId();

        return this.createResponse(requestId, true, 'OK', 'Servicio disponible', {
            service: 'external-api',
            client: client.name,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * GET /api/external/bnb/test
     */
    @Get('bnb/test')
    async testBnbConnection(): Promise<any> {
        const requestId = this.externalApiService.generateRequestId();
        this.logger.log(`[${requestId}] Testing BNB connection...`);

        try {
            // Información de configuración (sin exponer credenciales completas)
            const config = {
                url: this.configService.get('BNB_API_URL'),
                accountId: this.configService.get('BNB_ACCOUNT_ID')?.substring(0, 10) + '...',
                authIdConfigured: !!this.configService.get('BNB_AUTH_ID'),
            };

            this.logger.log(`[${requestId}] BNB Config: ${JSON.stringify(config)}`);

            // Intentar autenticarse
            const result = await this.bnbService.authenticate();

            return {
                success: true,
                message: 'Conexión exitosa con BNB',
                requestId,
                config,
                tokenReceived: !!result,
                tokenPreview: result?.substring(0, 20) + '...',
            };
        } catch (error) {
            this.logger.error(`[${requestId}] BNB test failed: ${error.message}`);

            return {
                success: false,
                message: 'Error conectando con BNB',
                requestId,
                error: error.message,
                config: {
                    url: this.configService.get('BNB_API_URL'),
                    accountIdConfigured: !!this.configService.get('BNB_ACCOUNT_ID'),
                    authIdConfigured: !!this.configService.get('BNB_AUTH_ID'),
                },
            };
        }
    }

    /**
     * Helper para crear respuestas estandarizadas
     */
    private createResponse<T>(
        requestId: string,
        success: boolean,
        code: string,
        message: string,
        data: T,
    ): ExternalApiResponse<T> {
        return {
            success,
            code,
            message,
            timestamp: new Date().toISOString(),
            requestId,
            data,
        };
    }
}
