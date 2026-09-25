const AceptacionLegal = require('../models/AceptacionLegal')
const { VERSIONES_LEGALES } = require('../config/legal')

// Filas de consentimiento que deja una cuenta nueva. Función pura para poder
// probarla sin base de datos.
//
// La casilla obligatoria del registro cubre dos cosas distintas: aceptar los
// términos (contrato) y autorizar el tratamiento de datos (Ley 1581, que exige
// autorización previa y expresa, no solo informar). Por eso se registran como
// dos filas. Las comunicaciones comerciales se registran siempre, también
// cuando se rechazan, para saber qué eligió el usuario y cuándo.
const construirAceptacionesRegistro = ({
  usuarioId,
  clinicaId,
  aceptaComunicaciones,
  origen,
  ip,
  userAgent,
}) => {
  const base = {
    usuarioId,
    clinicaId,
    origen,
    ip: ip || null,
    userAgent: userAgent ? String(userAgent).slice(0, 500) : null,
  }

  return [
    { ...base, documento: 'terminos', version: VERSIONES_LEGALES.terminos, aceptado: true },
    { ...base, documento: 'privacidad', version: VERSIONES_LEGALES.privacidad, aceptado: true },
    {
      ...base,
      // El consentimiento comercial se da sobre las finalidades de la política
      // de privacidad vigente.
      documento: 'comunicaciones_comerciales',
      version: VERSIONES_LEGALES.privacidad,
      aceptado: aceptaComunicaciones === true,
    },
  ]
}

const registrarAceptacionesRegistro = ({ req, transaction, ...datos }) =>
  AceptacionLegal.bulkCreate(
    construirAceptacionesRegistro({
      ...datos,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    }),
    { transaction }
  )

module.exports = { construirAceptacionesRegistro, registrarAceptacionesRegistro }
