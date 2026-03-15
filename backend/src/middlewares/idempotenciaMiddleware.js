const idempotencias = new Map();

const idempotencia = (req, res, next) => {
  const claveIdempotencia = req.headers['idempotency-key'];

  // Si no viene clave de idempotencia, continua normal
  if (!claveIdempotencia) return next();

  // Si ya existe esa clave, devolver la respuesta anterior
  if (idempotencias.has(claveIdempotencia)) {
    const respuestaAnterior = idempotencias.get(claveIdempotencia);
    return res.status(respuestaAnterior.status).json(respuestaAnterior.data);
  }

  // Interceptar la respuesta para guardarla
  const jsonOriginal = res.json.bind(res);
  res.json = (data) => {
    idempotencias.set(claveIdempotencia, {
      status: res.statusCode,
      data,
    });

    // Limpiar despues de 24 horas
    setTimeout(() => {
      idempotencias.delete(claveIdempotencia);
    }, 24 * 60 * 60 * 1000);

    return jsonOriginal(data);
  };

  next();
};

module.exports = { idempotencia };