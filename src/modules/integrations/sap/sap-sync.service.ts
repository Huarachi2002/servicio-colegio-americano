import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { MobileUser } from 'src/database/entities/mobile-user.entity';
import { Father } from 'src/database/entities/father.entity';
import { SapService } from './sap.service';
import { SapBusinessPartner, UserSyncResult, MassSyncResult, SyncJobState, SyncStatus } from './interfaces/sap.interface';
import { SyncUsersFilterDto } from './dto/sync-user.dto';

@Injectable()
export class SapSyncService {
    private readonly logger = new Logger(SapSyncService.name);
    
    // Almacenamiento en memoria de jobs de sincronización
    // En producción, considerar usar Redis o base de datos
    private syncJobs = new Map<string, SyncJobState>();

    constructor(
        @InjectRepository(MobileUser)
        private readonly mobileUserRepository: Repository<MobileUser>,
        @InjectRepository(Father)
        private readonly fatherRepository: Repository<Father>,
        private readonly sapService: SapService,
    ) {}

    private generateUsername(fullName: string): string {
        const nameParts = fullName.trim().split(/\s+/);
        
        if (nameParts.length < 2) {
            return (nameParts[0].charAt(0) + nameParts[0].substring(1)).toLowerCase();
        }

        const firstName = nameParts[0];
        const lastName = nameParts[1];
        
        const username = (firstName.charAt(0) + lastName).toLowerCase();
        
        return username;
    }

    /**
     * Hashea la contraseña con bcrypt
     */
    private async hashPassword(password: string): Promise<string> {
        const saltRounds = 10;
        return bcrypt.hash(password, saltRounds);
    }

    /**
     * Obtiene los Socios de Negocio de SAP via SQL directo
     * Mucho más eficiente que Service Layer para lectura de datos
     */
    async getBusinessPartnersFromSAP(filters?: SyncUsersFilterDto): Promise<SapBusinessPartner[]> {
        try {
            // Construir query SQL con filtros
            let whereConditions = ["CardType = 'C'"]; // Solo clientes por defecto
            
            if (filters?.validFor) {
                whereConditions.push(`ValidFor = '${filters.validFor}'`);
            }
            
            if (filters?.groupCode) {
                whereConditions.push(`GroupCode = ${filters.groupCode}`);
            }

            const whereClause = whereConditions.join(' AND ');

            // Construir cláusula de paginación
            let paginationClause = '';
            if (filters?.limit !== undefined) {
                const offset = filters.offset || 0;
                paginationClause = `OFFSET ${offset} ROWS FETCH NEXT ${filters.limit} ROWS ONLY`;
            }

            // Query SQL para obtener socios de negocio
            const query = `
                SELECT 
                    CardCode,
                    CardName,
                    CardType,
                    LicTradNum AS FederalTaxID,
                    E_Mail AS EmailAddress,
                    Phone1,
                    ValidFor,
                    GroupCode
                FROM OCRD
                WHERE ${whereClause}
                ORDER BY CardCode
                ${paginationClause}
            `;

            this.logger.debug(`Ejecutando query: ${query}`);
            
            const result = await this.sapService.query<SapBusinessPartner>(query);

            this.logger.log(`Se obtuvieron ${result.length} socios de negocio de SAP`);
            
            return result;
        } catch (error) {
            this.logger.error('Error obteniendo socios de negocio de SAP:', error.message);
            throw error;
        }
    }

    /**
     * Obtiene un Socio de Negocio específico de SAP via SQL directo
     */
    async getBusinessPartnerFromSAP(cardCode: string): Promise<SapBusinessPartner | null> {
        try {
            const query = `
                SELECT 
                    CardCode,
                    CardName,
                    CardType,
                    LicTradNum AS FederalTaxID,
                    E_Mail AS EmailAddress,
                    Phone1,
                    ValidFor,
                    GroupCode
                FROM OCRD
                WHERE CardCode = '${cardCode}'
            `;

            this.logger.debug(`Ejecutando query: ${query}`);
            
            const result = await this.sapService.query<SapBusinessPartner>(query);

            return result.length > 0 ? result[0] : null;
        } catch (error) {
            this.logger.error(`Error obteniendo socio de negocio ${cardCode}:`, error.message);
            return null;
        }
    }

    /**
     * Sincroniza un usuario desde SAP a la base de datos local
     */
    async syncUserFromSAP(cardCode: string): Promise<UserSyncResult> {
        try {
            // Obtener datos del socio de negocio de SAP
            const businessPartner = await this.getBusinessPartnerFromSAP(cardCode);

            if (!businessPartner) {
                return {
                    cardCode,
                    cardName: '',
                    username: '',
                    success: false,
                    action: 'error',
                    error: 'Socio de negocio no encontrado en SAP',
                };
            }

            return await this.syncBusinessPartner(businessPartner);
        } catch (error) {
            this.logger.error(`Error sincronizando usuario ${cardCode}:`, error.message);
            return {
                cardCode,
                cardName: '',
                username: '',
                success: false,
                action: 'error',
                error: error.message,
            };
        }
    }

