const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Clinica = require('../models/Clinica');

const registro = async (req, res) => {
  try {
    const { nombre, email, password, telefono, direccion } = req.body;

    const clinicaExiste = await Clinica.findOne({ where: { email } });
    if (clinicaExiste) {
      return res.status(400).json({ message: 'El email ya está registrado' });
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const clinica = await Clinica.create({
      nombre,
      email,
      password: passwordHash,
      telefono,
      direccion,
    });

    const token = jwt.sign(
      { id: clinica.id, email: clinica.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Clinica registrada exitosamente',
      token,
      clinica: {
        id: clinica.id,
        nombre: clinica.nombre,
        email: clinica.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const clinica = await Clinica.findOne({ where: { email } });
    if (!clinica) {
      return res.status(401).json({ message: 'Credenciales incorrectas' });
    }

    if (!clinica.activo) {
      return res.status(401).json({ message: 'Cuenta desactivada' });
    }

    const passwordValido = await bcrypt.compare(password, clinica.password);
    if (!passwordValido) {
      return res.status(401).json({ message: 'Credenciales incorrectas' });
    }

    const token = jwt.sign(
      { id: clinica.id, email: clinica.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login exitoso',
      token,
      clinica: {
        id: clinica.id,
        nombre: clinica.nombre,
        email: clinica.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

module.exports = { registro, login };