const CuentaRecaudo = require('../models/CuentaRecaudo');
const { tenantWhere } = require('../utils/tenant');

// Las borradas no se listan: solo quedan para dar nombre a cobros viejos.
const listarCuentasRecaudo = async (req, res) => {
  try {
    const { activo } = req.query;
    const where = tenantWhere(req, { borradaEn: null });

    if (activo !== undefined) {
      where.activo = activo === 'true';
    }

    const cuentas = await CuentaRecaudo.findAll({
      where,
      attributes: ['id', 'nombre', 'activo'],
      order: [['nombre', 'ASC']],
    });

    res.json({ cuentas });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

// Volver a crear una cuenta borrada la recupera, con sus cobros de antes.
const crearCuentaRecaudo = async (req, res) => {
  try {
    const nombre = req.body.nombre.trim();
    const { clinicaId } = req.usuario;

    const existente = await CuentaRecaudo.findOne({ where: tenantWhere(req, { nombre }) });
    if (existente && !existente.borradaEn) {
      return res.status(400).json({ message: 'Ya existe una cuenta con ese nombre' });
    }
    if (existente) {
      await existente.update({ borradaEn: null, activo: true });
      return res.status(201).json({ message: 'Cuenta agregada', cuenta: existente });
    }

    const cuenta = await CuentaRecaudo.create({ nombre, clinicaId });

    res.status(201).json({ message: 'Cuenta agregada', cuenta });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Ya existe una cuenta con ese nombre' });
    }
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const actualizarCuentaRecaudo = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, activo } = req.body;

    const cuenta = await CuentaRecaudo.findOne({ where: tenantWhere(req, { id, borradaEn: null }) });
    if (!cuenta) {
      return res.status(404).json({ message: 'Cuenta no encontrada' });
    }

    await cuenta.update({
      nombre: nombre !== undefined ? nombre.trim() : cuenta.nombre,
      activo: activo !== undefined ? activo : cuenta.activo,
    });

    res.json({ message: 'Cuenta actualizada', cuenta });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Ya existe una cuenta con ese nombre' });
    }
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

// Borrar la quita de Configuración y del cobro. La fila se conserva (marcada)
// porque las ventas guardan su id cifrado y deben seguir mostrando el nombre.
const borrarCuentaRecaudo = async (req, res) => {
  try {
    const cuenta = await CuentaRecaudo.findOne({ where: tenantWhere(req, { id: req.params.id, borradaEn: null }) });
    if (!cuenta) {
      return res.status(404).json({ message: 'Cuenta no encontrada' });
    }

    await cuenta.update({ borradaEn: new Date(), activo: false });

    res.json({ message: 'Cuenta borrada' });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

module.exports = {
  listarCuentasRecaudo,
  crearCuentaRecaudo,
  actualizarCuentaRecaudo,
  borrarCuentaRecaudo,
};
