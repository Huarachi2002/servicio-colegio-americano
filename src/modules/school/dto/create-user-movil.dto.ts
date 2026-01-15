import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateUserMovil {
    @IsString()
    name: string;

    @IsString()
    username: string;

    @IsString()
    @IsOptional()
    email: string;

    @IsString()
    password: string;

    @IsString()
    @IsOptional()
    enity_id: string;
}
