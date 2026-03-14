const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const Clinica = require('../models/Clinica');
const Usuario = require('../models/Usuario');

const registro = async (req, res) => {
  try {
    const { nombre, email, password, telefono, direccion } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({ message: 'Nombre, email y password son obligatorios' });
    }

    const clinicaExiste = await Clinica.findOne({ where: { email } });
    if (clinicaExiste) {
      return res.status(400).json({ message: 'El email ya esta registrado' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'La password debe tener minimo 8 caracteres' });
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
      { id: clinica.id, email: clinica.email, rol: 'admin' },
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

    if (!email || !password) {
      return res.status(400).json({ message: 'Email y password son obligatorios' });
    }

    const clinica = await Clinica.findOne({ where: { email } });
    if (!clinica) {
      return res.status(401).json({ message: 'Credenciales incorrectas' });
    }

    if (!clinica.activo) {
      return res.status(401).json({ message: 'Cuenta desactivada, contacta a soporte' });
    }

    // Verificar bloqueo por intentos fallidos
    if (clinica.bloqueadoHasta && clinica.bloqueadoHasta > new Date()) {
      const minutos = Math.ceil((clinica.bloqueadoHasta - new Date()) / 60000);
      return res.status(401).json({ 
        message: `Cuenta bloqueada. Intenta de nuevo en ${minutos} minutos` 
      });
    }

    const passwordValido = await bcrypt.compare(password, clinica.password);

    if (!passwordValido) {
      const intentos = (clinica.intentosFallidos || 0) + 1;
      const actualizacion = { intentosFallidos: intentos };

      if (intentos >= 5) {
        actualizacion.bloqueadoHasta = new Date(Date.now() + 30 * 60 * 1000);
        actualizacion.intentosFallidos = 0;
        await clinica.update(actualizacion);
        return res.status(401).json({ 
          message: 'Demasiados intentos fallidos. Cuenta bloqueada por 30 minutos' 
        });
      }

      await clinica.update(actualizacion);
      return res.status(401).json({ 
        message: `Credenciales incorrectas. Intentos restantes: ${5 - intentos}` 
      });
    }

    // Login exitoso - resetear intentos
    await clinica.update({ 
      intentosFallidos: 0, 
      bloqueadoHasta: null,
      ultimoAcceso: new Date()
    });

    const token = jwt.sign(
      { id: clinica.id, email: clinica.email, rol: 'admin' },
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