import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    UseGuards,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { SchoolService } from '../services/school.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { MobileUser } from '../../../database/entities/mobile-user.entity';
import { ApiResponseMovil } from '../../../common/interfaces/api-response-movil.interface';
import { StudentCodeDto } from '../../integrations/sap/dto/student-code.dto';
import { GenerateQrDto } from '../dto/generate-qr.dto';
import { ConfigService } from '@nestjs/config';

/**
 * SchoolController - Replica de SchoolApiController de Laravel
 * Endpoints para la app móvil
 * Usa JwtAuthGuard unificado que valida tokens de usuarios móviles
 */
@Controller()
export class SchoolController {
    constructor(
        private readonly schoolService: SchoolService,
        private readonly configService: ConfigService,
    ) { }

    /**
     * POST /api/debt_consultation
     * Consulta de deuda principal
     */
    @Post('debt_consultation') // Deuda mas antigua (mas prioritaria)
    @UseGuards(JwtAuthGuard)
    async debtConsultation(
        @Body() dto: StudentCodeDto,
    ): Promise<ApiResponseMovil> {
        try {
            const debtInfo = await this.schoolService.getDebtConsultation(
                dto.studentErpCode,
            );

            return {
                status: 'success',
                message: debtInfo ? 'Debt information retrieved' : 'No debt found',
                data: debtInfo,
            };
        } catch (error) {
            throw new HttpException(
                'Error retrieving debt information',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * POST /api/pending_debt_consultation
     * Consulta de deuda pendiente
     */
    @Post('pending_debt_consultation') // Lista de deudas pendiente
    @UseGuards(JwtAuthGuard)
    async pendingDebtConsultation(
        @Body() dto: StudentCodeDto,
    ): Promise<ApiResponseMovil> {
        try {
            const debtInfo =
                await this.schoolService.getPendingDebtConsultation(
                    dto.studentErpCode,
                );

            return {
                status: 'success',
                message: debtInfo
                    ? 'Pending debt information retrieved'
                    : 'No pending debt',
                data: debtInfo,
            };
        } catch (error) {
            throw new HttpException(
                'Error retrieving pending debt',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * POST /api/generate_qr
     * Generar QR para pago (usa API BNB)
     */
    @Post('generate_qr')
    @UseGuards(JwtAuthGuard)
    async generateQr(@Body() dto: GenerateQrDto): Promise<ApiResponseMovil> {
        try {
            const qrCode = await this.schoolService.savePaymentInformation(
                dto.erp_code,
                dto.debt_information,
            );

            if (!qrCode) {
                return {
                    status: 'error',
                    message: 'Could not generate QR code',
                    data: null,
                };
            }

            return {
                status: 'success',
                message: 'QR code generated successfully',
                data: qrCode,
            };
        } catch (error) {
            throw new HttpException(
                'Error generating QR code',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * GET /api/exchange_rate
     * Obtener tipo de cambio actual
     */
    @Get('exchange_rate')
    @UseGuards(JwtAuthGuard)
    async getExchangeRate(): Promise<ApiResponseMovil> {
        try {
            const rate = await this.schoolService.getExchangeRate();

            if (rate === null || rate === 0) {
                return {
                    status: 'error',
                    message: 'Exchange rate not found',
                    data: null,
                };
            }

            return {
                status: 'success',
                message: 'Exchange rate retrieved',
                data: rate,
            };
        } catch (error) {
            throw new HttpException(
                'Error retrieving exchange rate',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * POST /api/students
     * Obtener estudiantes del padre autenticado
     */
    @Post('students')
    @UseGuards(JwtAuthGuard)
    async getStudents(
        @CurrentUser() user: MobileUser,
    ): Promise<ApiResponseMovil> {
        try {
            const students = await this.schoolService.getStudentsByFatherId(
                user.entity_id,
            );

            if (!students || students.length === 0) {
                return {
                    status: 'error',
                    message: 'No students found for this father',
                    data: null,
                };
            }

            // Transformar a formato snake_case para Flutter
            const transformedStudents = students.map(student => ({
                id: student.id,
                name: student.name,
                erp_code: student.erpCode,
                email: student.email,
                invoice_name: null,
                nit: null,
                state: student.state,
                father_id: student.father_id,
                grade_id: student.gradeId,
                parallel_id: student.parallelId,
                price_list_id: null,
                created_by: null,
                created_at: student.createdAt?.toISOString() || null,
                updated_at: student.updatedAt?.toISOString() || null,
            }));

            return {
                status: 'success',
                message: 'Students retrieved',
                data: transformedStudents,
            };
        } catch (error) {
            throw new HttpException(
                'Error retrieving students',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * POST /api/grades
     * Obtener todos los grados
     */
    @Post('grades')
    @UseGuards(JwtAuthGuard)
    async getGrades(): Promise<ApiResponseMovil> {
        try {
            const grades = await this.schoolService.getGrades();

            if (!grades || grades.length === 0) {
                return {
                    status: 'error',
                    message: 'No grades found',
                    data: null,
                };
            }

            return {
                status: 'success',
                message: 'Grades retrieved',
                data: grades,
            };
        } catch (error) {
            throw new HttpException(
                'Error retrieving grades',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * POST /api/parallels
     * Obtener todos los paralelos
     */
    @Post('parallels')
    @UseGuards(JwtAuthGuard)
    async getParallels(): Promise<ApiResponseMovil> {
        try {
            const parallels = await this.schoolService.getParallels();

            return {
                status: 'success',
                message: 'Parallels retrieved',
                data: parallels,
            };
        } catch (error) {
            throw new HttpException(
                'Error retrieving parallels',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * POST /api/annotation
     * Obtener anotaciones y ausencias del estudiante
     */
    @Post('annotation')
    @UseGuards(JwtAuthGuard)
    async getAnnotations(
        @Body() dto: StudentCodeDto,
    ): Promise<ApiResponseMovil> {
        try {
            const data = await this.schoolService.getAnnotationsAndAbsences(
                dto.studentErpCode,
            );

            return {
                status: 'success',
                message: 'Annotations retrieved',
                data,
            };
        } catch (error) {
            throw new HttpException(
                'Error retrieving annotations',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * GET /api/father/:id
     * Obtener ERP code del padre por ID
     */
    @Get('father/:id')
    @UseGuards(JwtAuthGuard)
    async getFather(@Param('id') id: string): Promise<ApiResponseMovil> {
        try {
            const erpCode = await this.schoolService.getFatherById(
                parseInt(id),
            );

            return {
                status: 'success',
                message: 'Father information retrieved',
                data: erpCode,
            };
        } catch (error) {
            throw new HttpException(
                'Error retrieving father information',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * GET /api/debt_state/:erpCode
     * Obtener estado de deuda (público)
     */
    @Get('debt_state/:erpCode')
    async getDebtState(
        @Param('erpCode') erpCode: string,
    ): Promise<ApiResponseMovil> {
        try {
            const debtState = await this.schoolService.getDebtState(erpCode);

            let message = 'Ninguna deuda';
            let data: string | null = null;

            if (debtState === 'B') {
                message =
                    'Por favor comunicarse con el departamento de biblioteca';
                data = 'BM';
            } else if (debtState === 'M') {
                message =
                    'Por favor comunicarse con el departamento de contabilidad';
                data = 'BM';
            } else if (debtState === 'BM') {
                message =
                    'Por favor comunicarse con biblioteca y contabilidad';
                data = 'BM';
            }

            return {
                status: 'success',
                message,
                data,
            };
        } catch (error) {
            throw new HttpException(
                'Error retrieving debt state',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * GET /api/app_last_version
     * Obtener última versión de la app (público)
     */
    @Get('app_last_version')
    async getAppLastVersion(): Promise<ApiResponseMovil> {
        return {
            status: 'success',
            message: 'App versions retrieved',
            data: {
                apk_version: this.configService.get<string>('APK_VERSION') || '1.0.0', // Configurar en .env
                ipa_version: this.configService.get<string>('IPA_VERSION') || '1.0.0', // Configurar en .env
            },
        };
    }

    /**
     * GET /api/news_url
     * Obtener URL de noticias (público)
     */
    @Get('news_url')
    async getNewsUrl(): Promise<ApiResponseMovil> {
        return {
            status: 'success',
            message: 'News URL retrieved',
            data: this.configService.get<string>('NEWS_URL') || 'https://sccs.edu.bo/',
        };
    }
}
