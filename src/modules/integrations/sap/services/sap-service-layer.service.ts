import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { CreateInvoiceDto, CreatePaymentDto, PaymentProcessResult, ProcessPaymentDto, SapDocumentResponse } from '../interfaces/sap.interface';

@Injectable()
export class SapServiceLayerService {
    private readonly logger = new Logger(SapServiceLayerService.name);
    private readonly baseUrl: string;
    private sessionId: string | null = null;
    private sessionExpiry: Date | null = null;
    private axiosInstance: AxiosInstance;

    constructor(private readonly configService: ConfigService) {
        this.baseUrl = configService.get<string>('SAP_SERVICE_LAYER_URL') || '';

        // Crear instancia de axios con configuración base
        this.axiosInstance = axios.create({
            baseURL: this.baseUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }

    /**
     * Login en Service Layer - obtiene Session ID
     */
    async login(): Promise<void> {
        try {
            const response = await axios.post(`${this.baseUrl}/Login`, {
                CompanyDB: this.configService.get('SAP_COMPANY_DB'),
                UserName: this.configService.get('SAP_SL_USER'),
                Password: this.configService.get('SAP_SL_PASSWORD'),
            });

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
            this.logger.log('Login exitoso en SAP Service Layer');
        } catch (error) {
            this.logger.error('Error en login SAP Service Layer:', error.message);
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

        const invoicePayload = {
                CardCode: data.parentCardCode,
                DocDate: data.docDate,
                DocDueDate: data.docDate,
                NumAtCard: data.transactionId,
                Comments: `Pago desde App/Web. Ref: ${data.transactionId}`,

                U_TIPODOC: 7,
                U_RAZSOC: data.razonSocial,
                U_NIT: data.nit,
                // U_EMAIL: data.email,
                // U_B_paymeth: data.paymentMethod,
                // U_B_dni_type: data.documentTypeIdentity,
                // U_B_compl: data.complement || '',
                // U_TOKENSFE: data.transactionId,

                U_B_State: "P",
                U_B_valid: "V",
                U_B_type: "N",    // Normal
                U_B_invtype: "1", // Con derecho a crédito fiscal
                // U_B_doctype: "1",
                U_B_resp: "VALIDADA",
                U_ORIGIN: "DMS_APP",  

                // U_B_cuf: data.cuf || null,
                // U_B_cufd: data.cufd || null,

                DocumentLines: data.orderLines.map(line => ({
                    BaseType: 17,           // 17 = Orden de Venta (ORDR)
                    BaseEntry: line.orderDocEntry,
                    BaseLine: line.lineNum,
                })),
            };

        try {
            this.logger.log(`Creando factura para ${data.parentCardCode} con ${data.orderLines.length} líneas`);

            const response = await axios.post(
                `${this.baseUrl}/Invoices`,
                invoicePayload,
                { headers: this.getHeaders() }
            );

            this.logger.log(`Factura creada: DocEntry=${response.data.DocEntry}, DocNum=${response.data.DocNum}`);

            return {
                success: true,
                docEntry: response.data.DocEntry,
                docNum: response.data.DocNum,
            };
        } catch (error) {
            const errorMsg = error.response?.data?.error?.message?.value || error.message;
            this.logger.error('Error creando factura en SAP:', errorMsg);
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

        const paymentPayload = {
            CardCode: data.parentCardCode,
            DocDate: data.paymentDate,
            DocType: "rCustomer",

            TransferAccount: data.transferAccount,
            TransferSum: data.amount,
            TransferDate: data.paymentDate,
            TransferReference: data.externalReference,
            
            PaymentInvoices: [{
                LineNum: 0,
                DocEntry: data.invoiceDocEntry,
                SumApplied: data.amount,
                InvoiceType: 'it_Invoice',
            }],
        };

        try {
            this.logger.log(`Registrando pago para ${data.parentCardCode}, monto: ${data.amount}`);

            const response = await axios.post(
                `${this.baseUrl}/IncomingPayments`,
                paymentPayload,
                { headers: this.getHeaders() }
            );

            this.logger.log(`Pago registrado: DocEntry=${response.data.DocEntry}, DocNum=${response.data.DocNum}`);

            return {
                success: true,
                docEntry: response.data.DocEntry,
                docNum: response.data.DocNum,
            };
        } catch (error) {
            const errorMsg = error.response?.data?.error?.message?.value || error.message;
            this.logger.error('Error creando pago en SAP:', errorMsg);
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

        // Paso 1: Crear Factura
        const invoice = await this.createInvoiceFromOrder({
            transactionId: data.transactionId,
            razonSocial: data.razonSocial,
            nit: data.nit,
            email: data.email,
            paymentMethod: data.paymentMethod,
            // documentTypeIdentity: data.documentTypeIdentity,
            // complement: data.complement,
            // cuf: data.cuf,
            // cufd: data.cufd,

            parentCardCode: data.parentCardCode,
            docDate: data.paymentDate,
            bankName: data.bankName,
            externalReference: data.externalReference,
            orderLines: data.orderLines,
        });

        if (!invoice.success) {
            return {
                success: false,
                error: `Error creando factura: ${invoice.error}`,
            };
        }

        // Paso 2: Registrar Pago
        const payment = await this.createIncomingPayment({
            parentCardCode: data.parentCardCode,
            paymentDate: data.paymentDate,
            amount: data.amount,
            externalReference: data.externalReference,
            invoiceDocEntry: invoice.docEntry!,
            transferAccount: data.transferAccount,
        });

        if (!payment.success) {
            return {
                success: false,
                invoiceDocEntry: invoice.docEntry,
                invoiceDocNum: invoice.docNum,
                error: `Factura creada pero error registrando pago: ${payment.error}`,
            };
        }

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
            const response = await axios.get(`${this.baseUrl}${endpoint}`, {
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
