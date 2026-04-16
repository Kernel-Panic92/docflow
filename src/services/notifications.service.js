const smtp = require('./smtp.service');
const db   = require('../db');

/**
 * Notificaciones por email en cada transición del flujo de facturas.
 * Se llama desde las rutas de facturas.
 */

async function notificarTransicion(factura, tipo, usuario, comentario = null) {
  if (!smtp.isConfigured()) return;

  const f = await obtenerDatosFactura(factura.id);
  if (!f) return;

  const tipoNombres = {
    recibida:       'recibida',
    asignada:       'asignada',
    revision:       'revision',
    aprobada:       'aprobada',
    rechazada:      'rechazada',
    causada:        'causada',
    pagada:         'pagada',
    escalacion_nivel1: 'escalacion',
    escalacion_nivel2: 'escalacion',
  };

  const tipoEmail = tipoNombres[tipo] || tipo;
  const emails    = await obtenerDestinatarios(f, tipoEmail);

  if (emails.length === 0) return;

  for (const email of emails) {
    try {
      await smtp.enviarNotificacionFactura({
        para:       email,
        tipo:       tipoEmail,
        factura:    f,
        usuario:    usuario?.nombre || null,
        comentario,
      });
    } catch (err) {
      console.error(`[Notif] Error enviando a ${email}:`, err.message);
    }
  }
}

async function obtenerDatosFactura(facturaId) {
  try {
    const { rows } = await db.query(
      `SELECT f.*,
              p.nombre  AS proveedor,
              c.nombre  AS categoria,
              a.nombre  AS area,
              u.nombre  AS asignado_nombre,
              u.email   AS asignado_email
       FROM facturas f
       LEFT JOIN proveedores p ON p.id = f.proveedor_id
       LEFT JOIN categorias_compra c ON c.id = f.categoria_id
       LEFT JOIN areas a ON a.id = f.area_responsable_id
       LEFT JOIN usuarios u ON u.id = f.asignado_a_id
       WHERE f.id = $1`,
      [facturaId]
    );
    return rows[0] || null;
  } catch (err) {
    console.error('[Notif] Error obteniendo datos factura:', err.message);
    return null;
  }
}

async function obtenerDestinatarios(factura, tipo) {
  const emails = new Set();

  // Siempre incluir al email de notificaciones global (si existe)
  const cfgEmail = await db.query(
    "SELECT valor FROM configuracion WHERE clave = 'email_notificaciones'"
  );
  if (cfgEmail.rows[0]?.valor) {
    emails.add(cfgEmail.rows[0].valor);
  }

  switch (tipo) {
    case 'recibida':
    case 'revision':
    case 'escalacion':
      // Enviar al comprador/asignado
      if (factura.asignado_email) emails.add(factura.asignado_email);
      // Enviar al área
      const areaUsers = await db.query(
        `SELECT email FROM usuarios u WHERE u.area_id = $1 AND u.activo = TRUE`,
        [factura.area_responsable_id]
      );
      areaUsers.rows.forEach(r => emails.add(r.email));
      break;

    case 'aprobada':
    case 'causada':
      // Enviar a tesoreros/contadores
      const financieros = await db.query(
        `SELECT email FROM usuarios
         WHERE rol IN ('tesorero', 'contador', 'admin') AND activo = TRUE`
      );
      financieros.rows.forEach(r => emails.add(r.email));
      break;

    case 'rechazada':
      // Enviar al creador/original (si tenemos email del asignado)
      if (factura.asignado_email) emails.add(factura.asignado_email);
      // Enviar al área
      const areaEmails = await db.query(
        `SELECT email FROM usuarios u WHERE u.area_id = $1 AND u.activo = TRUE LIMIT 5`,
        [factura.area_responsable_id]
      );
      areaEmails.rows.forEach(r => emails.add(r.email));
      break;

    case 'pagada':
      // Notificar al área
      if (factura.asignado_email) emails.add(factura.asignado_email);
      const areaFinal = await db.query(
        `SELECT email FROM usuarios u WHERE u.area_id = $1 AND u.activo = TRUE LIMIT 3`,
        [factura.area_responsable_id]
      );
      areaFinal.rows.forEach(r => emails.add(r.email));
      break;

    default:
      break;
  }

  return Array.from(emails).filter(e => e && e.includes('@'));
}

// ─── Helpers para integrar con rutas de facturas ─────────────────────────────

async function onFacturaRecibida(facturaId, usuario, metadata = null) {
  await registrarYNotificar(facturaId, usuario, 'recibida', metadata);
}

async function onFacturaAsignada(facturaId, usuario, metadata = null) {
  await registrarYNotificar(facturaId, usuario, 'asignada', metadata);
}

async function onFacturaRevision(facturaId, usuario) {
  await registrarYNotificar(facturaId, usuario, 'revision');
}

async function onFacturaAprobada(facturaId, usuario, comentario = null) {
  await registrarYNotificar(facturaId, usuario, 'aprobada', null, comentario);
}

async function onFacturaRechazada(facturaId, usuario, motivo) {
  await registrarYNotificar(facturaId, usuario, 'rechazada', null, motivo);
}

async function onFacturaCausada(facturaId, usuario, comentario = null) {
  await registrarYNotificar(facturaId, usuario, 'causada', null, comentario);
}

async function onFacturaPagada(facturaId, usuario) {
  await registrarYNotificar(facturaId, usuario, 'pagada');
}

async function onEscalacion(facturaId, nivel, usuario = null) {
  const tipo = nivel === 2 ? 'escalacion_nivel2' : 'escalacion_nivel1';
  await registrarYNotificar(facturaId, usuario, tipo);
}

async function registrarYNotificar(facturaId, usuario, tipo, metadata = null, comentario = null) {
  // El evento ya se registra en la ruta, solo notificamos aquí
  const factura = { id: facturaId };
  try {
    await notificarTransicion(factura, tipo, usuario, comentario);
  } catch (err) {
    console.error(`[Notif] Error en notificarTransicion (${tipo}):`, err.message);
  }
}

module.exports = {
  notificarTransicion,
  onFacturaRecibida,
  onFacturaAsignada,
  onFacturaRevision,
  onFacturaAprobada,
  onFacturaRechazada,
  onFacturaCausada,
  onFacturaPagada,
  onEscalacion,
};
