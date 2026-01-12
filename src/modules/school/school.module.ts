import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchoolController } from './controllers/school.controller';
import { SchoolService } from './services/school.service';
import { PaymentService } from './services/payment.service';
import { Student } from '../../database/entities/student.entity';
import { Father } from '../../database/entities/father.entity';
import { Grade } from '../../database/entities/grade.entity';
import { Parallel } from '../../database/entities/parallel.entity';
import { Payment } from '../../database/entities/payment.entity';
import { ExchangeRate } from '../../database/entities/exchange-rate.entity';
import { SapModule } from '../integrations/sap/sap.module';
import { ExternalApiModule } from '../external-api/external-api.module';

@Module({
    imports: [
        // Entities
        TypeOrmModule.forFeature([
            Student,
            Father,
            Grade,
            Parallel,
            Payment,
            ExchangeRate,
        ]),

        // SAP Module para usar SapDebtService
        SapModule,

        // External API Module para usar BnbService
        ExternalApiModule,
    ],
    controllers: [SchoolController],
    providers: [SchoolService, PaymentService],
    exports: [SchoolService, PaymentService],
})
export class SchoolModule { }
