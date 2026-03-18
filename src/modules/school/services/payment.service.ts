import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from '../../../database/entities/payment.entity';
import { BnbService } from 'src/modules/external-api/services/bnb.service';
import { CustomLoggerService } from 'src/common/logger';
import { GenerateQrDto } from '../dto/generate-qr.dto';
import { BgService } from 'src/modules/external-api/services/bg.service';
import { PaymentDataInterface, PaymentDataSaveInterface } from '../interface/payment-data.interface';

/**
 * PaymentService - Replica exacta de PaymentRepository de Laravel
 * Integra con API de Banco Nacional de Bolivia para generar QR de pagos
 */
@Injectable()
export class PaymentService {
    private readonly logger: CustomLoggerService;

    constructor(
        @InjectRepository(Payment)
        private readonly paymentRepository: Repository<Payment>,
        private readonly bnbService: BnbService,
        private readonly bgService: BgService,
        private readonly customLogger: CustomLoggerService,
    ) {
        this.logger = this.customLogger.setContext(PaymentService.name);
    }

    /**
     * Guardar información de pago y generar QR
     */
    async savePaymentInformation(
        dataPayment: GenerateQrDto
    ): Promise<string | null> {

        const { bank_name, erp_code, payment_information } = dataPayment;

        this.logger.log(`savePaymentInformation called for erpCode: ${erp_code}`);
        this.logger.log(`Debt information: ${JSON.stringify(payment_information)}`);

        let transactionId: string;

        try {
            this.logger.logPaymentTransaction(erp_code, 'savePaymentInformation', 'INITIATED', {
                erpCode: erp_code,
                amount: payment_information?.amount
            });

            // Validar que students exista y sea un array válido
            if (!payment_information?.students || !Array.isArray(payment_information.students) || payment_information.students.length === 0) {
                this.logger.error(`payment_information.students is missing or empty for erpCode: ${erp_code}`);
                this.logger.error(`payment_information received: ${JSON.stringify(payment_information)}`);
                return null;
            }

            // Concatenar IDs de transacción y el LinNum para generar un transactionId único 
            transactionId = payment_information.students
                .flatMap(s => s.orderLines)
                .map(ol => `${ol.orderDocEntry}-${ol.lineNum}`)
                .sort()
                .join('|');

            this.logger.debug(`Generated transactionId: ${transactionId}`);

            const now = new Date();
            now.setHours(0, 0, 0, 0);

            this.logger.logPaymentTransaction(transactionId, 'checkExistingPayment', 'PROCESSING', {
                erp_code,
                date: now.toISOString(),
            });

            // Buscar pago existente
            const existingPayment = await this.paymentRepository.findOneBy({
                transactionId: transactionId,
            });

            // Si no existe, crear nuevo
            if (existingPayment) {
                const timeWithBuffer = new Date();
                timeWithBuffer.setMinutes(timeWithBuffer.getMinutes() + 5);

                if (existingPayment.expirationDate < timeWithBuffer) {
                    this.logger.log(`Existing payment for ${erp_code} has expired or will expire soon, creating new one`);
                    await this.paymentRepository.delete({ paymentId: existingPayment.paymentId });

                    const newQr = await this.generateQr({
                        erp_code,
                        transactionId,
                        nit: payment_information.nit,
                        payment_information,
                        amount: payment_information.amount,
                        cuotas: payment_information.cuotas,
                        bank_name,
                    });
                    return newQr;
                } else {
                    this.logger.log(`Returning existing payment QR for ${erp_code}`);
                    this.logger.logPaymentTransaction(transactionId, 'savePaymentInformation', 'COMPLETED', {
                        status: 'existing_payment_found',
                        paymentId: existingPayment.paymentId,
                    });
                    return existingPayment.qr;
                }

            } else {
                this.logger.log(`No existing payment found for ${erp_code}, creating new one`);
                const newQr = await this.generateQr({
                    erp_code,
                    transactionId,
                    nit: payment_information.nit,
                    payment_information,
                    amount: payment_information.amount,
                    cuotas: payment_information.cuotas,
                    bank_name,
                });
                return newQr;
            }
        } catch (error) {
            this.logger.error(`Error en savePaymentInformation: ${error.message}`, error.stack);
            this.logger.logPaymentTransaction(transactionId, 'savePaymentInformation', 'FAILED', {
                error: error.message,
                stack: error.stack,
            });
            // Propagamos la excpeción en lugar de tragarla para que el controlador (y el usuario) vean el problema
            throw error;
        }
    }

