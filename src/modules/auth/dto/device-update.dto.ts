import { IsNumber, IsString } from "class-validator";

export class DeviceUpdateDto {

    @IsNumber()
    id: number;

    @IsString()
    token: string;

    @IsString()
    token_fcm: string;

}