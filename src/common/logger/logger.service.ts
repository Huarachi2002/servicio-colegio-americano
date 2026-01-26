import { Injectable, LoggerService as NestLoggerService, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Servicio de logging personalizado para la aplicación
 * Implementa logs en archivos de texto plano con rotación diaria
 * Formato: logs_YYYYMMDD.log
 */
@Injectable({ scope: Scope.TRANSIENT })
export class CustomLoggerService implements NestLoggerService {
    private logger: winston.Logger;
    private context?: string;
    private static logPath: string;
    private static isInitialized = false;

    constructor(private readonly configService: ConfigService) {
        this.initializeLogger();
    }

    /**
     * Inicializa el logger de Winston con configuración desde .env
     */
    private initializeLogger(): void {
        // Obtener ruta de logs desde variable de entorno o usar ruta por defecto
        const logsPath = this.configService.get<string>('LOG_PATH') || './logs';
        CustomLoggerService.logPath = path.resolve(logsPath);

        // Crear directorio de logs si no existe
        if (!fs.existsSync(CustomLoggerService.logPath)) {
            fs.mkdirSync(CustomLoggerService.logPath, { recursive: true });
        }

        // Nivel de log desde variable de entorno
        const logLevel = this.configService.get<string>('LOG_LEVEL') || 'info';

        // Formato personalizado para los logs
        const customFormat = winston.format.combine(
            winston.format.timestamp({
                format: 'YYYY-MM-DD HH:mm:ss.SSS',
            }),
            winston.format.errors({ stack: true }),
            winston.format.printf(({ timestamp, level, message, context, trace, ...metadata }) => {
                let logMessage = `[${timestamp}] [${level.toUpperCase()}]`;
                
                if (context) {
                    logMessage += ` [${context}]`;
                }
                
                logMessage += ` ${message}`;

                // Agregar metadata adicional si existe
                if (Object.keys(metadata).length > 0) {
                    logMessage += ` | Metadata: ${JSON.stringify(metadata)}`;
                }

                // Agregar stack trace si existe
                if (trace) {
                    logMessage += `\n${trace}`;
                }

                return logMessage;
            }),
        );

        // Formato para consola con colores
        const consoleFormat = winston.format.combine(
            winston.format.colorize({ all: true }),
            winston.format.timestamp({
                format: 'YYYY-MM-DD HH:mm:ss.SSS',
            }),
            winston.format.printf(({ timestamp, level, message, context }) => {
                let logMessage = `[${timestamp}] [${level}]`;
                if (context) {
                    logMessage += ` [${context}]`;
                }
                logMessage += ` ${message}`;
                return logMessage;
            }),
        );

        // Transporte para rotación diaria de archivos
        const dailyRotateTransport = new DailyRotateFile({
            filename: path.join(CustomLoggerService.logPath, 'logs_%DATE%.log'),
            datePattern: 'YYYYMMDD',
            zippedArchive: false, // No comprimir para facilitar lectura
            maxSize: this.configService.get<string>('LOG_MAX_SIZE') || '20m',
            maxFiles: this.configService.get<string>('LOG_MAX_FILES') || '30d', // Mantener logs de 30 días
            format: customFormat,
        });

        // Transporte separado para errores
        const errorRotateTransport = new DailyRotateFile({
            filename: path.join(CustomLoggerService.logPath, 'errors_%DATE%.log'),
            datePattern: 'YYYYMMDD',
            zippedArchive: false,
            maxSize: this.configService.get<string>('LOG_MAX_SIZE') || '20m',
            maxFiles: this.configService.get<string>('LOG_MAX_FILES') || '30d',
            level: 'error',
            format: customFormat,
        });

        // Transporte para API calls (integraciones externas)
        const apiRotateTransport = new DailyRotateFile({
            filename: path.join(CustomLoggerService.logPath, 'api_calls_%DATE%.log'),
            datePattern: 'YYYYMMDD',
            zippedArchive: false,
            maxSize: this.configService.get<string>('LOG_MAX_SIZE') || '20m',
            maxFiles: this.configService.get<string>('LOG_MAX_FILES') || '30d',
            format: customFormat,
        });

        // Crear el logger
        this.logger = winston.createLogger({
            level: logLevel,
            transports: [
                // Consola (siempre activa)
                new winston.transports.Console({
                    format: consoleFormat,
                }),
                // Archivo de logs general
                dailyRotateTransport,
                // Archivo de errores separado
                errorRotateTransport,
            ],
        });

        // Agregar transporte de API como propiedad accesible
        (this.logger as any).apiTransport = apiRotateTransport;

        // Log inicial
        if (!CustomLoggerService.isInitialized) {
            this.logger.info(`Logger inicializado. Ruta de logs: ${CustomLoggerService.logPath}`, {
                context: 'CustomLoggerService',
            });
            CustomLoggerService.isInitialized = true;
        }
    }

    /**
     * Establecer contexto del logger (nombre del servicio/controlador)
     */
    setContext(context: string): this {
        this.context = context;
        return this;
    }

    /**
     * Log de nivel info
     */
    log(message: any, context?: string): void {
        this.logger.info(message, { context: context || this.context });
    }

    /**
     * Log de nivel error
     */
    error(message: any, trace?: string, context?: string): void {
        this.logger.error(message, {
            context: context || this.context,
            trace,
        });
    }

    /**
     * Log de nivel warn
     */
    warn(message: any, context?: string): void {
        this.logger.warn(message, { context: context || this.context });
    }

    /**
     * Log de nivel debug
     */
    debug(message: any, context?: string): void {
        this.logger.debug(message, { context: context || this.context });
    }

    /**
     * Log de nivel verbose
     */
    verbose(message: any, context?: string): void {
        this.logger.verbose(message, { context: context || this.context });
    }

    /**
     * Log específico para llamadas a APIs externas
     * Registra request y response de manera detallada
     */
    logApiCall(
        apiName: string,
        method: string,
        url: string,
        requestData?: any,
        responseData?: any,
        statusCode?: number,
        duration?: number,
        isError: boolean = false,
    ): void {
        const logData = {
            timestamp: new Date().toISOString(),
            api: apiName,
            method,
            url,
            statusCode,
            duration: duration ? `${duration}ms` : undefined,
            request: requestData ? this.sanitizeData(requestData) : undefined,
            response: responseData ? this.sanitizeData(responseData) : undefined,
        };

        const message = `[API-CALL] ${apiName} | ${method} ${url} | Status: ${statusCode || 'N/A'} | Duration: ${duration || 'N/A'}ms`;

        if (isError) {
            this.logger.error(message, {
                context: 'ExternalAPI',
                ...logData,
            });
        } else {
            this.logger.info(message, {
                context: 'ExternalAPI',
                ...logData,
            });
        }

        // También escribir en archivo específico de APIs
        const apiLogger = winston.createLogger({
            transports: [(this.logger as any).apiTransport],
        });
        apiLogger.info(message, logData);
    }

    /**
     * Log específico para procesos de integración
     */
    logIntegrationProcess(
        processName: string,
        step: string,
        status: 'START' | 'IN_PROGRESS' | 'SUCCESS' | 'ERROR',
        details?: any,
    ): void {
        const message = `[INTEGRATION] ${processName} | Step: ${step} | Status: ${status}`;
        
        const logData = {
            context: 'Integration',
            processName,
            step,
            status,
            details: details ? this.sanitizeData(details) : undefined,
        };

        switch (status) {
            case 'ERROR':
                this.logger.error(message, logData);
                break;
            case 'SUCCESS':
                this.logger.info(message, logData);
                break;
            default:
                this.logger.debug(message, logData);
        }
    }

    /**
     * Log específico para transacciones de pago
     */
    logPaymentTransaction(
        transactionId: string,
        action: string,
        status: 'INITIATED' | 'PROCESSING' | 'COMPLETED' | 'FAILED',
        details?: any,
    ): void {
        const message = `[PAYMENT] TransactionID: ${transactionId} | Action: ${action} | Status: ${status}`;
        
        const logData = {
            context: 'Payment',
            transactionId,
            action,
            status,
            details: details ? this.sanitizeData(details) : undefined,
        };

        if (status === 'FAILED') {
            this.logger.error(message, logData);
        } else {
            this.logger.info(message, logData);
        }
    }

    /**
     * Sanitizar datos sensibles antes de loggear
     */
    private sanitizeData(data: any): any {
        if (!data) return data;

        const sensitiveKeys = ['password', 'token', 'secret', 'authorization', 'bearer', 'apikey'];
        const sanitized = { ...data };

        const sanitizeObject = (obj: any): any => {
            if (typeof obj !== 'object' || obj === null) return obj;

            for (const key of Object.keys(obj)) {
                const lowerKey = key.toLowerCase();
                if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
                    obj[key] = '***REDACTED***';
                } else if (typeof obj[key] === 'object') {
                    obj[key] = sanitizeObject(obj[key]);
                }
            }
            return obj;
        };

        return sanitizeObject(sanitized);
    }

    /**
     * Obtener la ruta actual de logs
     */
    getLogPath(): string {
        return CustomLoggerService.logPath;
    }
}
