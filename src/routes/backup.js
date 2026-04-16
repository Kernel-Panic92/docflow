const router = require('express').Router();
const path   = require('path');
const fs     = require('fs');
const { execSync } = require('child_process');
const multer = require('multer');
const AdmZip = require('adm-zip');
const db     = require('../db');
const { authMiddleware, requireRol } = require('../middleware/auth');

const soloAdmin = requireRol('admin');

// ─── Multer para uploads de restore ─────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

// ─── Paths ────────────────────────────────────────────────────────────────────
const BACKUP_DIR = path.join(process.cwd(), 'backups');
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads', 'facturas');

// ─── Helpers ─────────────────────────────────────────────────────────────────
function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function getBackupFiles() {
  ensureBackupDir();
  return fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('vitamar_backup_') && f.endsWith('.zip'))
    .map(f => {
      const full = path.join(BACKUP_DIR, f);
      const stat = fs.statSync(full);
      return {
        nombre:  f,
        tamano:  stat.size,
        fecha:   stat.mtime.toISOString(),
      };
    })
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

// ─── GET /api/backup/lista ──────────────────────────────────────────────────
router.get('/lista', authMiddleware, soloAdmin, (req, res) => {
  try {
    const archivos = getBackupFiles().slice(0, 30);
    res.json(archivos);
  } catch (err) {
    res.status(500).json({ error: 'Error listando backups: ' + err.message });
  }
});

// ─── GET /api/backup/generar ────────────────────────────────────────────────
router.get('/generar', authMiddleware, soloAdmin, async (req, res) => {
  ensureBackupDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename  = `vitamar_backup_${timestamp}.zip`;
  const filepath  = path.join(BACKUP_DIR, filename);

  try {
    const zip = new AdmZip();

    // 1. Dump de PostgreSQL
    const dumpFile = path.join(BACKUP_DIR, `temp_dump_${timestamp}.sql`);
    try {
      const dumpCmd = `pg_dump -h ${process.env.DB_HOST || 'localhost'} -p ${process.env.DB_PORT || 5432} -U ${process.env.DB_USER || 'postgres'} -d ${process.env.DB_NAME || 'vitamar_docs'} -Fc -f "${dumpFile}"`;
      execSync(dumpCmd, {
        env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD },
        stdio: 'pipe',
      });
      zip.addLocalFile(dumpFile, '', 'database.dump');
      fs.unlinkSync(dumpFile);
    } catch (pgErr) {
      console.error('[Backup] pg_dump error:', pgErr.message);
      // Intentar dump plano
      try {
        const dumpCmdText = `pg_dump -h ${process.env.DB_HOST || 'localhost'} -p ${process.env.DB_PORT || 5432} -U ${process.env.DB_USER || 'postgres'} -d ${process.env.DB_NAME || 'vitamar_docs'} --column-inserts`;
        const dumpText = execSync(dumpCmdText, {
          env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD },
          stdio: 'pipe',
        }).toString();
        zip.addFile('database.sql', Buffer.from(dumpText, 'utf8'));
      } catch (pgErr2) {
        console.error('[Backup] pg_dump text fallback error:', pgErr2.message);
      }
    }

    // 2. Configuración JSON
    const cfg = await db.query('SELECT clave, valor FROM configuracion');
    const usuarios = await db.query(
      'SELECT id, nombre, email, rol, area_id, activo, cambio_password, creado_en FROM usuarios'
    );
    const areas = await db.query('SELECT * FROM areas');

    const configJson = {
      app:       'VitamarDocs',
      version:   '1.0.0',
      generado:  new Date().toISOString(),
      config:    cfg.rows,
      usuarios:  usuarios.rows.map(u => ({ ...u, password_hash: undefined })),
      areas:     areas.rows,
    };
    zip.addFile('config.json', Buffer.from(JSON.stringify(configJson, null, 2), 'utf8'));

    // 3. Carpeta uploads (si existe)
    if (fs.existsSync(UPLOAD_DIR)) {
      const files = fs.readdirSync(UPLOAD_DIR);
      if (files.length > 0) {
        zip.addLocalFolder(UPLOAD_DIR, 'uploads');
      }
    }

    // Guardar ZIP
    zip.writeZip(filepath);

    const stat = fs.statSync(filepath);
    res.json({
      ok:      true,
      archivo: filename,
      tamano:  stat.size,
      fecha:   stat.mtime.toISOString(),
    });

  } catch (err) {
    console.error('[Backup] Error generando backup:', err);
    res.status(500).json({ error: 'Error generando backup: ' + err.message });
  }
});

