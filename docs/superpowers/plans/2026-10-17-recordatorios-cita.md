# Recordatorio de cita al profesional — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enviar por correo, con la anticipación que elija cada clínica, un aviso de cada cita al profesional asignado.

**Architecture:** Reglas puras (ventana de tiempo, rango, contenido) en un servicio con test; un job `setInterval` de 5 min en la API que busca citas en ventana, las marca atómicamente y envía por el `emailService` existente (Brevo SMTP). La clínica configura activo/minutos por un endpoint nuevo y una sección nueva en Configuración.

**Tech Stack:** Express 5 + Sequelize 6 (PostgreSQL), runner de migraciones propio, nodemailer/Brevo; React 19 + React Hook Form + Zod + React Query; tests backend con `node` + `assert`, frontend con Vitest.

**Spec:** `docs/superpowers/specs/2026-10-17-recordatorios-cita-design.md`

## Global Constraints

- Rango de anticipación: **15 a 2880 minutos** (15 min – 48 h); por defecto **60**; activo por defecto **true**.
- Revisión cada **5 minutos**; ventana: `inicio - minutos ≤ ahora < inicio`.
- Solo citas `estado = 'programada'` y `origen = 'programada'`; profesional `activo = true`; suscripción en estado `prueba` o `activa`.
- Tope: **150** avisos por día local (Colombia) en toda la plataforma.
- Hora de Colombia fija `-05:00` (sin horario de verano). Fechas `YYYY-MM-DD`.
- El correo **no lleva datos de historia clínica**; los logs no llevan datos del paciente (solo `citaId`, `clinicaId`).
- No tocar `citas.recordatorioEnviado` (reservado para recordatorios a tutores).
- Toda query global del job lleva `sinTenant: true`. Frontend: solo tokens de color (`npm run lint:colores`), cliente HTTP `@/lib/api`, formularios RHF + Zod.
- Commits sin atribución a Claude. Rama `feat/recordatorios-cita` → PR a `develop`.

## Review Focus

- Cita a medianoche o con `horaInicio` `"HH:MM:SS"` (formato TIME de Postgres) → el inicio se calcula bien en hora de Colombia, no en UTC del contenedor. (Task 2: test `inicioCita` con `'00:15:00'`.)
- Cita agendada 10 min antes con anticipación de 60 → sale en la siguiente corrida, no se pierde. (Task 2: test «ventana tardía».)
- Nombre de mascota/tutor con `<script>` o `&` → escapado en el HTML del correo. (Task 3: test de escape.)
- Admin escribe «0», «10 minutos» o «49 horas» en Configuración → mensaje claro, no se envía al servidor; 1,5 h = 90 min sí se acepta. (Task 7: tests de `aMinutos` y del esquema.)
- Reprogramar una cita ya avisada → vuelve a avisar a la nueva hora. (Task 5 + verificación E2E Task 8.)

---

### Task 1: Migración y campos en modelos

**Files:**
- Create: `backend/src/migrations/20261017_000001_recordatorios_cita.js`
- Modify: `backend/src/models/Clinica.js` (agregar 2 campos junto a `horarioAtencion`)
- Modify: `backend/src/models/Cita.js` (agregar 1 campo junto a `recordatorioEnviado`)

**Interfaces:**
- Produces: columnas `clinicas.recordatorioCitaActivo` (bool), `clinicas.recordatorioCitaMinutos` (int), `citas.recordatorioProfesionalEnviadoEn` (date|null), accesibles como atributos Sequelize con esos nombres.

- [ ] **Step 1: Escribir la migración**

```js
'use strict'

// Recordatorio de cita al profesional por correo. La clínica elige si lo envía
// y con cuántos minutos de anticipación (15 a 2880). La marca de envío es un
// campo nuevo: `recordatorioEnviado` queda para los recordatorios a tutores.
module.exports = {
  name: '20261017_000001_recordatorios_cita',

  up: async ({ queryInterface, Sequelize, transaction }) => {
    const clinicas = await queryInterface.describeTable('clinicas', { transaction })
    if (!clinicas.recordatorioCitaActivo) {
      await queryInterface.addColumn('clinicas', 'recordatorioCitaActivo', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      }, { transaction })
    }
    if (!clinicas.recordatorioCitaMinutos) {
      await queryInterface.addColumn('clinicas', 'recordatorioCitaMinutos', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 60,
      }, { transaction })
      await queryInterface.sequelize.query(
        `ALTER TABLE clinicas ADD CONSTRAINT clinicas_recordatorio_cita_minutos_rango
         CHECK ("recordatorioCitaMinutos" BETWEEN 15 AND 2880)`,
        { transaction }
      )
    }

    const citas = await queryInterface.describeTable('citas', { transaction })
    if (!citas.recordatorioProfesionalEnviadoEn) {
      await queryInterface.addColumn('citas', 'recordatorioProfesionalEnviadoEn', {
        type: Sequelize.DATE,
        allowNull: true,
      }, { transaction })
      await queryInterface.sequelize.query(
        `CREATE INDEX IF NOT EXISTS citas_recordatorio_profesional_pendiente_idx
         ON citas ("fecha")
         WHERE "recordatorioProfesionalEnviadoEn" IS NULL AND estado = 'programada'`,
        { transaction }
      )
    }
  },

  down: async ({ queryInterface, transaction }) => {
    await queryInterface.sequelize.query(
      'DROP INDEX IF EXISTS citas_recordatorio_profesional_pendiente_idx',
      { transaction }
    )
    const citas = await queryInterface.describeTable('citas', { transaction })
    if (citas.recordatorioProfesionalEnviadoEn) {
      await queryInterface.removeColumn('citas', 'recordatorioProfesionalEnviadoEn', { transaction })
    }
    await queryInterface.sequelize.query(
      'ALTER TABLE clinicas DROP CONSTRAINT IF EXISTS clinicas_recordatorio_cita_minutos_rango',
      { transaction }
    )
    const clinicas = await queryInterface.describeTable('clinicas', { transaction })
    if (clinicas.recordatorioCitaMinutos) {
      await queryInterface.removeColumn('clinicas', 'recordatorioCitaMinutos', { transaction })
    }
    if (clinicas.recordatorioCitaActivo) {
      await queryInterface.removeColumn('clinicas', 'recordatorioCitaActivo', { transaction })
    }
  },
}
```

