# Vitamar Docs

Sistema de gestión documental para facturas electrónicas de proveedores.

## Stack

- **Backend:** Node.js + Express
- **Base de datos:** PostgreSQL
- **Auth:** JWT
- **Correo:** FortiMail Cloud vía IMAP
- **Jobs:** node-cron

---

## Requisitos

- Node.js 18+
- PostgreSQL 14+
- Acceso IMAP a la cuenta de FortiMail

---

## Instalación

```bash
# 1. Clonar repo
git clone https://github.com/Kernel-Panic92/vitamar-docs.git
cd vitamar-docs

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores

# 4. Crear la base de datos en PostgreSQL
createdb vitamar_docs

# 5. Correr migraciones
npm run migrate

# 6. Cargar datos iniciales (áreas, categorías, usuario admin)
npm run seed

# 7. Arrancar en desarrollo
npm run dev
```

La app queda disponible en `http://localhost:3100`

**Acceso inicial:**
- Email: `admin@vitamar.com`
- Password: `vitamar2025`
- ⚠️ Cambiar la contraseña en el primer acceso.

---

## Estructura del proyecto

```
vitamar-docs/
├── src/
│   ├── server.js              # Entry point Express
│   ├── db/
│   │   ├── index.js           # Pool de conexión PostgreSQL
│   │   ├── migrate.js         # Migraciones del schema
│   │   └── seed.js            # Datos iniciales
│   ├── middleware/
│   │   └── auth.js            # JWT + control de roles
│   ├── routes/
│   │   ├── auth.js            # Login, me, cambio de password
│   │   ├── areas.js           # CRUD áreas
│   │   ├── categorias.js      # CRUD categorías + asociación a áreas
│   │   ├── facturas.js        # CRUD facturas + transiciones de estado
│   │   └── usuarios.js        # CRUD usuarios
│   └── services/
│       ├── imap.service.js    # Ingesta automática desde FortiMail
│       └── cron.service.js    # Jobs: escalaciones + DIAN tácita
├── public/                    # Frontend (a agregar)
├── uploads/facturas/          # PDFs y XMLs descargados
├── .env.example
└── package.json
```

---

## API Reference

### Auth
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/login` | Login, retorna JWT |
| GET | `/api/auth/me` | Usuario autenticado |
| POST | `/api/auth/cambiar-password` | Cambiar contraseña |

### Facturas
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/facturas` | Listar (filtros: estado, area_id, categoria_id) |
| GET | `/api/facturas/:id` | Detalle + eventos del flujo |
| POST | `/api/facturas` | Crear manual (multipart con PDF/XML) |
| PATCH | `/api/facturas/:id/asignar` | Asignar área y responsable |
| PATCH | `/api/facturas/:id/centro-costos` | Asignar CC |
| PATCH | `/api/facturas/:id/aprobar` | Aprobar |
| PATCH | `/api/facturas/:id/rechazar` | Rechazar con motivo |
| PATCH | `/api/facturas/:id/causar` | Causar (tesorero/contador) |
| PATCH | `/api/facturas/:id/pagar` | Marcar como pagada |
| GET | `/api/facturas/:id/pdf` | Descargar PDF |

### Categorías
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/categorias` | Listar con áreas |
| POST | `/api/categorias` | Crear con pasos y áreas |
| PUT | `/api/categorias/:id` | Editar |
| DELETE | `/api/categorias/:id` | Desactivar |

### Áreas y Usuarios
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/areas` | Listar áreas |
| POST | `/api/areas` | Crear área |
| GET | `/api/usuarios` | Listar usuarios (admin) |
| POST | `/api/usuarios` | Crear usuario |

---

## Roles de usuario

| Rol | Descripción |
|-----|-------------|
| `admin` | Acceso total, configuración del sistema |
| `contador` | Categorías, causación |
| `tesorero` | Causación y pagos |
| `comprador` | Revisar y aprobar facturas de su área |
| `auditor` | Solo lectura |

---

## Flujo de estados de una factura

```
recibida → revision → aprobada → causada → pagada
                   ↘ rechazada
```

### Jobs automáticos
- **Cada 30 min:** verifica facturas sin acción y genera escalaciones (nivel 1 → jefe área, nivel 2 → gerencia)
- **Cada hora:** marca aceptación tácita DIAN en facturas con más de 48h sin respuesta

---

## Variables de entorno

## Backups

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/backup/lista` | Lista backups disponibles |
| GET | `/api/backup/generar` | Genera nuevo backup (ZIP) |
| GET | `/api/backup/descargar/:nombre` | Descarga un backup |
| POST | `/api/backup/restaurar` | Restaura desde archivo ZIP |
| DELETE | `/api/backup/:nombre` | Elimina un backup |

**El instalador también configura:**
- Backup automático diario a las 2 AM (crontab)
- Script `backup.sh` para backup manual
- Restauración completa de BD + uploads

## Rate Limiting

- Máximo 5 intentos de login en 5 minutos
- Bloqueo de 30 min tras intentos fallidos
- Admin puede ver/desbloquear IPs en `/api/auth/ratelimit-status`

## Notificaciones por Email

El servicio SMTP está configurado para enviar notificaciones en cada transición de estado:
- `recibida` → Email al comprador/asignado
- `aprobada` → Email a tesorería
- `rechazada` → Email al área
- `escalación` → Email al jefe/gerencia

Configura el SMTP en la tabla `configuracion` o mediante variables de entorno.

## Tema claro/oscuro

Toggle en la barra superior. El tema se guarda en `localStorage`.

Ver `.env.example` para la lista completa.

## Próximos pasos

- [x] Frontend mejorado (Light/Dark, Responsive)
- [x] Rate limiting y protección fuerza bruta
- [x] Recuperación de contraseña por email
- [x] Backup/Restore automático
- [x] Notificaciones SMTP en transiciones
- [ ] Módulo de proveedores con CRUD
- [ ] Integración con Horix
