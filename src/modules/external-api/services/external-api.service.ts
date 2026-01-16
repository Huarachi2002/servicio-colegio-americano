import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { PaymentNotification } from '../../../database/entities/payment-notification.entity';
import { SapService } from '../../integrations/sap/services/sap.service';
import { SapDebtService } from '../../integrations/sap/services/sap-debt.service';
import { SapServiceLayerService } from '../../integrations/sap/services/sap-service-layer.service';
import { PaymentNotificationDto, consolidateOrderLines, getStudentCodesString } from '../dto/payment-notification.dto';
import {
    DebtorInfo,
    PaymentConfirmation,
} from '../interfaces/external-api-response.interface';
import { DebtConsultationResponse, PendingDebtConsultationResponse } from 'src/modules/integrations/sap/interfaces/debt-consultation.interface';
import { ProcessPaymentDto } from 'src/modules/integrations/sap/interfaces/sap.interface';
import { ApiClient } from 'src/database/entities/api-client.entity';
import { ConfigService } from '@nestjs/config';

/**
 * Servicio para la API externa (bancos y servicios externos)
 */
@Injectable()
export class ExternalApiService {
    private readonly logger = new Logger(ExternalApiService.name);

    constructor(
        @InjectRepository(PaymentNotification)
        private readonly paymentNotificationRepo: Repository<PaymentNotification>,
        @InjectRepository(ApiClient)
        private readonly apiClientRepo: Repository<ApiClient>,
        private readonly sapService: SapService,
        private readonly sapDebtService: SapDebtService,
        private readonly sapServiceLayerService: SapServiceLayerService,
        private readonly configService: ConfigService,
    ) { }

    /**
     * Buscar deudores por method (ciOrNit | codAsociado)
     * Consulta OCRD (Socios de Negocio) y OCPR (Personas de Contacto) en SAP
     */
    async findDebtorsByDocument(method: string, document: string): Promise<DebtorInfo[]> {
        try {
            this.logger.log(`Buscando deudores por documento: ${document}`);
            let filter = '';
            if (method === 'ciOrNit') {
                filter = `(T0.LicTradNum = '${document}')`;
            } else { // method === 'codAsociado'
                filter = `(T0.CardCode = '${document}')`;
            }
            const query = `
                SELECT 
                    T0.CardCode,
                    T0.CardName,
                    T0.LicTradNum as Document,
                    T1.CntctCode,
                    T1.Name as StudentName
                FROM OCRD T0
                INNER JOIN OCPR T1 ON T0.CardCode = T1.CardCode
                WHERE ${filter}
                AND T0.CardType = 'C'
            `;

            const results = await this.sapService.query<any>(query);

            if (!results || results.length === 0) {
                return [];
            }

            // Agrupar por padre
            const debtorsMap = new Map<string, DebtorInfo>();

            for (const row of results) {
                const parentCode = row.CardCode;

                if (!debtorsMap.has(parentCode)) {
                    debtorsMap.set(parentCode, {
                        parentCode,
                        parentName: row.CardName || '',
                        parentDocument: row.Document || '',
                        students: [],
                    });
                }

                const debtor = debtorsMap.get(parentCode)!;
                debtor.students.push({
                    studentCode: row.CntctCode?.toString() || '',
                    studentName: row.StudentName || '',
                    hasPendingDebts: true, // Se podría verificar si tiene deudas
                });
            }

            return Array.from(debtorsMap.values());
        } catch (error) {
            this.logger.error(`Error buscando deudores: ${error.message}`);
            throw error;
        }
    }

    /**
     * Obtener deudas pendientes de un estudiante
     * Usa el SP existente SP_B_ConsultaDeudaPendiente
     */
    async getStudentDebts(studentCode: string): Promise<PendingDebtConsultationResponse | null> {
        try {
            this.logger.log(`Obteniendo deudas para estudiante: ${studentCode}`);

            const debtData = await this.sapDebtService.getPendingDebtConsultation(studentCode);

            if (!debtData || debtData.idProceso === 'False') {
                return null;
            }
            return debtData;
        } catch (error) {
            this.logger.error(`Error obteniendo deudas: ${error.message}`);
            throw error;
        }
    }

    /**
     * Obtener deuda prioritaria de un estudiante
     * Usa el SP existente SP_B_ConsultaDeuda
     */
    async getPriorityDebt(studentCode: string): Promise<DebtConsultationResponse | null> {
        try {
            this.logger.log(`Obteniendo deuda prioritaria para: ${studentCode}`);

            const debtData = await this.sapDebtService.getDebtConsultation(studentCode);

            if (!debtData || debtData.idProceso === 'False') {
                return null;
            }

            return debtData;
        } catch (error) {
            this.logger.error(`Error obteniendo deuda prioritaria: ${error.message}`);
            throw error;
        }
    }

