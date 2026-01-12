import { Controller, Post, Body, Get, Param, Query, UseGuards, Logger } from '@nestjs/common';
import { SapSyncService } from '../sap-sync.service';
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
        
        return {
            success: true,
            message: 'Sincronización completada',
            data: result,
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
