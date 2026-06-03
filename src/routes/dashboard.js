const router = require('express').Router();
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

router.use(authMiddleware);

// GET /api/dashboard
router.get('/', async (req, res) => {
  try {
    const rol = req.usuario.rol;
    const esComprador = rol === 'comprador';
    const esTesorero = rol === 'tesorero';
    const esAdmin = ['admin', 'contador', 'auditor'].includes(rol);

    const [estados, porCategoria, vencimientos, recientes, valorMes] = await Promise.all([

      // Conteo por estado (solo pendientes si es comprador)
      esComprador 
        ? db.query(`
            SELECT estado, COUNT(*)::int AS total
            FROM facturas
            WHERE estado IN ('recibida','revision')
            GROUP BY estado
          `)
        : db.query(`
            SELECT estado, COUNT(*)::int AS total
            FROM facturas
            GROUP BY estado
          `),

      // Por categoría (top 5) - solo si no es comprador
      esComprador
        ? Promise.resolve({ rows: [] })
        : db.query(`
            SELECT c.nombre, c.color, COUNT(f.id)::int AS total
            FROM categorias_compra c
            LEFT JOIN facturas f ON f.categoria_id = c.id
            WHERE c.activo = TRUE
            GROUP BY c.id
            ORDER BY total DESC
            LIMIT 5
          `),

      // Próximas a vencer (límite pago en los próximos 7 días)
      db.query(`
        SELECT f.id, f.numero_factura, f.valor_total, f.limite_pago, f.estado,
               p.nombre AS proveedor_nombre
        FROM facturas f
        LEFT JOIN proveedores p ON p.id = f.proveedor_id
        WHERE f.limite_pago IS NOT NULL
          AND f.limite_pago <= CURRENT_DATE + INTERVAL '7 days'
          AND f.estado NOT IN ('pagada','rechazada')
        ORDER BY f.limite_pago ASC
        LIMIT 5
      `),

      // Últimas 8 facturas
      db.query(`
        SELECT f.id, f.numero_factura, f.valor_total, f.estado, f.recibida_en,
               p.nombre AS proveedor_nombre,
               c.nombre AS categoria_nombre, c.color AS categoria_color
        FROM facturas f
        LEFT JOIN proveedores p ON p.id = f.proveedor_id
        LEFT JOIN categorias_compra c ON c.id = f.categoria_id
        ORDER BY f.recibida_en DESC
        LIMIT 8
      `),

      // Valor causado en el mes actual
      db.query(`
        SELECT COALESCE(SUM(valor_total), 0)::numeric AS valor
        FROM facturas
        WHERE estado IN ('causada','pagada')
          AND DATE_TRUNC('month', creado_en) = DATE_TRUNC('month', NOW())
      `),
    ]);

    // Resumen
    const resumen = {
      total: 0,
      recibidas: 0,
      revision: 0,
      aprobadas: 0,
      causadas: 0,
      pagadas: 0,
      rechazadas: 0,
      valor_mes: parseFloat(valorMes.rows[0]?.valor || 0),
    };
    for (const row of estados.rows) {
      resumen.total += row.total;
      if (row.estado === 'recibida') resumen.recibidas = row.total;
      if (row.estado === 'revision') resumen.revision = row.total;
      if (row.estado === 'aprobada') resumen.aprobadas = row.total;
      if (row.estado === 'causada') resumen.causadas = row.total;
      if (row.estado === 'pagada') resumen.pagadas = row.total;
      if (row.estado === 'rechazada') resumen.rechazadas = row.total;
    }

    res.json({
      rol,
      resumen,
      por_categoria: porCategoria.rows,
      vencimientos: vencimientos.rows,
      recientes: recientes.rows,
    });

  } catch (err) {
    console.error('[dashboard]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/charts
router.get('/charts', async (req, res) => {
  try {
    const esComprador = req.usuario.rol === 'comprador';

    const [porMes, porEstado, porProveedor, porCategoria, porArea, valorPorMes] = await Promise.all([

      // Facturas por mes (últimos 12)
      db.query(`
        SELECT DATE_TRUNC('month', creado_en)::date AS mes,
               COUNT(*)::int AS total,
               COALESCE(SUM(valor_total), 0)::numeric AS valor
        FROM facturas
        WHERE creado_en >= NOW() - INTERVAL '12 months'
        GROUP BY mes
        ORDER BY mes
      `),

      // Conteo por estado
      esComprador
        ? db.query(`SELECT estado, COUNT(*)::int AS total FROM facturas WHERE estado IN ('recibida','revision') GROUP BY estado`)
        : db.query(`SELECT estado, COUNT(*)::int AS total FROM facturas GROUP BY estado`),

      // Top 10 proveedores
      esComprador
        ? Promise.resolve({ rows: [] })
        : db.query(`
            SELECT p.nombre, COUNT(f.id)::int AS total, COALESCE(SUM(f.valor_total), 0)::numeric AS valor
            FROM proveedores p
            JOIN facturas f ON f.proveedor_id = p.id
            GROUP BY p.id, p.nombre
            ORDER BY total DESC
            LIMIT 10
          `),

      // Por categoría
      esComprador
        ? Promise.resolve({ rows: [] })
        : db.query(`
            SELECT c.nombre, c.color, COUNT(f.id)::int AS total
            FROM categorias_compra c
            LEFT JOIN facturas f ON f.categoria_id = c.id
            WHERE c.activo = TRUE
            GROUP BY c.id, c.nombre, c.color
            ORDER BY total DESC
            LIMIT 10
          `),

      // Por área
      esComprador
        ? Promise.resolve({ rows: [] })
        : db.query(`
            SELECT a.nombre, COUNT(f.id)::int AS total, COALESCE(SUM(f.valor_total), 0)::numeric AS valor
            FROM areas a
            LEFT JOIN facturas f ON f.area_responsable_id = a.id
            GROUP BY a.id, a.nombre
            ORDER BY total DESC
            LIMIT 10
          `),

      // Valor por mes (últimos 12)
      db.query(`
        SELECT DATE_TRUNC('month', creado_en)::date AS mes,
               COALESCE(SUM(valor_total), 0)::numeric AS valor
        FROM facturas
        WHERE estado IN ('causada','pagada')
          AND creado_en >= NOW() - INTERVAL '12 months'
        GROUP BY mes
        ORDER BY mes
      `),
    ]);

    res.json({
      por_mes: porMes.rows,
      por_estado: porEstado.rows,
      por_proveedor: porProveedor.rows,
      por_categoria: porCategoria.rows,
      por_area: porArea.rows,
      valor_por_mes: valorPorMes.rows,
    });

  } catch (err) {
    console.error('[dashboard/charts]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/storage
router.get('/storage', async (req, res) => {
  try {
    const { stdout } = await execAsync('df -BG .', { timeout: 3000 });
    const lines = stdout.trim().split('\n');
    if (lines.length < 2) throw new Error('no output');
    const parts = lines[1].split(/\s+/);
    const total = parseInt(parts[1]) || 0;
    const used  = parseInt(parts[2]) || 0;
    const avail = parseInt(parts[3]) || 0;
    const pct   = parseInt(parts[4]) || 0;
    return res.json({ total_gb: total, used_gb: used, avail_gb: avail, percent_used: pct });
  } catch {
    // fallback
    try {
      const fs2 = require('fs');
      const st = fs2.statfsSync(process.cwd());
      const bsize = Number(st.bsize) || 4096;
      const total = Math.floor(Number(st.blocks) * bsize / (1024*1024*1024));
      const avail = Math.floor(Number(st.bavail) * bsize / (1024*1024*1024));
      const used  = total - Math.floor(Number(st.bfree) * bsize / (1024*1024*1024));
      const pct   = total > 0 ? Math.round(used / total * 100) : 0;
      return res.json({ total_gb: Math.max(total,0), used_gb: Math.max(used,0), avail_gb: Math.max(avail,0), percent_used: Math.min(pct,100) });
    } catch {
      res.json({ total_gb: 0, used_gb: 0, avail_gb: 0, percent_used: 0 });
    }
  }
});

module.exports = router;
