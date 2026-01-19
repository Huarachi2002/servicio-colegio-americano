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
    FamilyPlanResponse,
    ConsultaDeudaFamiliarXmlData,
    StudentDebtInfo,
    OrdenInfo,
    CuotaItem,
    EstudianteXmlData,
    OrdenXmlData,
    CuotaXmlData,
    StudentsDebtDetails,
} from '../interfaces/debt-consultation.interface';

@Injectable()
export class SapDebtService {
    private readonly logger = new Logger(SapDebtService.name);

    constructor(private readonly sapService: SapService) { }

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

    async getPendingFamilyDebts(
        parentCode: string,
    ): Promise<FamilyPlanResponse | null> {
        try {
            this.logger.log(`Consultando deuda pendiente para padre: ${parentCode} de sus hijos`);

            // Ejecutar stored procedure SP_B_ConsultaDeudaFamiliar
            const result = await this.sapService.executeStoredProcedure<ConsultaDeudaFamiliarXmlData>(
                'SP_B_ConsultaDeudaFamiliar',
                parentCode,
            );

            if (!result) {
                this.logger.warn(`No hay deuda pendiente para ${parentCode}`);
                return null;
            }

            // Transformar respuesta XML a interface tipada
            return this.transformFamilyDebtResponse(result);
        } catch (error) {
            this.logger.error(`Error obteniendo deuda pendiente: ${error.message}`);
            return null;
        }
    }

