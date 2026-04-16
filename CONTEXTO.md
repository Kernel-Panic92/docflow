# Vitamar Docs - Contexto de Desarrollo

## Estado Actual
Sistema de gestión documental para facturas electrónicas colombianas (DIAN) con importación automática vía IMAP desde FortiMail.

## Funcionalidades Implementadas
- Importación automática de facturas desde correo IMAP
- Parser de XML DIAN (AttachedDocument con Invoice embebido)
- Extracción de: número factura, valores, IVA, CUFE, NIT emisor/receptor
- Creación automática de proveedores por NIT
- Flujo de aprobación completo (recibida → revisión → aprobación → causación → pagada)
- Visualización de PDF en modal (dentro de la app)
- Dashboard con resumen
- Light/Dark theme
- Backup/Restore
- Rate limiting y protección fuerza bruta

## Estructura del Proyecto
```
vitamar-docs/
├── src/
│   ├── services/
│   │   ├── imap.service.js      # Importación correo + parser XML
│   │   ├── cron.service.js      # Escalaciones y DIAN tácita
│   │   └── smtp.service.js      # Notificaciones email
│   ├── routes/
│   │   ├── facturas.js          # CRUD facturas + PDF
│   │   ├── proveedores.js
│   │   ├── auth.js              # Login con rate limiting
│   │   └── backup.js             # Backup/restore
│   ├── db/
│   │   ├── migrate.js            # Esquema BD
│   │   └── seed.js               # Datos iniciales
│   └── server.js
├── public/
│   └── index.html                # Frontend SPA
├── install.sh                    # Instalador automático
└── package.json
```

## Parser XML DIAN
El sistema procesa AttachedDocument que contiene el Invoice UBL embebido como CDATA.
Extrae datos del Invoice embebido dentro de `<cac:Attachment><cac:ExternalReference><cbc:Description>`.

## Para Continuar
1. Copiar todo el proyecto (excepto node_modules)
2. `npm install` para instalar dependencias
3. Configurar `.env` con conexión a PostgreSQL
4. `npm run migrate` para crear tablas
5. `npm run seed` para datos iniciales
6. `pm2 start ecosystem.config.js` para iniciar

## Credenciales por Defecto
- Email: admin@vitamar.com
- Password: vitamar2025

## Archivos Modificados Recientemente
- `src/services/imap.service.js` - Parser XML mejorado
- `src/routes/facturas.js` - Endpoint PDF con auth
- `src/server.js` - Cookie parser
- `public/index.html` - Modal PDF + verPdf()
- `package.json` - Dependencias completas (incluye adm-zip, cookie-parser)