    private async savePayment(paymentData: PaymentDataSaveInterface) {
        const { erp_code, qrId, expirationDate, data, qrImage, createdBy, transactionId } = paymentData;

        try {
            this.logger.logPaymentTransaction(transactionId, 'savePaymentInformation', 'INITIATED', {
                erpCode: erp_code,
                paymentId: qrId
            });

            // Guardar payment en BD
            const newPayment = this.paymentRepository.create({
                erpCode: erp_code,
                paymentId: qrId,
                expirationDate: new Date(expirationDate),
                data,
                qr: qrImage,
                createdBy: createdBy,
                transactionId: transactionId,
            });

            const savedPayment = await this.paymentRepository.save(newPayment);

            this.logger.logPaymentTransaction(paymentData.transactionId, 'savePaymentInformation', 'COMPLETED', {
                paymentId: savedPayment.id,
                qrId: savedPayment.paymentId,
                erpCode: savedPayment.erpCode,
            });

        } catch (error) {
            this.logger.error('Error saving payment:', error);
            // return null;    
        }
    }

    private async generateQr(paymentData: PaymentDataInterface): Promise<string> {
        const { erp_code, transactionId, nit, payment_information, amount, bank_name } = paymentData;
        try {
            this.logger.log(`No existing payment found for ${erp_code}, creating new one`);

            // Cálculo de expiración exacto para la BD (Mañana justo antes de medianoche)
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(23, 59, 59, 999);

            // ISO string completo (con horas) para garantizar precisión con Zonas Horarias al grabar localmente
            const dbExpirationDate = tomorrow.toISOString();

            // Formatear las fechas como los bancos exigen a nivel texto
            const year = tomorrow.getFullYear();
            const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
            const day = String(tomorrow.getDate()).padStart(2, '0');

            const bnbExpirationDate = `${year}-${month}-${day}`; // Formato: YYYY-MM-DD
            const bgExpirationDate = `${day}${month}${year}`;    // Formato: ddmmyyyy

            if (!/^\d+$/.test(nit)) {
                this.logger.warn(`Invalid NIT format: ${nit}`);
                this.logger.logPaymentTransaction(transactionId, 'validateNIT', 'FAILED', {
                    nit,
                    error: 'Invalid NIT format - must be numeric only',
                });
                return null;
            }

            this.logger.logPaymentTransaction(transactionId, 'generateAdditionalData', 'PROCESSING');

            const additionalData = {
                transactionId: transactionId
            };

            this.logger.logPaymentTransaction(transactionId, 'generateQR', 'PROCESSING', {
                amount,
                dbExpirationDate,
                bnbExpirationDate,
                bgExpirationDate
            });

            var qrResponse = null;

            switch (bank_name) {
                case 'BNB':
                    const payloadQrBnb = {
                        additionalData,
                        amount,
                        gloss: `${erp_code}, ${payment_information.cuotas} Mensualidad`,
                        expirationDate: bnbExpirationDate,
                    };
                    qrResponse = await this.bnbService.generateQR(payloadQrBnb);
                    break;

                case 'BG':
                    const payloadQrBg = {
                        additionalData,
                        amount,
                        gloss: `${erp_code}, ${payment_information.cuotas} Mensualidad`,
                        expirationDate: bgExpirationDate,
                    };
                    qrResponse = await this.bgService.generateQR(payloadQrBg);
                    break;

                default:
                    throw new Error(`Bank not found: ${bank_name}`);
            }

            if (qrResponse && qrResponse.success) {
                this.logger.logPaymentTransaction(paymentData.transactionId, 'savePayment', 'PROCESSING', {
                    qrId: qrResponse.qrId,
                });

                await this.savePayment({
                    erp_code,
                    transactionId,
                    qrId: qrResponse.qrId,
                    expirationDate: dbExpirationDate,
                    data: JSON.stringify(payment_information),
                    qrImage: qrResponse.qrImage,
                    createdBy: bank_name
                })

                return qrResponse.qrImage;

            } else {
                this.logger.logPaymentTransaction(paymentData.transactionId, 'generateQR', 'FAILED', {
                    response: qrResponse,
                });
                return null;
            }
        } catch (error) {
            this.logger.error('Error generating QR:', error);
            throw error;
        }
    }
}