    /**
     * Verificar si una notificación ya existe (sincrónico)
     */
    async checkExistingNotification(transactionId: string): Promise<PaymentConfirmation | null> {
        const existing = await this.paymentNotificationRepo.findOne({
            where: { externalTransactionId: transactionId },
        });

        if (!existing) {
            return null;
        }

        return {
            internalId: existing.id,
            transactionId: existing.externalTransactionId,
            status: existing.status as any,
            processedAt: existing.processedAt?.toISOString(),
            sapInvoiceDocNum: existing.sapInvoiceDocNum,
            sapPaymentDocNum: existing.sapPaymentDocNum,
            message: 'El pago ya fue procesado anteriormente',
        };
    }

    /**
     * Crear registro inicial de notificación (sincrónico)
     * Soporta múltiples estudiantes en un solo pago
     */
    async createInitialNotification(
        dto: PaymentNotificationDto,
        apiClientId: number,
    ): Promise<PaymentNotification> {
        const apiClient = await this.apiClientRepo.findOne({ where: { id: apiClientId } });
        if (!apiClient) {
            throw new Error(`Cliente API con ID ${apiClientId} no encontrado`);
        }

        // Consolidar información de múltiples estudiantes
        const studentCodes = getStudentCodesString(dto.students);
        const studentCount = dto.students.length;

        const notification = this.paymentNotificationRepo.create({
            externalTransactionId: dto.transactionId,
            studentCodes: studentCodes,
            studentCount: studentCount,
            parentCardCode: dto.parentCardCode,
            studentsDetail: JSON.stringify(dto.students),
            amount: dto.amount,
            currency: dto.currency,
            apiClientId: apiClient.id,
            status: 'RECEIVED',
            sapSyncStatus: 'PENDING',
            paymentDate: new Date(dto.paymentDate),
            receiptNumber: dto.receiptNumber,
            rawPayload: JSON.stringify(dto),
        });

        return await this.paymentNotificationRepo.save(notification);
    }

    /**
     * Procesar notificación de pago de forma asincrónica
     * Este método NO bloquea la respuesta HTTP
     * Soporta múltiples estudiantes: consolida orderLines de todos
     */
    async processPaymentNotificationAsync(
        dto: PaymentNotificationDto,
        apiClientId: number,
        requestId: string,
    ): Promise<void> {
        try {
            const studentCount = dto.students?.length || 0;
            this.logger.log(`[${requestId}] Iniciando procesamiento async de pago: ${dto.transactionId} (${studentCount} estudiantes)`);

            // Obtener notificación creada
            const notification = await this.paymentNotificationRepo.findOne({
                where: { externalTransactionId: dto.transactionId },
            });

            if (!notification) {
                throw new Error(`Notificación ${dto.transactionId} no encontrada`);
            }

            // Obtener configuracion del Cliente API
            const apiClient = await this.apiClientRepo.findOne({ where: { id: apiClientId } });
            if (!apiClient) {
                throw new Error(`Cliente API con ID ${apiClientId} no encontrado`);
            }

            let cuentaContableSap = '';
            this.logger.log(`[${requestId}] Obteniendo cuenta contable SAP para cliente API: ${apiClient.name}`);
            switch (apiClient.name) {
                case 'BNB':
                    cuentaContableSap = this.configService.get<string>('CUENTA_CONTABLE_BNB');
                    break;
                case 'BG':
                    cuentaContableSap = this.configService.get<string>('CUENTA_CONTABLE_BG');
                    break;
                case 'LUKA':
                    this.logger.log(`[${requestId}] Determinando cuenta contable SAP para LUKA con método de pago: ${dto.paymentMethod}`);
                    if (dto.paymentMethod === 1) { // QR
                        cuentaContableSap = this.configService.get<string>('CUENTA_CONTABLE_LUKA_QR');
                    } else { // Tarjeta Debito/Crédito
                        cuentaContableSap = this.configService.get<string>('CUENTA_CONTABLE_LUKA_TARJETA');
                    }
                    break;
            }

            // Consolidar orderLines de todos los estudiantes
            const consolidatedOrderLines = consolidateOrderLines(dto.students);
            this.logger.log(`[${requestId}] Total de líneas consolidadas: ${consolidatedOrderLines.length} de ${studentCount} estudiantes`);

            // Si SAP Service Layer está configurado y hay líneas, procesar
            if (this.sapServiceLayerService.isConfigured() && consolidatedOrderLines.length > 0) {
                try {
                    notification.status = 'PROCESSING';
                    await this.paymentNotificationRepo.save(notification);

                    const processData: ProcessPaymentDto = {
                        transactionId: dto.transactionId,
                        email: dto.email,
                        paymentMethod: dto.paymentMethod,
                        transferAccount: cuentaContableSap,
                        parentCardCode: dto.parentCardCode,
                        paymentDate: dto.paymentDate,
                        amount: dto.amount,
                        bankName: 'Servicio Externo',
                        externalReference: dto.transactionId,
                        orderLines: consolidatedOrderLines.map(line => ({
                            orderDocEntry: line.orderDocEntry,
                            lineNum: line.lineNum,
                        })),
                    };

                    const result = await this.sapServiceLayerService.processPaymentNotification(processData);

                    if (result.success) {
                        notification.status = 'PROCESSED';
                        notification.sapSyncStatus = 'SYNCED';
                        notification.sapInvoiceDocEntry = result.invoiceDocEntry;
                        notification.sapInvoiceDocNum = result.invoiceDocNum;
                        notification.sapPaymentDocEntry = result.paymentDocEntry;
                        notification.sapPaymentDocNum = result.paymentDocNum;
                        notification.processedAt = new Date();

                        this.logger.log(`[${requestId}] Pago procesado exitosamente en SAP (${studentCount} estudiantes, ${consolidatedOrderLines.length} líneas)`);
                    } else {
                        notification.status = 'FAILED';
                        notification.sapSyncStatus = 'ERROR';
                        notification.sapSyncError = result.error;

                        this.logger.error(`[${requestId}] Error en SAP: ${result.error}`);
                    }
                } catch (error) {
                    this.logger.error(`[${requestId}] Error procesando en SAP: ${error.message}`);
                    notification.status = 'FAILED';
                    notification.sapSyncStatus = 'ERROR';
                    notification.sapSyncError = error.message;
                }
            } else {
                // Sin SAP Service Layer, marcar como procesado
                notification.status = 'PROCESSED';
                notification.processedAt = new Date();
                this.logger.log(`[${requestId}] Notificación marcada como procesada (sin SAP SL)`);
            }

            await this.paymentNotificationRepo.save(notification);
        } catch (error) {
            this.logger.error(`[${requestId}] Error en procesamiento async: ${error.message}`);

            try {
                const notification = await this.paymentNotificationRepo.findOne({
                    where: { externalTransactionId: dto.transactionId },
                });

                if (notification) {
                    notification.status = 'FAILED';
                    notification.sapSyncError = error.message;
                    await this.paymentNotificationRepo.save(notification);
                }
            } catch (updateError) {
                this.logger.error(`[${requestId}] Error actualizando notificación: ${updateError.message}`);
            }
        }
    }