- [ ] **Step 2: Agregar los campos a los modelos**

En `backend/src/models/Clinica.js`, después del bloque `horarioAtencion: {...},`:

```js
  recordatorioCitaActivo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  recordatorioCitaMinutos: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 60,
    validate: { min: 15, max: 2880 },
  },
```

En `backend/src/models/Cita.js`, después del bloque `recordatorioEnviado: {...},`:

```js
  // Aviso por correo al profesional asignado (job recordatoriosCita).
  recordatorioProfesionalEnviadoEn: {
    type: DataTypes.DATE,
    allowNull: true,
  },
```

- [ ] **Step 3: Correr la migración local y verificar**

Run: `cd backend && npm run migrate && npm run migrate:status`
Expected: `20261017_000001_recordatorios_cita` aplicada. Luego:
`node -e "require('dotenv').config();const s=require('./src/config/database');s.query('SELECT \"recordatorioCitaActivo\",\"recordatorioCitaMinutos\" FROM clinicas LIMIT 1',{type:'SELECT'}).then(r=>{console.log(r);return s.close()})"`
Expected: `[ { recordatorioCitaActivo: true, recordatorioCitaMinutos: 60 } ]`

- [ ] **Step 4: Correr los tests del backend**

Run: `cd backend && npm test`
Expected: todos pasan (el smoke test carga los modelos).

- [ ] **Step 5: Commit**

```bash
git add backend/src/migrations/20261017_000001_recordatorios_cita.js backend/src/models/Clinica.js backend/src/models/Cita.js
git commit -m "feat(agenda): campos para el recordatorio de cita al profesional"
```

---

### Task 2: Reglas puras del recordatorio

**Files:**
- Create: `backend/src/services/recordatorioCitaReglas.js`
- Test: `backend/src/services/recordatorioCitaReglas.test.js`
- Modify: `backend/package.json` (script `test`: agregar `&& node src/services/recordatorioCitaReglas.test.js` al final)

**Interfaces:**
- Produces:
  - `MINUTOS_MIN = 15`, `MINUTOS_MAX = 2880`, `TOPE_DIARIO = 150`
  - `minutosValidos(n: any) → boolean`
  - `inicioCita({ fecha: 'YYYY-MM-DD', horaInicio: 'HH:MM' | 'HH:MM:SS' }) → Date`
  - `debeAvisar({ inicio: Date, ahora: Date, minutos: number }) → boolean`
  - `inicioDelDia(fechaISO: 'YYYY-MM-DD') → Date` (00:00 de Colombia)
  - `horaTexto('HH:MM[:SS]') → string` («10:00 a. m.», «12:30 p. m.»)
  - `datosCorreo({ cita, mascota, propietario, consultorio, urlFrontend }) → { asunto, hora, fechaISO, paciente, especie, tutor, celularTutor, motivo, tipo, consultorio, urlAgenda }` (texto plano, sin escapar; el escape lo hace emailService)

- [ ] **Step 1: Escribir el test que falla**

```js
// Tests de las reglas del recordatorio de cita. Se ejecutan con
// `node src/services/recordatorioCitaReglas.test.js` (integrados en `npm test`).
const assert = require('assert')
const {
  MINUTOS_MIN, MINUTOS_MAX, minutosValidos, inicioCita, debeAvisar,
  inicioDelDia, horaTexto, datosCorreo,
} = require('./recordatorioCitaReglas')

// Rango
assert.strictEqual(MINUTOS_MIN, 15)
assert.strictEqual(MINUTOS_MAX, 2880)
assert.strictEqual(minutosValidos(15), true)
assert.strictEqual(minutosValidos(2880), true)
assert.strictEqual(minutosValidos(14), false)
assert.strictEqual(minutosValidos(2881), false)
assert.strictEqual(minutosValidos(90.5), false)
assert.strictEqual(minutosValidos('60'), false)

// Inicio en hora de Colombia (UTC-5), acepta TIME de Postgres con segundos
assert.strictEqual(inicioCita({ fecha: '2026-10-17', horaInicio: '10:00' }).toISOString(), '2026-10-17T15:00:00.000Z')
assert.strictEqual(inicioCita({ fecha: '2026-10-17', horaInicio: '00:15:00' }).toISOString(), '2026-10-17T05:15:00.000Z')
assert.strictEqual(inicioDelDia('2026-10-17').toISOString(), '2026-10-17T05:00:00.000Z')

// Ventana: inicio 10:00, 60 min
const inicio = inicioCita({ fecha: '2026-10-17', horaInicio: '10:00' })
const a = (hhmm) => new Date(`2026-10-17T${hhmm}:00-05:00`)
assert.strictEqual(debeAvisar({ inicio, ahora: a('08:59'), minutos: 60 }), false) // antes
assert.strictEqual(debeAvisar({ inicio, ahora: a('09:00'), minutos: 60 }), true)  // borde
assert.strictEqual(debeAvisar({ inicio, ahora: a('09:50'), minutos: 60 }), true)  // ventana tardía: agendada hace poco
assert.strictEqual(debeAvisar({ inicio, ahora: a('10:00'), minutos: 60 }), false) // ya empezó
assert.strictEqual(debeAvisar({ inicio, ahora: a('11:00'), minutos: 60 }), false)

// Hora legible
assert.strictEqual(horaTexto('10:00:00'), '10:00 a. m.')
assert.strictEqual(horaTexto('12:30'), '12:30 p. m.')
assert.strictEqual(horaTexto('00:15'), '12:15 a. m.')
assert.strictEqual(horaTexto('15:05'), '3:05 p. m.')

// Contenido: solo datos de agenda, nada clínico
const datos = datosCorreo({
  cita: { fecha: '2026-10-17', horaInicio: '10:00:00', motivo: 'Vacuna', tipoCita: 'consulta_general', observaciones: 'NO DEBE SALIR' },
  mascota: { nombre: 'Luna', especie: 'perro' },
  propietario: { nombre: 'Ana Pérez', telefono: '3001234567' },
  consultorio: { nombre: 'Consultorio 1' },
  urlFrontend: 'https://app.bourgelat.co',
})
assert.strictEqual(datos.asunto, 'Cita a las 10:00 a. m.: Luna (consulta general)')
assert.strictEqual(datos.tipo, 'consulta general')
assert.strictEqual(datos.especie, 'Perro')
assert.strictEqual(datos.consultorio, 'Consultorio 1')
assert.strictEqual(datos.urlAgenda, 'https://app.bourgelat.co/agenda?fecha=2026-10-17')
assert.ok(!JSON.stringify(datos).includes('NO DEBE SALIR'))

// Sin consultorio ni teléfono
const sinExtras = datosCorreo({
  cita: { fecha: '2026-10-17', horaInicio: '08:00', motivo: 'Control', tipoCita: 'control' },
  mascota: { nombre: 'Michi', especie: 'gato' },
  propietario: { nombre: 'Luis', telefono: null },
  consultorio: null,
  urlFrontend: 'https://app.bourgelat.co',
})
assert.strictEqual(sinExtras.consultorio, null)
assert.strictEqual(sinExtras.celularTutor, null)

console.log('recordatorioCitaReglas.test.js: todos los tests pasaron ✔')
```

