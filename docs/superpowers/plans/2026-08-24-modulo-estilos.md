# Módulo de Estilos (Peluquería) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separar el registro de peluquería de la Historia Clínica, con su propio modelo, timeline en la ficha del paciente y vínculo con Caja y Agenda.

**Architecture:** Nuevo modelo `RegistroEstilo` hermano de `HistoriaClinica` (tabla propia `registros_estilo`), con controlador y rutas siguiendo los patrones existentes del repo. En frontend, `PacienteHistorialPage` gana pestañas y se extrae el timeline clínico a su propia feature. Caja gana un `registroEstiloId` opcional análogo al `historiaClinicaId` que ya maneja.

**Tech Stack:** Node.js + Express 5, Sequelize 6 (migraciones propias), PostgreSQL 16, React 19, TanStack React Query, React Hook Form + Zod, Tailwind.

**Spec:** `docs/superpowers/specs/2026-08-24-modulo-estilos-design.md`

## Global Constraints

- **Multi-tenancy obligatoria:** toda query sobre modelos con `clinicaId` filtra por tenant. El `tenantGuard` rechaza en dev cualquier query sin ese filtro. Este módulo no tiene queries globales legítimas — nunca usar `sinTenant: true`.
- **Auditoría:** toda mutación registra con `registrarAuditoria({ accion, entidad, entidadId, descripcion, req, resultado })`.
- **Validación:** `express-validator` en las rutas, nunca en los controladores.
- **Tests backend:** son scripts `node` con `assert`, sin base de datos ni framework. Cada archivo nuevo `*.test.js` DEBE agregarse al script `test` de `backend/package.json` o no se ejecuta.
- **Tests frontend:** Vitest (`npm test` en `frontend/`).
- **Cliente HTTP frontend:** siempre `@/lib/api`, nunca `fetch` directo.
- **Permisos de este módulo:** `verificarRol('admin', 'superadmin', 'veterinario', 'recepcionista', 'auxiliar')`.
- **Sin atribución a Claude** en commits ni PRs.
- **Prefijos de commit:** `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`.
- **Mensajes de error de cara al usuario:** lenguaje de negocio, no jerga técnica.

---

### Task 1: Modelo y migración de `RegistroEstilo`

**Files:**
- Create: `backend/src/models/RegistroEstilo.js`
- Create: `backend/src/migrations/20260824_000001_create_registros_estilo.js`

**Interfaces:**
- Consumes: modelos existentes `Clinica`, `Mascota`, `Propietario`, `Usuario`, `Cita`; helper `aplicarDescifrado` de `../config/modelEncryption`.
- Produces: modelo `RegistroEstilo` con campos `id`, `fechaServicio`, `tipoCorte`, `observaciones`, `proximaCitaSugerida`, `estilistaId`, `mascotaId`, `propietarioId`, `clinicaId`, `citaId`, `facturaId`, `bloqueado`. Asociaciones con alias `mascota`, `propietario`, `estilista`, `cita`.

- [ ] **Step 1: Escribir el modelo**

Crear `backend/src/models/RegistroEstilo.js`:

```js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Clinica = require('./Clinica');
const Mascota = require('./Mascota');
const Propietario = require('./Propietario');
const Usuario = require('./Usuario');
const Cita = require('./Cita');
const { aplicarDescifrado } = require('../config/modelEncryption');

const RegistroEstilo = sequelize.define('RegistroEstilo', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  fechaServicio: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  tipoCorte: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Texto libre: el corte o servicio de estilos realizado',
  },
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Estado del pelaje, piel o comportamiento durante el servicio',
  },
  proximaCitaSugerida: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Solo sugerencia; no crea cita en agenda',
  },
  // Al facturarse queda bloqueado. A diferencia de HistoriaClinica, aqui
  // facturar es lo que bloquea: una peluqueada no tiene el requisito legal
  // de inmutabilidad que justifica cerrar y cobrar en dos pasos.
  bloqueado: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  // Sin `references` para no acoplar este modelo a Factura (mismo criterio
  // que HistoriaClinica.facturaId); la FK real la crea la migracion.
  facturaId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  citaId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: Cita, key: 'id' },
  },
  estilistaId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: Usuario, key: 'id' },
  },
  mascotaId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: Mascota, key: 'id' },
  },
  propietarioId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: Propietario, key: 'id' },
  },
  clinicaId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: Clinica, key: 'id' },
  },
}, {
  tableName: 'registros_estilo',
  timestamps: true,
  indexes: [
    { fields: ['mascotaId', 'clinicaId'] },
    { fields: ['clinicaId', 'fechaServicio'] },
    { fields: ['estilistaId'] },
    { fields: ['citaId'] },
    { fields: ['facturaId'] },
  ],
});

Mascota.hasMany(RegistroEstilo, { foreignKey: 'mascotaId', as: 'registrosEstilo' });
RegistroEstilo.belongsTo(Mascota, { foreignKey: 'mascotaId', as: 'mascota' });
Propietario.hasMany(RegistroEstilo, { foreignKey: 'propietarioId', as: 'registrosEstilo' });
RegistroEstilo.belongsTo(Propietario, { foreignKey: 'propietarioId', as: 'propietario' });
Usuario.hasMany(RegistroEstilo, { foreignKey: 'estilistaId', as: 'serviciosEstilo' });
RegistroEstilo.belongsTo(Usuario, { foreignKey: 'estilistaId', as: 'estilista' });
Cita.hasOne(RegistroEstilo, { foreignKey: 'citaId', as: 'registroEstilo' });
RegistroEstilo.belongsTo(Cita, { foreignKey: 'citaId', as: 'cita' });
Clinica.hasMany(RegistroEstilo, { foreignKey: 'clinicaId' });
RegistroEstilo.belongsTo(Clinica, { foreignKey: 'clinicaId' });

RegistroEstilo.addHook('afterFind', (resultado) => {
  if (!resultado) return
  const descifrar = (inst) => {
    const prop = inst?.dataValues?.propietario
    if (prop) aplicarDescifrado({ instance: prop, ...Propietario.CIFRADO })
  }
  Array.isArray(resultado) ? resultado.forEach(descifrar) : descifrar(resultado)
})

module.exports = RegistroEstilo;
```

- [ ] **Step 2: Escribir la migración**

Crear `backend/src/migrations/20260824_000001_create_registros_estilo.js`:

```js
'use strict'

module.exports = {
  name: '20260824_000001_create_registros_estilo',

  up: async ({ queryInterface, Sequelize }) => {
    const tablas = await queryInterface.showAllTables()
    if (tablas.includes('registros_estilo')) return

    await queryInterface.createTable('registros_estilo', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      fechaServicio: { type: Sequelize.DATE, allowNull: false },
      tipoCorte: { type: Sequelize.STRING, allowNull: false },
      observaciones: { type: Sequelize.TEXT, allowNull: true },
      proximaCitaSugerida: { type: Sequelize.DATEONLY, allowNull: true },
      bloqueado: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      facturaId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'facturas', key: 'id' },
        onDelete: 'SET NULL',
      },
      citaId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'citas', key: 'id' },
        onDelete: 'SET NULL',
      },
      estilistaId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
      },
      mascotaId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'mascotas', key: 'id' },
        onDelete: 'CASCADE',
      },
      propietarioId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'propietarios', key: 'id' },
      },
      clinicaId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'clinicas', key: 'id' },
        onDelete: 'CASCADE',
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    })

    await queryInterface.addIndex('registros_estilo', ['mascotaId', 'clinicaId'])
    await queryInterface.addIndex('registros_estilo', ['clinicaId', 'fechaServicio'])
    await queryInterface.addIndex('registros_estilo', ['estilistaId'])
    await queryInterface.addIndex('registros_estilo', ['citaId'])
    await queryInterface.addIndex('registros_estilo', ['facturaId'])
  },

  down: async ({ queryInterface }) => {
    const tablas = await queryInterface.showAllTables()
    if (tablas.includes('registros_estilo')) {
      await queryInterface.dropTable('registros_estilo')
    }
  },
}
```

**Nota sobre nombres de tabla:** antes de correr la migración, verificar los
nombres reales de las tablas referenciadas con:

```bash
cd backend && node -e "
const m = ['Factura','Cita','Usuario','Mascota','Propietario','Clinica'];
m.forEach(n => console.log(n, '->', require('./src/models/'+n).getTableName()));
"
```

Si algún `tableName` difiere de lo escrito arriba, corregir la migración antes de ejecutarla.

- [ ] **Step 3: Correr la migración**

```bash
cd backend && npm run migrate
```

Expected: la migración `20260824_000001_create_registros_estilo` aparece como aplicada, sin errores de FK.

- [ ] **Step 4: Verificar que el modelo carga**

```bash
cd backend && node -e "const R = require('./src/models/RegistroEstilo'); console.log(Object.keys(R.rawAttributes).join(', '))"
```

Expected: imprime todos los campos, incluyendo `tipoCorte`, `estilistaId`, `proximaCitaSugerida`, `bloqueado`, `facturaId`.

- [ ] **Step 5: Verificar el estado de migraciones**

```bash
cd backend && npm run migrate:status
```

Expected: la migración figura aplicada.

- [ ] **Step 6: Commit**

```bash
git add backend/src/models/RegistroEstilo.js backend/src/migrations/20260824_000001_create_registros_estilo.js
git commit -m "feat: modelo y migracion de RegistroEstilo"
```

---

### Task 2: Normalizadores del controlador + tests

Los tests backend del repo son scripts `node` con `assert`, sin base de datos.
Por eso esta tarea extrae la lógica pura (normalización y validación de
entradas) a funciones exportables y testeables, antes de escribir los handlers
HTTP que sí tocan la BD.

**Files:**
- Create: `backend/src/controllers/registroEstiloNormalizers.js`
- Create: `backend/src/controllers/registroEstiloNormalizers.test.js`
- Modify: `backend/package.json` (agregar el test al script `test`)

**Interfaces:**
- Consumes: `isValidDateOnly` de `../utils/dateOnly`.
- Produces:
  - `cleanText(value, maxLength) -> string | undefined`
  - `normalizarTipoCorte(value) -> string | undefined` (máx 240 chars)
  - `normalizarObservaciones(value) -> string | undefined` (máx 4000 chars)
  - `normalizarProximaCita(value) -> string | null` (devuelve `null` si vacío, lanza `Error` si la fecha es inválida)

- [ ] **Step 1: Escribir el test que falla**

Crear `backend/src/controllers/registroEstiloNormalizers.test.js`:

```js
// Tests de los normalizadores de RegistroEstilo. Se ejecutan con
// `node src/controllers/registroEstiloNormalizers.test.js` (integrado en `npm test`).
// No requieren base de datos: son funciones puras.

const assert = require('assert')
const {
  cleanText,
  normalizarTipoCorte,
  normalizarObservaciones,
  normalizarProximaCita,
} = require('./registroEstiloNormalizers')

// ── cleanText ──────────────────────────────────────────────────────────────
assert.strictEqual(cleanText('  Corte   teddy  bear ', 240), 'Corte teddy bear', 'colapsa espacios y recorta')
assert.strictEqual(cleanText('', 240), undefined, 'cadena vacia -> undefined')
assert.strictEqual(cleanText('   ', 240), undefined, 'solo espacios -> undefined')
assert.strictEqual(cleanText(null, 240), undefined, 'null -> undefined')
assert.strictEqual(cleanText(undefined, 240), undefined, 'undefined -> undefined')
assert.strictEqual(cleanText('a'.repeat(300), 240).length, 240, 'recorta al maximo')

// ── normalizarTipoCorte ────────────────────────────────────────────────────
assert.strictEqual(normalizarTipoCorte('Rapado higienico'), 'Rapado higienico', 'texto normal')
assert.strictEqual(normalizarTipoCorte('  '), undefined, 'vacio -> undefined')
assert.strictEqual(normalizarTipoCorte('x'.repeat(300)).length, 240, 'tipo de corte se recorta a 240')

// ── normalizarObservaciones ────────────────────────────────────────────────
assert.strictEqual(normalizarObservaciones('Pelaje enredado'), 'Pelaje enredado', 'texto normal')
assert.strictEqual(normalizarObservaciones(''), undefined, 'vacio -> undefined')
assert.strictEqual(normalizarObservaciones('y'.repeat(5000)).length, 4000, 'observaciones se recortan a 4000')

// ── normalizarProximaCita ──────────────────────────────────────────────────
assert.strictEqual(normalizarProximaCita('2026-09-15'), '2026-09-15', 'fecha valida pasa igual')
assert.strictEqual(normalizarProximaCita(''), null, 'vacio -> null')
assert.strictEqual(normalizarProximaCita(null), null, 'null -> null')
assert.strictEqual(normalizarProximaCita(undefined), null, 'undefined -> null')
assert.throws(
  () => normalizarProximaCita('15/09/2026'),
  /fecha/i,
  'formato invalido lanza error'
)
assert.throws(
  () => normalizarProximaCita('2026-13-45'),
  /fecha/i,
  'fecha imposible lanza error'
)

console.log('registroEstiloNormalizers tests OK')
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `cd backend && node src/controllers/registroEstiloNormalizers.test.js`
Expected: FALLA con `Cannot find module './registroEstiloNormalizers'`.

- [ ] **Step 3: Escribir la implementación mínima**

Crear `backend/src/controllers/registroEstiloNormalizers.js`:

```js
const { isValidDateOnly } = require('../utils/dateOnly')

const cleanText = (value, maxLength = 500) => {
  if (value === undefined || value === null) return undefined

  const normalized = String(value).replace(/\s+/g, ' ').trim()
  if (!normalized) return undefined

  return normalized.slice(0, maxLength)
}

const normalizarTipoCorte = (value) => cleanText(value, 240)