// ─── GET /api/backup/descargar/:filename ────────────────────────────────────
router.get('/descargar/:filename', authMiddleware, soloAdmin, (req, res) => {
  const { filename } = req.params;
  if (!/^vitamar_backup_[\w\-]+\.zip$/.test(filename)) {
    return res.status(400).json({ error: 'Nombre de archivo inválido' });
  }

  const filepath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'Archivo no encontrado' });
  }

  res.download(filepath, filename);
});

// ─── POST /api/backup/restaurar ──────────────────────────────────────────────
router.post('/restaurar', authMiddleware, soloAdmin, upload.single('backup'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Archivo requerido' });

  let zip;
  try {
    zip = new AdmZip(req.file.buffer);
  } catch (err) {
    return res.status(400).json({ error: 'Archivo ZIP inválido' });
  }

  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // Restaurar config.json
    const configEntry = zip.getEntry('config.json');
    if (configEntry) {
      const config = JSON.parse(configEntry.getData().toString('utf8'));

      if (config.app !== 'VitamarDocs') {
        throw new Error('Archivo de backup incompatible');
      }

      // Restaurar configuración
      if (config.config?.length) {
        for (const row of config.config) {
          await client.query(
            'INSERT INTO configuracion (clave, valor, actualizado_en) VALUES ($1, $2, NOW()) ON CONFLICT (clave) DO UPDATE SET valor=$2, actualizado_en=NOW()',
            [row.clave, row.valor]
          );
        }
      }

      // Restaurar áreas (sin tocar IDs para mantener referencias)
      if (config.areas?.length) {
        for (const area of config.areas) {
          await client.query(
            `INSERT INTO areas (id, nombre, jefe_nombre, email, activo, creado_en, actualizado_en)
             VALUES ($1, $2, $3, $4, $5, $6, NOW())
             ON CONFLICT (id) DO UPDATE SET nombre=$2, jefe_nombre=$3, email=$4, activo=$5, actualizado_en=NOW()`,
            [area.id, area.nombre, area.jefe_nombre, area.email, area.activo, area.creado_en]
          );
        }
      }

      // Restaurar usuarios (sin passwords, sin admin actual)
      if (config.usuarios?.length) {
        for (const u of config.usuarios) {
          if (u.email === req.usuario.email) continue; // proteger sesión actual
          await client.query(
            `INSERT INTO usuarios (id, nombre, email, rol, area_id, activo, cambio_password, creado_en, actualizado_en)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
             ON CONFLICT (id) DO UPDATE SET nombre=$2, email=$3, rol=$4, area_id=$5, activo=$6, cambio_password=$7, actualizado_en=NOW()`,
            [u.id, u.nombre, u.email, u.rol, u.area_id, u.activo, u.cambio_password || false, u.creado_en]
          );
        }
      }
    }

    // Restaurar database.dump (PostgreSQL custom format)
    const dumpEntry = zip.getEntry('database.dump');
    if (dumpEntry) {
      const tmpDump = path.join(BACKUP_DIR, `temp_restore_${Date.now()}.dump`);
      fs.writeFileSync(tmpDump, dumpEntry.getData());

      try {
        const restoreCmd = `pg_restore -h ${process.env.DB_HOST || 'localhost'} -p ${process.env.DB_PORT || 5432} -U ${process.env.DB_USER || 'postgres'} -d ${process.env.DB_NAME || 'vitamar_docs'} --clean --if-exists -Fc "${tmpDump}"`;
        execSync(restoreCmd, {
          env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD },
          stdio: 'pipe',
        });
      } catch (pgErr) {
        console.warn('[Restore] pg_restore error:', pgErr.message);
      } finally {
        if (fs.existsSync(tmpDump)) fs.unlinkSync(tmpDump);
      }
    }

    // Restaurar uploads
    const uploadsEntry = zip.getEntry('uploads');
    if (uploadsEntry && fs.existsSync(UPLOAD_DIR)) {
      // Limpiar uploads actuales
      const existing = fs.readdirSync(UPLOAD_DIR);
      for (const f of existing) {
        fs.unlinkSync(path.join(UPLOAD_DIR, f));
      }
    }

    await client.query('COMMIT');
    res.json({ ok: true, mensaje: 'Restauración completada correctamente' });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Restore] Error:', err);
    res.status(500).json({ error: 'Error en restauración: ' + err.message });
  } finally {
    client.release();
  }
});

// ─── DELETE /api/backup/:filename ───────────────────────────────────────────
router.delete('/:filename', authMiddleware, soloAdmin, (req, res) => {
  const { filename } = req.params;
  if (!/^vitamar_backup_[\w\-]+\.zip$/.test(filename)) {
    return res.status(400).json({ error: 'Nombre de archivo inválido' });
  }

  const filepath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'Archivo no encontrado' });
  }

  fs.unlinkSync(filepath);
  res.json({ ok: true });
});

module.exports = router;
