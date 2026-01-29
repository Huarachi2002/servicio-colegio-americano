import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as https from 'https';
import { CreateInvoiceDto, CreatePaymentDto, PaymentProcessResult, ProcessPaymentDto, SapDocumentResponse } from '../interfaces/sap.interface';
import { CustomLoggerService } from 'src/common/logger';

@Injectable()
export class SapServiceLayerService {
    private readonly logger: CustomLoggerService;
    private readonly baseUrl: string;
    private sessionId: string | null = null;
    private sessionExpiry: Date | null = null;
    private axiosInstance: AxiosInstance;
    // Agente HTTPS que acepta certificados auto-firmados
    private readonly httpsAgent: https.Agent;

    constructor(
        private readonly configService: ConfigService,
        private readonly customLogger: CustomLoggerService,
    ) {
        this.logger = this.customLogger.setContext(SapServiceLayerService.name);
        this.baseUrl = configService.get<string>('SAP_SERVICE_LAYER_URL') || '';

        // Crear agente HTTPS que ignora validación de certificados (para certificados auto-firmados)
        this.httpsAgent = new https.Agent({
            rejectUnauthorized: false, // Acepta certificados auto-firmados
        });

        // Crear instancia de axios con configuración base
        this.axiosInstance = axios.create({
            baseURL: this.baseUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            },
            httpsAgent: this.httpsAgent, // Usar agente HTTPS personalizado
        });
    }

    /**
     * Login en Service Layer - obtiene Session ID
     */
    async login(): Promise<void> {
        const startTime = Date.now();
        const url = `${this.baseUrl}/Login`;
        
        try {
            this.logger.logIntegrationProcess('SAP_SERVICE_LAYER', 'login', 'START', {
                url,
                companyDB: this.configService.get('SAP_COMPANY_DB'),
            });

            const response = await this.axiosInstance.post('/Login', {
                CompanyDB: this.configService.get('SAP_COMPANY_DB'),
                UserName: this.configService.get('SAP_SL_USER'),
                Password: this.configService.get('SAP_SL_PASSWORD'),
            });

            const duration = Date.now() - startTime;

            // Session ID viene en cookie B1SESSION
            const cookies = response.headers['set-cookie'];
            if (cookies) {
                const sessionCookie = cookies.find((c: string) => c.includes('B1SESSION'));
                if (sessionCookie) {
                    this.sessionId = sessionCookie.split(';')[0];
                }
            }

            // Session expira en 30 minutos
            this.sessionExpiry = new Date(Date.now() + 30 * 60 * 1000);
            
            this.logger.logApiCall(
                'SAP_SERVICE_LAYER',
                'POST',
                url,
                { companyDB: this.configService.get('SAP_COMPANY_DB') },
                { success: true },
                response.status,
                duration,
                false,
            );
            
            this.logger.logIntegrationProcess('SAP_SERVICE_LAYER', 'login', 'SUCCESS', {
                duration: `${duration}ms`,
            });
            this.logger.log('Login exitoso en SAP Service Layer');
        } catch (error) {
            const duration = Date.now() - startTime;
            
            this.logger.logApiCall(
                'SAP_SERVICE_LAYER',
                'POST',
                url,
                { companyDB: this.configService.get('SAP_COMPANY_DB') },
                error.response?.data,
                error.response?.status,
                duration,
                true,
            );
            
            this.logger.error(`Error en login SAP Service Layer: ${error.message}`, error.stack);
            this.logger.logIntegrationProcess('SAP_SERVICE_LAYER', 'login', 'ERROR', {
                error: error.message,
                duration: `${duration}ms`,
            });
            throw new Error('No se pudo conectar a SAP Service Layer');
        }
    }

    /**
     * PASO 1: Crear Factura de Deudores vinculada a Orden de Venta
     * POST /b1s/v1/Invoices
     * 
     * Esto CIERRA la línea en la Orden de Venta (ORDR/RDR1)
     */
    async createInvoiceFromOrder(data: CreateInvoiceDto): Promise<SapDocumentResponse> {
        await this.ensureSession();

        // Payload simplificado - probado exitosamente en Insomnia
        const invoicePayload = {
            CardCode: data.parentCardCode,
            NumAtCard: data.nroFactura,
            U_B_cuf: data.cuf,
            DocDate: data.docDate,
            U_EMAIL: data.email,
            DocDueDate: data.docDate,
            Comments: `Pago desde App/Web. Ref: ${data.transactionId}`,
            DocumentLines: data.orderLines.map(line => ({
                BaseType: 17,           // 17 = Orden de Venta (ORDR)
                BaseEntry: line.orderDocEntry,
                BaseLine: line.lineNum,
            })),
        };

        const url = `${this.baseUrl}/Invoices`;
        const startTime = Date.now();

        try {
            this.logger.log(`Creando factura para ${data.parentCardCode} con ${data.orderLines.length} líneas`);
            this.logger.debug(`Payload factura: ${JSON.stringify(invoicePayload)}`);
            
            this.logger.logIntegrationProcess('SAP_INVOICE', 'createInvoiceFromOrder', 'START', {
                parentCardCode: data.parentCardCode,
                transactionId: data.transactionId,
                linesCount: data.orderLines.length,
            });

            const response = await this.axiosInstance.post(
                '/Invoices',
                invoicePayload,
                { headers: this.getHeaders() }
            );

            const duration = Date.now() - startTime;

            this.logger.logApiCall(
                'SAP_SERVICE_LAYER',
                'POST',
                url,
                invoicePayload,
                { DocEntry: response.data.DocEntry, DocNum: response.data.DocNum },
                response.status,
                duration,
                false,
            );

            this.logger.log(`Factura creada: DocEntry=${response.data.DocEntry}, DocNum=${response.data.DocNum}`);
            
            this.logger.logIntegrationProcess('SAP_INVOICE', 'createInvoiceFromOrder', 'SUCCESS', {
                docEntry: response.data.DocEntry,
                docNum: response.data.DocNum,
                duration: `${duration}ms`,
            });

            return {
                success: true,
                docEntry: response.data.DocEntry,
                docNum: response.data.DocNum,
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            
            // Capturar el mensaje de error detallado de SAP
            const sapError = error.response?.data?.error;
            const errorMsg = sapError?.message?.value || sapError?.message || error.message;
            const errorCode = sapError?.code || error.response?.status || 'UNKNOWN';
            
            this.logger.logApiCall(
                'SAP_SERVICE_LAYER',
                'POST',
                url,
                invoicePayload,
                error.response?.data,
                error.response?.status,
                duration,
                true,
            );
            
            this.logger.error(`Error creando factura en SAP [${errorCode}]: ${errorMsg}`);
            this.logger.error(`Payload enviado: ${JSON.stringify(invoicePayload)}`);
            
            // Log completo del error de SAP si existe
            if (error.response?.data) {
                this.logger.error(`Respuesta SAP completa: ${JSON.stringify(error.response.data)}`);
            }
            
            this.logger.logIntegrationProcess('SAP_INVOICE', 'createInvoiceFromOrder', 'ERROR', {
                errorCode,
                errorMsg,
                duration: `${duration}ms`,
            });
            
            return {
                success: false,
                error: errorMsg,
            };
        }
    }

    /**
     * PASO 2: Registrar Pago Recibido aplicado a la Factura
     * POST /b1s/v1/IncomingPayments
     */
    async createIncomingPayment(data: CreatePaymentDto): Promise<SapDocumentResponse> {
        await this.ensureSession();

        // Payload simplificado - probado exitosamente en Insomnia
        const paymentPayload = {
            CardCode: data.parentCardCode,
            DocDate: data.paymentDate,
            DocType: "rCustomer",
            TransferAccount: data.transferAccount,
            TransferSum: data.amount,
            TransferDate: data.paymentDate,
            PaymentInvoices: [{
                LineNum: 0,
                DocEntry: data.invoiceDocEntry,
                SumApplied: data.amount,
                InvoiceType: 13,  // 13 = Factura de Deudores (OINV)
            }],
        };

        const url = `${this.baseUrl}/IncomingPayments`;
        const startTime = Date.now();

        try {
            this.logger.log(`Registrando pago para ${data.parentCardCode}, monto: ${data.amount}`);
            this.logger.debug(`Payload pago: ${JSON.stringify(paymentPayload)}`);
            
            this.logger.logIntegrationProcess('SAP_PAYMENT', 'createIncomingPayment', 'START', {
                parentCardCode: data.parentCardCode,
                amount: data.amount,
                invoiceDocEntry: data.invoiceDocEntry,
            });

            const response = await this.axiosInstance.post(
                '/IncomingPayments',
                paymentPayload,
                { headers: this.getHeaders() }
            );

            const duration = Date.now() - startTime;

            this.logger.logApiCall(
                'SAP_SERVICE_LAYER',
                'POST',
                url,
                paymentPayload,
                { DocEntry: response.data.DocEntry, DocNum: response.data.DocNum },
                response.status,
                duration,
                false,
            );

            this.logger.log(`Pago registrado: DocEntry=${response.data.DocEntry}, DocNum=${response.data.DocNum}`);
            
            this.logger.logIntegrationProcess('SAP_PAYMENT', 'createIncomingPayment', 'SUCCESS', {
                docEntry: response.data.DocEntry,
                docNum: response.data.DocNum,
                duration: `${duration}ms`,
            });

            return {
                success: true,
                docEntry: response.data.DocEntry,
                docNum: response.data.DocNum,
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            
            // Capturar el mensaje de error detallado de SAP
            const sapError = error.response?.data?.error;
            const errorMsg = sapError?.message?.value || sapError?.message || error.message;
            const errorCode = sapError?.code || error.response?.status || 'UNKNOWN';
            
            this.logger.logApiCall(
                'SAP_SERVICE_LAYER',
                'POST',
                url,
                paymentPayload,
                error.response?.data,
                error.response?.status,
                duration,
                true,
            );
            
            this.logger.error(`Error creando pago en SAP [${errorCode}]: ${errorMsg}`);
            this.logger.error(`Payload enviado: ${JSON.stringify(paymentPayload)}`);
            
            // Log completo del error de SAP si existe
            if (error.response?.data) {
                this.logger.error(`Respuesta SAP completa: ${JSON.stringify(error.response.data)}`);
            }
            
            this.logger.logIntegrationProcess('SAP_PAYMENT', 'createIncomingPayment', 'ERROR', {
                errorCode,
                errorMsg,
                duration: `${duration}ms`,
            });
            
            return {
                success: false,
                error: errorMsg,
            };
        }
    }

    /**
     * Proceso completo: Factura + Pago en una transacción lógica
     */
    async processPaymentNotification(data: ProcessPaymentDto): Promise<PaymentProcessResult> {
        this.logger.log(`Procesando pago completo para ${data.parentCardCode}`);
        this.logger.logPaymentTransaction(data.transactionId, 'processPaymentNotification', 'INITIATED', {
            parentCardCode: data.parentCardCode,
            amount: data.amount,
            orderLinesCount: data.orderLines.length,
        });

        this

        // Paso 1: Crear Factura
        this.logger.logPaymentTransaction(data.transactionId, 'createInvoice', 'PROCESSING');
        
        const invoice = await this.createInvoiceFromOrder({
            transactionId: data.transactionId,
            email: data.email,
            nroFactura: data.nroFactura || '',
            cuf: data.cuf || '',
            paymentMethod: data.paymentMethod,
            parentCardCode: data.parentCardCode,
            docDate: data.paymentDate,
            bankName: data.bankName,
            externalReference: data.externalReference,
            orderLines: data.orderLines,
        });

        if (!invoice.success) {
            this.logger.logPaymentTransaction(data.transactionId, 'processPaymentNotification', 'FAILED', {
                step: 'createInvoice',
                error: invoice.error,
            });
            return {
                success: false,
                error: `Error creando factura: ${invoice.error}`,
            };
        }

        // Paso 2: Registrar Pago
        this.logger.logPaymentTransaction(data.transactionId, 'createPayment', 'PROCESSING', {
            invoiceDocEntry: invoice.docEntry,
            invoiceDocNum: invoice.docNum,
        });
        
        const payment = await this.createIncomingPayment({
            parentCardCode: data.parentCardCode,
            paymentDate: data.paymentDate,
            amount: data.amount,
            externalReference: data.externalReference,
            invoiceDocEntry: invoice.docEntry!,
            transferAccount: data.transferAccount,
        });

        if (!payment.success) {
            this.logger.logPaymentTransaction(data.transactionId, 'processPaymentNotification', 'FAILED', {
                step: 'createPayment',
                error: payment.error,
                invoiceDocEntry: invoice.docEntry,
                invoiceDocNum: invoice.docNum,
            });
            return {
                success: false,
                invoiceDocEntry: invoice.docEntry,
                invoiceDocNum: invoice.docNum,
                error: `Factura creada pero error registrando pago: ${payment.error}`,
            };
        }

        this.logger.logPaymentTransaction(data.transactionId, 'processPaymentNotification', 'COMPLETED', {
            invoiceDocEntry: invoice.docEntry,
            invoiceDocNum: invoice.docNum,
            paymentDocEntry: payment.docEntry,
            paymentDocNum: payment.docNum,
        });

        return {
            success: true,
            invoiceDocEntry: invoice.docEntry,
            invoiceDocNum: invoice.docNum,
            paymentDocEntry: payment.docEntry,
            paymentDocNum: payment.docNum,
        };
    }

    /**
     * Asegura que hay una sesión activa
     */
    async ensureSession(): Promise<void> {
        if (!this.sessionId || !this.sessionExpiry || new Date() > this.sessionExpiry) {
            await this.login();
        }
    }

    /**
     * GET genérico para Service Layer
     */
    async get<T>(endpoint: string): Promise<T> {
        await this.ensureSession();

        try {
            const response = await this.axiosInstance.get(endpoint, {
                headers: this.getHeaders(),
            });

            return response.data;
        } catch (error) {
            const errorMsg = error.response?.data?.error?.message?.value || error.message;
            this.logger.error(`Error en GET ${endpoint}:`, errorMsg);
            throw new Error(errorMsg);
        }
    }

    /**
     * Obtiene los headers para las peticiones
     */
    private getHeaders(): Record<string, string> {
        return {
            'Content-Type': 'application/json',
            'Cookie': this.sessionId || '',
        };
    }

    /**
     * Verifica si el servicio está configurado
     */
    isConfigured(): boolean {
        return !!this.baseUrl &&
            !!this.configService.get('SAP_COMPANY_DB') &&
            !!this.configService.get('SAP_SL_USER');
    }
}
