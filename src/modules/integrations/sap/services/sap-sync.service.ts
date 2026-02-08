import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { MobileUser } from 'src/database/entities/mobile-user.entity';
import { Father } from 'src/database/entities/father.entity';
import { Student } from 'src/database/entities/student.entity';
import { SapService } from './sap.service';
import { SapBusinessPartner, SapContactPerson, UserSyncResult, StudentSyncResult, MassSyncResult, SyncJobState, SyncStatus } from '../interfaces/sap.interface';
import { SyncUsersFilterDto } from '../dto/sync-user.dto';
import { CustomLoggerService } from 'src/common/logger';

@Injectable()
export class SapSyncService {
    private readonly logger: CustomLoggerService;
    
    private syncJobs = new Map<string, SyncJobState>();

    constructor(
        @InjectRepository(MobileUser)
        private readonly mobileUserRepository: Repository<MobileUser>,
        @InjectRepository(Father)
        private readonly fatherRepository: Repository<Father>,
        @InjectRepository(Student)
        private readonly studentRepository: Repository<Student>,
        private readonly sapService: SapService,
        private readonly customLogger: CustomLoggerService,
    ) {
        this.logger = this.customLogger.setContext(SapSyncService.name);
    }

    private generateUsername(fullName: string): string {
        this.logger.log(`Generando username para nombre completo: ${fullName}`);
        const nameParts = fullName.trim().split(/\s+/);
        this.logger.debug(`Partes del nombre: ${JSON.stringify(nameParts)}`);
        if (nameParts.length < 2) {
            return (nameParts[0].charAt(0) + nameParts[0].substring(1)).toLowerCase();
        }
        this.logger.debug(`Primer nombre: ${nameParts[0]}, Apellido: ${nameParts[1]}`);
        const firstName = nameParts[0];
        const lastName = nameParts[1];
        
        const username = (firstName.charAt(0) + lastName).toLowerCase();
        this.logger.log(`Username generado: ${username}`);
        return username;
    }

    /**
     * Hashea la contraseña con bcrypt
     */
    private async hashPassword(password: string): Promise<string> {
        this.logger.log('Hasheando contraseña');
        const saltRounds = 10;
        return bcrypt.hash(password, saltRounds);
    }

    /**
     * Obtiene los Socios de Negocio de SAP via SQL directo
     * Mucho más eficiente que Service Layer para lectura de datos
     */
    async getBusinessPartnersFromSAP(filters?: SyncUsersFilterDto): Promise<SapBusinessPartner[]> {
        this.logger.log('Obteniendo socios de negocio desde SAP con filtros');
        try {
            // Construir query SQL con filtros
            let whereConditions = ["CardType = 'C'"]; // Solo clientes por defecto
            this.logger.debug(`Filtros recibidos: ${JSON.stringify(filters)}`);
            if (filters?.validFor) {
                whereConditions.push(`ValidFor = '${filters.validFor}'`);
            }
            
            if (filters?.groupCode) {
                whereConditions.push(`GroupCode = ${filters.groupCode}`);
            }
            this.logger.debug(`Condiciones WHERE: ${JSON.stringify(whereConditions)}`);
            const whereClause = whereConditions.join(' AND ');

            // Construir cláusula de paginación
            let paginationClause = '';
            if (filters?.limit !== undefined) {
                const offset = filters.offset || 0;
                paginationClause = `OFFSET ${offset} ROWS FETCH NEXT ${filters.limit} ROWS ONLY`;
            }
            this.logger.debug(`Cláusula de paginación: ${paginationClause}`);

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
        this.logger.log(`Obteniendo socio de negocio ${cardCode} desde SAP`);
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
            this.logger.log(`Socio de negocio ${cardCode} obtenido de SAP`);
            return result.length > 0 ? result[0] : null;
        } catch (error) {
            this.logger.error(`Error obteniendo socio de negocio ${cardCode}:`, error.message);
            return null;
        }
    }

    /**
     * Obtiene las personas de contacto (estudiantes) de un Socio de Negocio desde SAP
     */
    async getContactPersonsFromSAP(cardCode: string): Promise<SapContactPerson[]> {
        this.logger.log(`Obteniendo personas de contacto para socio ${cardCode} desde SAP`);
        try {
            // En SAP, las personas de contacto están en la tabla OCPR
            const query = `
                SELECT 
                    CardCode,
                    CntctCode,
                    Name,
                    E_MaiL,
                    Tel1,
                    Active
                FROM OCPR
                WHERE CardCode = '${cardCode}'
                AND Active = 'Y'
                ORDER BY CntctCode
            `;

            this.logger.debug(`Ejecutando query: ${query}`);
            
            const result = await this.sapService.query<SapContactPerson>(query);
            this.logger.log(`Se obtuvieron ${result.length} personas de contacto para ${cardCode}`);
            return result;
        } catch (error) {
            this.logger.error(`Error obteniendo personas de contacto para ${cardCode}:`, error.message);
            return [];
        }
    }

