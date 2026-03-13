const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Acceso denegado, token requerido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.clinica = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token invalido o expirado' });
  }
};

module.exports = { verificarToken };