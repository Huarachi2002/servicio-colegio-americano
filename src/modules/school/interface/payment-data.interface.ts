export interface PaymentDataInterface {
    erp_code: string;
    transactionId: string;
    nit: string;
    payment_information: any;
    amount: string;
    cuotas: string;
    bank_name: string;
}

export interface PaymentDataSaveInterface {
    erp_code: string;
    transactionId: string;
    qrId: string;
    expirationDate: string;
    data: string;
    qrImage: string;
    createdBy: string;
}