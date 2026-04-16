const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(process.cwd(), 'logs', 'sync-state.json');

let syncState = {
  ultimoSync: null,
  sincronizando: false,
  totalMensajes: 0,
  procesando: 0,
  creadas: 0,
  duplicadas: 0,
  errores: 0,
  mensaje: ''
};

function cargarEstado() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = fs.readFileSync(STATE_FILE, 'utf8');
      syncState = JSON.parse(data);
    }
  } catch (e) {
    // Ignorar errores
  }
  return syncState;
}

function guardarEstado() {
  try {
    const logsDir = path.dirname(STATE_FILE);
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(syncState, null, 2));
  } catch (e) {
    console.error('[SyncState] Error guardando:', e.message);
  }
}

function iniciarSync(totalMensajes) {
  syncState.sincronizando = true;
  syncState.totalMensajes = totalMensajes;
  syncState.procesando = 0;
  syncState.creadas = 0;
  syncState.duplicadas = 0;
  syncState.errores = 0;
  syncState.mensaje = `Procesando ${totalMensajes} mensajes...`;
  guardarEstado();
}

function actualizarProgreso(procesando, creadas, duplicadas, errores, mensaje) {
  syncState.procesando = procesando;
  syncState.creadas = creadas;
  syncState.duplicadas = duplicadas;
  syncState.errores = errores;
  syncState.mensaje = mensaje;
  guardarEstado();
}

function terminarSync(creadas, duplicadas, errores) {
  syncState.sincronizando = false;
  syncState.ultimoSync = new Date().toISOString();
  syncState.creadas = creadas;
  syncState.duplicadas = duplicadas;
  syncState.errores = errores;
  syncState.mensaje = `Completado: ${creadas} creadas, ${duplicadas} duplicadas, ${errores} errores`;
  guardarEstado();
}

function obtenerEstado() {
  return { ...syncState };
}

module.exports = {
  cargarEstado,
  iniciarSync,
  actualizarProgreso,
  terminarSync,
  obtenerEstado
};
