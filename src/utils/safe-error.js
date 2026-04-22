/**
 * Utilidades de seguridad para respuestas de error
 */

// Mensaje de error genérico para producción
const ERROR_INTERNO = 'Error interno del servidor';

/**
 * Retorna mensaje de error seguro para el cliente
 * En producción: solo retorna mensaje genérico, logsuea el detalle
 * En desarrollo: retorna el mensaje real
 */
function safeError(err) {
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) {
    console.error('[Error]', err.message);
    return ERROR_INTERNO;
  }
  return err.message;
}

/**
 * Wrapper para catch de rutas asíncronas
 * Uso: router.get('/', asyncHandler(async (req, res) => { ... }))
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { safeError, ERROR_INTERNO, asyncHandler };