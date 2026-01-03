import { Injectable, Logger } from '@nestjs/common';
import { SapService } from './sap.service';
import {
    DebtConsultationResponse,
    DebtDetail,
    InvoiceData,
    PendingDebtConsultationResponse,
    PendingDebtDetail,
    ConsultaDeudaXmlData,
    ConsultaDeudaPendienteXmlData,
} from './interfaces/debt-consultation.interface';

/**
 * Servicio especializado para consultas de deuda desde SAP
 */
@Injectable()
export class SapDebtService {
    private readonly logger = new Logger(SapDebtService.name);

    constructor(private readonly sapService: SapService) { }

    /**
     * Consultar deuda del estudiante (SP_A_ConsultaDeudaLaravel)
     * Retorna una deuda específica con datos de facturación
     */
    async getDebtConsultation(
        studentErpCode: string,
    ): Promise<DebtConsultationResponse | null> {
        try {
            this.logger.log(`Consultando deuda para estudiante: ${studentErpCode}`);

            // Ejecutar stored procedure SP_A_ConsultaDeudaLaravel
            const result = await this.sapService.executeStoredProcedure<ConsultaDeudaXmlData>(
                'SP_ConsultaDeudaLaravel',
                studentErpCode,
            );

            if (!result) {
                this.logger.warn(`No hay datos de deuda para ${studentErpCode}`);
                return this.getEmptyDebtResponse('No se encontró información');
            }

            // Transformar respuesta XML a interface tipada
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
     * Consultar deuda pendiente (SP_B_ConsultaDeudaPendiente)
     * Retorna lista completa de deudas pendientes del estudiante
     */
    async getPendingDebtConsultation(
        studentErpCode: string,
    ): Promise<PendingDebtConsultationResponse | null> {
        try {
            this.logger.log(`Consultando deuda pendiente para estudiante: ${studentErpCode}`);

            // Ejecutar stored procedure SP_B_ConsultaDeudaPendiente
            const result = await this.sapService.executeStoredProcedure<ConsultaDeudaPendienteXmlData>(
                'SP_B_ConsultaDeudaPendiente',
                studentErpCode,
            );

            if (!result) {
                this.logger.warn(`No hay deuda pendiente para ${studentErpCode}`);
                return null;
            }

            // Transformar respuesta XML a interface tipada
            return this.transformPendingDebtResponse(result);
        } catch (error) {
            this.logger.error(`Error obteniendo deuda pendiente: ${error.message}`);
            return null;
        }
    }

    /**
     * Transformar respuesta XML de SP_A_ConsultaDeudaLaravel
     * @param xmlData Datos crudos del XML parseado
     * @returns DebtConsultationResponse tipada
     */
    private transformDebtResponse(xmlData: ConsultaDeudaXmlData): DebtConsultationResponse {
        return {
            idProceso: String(xmlData.idProceso || 'False'),
            MensajeProceso: String(xmlData.MensajeProceso || ''),
            idTransaccion: String(
                xmlData.IdTransaccion || xmlData.idTransaccion || '0',
            ),
            parentCode: String(xmlData.parentCode || ''),
            NombreDeudor: String(xmlData.NombreDeudor || ''),
            MonedaDelCobro: xmlData.MonedaDelCobro === 'U' ? 'U' : 'B',
            MontoDelCobro: String(xmlData.MontoDelCobro || '0'),
            TipoCambio: xmlData.TipoCambio ? String(xmlData.TipoCambio) : undefined,
            DetalleDelCobro: {
                ConceptoPago: String(xmlData.DetalleDelCobro?.ConceptoPago || ''),
                PeriodoPago: String(xmlData.DetalleDelCobro?.PeriodoPago || ''),
                MultaPago: String(xmlData.DetalleDelCobro?.MultaPago || '0'),
                DescuentoPago: String(xmlData.DetalleDelCobro?.DescuentoPago || '0'),
                MontoPago: String(xmlData.DetalleDelCobro?.MontoPago || '0'),
                Facturable: String(xmlData.DetalleDelCobro?.Facturable || 'N'),
            },
            DatosFactura: {
                IdGeneraFact: String(xmlData.DatosFactura?.IdGeneraFact || 'N'),
                NITCIFact: String(xmlData.DatosFactura?.NITCIFact || ''),
                NombreFact: String(xmlData.DatosFactura?.NombreFact || ''),
                ModDatosFact: String(xmlData.DatosFactura?.ModDatosFact || 'N'),
                DocumentType: String(xmlData.DatosFactura?.DocumentType || '0'),
                Complement: xmlData.DatosFactura?.Complement || null,
            },
        };
    }

    /**
     * Transformar respuesta XML de SP_B_ConsultaDeudaPendiente
     * El XML puede tener múltiples nodos DetalleDeuda que el parser
     * puede devolver como objeto (si hay uno) o array (si hay varios)
     * @param xmlData Datos crudos del XML parseado
     * @returns PendingDebtConsultationResponse tipada con array de detalles
     */
    private transformPendingDebtResponse(
        xmlData: ConsultaDeudaPendienteXmlData,
    ): PendingDebtConsultationResponse {
        // Normalizar DetalleDeuda: puede venir como objeto o array
        let detalleDeudaRaw = xmlData.DetalleDeuda;
        const detalleDeudaArray = Array.isArray(detalleDeudaRaw)
            ? detalleDeudaRaw
            : detalleDeudaRaw
                ? [detalleDeudaRaw]
                : [];

        // Transformar cada detalle de deuda
        const detalleDeuda: PendingDebtDetail[] = detalleDeudaArray.map((detalle) => ({
            Facturable: String(detalle.Facturable || 'N'),
            ConceptoDeuda: String(detalle.ConceptoDeuda || ''),
            PeriodoDeuda: String(detalle.PeriodoDeuda || ''),
            MultaDeuda: String(detalle.MultaDeuda || '0'),
            DescuentoDeuda: String(detalle.DescuentoDeuda || '0'),
            MontoDeuda: String(detalle.MontoDeuda || '0'),
        }));

        return {
            idProceso: String(xmlData.idProceso || 'False'),
            MensajeProceso: String(xmlData.MensajeProceso || ''),
            NombreDeudor: String(xmlData.NombreDeudor || ''),
            MonedaDeuda: xmlData.MonedaDeuda === 'U' ? 'U' : 'B',
            MontoDeuda: String(xmlData.MontoDeuda || '0'),
            DetalleDeuda: detalleDeuda,
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
            parentCode: '',
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
