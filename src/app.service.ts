import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
    getHello(): string {
        return 'DMS2 NestJS API is running!';
    }
}
