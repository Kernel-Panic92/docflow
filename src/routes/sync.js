const router = require('express').Router();
const { authMiddleware, requireRol } = require('../middleware/auth');
const syncState = require('../services/sync-state');

router.use(authMiddleware);

syncState.cargarEstado();

router.get('/status', async (req, res) => {
  const estado = syncState.obtenerEstado();
  
  let ultimoSyncFormateado = null;
  if (estado.ultimoSync) {
    const fecha = new Date(estado.ultimoSync);
    ultimoSyncFormateado = fecha.toLocaleString('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }
  
  res.json({
    sincronizando: estado.sincronizando,
    ultimoSync: estado.ultimoSync,
    ultimoSyncFormateado,
    totalMensajes: estado.totalMensajes,
    procesando: estado.procesando,
    creadas: estado.creadas,
    duplicadas: estado.duplicadas,
    errores: estado.errores,
    mensaje: estado.mensaje,
    progreso: estado.totalMensajes > 0 
      ? Math.round((estado.procesando / estado.totalMensajes) * 100) 
      : 0
  });
});

router.post('/sync', requireRol('admin', 'contador'), async (req, res) => {
  if (syncState.obtenerEstado().sincronizando) {
    return res.status(409).json({ error: 'Ya hay una sincronización en progreso' });
  }
  
  try {
    const { pollCorreo } = require('../services/imap.service');
    pollCorreo();
    res.json({ ok: true, mensaje: 'Sincronización iniciada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
