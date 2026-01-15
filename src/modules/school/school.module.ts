import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchoolController } from './controllers/school.controller';
import { AdminController } from './controllers/admin.controller';
import { SchoolService } from './services/school.service';
import { PaymentService } from './services/payment.service';
import { AdminService } from './services/admin.service';
import { Student } from '../../database/entities/student.entity';
import { Father } from '../../database/entities/father.entity';
import { Grade } from '../../database/entities/grade.entity';
import { Parallel } from '../../database/entities/parallel.entity';
import { Payment } from '../../database/entities/payment.entity';
import { ExchangeRate } from '../../database/entities/exchange-rate.entity';
import { ApiClient } from '../../database/entities/api-client.entity';
import { User } from '../../database/entities/users.entity';
import { MobileUser } from '../../database/entities/mobile-user.entity';
import { PaymentNotification } from '../../database/entities/payment-notification.entity';
import { SapModule } from '../integrations/sap/sap.module';
import { ExternalApiModule } from '../external-api/external-api.module';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            ApiClient,
            User,
            MobileUser,
            PaymentNotification,
            Student,
            Father,
            Grade,
            Parallel,
            Payment,
            ExchangeRate,
        ]),

        AuthModule,

        SapModule,

        ExternalApiModule,
    ],
    controllers: [SchoolController, AdminController],
    providers: [SchoolService, PaymentService, AdminService],
    exports: [SchoolService, PaymentService, AdminService],
})
export class SchoolModule { }
