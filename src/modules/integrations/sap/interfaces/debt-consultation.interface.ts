/**
 * =====================================================
 * INTERFACES PARA SP_A_ConsultaDeudaLaravel
 * Respuesta de consulta de deuda específica (cuota seleccionada)
 * =====================================================
 */

export interface DebtConsultationResponse {
    idProceso: string; // 'True' o 'False'
    MensajeProceso: string; // Mensaje de error o vacío
    idTransaccion: string; // DocEntry de SAP
    parentCode: string; // Codigo de la tarjeta
    NombreDeudor: string; // Nombre del estudiante/deudor
    MonedaDelCobro: string; // U=USD, B=BOB
    MontoDelCobro: string; // Monto total (string desde XML)
    TipoCambio?: string; // Tipo de cambio (opcional, puede no venir)
    DetalleDelCobro: DebtDetail;
    DatosFactura: InvoiceData;
}

export interface DebtDetail {
    ConceptoPago: string; // Ej: "Mensualidad - Primaria"
    PeriodoPago: string; // Ej: "6 - 2026" (mes - año)
    MultaPago: string; // Monto de multa
    DescuentoPago: string; // Monto de descuento
    MontoPago: string; // Monto del pago
    Facturable: string; // 'Y' o 'N' (Si es facturable)
}

export interface InvoiceData {
    IdGeneraFact: string; // 'S' o 'N' (Si genera factura)
    NITCIFact: string; // NIT o CI para facturación
    NombreFact: string; // Nombre para facturación
    ModDatosFact: string; // 'S' o 'N' (Si puede modificar datos)
    DocumentType: string; // Tipo de documento: '5' = NIT, etc.
    Complement: string | null; // Complemento (puede estar vacío)
}

/**
 * =====================================================
 * INTERFACES PARA SP_B_ConsultaDeudaPendiente
 * Respuesta de consulta de deuda pendiente (lista completa)
 * =====================================================
 */

export interface PendingDebtConsultationResponse {
    idProceso: string; // 'True' o 'False'
    MensajeProceso: string; // Mensaje de error o vacío
    NombreDeudor: string; // Nombre del estudiante/deudor
    RazonSocial?: string; // Nombre para facturación (opcional)
    Nit?: string; // NIT o CI para facturación (opcional)
    MonedaDeuda: string; // B=BOB
    MontoDeuda: string; // Monto total de deuda pendiente
    DetalleDeuda: PendingDebtDetail[]; // Array de detalles de deuda
}

export interface PendingDebtDetail {
    IdTransaccion: string; // DocEntry de SAP
    LinNum: string; // Número de línea en la deuda pendiente
    Facturable: string; // 'Y' o 'N' (Si es facturable)
    ConceptoDeuda: string; // Ej: "Mensualidad"
    PeriodoDeuda: string; // Ej: "2 - 2026" (mes - año)
    FechaVencimiento: string; // Fecha de vencimiento (YYYY-MM-DD)
    MultaDeuda: string; // Monto de multa
    DescuentoDeuda: string; // Monto de descuento
    MontoDeuda: string; // Monto de la deuda
}

export interface ConsultaDeudaXmlData {
    idProceso?: string | boolean;
    MensajeProceso?: string;
    idTransaccion?: string | number;
    parentCode?: string;
    NombreDeudor?: string;
    MonedaDelCobro?: string;
    MontoDelCobro?: string | number;
    TipoCambio?: string | number;
    DetalleDelCobro?: {
        ConceptoPago?: string;
        PeriodoPago?: string;
        MultaPago?: string | number;
        DescuentoPago?: string | number;
        MontoPago?: string | number;
        Facturable?: string;
    };
    DatosFactura?: {
        IdGeneraFact?: string;
        NITCIFact?: string;
        NombreFact?: string;
        ModDatosFact?: string;
        DocumentType?: string | number;
        Complement?: string;
    };
}

/**
 * Datos crudos del XML de SP_B_ConsultaDeudaPendiente
 */
export interface ConsultaDeudaPendienteXmlData {
    idProceso?: string | boolean;
    MensajeProceso?: string;
    NombreDeudor?: string;
    RazonSocial?: string;
    Nit?: string;
    MonedaDeuda?: string;
    MontoDeuda?: string | number;
    DetalleDeuda?: PendingDebtDetailXmlData | PendingDebtDetailXmlData[]; // Puede ser objeto o array
}

/**
 * Detalle de deuda crudo del XML
 */
export interface PendingDebtDetailXmlData {
    IdTransaccion?: string | number;
    LinNum?: string | number;
    Facturable?: string;
    ConceptoDeuda?: string;
    PeriodoDeuda?: string;
    MultaDeuda?: string | number;
    DescuentoDeuda?: string | number;
    MontoDeuda?: string | number;
}

