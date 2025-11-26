# DMS2 NestJS - Guía de Configuración

## ⚙️ Configuración del Archivo .env

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# Application
PORT=3000
NODE_ENV=development

# PostgreSQL (Base de datos principal)
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=tu_password
DB_DATABASE=dms2_database
DB_SSL=false

# SQL Server (SAP Integration)
MSSQL_HOST=localhost
MSSQL_PORT=1433
MSSQL_USERNAME=sa
MSSQL_PASSWORD=tu_password_sqlserver
MSSQL_DATABASE=integrador_icorebiz
MSSQL_ENCRYPT=false
MSSQL_TRUST_SERVER_CERTIFICATE=true

# SAP Linked Server
SAP_SERVER_NAME=SERVER_SAP
SAP_DATABASE=COLEGIO_ALEMAN
SAP_USERNAME=icorebiz
SAP_PASSWORD=tu_password_sap

# JWT Authentication
JWT_SECRET=cambia-esto-por-un-string-aleatorio-seguro
JWT_EXPIRATION=7d

# CORS
CORS_ORIGIN=*
```

## ✅ Lo Que Se Ha Implementado

### Módulos Completados:
1. ✅ **Configuración de Base de Datos** (PostgreSQL + SQL Server)
2. ✅ **Entidades TypeORM** (Student, Father, MobileUser, Device)
3. ✅ **Módulo SAP** con integración a SQL Server y parsing de XML
4. ✅ **Utilidades Comunes** (decoradores, guards)

### Próximos Pasos:
- Auth Module (login, autenticación mobile)
- School Module (endpoints de consulta de deuda)
- Testing con datos reales

## 🚀 Ejecutar la Aplicación

```bash
npm install
npm run start:dev
```

Visita: http://localhost:3000/health
