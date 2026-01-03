export interface CreateInvoiceDto {
    transactionId: string;
    razonSocial: string;
    nit: string;
    email: string;
    sinPaymentMethod: number;
    documentTypeIdentity: number;
    complement?: string;
    cuf?: string;
    cufd?: string;

    parentCardCode: string;
    docDate: string;
    bankName: string;
    externalReference: string;
    orderLines: {
        orderDocEntry: number;
        lineNum: number;
    }[];
}

export interface CreatePaymentDto {
    parentCardCode: string;
    paymentDate: string;
    amount: number;
    externalReference: string;
    invoiceDocEntry: number;

    transferAccount: string;
}

export interface SapDocumentResponse {
    success: boolean;
    docEntry?: number;
    docNum?: number;
    error?: string;
}

export interface PaymentProcessResult {
    success: boolean;
    invoiceDocEntry?: number;
    invoiceDocNum?: number;
    paymentDocEntry?: number;
    paymentDocNum?: number;
    error?: string;
}

export interface ProcessPaymentDto {
    transactionId: string;
    razonSocial: string;
    nit: string;
    email: string;
    sinPaymentMethod: number;
    documentTypeIdentity: number;
    complement?: string;
    cuf?: string;
    cufd?: string;
    transferAccount: string;

    parentCardCode: string;
    paymentDate: string;
    amount: number;
    bankName: string;
    externalReference: string;
    orderLines: {
        orderDocEntry: number;
        lineNum: number;
    }[];
}