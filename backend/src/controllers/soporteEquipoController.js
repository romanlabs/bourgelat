const { ErrorSoporte } = require('../services/soporteService');
const { procesarCorreoEntrante } = require('../services/soporteCorreoService');
const logger = require('../utils/logger');

// Adaptador HTTP de las puertas del EQUIPO de Bourgelat. Hoy solo la del
// correo: el Email Worker de Cloudflare reenvia aqui la respuesta del equipo
// (ver docs/soporte.md). El Worker convierte cualquier 422 en un rebote con el
// mensaje, asi quien respondio se entera en su propio Gmail.

const STATUS_POR_CODIGO = {
  NO_AUTORIZADO: 401,
  NO_PERMITIDO: 403,
};

const recibirCorreo = async (req, res) => {
  try {
    const resultado = await procesarCorreoEntrante({
      firma: req.get('x-bourgelat-firma'),
      marcaTiempo: req.get('x-bourgelat-marca-tiempo'),
      destinatario: req.get('x-bourgelat-destinatario') || '',
      crudo: req.body,
    });

    return res.json({ message: 'Respuesta aplicada', ...resultado });
  } catch (error) {
    if (error instanceof ErrorSoporte) {
      const status = STATUS_POR_CODIGO[error.codigo] || 422;
      if (status !== 422) {
        logger.warn({ contexto: 'soporte', mensaje: `Correo entrante rechazado: ${error.message}` });
      }
      return res.status(status).json({ message: error.message, code: error.codigo });
    }

    logger.error({ contexto: 'soporte', mensaje: `Error procesando correo entrante: ${error.message}` });
    return res.status(500).json({ message: 'No se pudo procesar el correo' });
  }
};

module.exports = { recibirCorreo };