    /**
     * Sincroniza un Socio de Negocio a la base de datos local
     */
    private async syncBusinessPartner(bp: SapBusinessPartner): Promise<UserSyncResult> {
        const { CardCode, CardName, FederalTaxID, EmailAddress } = bp;

        // Validar que tenga documento de identidad (será la contraseña)
        if (!FederalTaxID || FederalTaxID.trim() === '') {
            return {
                cardCode: CardCode,
                cardName: CardName,
                username: '',
                success: false,
                action: 'skipped',
                message: 'No tiene documento de identidad (FederalTaxID) en SAP',
            };
        }

        const username = this.generateUsername(CardName);

        const hashedPassword = await this.hashPassword(FederalTaxID);

        try {
            // 1. Crear o actualizar registro en tabla fathers
            let father = await this.fatherRepository.findOne({
                where: { erpCode: CardCode },
            });

            if (!father) {
                father = this.fatherRepository.create({
                    name: CardName,
                    email: EmailAddress || null,
                    erpCode: CardCode,
                    state: bp.ValidFor === 'Y' ? 1 : 0,
                });
                await this.fatherRepository.save(father);
                this.logger.log(`Creado registro Father para ${CardCode}`);
            } else {
                // Actualizar datos
                father.name = CardName;
                father.email = EmailAddress || father.email;
                father.state = bp.ValidFor === 'Y' ? 1 : 0;
                await this.fatherRepository.save(father);
                this.logger.log(`Actualizado registro Father para ${CardCode}`);
            }

            // 2. Crear o actualizar usuario móvil
            let mobileUser = await this.mobileUserRepository.findOne({
                where: { entity_id: father.id, entity_type: 'Father' },
            });

            let action: 'created' | 'updated' = 'created';

            if (!mobileUser) {
                // Verificar que el username no exista
                const existingUser = await this.mobileUserRepository.findOne({
                    where: { username },
                });

                let finalUsername = username;
                if (existingUser) {
                    // Agregar sufijo numérico si el username ya existe
                    finalUsername = `${username}${father.id}`;
                    this.logger.warn(`Username ${username} ya existe, usando ${finalUsername}`);
                }

                mobileUser = this.mobileUserRepository.create({
                    name: CardName,
                    username: finalUsername,
                    email: EmailAddress || null,
                    password: hashedPassword,
                    entity_id: father.id,
                    entity_type: 'Father',
                    user_type: 1, // FATHER
                    state: bp.ValidFor === 'Y' ? 1 : 0,
                });
                
                await this.mobileUserRepository.save(mobileUser);
                this.logger.log(`Creado usuario móvil ${finalUsername} para ${CardCode}`);
            } else {
                action = 'updated';
                
                // Actualizar datos (NO actualizar username para no romper accesos existentes)
                mobileUser.name = CardName;
                mobileUser.email = EmailAddress || mobileUser.email;
                mobileUser.password = hashedPassword; // Actualizar contraseña
                mobileUser.state = bp.ValidFor === 'Y' ? 1 : 0;
                
                await this.mobileUserRepository.save(mobileUser);
                this.logger.log(`Actualizado usuario móvil ${mobileUser.username} para ${CardCode}`);
            }

            return {
                cardCode: CardCode,
                cardName: CardName,
                username: mobileUser.username,
                success: true,
                action,
                message: `Usuario ${action === 'created' ? 'creado' : 'actualizado'} exitosamente`,
            };
        } catch (error) {
            this.logger.error(`Error guardando usuario ${CardCode}:`, error.message);
            return {
                cardCode: CardCode,
                cardName: CardName,
                username,
                success: false,
                action: 'error',
                error: error.message,
            };
        }
    }

    /**
     * Sincroniza todos los Socios de Negocio de SAP
     * Soporta procesamiento en background y por lotes
     */
    async syncAllUsersFromSAP(filters?: SyncUsersFilterDto): Promise<MassSyncResult | { jobId: string; message: string }> {
        // Si se solicita procesamiento en background
        if (filters?.background) {
            return this.startBackgroundSync(filters);
        }

        // Procesamiento síncrono (foreground)
        return this.performSync(filters);
    }