- [ ] **Step 2: Correrlo y ver que falla**

Run: `cd backend && node src/services/recordatorioCitaReglas.test.js`
Expected: FAIL `Cannot find module './recordatorioCitaReglas'`

- [ ] **Step 3: Implementar**

```js
// Reglas puras del recordatorio de cita al profesional (sin base de datos ni
// correo): cuándo avisar, rango de anticipación y datos del correo.
// Colombia no tiene horario de verano: el desfase -05:00 es fijo.

const MINUTOS_MIN = 15
const MINUTOS_MAX = 2880
const TOPE_DIARIO = 150
const DESFASE_COLOMBIA = '-05:00'

const minutosValidos = (n) => Number.isInteger(n) && n >= MINUTOS_MIN && n <= MINUTOS_MAX

const hhmm = (hora) => String(hora).slice(0, 5)

const inicioCita = ({ fecha, horaInicio }) => new Date(`${fecha}T${hhmm(horaInicio)}:00${DESFASE_COLOMBIA}`)

const inicioDelDia = (fechaISO) => new Date(`${fechaISO}T00:00:00${DESFASE_COLOMBIA}`)

const debeAvisar = ({ inicio, ahora, minutos }) =>
  ahora.getTime() >= inicio.getTime() - minutos * 60 * 1000 && ahora.getTime() < inicio.getTime()

const horaTexto = (hora) => {
  const [h, m] = hhmm(hora).split(':').map(Number)
  const sufijo = h < 12 ? 'a. m.' : 'p. m.'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${sufijo}`
}

const capitalizar = (texto) => (texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : '')

const datosCorreo = ({ cita, mascota, propietario, consultorio, urlFrontend }) => {
  const hora = horaTexto(cita.horaInicio)
  const tipo = String(cita.tipoCita || '').replace(/_/g, ' ')
  return {
    asunto: `Cita a las ${hora}: ${mascota.nombre} (${tipo})`,
    hora,
    fechaISO: cita.fecha,
    paciente: mascota.nombre,
    especie: capitalizar(mascota.especie),
    tutor: propietario?.nombre || '',
    celularTutor: propietario?.telefono || null,
    motivo: cita.motivo || '',
    tipo,
    consultorio: consultorio?.nombre || null,
    urlAgenda: `${urlFrontend}/agenda?fecha=${cita.fecha}`,
  }
}

module.exports = {
  MINUTOS_MIN,
  MINUTOS_MAX,
  TOPE_DIARIO,
  minutosValidos,
  inicioCita,
  inicioDelDia,
  debeAvisar,
  horaTexto,
  datosCorreo,
}
```

- [ ] **Step 4: Correr el test y verlo pasar; agregarlo a `npm test`**

Run: `cd backend && node src/services/recordatorioCitaReglas.test.js`
Expected: `recordatorioCitaReglas.test.js: todos los tests pasaron ✔`
Luego agregar ` && node src/services/recordatorioCitaReglas.test.js` al final del script `test` en `backend/package.json` y correr `npm test` (todo pasa).

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/recordatorioCitaReglas.js backend/src/services/recordatorioCitaReglas.test.js backend/package.json
git commit -m "feat(agenda): reglas del recordatorio de cita (ventana, rango y contenido)"
```

---

### Task 3: Plantilla del correo

**Files:**
- Modify: `backend/src/services/emailService.js` (nueva función antes de `module.exports` y exportarla)
- Test: `backend/src/services/emailRecordatorioCita.test.js`
- Modify: `backend/package.json` (agregar el test al script `test`)

**Interfaces:**
- Consumes: el objeto de `datosCorreo` (Task 2).
- Produces: `armarEmailRecordatorioCita({ nombreProfesional, datos }) → { asunto, html, texto }` y `enviarEmailRecordatorioCita({ para, nombreProfesional, datos }) → Promise<{ enviado: boolean }>` (lanza si SMTP falla).

- [ ] **Step 1: Test que falla**

```js
// Tests de la plantilla del recordatorio de cita.
const assert = require('assert')
const { armarEmailRecordatorioCita } = require('./emailService')

const datos = {
  asunto: 'Cita a las 10:00 a. m.: <b>Luna</b> & Co (consulta general)',
  hora: '10:00 a. m.', fechaISO: '2026-10-17',
  paciente: '<script>x</script>', especie: 'Perro',
  tutor: 'Ana & Juan', celularTutor: '3001234567',
  motivo: 'Vacuna', tipo: 'consulta general', consultorio: null,
  urlAgenda: 'https://app.bourgelat.co/agenda?fecha=2026-10-17',
}
const correo = armarEmailRecordatorioCita({ nombreProfesional: 'Dra. Indira', datos })

assert.strictEqual(correo.asunto, datos.asunto) // el asunto es texto plano, no HTML
assert.ok(!correo.html.includes('<script>'))
assert.ok(correo.html.includes('&lt;script&gt;'))
assert.ok(correo.html.includes('Ana &amp; Juan'))
assert.ok(correo.html.includes('https://app.bourgelat.co/agenda?fecha=2026-10-17'))
assert.ok(!correo.html.includes('Consultorio')) // sin consultorio no hay fila
assert.ok(correo.texto.includes('3001234567'))

console.log('emailRecordatorioCita.test.js: todos los tests pasaron ✔')
```