/**
 * =====================================================
 * INTERFACES PARA SP_B_ConsultaDeudaFamiliar
 * =====================================================
 */

export interface FamilyDebtResponse {
    NombreDeudor: string; // Nombre del estudiante/deudor
    RazonSocial?: string; // Nombre para facturación (opcional)
    Nit?: string; // NIT o CI para facturación (opcional)
    MonedaDeuda: string; // B=BOB
    MontoDeuda: string; // Monto total de deuda familiar
    StudentsDebts: StudentsDebtDetails[]; // Array de detalles de deuda
}

export interface StudentsDebtDetails {
    NombreEstudiante?: string;
    CodigoEstudiante?: string;
    MontoTotalEstudiante?: string | number;
    ListDebtDetails?: ListDebtDetail | ListDebtDetail[]; // Puede ser objeto o array
}

export interface ListDebtDetail {
    IdTransaccion?: string | number;
    LinNum?: string | number;
    Facturable?: string;
    ConceptoDeuda?: string;
    PeriodoDeuda?: string;
    MultaDeuda?: string | number;
    DescuentoDeuda?: string | number;
    MontoDeuda?: string | number;
}

/**
 * =====================================================
 * INTERFACES PARA SP_B_ConsultaDeudaFamiliar (Plan Familiar)
 * Respuesta de consulta de deudas agrupadas por familia
 * Estructura: PlanFamiliar → Estudiantes → Estudiante → ListaOrdenes → Orden → DetalleCuotas → Cuota
 * =====================================================
 */

/** Datos crudos del XML de SP_B_ConsultaDeudaFamiliar */
export interface ConsultaDeudaFamiliarXmlData {
    NombrePadre?: string;
    RazonSocial?: string;
    Nit?: string;
    MonedaGlobal?: string; // BOB o USD
    Estudiantes?: EstudiantesXmlData;
}

/** Contenedor de estudiantes en el XML */
export interface EstudiantesXmlData {
    Estudiante?: EstudianteXmlData | EstudianteXmlData[]; // Puede ser objeto o array
}

/** Datos de cada estudiante en el XML */
export interface EstudianteXmlData {
    NombreEstudiante?: string;
    CodigoEstudiante?: string | number;
    MontoTotalEstudiante?: string | number;
    ListaOrdenes?: ListaOrdenesXmlData;
}

/** Contenedor de órdenes en el XML */
export interface ListaOrdenesXmlData {
    Orden?: OrdenXmlData | OrdenXmlData[]; // Puede ser objeto o array
}

/** Datos de cada orden (agrupación por IdTransaccion) */
export interface OrdenXmlData {
    IdTransaccion?: string | number;  // DocEntry de ORDR
    DetalleCuotas?: DetalleCuotasXmlData;
}

/** Contenedor de cuotas dentro de una orden */
export interface DetalleCuotasXmlData {
    Cuota?: CuotaXmlData | CuotaXmlData[]; // Puede ser objeto o array
}

/** Detalle de cada cuota en el XML */
export interface CuotaXmlData {
    LineNum?: string | number;        // LineNum en RDR1
    Facturable?: string;              // 'Y' o 'N'
    ConceptoDeuda?: string;           // Ej: "Cuota"
    PeriodoDeuda?: string;            // Ej: "1 - 2026" (mes - año)
    MultaDeuda?: string | number;     // Monto de multa
    DescuentoDeuda?: string | number; // Monto de descuento
    MontoDeuda?: string | number;     // Monto de la deuda
}

/**
 * =====================================================
 * INTERFACES PROCESADAS (Respuesta normalizada para API)
 * =====================================================
 */

/** Respuesta procesada del Plan Familiar para la API */
export interface FamilyPlanResponse {
    nombrePadre: string;
    razonSocial: string;
    nit: string;
    moneda: string;
    montoTotal: number;
    estudiantes: StudentDebtInfo[];
}

/** Información de deudas por estudiante */
export interface StudentDebtInfo {
    codigoEstudiante: string;
    nombreEstudiante: string;
    montoTotal: number;
    ordenes: OrdenInfo[];  // Agrupación por IdTransaccion
}

/** Información de cada orden (agrupación por IdTransaccion) */
export interface OrdenInfo {
    idTransaccion: number;    // DocEntry de ORDR
    cuotas: CuotaItem[];      // Cuotas dentro de esta orden
}

/** Ítem de cuota individual */
export interface CuotaItem {
    lineNum: number;          // LineNum en RDR1
    concepto: string;         // ConceptoDeuda
    periodo: string;          // PeriodoDeuda
    fechaVencimiento: string;
    multa: number;
    descuento: number;
    monto: number;
}