const normalizarObservaciones = (value) => cleanText(value, 4000)

// Devuelve null (no undefined) cuando viene vacia: el campo es nullable en BD
// y null la limpia explicitamente al editar.
const normalizarProximaCita = (value) => {
  if (value === undefined || value === null || value === '') return null

  if (!isValidDateOnly(value)) {
    throw new Error('La fecha de proxima cita sugerida no es valida')
  }

  return value
}

module.exports = {
  cleanText,
  normalizarTipoCorte,
  normalizarObservaciones,
  normalizarProximaCita,
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `cd backend && node src/controllers/registroEstiloNormalizers.test.js`
Expected: imprime `registroEstiloNormalizers tests OK`, salida exit 0.

- [ ] **Step 5: Registrar el test en `npm test`**

En `backend/package.json`, dentro de `"scripts"`, agregar al final del valor de `"test"` (que hoy termina en `node src/services/almacenamientoService.test.js`):

```
 && node src/controllers/registroEstiloNormalizers.test.js
```

Luego verificar la suite completa:

Run: `cd backend && npm test`
Expected: todos los tests pasan, incluyendo `registroEstiloNormalizers tests OK`.

- [ ] **Step 6: Commit**

```bash
git add backend/src/controllers/registroEstiloNormalizers.js backend/src/controllers/registroEstiloNormalizers.test.js backend/package.json
git commit -m "feat: normalizadores de RegistroEstilo con tests"
```

---

### Task 3: Controlador y rutas de `RegistroEstilo`

**Files:**
- Create: `backend/src/controllers/registroEstiloController.js`
- Create: `backend/src/routes/registroEstiloRoutes.js`
- Modify: `backend/src/index.js` (registrar el router)

**Interfaces:**
- Consumes: modelo `RegistroEstilo` (Task 1); normalizadores de Task 2 (`normalizarTipoCorte`, `normalizarObservaciones`, `normalizarProximaCita`).
- Produces: handlers `crearRegistroEstilo`, `obtenerRegistrosEstiloMascota`, `obtenerRegistroEstilo`, `editarRegistroEstilo`, `obtenerPreliquidacionEstilo`. Endpoints bajo `/api/registros-estilo`.

- [ ] **Step 1: Escribir el controlador**

Crear `backend/src/controllers/registroEstiloController.js`:

```js
const RegistroEstilo = require('../models/RegistroEstilo')
const Mascota = require('../models/Mascota')
const Propietario = require('../models/Propietario')
const Usuario = require('../models/Usuario')
const Cita = require('../models/Cita')
const { registrarAuditoria } = require('../middlewares/auditoriaMiddleware')
const {
  normalizarTipoCorte,
  normalizarObservaciones,
  normalizarProximaCita,
} = require('./registroEstiloNormalizers')

const INCLUDES_DETALLE = [
  { model: Mascota, as: 'mascota', attributes: ['id', 'nombre', 'especie', 'raza'] },
  { model: Propietario, as: 'propietario', attributes: ['id', 'nombre', 'telefono'] },
  { model: Usuario, as: 'estilista', attributes: ['id', 'nombre'] },
]

const crearRegistroEstilo = async (req, res) => {
  try {
    const {
      tipoCorte, observaciones, proximaCitaSugerida, fechaServicio,
      mascotaId, propietarioId, estilistaId, citaId,
    } = req.body

    const { clinicaId } = req.usuario

    const tipoCorteNormalizado = normalizarTipoCorte(tipoCorte)
    const observacionesNormalizadas = normalizarObservaciones(observaciones)

    let proximaCitaNormalizada
    try {
      proximaCitaNormalizada = normalizarProximaCita(proximaCitaSugerida)
    } catch (error) {
      return res.status(400).json({ message: error.message })
    }

    if (!tipoCorteNormalizado) {
      return res.status(400).json({ message: 'El tipo de corte es obligatorio' })
    }

    const mascota = await Mascota.findOne({ where: { id: mascotaId, clinicaId } })
    if (!mascota) {
      return res.status(404).json({ message: 'Mascota no encontrada' })
    }

    const propietario = await Propietario.findOne({ where: { id: propietarioId, clinicaId } })
    if (!propietario) {
      return res.status(404).json({ message: 'Propietario no encontrado' })
    }

    if (mascota.propietarioId !== propietario.id) {
      return res.status(400).json({
        message: 'La mascota seleccionada no pertenece al tutor indicado',
      })
    }

    // El estilista es cualquier miembro activo del equipo: en clinicas de una
    // persona el mismo usuario agenda, peluquea y cobra.
    const estilista = await Usuario.findOne({
      where: { id: estilistaId, clinicaId, activo: true },
    })
    if (!estilista) {
      return res.status(404).json({ message: 'Estilista no encontrado' })
    }

    if (citaId) {
      const cita = await Cita.findOne({ where: { id: citaId, clinicaId } })
      if (!cita) {
        return res.status(404).json({ message: 'Cita no encontrada' })
      }

      const registroExistente = await RegistroEstilo.findOne({ where: { citaId, clinicaId } })
      if (registroExistente) {
        return res.status(400).json({
          message: 'La cita seleccionada ya tiene un registro de estilos asociado',
        })
      }

      if (cita.mascotaId !== mascotaId || cita.propietarioId !== propietarioId) {
        return res.status(400).json({
          message: 'La cita seleccionada no coincide con la mascota o el tutor enviado',
        })
      }

      await cita.update({ estado: 'completada' })
    }

    const registro = await RegistroEstilo.create({
      tipoCorte: tipoCorteNormalizado,
      observaciones: observacionesNormalizadas,
      proximaCitaSugerida: proximaCitaNormalizada,
      fechaServicio: fechaServicio || new Date(),
      mascotaId,
      propietarioId,
      estilistaId,
      citaId: citaId || null,
      clinicaId,
    })

    const registroCompleto = await RegistroEstilo.findOne({
      where: { id: registro.id, clinicaId },
      include: INCLUDES_DETALLE,
    })

    await registrarAuditoria({
      accion: 'CREAR_REGISTRO_ESTILO',
      entidad: 'RegistroEstilo',
      entidadId: registro.id,
      descripcion: `Registro de estilos creado para ${mascota.nombre} — ${tipoCorteNormalizado}`,
      datosNuevos: { mascotaId, estilistaId, tipoCorte: tipoCorteNormalizado },
      req,
      resultado: 'exitoso',
    })

    res.status(201).json({
      message: 'Registro de estilos creado exitosamente',
      registro: registroCompleto,
    })
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
}

const obtenerRegistrosEstiloMascota = async (req, res) => {
  try {
    const { mascotaId } = req.params
    const { clinicaId } = req.usuario

    const mascota = await Mascota.findOne({ where: { id: mascotaId, clinicaId } })
    if (!mascota) {
      return res.status(404).json({ message: 'Mascota no encontrada' })
    }

    const registros = await RegistroEstilo.findAll({
      where: { mascotaId, clinicaId },
      order: [['fechaServicio', 'DESC']],
      include: [{ model: Usuario, as: 'estilista', attributes: ['id', 'nombre'] }],
    })

    res.json({
      mascota: { id: mascota.id, nombre: mascota.nombre, especie: mascota.especie },
      totalRegistros: registros.length,
      registros,
    })
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
}

const obtenerRegistroEstilo = async (req, res) => {
  try {
    const { id } = req.params
    const { clinicaId } = req.usuario

    const registro = await RegistroEstilo.findOne({
      where: { id, clinicaId },
      include: [
        ...INCLUDES_DETALLE,
        { model: Cita, as: 'cita', attributes: ['id', 'fecha', 'tipoCita'] },
      ],
    })

    if (!registro) {
      return res.status(404).json({ message: 'Registro de estilos no encontrado' })
    }

    res.json({ registro })
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
}

const editarRegistroEstilo = async (req, res) => {
  try {
    const { id } = req.params
    const { clinicaId } = req.usuario

    const registro = await RegistroEstilo.findOne({ where: { id, clinicaId } })
    if (!registro) {
      return res.status(404).json({ message: 'Registro de estilos no encontrado' })
    }

    if (registro.bloqueado) {
      await registrarAuditoria({
        accion: 'INTENTO_EDITAR_ESTILO_BLOQUEADO',
        entidad: 'RegistroEstilo',
        entidadId: registro.id,
        descripcion: 'Intento de edicion en registro de estilos ya facturado',
        req,
        resultado: 'fallido',
      })
      return res.status(409).json({
        message: 'Este registro ya fue facturado y no se puede modificar',
        code: 'ESTILO_YA_FACTURADO',
      })
    }

    const { tipoCorte, observaciones, proximaCitaSugerida, estilistaId } = req.body
    const cambios = {}

    if (tipoCorte !== undefined) {
      const normalizado = normalizarTipoCorte(tipoCorte)
      if (!normalizado) {
        return res.status(400).json({ message: 'El tipo de corte no puede estar vacio' })
      }
      cambios.tipoCorte = normalizado
    }

    if (observaciones !== undefined) {
      cambios.observaciones = normalizarObservaciones(observaciones)
    }

    if (proximaCitaSugerida !== undefined) {
      try {
        cambios.proximaCitaSugerida = normalizarProximaCita(proximaCitaSugerida)
      } catch (error) {
        return res.status(400).json({ message: error.message })
      }
    }

    if (estilistaId !== undefined) {
      const estilista = await Usuario.findOne({
        where: { id: estilistaId, clinicaId, activo: true },
      })
      if (!estilista) {
        return res.status(404).json({ message: 'Estilista no encontrado' })
      }
      cambios.estilistaId = estilistaId
    }

    await registro.update(cambios)

    const registroActualizado = await RegistroEstilo.findOne({
      where: { id: registro.id, clinicaId },
      include: INCLUDES_DETALLE,
    })

    await registrarAuditoria({
      accion: 'EDITAR_REGISTRO_ESTILO',
      entidad: 'RegistroEstilo',
      entidadId: registro.id,
      descripcion: `Registro de estilos actualizado`,
      datosNuevos: cambios,
      req,
      resultado: 'exitoso',
    })

    res.json({
      message: 'Registro de estilos actualizado exitosamente',
      registro: registroActualizado,
    })
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
}

// Borrador de cobro: devuelve los datos del tutor y la mascota para prellenar
// Caja. El servicio a cobrar lo elige el cajero del catalogo de ServicioClinico
// — este registro no define precios.
const obtenerPreliquidacionEstilo = async (req, res) => {
  try {
    const { id } = req.params
    const { clinicaId } = req.usuario

    const registro = await RegistroEstilo.findOne({
      where: { id, clinicaId },
      include: [
        { model: Mascota, as: 'mascota', attributes: ['id', 'nombre', 'especie'] },
        { model: Propietario, as: 'propietario', attributes: ['id', 'nombre', 'telefono'] },
      ],
    })

    if (!registro) {
      return res.status(404).json({ message: 'Registro de estilos no encontrado' })
    }

    if (registro.facturaId) {
      return res.status(409).json({
        message: 'Este servicio de estilos ya fue facturado',
        code: 'ESTILO_YA_FACTURADO',
        facturaId: registro.facturaId,
      })
    }

    res.json({
      registroEstiloId: registro.id,
      tipoCorte: registro.tipoCorte,
      mascota: registro.mascota,
      propietario: registro.propietario,
    })
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
}

module.exports = {
  crearRegistroEstilo,
  obtenerRegistrosEstiloMascota,
  obtenerRegistroEstilo,
  editarRegistroEstilo,
  obtenerPreliquidacionEstilo,
}
```

- [ ] **Step 2: Escribir las rutas**

Crear `backend/src/routes/registroEstiloRoutes.js`:

```js
const express = require('express')
const router = express.Router()
const { body, param } = require('express-validator')
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware')
const { validar } = require('../middlewares/validacionMiddleware')
const { requerirEscritura } = require('../middlewares/suscripcionMiddleware')
const { isValidDateOnly } = require('../utils/dateOnly')
const {
  crearRegistroEstilo,
  obtenerRegistrosEstiloMascota,
  obtenerRegistroEstilo,
  editarRegistroEstilo,
  obtenerPreliquidacionEstilo,
} = require('../controllers/registroEstiloController')

// Estilos lo maneja todo el equipo de atencion: en clinicas de una persona
// el mismo usuario agenda, peluquea y cobra.
const ROLES_ESTILOS = ['admin', 'superadmin', 'veterinario', 'recepcionista', 'auxiliar']

const validarFechaSugerida = (value) => {
  if (value === undefined || value === null || value === '') return true
  if (!isValidDateOnly(value)) {
    throw new Error('La fecha de proxima cita sugerida no es valida')
  }
  return true
}

router.post(
  '/',
  verificarToken,
  verificarRol(...ROLES_ESTILOS),
  requerirEscritura,
  [
    body('tipoCorte').notEmpty().withMessage('El tipo de corte es obligatorio').trim(),
    body('mascotaId').isUUID().withMessage('Mascota no valida'),
    body('propietarioId').isUUID().withMessage('Propietario no valido'),
    body('estilistaId').isUUID().withMessage('Estilista no valido'),
    body('citaId').optional().isUUID().withMessage('Cita no valida'),
    body('fechaServicio').optional().isISO8601().withMessage('Fecha de servicio no valida'),
    body('proximaCitaSugerida').optional().custom(validarFechaSugerida),
    validar,
  ],
  crearRegistroEstilo
)

router.get(
  '/mascota/:mascotaId',
  verificarToken,
  verificarRol(...ROLES_ESTILOS),
  [
    param('mascotaId').isUUID().withMessage('Mascota no valida'),
    validar,
  ],
  obtenerRegistrosEstiloMascota
)

router.get(
  '/:id/preliquidacion',
  verificarToken,
  verificarRol(...ROLES_ESTILOS, 'facturador'),
  [
    param('id').isUUID().withMessage('Registro de estilos no valido'),
    validar,
  ],
  obtenerPreliquidacionEstilo
)

router.get(
  '/:id',
  verificarToken,
  verificarRol(...ROLES_ESTILOS),
  [
    param('id').isUUID().withMessage('Registro de estilos no valido'),
    validar,
  ],
  obtenerRegistroEstilo
)

router.put(
  '/:id',
  verificarToken,
  verificarRol(...ROLES_ESTILOS),
  requerirEscritura,
  [
    param('id').isUUID().withMessage('Registro de estilos no valido'),
    body('tipoCorte').optional().notEmpty().withMessage('El tipo de corte no puede estar vacio').trim(),
    body('estilistaId').optional().isUUID().withMessage('Estilista no valido'),
    body('proximaCitaSugerida').optional().custom(validarFechaSugerida),
    validar,
  ],
  editarRegistroEstilo
)

module.exports = router
```

**Nota sobre el orden de rutas:** `/:id/preliquidacion` va ANTES de `/:id`. Express evalúa en orden de registro y `/:id` capturaría `preliquidacion` como id.

- [ ] **Step 3: Registrar el router**

En `backend/src/index.js`, junto a los demás `require` de rutas (cerca de la línea 138, donde está `historiaClinicaRoutes`), agregar:

```js
const registroEstiloRoutes = require('./routes/registroEstiloRoutes')
```

Y junto a los `app.use` (cerca de la línea 161, donde está `/api/historias`), agregar:

```js
app.use('/api/registros-estilo', registroEstiloRoutes)
```

- [ ] **Step 4: Verificar que las rutas cargan**

```bash
cd backend && node -e "require('./src/routes/registroEstiloRoutes'); console.log('rutas OK')"
```

Expected: imprime `rutas OK` sin errores de import.

- [ ] **Step 5: Verificar la suite y el guard multi-tenant**

```bash
cd backend && npm test
```

Expected: todos los tests pasan. El `tenantGuard` en modo dev no debe reportar queries sin `clinicaId` provenientes de este controlador.

- [ ] **Step 6: Commit**

```bash
git add backend/src/controllers/registroEstiloController.js backend/src/routes/registroEstiloRoutes.js backend/src/index.js
git commit -m "feat: endpoints de registros de estilos"
```

---

### Task 4: Vínculo con Caja (facturación)

**Files:**
- Modify: `backend/src/controllers/facturaController.js`

**Interfaces:**
- Consumes: modelo `RegistroEstilo` (Task 1).
- Produces: el endpoint de crear factura acepta `registroEstiloId` opcional en el body; al facturar marca `{ facturaId, bloqueado: true }`; al anular limpia `{ facturaId: null, bloqueado: false }`.

- [ ] **Step 1: Importar el modelo**

En `backend/src/controllers/facturaController.js`, junto al import de `HistoriaClinica` (línea 11), agregar:

```js
const RegistroEstilo = require('../models/RegistroEstilo')
```

- [ ] **Step 2: Aceptar `registroEstiloId` del body**

En el handler de crear factura, donde hoy se desestructura `historiaClinicaId = null` (cerca de la línea 426), agregar en la misma desestructuración:

```js
      registroEstiloId = null,
```

- [ ] **Step 3: Validar y bloquear el registro dentro de la transacción**

Justo DESPUÉS del bloque `if (historiaClinicaId) { ... }` que termina cerca de la línea 500 (el que valida `!historiaAFacturar.bloqueada`), agregar:

```js
    // Cobro de un servicio de estilos. A diferencia de la historia clinica, aqui
    // no se exige un cierre previo: facturar es lo que bloquea el registro.
    let estiloAFacturar = null
    if (registroEstiloId) {
      estiloAFacturar = await RegistroEstilo.findOne({
        where: { id: registroEstiloId, clinicaId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      })

      if (!estiloAFacturar) {
        await transaction.rollback()
        return res.status(404).json({ message: 'Registro de estilos no encontrado' })
      }

      if (estiloAFacturar.facturaId) {
        await transaction.rollback()
        return res.status(409).json({
          message: 'Este servicio de estilos ya fue facturado',
          code: 'ESTILO_YA_FACTURADO',
          facturaId: estiloAFacturar.facturaId,
        })
      }
    }
```

- [ ] **Step 4: Marcar el registro al crear la factura**

Junto a la línea donde hoy se hace `await historiaAFacturar.update({ facturaId: factura.id }, { transaction })` (cerca de la línea 730), agregar inmediatamente después:

```js
      if (estiloAFacturar) {
        await estiloAFacturar.update(
          { facturaId: factura.id, bloqueado: true },
          { transaction }
        )
      }
```

**Nota:** revisar si el `update` de la historia está dentro de un `if (historiaAFacturar)`. El nuevo bloque debe quedar al mismo nivel, no anidado dentro de esa condición — se factura una cosa u otra, no ambas.

- [ ] **Step 5: Liberar el vínculo al anular la factura**

Junto al `HistoriaClinica.update({ facturaId: null }, ...)` que existe al anular (cerca de la línea 1455), agregar después:

```js
    await RegistroEstilo.update(
      { facturaId: null, bloqueado: false },
      { where: { facturaId: factura.id, clinicaId }, transaction }
    )
```

- [ ] **Step 6: Verificar que el controlador carga y la suite pasa**

```bash
cd backend && node -e "require('./src/controllers/facturaController'); console.log('OK')" && npm test
```

Expected: imprime `OK` y todos los tests pasan.

- [ ] **Step 7: Commit**

```bash
git add backend/src/controllers/facturaController.js
git commit -m "feat: facturar servicios de estilos desde caja"
```

---

### Task 5: Extraer el timeline clínico a su propia feature

Refactor preparatorio. `PacienteHistorialPage.jsx` tiene ~500 líneas; sin
extraer esto, agregar la pestaña de Estilos la llevaría a ~800 mezclando dos
dominios.

**Files:**
- Create: `frontend/src/features/historias/HistoriaClinicaTimeline.jsx`
- Modify: `frontend/src/pages/PacienteHistorialPage.jsx`

**Interfaces:**
- Produces: componente `HistoriaClinicaTimeline` con props
  `{ historias, isPending, onNuevaConsulta, onEditHistoria }`.
  Encapsula `TimelineCard`, `EmptyTimeline` y `TimelineItemSkeleton`, que dejan
  de vivir en la página.

- [ ] **Step 1: Crear el componente extraído**

Crear `frontend/src/features/historias/HistoriaClinicaTimeline.jsx` moviendo
—sin cambiar su lógica— las funciones `TimelineItemSkeleton`, `EmptyTimeline` y
`TimelineCard` que hoy están en `PacienteHistorialPage.jsx` (líneas ~51-163),
junto con el helper `formatDate` y `SkeletonBlock` que necesitan. El componente
exportado por defecto:

```jsx
export default function HistoriaClinicaTimeline({
  historias,
  isPending,
  onNuevaConsulta,
  onEditHistoria,
}) {
  if (isPending) {
    return (
      <div className="space-y-4">
        <TimelineItemSkeleton />
        <TimelineItemSkeleton />
      </div>
    )
  }

  if (!historias.length) {
    return <EmptyTimeline onNuevaConsulta={onNuevaConsulta} />
  }

  return (
    <div className="space-y-4">
      {historias.map((historia) => (
        <TimelineCard key={historia.id} historia={historia} onEdit={onEditHistoria} />
      ))}
    </div>
  )
}
```

`SkeletonBlock` y `formatDate` se duplican o se comparten según dónde queden: si
`PacienteHistorialPage` sigue usando `SkeletonBlock` para
`PatientHeaderSkeleton`, moverlo a `frontend/src/components/shared/` e
importarlo desde ambos archivos. Si solo lo usa el timeline, dejarlo dentro del
nuevo archivo.

- [ ] **Step 2: Usar el componente en la página**

En `PacienteHistorialPage.jsx`, borrar las funciones movidas y reemplazar el
bloque que renderiza el timeline por:

```jsx
<HistoriaClinicaTimeline
  historias={historias}
  isPending={historiasQuery.isPending}
  onNuevaConsulta={handleNuevaConsulta}
  onEditHistoria={handleEditHistoria}
/>
```

Agregar el import correspondiente.

- [ ] **Step 3: Verificar que la app compila**

```bash
cd frontend && npm run build
```

Expected: build exitoso, sin errores de import ni de referencias a funciones borradas.

- [ ] **Step 4: Verificar visualmente**

Levantar `npm run dev`, entrar a un paciente con historias y confirmar que el
timeline se ve idéntico a antes: tarjetas, estados bloqueada/editable, el
empty state y los skeletons durante la carga.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/historias/HistoriaClinicaTimeline.jsx frontend/src/pages/PacienteHistorialPage.jsx
git commit -m "refactor: extrae el timeline clinico de PacienteHistorialPage"
```

---

### Task 6: API y hooks de Estilos en frontend

**Files:**
- Create: `frontend/src/features/estilos/estilosApi.js`
- Create: `frontend/src/features/estilos/useEstilos.js`

**Interfaces:**
- Consumes: endpoints de Task 3 bajo `/registros-estilo`; cliente `@/lib/api`.
- Produces:
  - `estilosApi.obtenerRegistrosMascota(mascotaId)` → `{ mascota, totalRegistros, registros }`
  - `estilosApi.obtenerRegistro(registroId)` → `{ registro }`
  - `estilosApi.crearRegistro(payload)` → `{ message, registro }`
  - `estilosApi.editarRegistro(registroId, payload)` → `{ message, registro }`
  - `estilosApi.obtenerPreliquidacion(registroId)` → `{ registroEstiloId, tipoCorte, mascota, propietario }`
  - Hook `useEstilosMascota({ mascotaId, enabled })` → `{ registrosQuery, registros, crearRegistro, editarRegistro, isPending }`

- [ ] **Step 1: Escribir el cliente API**

Crear `frontend/src/features/estilos/estilosApi.js`:

```js
import api from '@/lib/api'

export const estilosApi = {
  async obtenerRegistrosMascota(mascotaId) {
    const { data } = await api.get(`/registros-estilo/mascota/${mascotaId}`)
    return data
  },

  async obtenerRegistro(registroId) {
    const { data } = await api.get(`/registros-estilo/${registroId}`)
    return data
  },

  async crearRegistro(payload) {
    const { data } = await api.post('/registros-estilo', payload)
    return data
  },

  async editarRegistro(registroId, payload) {
    const { data } = await api.put(`/registros-estilo/${registroId}`, payload)
    return data
  },

  // Borrador de cobro de un servicio de estilos aun no facturado.
  async obtenerPreliquidacion(registroId) {
    const { data } = await api.get(`/registros-estilo/${registroId}/preliquidacion`)
    return data
  },
}
```

- [ ] **Step 2: Escribir el hook**

Crear `frontend/src/features/estilos/useEstilos.js`:

```js
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { estilosApi } from './estilosApi'

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.errores?.[0]?.mensaje ||
  error?.response?.data?.message ||
  fallback

export function useEstilosMascota({ mascotaId, enabled = true }) {
  const queryClient = useQueryClient()

  const registrosQuery = useQuery({
    queryKey: ['paciente-estilos', mascotaId],
    queryFn: () => estilosApi.obtenerRegistrosMascota(mascotaId),
    enabled: Boolean(mascotaId) && enabled,
  })

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ['paciente-estilos', mascotaId] })
    // Crear un registro desde una cita la marca completada: la agenda debe
    // reflejarlo sin que el usuario recargue.
    queryClient.invalidateQueries({ queryKey: ['agenda-citas'] })
  }

  const crearRegistroMutation = useMutation({
    mutationFn: estilosApi.crearRegistro,
    onSuccess: (data) => {
      toast.success(data?.message || 'Registro de estilos creado')
      invalidar()
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'No fue posible crear el registro de estilos.')),
  })

  const editarRegistroMutation = useMutation({
    mutationFn: ({ registroId, payload }) => estilosApi.editarRegistro(registroId, payload),
    onSuccess: (data) => {
      toast.success(data?.message || 'Registro de estilos actualizado')
      invalidar()
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'No fue posible actualizar el registro.')),
  })

  return {
    registrosQuery,
    registros: registrosQuery.data?.registros || [],
    crearRegistro: crearRegistroMutation.mutate,
    editarRegistro: editarRegistroMutation.mutate,
    isPending: crearRegistroMutation.isPending || editarRegistroMutation.isPending,
  }
}
```

- [ ] **Step 3: Verificar que compila**

```bash
cd frontend && npm run build
```

Expected: build exitoso.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/estilos/estilosApi.js frontend/src/features/estilos/useEstilos.js
git commit -m "feat: api y hooks de estilos en frontend"
```