- [ ] **Step 2: Correrlo y ver que falla**

Run: `cd backend && node src/services/emailRecordatorioCita.test.js`
Expected: FAIL `armarEmailRecordatorioCita is not a function`

- [ ] **Step 3: Implementar en `emailService.js`** (después de `enviarEmailCodigoVerificacion`)

```js
// Aviso al profesional asignado antes de su cita (job recordatoriosCita).
// Solo datos de agenda: nada de la historia clínica.
const armarEmailRecordatorioCita = ({ nombreProfesional, datos }) => {
  const e = escaparHtml
  const filas = [
    ['Hora', datos.hora],
    ['Paciente', `${datos.paciente}${datos.especie ? ` (${datos.especie})` : ''}`],
    ['Tutor', datos.tutor],
    ['Celular', datos.celularTutor],
    ['Motivo', datos.motivo],
    ['Tipo', datos.tipo],
    ['Consultorio', datos.consultorio],
  ].filter(([, valor]) => valor)

  const texto = `Hola ${nombreProfesional},

Tienes una cita:
${filas.map(([etiqueta, valor]) => `${etiqueta}: ${valor}`).join('\n')}

Ver en la agenda: ${datos.urlAgenda}`

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 520px; margin: 0 auto; color: #112739;">
      <h2 style="color: #112739;">Tienes una cita a las ${e(datos.hora)}</h2>
      <p>Hola ${e(nombreProfesional)},</p>
      <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
        ${filas.map(([etiqueta, valor]) => `
        <tr>
          <td style="padding: 6px 12px 6px 0; font-size: 13px; color: #51697d; white-space: nowrap;">${etiqueta}</td>
          <td style="padding: 6px 0; font-size: 15px;">${e(valor)}</td>
        </tr>`).join('')}
      </table>
      <p style="margin: 24px 0;">
        <a href="${e(datos.urlAgenda)}" style="background: #112739; color: #ffffff; padding: 12px 20px; text-decoration: none; display: inline-block;">Ver en la agenda</a>
      </p>
      <p style="font-size: 12px; color: #51697d;">Recibes este aviso porque tu clínica tiene activos los recordatorios de citas en Configuración.</p>
    </div>
  `
  return { asunto: datos.asunto, html, texto }
}

const enviarEmailRecordatorioCita = ({ para, nombreProfesional, datos }) =>
  enviarEmail({ para, ...armarEmailRecordatorioCita({ nombreProfesional, datos }) })
```

Agregar `armarEmailRecordatorioCita` y `enviarEmailRecordatorioCita` al `module.exports`.

- [ ] **Step 4: Ver pasar y sumar a `npm test`**

Run: `cd backend && node src/services/emailRecordatorioCita.test.js` → PASS. Agregar ` && node src/services/emailRecordatorioCita.test.js` al script `test`; `npm test` → todo pasa.

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/emailService.js backend/src/services/emailRecordatorioCita.test.js backend/package.json
git commit -m "feat(agenda): plantilla del correo de recordatorio de cita"
```

---

### Task 4: Job de envío

**Files:**
- Create: `backend/src/jobs/recordatoriosCita.js`
- Modify: `backend/src/index.js` (bloque «Jobs de limpieza», ~línea 264)

**Interfaces:**
- Consumes: `inicioCita`, `debeAvisar`, `inicioDelDia`, `datosCorreo`, `TOPE_DIARIO` (Task 2); `enviarEmailRecordatorioCita` (Task 3); `obtenerSuscripcionActivaClinica(clinicaId, { transaction } = {})` de `services/suscripcionService.js` (devuelve la suscripción con `.estado` o `null`); `hoyISO(ahora)`, `sumarDiasISO(fechaISO, dias)` de `utils/vencimiento.js`.
- Produces: `enviarRecordatoriosCita({ ahora = new Date() } = {}) → Promise<{ enviados, fallidos }>` y `INTERVALO_MS = 5 * 60 * 1000`.

- [ ] **Step 1: Implementar el job**

