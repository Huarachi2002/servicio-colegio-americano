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

@Controller('api/external')
@UseGuards(ApiKeyAuthGuard)
export class ExternalApiController {
    private readonly logger = new Logger(ExternalApiController.name);

    constructor(private readonly externalApiService: ExternalApiService) { }

    /**
     * Buscar deudores por CI/NIT del padre (socio de negocio)
     * GET /api/external/debtors?document=12345678
     */
    @Get('debtors')
    async findDebtorsByDocument(
        @Query('document') document: string,
        @CurrentApiClient() client: ApiClient,
    ): Promise<ExternalApiResponse<any>> {
        const requestId = this.externalApiService.generateRequestId();
        this.logger.log(`[${requestId}] ${client.name} - Buscando deudores por documento: ${document}`);

        try {
            if (!document || document.trim().length === 0) {
                return this.createResponse(requestId, false, 'INVALID_DATA', 'Documento requerido', null);
            }

            const debtors = await this.externalApiService.findDebtorsByDocument(document);

            if (debtors.length === 0) {
                return this.createResponse(requestId, true, 'NOT_FOUND', 'No se encontraron deudores', []);
            }

            return this.createResponse(requestId, true, 'OK', 'Deudores encontrados', debtors);
        } catch (error) {
            this.logger.error(`[${requestId}] Error: ${error.message}`);
            return this.createResponse(requestId, false, 'ERROR', 'Error interno', null);
        }
    }

    /**
     * Listar todas las deudas pendientes de un estudiante
     * GET /api/external/students/:studentCode/debts
     */
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

    /**
     * Obtener detalle de la deuda prioritaria (más antigua)
     * GET /api/external/students/:studentCode/debts/priority
     */
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

    /**
     * Webhook: Notificación de pago realizado
     * POST /api/external/payments/notify
     */
    @Post('payments/notify')
    async notifyPayment(
        @Body() dto: PaymentNotificationDto,
        @CurrentApiClient() client: ApiClient,
    ): Promise<ExternalApiResponse<any>> {
        const requestId = this.externalApiService.generateRequestId();
        this.logger.log(`[${requestId}] ${client.name} - Notificación de pago: ${dto.transactionId}`);

        try {
            const result = await this.externalApiService.processPaymentNotification(dto, client.id);

            return this.createResponse(
                requestId,
                result.status !== 'FAILED',
                result.status === 'ALREADY_PROCESSED' ? 'ALREADY_PROCESSED' :
                    result.status === 'PROCESSED' ? 'OK' :
                        result.status === 'RECEIVED' ? 'ACCEPTED' : 'ERROR',
                result.message,
                result,
            );
        } catch (error) {
            this.logger.error(`[${requestId}] Error: ${error.message}`);
            return this.createResponse(requestId, false, 'ERROR', `Error procesando pago: ${error.message}`, null);
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
