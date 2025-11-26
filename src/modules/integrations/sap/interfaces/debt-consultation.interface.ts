/**
 * Respuesta de consulta de deuda desde SAP
 */
export interface DebtConsultationResponse {
    idProceso: string; // 'True' o 'False'
    MensajeProceso: string; // Mensaje de error o vacío
    idTransaccion: string; // DocEntry de SAP
    NombreDeudor: string; // Nombre del estudiante
    MonedaDelCobro: 'U' | 'B'; // U=USD, B=BOB
    MontoDelCobro: string; // Monto total (string desde XML)
    TipoCambio: string; // Tipo de cambio
    DetalleDelCobro: DebtDetail;
    DatosFactura: InvoiceData;
}

/**
 * Detalle del cobro/deuda
 */
export interface DebtDetail {
    ConceptoPago: string;
    PeriodoPago: string; // YYYY-MM formato
    MultaPago: string;
    DescuentoPago: string;
    MontoPago: string;
    Facturable: string; // '1' o '0'
}

/**
 * Datos para facturación
 */
export interface InvoiceData {
    IdGeneraFact: string; // '1' o '0'
    NITCIFact: string;
    NombreFact: string;
    ModDatosFact: string; // '1' o '0'
    DocumentType: string; // '5' = NIT, etc.
    Complement: string;
}