```js
// Envía por correo el aviso de cada cita al profesional asignado, con la
// anticipación que eligió la clínica. Corre cada 5 minutos desde index.js.
// Diseño: docs/superpowers/specs/2026-10-17-recordatorios-cita-design.md
const { Op } = require('sequelize')
const sequelize = require('../config/database')
const Cita = require('../models/Cita')
const Clinica = require('../models/Clinica')
const Mascota = require('../models/Mascota')
const Propietario = require('../models/Propietario')
const Usuario = require('../models/Usuario')
const Consultorio = require('../models/Consultorio')
const { obtenerSuscripcionActivaClinica } = require('../services/suscripcionService')
const { enviarEmailRecordatorioCita } = require('../services/emailService')
const { hoyISO, sumarDiasISO } = require('../utils/vencimiento')
const {
  TOPE_DIARIO, inicioCita, inicioDelDia, debeAvisar, datosCorreo,
} = require('../services/recordatorioCitaReglas')
const logger = require('../utils/logger')

const INTERVALO_MS = 5 * 60 * 1000
const ESTADOS_QUE_AVISAN = ['prueba', 'activa']

let corriendo = false
let diaTopeAvisado = null

const contarEnviadosHoy = (hoy) =>
  Cita.count({
    where: { recordatorioProfesionalEnviadoEn: { [Op.gte]: inicioDelDia(hoy) } },
    sinTenant: true,
  })

// Marca antes de enviar: si otra corrida ya la tomó o cambió de estado, no
// actualiza ninguna fila y se salta.
const tomarCita = async (citaId) => {
  const [, filas] = await sequelize.query(
    `UPDATE citas SET "recordatorioProfesionalEnviadoEn" = now()
     WHERE id = :id AND "recordatorioProfesionalEnviadoEn" IS NULL AND estado = 'programada'`,
    { replacements: { id: citaId } }
  )
  return filas > 0
}

const soltarCita = (citaId) =>
  sequelize.query(
    `UPDATE citas SET "recordatorioProfesionalEnviadoEn" = NULL WHERE id = :id`,
    { replacements: { id: citaId } }
  )

const enviarRecordatoriosCita = async ({ ahora = new Date() } = {}) => {
  if (corriendo) return { enviados: 0, fallidos: 0 }
  corriendo = true
  let enviados = 0
  let fallidos = 0
  try {
    const hoy = hoyISO(ahora)
    const candidatas = await Cita.findAll({
      where: {
        estado: 'programada',
        origen: 'programada',
        recordatorioProfesionalEnviadoEn: null,
        fecha: { [Op.between]: [hoy, sumarDiasISO(hoy, 2)] },
      },
      include: [
        { model: Clinica, attributes: ['id', 'recordatorioCitaActivo', 'recordatorioCitaMinutos'], where: { recordatorioCitaActivo: true } },
        { model: Usuario, as: 'veterinario', attributes: ['id', 'nombre', 'email', 'activo'], where: { activo: true } },
        { model: Mascota, as: 'mascota', attributes: ['id', 'nombre', 'especie'] },
        { model: Propietario, as: 'propietario', attributes: ['id', 'nombre', 'telefono'] },
        { model: Consultorio, as: 'consultorio', attributes: ['id', 'nombre'], required: false },
      ],
      sinTenant: true,
    })

    const enVentana = candidatas.filter((cita) =>
      debeAvisar({ inicio: inicioCita(cita), ahora, minutos: cita.Clinica.recordatorioCitaMinutos })
    )
    if (enVentana.length === 0) return { enviados, fallidos }

    let restantes = TOPE_DIARIO - (await contarEnviadosHoy(hoy))
    const suscripciones = new Map()
    // Misma resolución que authController (urlFrontend) para los enlaces de correo.
    const urlFrontend = (
      process.env.OAUTH_FRONTEND_URL ||
      process.env.FRONTEND_URLS?.split(',')[0] ||
      process.env.FRONTEND_URL ||
      'https://app.bourgelat.co'
    ).replace(/\/$/, '')

    for (const cita of enVentana) {
      if (restantes <= 0) {
        if (diaTopeAvisado !== hoy) {
          diaTopeAvisado = hoy
          logger.warn({ contexto: 'recordatorio-cita', mensaje: `Tope diario de ${TOPE_DIARIO} avisos alcanzado` })
        }
        break
      }

      if (!suscripciones.has(cita.clinicaId)) {
        const suscripcion = await obtenerSuscripcionActivaClinica(cita.clinicaId)
        suscripciones.set(cita.clinicaId, ESTADOS_QUE_AVISAN.includes(suscripcion?.estado))
      }
      if (!suscripciones.get(cita.clinicaId)) continue

      if (!(await tomarCita(cita.id))) continue

      try {
        await enviarEmailRecordatorioCita({
          para: cita.veterinario.email,
          nombreProfesional: cita.veterinario.nombre,
          datos: datosCorreo({
            cita, mascota: cita.mascota, propietario: cita.propietario,
            consultorio: cita.consultorio, urlFrontend,
          }),
        })
        enviados += 1
        restantes -= 1
      } catch (error) {
        fallidos += 1
        await soltarCita(cita.id)
        logger.error({
          contexto: 'recordatorio-cita',
          mensaje: `No se pudo enviar el aviso: ${error.message}`,
          citaId: cita.id,
          clinicaId: cita.clinicaId,
        })
      }
    }

    if (enviados > 0 || fallidos > 0) {
      logger.info({ contexto: 'recordatorio-cita', mensaje: `Avisos enviados: ${enviados}, fallidos: ${fallidos}` })
    }
    return { enviados, fallidos }
  } catch (error) {
    logger.error({ contexto: 'recordatorio-cita', mensaje: `Error en la corrida: ${error.message}` })
    return { enviados, fallidos }
  } finally {
    corriendo = false
  }
}

module.exports = { enviarRecordatoriosCita, INTERVALO_MS }
```

Notas: `Cita.belongsTo(Clinica, { foreignKey: 'clinicaId' })` no tiene alias, por eso el include se lee como `cita.Clinica`. `fecha` es DATEONLY (`'YYYY-MM-DD'`) y `horaInicio` TIME (`'HH:MM:SS'`), así que `inicioCita(cita)` funciona con la instancia directa. El `afterFind` de `Cita` ya descifra al propietario incluido (`models/Cita.js:154`), por eso se usa Sequelize y no SQL crudo para leer. La URL de la agenda se resuelve igual que `urlFrontend()` en `authController.js:724`.

- [ ] **Step 2: Registrar en `index.js`**

Junto a los requires de jobs (línea ~20):

```js
const { enviarRecordatoriosCita, INTERVALO_MS: INTERVALO_RECORDATORIOS_CITA } = require('./jobs/recordatoriosCita')
```

Al final del bloque `// ── Jobs de limpieza ─────` (después del último `setInterval`):

```js
    // ── Recordatorio de citas al profesional ────────────
    enviarRecordatoriosCita()
    setInterval(enviarRecordatoriosCita, INTERVALO_RECORDATORIOS_CITA)
```

- [ ] **Step 3: Probar la corrida en local sin enviar**

Con `SMTP_HOST` vacío en `backend/.env`, `emailService` registra el correo en el log en vez de enviarlo. Crear con un script en el scratchpad (no en el repo) una cita de prueba local para dentro de 20 minutos en una clínica de prueba propia (regla: datos propios, borrarlos en `finally`), y correr:

`cd backend && node -e "require('dotenv').config();require('./src/config/timezone');const {enviarRecordatoriosCita}=require('./src/jobs/recordatoriosCita');enviarRecordatoriosCita().then(r=>{console.log(r);process.exit(0)})"`

