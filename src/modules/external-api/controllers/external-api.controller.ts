import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Query,
    UseGuards,
    Logger,
} from '@nestjs/common';
import { ApiKeyAuthGuard } from '../../../common/guards/api-key-auth.guard';
import { CurrentApiClient } from '../../../common/decorators/current-api-client.decorator';
import { ApiClient } from '../../../database/entities/api-client.entity';
import { ExternalApiService } from '../services/external-api.service';
import { PaymentNotificationDto } from '../dto/payment-notification.dto';
import { ExternalApiResponse } from '../interfaces/external-api-response.interface';
import { ReceiveNotificationBnbDto } from '../dto/receive-notificaction-bnb.dto';

@Controller('external')
@UseGuards(ApiKeyAuthGuard)
export class ExternalApiController {
    private readonly logger = new Logger(ExternalApiController.name);

    constructor(
        private readonly externalApiService: ExternalApiService,
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

    @Get('payments_plan/:parentDocument')
    async getPlanPayments(
        @Param('parentDocument') parentDocument: string,
        @CurrentApiClient() client: ApiClient,
    ): Promise<ExternalApiResponse<any>> {
        const requestId = this.externalApiService.generateRequestId();
        this.logger.log(`[${requestId}] ${client.name} - Obteniendo planes de pago: ${parentDocument}`);

        try {
            const plan_payments = await this.externalApiService.getPlanPayments(parentDocument);

            if (!plan_payments) {
                return this.createResponse(requestId, true, 'NOT_FOUND', 'No hay deudas pendientes', []);
            }

            return this.createResponse(requestId, true, 'OK', 'Deudas encontradas', plan_payments);
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
            this.externalApiService.processPaymentNotificationConnector(dto, client.id, requestId, initialNotification.id).catch((error) => {
                this.logger.error(`[${requestId}] Error en procesamiento async: ${error.message}`);
            });

            // Retornar inmediatamente con estado ACCEPTED
            return this.createResponse(
                requestId,
                true,
                'OK',
                'Pago recibido.',
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

    @Post('ReceiveNotification')
    async receiveNotification(
        @Body() dto: ReceiveNotificationBnbDto,
        @CurrentApiClient() client: ApiClient,
    ): Promise<any> {
        const requestId = this.externalApiService.generateRequestId();
        try {
            this.logger.log(`[${requestId}] Recibiendo notificación de pago: ${dto.QRId}`);
            const dataPayment = await this.externalApiService.getPaymentInformationByQr(dto.QRId);
            if (!dataPayment) {
                return {
                    success: false,
                    message: "No se encontro el pago"
                }
            }
            let totalAmount = 0;
            dataPayment.students.forEach(student => {
                totalAmount += student.orderLines.reduce((total, orderLine) => total + orderLine.amount, 0);
            });

            const initialNotification = await this.externalApiService.createInitialNotification(dataPayment, client.id, totalAmount)
            this.externalApiService.processPaymentNotificationConnector(dataPayment, client.id, requestId, initialNotification.id).catch((error) => {
                this.logger.error(`[${requestId}] Error en procesamiento async: ${error.message}`);
            });
            return {
                success: true,
                message: "OK"
            }
        } catch (error) {
            this.logger.error(`[${requestId}] Error al recibir la notificacion: ${error.message}`);
            return {
                success: false,
                message: `Error al recibir la notificacion: ${error.message}`
            }
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