---

### Task 7: Timeline y formulario de Estilos

**Files:**
- Create: `frontend/src/features/estilos/EstilosTimeline.jsx`
- Create: `frontend/src/features/estilos/RegistroEstiloFormDrawer.jsx`

**Interfaces:**
- Consumes: `useEstilosMascota` (Task 6); `agendaApi.obtenerEquipoAgenda` para el select de estilista.
- Produces:
  - `EstilosTimeline` con props `{ registros, isPending, onNuevoRegistro, onEditRegistro }`
  - `RegistroEstiloFormDrawer` con props `{ open, onClose, mascota, registroToEdit, citaId, onSuccess }`

- [ ] **Step 1: Escribir el timeline**

Crear `frontend/src/features/estilos/EstilosTimeline.jsx`:

```jsx
import { CalendarDays, Lock, Pencil, Plus, Scissors } from 'lucide-react'

const formatDate = (value) => {
  if (!value) return '—'
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(new Date(value))
}

function EmptyEstilos({ onNuevoRegistro }) {
  return (
    <div className="rounded border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
      <Scissors className="mx-auto mb-3 h-7 w-7 text-muted-foreground/40" />
      <p className="text-sm font-semibold text-foreground">Sin servicios de estilos</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Este paciente aún no tiene peluqueadas registradas.
      </p>
      <button
        type="button"
        onClick={onNuevoRegistro}
        className="mt-4 inline-flex items-center gap-2 border border-border bg-foreground px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
      >
        <Plus className="h-3.5 w-3.5" />
        Registrar primer servicio
      </button>
    </div>
  )
}

function EstiloCard({ registro, onEdit }) {
  const { bloqueado, tipoCorte, fechaServicio, estilista, proximaCitaSugerida } = registro

  return (
    <div className="relative pl-8">
      <div className="absolute left-0 top-4 flex h-5 w-5 items-center justify-center">
        <div className={`h-3 w-3 rounded-full border-2 ${
          bloqueado ? 'border-amber-400 bg-amber-100' : 'border-primary bg-primary/20'
        }`} />
      </div>

      <div className="border border-border bg-card px-4 py-4 transition hover:bg-muted/30">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground">
              {formatDate(fechaServicio)}
            </span>
            {estilista?.nombre && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="text-xs text-muted-foreground">{estilista.nombre}</span>
              </>
            )}
          </div>
          <span className={`inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-[11px] font-semibold ${
            bloqueado
              ? 'border-amber-200 bg-amber-50 text-amber-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}>
            {bloqueado ? <Lock className="h-3 w-3" /> : <Pencil className="h-3 w-3" />}
            {bloqueado ? 'Facturado' : 'Editable'}
          </span>
        </div>

        <div className="mt-3 space-y-1.5">
          <div className="flex items-start gap-2">
            <Scissors className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
            <p className="text-sm text-foreground">
              <span className="font-medium">Corte:</span> {tipoCorte}
            </p>
          </div>
          {proximaCitaSugerida && (
            <div className="flex items-start gap-2">
              <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
              <p className="text-sm text-muted-foreground">
                Próxima cita sugerida: {formatDate(proximaCitaSugerida)}
              </p>
            </div>
          )}
        </div>

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => onEdit(registro)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary transition hover:text-primary/80"
          >
            {bloqueado ? 'Ver detalle' : 'Ver / Editar'}
            <span aria-hidden>→</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default function EstilosTimeline({ registros, isPending, onNuevoRegistro, onEditRegistro }) {
  if (isPending) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded bg-muted/70" />
        <div className="h-24 animate-pulse rounded bg-muted/70" />
      </div>
    )
  }

  if (!registros.length) {
    return <EmptyEstilos onNuevoRegistro={onNuevoRegistro} />
  }

  return (
    <div className="space-y-4">
      {registros.map((registro) => (
        <EstiloCard key={registro.id} registro={registro} onEdit={onEditRegistro} />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Leer el drawer de historias como referencia**

```bash
cd frontend && head -80 src/features/historias/HistoriaClinicaFormDrawer.jsx
```

Sirve para copiar la estructura del drawer (overlay, panel lateral, header,
footer con botones) y mantener consistencia visual.

- [ ] **Step 3: Escribir el formulario**

Crear `frontend/src/features/estilos/RegistroEstiloFormDrawer.jsx` con React
Hook Form + Zod. Esquema de validación:

```js
import { z } from 'zod'

const registroEstiloSchema = z.object({
  tipoCorte: z.string().trim().min(1, 'El tipo de corte es obligatorio').max(240),
  estilistaId: z.string().uuid('Selecciona un estilista'),
  fechaServicio: z.string().min(1, 'La fecha del servicio es obligatoria'),
  proximaCitaSugerida: z.string().optional().or(z.literal('')),
  observaciones: z.string().max(4000).optional().or(z.literal('')),
})
```

Requisitos del componente:
- Usa `useQuery({ queryKey: ['agenda-equipo'], queryFn: agendaApi.obtenerEquipoAgenda })` para poblar el select de estilista (misma clave que ya usa Agenda, así comparten caché).
- Default de `fechaServicio`: hoy, en formato `YYYY-MM-DD`.
- Si `registroToEdit?.bloqueado` es `true`: todos los campos deshabilitados, sin botón de guardar, y un aviso con el texto "Este registro ya fue facturado y no se puede modificar".
- Al enviar en modo creación, arma el payload con `tipoCorte`, `estilistaId`, `fechaServicio`, `proximaCitaSugerida` (omitida si viene vacía), `observaciones`, `mascotaId` (de `mascota.id`), `propietarioId` (de `mascota.Propietario.id`) y `citaId` si vino por prop; llama `crearRegistro`.
- Al enviar en modo edición, llama `editarRegistro({ registroId: registroToEdit.id, payload })` con solo los campos editables (`tipoCorte`, `estilistaId`, `proximaCitaSugerida`, `observaciones`).
- Llama `onSuccess()` cuando la mutación termina bien.

- [ ] **Step 4: Verificar que compila**

```bash
cd frontend && npm run build
```

Expected: build exitoso.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/estilos/EstilosTimeline.jsx frontend/src/features/estilos/RegistroEstiloFormDrawer.jsx
git commit -m "feat: timeline y formulario de estilos"
```

---

### Task 8: Pestañas en la ficha del paciente

**Files:**
- Modify: `frontend/src/pages/PacienteHistorialPage.jsx`

**Interfaces:**
- Consumes: `HistoriaClinicaTimeline` (Task 5), `EstilosTimeline` y `RegistroEstiloFormDrawer` (Task 7), `useEstilosMascota` (Task 6).
- Produces: la página renderiza pestañas "Historia Clínica" / "Estilos" y abre la pestaña correcta según el tipo de cita cuando llega `?citaId=`.

- [ ] **Step 1: Verificar cómo leer una cita por id**

```bash
cd frontend && grep -n "obtenerCita\|obtenerEquipoAgenda\|async obtener" src/features/agenda/agendaApi.js
```

Anotar el nombre exacto del método que devuelve una cita por id y la forma de su
respuesta. Si no existe, agregarlo siguiendo el patrón del archivo:

```js
  async obtenerCita(citaId) {
    const { data } = await api.get(`/citas/${citaId}`)
    return data
  },
```

Los pasos siguientes asumen `agendaApi.obtenerCita(citaId)` → `{ cita: { id, tipoCita, ... } }`.
Ajustar si la forma real difiere.

- [ ] **Step 2: Agregar el estado de pestañas**

En `PacienteHistorialPage.jsx`, junto a las otras constantes del módulo:

```jsx
const TABS = [
  { id: 'historia', label: 'Historia Clínica' },
  { id: 'estilos', label: 'Estilos' },
]
```

Dentro del componente, junto a los demás `useState`:

```jsx
const [activeTab, setActiveTab] = useState('historia')
const [estiloDrawerOpen, setEstiloDrawerOpen] = useState(false)
const [registroEstiloToEdit, setRegistroEstiloToEdit] = useState(null)
```

- [ ] **Step 3: Cargar los registros de estilos**

Junto a `historiasQuery`, agregar:

```jsx
const { registrosQuery, registros } = useEstilosMascota({ mascotaId })
```

- [ ] **Step 4: Abrir la pestaña correcta según el tipo de cita**

Reemplazar el `useEffect` que hoy abre el drawer cuando llega `?citaId=` por:

```jsx
// La agenda navega aqui con ?citaId= al atender una cita. Una cita de
// peluqueria abre Estilos; cualquier otra, la historia clinica.
const citaQuery = useQuery({
  queryKey: ['cita-detalle', citaIdParam],
  queryFn: () => agendaApi.obtenerCita(citaIdParam),
  enabled: Boolean(citaIdParam),
})

useEffect(() => {
  if (!citaIdParam) return

  const tipoCita = citaQuery.data?.cita?.tipoCita
  if (!tipoCita) return

  if (tipoCita === 'peluqueria') {
    setActiveTab('estilos')
    setRegistroEstiloToEdit(null)
    setEstiloDrawerOpen(true)
  } else if (tieneHistorias && puedeEditarHistorias) {
    setActiveTab('historia')
    setHistoriaToEdit(null)
    setDrawerOpen(true)
  }
}, [citaIdParam, citaQuery.data, tieneHistorias, puedeEditarHistorias])
```

- [ ] **Step 5: Renderizar las pestañas**

Reemplazar el bloque que hoy renderiza directamente el timeline por:

```jsx
<div className="mb-6 flex gap-1 border-b border-border">
  {TABS.map((tab) => (
    <button
      key={tab.id}
      type="button"
      onClick={() => setActiveTab(tab.id)}
      className={`border-b-2 px-4 py-2 text-sm font-semibold transition ${
        activeTab === tab.id
          ? 'border-primary text-primary'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      }`}
    >
      {tab.label}
    </button>
  ))}
</div>

{activeTab === 'historia' ? (
  <HistoriaClinicaTimeline
    historias={historias}
    isPending={historiasQuery.isPending}
    onNuevaConsulta={handleNuevaConsulta}
    onEditHistoria={handleEditHistoria}
  />
) : (
  <EstilosTimeline
    registros={registros}
    isPending={registrosQuery.isPending}
    onNuevoRegistro={() => {
      setRegistroEstiloToEdit(null)
      setEstiloDrawerOpen(true)
    }}
    onEditRegistro={(registro) => {
      setRegistroEstiloToEdit(registro)
      setEstiloDrawerOpen(true)
    }}
  />
)}
```

- [ ] **Step 6: Montar el drawer de estilos**

Junto al `HistoriaClinicaFormDrawer` existente, agregar:

```jsx
<RegistroEstiloFormDrawer
  open={estiloDrawerOpen}
  onClose={() => {
    setEstiloDrawerOpen(false)
    setRegistroEstiloToEdit(null)
    if (citaIdParam) setSearchParams({})
  }}
  mascota={mascotaParaDrawer}
  registroToEdit={registroEstiloToEdit}
  citaId={citaIdParam || undefined}
  onSuccess={() => {
    setEstiloDrawerOpen(false)
    setRegistroEstiloToEdit(null)
    if (citaIdParam) setSearchParams({})
  }}
/>
```

- [ ] **Step 7: Verificar que compila**

```bash
cd frontend && npm run build
```

Expected: build exitoso.

- [ ] **Step 8: Verificar el flujo completo en el navegador**

Con `npm run dev` en frontend y backend:
1. Entrar a un paciente → pestaña "Historia Clínica" activa, timeline igual que antes.
2. Cambiar a "Estilos" → empty state.
3. Crear un registro (corte, estilista, fecha, próxima cita sugerida) → aparece en el timeline.
4. Editarlo → los cambios se reflejan sin recargar.
5. Desde Agenda, crear una cita tipo `peluqueria` y atenderla → abre la ficha en la pestaña Estilos con el formulario abierto.
6. Desde Agenda, atender una cita de consulta → abre en Historia Clínica, como antes.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/pages/PacienteHistorialPage.jsx
git commit -m "feat: pestañas de historia clinica y estilos en la ficha del paciente"
```

---

### Task 9: Verificación end-to-end del ciclo con Caja

**Files:**
- Ninguno nuevo. Verificación del flujo completo construido en Tasks 1-8.

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: confirmación de que el ciclo cita → registro → factura → anulación cuadra.

- [ ] **Step 1: Verificar la suite completa**

```bash
cd backend && npm test && cd ../frontend && npm run build
```

Expected: backend con todos los tests en verde; build de frontend exitoso.

- [ ] **Step 2: Facturar un servicio de estilos**

En el navegador:
1. Crear un registro de estilos para un paciente.
2. Ir a Finanzas/Caja y crear una factura para ese tutor, incluyendo un servicio de peluquería del catálogo, enviando `registroEstiloId`.
3. Confirmar que la factura se crea y el registro queda marcado como "Facturado" (badge ámbar con candado) en el timeline.

- [ ] **Step 3: Verificar que no se puede facturar dos veces**

Intentar facturar el mismo `registroEstiloId` otra vez.
Expected: error 409 con el mensaje "Este servicio de estilos ya fue facturado".

- [ ] **Step 4: Verificar que no se puede editar lo facturado**

Abrir el registro facturado desde el timeline.
Expected: campos deshabilitados, sin botón de guardar, con el aviso de que ya fue facturado.

- [ ] **Step 5: Verificar la anulación**

Anular la factura creada en el Step 2.
Expected: el registro vuelve a estado "Editable" (badge verde) y se puede facturar de nuevo.

- [ ] **Step 6: Verificar el aislamiento multi-tenant**

Con `TENANT_GUARD_MODE=strict` en desarrollo, recorrer todo el flujo anterior.
Expected: el guard no reporta ninguna query sin filtro `clinicaId` desde el
módulo de estilos.

- [ ] **Step 7: Push y PR**

```bash
git push -u origin HEAD
gh pr create --base develop --title "feat: modulo de Estilos (peluqueria)"
```

---

## Notas de implementación

**Números de línea:** las referencias a líneas de `facturaController.js` y
`PacienteHistorialPage.jsx` corresponden al estado del repo al escribir este
plan (2026-08-24). Si el archivo cambió, buscar por el código citado en vez de
confiar en el número.

**Orden de las tareas:** Tasks 1→4 son backend y se pueden completar y probar
sin tocar frontend. Task 5 es refactor independiente. Tasks 6→8 dependen de que
el backend exista. Task 9 cierra el ciclo.

**Lo que este plan NO hace** (del spec, deliberadamente fuera de alcance):
catálogo de cortes predefinidos, fotos antes/después, productos usados por
servicio, creación automática de cita en Agenda, rol `estilista` en el enum de
`Usuario`.