Expected: `{ enviados: 1, fallidos: 0 }` y en el log `SMTP no configurado; email no enviado. ... Asunto: Cita a las ...`. Segunda corrida: `{ enviados: 0, fallidos: 0 }` (ya marcada). Si `tenantGuard` rechaza alguna query, falta `sinTenant: true`.

- [ ] **Step 4: `npm test` y lint**

Run: `cd backend && npm test && npx eslint src/jobs/recordatoriosCita.js src/index.js`
Expected: todo pasa.

- [ ] **Step 5: Commit**

```bash
git add backend/src/jobs/recordatoriosCita.js backend/src/index.js
git commit -m "feat(agenda): job que envía el recordatorio de cita cada 5 minutos"
```

---

### Task 5: Reprogramar vuelve a programar el aviso

**Files:**
- Modify: `backend/src/controllers/citaController.js` (`reprogramarCita`, el `cita.update` ~línea 663)

**Interfaces:**
- Consumes: campo `recordatorioProfesionalEnviadoEn` (Task 1).

- [ ] **Step 1: Cambiar el update**

```js
      // Vuelve a 'programada': la llegada registrada (si estaba en espera) era
      // de la visita anterior. Sin limpiarla, la sala de espera la ordena por
      // esa hora y al volver a marcar la llegada se conserva la vieja.
      // El aviso al profesional se reprograma para la nueva hora.
      await cita.update(
        { fecha, horaInicio, horaFin, estado: 'programada', horaLlegada: null, recordatorioProfesionalEnviadoEn: null },
        { transaction }
      );
```

- [ ] **Step 2: Verificar en local**

Con la cita de prueba de la Task 4 ya marcada, reprogramarla por la API local (`PUT /api/citas/:id/reprogramar`, ver la ruta exacta con `grep -n reprogramar backend/src/routes/citaRoutes.js`) a 25 minutos más tarde y consultar `SELECT "recordatorioProfesionalEnviadoEn" FROM citas WHERE id = '<id>'` → `NULL`. Correr el job otra vez → `{ enviados: 1 }`.

- [ ] **Step 3: Commit**

```bash
git add backend/src/controllers/citaController.js
git commit -m "feat(agenda): reprogramar una cita vuelve a programar su recordatorio"
```

---

### Task 6: API de configuración

**Files:**
- Modify: `backend/src/controllers/clinicaController.js` (`serializarClinica` + nueva función `actualizarRecordatoriosCita` + export)
- Modify: `backend/src/routes/clinicaRoutes.js` (ruta nueva antes de `module.exports`)

**Interfaces:**
- Consumes: `MINUTOS_MIN`, `MINUTOS_MAX` (Task 2).
- Produces: `PUT /api/clinica/recordatorios-cita` body `{ activo: boolean, minutos: integer }` → `200 { message, recordatorioCitaActivo, recordatorioCitaMinutos }`; `GET /api/clinica` incluye `clinica.recordatorioCitaActivo` y `clinica.recordatorioCitaMinutos`.

- [ ] **Step 1: Serializar los campos**

En `serializarClinica`, después de `horarioAtencion`:

```js
    recordatorioCitaActivo: clinica.recordatorioCitaActivo,
    recordatorioCitaMinutos: clinica.recordatorioCitaMinutos,
```

- [ ] **Step 2: Controlador** (después de `actualizarHorarioAtencion`)

```js
const actualizarRecordatoriosCita = async (req, res) => {
  try {
    const { clinicaId } = req.usuario
    const clinica = await Clinica.findByPk(clinicaId)
    if (!clinica) {
      return res.status(404).json({ message: 'Clinica no encontrada' })
    }

    const datosAnteriores = {
      recordatorioCitaActivo: clinica.recordatorioCitaActivo,
      recordatorioCitaMinutos: clinica.recordatorioCitaMinutos,
    }
    const datosNuevos = {
      recordatorioCitaActivo: req.body.activo,
      recordatorioCitaMinutos: req.body.minutos,
    }

    await clinica.update(datosNuevos)

    await registrarAuditoria({
      accion: 'ACTUALIZAR_RECORDATORIOS_CITA',
      entidad: 'Clinica',
      entidadId: clinica.id,
      descripcion: 'Recordatorios de citas actualizados desde configuracion',
      datosAnteriores,
      datosNuevos,
      req,
      resultado: 'exitoso',
    })

    res.json({
      message: 'Recordatorios de citas actualizados',
      recordatorioCitaActivo: clinica.recordatorioCitaActivo,
      recordatorioCitaMinutos: clinica.recordatorioCitaMinutos,
    })
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
}
```

Exportarla en `module.exports` del controlador. Si `registrarAuditoria` valida `accion` contra una lista o ENUM (`grep -rn "ACTUALIZAR_HORARIO_ATENCION" backend/src`), agregar `ACTUALIZAR_RECORDATORIOS_CITA` donde esté la otra.

- [ ] **Step 3: Ruta** (en `clinicaRoutes.js`; importar `actualizarRecordatoriosCita` del controlador y `{ MINUTOS_MIN, MINUTOS_MAX }` de `../services/recordatorioCitaReglas`)

```js
router.put(
  '/recordatorios-cita',
  verificarToken,
  verificarRol('admin', 'superadmin'),
  requerirEscritura,
  [
    body('activo').isBoolean({ strict: true }).withMessage('Indica si los recordatorios están activos'),
    body('minutos')
      .isInt({ min: MINUTOS_MIN, max: MINUTOS_MAX })
      .withMessage('Elige entre 15 minutos y 48 horas')
      .toInt(),
    validar,
  ],
  actualizarRecordatoriosCita
)
```

- [ ] **Step 4: Verificar con la API local**

Con sesión admin de una clínica de prueba local, `PUT http://localhost:3000/api/clinica/recordatorios-cita`:
- `{ "activo": true, "minutos": 90 }` → 200 y `GET /api/clinica` devuelve 90.
- `{ "activo": true, "minutos": 10 }` → 400 «Elige entre 15 minutos y 48 horas».
- `{ "activo": "si", "minutos": 60 }` → 400.
- Sesión de un usuario no admin → 403.
Luego `cd backend && npm test`.

