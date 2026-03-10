export interface PaymentPlanResponse {
    nombreDeudor: string;
    razonSocial?: string;
    nit?: string;
    moneda: string;
    cuotas: Cuotas[];
}

export interface Cuotas {
    numeroCuota: string;
    periodo: string;
    fechaVencimiento: string;
    montoCuota: string;
    cuotaDetalle: CuotaDetalle[];
}

export interface CuotaDetalle {
    nombreEstudiante: string;
    codigoEstudiante: string;
    idTransaccion: string;
    linNum: string;
    conceptoDeuda: string;
    multaDeuda: string;
    descuentoDeuda: string;
    montoDeuda: string;
}

export interface PaymentPlanXmlData {
    NombreDeudor?: string;
    RazonSocial?: string;
    Nit?: string;
    Moneda?: string;
    Cuotas?: {
        CuotaXmlData?: CuotaXmlData | CuotaXmlData[]; // Contenedor con array de cuotas
    };
}

export interface CuotaXmlData {
    NumeroCuota?: string;
    Periodo?: string;
    MontoCuota?: string;
    CuotaDetalle?: {
        CuotaDetalleXmlData?: CuotaDetalleXmlData | CuotaDetalleXmlData[]; // Contenedor con array de detalles
    };
}

export interface CuotaDetalleXmlData {
    NombreEstudiante?: string;
    CodigoEstudiante?: string;
    IdTransaccion?: string;
    LinNum?: string;
    ConceptoDeuda?: string;
    MultaDeuda?: string;
    DescuentoDeuda?: string;
    MontoDeuda?: string;
}