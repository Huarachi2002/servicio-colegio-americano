import { Controller, Post, Body, Get, Param, Query, Logger } from '@nestjs/common';
import { SapSyncService } from '../services/sap-sync.service';
import { SyncSingleUserDto, SyncUsersFilterDto } from '../dto/sync-user.dto';

/**
 * Controller para sincronización de usuarios móviles con SAP
 */
@Controller('sap/sync')
export class SapSyncController {
    private readonly logger = new Logger(SapSyncController.name);

    constructor(private readonly sapUserSyncService: SapSyncService) {}

    /**
     * Sincroniza todos los usuarios desde SAP
     * POST /sap/sync/users/all
     */
    @Post('users/all')
    async syncAllUsers(@Body() filters?: SyncUsersFilterDto) {
        this.logger.log('Solicitud de sincronización masiva de usuarios');
        
        const result = await this.sapUserSyncService.syncAllUsersFromSAP(filters);
        
        // Si es background, result contiene jobId
        if ('jobId' in result) {
            return {
                success: true,
                ...result,
            };
        }
        
        // Si es síncrono, result contiene los datos completos
        return {
            success: true,
            message: 'Sincronización completada',
            data: result,
        };
    }

    /**
     * Obtiene el estado de un job de sincronización
     * GET /sap/sync/status/:jobId
     */
    @Get('status/:jobId')
    async getSyncStatus(@Param('jobId') jobId: string) {
        this.logger.log(`Consultando estado del job: ${jobId}`);
        
        const status = this.sapUserSyncService.getJobStatus(jobId);
        
        if (!status) {
            return {
                success: false,
                message: 'Job no encontrado o ya fue limpiado',
            };
        }
        
        return {
            success: true,
            data: status,
        };
    }

    /**
     * Obtiene todos los jobs de sincronización activos
     * GET /sap/sync/status
     */
    @Get('status')
    async getAllSyncStatus() {
        this.logger.log('Consultando todos los jobs de sincronización');
        
        const jobs = this.sapUserSyncService.getAllJobs();
        
        return {
            success: true,
            count: jobs.length,
            data: jobs,
        };
    }

    /**
     * Limpia jobs antiguos completados o fallidos
     * POST /sap/sync/cleanup
     */
    @Post('cleanup')
    async cleanupJobs() {
        this.logger.log('Limpiando jobs antiguos');
        
        const cleaned = this.sapUserSyncService.cleanupOldJobs();
        
        return {
            success: true,
            message: `${cleaned} jobs limpiados`,
            cleaned,
        };
    }

    /**
     * Sincroniza un usuario específico por CardCode
     * POST /sap/sync/users/single
     */
    @Post('users/single')
    async syncSingleUser(@Body() dto: SyncSingleUserDto) {
        this.logger.log(`Solicitud de sincronización de usuario: ${dto.cardCode}`);
        
        const result = await this.sapUserSyncService.syncUserFromSAP(dto.cardCode);
        
        return {
            success: result.success,
            message: result.success ? result.message : result.error,
            data: result,
        };
    }

    /**
     * Obtiene los Socios de Negocio de SAP (sin guardar)
     * GET /sap/sync/preview/socio-negocio
     */
    @Get('preview/socio-negocio')
    async previewBusinessPartners(@Query() filters?: SyncUsersFilterDto) {
        this.logger.log('Solicitud de preview de socios de negocio');
        
        const businessPartners = await this.sapUserSyncService.getBusinessPartnersFromSAP(filters);
        
        return {
            success: true,
            count: businessPartners.length,
            data: businessPartners,
        };
    }

    /**
     * Obtiene un Socio de Negocio específico de SAP
     * GET /sap/sync/preview/socio-negocio/:cardCode
     */
    @Get('preview/socio-negocio/:cardCode')
    async previewBusinessPartner(@Param('cardCode') cardCode: string) {
        this.logger.log(`Solicitud de preview de socio de negocio: ${cardCode}`);
        
        const businessPartner = await this.sapUserSyncService.getBusinessPartnerFromSAP(cardCode);
        
        if (!businessPartner) {
            return {
                success: false,
                message: 'Socio de negocio no encontrado',
            };
        }
        
        return {
            success: true,
            data: businessPartner,
        };
    }
}
