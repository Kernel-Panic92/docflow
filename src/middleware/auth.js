const jwt = require('jsonwebtoken');
const db  = require('../db');

/**
 * Verifica el JWT en el header Authorization: Bearer <token>
 * Adjunta req.usuario con { id, nombre, email, rol, area_id, _token }
 */
async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const sesion = await db.query('SELECT 1 FROM sesiones WHERE token = $1 AND expira > NOW()', [token]);
    if (sesion.rows.length === 0) {
      return res.status(401).json({ error: 'Sesión inválida o expirada' });
    }
    req.usuario = { ...payload, _token: token };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Sesión expirada' });
    }
    return res.status(401).json({ error: 'Token inválido' });
  }
}

/**
 * Genera middleware de verificación de rol.
 * Uso: requireRol('admin', 'contador')
 */
function requireRol(...roles) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    if (!roles.includes(req.usuario.rol)) {
      return res.status(403).json({
        error: `Acceso denegado. Roles requeridos: ${roles.join(', ')}`
      });
    }
    next();
  };
}

module.exports = { authMiddleware, requireRol };
