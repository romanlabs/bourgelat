const normalizarTabla = (table) => {
  if (typeof table === 'string') return table
  if (table?.tableName) return table.tableName
  if (table?.name) return table.name
  return String(table)
}

const tableExists = async (queryInterface, targetTable, transaction) => {
  const tables = await queryInterface.showAllTables({ transaction })
  return tables.map(normalizarTabla).includes(targetTable)
}

const createTableIfMissing = async (queryInterface, tableName, definition, options = {}) => {
  const { transaction, ...tableOptions } = options

  if (await tableExists(queryInterface, tableName, transaction)) {
    return false
  }

  await queryInterface.createTable(tableName, definition, { transaction, ...tableOptions })
  return true
}

const addIndexes = async (queryInterface, tableName, indexes, transaction) => {
  for (const index of indexes) {
    await queryInterface.addIndex(tableName, index.fields, {
      ...index.options,
      transaction,
    })
  }
}

module.exports = {
  name: '20260324_000001_create_core_schema',

  up: async ({ queryInterface, Sequelize, transaction }) => {
    if (await createTableIfMissing(queryInterface, 'clinicas', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      nombre: { type: Sequelize.STRING, allowNull: false },
      email: { type: Sequelize.STRING, allowNull: false, unique: true },
      password: { type: Sequelize.STRING, allowNull: false },
      telefono: { type: Sequelize.STRING, allowNull: true },
      direccion: { type: Sequelize.STRING, allowNull: true },
      ciudad: { type: Sequelize.STRING, allowNull: true },
      departamento: { type: Sequelize.STRING, allowNull: true },
      nit: { type: Sequelize.STRING, allowNull: true, unique: true },
      razonSocial: { type: Sequelize.STRING, allowNull: true },
      nombreComercial: { type: Sequelize.STRING, allowNull: true },
      tipoPersona: {
        type: Sequelize.ENUM('persona_natural', 'persona_juridica'),
        allowNull: false,
        defaultValue: 'persona_juridica',
      },
      digitoVerificacion: { type: Sequelize.STRING, allowNull: true },
      codigoPostal: { type: Sequelize.STRING, allowNull: true },
      municipioId: { type: Sequelize.INTEGER, allowNull: true },
      tipoDocumentoFacturacionId: { type: Sequelize.INTEGER, allowNull: true },
      organizacionJuridicaId: { type: Sequelize.STRING, allowNull: true },
      tributoId: { type: Sequelize.STRING, allowNull: true },
      logo: { type: Sequelize.STRING, allowNull: true },
      activo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      intentosFallidos: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      bloqueadoHasta: { type: Sequelize.DATE, allowNull: true },
      ultimoAcceso: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    }, { transaction })) {
      await addIndexes(queryInterface, 'clinicas', [
        { fields: ['email'], options: { unique: true, name: 'clinicas_email_unique' } },
        { fields: ['nit'], options: { unique: true, name: 'clinicas_nit_unique' } },
        { fields: ['activo'], options: { name: 'clinicas_activo_idx' } },
      ], transaction)
    }

    if (await createTableIfMissing(queryInterface, 'usuarios', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      nombre: { type: Sequelize.STRING, allowNull: false },
      email: { type: Sequelize.STRING, allowNull: false, unique: true },
      password: { type: Sequelize.STRING, allowNull: false },
      rol: {
        type: Sequelize.ENUM('superadmin', 'admin', 'veterinario', 'recepcionista', 'auxiliar', 'facturador'),
        allowNull: false,
        defaultValue: 'recepcionista',
      },
      rolesAdicionales: { type: Sequelize.ARRAY(Sequelize.STRING), allowNull: false, defaultValue: [] },
      telefono: { type: Sequelize.STRING, allowNull: true },
      activo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      intentosFallidos: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      bloqueadoHasta: { type: Sequelize.DATE, allowNull: true },
      ultimoAcceso: { type: Sequelize.DATE, allowNull: true },
      clinicaId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'clinicas', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    }, { transaction })) {
      await addIndexes(queryInterface, 'usuarios', [
        { fields: ['email'], options: { unique: true, name: 'usuarios_email_unique' } },
        { fields: ['clinicaId', 'activo'], options: { name: 'usuarios_clinica_activo_idx' } },
        { fields: ['clinicaId', 'rol'], options: { name: 'usuarios_clinica_rol_idx' } },
      ], transaction)
    }

    if (await createTableIfMissing(queryInterface, 'propietarios', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      nombre: { type: Sequelize.STRING, allowNull: false },
      tipoDocumento: { type: Sequelize.ENUM('CC', 'CE', 'NIT', 'PP'), allowNull: false, defaultValue: 'CC' },
      numeroDocumento: { type: Sequelize.STRING, allowNull: false },
      email: { type: Sequelize.STRING, allowNull: true },
      telefono: { type: Sequelize.STRING, allowNull: false },
      direccion: { type: Sequelize.STRING, allowNull: true },
      ciudad: { type: Sequelize.STRING, allowNull: true },
      razonSocial: { type: Sequelize.STRING, allowNull: true },
      nombreComercial: { type: Sequelize.STRING, allowNull: true },
      tipoPersona: {
        type: Sequelize.ENUM('persona_natural', 'persona_juridica'),
        allowNull: false,
        defaultValue: 'persona_natural',
      },
      digitoVerificacion: { type: Sequelize.STRING, allowNull: true },
      codigoPostal: { type: Sequelize.STRING, allowNull: true },
      municipioId: { type: Sequelize.INTEGER, allowNull: true },
      tipoDocumentoFacturacionId: { type: Sequelize.INTEGER, allowNull: true },
      organizacionJuridicaId: { type: Sequelize.STRING, allowNull: true },
      tributoId: { type: Sequelize.STRING, allowNull: true },
      activo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      clinicaId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'clinicas', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    }, { transaction })) {
      await addIndexes(queryInterface, 'propietarios', [
        { fields: ['numeroDocumento', 'clinicaId'], options: { unique: true, name: 'propietarios_documento_clinica_unique' } },
        { fields: ['clinicaId', 'activo'], options: { name: 'propietarios_clinica_activo_idx' } },
        { fields: ['telefono'], options: { name: 'propietarios_telefono_idx' } },
      ], transaction)
    }

    if (await createTableIfMissing(queryInterface, 'mascotas', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      nombre: { type: Sequelize.STRING, allowNull: false },
      especie: { type: Sequelize.ENUM('perro', 'gato', 'ave', 'conejo', 'reptil', 'otro'), allowNull: false },
      especieDetalle: { type: Sequelize.STRING, allowNull: true },
      raza: { type: Sequelize.STRING, allowNull: true },
      sexo: { type: Sequelize.ENUM('macho', 'hembra', 'desconocido'), allowNull: false, defaultValue: 'desconocido' },
      fechaNacimiento: { type: Sequelize.DATEONLY, allowNull: true },
      peso: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      color: { type: Sequelize.STRING, allowNull: true },
      esterilizado: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      microchip: { type: Sequelize.STRING, allowNull: true },
      observaciones: { type: Sequelize.TEXT, allowNull: true },
      fotoPerfil: { type: Sequelize.STRING, allowNull: true },
      activo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      propietarioId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'propietarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      clinicaId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'clinicas', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    }, { transaction })) {
      await addIndexes(queryInterface, 'mascotas', [
        { fields: ['propietarioId'], options: { name: 'mascotas_propietario_idx' } },
        { fields: ['clinicaId', 'activo'], options: { name: 'mascotas_clinica_activo_idx' } },
        { fields: ['microchip'], options: { name: 'mascotas_microchip_idx' } },
        { fields: ['clinicaId', 'especie'], options: { name: 'mascotas_clinica_especie_idx' } },
      ], transaction)
    }

    if (await createTableIfMissing(queryInterface, 'antecedentes_mascota', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      alergias: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      enfermedadesPrevias: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      cirugias: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      vacunas: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      condicionesCronicas: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      medicamentosActuales: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      esterilizado: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      fechaEsterilizacion: { type: Sequelize.DATEONLY, allowNull: true },
      observacionesGenerales: { type: Sequelize.TEXT, allowNull: true },
      mascotaId: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: { model: 'mascotas', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      clinicaId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'clinicas', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    }, { transaction })) {
      await addIndexes(queryInterface, 'antecedentes_mascota', [
        { fields: ['mascotaId'], options: { unique: true, name: 'antecedentes_mascota_mascota_unique' } },
        { fields: ['clinicaId'], options: { name: 'antecedentes_mascota_clinica_idx' } },
      ], transaction)
    }

    if (await createTableIfMissing(queryInterface, 'productos', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      nombre: { type: Sequelize.STRING, allowNull: false },
      codigoBarras: { type: Sequelize.STRING, allowNull: true },
      descripcion: { type: Sequelize.TEXT, allowNull: true },
      categoria: {
        type: Sequelize.ENUM('medicamento', 'vacuna', 'insumo', 'alimento', 'accesorio', 'antiparasitario', 'suplemento', 'otro'),
        allowNull: false,
        defaultValue: 'medicamento',
      },
      subcategoria: { type: Sequelize.STRING, allowNull: true },
      unidadMedida: { type: Sequelize.STRING, allowNull: false },
      precioCompra: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      precioVenta: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      stock: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      stockMinimo: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 5 },
      fechaVencimiento: { type: Sequelize.DATEONLY, allowNull: true },
      lote: { type: Sequelize.STRING, allowNull: true },
      laboratorio: { type: Sequelize.STRING, allowNull: true },
      requiereFormula: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      activo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      clinicaId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'clinicas', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    }, { transaction })) {
      await addIndexes(queryInterface, 'productos', [
        { fields: ['clinicaId', 'categoria'], options: { name: 'productos_clinica_categoria_idx' } },
        { fields: ['clinicaId', 'activo'], options: { name: 'productos_clinica_activo_idx' } },
        { fields: ['codigoBarras'], options: { name: 'productos_codigo_barras_idx' } },
      ], transaction)
    }

    if (await createTableIfMissing(queryInterface, 'citas', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      fecha: { type: Sequelize.DATEONLY, allowNull: false },
      horaInicio: { type: Sequelize.TIME, allowNull: false },
      horaFin: { type: Sequelize.TIME, allowNull: false },
      motivo: { type: Sequelize.STRING, allowNull: false },
      tipoCita: {
        type: Sequelize.ENUM('consulta_general', 'vacunacion', 'cirugia', 'desparasitacion', 'control', 'urgencia', 'peluqueria', 'laboratorio', 'radiografia', 'otro'),
        allowNull: false,
        defaultValue: 'consulta_general',
      },
      estado: {
        type: Sequelize.ENUM('programada', 'confirmada', 'en_curso', 'completada', 'cancelada', 'no_asistio'),
        allowNull: false,
        defaultValue: 'programada',
      },
      motivoCancelacion: { type: Sequelize.STRING, allowNull: true },
      observaciones: { type: Sequelize.TEXT, allowNull: true },
      recordatorioEnviado: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      mascotaId: { type: Sequelize.UUID, allowNull: false, references: { model: 'mascotas', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      propietarioId: { type: Sequelize.UUID, allowNull: false, references: { model: 'propietarios', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      veterinarioId: { type: Sequelize.UUID, allowNull: false, references: { model: 'usuarios', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      clinicaId: { type: Sequelize.UUID, allowNull: false, references: { model: 'clinicas', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    }, { transaction })) {
      await addIndexes(queryInterface, 'citas', [
        { fields: ['fecha', 'veterinarioId', 'clinicaId'], options: { name: 'citas_fecha_veterinario_clinica_idx' } },
        { fields: ['clinicaId', 'estado'], options: { name: 'citas_clinica_estado_idx' } },
        { fields: ['clinicaId', 'fecha'], options: { name: 'citas_clinica_fecha_idx' } },
        { fields: ['propietarioId'], options: { name: 'citas_propietario_idx' } },
        { fields: ['mascotaId'], options: { name: 'citas_mascota_idx' } },
      ], transaction)
    }

    if (await createTableIfMissing(queryInterface, 'historias_clinicas', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      fechaConsulta: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      motivoConsulta: { type: Sequelize.TEXT, allowNull: false },
      anamnesis: { type: Sequelize.TEXT, allowNull: true },
      peso: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      temperatura: { type: Sequelize.DECIMAL(4, 1), allowNull: true },
      frecuenciaCardiaca: { type: Sequelize.INTEGER, allowNull: true },
      frecuenciaRespiratoria: { type: Sequelize.INTEGER, allowNull: true },
      condicionCorporal: { type: Sequelize.INTEGER, allowNull: true },
      mucosas: { type: Sequelize.STRING, allowNull: true },
      estadoHidratacion: {
        type: Sequelize.ENUM('normal', 'deshidratacion_leve', 'deshidratacion_moderada', 'deshidratacion_severa'),
        allowNull: true,
      },
      examenFisicoDetalle: { type: Sequelize.TEXT, allowNull: true },
      diagnostico: { type: Sequelize.TEXT, allowNull: false },
      diagnosticoPresuntivo: { type: Sequelize.TEXT, allowNull: true },
      tratamiento: { type: Sequelize.TEXT, allowNull: false },
      medicamentos: { type: Sequelize.JSONB, allowNull: true, defaultValue: [] },
      indicaciones: { type: Sequelize.TEXT, allowNull: true },
      proximaConsulta: { type: Sequelize.DATEONLY, allowNull: true },
      bloqueada: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      citaId: { type: Sequelize.UUID, allowNull: true, references: { model: 'citas', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      mascotaId: { type: Sequelize.UUID, allowNull: false, references: { model: 'mascotas', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      propietarioId: { type: Sequelize.UUID, allowNull: false, references: { model: 'propietarios', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      veterinarioId: { type: Sequelize.UUID, allowNull: false, references: { model: 'usuarios', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      clinicaId: { type: Sequelize.UUID, allowNull: false, references: { model: 'clinicas', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    }, { transaction })) {
      await addIndexes(queryInterface, 'historias_clinicas', [
        { fields: ['mascotaId', 'clinicaId'], options: { name: 'historias_mascota_clinica_idx' } },
        { fields: ['clinicaId', 'fechaConsulta'], options: { name: 'historias_clinica_fecha_idx' } },
        { fields: ['veterinarioId'], options: { name: 'historias_veterinario_idx' } },
        { fields: ['citaId'], options: { name: 'historias_cita_idx' } },
      ], transaction)
    }

    if (await createTableIfMissing(queryInterface, 'movimientos_inventario', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tipo: { type: Sequelize.ENUM('entrada', 'salida', 'ajuste'), allowNull: false },
      cantidad: { type: Sequelize.INTEGER, allowNull: false },
      stockAnterior: { type: Sequelize.INTEGER, allowNull: false },
      stockNuevo: { type: Sequelize.INTEGER, allowNull: false },
      motivo: { type: Sequelize.ENUM('compra', 'venta', 'uso_clinico', 'vencimiento', 'devolucion', 'ajuste_inventario', 'otro'), allowNull: false },
      observaciones: { type: Sequelize.STRING, allowNull: true },
      precioUnitario: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      productoId: { type: Sequelize.UUID, allowNull: false, references: { model: 'productos', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      usuarioId: { type: Sequelize.UUID, allowNull: false, references: { model: 'usuarios', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      clinicaId: { type: Sequelize.UUID, allowNull: false, references: { model: 'clinicas', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    }, { transaction })) {
      await addIndexes(queryInterface, 'movimientos_inventario', [
        { fields: ['productoId'], options: { name: 'movimientos_producto_idx' } },
        { fields: ['clinicaId', 'createdAt'], options: { name: 'movimientos_clinica_created_idx' } },
        { fields: ['motivo'], options: { name: 'movimientos_motivo_idx' } },
      ], transaction)
    }

    if (await createTableIfMissing(queryInterface, 'suscripciones', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      plan: { type: Sequelize.ENUM('inicio', 'clinica', 'profesional', 'personalizado'), allowNull: false, defaultValue: 'inicio' },
      estado: { type: Sequelize.ENUM('activa', 'vencida', 'cancelada', 'prueba'), allowNull: false, defaultValue: 'activa' },
      fechaInicio: { type: Sequelize.DATEONLY, allowNull: false },
      fechaFin: { type: Sequelize.DATEONLY, allowNull: false },
      precio: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      metodoPago: { type: Sequelize.STRING, allowNull: true },
      referenciaPago: { type: Sequelize.STRING, allowNull: true },
      limiteUsuarios: { type: Sequelize.INTEGER, allowNull: true },
      limiteMascotas: { type: Sequelize.INTEGER, allowNull: true },
      almacenamientoMB: { type: Sequelize.INTEGER, allowNull: true },
      funcionalidades: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      clinicaId: { type: Sequelize.UUID, allowNull: false, references: { model: 'clinicas', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    }, { transaction })) {
      await addIndexes(queryInterface, 'suscripciones', [
        { fields: ['clinicaId', 'estado'], options: { name: 'suscripciones_clinica_estado_idx' } },
        { fields: ['fechaFin'], options: { name: 'suscripciones_fecha_fin_idx' } },
        { fields: ['plan'], options: { name: 'suscripciones_plan_idx' } },
      ], transaction)
    }

    if (await createTableIfMissing(queryInterface, 'facturas', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      numero: { type: Sequelize.STRING, allowNull: false },
      fecha: { type: Sequelize.DATEONLY, allowNull: false, defaultValue: Sequelize.NOW },
      estado: { type: Sequelize.ENUM('borrador', 'emitida', 'pagada', 'anulada'), allowNull: false, defaultValue: 'borrador' },
      subtotal: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      descuento: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      impuesto: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      total: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      metodoPago: { type: Sequelize.ENUM('efectivo', 'tarjeta_debito', 'tarjeta_credito', 'transferencia', 'nequi', 'daviplata', 'otro'), allowNull: true },
      observaciones: { type: Sequelize.TEXT, allowNull: true },
      motivoAnulacion: { type: Sequelize.STRING, allowNull: true },
      proveedorElectronico: { type: Sequelize.ENUM('factus'), allowNull: true },
      estadoElectronico: { type: Sequelize.ENUM('no_aplica', 'pendiente', 'enviada', 'validada', 'rechazada', 'error'), allowNull: false, defaultValue: 'no_aplica' },
      documentoElectronico: { type: Sequelize.STRING, allowNull: true },
      rangoNumeracionId: { type: Sequelize.INTEGER, allowNull: true },
      referenciaExterna: { type: Sequelize.STRING, allowNull: true },
      cufe: { type: Sequelize.STRING, allowNull: true },
      fechaEnvioElectronico: { type: Sequelize.DATE, allowNull: true },
      fechaValidacionElectronica: { type: Sequelize.DATE, allowNull: true },
      urlPdfElectronico: { type: Sequelize.STRING, allowNull: true },
      urlXmlElectronico: { type: Sequelize.STRING, allowNull: true },
      mensajeElectronico: { type: Sequelize.TEXT, allowNull: true },
      payloadElectronico: { type: Sequelize.JSONB, allowNull: true },
      respuestaElectronica: { type: Sequelize.JSONB, allowNull: true },
      propietarioId: { type: Sequelize.UUID, allowNull: false, references: { model: 'propietarios', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      usuarioId: { type: Sequelize.UUID, allowNull: false, references: { model: 'usuarios', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      clinicaId: { type: Sequelize.UUID, allowNull: false, references: { model: 'clinicas', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    }, { transaction })) {
      await addIndexes(queryInterface, 'facturas', [
        { fields: ['clinicaId', 'estado'], options: { name: 'facturas_clinica_estado_idx' } },
        { fields: ['clinicaId', 'fecha'], options: { name: 'facturas_clinica_fecha_idx' } },
        { fields: ['propietarioId'], options: { name: 'facturas_propietario_idx' } },
        { fields: ['numero', 'clinicaId'], options: { unique: true, name: 'facturas_numero_clinica_unique' } },
      ], transaction)
    }

    if (await createTableIfMissing(queryInterface, 'factura_items', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      descripcion: { type: Sequelize.STRING, allowNull: false },
      tipo: { type: Sequelize.ENUM('producto', 'servicio'), allowNull: false, defaultValue: 'servicio' },
      cantidad: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 1 },
      precioUnitario: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      descuento: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      subtotal: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      productoId: { type: Sequelize.UUID, allowNull: true, references: { model: 'productos', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      facturaId: { type: Sequelize.UUID, allowNull: false, references: { model: 'facturas', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    }, { transaction })) {
      await addIndexes(queryInterface, 'factura_items', [
        { fields: ['facturaId'], options: { name: 'factura_items_factura_idx' } },
        { fields: ['productoId'], options: { name: 'factura_items_producto_idx' } },
      ], transaction)
    }

    if (await createTableIfMissing(queryInterface, 'refresh_tokens', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      token: { type: Sequelize.STRING(500), allowNull: false, unique: true },
      expiracion: { type: Sequelize.DATE, allowNull: false },
      revocado: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      ip: { type: Sequelize.STRING, allowNull: true },
      userAgent: { type: Sequelize.STRING, allowNull: true },
      clinicaId: { type: Sequelize.UUID, allowNull: true, references: { model: 'clinicas', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      usuarioId: { type: Sequelize.UUID, allowNull: true, references: { model: 'usuarios', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    }, { transaction })) {
      await addIndexes(queryInterface, 'refresh_tokens', [
        { fields: ['token'], options: { name: 'refresh_tokens_token_idx' } },
        { fields: ['clinicaId'], options: { name: 'refresh_tokens_clinica_idx' } },
        { fields: ['expiracion'], options: { name: 'refresh_tokens_expiracion_idx' } },
        { fields: ['revocado'], options: { name: 'refresh_tokens_revocado_idx' } },
      ], transaction)
    }

    if (await createTableIfMissing(queryInterface, 'auditoria_logs', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      accion: { type: Sequelize.STRING, allowNull: false },
      entidad: { type: Sequelize.STRING, allowNull: true },
      entidadId: { type: Sequelize.UUID, allowNull: true },
      descripcion: { type: Sequelize.TEXT, allowNull: true },
      datosAnteriores: { type: Sequelize.JSONB, allowNull: true },
      datosNuevos: { type: Sequelize.JSONB, allowNull: true },
      ip: { type: Sequelize.STRING, allowNull: true },
      userAgent: { type: Sequelize.STRING, allowNull: true },
      clinicaId: { type: Sequelize.UUID, allowNull: true },
      usuarioId: { type: Sequelize.UUID, allowNull: true },
      resultado: { type: Sequelize.ENUM('exitoso', 'fallido'), allowNull: false, defaultValue: 'exitoso' },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    }, { transaction })) {
      await addIndexes(queryInterface, 'auditoria_logs', [
        { fields: ['clinicaId', 'createdAt'], options: { name: 'auditoria_logs_clinica_created_idx' } },
        { fields: ['accion'], options: { name: 'auditoria_logs_accion_idx' } },
        { fields: ['entidad', 'entidadId'], options: { name: 'auditoria_logs_entidad_idx' } },
        { fields: ['resultado'], options: { name: 'auditoria_logs_resultado_idx' } },
      ], transaction)
    }

    if (await createTableIfMissing(queryInterface, 'idempotencia_keys', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      clave: { type: Sequelize.STRING, allowNull: false, unique: true },
      status: { type: Sequelize.INTEGER, allowNull: false },
      respuesta: { type: Sequelize.JSONB, allowNull: false },
      expiracion: { type: Sequelize.DATE, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    }, { transaction })) {
      await addIndexes(queryInterface, 'idempotencia_keys', [
        { fields: ['clave'], options: { name: 'idempotencia_keys_clave_idx' } },
        { fields: ['expiracion'], options: { name: 'idempotencia_keys_expiracion_idx' } },
      ], transaction)
    }
  },

  down: async () => {
    // La migracion inicial no define rollback destructivo para evitar perdida accidental de datos.
  },
}