    private transformDebtResponse(xmlData: ConsultaDeudaXmlData): DebtConsultationResponse {
        return {
            idProceso: String(xmlData.idProceso || 'False'),
            MensajeProceso: String(xmlData.MensajeProceso || ''),
            idTransaccion: String(xmlData.idTransaccion || '0',),
            parentCode: String(xmlData.parentCode || ''),
            NombreDeudor: String(xmlData.NombreDeudor || ''),
            MonedaDelCobro: xmlData.MonedaDelCobro,
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

    private transformFamilyDebtResponse(
        xmlData: ConsultaDeudaFamiliarXmlData,
    ): FamilyPlanResponse {
        // Normalizar Estudiantes: puede venir como objeto o array
        const estudiantesRaw = xmlData.Estudiantes?.Estudiante;
        const estudiantesArray: EstudianteXmlData[] = Array.isArray(estudiantesRaw)
            ? estudiantesRaw
            : estudiantesRaw
                ? [estudiantesRaw]
                : [];

        // Calcular monto total sumando todos los estudiantes
        let montoTotalFamiliar = 0;

        // Transformar cada estudiante
        const estudiantes: StudentDebtInfo[] = estudiantesArray.map((estudiante) => {
            // Normalizar ListaOrdenes: puede venir como objeto o array
            const ordenesRaw = estudiante.ListaOrdenes?.Orden;
            const ordenesArray: OrdenXmlData[] = Array.isArray(ordenesRaw)
                ? ordenesRaw
                : ordenesRaw
                    ? [ordenesRaw]
                    : [];

            // Transformar cada orden
            const ordenes: OrdenInfo[] = ordenesArray.map((orden) => {
                // Normalizar DetalleCuotas: puede venir como objeto o array
                const cuotasRaw = orden.DetalleCuotas?.Cuota;
                const cuotasArray: CuotaXmlData[] = Array.isArray(cuotasRaw)
                    ? cuotasRaw
                    : cuotasRaw
                        ? [cuotasRaw]
                        : [];

                // Transformar cada cuota
                const cuotas: CuotaItem[] = cuotasArray.map((cuota) => {
                    const periodoStr = String(cuota.PeriodoDeuda || '');
                    const fechaVencimiento = this.calcularFechaVencimiento(periodoStr);

                    return {
                        lineNum: Number(cuota.LineNum) || 0,
                        concepto: String(cuota.ConceptoDeuda || ''),
                        periodo: periodoStr,
                        fechaVencimiento,
                        multa: Number(cuota.MultaDeuda) || 0,
                        descuento: Number(cuota.DescuentoDeuda) || 0,
                        monto: Number(cuota.MontoDeuda) || 0,
                    };
                });

                return {
                    idTransaccion: Number(orden.IdTransaccion) || 0,
                    cuotas,
                };
            });

            const montoEstudiante = Number(estudiante.MontoTotalEstudiante) || 0;
            montoTotalFamiliar += montoEstudiante;

            return {
                codigoEstudiante: String(estudiante.CodigoEstudiante || ''),
                nombreEstudiante: String(estudiante.NombreEstudiante || ''),
                montoTotal: montoEstudiante,
                ordenes,
            };
        });

        return {
            nombrePadre: String(xmlData.NombrePadre || ''),
            razonSocial: String(xmlData.RazonSocial || ''),
            nit: String(xmlData.Nit || ''),
            moneda: String(xmlData.MonedaGlobal || 'BOB'),
            montoTotal: montoTotalFamiliar,
            estudiantes,
        };
    }

    /** Helper para calcular fecha de vencimiento desde periodo "M - AAAA" */
    private calcularFechaVencimiento(periodoStr: string): string {
        if (!periodoStr || !periodoStr.includes(' - ')) {
            return '';
        }

        const periodoMes = periodoStr.substring(0, periodoStr.indexOf(' '));
        const periodoAnio = periodoStr.substring(periodoStr.indexOf('-') + 2);
        const mes = periodoMes.padStart(2, '0'); // "1" -> "01"

        return `${periodoAnio}-${mes}-15`;
    }

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
        const detalleDeuda: PendingDebtDetail[] = detalleDeudaArray.map((detalle) => {
            // Convertir PeriodoDeuda a string antes de operar
            const periodoDeudaStr = String(detalle.PeriodoDeuda || '');

            // detalle.PeriodoDeuda tiene formato "M - AAAA", extraer mes para posible uso futuro
            let periodoMes = '';
            let periodoAnio = '';
            let fechaVencimiento = '';

            if (periodoDeudaStr && periodoDeudaStr.includes(' - ')) {
                periodoMes = periodoDeudaStr.substring(0, periodoDeudaStr.indexOf(' '));
                periodoAnio = periodoDeudaStr.substring(periodoDeudaStr.indexOf('-') + 2);

                switch (periodoMes) {
                    case '1':
                        fechaVencimiento = `${periodoAnio}-01-15`;
                        break;
                    case '2':
                        fechaVencimiento = `${periodoAnio}-02-15`;
                        break;
                    case '3':
                        fechaVencimiento = `${periodoAnio}-03-15`;
                        break;
                    case '4':
                        fechaVencimiento = `${periodoAnio}-04-15`;
                        break;
                    case '5':
                        fechaVencimiento = `${periodoAnio}-05-15`;
                        break;
                    case '6':
                        fechaVencimiento = `${periodoAnio}-06-15`;
                        break;
                    case '7':
                        fechaVencimiento = `${periodoAnio}-07-15`;
                        break;
                    case '8':
                        fechaVencimiento = `${periodoAnio}-08-15`;
                        break;
                    case '9':
                        fechaVencimiento = `${periodoAnio}-09-15`;
                        break;
                    case '10':
                        fechaVencimiento = `${periodoAnio}-10-15`;
                        break;
                    case '11':
                        fechaVencimiento = `${periodoAnio}-11-15`;
                        break;
                    case '12':
                        fechaVencimiento = `${periodoAnio}-12-15`;
                        break;
                    default:
                        fechaVencimiento = '';
                }
            }
            return {
                IdTransaccion: String(detalle.IdTransaccion || '0'),
                LinNum: String(detalle.LinNum || detalle.LinNum || '0'),
                Facturable: String(detalle.Facturable || 'N'),
                ConceptoDeuda: String(detalle.ConceptoDeuda || ''),
                PeriodoDeuda: periodoDeudaStr,
                FechaVencimiento: fechaVencimiento,
                MultaDeuda: String(detalle.MultaDeuda || '0'),
                DescuentoDeuda: String(detalle.DescuentoDeuda || '0'),
                MontoDeuda: String(detalle.MontoDeuda || '0'),
            }
        });

        return {
            idProceso: String(xmlData.idProceso || 'False'),
            MensajeProceso: String(xmlData.MensajeProceso || ''),
            NombreDeudor: String(xmlData.NombreDeudor || ''),
            RazonSocial: String(xmlData.RazonSocial || ''),
            Nit: String(xmlData.Nit || ''),
            MonedaDeuda: xmlData.MonedaDeuda || 'BOB',
            MontoDeuda: String(xmlData.MontoDeuda || '0'),
            DetalleDeuda: detalleDeuda,
        };
    }

    private getEmptyDebtResponse(message: string): DebtConsultationResponse {
        return {
            idProceso: 'False',
            MensajeProceso: message,
            idTransaccion: '0',
            parentCode: '',
            NombreDeudor: '',
            MonedaDelCobro: 'BOB',
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