    /**
     * Inicia sincronización en background
     */
    private startBackgroundSync(filters: SyncUsersFilterDto): { jobId: string; message: string } {
        const jobId = `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const jobState: SyncJobState = {
            jobId,
            status: SyncStatus.PENDING,
            total: 0,
            processed: 0,
            created: 0,
            updated: 0,
            skipped: 0,
            errors: 0,
            startedAt: new Date(),
        };
        
        this.syncJobs.set(jobId, jobState);
        
        // Ejecutar en background (no await)
        this.performBackgroundSync(jobId, filters).catch(error => {
            this.logger.error(`Error en job ${jobId}:`, error);
            const job = this.syncJobs.get(jobId);
            if (job) {
                job.status = SyncStatus.FAILED;
                job.errorMessage = error.message;
                job.completedAt = new Date();
            }
        });
        
        this.logger.log(`Job de sincronización iniciado: ${jobId}`);
        
        return {
            jobId,
            message: 'Sincronización iniciada en background. Use GET /sap/sync/status/:jobId para verificar el progreso.',
        };
    }

    /**
     * Ejecuta sincronización en background
     */
    private async performBackgroundSync(jobId: string, filters: SyncUsersFilterDto): Promise<void> {
        const job = this.syncJobs.get(jobId);
        if (!job) return;

        try {
            job.status = SyncStatus.RUNNING;
            
            const result = await this.performSync(filters, jobId);
            
            // Actualizar estado final
            job.status = SyncStatus.COMPLETED;
            job.total = result.total;
            job.processed = result.total;
            job.created = result.created;
            job.updated = result.updated;
            job.skipped = result.skipped;
            job.errors = result.errors;
            job.completedAt = new Date();
            
            this.logger.log(`Job ${jobId} completado exitosamente`);
        } catch (error) {
            job.status = SyncStatus.FAILED;
            job.errorMessage = error.message;
            job.completedAt = new Date();
            throw error;
        }
    }

    /**
     * Ejecuta la sincronización (core)
     * Soporta procesamiento por lotes para evitar timeouts
     */
    private async performSync(filters?: SyncUsersFilterDto, jobId?: string): Promise<MassSyncResult> {
        this.logger.log('Iniciando sincronización de usuarios desde SAP...');

        const batchSize = filters?.batchSize || 50; // Procesar de 50 en 50 por defecto
        
        // Obtener todos los socios de negocio
        const businessPartners = await this.getBusinessPartnersFromSAP(filters);
        
        if (jobId) {
            const job = this.syncJobs.get(jobId);
            if (job) {
                job.total = businessPartners.length;
                job.totalBatches = Math.ceil(businessPartners.length / batchSize);
            }
        }

        const results: UserSyncResult[] = [];
        let created = 0;
        let updated = 0;
        let skipped = 0;
        let errors = 0;

        // Procesar en lotes (batches)
        for (let i = 0; i < businessPartners.length; i += batchSize) {
            const batch = businessPartners.slice(i, i + batchSize);
            const batchNumber = Math.floor(i / batchSize) + 1;
            const totalBatches = Math.ceil(businessPartners.length / batchSize);
            
            this.logger.log(`Procesando lote ${batchNumber}/${totalBatches} (${batch.length} registros)`);
            
            // Actualizar estado del job
            if (jobId) {
                const job = this.syncJobs.get(jobId);
                if (job) {
                    job.currentBatch = batchNumber;
                    job.processed = i;
                }
            }
            
            // Procesar batch
            for (const bp of batch) {
                const result = await this.syncBusinessPartner(bp);
                results.push(result);

                if (result.success) {
                    if (result.action === 'created') created++;
                    else if (result.action === 'updated') updated++;
                } else if (result.action === 'skipped') {
                    skipped++;
                } else {
                    errors++;
                }
                
                // Actualizar progreso del job
                if (jobId) {
                    const job = this.syncJobs.get(jobId);
                    if (job) {
                        job.processed++;
                        job.created = created;
                        job.updated = updated;
                        job.skipped = skipped;
                        job.errors = errors;
                    }
                }
            }
            
            // Pequeña pausa entre lotes para no saturar la BD
            if (i + batchSize < businessPartners.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        this.logger.log(
            `Sincronización completada: ${created} creados, ${updated} actualizados, ${skipped} omitidos, ${errors} errores`,
        );

        return {
            total: businessPartners.length,
            created,
            updated,
            skipped,
            errors,
            results,
        };
    }

    /**
     * Obtiene el estado de un job de sincronización
     */
    getJobStatus(jobId: string): SyncJobState | null {
        return this.syncJobs.get(jobId) || null;
    }

    /**
     * Obtiene todos los jobs de sincronización
     */
    getAllJobs(): SyncJobState[] {
        return Array.from(this.syncJobs.values());
    }

    /**
     * Limpia jobs completados o fallidos antiguos (más de 1 hora)
     */
    cleanupOldJobs(): number {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        let cleaned = 0;
        
        for (const [jobId, job] of this.syncJobs.entries()) {
            if (
                (job.status === SyncStatus.COMPLETED || job.status === SyncStatus.FAILED) &&
                job.completedAt &&
                job.completedAt < oneHourAgo
            ) {
                this.syncJobs.delete(jobId);
                cleaned++;
            }
        }
        
        if (cleaned > 0) {
            this.logger.log(`Limpiados ${cleaned} jobs antiguos`);
        }
        
        return cleaned;
    }
}