- [ ] **Step 5: Commit**

```bash
git add backend/src/controllers/clinicaController.js backend/src/routes/clinicaRoutes.js
git commit -m "feat(configuracion): endpoint para los recordatorios de citas"
```

---

### Task 7: Sección «Recordatorios» en Configuración

**Files:**
- Create: `frontend/src/features/configuracion/recordatorioCita.js` (conversión y esquema)
- Test: `frontend/src/features/configuracion/recordatorioCita.test.js`
- Create: `frontend/src/features/configuracion/RecordatoriosCitaSection.jsx`
- Modify: `frontend/src/features/configuracion/configuracionApi.js` (método nuevo)
- Modify: `frontend/src/pages/ConfiguracionPage.jsx` (opción en `sectionOptions` ~línea 414 y render junto a `horarios` ~línea 981)

**Interfaces:**
- Consumes: `PUT /clinica/recordatorios-cita` y `clinica.recordatorioCitaActivo/Minutos` (Task 6).
- Produces: `desdeMinutos(min) → { cantidad: number, unidad: 'minutos'|'horas' }`, `aMinutos({ cantidad, unidad }) → number`, `esquemaRecordatorioCita` (Zod), componente `RecordatoriosCitaSection({ clinica })`.

- [ ] **Step 1: Test que falla**

```js
import { describe, expect, it } from 'vitest'
import { aMinutos, desdeMinutos, esquemaRecordatorioCita } from './recordatorioCita'

describe('recordatorioCita', () => {
  it('muestra en horas los múltiplos de 60 y en minutos el resto', () => {
    expect(desdeMinutos(60)).toEqual({ cantidad: 1, unidad: 'horas' })
    expect(desdeMinutos(2880)).toEqual({ cantidad: 48, unidad: 'horas' })
    expect(desdeMinutos(90)).toEqual({ cantidad: 90, unidad: 'minutos' })
    expect(desdeMinutos(undefined)).toEqual({ cantidad: 1, unidad: 'horas' })
  })

  it('convierte a minutos, incluidas horas con decimales', () => {
    expect(aMinutos({ cantidad: 2, unidad: 'horas' })).toBe(120)
    expect(aMinutos({ cantidad: 1.5, unidad: 'horas' })).toBe(90)
    expect(aMinutos({ cantidad: 45, unidad: 'minutos' })).toBe(45)
  })

  it('acepta de 15 minutos a 48 horas', () => {
    const ok = (cantidad, unidad) => esquemaRecordatorioCita.safeParse({ activo: true, cantidad, unidad }).success
    expect(ok(15, 'minutos')).toBe(true)
    expect(ok(48, 'horas')).toBe(true)
    expect(ok(1.5, 'horas')).toBe(true)
    expect(ok(10, 'minutos')).toBe(false)
    expect(ok(49, 'horas')).toBe(false)
    expect(ok(0, 'horas')).toBe(false)
    expect(ok(20.5, 'minutos')).toBe(false)
  })

  it('apagado no valida la anticipación', () => {
    expect(esquemaRecordatorioCita.safeParse({ activo: false, cantidad: 0, unidad: 'minutos' }).success).toBe(true)
  })
})
```

- [ ] **Step 2: Ver que falla**

Run: `cd frontend && npx vitest run src/features/configuracion/recordatorioCita.test.js`
Expected: FAIL, no se encuentra el módulo.

- [ ] **Step 3: Implementar `recordatorioCita.js`**

```js
import { z } from 'zod'

// Mismo rango que el backend (services/recordatorioCitaReglas.js).
export const MINUTOS_MIN = 15
export const MINUTOS_MAX = 2880
export const MINUTOS_POR_DEFECTO = 60

export const desdeMinutos = (minutos = MINUTOS_POR_DEFECTO) => {
  const total = Number.isInteger(minutos) ? minutos : MINUTOS_POR_DEFECTO
  return total % 60 === 0 ? { cantidad: total / 60, unidad: 'horas' } : { cantidad: total, unidad: 'minutos' }
}

export const aMinutos = ({ cantidad, unidad }) =>
  Math.round(Number(cantidad) * (unidad === 'horas' ? 60 : 1))

export const esquemaRecordatorioCita = z
  .object({
    activo: z.boolean(),
    cantidad: z.coerce.number(),
    unidad: z.enum(['minutos', 'horas']),
  })
  .superRefine((valores, ctx) => {
    if (!valores.activo) return
    const total = Number(valores.cantidad) * (valores.unidad === 'horas' ? 60 : 1)
    if (!Number.isInteger(total) || total < MINUTOS_MIN || total > MINUTOS_MAX) {
      ctx.addIssue({ code: 'custom', path: ['cantidad'], message: 'Elige entre 15 minutos y 48 horas' })
    }
  })
```

Run el test → PASS.

- [ ] **Step 4: Método de API** (en `configuracionApi`, después de `actualizarHorarioAtencion`)

```js
  async actualizarRecordatoriosCita({ activo, minutos }) {
    const { data } = await api.put('/clinica/recordatorios-cita', { activo, minutos })
    return data
  },
```

- [ ] **Step 5: Componente `RecordatoriosCitaSection.jsx`**

