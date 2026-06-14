const crypto = require('crypto');
const db = require('../db');

const TOOLS = [
  {
    name: 'listar_facturas',
    description: 'Lista facturas con filtros opcionales (estado, proveedor, rango de fechas). Solo lectura.',
    inputSchema: {
      type: 'object', properties: {
        estado: { type: 'string', enum: ['recibida', 'revision', 'aprobada', 'rechazada', 'causada', 'pagada'] },
        proveedor: { type: 'string' },
        fechaInicio: { type: 'string' },
        fechaFin: { type: 'string' },
        limite: { type: 'number', default: 50 }
      }
    }
  },
  {
    name: 'resumen_dashboard',
    description: 'Obtiene el resumen del dashboard: totales por estado, valor del mes.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'listar_proveedores',
    description: 'Lista todos los proveedores registrados.',
    inputSchema: { type: 'object', properties: { limite: { type: 'number', default: 50 } } }
  },
  {
    name: 'facturas_por_vencer',
    description: 'Facturas próximas a vencer (límite de pago en los próximos 7 días).',
    inputSchema: { type: 'object', properties: { dias: { type: 'number', default: 7 } } }
  },
  {
    name: 'buscar_factura',
    description: 'Busca una factura por número.',
    inputSchema: { type: 'object', properties: { numero: { type: 'string' } }, required: ['numero'] }
  },
  {
    name: 'listar_categorias',
    description: 'Lista las categorías de compra activas.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'listar_areas',
    description: 'Lista las áreas de la organización.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'estadisticas',
    description: 'Estadísticas generales del sistema documental.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'aprobar_factura',
    description: 'Aprueba una factura en estado recibida o revision. Requiere centroOperacionId, areaResponsableId. Registra evento de auditoría.',
    inputSchema: {
      type: 'object', properties: {
        facturaId: { type: 'string' },
        centroOperacionId: { type: 'string' },
        areaResponsableId: { type: 'string' },
        centroCostos: { type: 'string' },
        descripcionGasto: { type: 'string' },
        referencia: { type: 'string' },
        comentario: { type: 'string' }
      }, required: ['facturaId', 'centroOperacionId', 'areaResponsableId']
    }
  },
  {
    name: 'rechazar_factura',
    description: 'Rechaza una factura en estado recibida o revision. Requiere motivo. Registra evento de auditoría.',
    inputSchema: {
      type: 'object', properties: {
        facturaId: { type: 'string' }, motivo: { type: 'string' }
      }, required: ['facturaId', 'motivo']
    }
  },
  {
    name: 'causar_factura',
    description: 'Causa una factura aprobada (cambia estado a causada). Requiere que esté en estado aprobada. Registra evento.',
    inputSchema: {
      type: 'object', properties: {
        facturaId: { type: 'string' }, comentario: { type: 'string' }
      }, required: ['facturaId']
    }
  },
  {
    name: 'pagar_factura',
    description: 'Marca una factura como pagada (cambia estado a pagada). Requiere que esté en estado causada. Registra evento.',
    inputSchema: {
      type: 'object', properties: {
        facturaId: { type: 'string' }, comentario: { type: 'string' }
      }, required: ['facturaId']
    }
  },
  {
    name: 'historial_eventos',
    description: 'Obtiene el historial de eventos de una factura.',
    inputSchema: {
      type: 'object', properties: {
        facturaId: { type: 'string' }, limite: { type: 'number', default: 50 }
      }, required: ['facturaId']
    }
  },
  {
    name: 'vencimientos_dian',
    description: 'Facturas próximas a vencer por DIAN (límite legal).',
    inputSchema: {
      type: 'object', properties: {
        dias: { type: 'number', default: 15 }
      }
    }
  },
  {
    name: 'resumen_proveedor',
    description: 'Resumen de facturas agrupado por proveedor.',
    inputSchema: {
      type: 'object', properties: {
        fechaInicio: { type: 'string' }, fechaFin: { type: 'string' },
        limite: { type: 'number', default: 20 }
      }
    }
  }
];

async function registrarEvento(client, facturaId, tipo, comentario = null) {
  await client.query(
    `INSERT INTO eventos_flujo (factura_id, tipo, comentario)
     VALUES ($1, $2, $3)`,
    [facturaId, tipo, comentario]
  );
}

