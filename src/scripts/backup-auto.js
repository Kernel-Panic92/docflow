const db = require('../db');
const AdmZip = require('adm-zip');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads', 'facturas');

async function generarBackupAuto() {
  const configResult = await db.query(`SELECT clave, valor FROM configuracion`);
  const cfg = {};
  for (const row of configResult.rows) cfg[row.clave] = row.valor;
  
  const backupType = cfg.backup_auto_type || 'local';
  const backupPath = cfg.backup_auto_path || '/mnt/vitamar-nas/backup';
  const retention = parseInt(cfg.backup_auto_retention || '7');
  
  if (backupType === 'smb') {
    const smbHost = cfg.backup_auto_host || '';
    const smbUser = cfg.backup_auto_user || '';
    const smbPass = cfg.backup_auto_pass || '';
    
    if (!smbHost) {
      console.log('[Backup-Auto] SMB configurado pero sin host');
      return;
    }
    
    const tempDir = '/tmp/vitamar-backup-smb';
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    
    const zip = new AdmZip();
    const agregarQuery = async (sql, nombre) => {
      try {
        const { rows } = await db.query(sql);
        zip.addFile(`${nombre}.json`, Buffer.from(JSON.stringify(rows, null, 2), 'utf8'));
        console.log(`[Backup-Auto] ${nombre}: ${rows.length} registros`);
      } catch (e) {
        console.log(`[Backup-Auto] Error ${nombre}: ${e.message}`);
      }
    };
    
    await agregarQuery('SELECT * FROM facturas ORDER BY recibida_en DESC LIMIT 2000', 'facturas');
    await agregarQuery('SELECT * FROM eventos_flujo ORDER BY creado_en DESC LIMIT 5000', 'eventos');
    await agregarQuery('SELECT * FROM proveedores', 'proveedores');
    await agregarQuery('SELECT clave, valor FROM configuracion', 'configuracion');
    
    const fecha = new Date().toISOString().slice(0, 10);
    const tempFile = path.join(tempDir, `vitamar_backup_${fecha}_${Date.now()}.zip`);
    zip.writeZip(tempFile);
    console.log(`[Backup-Auto] Backup creado localmente: ${tempFile}`);
    
    const smbPath = smbHost.startsWith('//') ? smbHost : `//${smbHost}`;
    const cmd = `smbclient "${smbPath}" "${smbPass}" -U "${smbUser}" -c "cd backup 2>/dev/null || mkdir backup; cd backup; put ${tempFile} $(basename ${tempFile})" 2>&1`;
    
    try {
      execSync(cmd, { stdio: 'pipe' });
      console.log(`[Backup-Auto] Backup subido a SMB: ${smbHost}`);
    } catch (e) {
      console.log(`[Backup-Auto] Error subiendo a SMB: ${e.message}`);
      console.log('[Backup-Auto] Intentando con curl...');
      
      const curlCmd = `curl -T "${tempFile}" "smb://${smbUser}:${encodeURIComponent(smbPass)}@${smbHost.replace(/\\/g, '/').replace('//', '')}/backup/" 2>&1`;
      try {
        execSync(curlCmd, { stdio: 'pipe' });
        console.log(`[Backup-Auto] Backup subido via curl`);
      } catch (e2) {
        console.log(`[Backup-Auto] Error con curl: ${e2.message}`);
      }
    }
    
    fs.unlinkSync(tempFile);
    console.log('[Backup-Auto] Completado');
    return;
  }
  
  if (!fs.existsSync(backupPath)) {
    console.log(`[Backup-Auto] Directorio no existe: ${backupPath}`);
    return;
  }
  
  const zip = new AdmZip();
  
  const agregarQuery = async (sql, nombre) => {
    try {
      const { rows } = await db.query(sql);
      zip.addFile(`${nombre}.json`, Buffer.from(JSON.stringify(rows, null, 2), 'utf8'));
      console.log(`[Backup-Auto] ${nombre}: ${rows.length} registros`);
    } catch (e) {
      console.log(`[Backup-Auto] Error ${nombre}: ${e.message}`);
    }
  };
  
  await agregarQuery('SELECT * FROM facturas ORDER BY recibida_en DESC LIMIT 2000', 'facturas');
  await agregarQuery('SELECT * FROM eventos_flujo ORDER BY creado_en DESC LIMIT 5000', 'eventos');
  await agregarQuery('SELECT * FROM proveedores', 'proveedores');
  await agregarQuery('SELECT clave, valor FROM configuracion', 'configuracion');
  
  if (fs.existsSync(UPLOAD_DIR)) {
    const files = fs.readdirSync(UPLOAD_DIR);
    if (files.length > 0) {
      zip.addLocalFolder(UPLOAD_DIR, 'uploads');
    }
  }
  
  const fecha = new Date().toISOString().slice(0, 10);
  const filename = `vitamar_backup_${fecha}_${Date.now()}.zip`;
  const filepath = path.join(backupPath, filename);
  
  zip.writeZip(filepath);
  console.log(`[Backup-Auto] Backup guardado: ${filename}`);
  
  const archivos = fs.readdirSync(backupPath)
    .filter(f => f.startsWith('vitamar_backup_') && f.endsWith('.zip'))
    .sort()
    .reverse();
  
  if (archivos.length > retention) {
    const eliminar = archivos.slice(retention);
    for (const f of eliminar) {
      try {
        fs.unlinkSync(path.join(backupPath, f));
        console.log(`[Backup-Auto] Eliminado: ${f}`);
      } catch (e) {}
    }
  }
  
  console.log(`[Backup-Auto] Completado. Total backups: ${archivos.length}`);
}

generarBackupAuto().catch(e => {
  console.error('[Backup-Auto] Error:', e.message);
  process.exit(1);
});