```jsx
import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { BellRing } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { DashboardPanel } from '@/features/dashboard/dashboardComponents'
import { configuracionApi } from './configuracionApi'
import { aMinutos, desdeMinutos, esquemaRecordatorioCita } from './recordatorioCita'
import { invalidarDominios } from '@/lib/queryKeys'

const INPUT_CLASS =
  'h-11 w-24 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary disabled:opacity-50'

const valoresIniciales = (clinica) => ({
  activo: clinica?.recordatorioCitaActivo ?? true,
  ...desdeMinutos(clinica?.recordatorioCitaMinutos),
})

export default function RecordatoriosCitaSection({ clinica }) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, reset, control, setValue, formState: { errors, isDirty } } = useForm({
    resolver: zodResolver(esquemaRecordatorioCita),
    defaultValues: valoresIniciales(clinica),
  })
  const activo = useWatch({ control, name: 'activo' })
  const unidad = useWatch({ control, name: 'unidad' })

  useEffect(() => {
    reset(valoresIniciales(clinica))
  }, [clinica, reset])

  const guardar = useMutation({
    mutationFn: configuracionApi.actualizarRecordatoriosCita,
    onSuccess: (data) => {
      toast.success(data?.message || 'Recordatorios de citas actualizados')
      invalidarDominios(queryClient, 'configuracion')
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.errores?.[0]?.mensaje ||
          error?.response?.data?.message ||
          'No fue posible guardar los recordatorios.'
      )
    },
  })

  const onSubmit = (valores) =>
    guardar.mutate({
      activo: valores.activo,
      // Apagado se conserva la anticipación guardada.
      minutos: valores.activo ? aMinutos(valores) : clinica?.recordatorioCitaMinutos ?? 60,
    })

  return (
    <DashboardPanel
      title="Recordatorios de citas"
      subtitle="Bourgelat le envía un correo a quien atiende cada cita, con la anticipación que elijas."
      action={<BellRing className="h-4 w-4 text-primary" />}
    >
      <form className="grid gap-5" onSubmit={handleSubmit(onSubmit)}>
        <label className="flex items-center gap-3 text-sm text-foreground">
          <input type="checkbox" className="h-4 w-4 accent-primary" {...register('activo')} />
          Enviar recordatorio por correo a quien atiende la cita
        </label>

        <div className="grid gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Anticipación
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="number"
              step="any"
              min="0"
              disabled={!activo}
              className={INPUT_CLASS}
              aria-label="Cantidad"
              {...register('cantidad')}
            />
            <Select
              value={unidad}
              onValueChange={(valor) => setValue('unidad', valor, { shouldDirty: true, shouldValidate: true })}
              options={[{ value: 'minutos', label: 'minutos' }, { value: 'horas', label: 'horas' }]}
              disabled={!activo}
            />
            <span className="text-sm text-muted-foreground">antes de la cita</span>
          </div>
          {errors.cantidad ? <p className="text-sm text-danger">{errors.cantidad.message}</p> : null}
          <p className="text-xs leading-6 text-muted-foreground">
            Entre 15 minutos y 48 horas. Si la cita se agenda con menos tiempo, el aviso sale enseguida.
          </p>
        </div>

        <div>
          <Button type="submit" disabled={guardar.isPending || !isDirty}>
            {guardar.isPending ? 'Guardando...' : 'Guardar recordatorios'}
          </Button>
        </div>
      </form>
    </DashboardPanel>
  )
}
```

Ojo con `disabled` en el input numérico: React Hook Form no valida ni envía campos deshabilitados con `register` (quedan `undefined`). Por eso el esquema ignora `cantidad` cuando `activo` es false y `onSubmit` usa los minutos guardados. Si `Select` no acepta `disabled`, revisar `frontend/src/components/ui/select.jsx` (la función `Select` debe reenviarlo a `SelectPrimitive.Root`; si no, agregarlo a sus props).

- [ ] **Step 6: Conectar en `ConfiguracionPage.jsx`**

Import: `import RecordatoriosCitaSection from '@/features/configuracion/RecordatoriosCitaSection'`.
En `sectionOptions`, después de `horarios`:

```js
    { id: 'recordatorios', label: 'Recordatorios', helper: 'Aviso por correo antes de cada cita' },
```

Después del bloque `{activeSection === 'horarios' ? (...) : null}`:

```jsx
      {activeSection === 'recordatorios' ? <RecordatoriosCitaSection clinica={initialClinica} /> : null}
```

- [ ] **Step 7: Verificar**

Run: `cd frontend && npx vitest run src/features/configuracion && npx eslint src/features/configuracion src/pages/ConfiguracionPage.jsx && npm run lint:colores`
Expected: todo pasa.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/features/configuracion frontend/src/pages/ConfiguracionPage.jsx
git commit -m "feat(configuracion): sección para elegir la anticipación del recordatorio de citas"
```

---

### Task 8: Prueba de punta a punta y PR

**Files:** ninguno nuevo en el repo (scripts de datos de prueba en el scratchpad).

- [ ] **Step 1: Pantalla en Claude in Chrome (local)**

Con `npm run dev` en backend y frontend, entrar con el admin de una clínica de prueba local → Configuración → Recordatorios: guardar 90 minutos (recargar: muestra 90 minutos), 2 horas (recargar: 2 horas), intentar 10 minutos y 49 horas (mensaje «Elige entre 15 minutos y 48 horas», sin petición de red), apagar (campo deshabilitado; guarda), volver a encender. Revisar en tema oscuro y a 390 px de ancho que nada desborde.

- [ ] **Step 2: Correo real**

Si `backend/.env` local tiene SMTP de Brevo; si no, validar con el log «SMTP no configurado»: anticipación 30 min, cita para dentro de 20 min asignada a un usuario de prueba cuyo correo es de Roman → llega el correo con hora, paciente, tutor y botón a la agenda; reprogramar 25 min más tarde → vuelve a llegar cuando entra en ventana; apagar el interruptor y crear otra cita en ventana → no llega. Borrar los datos de prueba en `finally`.

- [ ] **Step 3: Tests completos**

Run: `cd backend && npm test` y `cd frontend && npx vitest run && npm run lint && npm run lint:colores`
Expected: todo pasa.

- [ ] **Step 4: Push y PR a develop**

```bash
git push -u origin feat/recordatorios-cita
gh pr create --base develop --title "feat(agenda): recordatorio de cita por correo al profesional" --body "Qué hace, dónde se configura, migración 20261017_000001 y cómo se probó (tests + E2E local + Chrome)."
```

- [ ] **Step 5: Pendientes**

Actualizar `pendientes/PENDIENTES.md`: PR abierto; tras el release, revisar en logs de Render `contexto: 'recordatorio-cita'` y avisar a Pegatos y Agropatitas (1 hora por defecto, se cambia en Configuración → Recordatorios).
