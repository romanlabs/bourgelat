const soporteService = require('../services/soporteService');
const { construirActorUsuario } = require('../services/soporteReglas');
const { buildPublicUploadUrl } = require('../config/uploads');
const {
  guardarCapturaSoporte,
  eliminarCapturaSoporte,
} = require('../middlewares/uploadSoporteCapturaMiddleware');

// Adaptador HTTP de la clinica: arma el actor desde la sesion y delega en
// soporteService. No toca modelos; el script del equipo y el futuro panel web
// llaman a las mismas funciones con su propio actor.

const { ErrorSoporte } = soporteService;

const STATUS_POR_CODIGO = {
  // 404 y no 403: no revelar si existe un ticket que el usuario no puede ver.
  NO_ENCONTRADO: 404,
  NO_PERMITIDO: 403,
  DATOS_INVALIDOS: 400,
  TICKET_CERRADO: 409,
  TRANSICION_INVALIDA: 409,
};

const actorDesdeReq = (req) =>
  construirActorUsuario(req.usuario, {
    ip: req.ip,
    userAgent: req.headers['user-agent'] || null,
  });

const responderError = (res, error) => {
  if (error instanceof ErrorSoporte) {
    return res
      .status(STATUS_POR_CODIGO[error.codigo] || 400)
      .json({ message: error.message, code: error.codigo });
  }

  return res.status(500).json({ message: 'Error en el servidor', error: error.message });
};

const listarTickets = async (req, res) => {
  try {
    const resultado = await soporteService.listarTickets(actorDesdeReq(req), {
      estado: req.query.estado,
      pagina: req.query.pagina,
      limite: req.query.limite,
    });

    res.json(resultado);
  } catch (error) {
    responderError(res, error);
  }
};

const obtenerTicket = async (req, res) => {
  try {
    const ticket = await soporteService.obtenerTicket(actorDesdeReq(req), req.params.id);
    res.json({ ticket });
  } catch (error) {
    responderError(res, error);
  }
};

const crearTicket = async (req, res) => {
  let captura = null;

  if (req.file) {
    try {
      captura = await guardarCapturaSoporte(req.file);
    } catch {
      return res.status(400).json({
        message: 'No fue posible procesar la captura. Prueba con otra imagen.',
      });
    }
  }

  try {
    const ticket = await soporteService.crearTicket(
      actorDesdeReq(req),
      {
        asunto: req.body.asunto,
        descripcion: req.body.descripcion,
        categoria: req.body.categoria,
        prioridad: req.body.prioridad,
        modulo: req.body.modulo || null,
        contexto: req.body.contexto,
      },
      { capturaUrl: captura ? buildPublicUploadUrl(req, captura.rutaRelativa) : null }
    );

    res.status(201).json({
      message: `Recibimos tu ticket ${ticket.codigo}. Te avisaremos por correo cuando te respondamos.`,
      ticket,
    });
  } catch (error) {
    if (captura) {
      eliminarCapturaSoporte(captura.rutaAbsoluta);
    }
    responderError(res, error);
  }
};

const agregarMensaje = async (req, res) => {
  try {
    const ticket = await soporteService.agregarMensaje(
      actorDesdeReq(req),
      req.params.id,
      req.body.mensaje
    );

    res.status(201).json({ message: 'Mensaje enviado', ticket });
  } catch (error) {
    responderError(res, error);
  }
};

const cerrarTicket = async (req, res) => {
  try {
    const ticket = await soporteService.cambiarEstado(actorDesdeReq(req), req.params.id, 'cerrado');
    res.json({ message: `Cerraste el ticket ${ticket.codigo}`, ticket });
  } catch (error) {
    responderError(res, error);
  }
};

module.exports = {
  listarTickets,
  obtenerTicket,
  crearTicket,
  agregarMensaje,
  cerrarTicket,
};
