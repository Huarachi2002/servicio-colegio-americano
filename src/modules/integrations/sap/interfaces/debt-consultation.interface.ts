/**
 * =====================================================
 * INTERFACES PARA SP_A_ConsultaDeudaLaravel
 * Respuesta de consulta de deuda específica (cuota seleccionada)
 * =====================================================
 */

/**
 * Respuesta principal de SP_A_ConsultaDeudaLaravel
 * Estructura XML:
 * <ConsultaDeuda>
 *   <idProceso>True</idProceso>
 *   <MensajeProceso></MensajeProceso>
 *   <idTransaccion>1</idTransaccion>
 *   <NombreDeudor>NOMBRE COMPLETO</NombreDeudor>
 *   <MonedaDelCobro>U</MonedaDelCobro>
 *   <MontoDelCobro>3200.000000</MontoDelCobro>
 *   <DetalleDelCobro>...</DetalleDelCobro>
 *   <DatosFactura>...</DatosFactura>
 * </ConsultaDeuda>
 */
export interface DebtConsultationResponse {
    idProceso: string; // 'True' o 'False'
    MensajeProceso: string; // Mensaje de error o vacío
    idTransaccion: string; // DocEntry de SAP
    parentCode: string; // Codigo de la tarjeta
    NombreDeudor: string; // Nombre del estudiante/deudor
    MonedaDelCobro: 'U' | 'B'; // U=USD, B=BOB
    MontoDelCobro: string; // Monto total (string desde XML)
    TipoCambio?: string; // Tipo de cambio (opcional, puede no venir)
    DetalleDelCobro: DebtDetail;
    DatosFactura: InvoiceData;
}

/**
 * Detalle del cobro para SP_A_ConsultaDeudaLaravel
 * Estructura XML:
 * <DetalleDelCobro>
 *   <ConceptoPago>Mensualidad - Primaria</ConceptoPago>
 *   <PeriodoPago>6 - 2026</PeriodoPago>
 *   <MultaPago>0</MultaPago>
 *   <DescuentoPago>0</DescuentoPago>
 *   <MontoPago>3200.000000</MontoPago>
 *   <Facturable>Y</Facturable>
 * </DetalleDelCobro>
 */
export interface DebtDetail {
    ConceptoPago: string; // Ej: "Mensualidad - Primaria"
    PeriodoPago: string; // Ej: "6 - 2026" (mes - año)
    MultaPago: string; // Monto de multa
    DescuentoPago: string; // Monto de descuento
    MontoPago: string; // Monto del pago
    Facturable: string; // 'Y' o 'N' (Si es facturable)
}

/**
 * Datos para facturación
 * Estructura XML:
 * <DatosFactura>
 *   <IdGeneraFact>S</IdGeneraFact>
 *   <NITCIFact>3146183015</NITCIFact>
 *   <NombreFact>ROSMERY SEJAS</NombreFact>
 *   <ModDatosFact>S</ModDatosFact>
 *   <DocumentType>5</DocumentType>
 *   <Complement></Complement>
 * </DatosFactura>
 */
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

/**
 * Respuesta principal de SP_B_ConsultaDeudaPendiente
 * Estructura XML:
 * <ConsultaDeudaPendiente>
 *   <idProceso>True</idProceso>
 *   <MensajeProceso></MensajeProceso>
 *   <NombreDeudor>NOMBRE COMPLETO</NombreDeudor>
 *   <MonedaDeuda>U</MonedaDeuda>
 *   <MontoDeuda>20000.000000</MontoDeuda>
 *   <DetalleDeuda>...</DetalleDeuda>
 *   <DetalleDeuda>...</DetalleDeuda>
 *   ...
 * </ConsultaDeudaPendiente>
 */
export interface PendingDebtConsultationResponse {
    idProceso: string; // 'True' o 'False'
    MensajeProceso: string; // Mensaje de error o vacío
    NombreDeudor: string; // Nombre del estudiante/deudor
    MonedaDeuda: 'U' | 'B'; // U=USD, B=BOB
    MontoDeuda: string; // Monto total de deuda pendiente
    DetalleDeuda: PendingDebtDetail[]; // Array de detalles de deuda
}

/**
 * Detalle de deuda individual para SP_B_ConsultaDeudaPendiente
 * Estructura XML:
 * <DetalleDeuda>
 *   <Facturable>Y</Facturable>
 *   <ConceptoDeuda>Mensualidad</ConceptoDeuda>
 *   <PeriodoDeuda>2 - 2026</PeriodoDeuda>
 *   <MultaDeuda>0</MultaDeuda>
 *   <DescuentoDeuda>0.000000</DescuentoDeuda>
 *   <MontoDeuda>2000.000000</MontoDeuda>
 * </DetalleDeuda>
 */
export interface PendingDebtDetail {
    Facturable: string; // 'Y' o 'N' (Si es facturable)
    ConceptoDeuda: string; // Ej: "Mensualidad"
    PeriodoDeuda: string; // Ej: "2 - 2026" (mes - año)
    MultaDeuda: string; // Monto de multa
    DescuentoDeuda: string; // Monto de descuento
    MontoDeuda: string; // Monto de la deuda
}

/**
 * =====================================================
 * INTERFACES AUXILIARES PARA XML PARSEADO
 * Estructuras que vienen del parser XML (antes de transformar)
 * =====================================================
 */

/**
 * Datos crudos del XML de SP_ConsultaDeudaLaravel
 */
export interface ConsultaDeudaXmlData {
    idProceso?: string | boolean;
    MensajeProceso?: string;
    idTransaccion?: string | number;
    IdTransaccion?: string | number; // Variante de nombre
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
    MonedaDeuda?: string;
    MontoDeuda?: string | number;
    DetalleDeuda?: PendingDebtDetailXmlData | PendingDebtDetailXmlData[]; // Puede ser objeto o array
}

/**
 * Detalle de deuda crudo del XML
 */
export interface PendingDebtDetailXmlData {
    Facturable?: string;
    ConceptoDeuda?: string;
    PeriodoDeuda?: string;
    MultaDeuda?: string | number;
    DescuentoDeuda?: string | number;
    MontoDeuda?: string | number;
}
