import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from '../../../database/entities/payment.entity';
import { ExchangeRate } from '../../../database/entities/exchange-rate.entity';
import { BnbService } from 'src/modules/external-api/services/bnb.service';
import { CustomLoggerService } from 'src/common/logger';

/**
 * PaymentService - Replica exacta de PaymentRepository de Laravel
 * Integra con API de Banco Nacional de Bolivia para generar QR de pagos
 */
@Injectable()
export class PaymentService {
    private readonly logger: CustomLoggerService;
    private authToken: {
        token: string;
        datetime: Date;
    } | null = null;

    constructor(
        @InjectRepository(Payment)
        private readonly paymentRepository: Repository<Payment>,
        @InjectRepository(ExchangeRate)
        private readonly exchangeRateRepository: Repository<ExchangeRate>,
        private readonly bnbService: BnbService,
        private readonly customLogger: CustomLoggerService,
    ) {
        this.logger = this.customLogger.setContext(PaymentService.name);
    }

    /**
     * Guardar información de pago y generar QR
     */
    async savePaymentInformation(
        erpCode: string,
        debtInformation: any,
    ): Promise<string | null> {
        const transactionId = debtInformation.idTransaccion || 'N/A';
        
        this.logger.logPaymentTransaction(transactionId, 'savePaymentInformation', 'INITIATED', {
            erpCode,
            amount: debtInformation.MontoDelCobro,
            currency: debtInformation.MonedaDelCobro,
        });
        
        this.logger.log(`savePaymentInformation called for erpCode: ${erpCode}`);
        this.logger.debug(`Debt information: ${JSON.stringify(debtInformation)}`);

        try {
            const now = new Date();
            now.setHours(0, 0, 0, 0);

            this.logger.logPaymentTransaction(transactionId, 'checkExistingPayment', 'PROCESSING', {
                erpCode,
                date: now.toISOString(),
            });

            // Buscar pago existente
            const existingPayment = await this.paymentRepository.findOneBy({
                erpCode,
                expirationDate: now,
            });

            // Si no existe, crear nuevo
            if (!existingPayment) {
                this.logger.log(`No existing payment found for ${erpCode}, creating new one`);
                
                const glossAux = debtInformation.DetalleDelCobro;
                const invoiceData = debtInformation.DatosFactura;

                // Fecha de expiración: mañana
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                const expirationDate = tomorrow.toISOString().split('T')[0];

                // Validar NIT (solo números)
                if (!/^\d+$/.test(invoiceData.NITCIFact)) {
                    this.logger.warn(`Invalid NIT format: ${invoiceData.NITCIFact}`);
                    this.logger.logPaymentTransaction(transactionId, 'validateNIT', 'FAILED', {
                        nit: invoiceData.NITCIFact,
                        error: 'Invalid NIT format - must be numeric only',
                    });
                    return null;
                }

                this.logger.logPaymentTransaction(transactionId, 'generateAdditionalData', 'PROCESSING');

                // Generar additional data
                const additionalData = await this.generateAdditionalData(
                    debtInformation.NombreDeudor,
                    erpCode,
                    debtInformation.idTransaccion,
                    invoiceData.NombreFact,
                    invoiceData.NITCIFact,
                    invoiceData.DocumentType,
                    invoiceData.Complement,
                    glossAux.ConceptoPago,
                    glossAux.PeriodoPago,
                    glossAux.DescuentoPago,
                    glossAux.MontoPago,
                    glossAux.MultaPago,
                    glossAux.Facturable,
                    debtInformation.MonedaDelCobro,
                );

                this.logger.logPaymentTransaction(transactionId, 'generateQR', 'PROCESSING', {
                    amount: debtInformation.MontoDelCobro,
                    currency: debtInformation.MonedaDelCobro,
                    expirationDate,
                });

                // Generar QR desde API BNB
                const qrResponse = await this.bnbService.generateQR(
                    additionalData,
                    debtInformation.MontoDelCobro,
                    `${erpCode}, ${glossAux.PeriodoPago} ${glossAux.ConceptoPago}`,
                    debtInformation.MonedaDelCobro,
                    expirationDate,
                );

                if (qrResponse && qrResponse.success) {
                    this.logger.logPaymentTransaction(transactionId, 'savePayment', 'PROCESSING', {
                        qrId: qrResponse.id,
                    });

                    // Guardar payment en BD
                    const newPayment = this.paymentRepository.create({
                        erpCode,
                        paymentId: qrResponse.id,
                        expirationDate: new Date(expirationDate),
                        data: JSON.stringify(debtInformation),
                        qr: qrResponse.qr,
                        createdBy: '1',
                        transactionId: debtInformation.idTransaccion,
                    });

                    const savedPayment = await this.paymentRepository.save(newPayment);
                    
                    this.logger.logPaymentTransaction(transactionId, 'savePaymentInformation', 'COMPLETED', {
                        paymentId: savedPayment.paymentId,
                        erpCode: savedPayment.erpCode,
                    });

                    return savedPayment.qr;
                } else {
                    this.logger.logPaymentTransaction(transactionId, 'generateQR', 'FAILED', {
                        response: qrResponse,
                    });
                }
            }

            if (existingPayment) {
                this.logger.log(`Returning existing payment QR for ${erpCode}`);
                this.logger.logPaymentTransaction(transactionId, 'savePaymentInformation', 'COMPLETED', {
                    status: 'existing_payment_found',
                    paymentId: existingPayment.paymentId,
                });
                return existingPayment.qr;
            }

            return null;
        } catch (error) {
            this.logger.error(`Error en savePaymentInformation: ${error.message}`, error.stack);
            this.logger.logPaymentTransaction(transactionId, 'savePaymentInformation', 'FAILED', {
                error: error.message,
                stack: error.stack,
            });
            return null;
        }
    }

