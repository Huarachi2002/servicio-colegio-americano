import {
    Injectable,
    Logger,
    OnModuleInit,
    OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sql from 'mssql';
import { XMLParser } from 'fast-xml-parser';
import { ConsultaDeudaPendienteXmlData, ConsultaDeudaXmlData } from './interfaces/debt-consultation.interface';

/**
 * Servicio de conexión con SQL Server para SAP
 */
@Injectable()
export class SapService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(SapService.name);
    private pool: sql.ConnectionPool;
    private xmlParser: XMLParser;

    constructor(private configService: ConfigService) {
        // Configurar parser XML
        this.xmlParser = new XMLParser({
            ignoreAttributes: false,
            parseTagValue: true,
            trimValues: true,
        });
    }

    /**
     * Conectar a SQL Server al inicializar el módulo
     */
    async onModuleInit() {
        try {
            const config = this.configService.get<sql.config>('sapDatabase');
            this.pool = new sql.ConnectionPool(config);
            await this.pool.connect();
            this.logger.log('Conectado a SQL Server SAP exitosamente');
        } catch (error) {
            this.logger.error('Error conectando a SQL Server SAP:', error.message);
            throw error;
        }
    }

    /**
     * Desconectar de SQL Server al destruir el módulo
     */
    async onModuleDestroy() {
        if (this.pool) {
            await this.pool.close();
            this.logger.log('Desconectado de SQL Server');
        }
    }

    /**
     * Ejecutar stored procedure y obtener resultado XML
     */
    async executeStoredProcedure<T = ConsultaDeudaXmlData>(
        procedureName: string,
        studentErpCode: string,
    ): Promise<T> {
        try {
            this.logger.debug(
                `Ejecutando ${procedureName} para estudiante: ${studentErpCode}`,
            );

            const request = this.pool.request();
            request.input('studentErpCode', sql.VarChar(50), studentErpCode);

            // Ejecutar SP
            const result = await request.execute(procedureName);

            // El SP retorna XML en múltiples filas
            if (!result.recordset || result.recordset.length === 0) {
                this.logger.warn(`No se obtuvieron datos para ${studentErpCode}`);
                return null;
            }

            // Concatenar todas las filas XML
            let xmlString = '';
            result.recordset.forEach((row) => {
                // El XML viene en la primera columna
                const firstColumnValue = Object.values(row)[0];
                xmlString += firstColumnValue;
            });

            this.logger.debug(`XML recibido (${xmlString.length} caracteres)`);

            // Parsear XML a objeto JavaScript
            const parsed = this.xmlParser.parse(xmlString);

            // El objeto parseado tiene estructura: { root: { ...datos } }
            return parsed;
        } catch (error) {
            this.logger.error(
                `Error ejecutando ${procedureName}: ${error.message}`,
            );
            throw error;
        }
    }

    /**
     * Ejecutar query directa a SQL Server
     */
    async query<T = any>(queryString: string): Promise<T[]> {
        try {
            const result = await this.pool.request().query(queryString);
            return result.recordset;
        } catch (error) {
            this.logger.error(`Error en query: ${error.message}`);
            throw error;
        }
    }

    /**
     * Obtener tipo de cambio desde SQL Server
     */
    async getExchangeRate(): Promise<number> {
        try {
            const result = await this.query<{ exchange_rate: number }>(
                'SELECT TOP 1 exchange_rate FROM exchange_rates WHERE state = 1 ORDER BY created_at DESC',
            );
            return result[0]?.exchange_rate || 6.96; // Default fallback
        } catch (error) {
            this.logger.warn('No se pudo obtener tipo de cambio, usando default');
            return 6.96;
        }
    }

    async getDebtsState(studentErpCode: string): Promise<string | null> {
        try {
            const result = await this.query<{ state: string }>(
                `SELECT U_Deuda as state FROM OCRD WHERE CardCode = '${studentErpCode}'`
            );
            return result[0]?.state || null;
        } catch (error) {
            this.logger.warn('No se pudo obtener estado de deuda, usando default');
            return null;
        }
    }
}
