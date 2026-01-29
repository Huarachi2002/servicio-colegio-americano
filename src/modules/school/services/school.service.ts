import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from '../../../database/entities/student.entity';
import { Father } from '../../../database/entities/father.entity';
import { Grade } from '../../../database/entities/grade.entity';
import { Parallel } from '../../../database/entities/parallel.entity';
import { ExchangeRate } from '../../../database/entities/exchange-rate.entity';
import { SapDebtService } from '../../integrations/sap/services/sap-debt.service';
import { PaymentService } from './payment.service';
import { SapService } from '../../integrations/sap/services/sap.service';
import { CustomLoggerService } from 'src/common/logger';

/**
 * SchoolService - Replica la lógica de SchoolApiService de Laravel
 */
@Injectable()
export class SchoolService {
    private readonly logger: CustomLoggerService;

    constructor(
        @InjectRepository(Student)
        private readonly studentRepository: Repository<Student>,
        @InjectRepository(Father)
        private readonly fatherRepository: Repository<Father>,
        @InjectRepository(Grade)
        private readonly gradeRepository: Repository<Grade>,
        @InjectRepository(Parallel)
        private readonly parallelRepository: Repository<Parallel>,
        @InjectRepository(ExchangeRate)
        private readonly exchangeRateRepository: Repository<ExchangeRate>,
        private readonly sapDebtService: SapDebtService,
        private readonly paymentService: PaymentService,
        private readonly sapService: SapService,
        private readonly customLogger: CustomLoggerService,
    ) { 
        this.logger = this.customLogger.setContext(SchoolService.name);
    }

    /**
     * Obtener consulta de deuda
     * Replica: SchoolApiService::getDebtConsultation()
     */
    async getDebtConsultation(studentErpCode: string): Promise<any> {
        this.logger.log(`Getting debt consultation for: ${studentErpCode}`);
        return await this.sapDebtService.getDebtConsultation(studentErpCode);
    }

    /**
     * Obtener consulta de deuda pendiente
     * Replica: SchoolApiService::getPendingDebtConsultation()
     */
    async getPendingDebtConsultation(studentErpCode: string): Promise<any> {
        this.logger.log(`Getting pending debt consultation for: ${studentErpCode}`);
        return await this.sapDebtService.getPendingDebtConsultation(
            studentErpCode,
        );
    }

    /**
     * Guardar información de pago y generar QR
     * Replica: SchoolApiService::savePaymentInformation()
     */
    async savePaymentInformation(
        erpCode: string,
        debtInformation: any,
    ): Promise<string | null> {
        this.logger.log(`Saving payment information for: ${erpCode}`);
        return await this.paymentService.savePaymentInformation(
            erpCode,
            debtInformation,
        );
    }

    /**
     * Obtener tipo de cambio activo
     * Replica: SchoolApiService::getExchangeRate()
     */
    async getExchangeRate(): Promise<number> {
        this.logger.log('Getting active exchange rate');
        const exchangeRate = await this.exchangeRateRepository.findOne({
            where: { enabled: true },
        });

        this.logger.log(`Exchange rate found: ${exchangeRate?.exchangeRate}`);
        if (!exchangeRate) {
            this.logger.warn('No exchange rate found');
            return 0;
        }

        return exchangeRate.exchangeRate;
    }

    /**
     * Obtener estudiantes por ID de padre
     * Replica: SchoolApiService::getStudents()
     */
    async getStudentsByFatherId(fatherId: number): Promise<Student[]> {
        this.logger.log(`Getting students for father ID: ${fatherId}`);
        const data = await this.studentRepository.find({
            where: { father_id: fatherId, state: 1 },
        });
        this.logger.log(`Students found: ${data.length}`);
        return data;
    }

    /**
     * Obtener todos los grados
     * Replica: SchoolApiService::getGrades()
     */
    async getGrades(): Promise<Grade[]> {
        this.logger.log('Getting grades');
        const data = await this.gradeRepository.find();
        this.logger.log("Grades found: " + data.length);
        return data;
    }

    /**
     * Obtener todos los paralelos
     * Replica: SchoolApiService::getParallels()
     */
    async getParallels(): Promise<Parallel[]> {
        this.logger.log('Getting parallels');
        return await this.parallelRepository.find();
    }

    /**
     * Obtener padre por ID
     * Replica: SchoolApiController::getFather()
     */
    async getFatherById(id: number): Promise<string> {
        this.logger.log(`Getting father ERP code for ID: ${id}`);
        const father = await this.fatherRepository.findOne({ where: { id } });
        this.logger.log(`Father ERP code found: ${father?.erpCode}`);
        if (father) {
            return father.erpCode;
        }

        return '0';
    }

    /**
     * Obtener anotaciones y ausencias (desde SAP)
     * Replica: SchoolApiService::getAnnotationsAndAbsences()
     */
    async getAnnotationsAndAbsences(studentErpCode: string): Promise<any> {
        this.logger.log(
            `Getting annotations for student: ${studentErpCode}`,
        );

        return {
            annotations: [],
            absences: [],
        };
    }

    /**
     * Obtener estado de deuda (biblioteca/mensualidad)
     * Replica: SchoolApiService::getDebtsState()
     */
    async getDebtState(studentErpCode: string): Promise<string | null> {
        try {
            this.logger.log(`Getting debt state for: ${studentErpCode}`);
            return await this.sapService.getDebtsState(studentErpCode);
        } catch (error) {
            this.logger.error('Cannot query debt state from SAP', error);
            return null;
        }
    }
}
