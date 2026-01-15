import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateApiClient {
    @IsString()
    name: string;

    @IsString()
    @IsOptional()
    allowedIps?: string; // IPs permitidas para este cliente API

    @IsNumber()
    @IsOptional()
    rateLimit?: number;  // Requests por minuto
}