    /**
     * Sincroniza un usuario desde SAP a la base de datos local
     */
    async syncUserFromSAP(cardCode: string): Promise<UserSyncResult> {
        this.logger.log(`Sincronizando usuario ${cardCode} desde SAP`);
        try {
            // Obtener datos del socio de negocio de SAP
            const businessPartner = await this.getBusinessPartnerFromSAP(cardCode);
            this.logger.debug(`Datos del socio de negocio: ${JSON.stringify(businessPartner)}`);
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
            this.logger.log(`Socio de negocio ${cardCode} encontrado, procediendo a sincronizar`);
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
        this.logger.log(`Sincronizando socio de negocio ${bp.CardCode}`);
        const { CardCode, CardName, FederalTaxID, EmailAddress } = bp;

        // Validar que tenga documento de identidad (será la contraseña)
        if (!FederalTaxID || FederalTaxID.trim() === '') {
            this.logger.warn(`Socio de negocio ${CardCode} no tiene documento de identidad, se omite sincronización`);
            return {
                cardCode: CardCode,
                cardName: CardName,
                username: '',
                success: false,
                action: 'skipped',
                message: 'No tiene documento de identidad (FederalTaxID) en SAP',
            };
        }
        this.logger.log(`Generando username y contraseña para ${CardCode}`);
        const username = this.generateUsername(CardName);

        const hashedPassword = await this.hashPassword(FederalTaxID);
        this.logger.debug(`Username generado: ${username}`);
        try {
            // 1. Crear o actualizar registro en tabla fathers
            this.logger.log(`Buscando o creando registro Father para ${CardCode}`);
            let father = await this.fatherRepository.findOne({
                where: { erpCode: CardCode },
            });
            this.logger.debug(`Registro Father encontrado: ${JSON.stringify(father)}`);

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
                this.logger.log(`Actualizando registro Father para ${CardCode}`);
                // Actualizar datos
                father.name = CardName;
                father.email = EmailAddress || father.email;
                father.state = bp.ValidFor === 'Y' ? 1 : 0;
                await this.fatherRepository.save(father);
                this.logger.log(`Actualizado registro Father para ${CardCode}`);
            }

            // 2. Crear o actualizar usuario móvil
            this.logger.log(`Buscando o creando usuario móvil para Father ID ${father.id}`);
            let mobileUser = await this.mobileUserRepository.findOne({
                where: { entity_id: father.id, entity_type: 'Father' },
            });

            let action: 'created' | 'updated' = 'created';
            this.logger.log(`Usuario móvil encontrado: ${JSON.stringify(mobileUser)}`);
            if (!mobileUser) {
                // Verificar que el username no exista
                const existingUser = await this.mobileUserRepository.findOne({
                    where: { username },
                });
                this.logger.debug(`Verificación de existencia de username ${username}: ${JSON.stringify(existingUser)}`);
                let finalUsername = username;
                this.logger.log(`Creando nuevo usuario móvil con username ${finalUsername}`);
                if (existingUser) {
                    // Agregar sufijo numérico si el username ya existe
                    finalUsername = `${username}${father.id}`;
                    this.logger.warn(`Username ${username} ya existe, usando ${finalUsername}`);
                }
                this.logger.log(`Creando usuario móvil con username ${finalUsername}`);

                mobileUser = this.mobileUserRepository.create({
                    name: CardName,
                    username: finalUsername,
                    email: EmailAddress || null,
                    password: hashedPassword,
                    entity_id: father.id,
                    entity_type: 'Father',
                    state: bp.ValidFor === 'Y' ? 1 : 0,
                });
                this.logger.log(`Guardando nuevo usuario móvil para ${CardCode}`);
                
                await this.mobileUserRepository.save(mobileUser);
                this.logger.log(`Creado usuario móvil ${finalUsername} para ${CardCode}`);
            } else {
                action = 'updated';
                this.logger.log(`Actualizando usuario móvil ${mobileUser.username} para ${CardCode}`);
                // Actualizar datos (NO actualizar username para no romper accesos existentes)
                mobileUser.name = CardName;
                mobileUser.email = EmailAddress || mobileUser.email;
                mobileUser.password = hashedPassword; // Actualizar contraseña
                mobileUser.state = bp.ValidFor === 'Y' ? 1 : 0;
                this.logger.log(`Guardando actualización de usuario móvil para ${CardCode}`);
                await this.mobileUserRepository.save(mobileUser);
                this.logger.log(`Actualizado usuario móvil ${mobileUser.username} para ${CardCode}`);
            }

            // 3. Sincronizar estudiantes (personas de contacto) del padre
            this.logger.log(`Sincronizando estudiantes para padre ${CardCode}`);
            const studentResults = await this.syncStudentsForFather(CardCode, father.id);
            this.logger.log(`Se sincronizaron ${studentResults.length} estudiantes para ${CardCode}`);

            this.logger.log(`Sincronización de socio de negocio ${CardCode} completada exitosamente`);
            return {
                cardCode: CardCode,
                cardName: CardName,
                username: mobileUser.username,
                success: true,
                action,
                message: `Usuario ${action === 'created' ? 'creado' : 'actualizado'} exitosamente`,
                students: studentResults,
                studentsCount: studentResults.length,
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
     * Sincroniza los estudiantes (personas de contacto) de un padre desde SAP
     */
    private async syncStudentsForFather(cardCode: string, fatherId: number): Promise<StudentSyncResult[]> {
        this.logger.log(`Sincronizando estudiantes para padre CardCode: ${cardCode}, FatherId: ${fatherId}`);
        const results: StudentSyncResult[] = [];

        try {
            // Obtener personas de contacto desde SAP
            const contactPersons = await this.getContactPersonsFromSAP(cardCode);
            
            if (contactPersons.length === 0) {
                this.logger.log(`No se encontraron personas de contacto para ${cardCode}`);
                return results;
            }

            this.logger.log(`Procesando ${contactPersons.length} personas de contacto para ${cardCode}`);

            // Sincronizar cada persona de contacto como estudiante
            for (const contact of contactPersons) {
                try {
                    // El CntctCode se usa como erpCode del estudiante
                    const erpCode = cardCode + '-' + contact.CntctCode;
                    
                    this.logger.log(`Procesando estudiante ${contact.Name} (ERP: ${erpCode})`);

                    // Buscar si el estudiante ya existe
                    let student = await this.studentRepository.findOne({
                        where: { erpCode },
                    });

                    let action: 'created' | 'updated' = 'created';

                    if (!student) {
                        // Crear nuevo estudiante
                        student = this.studentRepository.create({
                            name: contact.Name,
                            erpCode: erpCode,
                            email: contact.E_MaiL || '',
                            father_id: fatherId,
                            state: contact.Active === 'Y' ? 1 : 0,
                        });
                        await this.studentRepository.save(student);
                        this.logger.log(`Estudiante creado: ${contact.Name} (${erpCode})`);
                    } else {
                        // Actualizar estudiante existente
                        action = 'updated';
                        student.name = contact.Name;
                        student.email = contact.E_MaiL || student.email;
                        student.father_id = fatherId;
                        student.state = contact.Active === 'Y' ? 1 : 0;
                        await this.studentRepository.save(student);
                        this.logger.log(`Estudiante actualizado: ${contact.Name} (${erpCode})`);
                    }

                    results.push({
                        studentName: contact.Name,
                        erpCode: erpCode,
                        success: true,
                        action,
                        message: `Estudiante ${action === 'created' ? 'creado' : 'actualizado'} exitosamente`,
                    });
                } catch (error) {
                    this.logger.error(`Error sincronizando estudiante ${contact.Name}:`, error.message);
                    results.push({
                        studentName: contact.Name,
                        erpCode: cardCode + '-' + contact.CntctCode,
                        success: false,
                        action: 'error',
                        error: error.message,
                    });
                }
            }

            this.logger.log(`Sincronización de estudiantes completada para ${cardCode}. Total: ${results.length}`);
            return results;
        } catch (error) {
            this.logger.error(`Error general sincronizando estudiantes para ${cardCode}:`, error.message);
            return results;
        }
    }

    /**
     * Sincroniza todos los Socios de Negocio de SAP
     * Soporta procesamiento en background y por lotes
     */
    async syncAllUsersFromSAP(filters?: SyncUsersFilterDto): Promise<MassSyncResult | { jobId: string; message: string }> {
        this.logger.log('Iniciando sincronización masiva de usuarios desde SAP');
        // Si se solicita procesamiento en background
        if (filters?.background) {
            this.logger.log('Iniciando sincronización en background');
            return this.startBackgroundSync(filters);
        }
        this.logger.log('Iniciando sincronización en foreground');
        // Procesamiento síncrono (foreground)
        return this.performSync(filters);
    }

    /**
     * Inicia sincronización en background
     */
    private startBackgroundSync(filters: SyncUsersFilterDto): { jobId: string; message: string } {
        this.logger.log('Creando job de sincronización en background');
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
        this.logger.log(`Job de sincronización creado: ${jobId}`);
        this.syncJobs.set(jobId, jobState);
        
        // Ejecutar en background (no await)
        this.logger.log(`Iniciando proceso de sincronización en background para job ${jobId}`);
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
        this.logger.log(`Ejecutando sincronización en background para job ${jobId}`);
        const job = this.syncJobs.get(jobId);
        if (!job) return;
        this.logger.log(`Job ${jobId} encontrado, comenzando sincronización`);
        try {
            job.status = SyncStatus.RUNNING;
            this.logger.log(`Job ${jobId} en estado RUNNING`);
            const result = await this.performSync(filters, jobId);
            this.logger.log(`Sincronización en background para job ${jobId} completada`);
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
            this.logger.error(`Error durante sincronización en background para job ${jobId}:`, error.message);
            job.status = SyncStatus.FAILED;
            job.errorMessage = error.message;
            job.completedAt = new Date();
            this.logger.log(`Job ${jobId} marcado como FAILED`);
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
        this.logger.log(`Total de socios de negocio a procesar: ${businessPartners.length}`);
        if (jobId) {
            const job = this.syncJobs.get(jobId);
            if (job) {
                job.total = businessPartners.length;
                job.totalBatches = Math.ceil(businessPartners.length / batchSize);
                this.logger.log(`Job ${jobId} actualizado con total de registros y lotes`);
            }
        }
        this.logger.log(`Procesando en lotes de ${batchSize}...`);
        const results: UserSyncResult[] = [];
        let created = 0;
        let updated = 0;
        let skipped = 0;
        let errors = 0;

        // Procesar en lotes (batches)
        this.logger.log(`Iniciando procesamiento por lotes...`);
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
            this.logger.log(`Sincronizando ${batch.length} socios de negocio en el lote ${batchNumber}`);
            for (const bp of batch) {
                const result = await this.syncBusinessPartner(bp);
                results.push(result);
                this.logger.debug(`Resultado de sincronización para ${bp.CardCode}: ${JSON.stringify(result)}`);
                if (result.success) {
                    this.logger.log(`Sincronización exitosa para ${bp.CardCode}`);
                    if (result.action === 'created') created++;
                    else if (result.action === 'updated') updated++;
                } else if (result.action === 'skipped') {
                    skipped++;
                } else {
                    errors++;
                }
                
                // Actualizar progreso del job
                this.logger.log(`Actualizando progreso del job ${jobId} después de procesar ${bp.CardCode}`);
                if (jobId) {
                    this.logger.log(`Actualizando estado del job ${jobId}`);
                    const job = this.syncJobs.get(jobId);
                    if (job) {
                        this.logger.log(`Incrementando procesados del job ${jobId}`);
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
                this.logger.log('Pausa breve antes del siguiente lote...');
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
        this.logger.log(`Obteniendo estado del job ${jobId}`);
        return this.syncJobs.get(jobId) || null;
    }

    /**
     * Obtiene todos los jobs de sincronización
     */
    getAllJobs(): SyncJobState[] {
        this.logger.log('Obteniendo todos los jobs de sincronización');
        return Array.from(this.syncJobs.values());
    }

    /**
     * Limpia jobs completados o fallidos antiguos (más de 1 hora)
     */
    cleanupOldJobs(): number {
        this.logger.log('Limpiando jobs antiguos de sincronización');
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        let cleaned = 0;
        this.logger.log('Iniciando recorrido de jobs para limpieza');
        for (const [jobId, job] of this.syncJobs.entries()) {
            this.logger.debug(`Revisando job ${jobId} con estado ${job.status}`);
            if (
                (job.status === SyncStatus.COMPLETED || job.status === SyncStatus.FAILED) &&
                job.completedAt &&
                job.completedAt < oneHourAgo
            ) {
                this.logger.log(`Eliminando job ${jobId} completado/fallido antiguo`);
                this.syncJobs.delete(jobId);
                cleaned++;
            }
        }
        this.logger.log(`Limpieza completada, total de jobs eliminados: ${cleaned}`);
        if (cleaned > 0) {
            this.logger.log(`Limpiados ${cleaned} jobs antiguos`);
        }
        this.logger.log('Limpieza de jobs antiguos finalizada');
        return cleaned;
    }
}