    /**
     * Procesar notificación de pago desde servicio externo (DEPRECATED - usar processPaymentNotificationAsync)
     * Mantenido para compatibilidad hacia atrás
     * Ahora soporta múltiples estudiantes
     */
    async processPaymentNotification(
        dto: PaymentNotificationDto,
        apiClientId: number,
    ): Promise<PaymentConfirmation> {
        const requestId = uuidv4();
        const studentCount = dto.students?.length || 0;
        this.logger.log(`[${requestId}] Procesando notificación de pago: ${dto.transactionId} (${studentCount} estudiantes)`);

        // Verificar idempotencia
        const existing = await this.paymentNotificationRepo.findOne({
            where: { externalTransactionId: dto.transactionId },
        });

        if (existing) {
            this.logger.log(`[${requestId}] Pago ya procesado anteriormente: ${dto.transactionId}`);
            return {
                internalId: existing.id,
                transactionId: dto.transactionId,
                status: 'ALREADY_PROCESSED',
                processedAt: existing.processedAt?.toISOString(),
                sapInvoiceDocNum: existing.sapInvoiceDocNum,
                sapPaymentDocNum: existing.sapPaymentDocNum,
                message: 'El pago ya fue procesado anteriormente',
            };
        }

        // Obtener configuracion del Cliente API
        const apiClient = await this.apiClientRepo.findOne({ where: { id: apiClientId } });
        if (!apiClient) {
            throw new Error(`Cliente API con ID ${apiClientId} no encontrado`);
        }

        let cuentaContableSap = '';
        this.logger.log(`[${requestId}] Obteniendo cuenta contable SAP para cliente API: ${apiClient.name}`);
        switch (apiClient.name) {
            case 'BNB':
                cuentaContableSap = this.configService.get<string>('CUENTA_CONTABLE_BNB');
                break;
            case 'BG':
                cuentaContableSap = this.configService.get<string>('CUENTA_CONTABLE_BG');
                break;
            case 'LUKA':
                this.logger.log(`[${requestId}] Determinando cuenta contable SAP para LUKA con método de pago: ${dto.paymentMethod}`);
                if (dto.paymentMethod === 1){ // QR
                    cuentaContableSap = this.configService.get<string>('CUENTA_CONTABLE_LUKA_QR');
                }else{ // Tarjeta
                    cuentaContableSap = this.configService.get<string>('CUENTA_CONTABLE_LUKA_TARJETA');
                }
                break;
        }

        // Consolidar información de estudiantes
        const studentCodes = getStudentCodesString(dto.students);
        const consolidatedOrderLines = consolidateOrderLines(dto.students);

        // Crear registro de notificación
        const notification = this.paymentNotificationRepo.create({
            externalTransactionId: dto.transactionId,
            studentCodes: studentCodes,
            studentCount: studentCount,
            parentCardCode: dto.parentCardCode,
            studentsDetail: JSON.stringify(dto.students),
            amount: dto.amount,
            currency: dto.currency,
            apiClientId: apiClient.id,
            status: 'RECEIVED',
            sapSyncStatus: 'PENDING',
            paymentDate: new Date(dto.paymentDate),
            receiptNumber: dto.receiptNumber,
            rawPayload: JSON.stringify(dto),
        });

        await this.paymentNotificationRepo.save(notification);
        this.logger.log(`[${requestId}] Notificación guardada con ID: ${notification.id}`);

        // Si SAP Service Layer está configurado, procesar
        if (this.sapServiceLayerService.isConfigured() && consolidatedOrderLines.length > 0) {
            try {
                notification.status = 'PROCESSING';
                await this.paymentNotificationRepo.save(notification);

                if (!dto.parentCardCode) {
                    throw new Error('No se proporcionó el CardCode del padre');
                }

                const processData: ProcessPaymentDto = {
                    transactionId: dto.transactionId,
                    email: dto.email,
                    paymentMethod: dto.paymentMethod,
                    transferAccount: cuentaContableSap,
                    parentCardCode: dto.parentCardCode,
                    paymentDate: dto.paymentDate,
                    amount: dto.amount,
                    bankName: 'Servicio Externo',
                    externalReference: dto.transactionId,
                    orderLines: consolidatedOrderLines.map(line => ({
                        orderDocEntry: line.orderDocEntry,
                        lineNum: line.lineNum,
                    })),
                };

                const result = await this.sapServiceLayerService.processPaymentNotification(processData);

                if (result.success) {
                    notification.status = 'PROCESSED';
                    notification.sapSyncStatus = 'SYNCED';
                    notification.sapInvoiceDocEntry = result.invoiceDocEntry;
                    notification.sapInvoiceDocNum = result.invoiceDocNum;
                    notification.sapPaymentDocEntry = result.paymentDocEntry;
                    notification.sapPaymentDocNum = result.paymentDocNum;
                    notification.processedAt = new Date();
                } else {
                    notification.status = 'FAILED';
                    notification.sapSyncStatus = 'ERROR';
                    notification.sapSyncError = result.error;
                }

                await this.paymentNotificationRepo.save(notification);
            } catch (error) {
                this.logger.error(`[${requestId}] Error procesando en SAP: ${error.message}`);
                notification.status = 'FAILED';
                notification.sapSyncStatus = 'ERROR';
                notification.sapSyncError = error.message;
                await this.paymentNotificationRepo.save(notification);
            }
        }

        return {
            internalId: notification.id,
            transactionId: dto.transactionId,
            status: notification.status as any,
            processedAt: notification.processedAt?.toISOString(),
            sapInvoiceDocNum: notification.sapInvoiceDocNum,
            sapPaymentDocNum: notification.sapPaymentDocNum,
            message: notification.status === 'PROCESSED'
                ? 'Pago procesado exitosamente'
                : notification.status === 'RECEIVED'
                    ? 'Notificación recibida, pendiente de procesamiento'
                    : `Error: ${notification.sapSyncError}`,
        };
    }

