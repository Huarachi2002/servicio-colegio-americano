import { IsObject, IsString } from "class-validator";

export class PaymentInformationDto {
    @IsString()
    erpCode: string;

    @IsString()
    nombreDeudor: string;

    @IsString()
    razonSocial?: string;

    @IsString()
    nit?: string;

    @IsString()
    amount: string;

    @IsString()
    cuotas: string;

    @IsObject()
    students: StudentPaymentInfo[];
}

export class StudentPaymentInfo {
    @IsString()
    studentCode: string;

    @IsObject()
    orderLines: OrderLineInfo[];
}

export class OrderLineInfo {
    @IsString()
    orderDocEntry: string;

    @IsString()
    lineNum: string;

    @IsString()
    amount: string;
}