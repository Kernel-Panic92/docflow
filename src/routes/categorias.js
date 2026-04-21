const router = require('express').Router();
const db = require('../db');
const { authMiddleware, requireRol } = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/categorias
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM categorias_compra WHERE activo = TRUE ORDER BY nombre`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/categorias/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM categorias_compra WHERE id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Categoría no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/categorias
router.post('/', requireRol('admin', 'contador'), async (req, res) => {
  const { nombre, descripcion, color, pasos } = req.body;
  if (!nombre?.trim()) return res.status(400).json({ error: 'Nombre requerido' });
  if (!Array.isArray(pasos) || pasos.length === 0) {
    return res.status(400).json({ error: 'Debe incluir al menos un paso en el flujo' });
  }

  try {
    const { rows } = await db.query(
      `INSERT INTO categorias_compra (nombre, descripcion, color, pasos)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [nombre.trim(), descripcion?.trim() || null, color || '#3B82F6', JSON.stringify(pasos)]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ya existe una categoría con ese nombre' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/categorias/:id
router.put('/:id', requireRol('admin', 'contador'), async (req, res) => {
  const { nombre, descripcion, color, pasos } = req.body;
  if (!nombre?.trim()) return res.status(400).json({ error: 'Nombre requerido' });

  try {
    const { rows } = await db.query(
      `UPDATE categorias_compra
       SET nombre=$1, descripcion=$2, color=$3, pasos=$4
       WHERE id=$5 AND activo=TRUE RETURNING *`,
      [nombre.trim(), descripcion?.trim() || null, color || '#3B82F6', JSON.stringify(pasos), req.params.id]
    );
    if (!rows[0]) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ya existe una categoría con ese nombre' });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/categorias/:id (soft delete)
router.delete('/:id', requireRol('admin'), async (req, res) => {
  try {
    await db.query('UPDATE categorias_compra SET activo=FALSE WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/categorias/todas (incluye inactivas) ────────────────────────
router.get('/todas', requireRol('admin'), async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM categorias_compra ORDER BY nombre`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/categorias/usuario/:usuarioId ───────────────────────────────
router.get('/usuario/:usuarioId', requireRol('admin'), async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT categoria_id FROM categorias_usuario WHERE usuario_id = $1`,
      [req.params.usuarioId]
    );
    res.json(rows.map(r => r.categoria_id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/categorias/usuario/:usuarioId ───────────────────────────────
router.put('/usuario/:usuarioId', requireRol('admin'), async (req, res) => {
  const { categoria_ids } = req.body;
  
  if (!Array.isArray(categoria_ids)) {
    return res.status(400).json({ error: 'categoria_ids debe ser un array' });
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    
    await client.query(
      'DELETE FROM categorias_usuario WHERE usuario_id = $1',
      [req.params.usuarioId]
    );

    for (const catId of categoria_ids) {
      await client.query(
        'INSERT INTO categorias_usuario (usuario_id, categoria_id) VALUES ($1, $2)',
        [req.params.usuarioId, catId]
      );
    }

    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
