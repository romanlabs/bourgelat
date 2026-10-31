const CuentaRecaudo = require('../models/CuentaRecaudo');
const { tenantWhere } = require('../utils/tenant');

const listarCuentasRecaudo = async (req, res) => {
  try {
    const { activo } = req.query;
    const where = tenantWhere(req);

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

const crearCuentaRecaudo = async (req, res) => {
  try {
    const { nombre } = req.body;
    const { clinicaId } = req.usuario;

    const cuenta = await CuentaRecaudo.create({ nombre: nombre.trim(), clinicaId });

    res.status(201).json({ message: 'Cuenta agregada', cuenta });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Ya existe una cuenta con ese nombre' });
    }
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

// No se borran: las ventas guardan a qué cuenta entraron. Se desactivan.
const actualizarCuentaRecaudo = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, activo } = req.body;

    const cuenta = await CuentaRecaudo.findOne({ where: tenantWhere(req, { id }) });
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

module.exports = {
  listarCuentasRecaudo,
  crearCuentaRecaudo,
  actualizarCuentaRecaudo,
};
