import { IsString, IsNumber, IsOptional } from 'class-validator';

export class UpdateUserMovil {
    @IsString()
    @IsOptional()
    name: string;

    @IsString()
    @IsOptional()
    username: string;

    @IsString()
    @IsOptional()
    email: string;

    @IsString()
    @IsOptional()
    password: string;

    @IsString()
    @IsOptional()
    enity_id: string;

    @IsNumber()
    @IsOptional()
    state: number;
}
