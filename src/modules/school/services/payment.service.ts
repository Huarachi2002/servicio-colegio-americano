import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { Payment } from '../../../database/entities/payment.entity';
import { ExchangeRate } from '../../../database/entities/exchange-rate.entity';
import { BnbService } from 'src/modules/external-api/services/bnb.service';
import { DebtConsultationResponse } from '../../integrations/sap/interfaces/debt-consultation.interface';
import * as fs from 'fs';
import * as path from 'path';

/**
 * PaymentService - Replica exacta de PaymentRepository de Laravel
 * Integra con API de Banco Nacional de Bolivia para generar QR de pagos
 */
@Injectable()
export class PaymentService {
    private readonly logger = new Logger(PaymentService.name);
    private readonly BNB_BASE_URL = 'https://marketapi.bnb.com.bo';
    private readonly BNB_ACCOUNT_ID = 'g7DEvMw2qBviGg51A0e4Ug==';
    private readonly BNB_AUTHORIZATION_ID = 'PtmN+CwInC8cJ0BDZPACTg==';
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
    ) { }

    /**
     * Guardar información de pago y generar QR
     */
    async savePaymentInformation(
        erpCode: string,
        debtInformation: any,
    ): Promise<string | null> {
        this.logger.log('savePaymentInformation called');
        this.logger.log(JSON.stringify(debtInformation));

        try {
            const now = new Date();
            now.setHours(0, 0, 0, 0);

            // Buscar pago existente
            const existingPayment = await this.paymentRepository.findOneBy({
                erpCode,
                expirationDate: now,
            });

            // Si no existe, crear nuevo
            if (!existingPayment) {
                const glossAux = debtInformation.DetalleDelCobro;
                const invoiceData = debtInformation.DatosFactura;

                // Fecha de expiración: mañana
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                const expirationDate = tomorrow.toISOString().split('T')[0];

                // Validar NIT (solo números)
                if (!/^\d+$/.test(invoiceData.NITCIFact)) {
                    this.logger.warn('Invalid NIT format');
                    return null;
                }

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

                // Generar QR desde API BNB
                const qrResponse = await this.bnbService.generateQR(
                    additionalData,
                    debtInformation.MontoDelCobro,
                    `${erpCode}, ${glossAux.PeriodoPago} ${glossAux.ConceptoPago}`,
                    debtInformation.MonedaDelCobro,
                    expirationDate,
                );

                if (qrResponse && qrResponse.success) {
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
                    return savedPayment.qr;
                }
            }

            if (existingPayment) {
                return existingPayment.qr;
            }

            return null;
        } catch (error) {
            this.logger.error('Error en savePaymentInformation', {
                message: error.message,
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

    /**
     * Login en API BNB
     * Replica: PaymentRepository::Login()
     */
    private async loginBnb(): Promise<string> {
        try {
            const response = await axios.post(
                `${this.BNB_BASE_URL}/ClientAuthentication.API/api/v1/auth/token`,
                {
                    accountId: this.BNB_ACCOUNT_ID,
                    authorizationId: this.BNB_AUTHORIZATION_ID,
                },
            );

            return response.data.message;
        } catch (error) {
            this.logger.error('Error logging in to BNB:', error.message);
            throw error;
        }
    }

    /**
     * Obtener token de autorización (con cache de 30 minutos)
     * Replica: PaymentRepository::getAuthorization()
     */
    private async getAuthorization(login: boolean = false): Promise<string> {
        if (login) {
            const token = await this.loginBnb();
            this.authToken = {
                token,
                datetime: new Date(),
            };

            // Guardar en archivo (opcional, Laravel lo hace)
            // this.saveAuthToFile(this.authToken);

            return `Bearer ${token}`;
        }

        // Verificar si hay token cacheado válido
        if (this.authToken) {
            const now = new Date();
            const tokenTime = new Date(this.authToken.datetime);
            const diffMinutes =
                (now.getTime() - tokenTime.getTime()) / 1000 / 60;

            if (diffMinutes < 30) {
                return `Bearer ${this.authToken.token}`;
            }
        }

        // Token expirado, renovar
        return this.getAuthorization(true);
    }

    /**
     * Retornar respuesta estática cuando no hay deuda
     * Replica: PaymentRepository::getStaticPending()
     */
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