    /**
     * Generar estructura de additional data
     * Replica: PaymentRepository::generateAdditionalData()
     */
    private async generateAdditionalData(
        studentName: string,
        studentCode: string,
        transactionId: string,
        businessName: string,
        dni: string,
        documentType: string,
        complement: string,
        concept: string,
        period: string,
        discount: string,
        amount: string,
        finePay: string,
        invoice: string,
        currency: string,
    ): Promise<any> {
        return {
            personalItems: {
                studentName,
                studentCode,
                transactionId,
                currency: currency === 'USD' ? 1 : 0,
            },
            invoiceItems: {
                businessName,
                dni,
                DocumentType: documentType,
                Complement: complement,
            },
            additionalDataItems: {
                sourceChannel: 4,
                keyValue: transactionId,
            },
            Items: [
                {
                    concept,
                    period,
                    finePay: parseFloat(
                        currency === 'USD' ? finePay : await this.convertToBob(finePay),
                    ),
                    discountPay: parseFloat(
                        currency === 'USD' ? discount : await this.convertToBob(discount),
                    ),
                    amountPay: parseFloat(
                        currency === 'USD' ? amount : await this.convertToBob(amount),
                    ),
                    invoice: invoice === 'Y',
                    pay: true,
                },
            ],
        };
    }

    /**
     * Convertir USD a BOB usando tipo de cambio
     * Replica: PaymentRepository::convertToBob()
     */
    private async convertToBob(amount: string | number): Promise<string> {
        const exchangeRate = await this.exchangeRateRepository.findOne({
            where: { enabled: true },
        });

        if (!exchangeRate) {
            this.logger.warn('No exchange rate found, using default');
            return (parseFloat(amount.toString()) * 6.96).toFixed(2);
        }

        const converted =
            parseFloat(amount.toString()) * exchangeRate.exchangeRate;
        return (Math.round(converted * 100) / 100).toFixed(2);
    }

    getStaticPending(): any {
        return {
            idProceso: '',
            idTransaccion: '',
            NombreDeudor: '',
            MonedaDelCobro: '',
            MontoDelCobro: '',
            DetalleDelCobro: {
                ConceptoPago: '',
                PeriodoPago: '',
                MultaPago: '',
                DescuentoPago: '',
                MontoPago: '',
                Facturable: '',
            },
            DatosFactura: {
                IdGeneraFact: '',
                NITCIFact: '',
                NombreFact: '',
                ModDatosFact: '',
                DocumentType: '',
                Complement: '',
            },
        };
    }
}