async function ejecutarTool(name, args) {
  switch (name) {
    case 'listar_facturas': {
      const c = [], p = [];
      if (args.estado) { c.push('f.estado = $' + (p.length + 1)); p.push(args.estado); }
      if (args.proveedor) { c.push('(p.nombre ILIKE $' + (p.length + 1) + ' OR p.nit ILIKE $' + (p.length + 1) + ')'); p.push('%' + args.proveedor + '%'); }
      if (args.fechaInicio) { c.push('f.recibida_en >= $' + (p.length + 1)); p.push(args.fechaInicio); }
      if (args.fechaFin) { c.push('f.recibida_en <= $' + (p.length + 1)); p.push(args.fechaFin); }
      const w = c.length ? 'WHERE ' + c.join(' AND ') : '';
      const lim = Math.min(parseInt(args.limite) || 50, 200);
      p.push(lim);
      const r = await db.query(
        `SELECT f.id, f.numero_factura, f.valor_total, f.estado, f.recibida_en, f.limite_pago,
                p.nombre AS proveedor, c.nombre AS categoria
         FROM facturas f
         LEFT JOIN proveedores p ON p.id = f.proveedor_id
         LEFT JOIN categorias_compra c ON c.id = f.categoria_id
         ${w}
         ORDER BY f.recibida_en DESC
         LIMIT $${p.length}`, p);
      return r.rows;
    }
    case 'resumen_dashboard': {
      const r = await db.query(`
        SELECT estado, COUNT(*)::int AS total FROM facturas GROUP BY estado
      `);
      const v = await db.query(`
        SELECT COALESCE(SUM(valor_total), 0)::numeric AS valor
        FROM facturas WHERE estado IN ('causada','pagada')
        AND DATE_TRUNC('month', creado_en) = DATE_TRUNC('month', NOW())
      `);
      const resumen = { total: 0, valor_mes: parseFloat(v.rows[0]?.valor || 0) };
      for (const row of r.rows) { resumen.total += row.total; resumen[row.estado] = row.total; }
      return resumen;
    }
    case 'listar_proveedores': {
      const lim = Math.min(parseInt(args.limite) || 50, 200);
      const r = await db.query('SELECT id, nit, nombre, email, telefono, activo FROM proveedores ORDER BY nombre LIMIT $1', [lim]);
      return r.rows;
    }
    case 'facturas_por_vencer': {
      const dias = parseInt(args.dias) || 7;
      const r = await db.query(`
        SELECT f.id, f.numero_factura, f.valor_total, f.limite_pago, f.estado,
               p.nombre AS proveedor
        FROM facturas f
        LEFT JOIN proveedores p ON p.id = f.proveedor_id
        WHERE f.limite_pago IS NOT NULL
          AND f.limite_pago <= CURRENT_DATE + $1::interval
          AND f.estado NOT IN ('pagada','rechazada')
        ORDER BY f.limite_pago ASC
        LIMIT 20
      `, [dias + ' days']);
      return r.rows;
    }
    case 'buscar_factura': {
      const r = await db.query(`
        SELECT f.*, p.nombre AS proveedor_nombre, p.nit AS proveedor_nit,
               c.nombre AS categoria_nombre, a.nombre AS area_nombre
        FROM facturas f
        LEFT JOIN proveedores p ON p.id = f.proveedor_id
        LEFT JOIN categorias_compra c ON c.id = f.categoria_id
        LEFT JOIN areas a ON a.id = f.area_responsable_id
        WHERE f.numero_factura ILIKE $1
        LIMIT 10
      `, ['%' + args.numero + '%']);
      return r.rows;
    }
    case 'listar_categorias': {
      const r = await db.query('SELECT id, nombre, color, activo FROM categorias_compra WHERE activo = TRUE ORDER BY nombre');
      return r.rows;
    }
    case 'listar_areas': {
      const r = await db.query('SELECT id, nombre, activo FROM areas WHERE activo = TRUE ORDER BY nombre');
      return r.rows;
    }
    case 'estadisticas': {
      const [total, proveedores, porEstado, valorTotal] = await Promise.all([
        db.query('SELECT COUNT(*)::int AS c FROM facturas'),
        db.query('SELECT COUNT(*)::int AS c FROM proveedores WHERE activo = TRUE'),
        db.query('SELECT estado, COUNT(*)::int AS total FROM facturas GROUP BY estado'),
        db.query("SELECT COALESCE(SUM(valor_total),0)::numeric AS v FROM facturas WHERE estado NOT IN ('rechazada')"),
      ]);
      return {
        totalFacturas: total.rows[0].c,
        proveedoresActivos: proveedores.rows[0].c,
        valorTotal: parseFloat(valorTotal.rows[0].v),
        porEstado: porEstado.rows
      };
    }
    case 'aprobar_factura': {
      if (!args.centroOperacionId) throw new Error('centroOperacionId es requerido');
      if (!args.areaResponsableId) throw new Error('areaResponsableId es requerido');
      const client = await db.getClient();
      try {
        await client.query('BEGIN');
        const r = await client.query(
          `UPDATE facturas SET estado='aprobada', aprobada_en=NOW(),
             centro_operacion_id=$1, area_responsable_id=$2,
             centro_costos=$3, descripcion_gasto=$4, referencia=$5
           WHERE id=$6 AND estado IN ('recibida','revision')
           RETURNING id, estado, aprobada_en`,
          [args.centroOperacionId, args.areaResponsableId,
           args.centroCostos || null, args.descripcionGasto || null, args.referencia || null,
           args.facturaId]
        );
        if (r.rows.length === 0) throw new Error('Factura no encontrada o no está en estado recibida/revision');
        await registrarEvento(client, args.facturaId, 'aprobada', args.comentario || 'Aprobada vía MCP');
        await client.query('COMMIT');
        return { id: r.rows[0].id, estado: 'aprobada' };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }
    case 'rechazar_factura': {
      if (!args.motivo) throw new Error('motivo es requerido');
      const client = await db.getClient();
      try {
        await client.query('BEGIN');
        const r = await client.query(
          `UPDATE facturas SET estado='rechazada', motivo_rechazo=$1
           WHERE id=$2 AND estado IN ('recibida','revision')
           RETURNING id, estado`,
          [args.motivo, args.facturaId]
        );
        if (r.rows.length === 0) throw new Error('Factura no encontrada o no está en estado recibida/revision');
        await registrarEvento(client, args.facturaId, 'rechazada', args.motivo);
        await client.query('COMMIT');
        return { id: r.rows[0].id, estado: 'rechazada', motivo: args.motivo };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }
    case 'causar_factura': {
      const clientC = await db.getClient();
      try {
        await clientC.query('BEGIN');
        const r = await clientC.query(
          `UPDATE facturas SET estado='causada', causada_en=NOW()
           WHERE id=$1 AND estado='aprobada'
           RETURNING id, estado, causada_en`,
          [args.facturaId]
        );
        if (r.rows.length === 0) throw new Error('Factura no encontrada o no está en estado aprobada');
        await registrarEvento(clientC, args.facturaId, 'causada', args.comentario || 'Causada vía MCP');
        await clientC.query('COMMIT');
        return { id: r.rows[0].id, estado: 'causada' };
      } catch (err) {
        await clientC.query('ROLLBACK');
        throw err;
      } finally {
        clientC.release();
      }
    }
    case 'pagar_factura': {
      const clientP = await db.getClient();
      try {
        await clientP.query('BEGIN');
        const r = await clientP.query(
          `UPDATE facturas SET estado='pagada', pagada_en=NOW()
           WHERE id=$1 AND estado='causada'
           RETURNING id, estado, pagada_en`,
          [args.facturaId]
        );
        if (r.rows.length === 0) throw new Error('Factura no encontrada o no está en estado causada');
        await registrarEvento(clientP, args.facturaId, 'pagada', args.comentario || 'Pagada vía MCP');
        await clientP.query('COMMIT');
        return { id: r.rows[0].id, estado: 'pagada' };
      } catch (err) {
        await clientP.query('ROLLBACK');
        throw err;
      } finally {
        clientP.release();
      }
    }
    case 'historial_eventos': {
      const lim = Math.min(parseInt(args.limite) || 50, 200);
      const r = await db.query(`
        SELECT e.id, e.tipo, e.comentario, e.creado_en, u.nombre AS usuario
        FROM eventos_flujo e
        LEFT JOIN usuarios u ON u.id = e.usuario_id
        WHERE e.factura_id = $1
        ORDER BY e.creado_en DESC LIMIT $2
      `, [args.facturaId, lim]);
      return r.rows;
    }
    case 'vencimientos_dian': {
      const dias = parseInt(args.dias) || 15;
      const r = await db.query(`
        SELECT f.id, f.numero_factura, f.valor_total, f.limite_dian, f.estado,
               p.nombre AS proveedor, p.nit AS proveedor_nit
        FROM facturas f
        LEFT JOIN proveedores p ON p.id = f.proveedor_id
        WHERE f.limite_dian IS NOT NULL
          AND f.limite_dian <= NOW() + $1::interval
          AND f.estado NOT IN ('pagada', 'rechazada')
        ORDER BY f.limite_dian ASC LIMIT 20
      `, [dias + ' days']);
      return r.rows;
    }
    case 'resumen_proveedor': {
      const c = [], p = [];
      if (args.fechaInicio) { c.push('f.recibida_en >= $' + (p.length + 1)); p.push(args.fechaInicio); }
      if (args.fechaFin) { c.push('f.recibida_en <= $' + (p.length + 1)); p.push(args.fechaFin); }
      const w = c.length ? 'WHERE ' + c.join(' AND ') : '';
      const lim = Math.min(parseInt(args.limite) || 20, 100);
      p.push(lim);
      const r = await db.query(`
        SELECT p.nit, p.nombre AS proveedor, COUNT(f.id)::int AS total_facturas,
               COALESCE(SUM(f.valor_total), 0)::numeric AS valor_total,
               MIN(f.recibida_en) AS desde, MAX(f.recibida_en) AS hasta,
               COUNT(CASE WHEN f.estado = 'pagada' THEN 1 END)::int AS pagadas,
               COUNT(CASE WHEN f.estado NOT IN ('pagada', 'rechazada') THEN 1 END)::int AS pendientes
        FROM facturas f
        JOIN proveedores p ON p.id = f.proveedor_id
        ${w}
        GROUP BY p.id ORDER BY valor_total DESC LIMIT $${p.length}
      `, p);
      return r.rows;
    }
    default: throw new Error('Tool no encontrada: ' + name);
  }
}

const sessions = new Map();

function rpcResult(id, result) { return { jsonrpc: '2.0', result, id }; }
function rpcError(id, code, message) { return { jsonrpc: '2.0', error: { code, message }, id }; }

function createRouter() {
  const express = require('express');
  const router = express.Router();
  router.use(express.json());

  router.get('/', (req, res) => res.json({ status: 'ok', server: 'docflow-mcp' }));

  router.post('/', (req, res) => {
    const msg = req.body;
    if (!msg || msg.jsonrpc !== '2.0') {
      return res.status(400).json(rpcError(null, -32600, 'Invalid Request'));
    }
    const sessionId = req.headers['mcp-session-id'];
    const id = msg.id ?? null;

    switch (msg.method) {
      case 'initialize': {
        const newSessionId = crypto.randomUUID();
        sessions.set(newSessionId, { createdAt: Date.now() });
        res.setHeader('mcp-session-id', newSessionId);
        return res.json(rpcResult(id, {
          protocolVersion: '2025-03-26',
          capabilities: { tools: {} },
          serverInfo: { name: 'docflow-mcp', version: '1.0.0' }
        }));
      }
      case 'tools/list': {
        if (!sessionId || !sessions.has(sessionId)) {
          return res.status(401).json(rpcError(id, -32001, 'Sesión inválida'));
        }
        return res.json(rpcResult(id, { tools: TOOLS }));
      }
      case 'tools/call': {
        if (!sessionId || !sessions.has(sessionId)) {
          return res.status(401).json(rpcError(id, -32001, 'Sesión inválida'));
        }
        const { name, arguments: args } = msg.params || {};
        ejecutarTool(name, args || {}).then(result => {
          res.json(rpcResult(id, { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }));
        }).catch(err => {
          res.json(rpcResult(id, { isError: true, content: [{ type: 'text', text: 'Error: ' + err.message }] }));
        });
        return;
      }
      case 'ping':
        return res.json(rpcResult(id, {}));
      case 'notifications/initialized':
        return res.status(202).end();
      default:
        return res.status(400).json(rpcError(id, -32601, 'Method not found'));
    }
  });

  return router;
}

module.exports = { createMiddleware: createRouter, ejecutarTool };
