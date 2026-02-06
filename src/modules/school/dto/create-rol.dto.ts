import { IsString } from 'class-validator';

export class CreateRol {
    @IsString()
    description: string;
}
