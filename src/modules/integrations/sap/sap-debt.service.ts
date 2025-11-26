import { Injectable, Logger } from '@nestjs/common';
import { SapService } from './sap.service';
import {
    DebtConsultationResponse,
    DebtDetail,
    InvoiceData,
} from './interfaces/debt-consultation.interface';

/**
 * Servicio especializado para consultas de deuda desde SAP
 */
@Injectable()
export class SapDebtService {
    private readonly logger = new Logger(SapDebtService.name);

    constructor(private readonly sapService: SapService) { }

    /**
     * Consultar deuda del estudiante
     */
    async getDebtConsultation(
        studentErpCode: string,
    ): Promise<DebtConsultationResponse | null> {
        try {
            this.logger.log(`Consultando deuda para estudiante: ${studentErpCode}`);

            // Ejecutar stored procedure
            const result = await this.sapService.executeStoredProcedure(
                // 'SP_B_ConsultaDeudaLaravel',
                'SP_B_ConsultaDeuda',
                studentErpCode,
            );

            if (!result) {
                this.logger.warn(`No hay datos de deuda para ${studentErpCode}`);
                return this.getEmptyDebtResponse('No se encontró información');
            }

            // Transformar respuesta
            return this.transformDebtResponse(result);
        } catch (error) {
            this.logger.error(
                `Error obteniendo deuda: ${error.message}`,
                error.stack,
            );
            return this.getEmptyDebtResponse('Error al consultar deuda');
        }
    }

    /**
     * Consultar deuda pendiente (diferente SP)
     */
    async getPendingDebtConsultation(
        studentErpCode: string,
    ): Promise<DebtConsultationResponse | null> {
        try {
            const result = await this.sapService.executeStoredProcedure(
                'SP_B_ConsultaDeudaPendiente',
                studentErpCode,
            );

            if (!result) {
                return null;
            }

            return this.transformPendingDebtResponse(result);
        } catch (error) {
            this.logger.error(`Error obteniendo deuda pendiente: ${error.message}`);
            return null;
        }
    }

    /**
     * Transformar respuesta XML parseada a TypeScript
     */
    private transformDebtResponse(xmlData: any): DebtConsultationResponse {
        return {
            idProceso: String(xmlData.idProceso || 'False'),
            MensajeProceso: String(xmlData.MensajeProceso || ''),
            idTransaccion: String(
                xmlData.IdTransaccion || xmlData.idTransaccion || '0',
            ),
            NombreDeudor: String(xmlData.NombreDeudor || ''),
            MonedaDelCobro: xmlData.MonedaDelCobro === 'U' ? 'U' : 'B',
            MontoDelCobro: String(xmlData.MontoDelCobro || '0'),
            TipoCambio: String(xmlData.TipoCambio || '6.96'),
            DetalleDelCobro: {
                ConceptoPago: String(xmlData.DetalleDelCobro?.ConceptoPago || ''),
                PeriodoPago: String(xmlData.DetalleDelCobro?.PeriodoPago || ''),
                MultaPago: String(xmlData.DetalleDelCobro?.MultaPago || '0'),
                DescuentoPago: String(xmlData.DetalleDelCobro?.DescuentoPago || '0'),
                MontoPago: String(xmlData.DetalleDelCobro?.MontoPago || '0'),
                Facturable: String(xmlData.DetalleDelCobro?.Facturable || '0'),
            },
            DatosFactura: {
                IdGeneraFact: String(xmlData.DatosFactura?.IdGeneraFact || '0'),
                NITCIFact: String(xmlData.DatosFactura?.NITCIFact || ''),
                NombreFact: String(xmlData.DatosFactura?.NombreFact || ''),
                ModDatosFact: String(xmlData.DatosFactura?.ModDatosFact || '0'),
                DocumentType: String(xmlData.DatosFactura?.DocumentType || '0'),
                Complement: String(xmlData.DatosFactura?.Complement || null),
            },
        };
    }

    /**
     * Transformar respuesta de deuda pendiente (puede venir con array)
     */
    private transformPendingDebtResponse(
        xmlData: any,
    ): DebtConsultationResponse {
        // La deuda pendiente puede venir con DetalleDeuda como array
        let detalleDeuda = xmlData.DetalleDeuda;
        if (!Array.isArray(detalleDeuda)) {
            detalleDeuda = detalleDeuda ? [detalleDeuda] : [];
        }

        // Usar el primer detalle si existe
        const firstDetail = detalleDeuda[0] || {};

        return {
            idProceso: String(xmlData.idProceso || 'False'),
            MensajeProceso: String(xmlData.MensajeProceso || ''),
            idTransaccion: String(xmlData.idTransaccion || '0'),
            NombreDeudor: String(xmlData.NombreDeudor || ''),
            MonedaDelCobro: xmlData.MonedaDelCobro === 'U' ? 'U' : 'B',
            MontoDelCobro: String(xmlData.MontoDelCobro || '0'),
            TipoCambio: String(xmlData.TipoCambio || '6.96'),
            DetalleDelCobro: {
                ConceptoPago: String(firstDetail.ConceptoPago || ''),
                PeriodoPago: String(firstDetail.PeriodoPago || ''),
                MultaPago: String(firstDetail.MultaPago || '0'),
                DescuentoPago: String(firstDetail.DescuentoPago || '0'),
                MontoPago: String(firstDetail.MontoPago || '0'),
                Facturable: String(firstDetail.Facturable || '0'),
            },
            DatosFactura: {
                IdGeneraFact: String(xmlData.DatosFactura?.IdGeneraFact || '0'),
                NITCIFact: String(xmlData.DatosFactura?.NITCIFact || ''),
                NombreFact: String(xmlData.DatosFactura?.NombreFact || ''),
                ModDatosFact: String(xmlData.DatosFactura?.ModDatosFact || '0'),
                DocumentType: String(xmlData.DatosFactura?.DocumentType || '0'),
                Complement: String(xmlData.DatosFactura?.Complement || null),
            },
        };
    }

    /**
     * Respuesta vacía cuando no hay deuda
     */
    private getEmptyDebtResponse(message: string): DebtConsultationResponse {
        return {
            idProceso: 'False',
            MensajeProceso: message,
            idTransaccion: '0',
            NombreDeudor: '',
            MonedaDelCobro: 'U',
            MontoDelCobro: '0',
            TipoCambio: '6.96',
            DetalleDelCobro: {
                ConceptoPago: '',
                PeriodoPago: '',
                MultaPago: '0',
                DescuentoPago: '0',
                MontoPago: '0',
                Facturable: '0',
            },
            DatosFactura: {
                IdGeneraFact: '0',
                NITCIFact: '',
                NombreFact: '',
                ModDatosFact: '0',
                DocumentType: '0',
                Complement: null,
            },
        };
    }
}