    /**
     * Obtener estado actual de una notificación
     */
    async getNotificationStatus(transactionId: string): Promise<PaymentConfirmation | null> {
        const notification = await this.paymentNotificationRepo.findOne({
            where: { externalTransactionId: transactionId },
        });

        if (!notification) {
            return null;
        }

        return {
            internalId: notification.id,
            transactionId: notification.externalTransactionId,
            status: notification.status as any,
            processedAt: notification.processedAt?.toISOString(),
            sapInvoiceDocNum: notification.sapInvoiceDocNum,
            sapPaymentDocNum: notification.sapPaymentDocNum,
            message: this.getStatusMessage(notification.status),
        };
    }

    /**
     * Obtener mensaje legible del estado
     */
    private getStatusMessage(status: string): string {
        const messages: Record<string, string> = {
            RECEIVED: 'Notificación recibida, pendiente de procesamiento',
            PROCESSING: 'Procesando pago en SAP',
            PROCESSED: 'Pago procesado exitosamente',
            FAILED: 'Error en el procesamiento del pago',
            ALREADY_PROCESSED: 'El pago ya fue procesado anteriormente',
        };

        return messages[status] || 'Estado desconocido';
    }

    /**
     * Generates a request ID unique for traceability
     */
    generateRequestId(): string {
        return uuidv4();
    }
}
