# Modelo de precios de plan único — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar la segmentación de planes por funcionalidad por un plan único pago con prueba de 30 días, donde al vencerse la clínica queda en solo lectura sin perder datos.

**Architecture:** El plan pasa a decir *qué se compró* y el estado *si se puede escribir*. `planes.js` se reduce a cuatro planes ofrecidos mientras `PLAN_KEYS` conserva las llaves legado para no destruir el ENUM de Postgres. Un middleware `requerirEscritura` marcado explícitamente en cada router de mutación bloquea la escritura en `solo_lectura`, y un analizador estático de los archivos de rutas falla el arranque en desarrollo si alguna ruta de mutación quedó sin marcar.

**Tech Stack:** Node 24 + Express 5, Sequelize 6 sobre PostgreSQL 16, React 19 + Vite 8, Zustand, React Query. Tests de backend con `node:assert` ejecutados por `npm test`; tests de frontend con Vitest.

## Global Constraints

- Precio base: **$89.000/mes**, **$75.000/mes** anual anticipado, **3 usuarios incluidos**, **20 GB**.
- Usuario adicional: **$25.000/mes**. El cobro se deriva como `limiteUsuarios - 3`; **no** se crea columna de usuarios adicionales.
- Prueba: **30 días**, **2 usuarios**, **2 GB**, sin tarjeta.
- Add-on DIAN: **$49.000/mes**, **200 documentos** incluidos, **$250** por excedente. **No se construye en este plan** — solo la llave técnica y el precio. En la UI aparece como "Próximamente".
- `facturacion_electronica` **nunca** aparece en las funcionalidades de un plan; se agrega a la fila de suscripción al comprar el add-on.
- Volumen ilimitado: **no** se enforza `limiteMascotas`, historias, citas ni facturas internas.
- Al vencer: **solo lectura indefinida**. Los datos **nunca** se borran ni se archivan.
- Las migraciones son **aditivas**: no se elimina ningún valor de ENUM ni ninguna columna.
- `cortesia` tiene vigencia `2099-12-31`.
- Todo identificador y comentario de código va **sin tildes** (convención existente del backend). Los textos de UI visibles al usuario **sí** llevan tildes.
- No incluir atribución a Claude en commits ni PRs.

## File Structure

**Backend — se crean:**
- `backend/src/config/planes.test.js` — verifica la forma de los planes y la ausencia de DIAN.
- `backend/src/middlewares/suscripcionMiddleware.test.js` — verifica `requerirEscritura` con dobles de req/res.
- `backend/src/config/escrituraGuard.js` — analiza estáticamente los archivos de rutas y reporta mutaciones sin proteger.
- `backend/src/config/escrituraGuard.test.js` — verifica el analizador con fixtures en memoria.
- `backend/src/services/suscripcionService.test.js` — verifica la decisión de vencimiento, sin base de datos.
- `backend/src/services/almacenamientoService.js` y su test.
- `backend/src/migrations/20260813_000001_modelo_plan_unico.js`
- `backend/src/migrations/20260813_000002_add_almacenamiento_usado_clinicas.js`

**Backend — se modifican:**
- `backend/src/config/planes.js` — cuatro planes ofrecidos, llaves legado conservadas.
- `backend/src/models/Suscripcion.js` — estado `solo_lectura`, default `prueba`, `documentosDianIncluidos`.
- `backend/src/models/Clinica.js` — contador `almacenamientoUsadoMB`.
- `backend/src/services/suscripcionService.js` — vencimiento a solo lectura, decisión extraída a función pura.
- `backend/src/middlewares/suscripcionMiddleware.js` — `requerirEscritura`, `FEATURE_LABELS` podado.
- `backend/src/middlewares/uploadProductoFotoMiddleware.js` y `uploadMascotaPhotoMiddleware.js` — cupo de almacenamiento.
- `backend/src/controllers/mascotaController.js` — se elimina el cupo de mascotas.
- `backend/src/controllers/authController.js` — el registro crea suscripción de prueba.
- `backend/src/index.js` — llamada al analizador en arranque no productivo.
- `backend/package.json` — nuevos archivos de test en el script `test`.
- Los archivos de `backend/src/routes/` con rutas de mutación.

**Frontend — se crean:**
- `frontend/src/lib/suscripcion.js` — helpers puros de estado de suscripción.
- `frontend/src/lib/suscripcion.test.js`
- `frontend/src/components/shared/SuscripcionBanner.jsx` — banner de prueba y de solo lectura.

**Frontend — se modifican:**
- `frontend/src/lib/api.js` — manejo centralizado de `SUBSCRIPTION_READ_ONLY`.
- `frontend/src/pages/PlanesPage.jsx` — un plan más add-on, sin tabla comparativa de cuatro columnas.
- `frontend/src/components/layout/AdminShell.jsx` — monta el banner.
- Las 9 páginas que consultan `funcionalidades` — se poda todo salvo el chequeo de DIAN.
- `frontend/src/pages/SuperadminPage.jsx` — nuevas llaves de plan.

---

# Fase 1 — Backend: planes, estado y guard

### Task 1: Reducir `planes.js` a los cuatro planes ofrecidos

**Files:**
- Modify: `backend/src/config/planes.js`
- Modify: `backend/package.json` (script `test`)
- Test: `backend/src/config/planes.test.js`

**Interfaces:**
- Consumes: nada.
- Produces: `PLAN_KEYS: string[]`, `PLAN_KEYS_ACTIVOS: string[]`, `PLANES: Record<string, PlanConfig>`, `PLANES_PUBLICOS`, `DEFAULT_INITIAL_PLAN: 'prueba'`, `DIAS_PRUEBA: 30`, `USUARIOS_BASE: 3`, `PRECIO_USUARIO_ADICIONAL: 25000`, `DOCUMENTOS_DIAN_INCLUIDOS: 200`, `FUNCIONALIDAD_DIAN: 'facturacion_electronica'`, `CORTESIA_END_DATE: '2099-12-31'`, `FUNCIONALIDADES_COMPLETAS: string[]`, `crearSuscripcionPrueba(clinicaId) => object`, `crearSuscripcionCortesia(clinicaId) => object`, y las ya existentes `obtenerPlan`, `construirSuscripcion`, `formatDateOnly`, `addDaysDateOnly`.

- [ ] **Step 1: Escribir el test que falla**

Crear `backend/src/config/planes.test.js`:

```js
// Tests de la configuracion de planes. Se ejecutan con `node src/config/planes.test.js`
// (integrados en `npm test`). No requieren base de datos.

const assert = require('assert')
const {
  PLAN_KEYS,
  PLAN_KEYS_ACTIVOS,
  PLANES,
  PLANES_PUBLICOS,
  DEFAULT_INITIAL_PLAN,
  DIAS_PRUEBA,
  USUARIOS_BASE,
  FUNCIONALIDAD_DIAN,
  CORTESIA_END_DATE,
  crearSuscripcionPrueba,
  crearSuscripcionCortesia,
  formatDateOnly,
  addDaysDateOnly,
} = require('./planes')

// ── El ENUM conserva las llaves legado ────────────────────────────────────
// Postgres no permite eliminar valores de un ENUM sin recrear el tipo, y hay
// filas de pilotos apuntando a 'inicio'.
for (const legado of ['inicio', 'clinica', 'profesional']) {
  assert.ok(PLAN_KEYS.includes(legado), `PLAN_KEYS debe conservar '${legado}' para el ENUM`)
  assert.ok(!PLAN_KEYS_ACTIVOS.includes(legado), `'${legado}' no debe ofrecerse`)
  assert.strictEqual(PLANES[legado], undefined, `'${legado}' no debe tener configuracion`)
}

// ── Los cuatro planes ofrecidos ───────────────────────────────────────────
assert.deepStrictEqual(
  PLAN_KEYS_ACTIVOS,
  ['prueba', 'activo', 'cortesia', 'personalizado'],
  'planes ofrecidos'
)
assert.deepStrictEqual(Object.keys(PLANES).sort(), [...PLAN_KEYS_ACTIVOS].sort())
assert.strictEqual(DEFAULT_INITIAL_PLAN, 'prueba')

// ── Ningun plan incluye DIAN ──────────────────────────────────────────────
// Es la unica funcionalidad que se compra aparte; se agrega a la fila de
// suscripcion, nunca al plan.
for (const [key, plan] of Object.entries(PLANES)) {
  assert.ok(
    !plan.funcionalidades.includes(FUNCIONALIDAD_DIAN),
    `el plan '${key}' no debe incluir ${FUNCIONALIDAD_DIAN}`
  )
}

// ── Precios y cupos acordados ─────────────────────────────────────────────
assert.strictEqual(PLANES.activo.precioMensual, 89000)
assert.strictEqual(PLANES.activo.precioAnual, 75000)
assert.strictEqual(PLANES.activo.limiteUsuarios, USUARIOS_BASE)
assert.strictEqual(USUARIOS_BASE, 3)
assert.strictEqual(PLANES.activo.almacenamientoMB, 20480)

assert.strictEqual(PLANES.prueba.limiteUsuarios, 2)
assert.strictEqual(PLANES.prueba.almacenamientoMB, 2048)
assert.strictEqual(DIAS_PRUEBA, 30)

assert.strictEqual(PLANES.cortesia.precioMensual, 0)
assert.strictEqual(PLANES.cortesia.limiteUsuarios, 3)

// ── El volumen es ilimitado en todos los planes ───────────────────────────
for (const [key, plan] of Object.entries(PLANES)) {
  assert.strictEqual(plan.limiteMascotas, null, `el plan '${key}' no debe limitar mascotas`)
}

// ── Las funcionalidades no se comparten por referencia ────────────────────
// Si dos planes apuntaran al mismo arreglo, comprar DIAN en uno lo activaria
// en el otro.
assert.notStrictEqual(PLANES.prueba.funcionalidades, PLANES.activo.funcionalidades)

// ── Constructores de suscripcion ──────────────────────────────────────────
const CLINICA = '11111111-1111-1111-1111-111111111111'

const prueba = crearSuscripcionPrueba(CLINICA)
assert.strictEqual(prueba.plan, 'prueba')
assert.strictEqual(prueba.estado, 'prueba')
assert.strictEqual(prueba.clinicaId, CLINICA)
assert.strictEqual(prueba.precio, 0)
assert.strictEqual(prueba.fechaInicio, formatDateOnly())
assert.strictEqual(prueba.fechaFin, addDaysDateOnly(DIAS_PRUEBA))
assert.strictEqual(prueba.limiteUsuarios, 2)

const cortesia = crearSuscripcionCortesia(CLINICA)
assert.strictEqual(cortesia.plan, 'cortesia')
assert.strictEqual(cortesia.estado, 'activa')
assert.strictEqual(cortesia.fechaFin, CORTESIA_END_DATE)

// ── PLANES_PUBLICOS solo expone lo ofrecido ───────────────────────────────
assert.deepStrictEqual(Object.keys(PLANES_PUBLICOS).sort(), [...PLAN_KEYS_ACTIVOS].sort())
assert.strictEqual(PLANES_PUBLICOS.activo.key, 'activo')
assert.strictEqual(PLANES_PUBLICOS.activo.nombre, 'Bourgelat')

console.log('planes.test.js: todos los tests pasaron ✔')
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

Run: `cd backend && node src/config/planes.test.js`
Expected: FAIL con `AssertionError` en la primera comprobación de `PLAN_KEYS_ACTIVOS` (hoy no existe ese export, llega `undefined`).

- [ ] **Step 3: Reescribir `planes.js`**

Reemplazar el contenido de `backend/src/config/planes.js` desde la línea 1 hasta la línea 111 (el bloque `PLAN_KEYS` … cierre de `PLANES`) por:

```js
// Llaves legado: ya no se ofrecen, pero permanecen en PLAN_KEYS porque
// Suscripcion.plan es un ENUM de Postgres y sus valores no se pueden eliminar
// sin recrear el tipo. Hay filas historicas apuntando aqui.
const PLAN_KEYS_LEGADO = ['inicio', 'clinica', 'profesional']
const PLAN_KEYS_ACTIVOS = ['prueba', 'activo', 'cortesia', 'personalizado']
const PLAN_KEYS = [...PLAN_KEYS_LEGADO, ...PLAN_KEYS_ACTIVOS]

const DEFAULT_INITIAL_PLAN = 'prueba'
const DIAS_PRUEBA = 30
const USUARIOS_BASE = 3
const PRECIO_USUARIO_ADICIONAL = 25000
const CORTESIA_END_DATE = '2099-12-31'

// El add-on DIAN se agrega a la fila de suscripcion al comprarse; ningun plan
// lo trae de fabrica.
const FUNCIONALIDAD_DIAN = 'facturacion_electronica'
const DOCUMENTOS_DIAN_INCLUIDOS = 200
const PRECIO_DIAN_MENSUAL = 49000
const PRECIO_DIAN_DOCUMENTO_EXCEDENTE = 250

const FUNCIONALIDADES_COMPLETAS = [
  'citas',
  'historias',
  'antecedentes',
  'propietarios',
  'mascotas',
  'roles_base',
  'inventario',
  'facturacion_interna',
  'reportes_operativos',
  'reportes_completos',
  'exportables',
]

// Copia por plan: compartir la referencia haria que comprar DIAN en una
// clinica lo activara en todas.
const funcionalidadesCompletas = () => [...FUNCIONALIDADES_COMPLETAS]

const formatDateOnly = (date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const addDays = (baseDate, days) => {
  const nextDate = new Date(baseDate)
  nextDate.setDate(nextDate.getDate() + days)
  return nextDate
}

const addDaysDateOnly = (days, baseDate = new Date()) =>
  formatDateOnly(addDays(baseDate, days))

const PLANES = {
  prueba: {
    nombre: 'Prueba',
    descripcion:
      'Treinta dias con todo el sistema abierto para que la clinica vea un ciclo mensual completo: agenda, historia, inventario, caja y reportes.',
    precioMensual: 0,
    precioAnual: 0,
    limiteUsuarios: 2,
    limiteMascotas: null,
    almacenamientoMB: 2048,
    funcionalidades: funcionalidadesCompletas(),
  },
  activo: {
    nombre: 'Bourgelat',
    descripcion:
      'Toda la operacion de la clinica en un solo sistema, sin limites de pacientes, historias ni facturas.',
    precioMensual: 89000,
    precioAnual: 75000,
    limiteUsuarios: USUARIOS_BASE,
    limiteMascotas: null,
    almacenamientoMB: 20480,
    funcionalidades: funcionalidadesCompletas(),
  },
  cortesia: {
    nombre: 'Cortesia',
    descripcion:
      'Acceso permanente sin costo para las clinicas que acompanaron el desarrollo del producto.',
    precioMensual: 0,
    precioAnual: 0,
    limiteUsuarios: 3,
    limiteMascotas: null,
    almacenamientoMB: 2048,
    funcionalidades: funcionalidadesCompletas(),
  },
  personalizado: {
    nombre: 'Personalizado',
    descripcion:
      'Para clinicas que necesitan una propuesta comercial con configuracion, migracion y acompanamiento segun alcance.',
    precioMensual: null,
    precioAnual: null,
    limiteUsuarios: null,
    limiteMascotas: null,
    almacenamientoMB: null,
    funcionalidades: funcionalidadesCompletas(),
  },
}
```

Después, reemplazar `crearSuscripcionEsencial` (líneas 166-174 del archivo original) por:

```js
const crearSuscripcionPrueba = (clinicaId) =>
  construirSuscripcion({
    clinicaId,
    plan: 'prueba',
    estado: 'prueba',
    fechaInicio: formatDateOnly(),
    fechaFin: addDaysDateOnly(DIAS_PRUEBA),
    precio: 0,
  })

const crearSuscripcionCortesia = (clinicaId) =>
  construirSuscripcion({
    clinicaId,
    plan: 'cortesia',
    estado: 'activa',
    fechaInicio: formatDateOnly(),
    fechaFin: CORTESIA_END_DATE,
    precio: 0,
  })
```

Y reemplazar el bloque `module.exports` completo por:

```js
module.exports = {
  PLAN_KEYS,
  PLAN_KEYS_LEGADO,
  PLAN_KEYS_ACTIVOS,
  PLANES,
  PLANES_PUBLICOS,
  DEFAULT_INITIAL_PLAN,
  DIAS_PRUEBA,
  USUARIOS_BASE,
  PRECIO_USUARIO_ADICIONAL,
  CORTESIA_END_DATE,
  FUNCIONALIDAD_DIAN,
  FUNCIONALIDADES_COMPLETAS,
  DOCUMENTOS_DIAN_INCLUIDOS,
  PRECIO_DIAN_MENSUAL,
  PRECIO_DIAN_DOCUMENTO_EXCEDENTE,
  formatDateOnly,
  addDaysDateOnly,
  obtenerPlan,
  construirSuscripcion,
  crearSuscripcionPrueba,
  crearSuscripcionCortesia,
}
```

Nota: se elimina el export `ESSENTIAL_PLAN_END_DATE` y la constante correspondiente.

- [ ] **Step 4: Ejecutar el test y verificar que pasa**

Run: `cd backend && node src/config/planes.test.js`
Expected: PASS con `planes.test.js: todos los tests pasaron ✔`

- [ ] **Step 5: Registrar el test en `npm test`**

En `backend/package.json`, reemplazar la línea del script `test` por:

```json
"test": "node src/config/smokeTest.js && node src/config/planes.test.js && node src/config/tenantGuard.test.js && node src/services/oauthService.test.js",
```

- [ ] **Step 6: Verificar que la suite completa aún corre**

Run: `cd backend && npm test`
Expected: los otros tests pueden fallar por importar `crearSuscripcionEsencial` (que ya no existe). Anotar cuáles y continuar — la Task 6 los repara. Si `smokeTest.js` falla por esta razón, es esperado en este punto.

- [ ] **Step 7: Commit**

```bash
git add backend/src/config/planes.js backend/src/config/planes.test.js backend/package.json
git commit -m "feat(planes): reduce la oferta a cuatro planes conservando las llaves legado del ENUM"
```

---

### Task 2: Ampliar el modelo `Suscripcion`

**Files:**
- Modify: `backend/src/models/Suscripcion.js:4,12-21,62`

**Interfaces:**
- Consumes: `PLAN_KEYS`, `DEFAULT_INITIAL_PLAN` de Task 1.
- Produces: el modelo acepta `estado: 'solo_lectura'` y expone `documentosDianIncluidos: number`.

- [ ] **Step 1: Modificar el modelo**

En `backend/src/models/Suscripcion.js`, cambiar el import de la línea 4 a:

```js
const { PLAN_KEYS, DEFAULT_INITIAL_PLAN } = require('../config/planes')
```

Reemplazar las definiciones de `plan` y `estado` (líneas 12-21) por:

```js
  plan: {
    type: DataTypes.ENUM(...PLAN_KEYS),
    allowNull: false,
    defaultValue: DEFAULT_INITIAL_PLAN,
  },
  estado: {
    // 'solo_lectura' es el destino al vencerse: la clinica conserva plan y
    // datos, y solo pierde la escritura.
    type: DataTypes.ENUM('activa', 'vencida', 'cancelada', 'prueba', 'solo_lectura'),
    allowNull: false,
    defaultValue: 'activa',
  },
```

Agregar, justo después de la definición de `funcionalidades` (la que tiene el comment en la línea 62 del archivo original):

```js
  documentosDianIncluidos: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Documentos DIAN incluidos al mes por el add-on; 0 si no se compro',
  },
```

- [ ] **Step 2: Verificar que el modelo carga sin error**

Run: `cd backend && node -e "const S=require('./src/models/Suscripcion'); console.log(S.rawAttributes.estado.values, S.rawAttributes.plan.defaultValue, S.rawAttributes.documentosDianIncluidos.defaultValue)"`
Expected: imprime `[ 'activa', 'vencida', 'cancelada', 'prueba', 'solo_lectura' ] prueba 0`

- [ ] **Step 3: Commit**

```bash
git add backend/src/models/Suscripcion.js
git commit -m "feat(suscripcion): agrega estado solo_lectura y cupo de documentos DIAN"
```

---

### Task 3: Al vencerse, la suscripción pasa a solo lectura

**Files:**
- Modify: `backend/src/services/suscripcionService.js`
- Modify: `backend/package.json` (script `test`)
- Test: `backend/src/services/suscripcionService.test.js`

**Interfaces:**
- Consumes: `crearSuscripcionPrueba`, `formatDateOnly`, `PLANES_PUBLICOS` de Task 1.
- Produces: `resolverEstadoSuscripcion({ suscripcion, hoy }) => { accion: 'crear' | 'a_solo_lectura' | 'vigente', advertencia: string | null }`, `ESTADOS_VIGENTES` (ahora incluye `'solo_lectura'`), `asegurarSuscripcionPrueba(clinicaId, transaction)`, `esSoloLectura(suscripcion) => boolean`. Se elimina `asegurarPlanEsencial`.

**Nota de diseño:** la decisión se extrae a una función pura para poder probarla sin base de datos, igual que hace `tenantGuard.test.js`.

- [ ] **Step 1: Escribir el test que falla**

Crear `backend/src/services/suscripcionService.test.js`:

```js
// Tests de la decision de vigencia de suscripciones. Se ejecutan con
// `node src/services/suscripcionService.test.js` (integrados en `npm test`).
// No requieren base de datos: la decision esta extraida a una funcion pura.

const assert = require('assert')
const { resolverEstadoSuscripcion, esSoloLectura, ESTADOS_VIGENTES } = require('./suscripcionService')

const HOY = '2026-08-12'

// ── Sin suscripcion: se crea una prueba ───────────────────────────────────
assert.strictEqual(resolverEstadoSuscripcion({ suscripcion: null, hoy: HOY }).accion, 'crear')

// ── Vigente: no se toca ───────────────────────────────────────────────────
assert.strictEqual(
  resolverEstadoSuscripcion({
    suscripcion: { estado: 'activa', fechaFin: '2026-09-30', plan: 'activo' },
    hoy: HOY,
  }).accion,
  'vigente'
)

// La prueba que aun no vence sigue vigente y avisa la fecha de corte.
const enPrueba = resolverEstadoSuscripcion({
  suscripcion: { estado: 'prueba', fechaFin: '2026-08-30', plan: 'prueba' },
  hoy: HOY,
})
assert.strictEqual(enPrueba.accion, 'vigente')
assert.ok(enPrueba.advertencia.includes('2026-08-30'), 'debe avisar la fecha de corte')

// El ultimo dia todavia cuenta como vigente.
assert.strictEqual(
  resolverEstadoSuscripcion({
    suscripcion: { estado: 'prueba', fechaFin: HOY, plan: 'prueba' },
    hoy: HOY,
  }).accion,
  'vigente'
)

// ── Vencida: pasa a solo lectura conservando su plan ──────────────────────
const vencida = resolverEstadoSuscripcion({
  suscripcion: { estado: 'prueba', fechaFin: '2026-08-11', plan: 'prueba' },
  hoy: HOY,
})
assert.strictEqual(vencida.accion, 'a_solo_lectura')

// ── Ya en solo lectura: no se vuelve a escribir en cada peticion ──────────
// Sin esto el servicio haria un UPDATE por request para siempre.
assert.strictEqual(
  resolverEstadoSuscripcion({
    suscripcion: { estado: 'solo_lectura', fechaFin: '2026-01-01', plan: 'activo' },
    hoy: HOY,
  }).accion,
  'vigente'
)

// ── solo_lectura se resuelve como suscripcion vigente ─────────────────────
// Debe encontrarse para que el frontend pueda mostrar el estado.
assert.ok(ESTADOS_VIGENTES.includes('solo_lectura'))
assert.ok(ESTADOS_VIGENTES.includes('activa'))
assert.ok(ESTADOS_VIGENTES.includes('prueba'))

// ── Helper de lectura ─────────────────────────────────────────────────────
assert.strictEqual(esSoloLectura({ estado: 'solo_lectura' }), true)
assert.strictEqual(esSoloLectura({ estado: 'activa' }), false)
assert.strictEqual(esSoloLectura(null), false)

console.log('suscripcionService.test.js: todos los tests pasaron ✔')
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

Run: `cd backend && node src/services/suscripcionService.test.js`
Expected: FAIL con `TypeError: resolverEstadoSuscripcion is not a function`

- [ ] **Step 3: Implementar en el servicio**

En `backend/src/services/suscripcionService.js`:

Cambiar el import de las líneas 4-9 por:

```js
const {
  PLANES_PUBLICOS,
  crearSuscripcionPrueba,
  formatDateOnly,
} = require('../config/planes')
```

Reemplazar `ESTADOS_VIGENTES` (línea 11) por:

```js
// 'solo_lectura' es vigente a efectos de resolucion: la suscripcion se sigue
// encontrando para que el frontend sepa en que estado esta la clinica.
const ESTADOS_VIGENTES = ['activa', 'prueba', 'solo_lectura']
```

Reemplazar `asegurarPlanEsencial` (líneas 27-43) por:

```js
const asegurarSuscripcionPrueba = async (clinicaId, transaction) =>
  Suscripcion.create(crearSuscripcionPrueba(clinicaId), { transaction })

const esSoloLectura = (suscripcion) => suscripcion?.estado === 'solo_lectura'

// Decision pura de vigencia, separada del acceso a datos para poder probarla
// sin base de datos.
const resolverEstadoSuscripcion = ({ suscripcion, hoy }) => {
  if (!suscripcion) {
    return {
      accion: 'crear',
      advertencia: 'No existia una suscripcion vigente y se activo una prueba de 30 dias.',
    }
  }

  if (esSoloLectura(suscripcion)) {
    return {
      accion: 'vigente',
      advertencia: 'La suscripcion vencio. La clinica puede consultar y exportar, pero no editar.',
    }
  }

  if (suscripcion.fechaFin < hoy) {
    return {
      accion: 'a_solo_lectura',
      advertencia: 'La suscripcion vencio y la clinica quedo en modo solo lectura.',
    }
  }

  return {
    accion: 'vigente',
    advertencia:
      suscripcion.estado === 'prueba'
        ? `La prueba termina el ${suscripcion.fechaFin}`
        : null,
  }
}
```

Reemplazar `obtenerSuscripcionActivaClinica` (líneas 45-82) por:

```js
const obtenerSuscripcionActivaClinica = async (clinicaId, { transaction } = {}) => {
  if (!clinicaId) {
    throw new Error('Clinica no asociada a la sesion')
  }

  const suscripcion = await obtenerSuscripcionVigenteRegistrada(clinicaId, transaction)
  const { accion, advertencia } = resolverEstadoSuscripcion({
    suscripcion,
    hoy: formatDateOnly(),
  })

  if (accion === 'crear') {
    return {
      suscripcion: await asegurarSuscripcionPrueba(clinicaId, transaction),
      downgraded: false,
      advertencia,
    }
  }

  if (accion === 'a_solo_lectura') {
    // La clinica conserva su plan y sus datos; solo pierde la escritura.
    await suscripcion.update({ estado: 'solo_lectura' }, { transaction })
    return { suscripcion, downgraded: true, advertencia }
  }

  return { suscripcion, downgraded: false, advertencia }
}
```

Reemplazar el `module.exports` por:

```js
module.exports = {
  ESTADOS_VIGENTES,
  obtenerNombrePlan,
  obtenerSuscripcionActivaClinica,
  obtenerSuscripcionVigenteRegistrada,
  asegurarSuscripcionPrueba,
  resolverEstadoSuscripcion,
  esSoloLectura,
  suscripcionTieneFuncionalidad,
  obtenerLimiteNumerico,
  validarCupoSuscripcion,
}
```

- [ ] **Step 4: Ejecutar el test y verificar que pasa**

Run: `cd backend && node src/services/suscripcionService.test.js`
Expected: PASS con `suscripcionService.test.js: todos los tests pasaron ✔`

- [ ] **Step 5: Registrar el test en `npm test`**

En `backend/package.json`, agregar al final del script `test`:

```
 && node src/services/suscripcionService.test.js
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/suscripcionService.js backend/src/services/suscripcionService.test.js backend/package.json
git commit -m "feat(suscripcion): al vencerse la clinica pasa a solo lectura en vez de bajar de plan"
```

---

### Task 4: Middleware `requerirEscritura`

**Files:**
- Modify: `backend/src/middlewares/suscripcionMiddleware.js`
- Modify: `backend/package.json` (script `test`)
- Test: `backend/src/middlewares/suscripcionMiddleware.test.js`

**Interfaces:**
- Consumes: `esSoloLectura`, `obtenerSuscripcionActivaClinica` de Task 3.
- Produces: `requerirEscritura(req, res, next)` — **función nombrada**, exportada. Responde `403` con `{ code: 'SUBSCRIPTION_READ_ONLY' }` cuando la suscripción está en solo lectura.

- [ ] **Step 1: Escribir el test que falla**

Crear `backend/src/middlewares/suscripcionMiddleware.test.js`:

```js
// Tests del guard de escritura. Se ejecutan con
// `node src/middlewares/suscripcionMiddleware.test.js` (integrados en `npm test`).
// No requieren base de datos: se le pasa la suscripcion ya cargada en req.

const assert = require('assert')
const { requerirEscritura } = require('./suscripcionMiddleware')

const construirRes = () => {
  const res = { statusCode: null, body: null }
  res.status = (codigo) => {
    res.statusCode = codigo
    return res
  }
  res.json = (payload) => {
    res.body = payload
    return res
  }
  return res
}

const main = async () => {
  // ── Solo lectura: se bloquea con codigo identificable ───────────────────
  const resBloqueado = construirRes()
  let siguienteLlamado = false

  await requerirEscritura(
    { suscripcion: { estado: 'solo_lectura', plan: 'activo' }, suscripcionInfo: { nombrePlan: 'Bourgelat' } },
    resBloqueado,
    () => {
      siguienteLlamado = true
    }
  )

  assert.strictEqual(siguienteLlamado, false, 'no debe continuar en solo lectura')
  assert.strictEqual(resBloqueado.statusCode, 403)
  assert.strictEqual(resBloqueado.body.code, 'SUBSCRIPTION_READ_ONLY')
  // El mensaje debe decirle a la clinica que sus datos siguen ahi: es la
  // diferencia entre "vencio" y "me secuestraron la historia clinica".
  assert.ok(
    /exportar/i.test(resBloqueado.body.message),
    'el mensaje debe mencionar que puede exportar'
  )

  // ── Estados que si pueden escribir ──────────────────────────────────────
  for (const estado of ['activa', 'prueba']) {
    const res = construirRes()
    let continuo = false

    await requerirEscritura(
      { suscripcion: { estado, plan: 'activo' }, suscripcionInfo: { nombrePlan: 'Bourgelat' } },
      res,
      () => {
        continuo = true
      }
    )

    assert.strictEqual(continuo, true, `estado '${estado}' debe poder escribir`)
    assert.strictEqual(res.statusCode, null, `estado '${estado}' no debe responder`)
  }

  // ── Sin clinica en la sesion ────────────────────────────────────────────
  const resSinClinica = construirRes()
  await requerirEscritura({ auth: {} }, resSinClinica, () => {
    throw new Error('no debia continuar sin clinica')
  })
  assert.strictEqual(resSinClinica.statusCode, 403)

  console.log('suscripcionMiddleware.test.js: todos los tests pasaron ✔')
}

main().catch((error) => {
  console.error('suscripcionMiddleware.test.js FALLÓ:', error.message)
  process.exit(1)
})
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

Run: `cd backend && node src/middlewares/suscripcionMiddleware.test.js`
Expected: FAIL con `TypeError: requerirEscritura is not a function`

- [ ] **Step 3: Implementar el middleware**

En `backend/src/middlewares/suscripcionMiddleware.js`:

Cambiar el import de las líneas 2-5 por:

```js
const {
  obtenerSuscripcionActivaClinica,
  suscripcionTieneFuncionalidad,
  esSoloLectura,
} = require('../services/suscripcionService')
```

Podar `FEATURE_LABELS` (líneas 7-14) a:

```js
// Unica funcionalidad que se compra aparte. El resto lo tienen todos los planes.
const FEATURE_LABELS = {
  facturacion_electronica: 'facturacion electronica',
}
```

Agregar antes del `module.exports`:

```js
// IMPORTANTE: debe declararse como funcion nombrada y usarse directamente en
// las cadenas de rutas. `escrituraGuard` la identifica por nombre en el texto
// de los archivos de rutas.
const requerirEscritura = async (req, res, next) => {
  try {
    if (!req.suscripcion) {
      const clinicaId = req.auth?.clinicaId || req.usuario?.clinicaId

      if (!clinicaId) {
        return res.status(403).json({
          message: 'No hay una clinica asociada a la sesion actual',
        })
      }

      const resultado = await obtenerSuscripcionActivaClinica(clinicaId)
      req.suscripcion = resultado.suscripcion
      req.suscripcionInfo = {
        advertencia: resultado.advertencia,
        downgraded: resultado.downgraded,
        nombrePlan: obtenerNombrePlan(resultado.suscripcion.plan),
      }
    }

    if (!esSoloLectura(req.suscripcion)) {
      return next()
    }

    return res.status(403).json({
      message:
        'Tu suscripcion vencio. Puedes consultar y exportar toda tu informacion, pero no crear ni editar. Activa tu plan para volver a trabajar.',
      code: 'SUBSCRIPTION_READ_ONLY',
      plan: req.suscripcion.plan,
    })
  } catch (error) {
    res.status(500).json({
      message: 'No fue posible validar el estado de la suscripcion',
      error: error.message,
    })
  }
}
```

Reemplazar el `module.exports` por:

```js
module.exports = {
  cargarSuscripcionActiva,
  requerirFuncionalidades,
  requerirEscritura,
}
```

- [ ] **Step 4: Ejecutar el test y verificar que pasa**

Run: `cd backend && node src/middlewares/suscripcionMiddleware.test.js`
Expected: PASS con `suscripcionMiddleware.test.js: todos los tests pasaron ✔`

- [ ] **Step 5: Registrar el test en `npm test`**

En `backend/package.json`, agregar al final del script `test`:

```
 && node src/middlewares/suscripcionMiddleware.test.js
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/middlewares/suscripcionMiddleware.js backend/src/middlewares/suscripcionMiddleware.test.js backend/package.json
git commit -m "feat(suscripcion): agrega guard de escritura para clinicas en solo lectura"
```

---

### Task 5: Analizador de rutas sin proteger, y aplicación del guard

**Files:**
- Create: `backend/src/config/escrituraGuard.js`
- Create: `backend/src/config/escrituraGuard.test.js`
- Modify: los archivos de `backend/src/routes/` con rutas de mutación
- Modify: `backend/src/index.js`
- Modify: `backend/package.json` (script `test`)

**Interfaces:**
- Consumes: `requerirEscritura` de Task 4.
- Produces: `analizarArchivoRutas(contenido, nombreArchivo) => Array<{ archivo, metodo, ruta }>`, `analizarDirectorioRutas(directorio) => Array<...>`, `verificarRutasProtegidas()` — lanza si hay rutas sin proteger. `ARCHIVOS_EXENTOS: string[]`.

**Nota de diseño:** el análisis es **estático sobre el texto de los archivos de rutas**, no sobre los internos de Express. Enumerar `app.router.stack` obliga a reconstruir prefijos desde expresiones regulares y se rompe con cada cambio de versión de Express.

- [ ] **Step 1: Escribir el test que falla**

Crear `backend/src/config/escrituraGuard.test.js`:

```js
// Tests del analizador de rutas sin proteger. Se ejecutan con
// `node src/config/escrituraGuard.test.js` (integrados en `npm test`).

const assert = require('assert')
const path = require('path')
const { analizarArchivoRutas, analizarDirectorioRutas, ARCHIVOS_EXENTOS } = require('./escrituraGuard')

// ── Detecta mutaciones sin el guard ───────────────────────────────────────
const sinGuard = `
const router = express.Router()
router.post('/', verificarToken, crearAlgo)
router.get('/', verificarToken, listarAlgo)
`
assert.deepStrictEqual(
  analizarArchivoRutas(sinGuard, 'ejemploRoutes.js'),
  [{ archivo: 'ejemploRoutes.js', metodo: 'post', ruta: '/' }],
  'POST sin guard debe reportarse y GET debe ignorarse'
)

// ── No reporta lo que si esta protegido ───────────────────────────────────
const conGuard = `
router.post('/', verificarToken, requerirEscritura, crearAlgo)
router.put('/:id', verificarToken, requerirEscritura, editarAlgo)
router.delete('/:id', verificarToken, requerirEscritura, borrarAlgo)
router.patch('/:id/x', verificarToken, requerirEscritura, parcharAlgo)
`
assert.deepStrictEqual(analizarArchivoRutas(conGuard, 'ok.js'), [])

// ── Cubre cadenas multilinea ──────────────────────────────────────────────
// El estilo real del proyecto parte las rutas en varias lineas.
const multilinea = `
router.post(
  '/',
  verificarToken,
  verificarRol('admin'),
  [ body('nombre').notEmpty(), validar ],
  crearAlgo
)
`
assert.deepStrictEqual(
  analizarArchivoRutas(multilinea, 'multi.js'),
  [{ archivo: 'multi.js', metodo: 'post', ruta: '/' }],
  'debe analizar cadenas partidas en varias lineas'
)

const multilineaProtegida = `
router.post(
  '/',
  verificarToken,
  requerirEscritura,
  crearAlgo
)
`
assert.deepStrictEqual(analizarArchivoRutas(multilineaProtegida, 'multi-ok.js'), [])

// ── Los archivos exentos se declaran explicitamente ───────────────────────
assert.ok(ARCHIVOS_EXENTOS.includes('authRoutes.js'), 'auth debe seguir operando vencido')
assert.ok(ARCHIVOS_EXENTOS.includes('suscripcionRoutes.js'), 'debe poder pagar para reactivarse')

// ── El repositorio real esta limpio ───────────────────────────────────────
// Esta es la comprobacion que importa: si alguien agrega una ruta de mutacion
// sin marcarla, este test falla.
const pendientes = analizarDirectorioRutas(path.join(__dirname, '..', 'routes'))
assert.deepStrictEqual(
  pendientes,
  [],
  `rutas de mutacion sin requerirEscritura:\n${pendientes
    .map((r) => `  ${r.metodo.toUpperCase()} ${r.ruta} (${r.archivo})`)
    .join('\n')}`
)

console.log('escrituraGuard.test.js: todos los tests pasaron ✔')
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

Run: `cd backend && node src/config/escrituraGuard.test.js`
Expected: FAIL con `Cannot find module './escrituraGuard'`

- [ ] **Step 3: Implementar el analizador**

Crear `backend/src/config/escrituraGuard.js`:

```js
const fs = require('fs')
const path = require('path')

// Rutas que deben seguir funcionando con la suscripcion vencida:
// autenticarse, pagar para reactivarse, y la operacion de superadmin.
const ARCHIVOS_EXENTOS = ['authRoutes.js', 'suscripcionRoutes.js', 'superadminRoutes.js']

const METODOS_MUTACION = ['post', 'put', 'patch', 'delete']
const GUARD = 'requerirEscritura'

// Encuentra la posicion del parentesis que cierra el que abre en `inicio`.
const buscarCierre = (contenido, inicio) => {
  let profundidad = 0

  for (let i = inicio; i < contenido.length; i += 1) {
    if (contenido[i] === '(') profundidad += 1
    if (contenido[i] === ')') {
      profundidad -= 1
      if (profundidad === 0) return i
    }
  }

  return -1
}

const analizarArchivoRutas = (contenido, nombreArchivo) => {
  if (ARCHIVOS_EXENTOS.includes(nombreArchivo)) {
    return []
  }

  const pendientes = []
  const patron = new RegExp(`router\\.(${METODOS_MUTACION.join('|')})\\s*\\(`, 'g')
  let coincidencia = patron.exec(contenido)

  while (coincidencia !== null) {
    const aperturaParentesis = coincidencia.index + coincidencia[0].length - 1
    const cierre = buscarCierre(contenido, aperturaParentesis)
    const cadena = cierre === -1 ? '' : contenido.slice(aperturaParentesis, cierre)
    const ruta = cadena.match(/['"`]([^'"`]*)['"`]/)

    if (!cadena.includes(GUARD)) {
      pendientes.push({
        archivo: nombreArchivo,
        metodo: coincidencia[1],
        ruta: ruta ? ruta[1] : '?',
      })
    }

    coincidencia = patron.exec(contenido)
  }

  return pendientes
}

const analizarDirectorioRutas = (directorio) =>
  fs
    .readdirSync(directorio)
    .filter((archivo) => archivo.endsWith('.js'))
    .flatMap((archivo) =>
      analizarArchivoRutas(fs.readFileSync(path.join(directorio, archivo), 'utf8'), archivo)
    )

// Se llama en arranque fuera de produccion: el error aparece en la maquina del
// desarrollador, no cuando una clinica vencida ya escribio de mas.
const verificarRutasProtegidas = () => {
  const pendientes = analizarDirectorioRutas(path.join(__dirname, '..', 'routes'))

  if (pendientes.length === 0) {
    return
  }

  const detalle = pendientes
    .map((r) => `  ${r.metodo.toUpperCase()} ${r.ruta} (${r.archivo})`)
    .join('\n')

  throw new Error(
    `Rutas de mutacion sin '${GUARD}':\n${detalle}\n` +
      `Agrega el middleware o declara el archivo en ARCHIVOS_EXENTOS de escrituraGuard.js.`
  )
}

module.exports = {
  ARCHIVOS_EXENTOS,
  METODOS_MUTACION,
  analizarArchivoRutas,
  analizarDirectorioRutas,
  verificarRutasProtegidas,
}
```

- [ ] **Step 4: Ejecutar el test y ver la lista de rutas por proteger**

Run: `cd backend && node src/config/escrituraGuard.test.js`
Expected: FAIL en la última aserción, con la lista completa de rutas de mutación sin proteger. **Guardar esa lista**: es exactamente el trabajo del paso siguiente.

- [ ] **Step 5: Aplicar el guard en cada router**

Para cada archivo listado en el paso anterior:

1. Agregar el import junto a los que ya existen:

```js
const { requerirEscritura } = require('../middlewares/suscripcionMiddleware')
```

2. Insertar `requerirEscritura` en cada cadena `router.post|put|patch|delete`, **inmediatamente después de `verificarRol(...)`** (o después de `verificarToken` si no hay `verificarRol`). El orden importa: primero se comprueba quién eres, después si tu clínica puede escribir.

Ejemplo aplicado a `backend/src/routes/mascotaRoutes.js:84`:

```js
router.patch(
  '/:id/desactivar',
  verificarToken,
  verificarRol('admin', 'superadmin'),
  requerirEscritura,
  desactivarMascota
)
```

Y a `backend/src/routes/mascotaRoutes.js:34-53`:

```js
router.post(
  '/',
  verificarToken,
  verificarRol('admin', 'superadmin', 'recepcionista', 'auxiliar', 'veterinario'),
  requerirEscritura,
  [
    body('nombre').notEmpty().withMessage('El nombre es obligatorio').trim(),
    body('especie')
      .isIn(['perro', 'gato', 'ave', 'conejo', 'reptil', 'otro'])
      .withMessage('Especie no valida'),
    body('propietarioId').isUUID().withMessage('Propietario no valido'),
    body('sexo')
      .optional()
      .isIn(['macho', 'hembra', 'desconocido'])
      .withMessage('Sexo no valido'),
    body('peso').optional().isFloat({ min: 0 }).withMessage('El peso debe ser un numero positivo'),
    fotoPerfilValidator,
    validar,
  ],
  crearMascota
)
```

- [ ] **Step 6: Ejecutar el test hasta que pase**

Run: `cd backend && node src/config/escrituraGuard.test.js`
Expected: PASS con `escrituraGuard.test.js: todos los tests pasaron ✔`. Si sigue fallando, la lista del error dice exactamente qué archivo y método faltan.

- [ ] **Step 7: Llamar al verificador en arranque**

En `backend/src/index.js`, agregar el import junto a los otros de `./config` (cerca de la línea 11):

```js
const { verificarRutasProtegidas } = require('./config/escrituraGuard')
```

Y justo después del bloque que monta las rutas (después de la línea `app.use('/api/superadmin', superadminRoutes)`), agregar:

```js
// Falla el arranque en desarrollo si alguien agrego una ruta de mutacion sin
// el guard de escritura. En produccion no se ejecuta: el despliegue no es el
// lugar para descubrirlo.
if (!appConfig.isProduction) {
  verificarRutasProtegidas()
}
```

- [ ] **Step 8: Verificar que el backend arranca**

Run: `cd backend && npm run dev` y esperar el log `Servidor Bourgelat corriendo en el puerto`, luego cortar con Ctrl+C.
Expected: arranca sin lanzar el error del guard.

- [ ] **Step 9: Registrar el test en `npm test`**

En `backend/package.json`, agregar al final del script `test`:

```
 && node src/config/escrituraGuard.test.js
```

- [ ] **Step 10: Commit**

```bash
git add backend/src/config/escrituraGuard.js backend/src/config/escrituraGuard.test.js backend/src/routes backend/src/index.js backend/package.json
git commit -m "feat(suscripcion): protege las rutas de mutacion y verifica en arranque que ninguna quede suelta"
```

---

### Task 6: Quitar el cupo de mascotas y crear prueba al registrarse

**Files:**
- Modify: `backend/src/controllers/mascotaController.js:3,25-41`
- Modify: `backend/src/controllers/authController.js:247`

**Interfaces:**
- Consumes: `crearSuscripcionPrueba` de Task 1.
- Produces: nada nuevo.

- [ ] **Step 1: Eliminar el cupo de mascotas**

En `backend/src/controllers/mascotaController.js`, borrar completo el bloque de las líneas 25-41 (desde `const cupoMascotas = await validarCupoSuscripcion({` hasta el cierre del `if (!cupoMascotas.permitido) { ... }`).

Después:

Run: `cd backend && grep -n "validarCupoSuscripcion" src/controllers/mascotaController.js`
Si no quedan usos, eliminar la línea 3: `const { validarCupoSuscripcion } = require('../services/suscripcionService')`.

- [ ] **Step 2: El registro crea suscripción de prueba**

Run: `cd backend && grep -rn "crearSuscripcionEsencial" src/`

Reemplazar cada aparición por `crearSuscripcionPrueba`, tanto en el import como en el uso. En `authController.js:247` queda:

```js
      const suscripcion = await Suscripcion.create(crearSuscripcionPrueba(clinica.id), {
```

- [ ] **Step 3: Verificar que no queda ninguna referencia a los nombres viejos**

Run: `cd backend && grep -rn "crearSuscripcionEsencial\|asegurarPlanEsencial\|ESSENTIAL_PLAN_END_DATE" src/`
Expected: sin resultados.

- [ ] **Step 4: Correr la suite completa**

Run: `cd backend && npm test`
Expected: PASS en los seis archivos de test.

- [ ] **Step 5: Verificar el registro de punta a punta**

Levantar el backend (`npm run dev`) y registrar una clínica nueva desde el frontend. Luego:

Run: `cd backend && node -e "const S=require('./src/models/Suscripcion');S.findAll({order:[['createdAt','DESC']],limit:1,sinTenant:true}).then(r=>{console.log(r[0].plan,r[0].estado,r[0].fechaFin);process.exit(0)})"`
Expected: imprime `prueba prueba` y una fecha 30 días en el futuro.

- [ ] **Step 6: Commit**

```bash
git add backend/src/controllers/mascotaController.js backend/src/controllers/authController.js
git commit -m "feat(planes): elimina el cupo de mascotas y arranca las clinicas nuevas en prueba"
```

---

### Task 7: Migración de esquema y de datos

**Files:**
- Create: `backend/src/migrations/20260813_000001_modelo_plan_unico.js`

**Interfaces:**
- Consumes: los valores de plan y estado de Task 1 y Task 2.
- Produces: base de datos migrada. Ninguna cuenta pierde acceso ni datos.

- [ ] **Step 1: Verificar el nombre real de los tipos ENUM**

Sequelize nombra los tipos como `enum_<tabla>_<columna>`, pero hay que confirmarlo contra la base real antes de escribir el SQL:

Run: `cd backend && node -e "require('./src/config/database').query(\"SELECT typname FROM pg_type WHERE typname LIKE 'enum_suscripciones%'\").then(([r])=>{console.log(r);process.exit(0)})"`
Expected: lista que incluye `enum_suscripciones_plan` y `enum_suscripciones_estado`. Si los nombres difieren, usar los reales en el paso siguiente.

- [ ] **Step 2: Fotografiar el estado previo**

Run: `cd backend && node -e "require('./src/config/database').query('SELECT plan, estado, COUNT(*) FROM suscripciones GROUP BY plan, estado').then(([r])=>{console.log(r);process.exit(0)})"`
Expected: anotar el conteo por plan. Sirve para verificar que ninguna fila se pierde.

- [ ] **Step 3: Escribir la migración**

Crear `backend/src/migrations/20260813_000001_modelo_plan_unico.js`:

```js
'use strict'

// Migracion puramente aditiva. Postgres no permite eliminar valores de un ENUM
// sin recrear el tipo, y hay filas historicas apuntando a los planes viejos.

const FUNCIONALIDADES_COMPLETAS = [
  'citas',
  'historias',
  'antecedentes',
  'propietarios',
  'mascotas',
  'roles_base',
  'inventario',
  'facturacion_interna',
  'reportes_operativos',
  'reportes_completos',
  'exportables',
]

module.exports = {
  name: '20260813_000001_modelo_plan_unico',

  up: async ({ sequelize }) => {
    const funcionalidades = JSON.stringify(FUNCIONALIDADES_COMPLETAS)

    // 1. Valores nuevos de ENUM. ADD VALUE IF NOT EXISTS es idempotente.
    for (const plan of ['prueba', 'activo', 'cortesia']) {
      await sequelize.query(
        `ALTER TYPE "enum_suscripciones_plan" ADD VALUE IF NOT EXISTS '${plan}';`
      )
    }

    await sequelize.query(
      `ALTER TYPE "enum_suscripciones_estado" ADD VALUE IF NOT EXISTS 'solo_lectura';`
    )

    // 2. Columna del add-on DIAN.
    await sequelize.query(`
      ALTER TABLE suscripciones
        ADD COLUMN IF NOT EXISTS "documentosDianIncluidos" INTEGER NOT NULL DEFAULT 0;
    `)

    // 3. Default de plan.
    await sequelize.query(`
      ALTER TABLE suscripciones ALTER COLUMN plan SET DEFAULT 'prueba';
    `)

    // 4. Grandfathering: los pilotos del plan gratuito conservan acceso
    //    completo de por vida.
    await sequelize.query(`
      UPDATE suscripciones
         SET plan = 'cortesia',
             "fechaFin" = '2099-12-31',
             "limiteUsuarios" = 3,
             "almacenamientoMB" = 2048,
             "limiteMascotas" = NULL,
             funcionalidades = '${funcionalidades}'::jsonb
       WHERE plan = 'inicio';
    `)

    // 5. Los planes pagos viejos pasan al plan unico conservando su vigencia.
    await sequelize.query(`
      UPDATE suscripciones
         SET plan = 'activo',
             "limiteUsuarios" = GREATEST(COALESCE("limiteUsuarios", 3), 3),
             "almacenamientoMB" = 20480,
             "limiteMascotas" = NULL,
             funcionalidades = '${funcionalidades}'::jsonb
       WHERE plan IN ('clinica', 'profesional');
    `)

    // 6. Personalizado conserva sus cupos negociados; solo se nivelan las
    //    funcionalidades y se libera el volumen.
    await sequelize.query(`
      UPDATE suscripciones
         SET "limiteMascotas" = NULL,
             funcionalidades = '${funcionalidades}'::jsonb
       WHERE plan = 'personalizado';
    `)
  },

  down: async ({ sequelize }) => {
    // Los valores de ENUM no se revierten: eliminarlos exige recrear el tipo y
    // reescribir la columna, que es justo el riesgo que esta migracion evita.
    await sequelize.query(`
      ALTER TABLE suscripciones ALTER COLUMN plan SET DEFAULT 'inicio';
    `)
    await sequelize.query(`
      ALTER TABLE suscripciones DROP COLUMN IF EXISTS "documentosDianIncluidos";
    `)
  },
}
```

- [ ] **Step 4: Correr la migración**

Run: `cd backend && npm run migrate`
Expected: log `Migracion ejecutada: 20260813_000001_modelo_plan_unico`.

**Si falla con `unsafe use of new value of enum type`:** Postgres no permite usar un valor de ENUM recién agregado dentro de la misma transacción. Con PostgreSQL 16 no debería ocurrir; si ocurre, dividir en dos archivos de migración — uno que agrega los valores y otro que hace los `UPDATE`.

- [ ] **Step 5: Verificar la migración de datos**

Run: `cd backend && node -e "require('./src/config/database').query('SELECT plan, estado, COUNT(*) FROM suscripciones GROUP BY plan, estado').then(([r])=>{console.log(r);process.exit(0)})"`
Expected: el total de filas coincide con el del paso 2, no queda ninguna en `inicio`, `clinica` ni `profesional`, y las que estaban en `inicio` ahora son `cortesia`.

- [ ] **Step 6: Verificar que una cuenta de cortesía conserva acceso completo**

Run: `cd backend && node -e "require('./src/config/database').query(\"SELECT plan, \\\"fechaFin\\\", \\\"limiteUsuarios\\\", jsonb_array_length(funcionalidades) AS n FROM suscripciones WHERE plan='cortesia' LIMIT 3\").then(([r])=>{console.log(r);process.exit(0)})"`
Expected: `fechaFin` es `2099-12-31`, `limiteUsuarios` es 3, y `n` es 11 (todas las funcionalidades menos DIAN).

- [ ] **Step 7: Commit**

```bash
git add backend/src/migrations/20260813_000001_modelo_plan_unico.js
git commit -m "feat(migracion): migra las suscripciones al modelo de plan unico conservando accesos"
```

---

# Fase 2 — Almacenamiento

### Task 8: Contador y cupo de almacenamiento

**Files:**
- Create: `backend/src/services/almacenamientoService.js`
- Create: `backend/src/services/almacenamientoService.test.js`
- Create: `backend/src/migrations/20260813_000002_add_almacenamiento_usado_clinicas.js`
- Modify: `backend/src/models/Clinica.js`
- Modify: `backend/package.json` (script `test`)

**Interfaces:**
- Consumes: `obtenerSuscripcionActivaClinica`, `obtenerLimiteNumerico` de Task 3.
- Produces: `MB: 1048576`, `hayCupoAlmacenamiento({ usadoMB, limiteMB, bytesNuevos }) => boolean` (pura), `verificarCupoAlmacenamiento(clinicaId, bytes) => Promise<{ permitido, limiteMB, usadoMB }>`, `registrarUsoAlmacenamiento(clinicaId, bytes) => Promise<void>` (acepta bytes negativos al borrar).

- [ ] **Step 1: Escribir el test que falla**

Crear `backend/src/services/almacenamientoService.test.js`:

```js
// Tests del cupo de almacenamiento. Se ejecutan con
// `node src/services/almacenamientoService.test.js` (integrados en `npm test`).
// La decision es pura y no requiere base de datos.

const assert = require('assert')
const { hayCupoAlmacenamiento, MB } = require('./almacenamientoService')

// ── Caso normal ───────────────────────────────────────────────────────────
assert.strictEqual(
  hayCupoAlmacenamiento({ usadoMB: 100, limiteMB: 2048, bytesNuevos: 2 * MB }),
  true
)

// ── Justo en el borde: llenar el cupo exacto se permite ───────────────────
assert.strictEqual(
  hayCupoAlmacenamiento({ usadoMB: 2046, limiteMB: 2048, bytesNuevos: 2 * MB }),
  true
)

// ── Pasarse por un byte se rechaza ────────────────────────────────────────
assert.strictEqual(
  hayCupoAlmacenamiento({ usadoMB: 2046, limiteMB: 2048, bytesNuevos: 2 * MB + 1 }),
  false
)

// ── Limite nulo significa sin limite (plan personalizado) ─────────────────
assert.strictEqual(
  hayCupoAlmacenamiento({ usadoMB: 999999, limiteMB: null, bytesNuevos: 50 * MB }),
  true
)

// ── Un contador corrupto no debe bloquear la clinica entera ───────────────
assert.strictEqual(
  hayCupoAlmacenamiento({ usadoMB: null, limiteMB: 2048, bytesNuevos: 1 * MB }),
  true
)

console.log('almacenamientoService.test.js: todos los tests pasaron ✔')
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

Run: `cd backend && node src/services/almacenamientoService.test.js`
Expected: FAIL con `Cannot find module './almacenamientoService'`

- [ ] **Step 3: Implementar el servicio**

Crear `backend/src/services/almacenamientoService.js`:

```js
const Clinica = require('../models/Clinica')
const sequelize = require('../config/database')
const { obtenerSuscripcionActivaClinica, obtenerLimiteNumerico } = require('./suscripcionService')

const MB = 1024 * 1024

// Decision pura, separada del acceso a datos para poder probarla sin base.
const hayCupoAlmacenamiento = ({ usadoMB, limiteMB, bytesNuevos }) => {
  // Sin limite configurado (plan personalizado) no hay nada que verificar.
  if (limiteMB === null || limiteMB === undefined) {
    return true
  }

  // Un contador ausente o corrupto no puede bloquear a la clinica: preferimos
  // dejar pasar la subida antes que impedirle trabajar por un dato malo.
  const usado = Number(usadoMB)
  if (!Number.isFinite(usado)) {
    return true
  }

  return usado + bytesNuevos / MB <= limiteMB
}

const verificarCupoAlmacenamiento = async (clinicaId, bytes) => {
  const { suscripcion } = await obtenerSuscripcionActivaClinica(clinicaId)
  const limiteMB = obtenerLimiteNumerico(suscripcion, 'almacenamientoMB')
  const clinica = await Clinica.findOne({
    where: { id: clinicaId },
    attributes: ['id', 'almacenamientoUsadoMB'],
  })

  const usadoMB = clinica ? Number(clinica.almacenamientoUsadoMB) : 0

  return {
    permitido: hayCupoAlmacenamiento({ usadoMB, limiteMB, bytesNuevos: bytes }),
    limiteMB,
    usadoMB,
  }
}

// Acepta bytes negativos al borrar un archivo. El GREATEST evita que el
// contador quede negativo si algo se descuadra.
const registrarUsoAlmacenamiento = async (clinicaId, bytes) => {
  await Clinica.update(
    {
      almacenamientoUsadoMB: sequelize.literal(
        `GREATEST(COALESCE("almacenamientoUsadoMB", 0) + (${Number(bytes)} / 1048576.0), 0)`
      ),
    },
    { where: { id: clinicaId } }
  )
}

module.exports = {
  MB,
  hayCupoAlmacenamiento,
  verificarCupoAlmacenamiento,
  registrarUsoAlmacenamiento,
}
```

- [ ] **Step 4: Ejecutar el test y verificar que pasa**

Run: `cd backend && node src/services/almacenamientoService.test.js`
Expected: PASS con `almacenamientoService.test.js: todos los tests pasaron ✔`

- [ ] **Step 5: Agregar la columna al modelo**

En `backend/src/models/Clinica.js`, agregar dentro de la definición de atributos:

```js
  almacenamientoUsadoMB: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Megabytes ocupados por archivos subidos por la clinica',
  },
```

- [ ] **Step 6: Escribir y correr la migración**

Crear `backend/src/migrations/20260813_000002_add_almacenamiento_usado_clinicas.js`:

```js
'use strict'

module.exports = {
  name: '20260813_000002_add_almacenamiento_usado_clinicas',

  up: async ({ sequelize }) => {
    await sequelize.query(`
      ALTER TABLE clinicas
        ADD COLUMN IF NOT EXISTS "almacenamientoUsadoMB" NUMERIC(12,2) NOT NULL DEFAULT 0;
    `)
  },

  down: async ({ sequelize }) => {
    await sequelize.query(`
      ALTER TABLE clinicas DROP COLUMN IF EXISTS "almacenamientoUsadoMB";
    `)
  },
}
```

Run: `cd backend && npm run migrate`
Expected: log `Migracion ejecutada: 20260813_000002_add_almacenamiento_usado_clinicas`.

- [ ] **Step 7: Registrar el test en `npm test`**

En `backend/package.json`, agregar al final del script `test`:

```
 && node src/services/almacenamientoService.test.js
```

- [ ] **Step 8: Commit**

```bash
git add backend/src/services/almacenamientoService.js backend/src/services/almacenamientoService.test.js backend/src/models/Clinica.js backend/src/migrations/20260813_000002_add_almacenamiento_usado_clinicas.js backend/package.json
git commit -m "feat(almacenamiento): agrega contador de uso por clinica y verificacion de cupo"
```

---

### Task 9: Aplicar el cupo en las subidas de archivos

**Files:**
- Modify: `backend/src/middlewares/uploadProductoFotoMiddleware.js:53-72`
- Modify: `backend/src/middlewares/uploadMascotaPhotoMiddleware.js:33-58`

**Interfaces:**
- Consumes: `verificarCupoAlmacenamiento`, `registrarUsoAlmacenamiento` de Task 8.
- Produces: nada nuevo. Las subidas que excedan el cupo responden `413` con `code: 'STORAGE_LIMIT_REACHED'`.

**Nota:** al alcanzar el tope se rechaza **solo la subida**. Quedarse sin espacio de fotos no puede bloquear la atención clínica.

- [ ] **Step 1: Aplicar en la foto de producto**

En `backend/src/middlewares/uploadProductoFotoMiddleware.js`, agregar el import:

```js
const {
  verificarCupoAlmacenamiento,
  registrarUsoAlmacenamiento,
} = require('../services/almacenamientoService')
```

Reemplazar el bloque `try` de las líneas 53-72 por:

```js
    try {
      const clinicaId = req.auth?.clinicaId || req.usuario?.clinicaId
      const cupo = await verificarCupoAlmacenamiento(clinicaId, req.file.buffer.length)

      if (!cupo.permitido) {
        res.status(413).json({
          message: `Tu plan incluye ${cupo.limiteMB} MB de almacenamiento y ya estan ocupados. Borra archivos que no uses para subir mas.`,
          code: 'STORAGE_LIMIT_REACHED',
          limiteMB: cupo.limiteMB,
          usadoMB: cupo.usadoMB,
        })
        return
      }

      const filename = `${Date.now()}-${crypto.randomUUID()}.webp`

      // Se contabiliza el peso del archivo ya convertido, no el del original:
      // es lo que realmente ocupa en disco.
      const { size } = await sharp(req.file.buffer)
        .resize({
          width: MAX_DIMENSION,
          height: MAX_DIMENSION,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 75 })
        .toFile(path.join(getProductosUploadsDir(), filename))

      await registrarUsoAlmacenamiento(clinicaId, size)

      req.file.filename = filename
      next()
    } catch (processingError) {
      res.status(400).json({
        message: 'No fue posible procesar la imagen del producto.',
      })
    }
```

- [ ] **Step 2: Aplicar en la foto de mascota**

En `backend/src/middlewares/uploadMascotaPhotoMiddleware.js`, agregar los imports:

```js
const fs = require('fs')
const {
  verificarCupoAlmacenamiento,
  registrarUsoAlmacenamiento,
} = require('../services/almacenamientoService')
```

Reemplazar `uploadMascotaPhotoSingle` (líneas 33-58) por:

```js
const uploadMascotaPhotoSingle = (req, res, next) => {
  uploadMascotaPhoto.single('foto')(req, res, async (error) => {
    if (error) {
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          res.status(400).json({
            message: 'La foto supera el tamano maximo permitido de 4 MB.',
          })
          return
        }

        res.status(400).json({
          message: 'Solo se permiten imagenes JPG, PNG o WEBP para la foto del paciente.',
        })
        return
      }

      res.status(400).json({
        message: error.message || 'No fue posible cargar la foto del paciente.',
      })
      return
    }

    if (!req.file) {
      next()
      return
    }

    // Este middleware usa diskStorage, asi que el archivo ya esta escrito
    // cuando llegamos aqui: si no hay cupo hay que borrarlo.
    try {
      const clinicaId = req.auth?.clinicaId || req.usuario?.clinicaId
      const cupo = await verificarCupoAlmacenamiento(clinicaId, req.file.size)

      if (!cupo.permitido) {
        fs.unlink(req.file.path, () => {})
        res.status(413).json({
          message: `Tu plan incluye ${cupo.limiteMB} MB de almacenamiento y ya estan ocupados. Borra archivos que no uses para subir mas.`,
          code: 'STORAGE_LIMIT_REACHED',
          limiteMB: cupo.limiteMB,
          usadoMB: cupo.usadoMB,
        })
        return
      }

      await registrarUsoAlmacenamiento(clinicaId, req.file.size)
      next()
    } catch (cupoError) {
      res.status(500).json({
        message: 'No fue posible validar el espacio disponible.',
      })
    }
  })
}
```

- [ ] **Step 3: Verificar que el contador sube al subir una foto**

Levantar el backend, entrar al frontend y subir una foto de producto en Inventario. Luego:

Run: `cd backend && node -e "require('./src/config/database').query('SELECT nombre, \"almacenamientoUsadoMB\" FROM clinicas').then(([r])=>{console.log(r);process.exit(0)})"`
Expected: el valor de tu clínica pasó de 0 a un número pequeño distinto de cero.

- [ ] **Step 4: Verificar que el tope rechaza la subida sin bloquear el resto**

Bajar temporalmente el cupo para provocar el rechazo:

Run: `cd backend && node -e "require('./src/config/database').query('UPDATE suscripciones SET \"almacenamientoMB\" = 0 WHERE \"clinicaId\" = (SELECT id FROM clinicas LIMIT 1)').then(()=>process.exit(0))"`

Intentar subir otra foto de producto en el frontend.
Expected: responde `413` y la UI muestra el mensaje de almacenamiento lleno. **El resto de la aplicación sigue funcionando**: se pueden crear pacientes, historias y facturas con normalidad.

Restaurar el cupo:

Run: `cd backend && node -e "require('./src/config/database').query('UPDATE suscripciones SET \"almacenamientoMB\" = 2048 WHERE \"clinicaId\" = (SELECT id FROM clinicas LIMIT 1)').then(()=>process.exit(0))"`

- [ ] **Step 5: Correr la suite completa**

Run: `cd backend && npm test`
Expected: PASS en los siete archivos de test.

- [ ] **Step 6: Commit**

```bash
git add backend/src/middlewares/uploadProductoFotoMiddleware.js backend/src/middlewares/uploadMascotaPhotoMiddleware.js
git commit -m "feat(almacenamiento): rechaza subidas que superen el cupo del plan sin bloquear el resto"
```

---

# Fase 3 — Frontend

### Task 10: Helpers puros de estado de suscripción

**Files:**
- Create: `frontend/src/lib/suscripcion.js`
- Create: `frontend/src/lib/suscripcion.test.js`

**Interfaces:**
- Consumes: la forma de `suscripcion` que devuelve el backend (`{ plan, estado, fechaFin, funcionalidades }`).
- Produces: `esSoloLectura(suscripcion) => boolean`, `estaEnPrueba(suscripcion) => boolean`, `diasRestantesPrueba(suscripcion, hoy?) => number | null`, `tieneFuncionalidad(suscripcion, clave) => boolean`, `FUNCIONALIDAD_DIAN`.

- [ ] **Step 1: Escribir el test que falla**

Crear `frontend/src/lib/suscripcion.test.js`:

```js
import { describe, it, expect } from 'vitest'
import {
  esSoloLectura,
  estaEnPrueba,
  diasRestantesPrueba,
  tieneFuncionalidad,
  FUNCIONALIDAD_DIAN,
} from './suscripcion'

describe('esSoloLectura', () => {
  it('detecta el estado de solo lectura', () => {
    expect(esSoloLectura({ estado: 'solo_lectura' })).toBe(true)
  })

  it('no confunde los estados que si pueden escribir', () => {
    expect(esSoloLectura({ estado: 'activa' })).toBe(false)
    expect(esSoloLectura({ estado: 'prueba' })).toBe(false)
  })

  it('tolera la ausencia de suscripcion', () => {
    // Al arrancar la app el store todavia no tiene la suscripcion: no podemos
    // dejar la UI en solo lectura por eso.
    expect(esSoloLectura(null)).toBe(false)
    expect(esSoloLectura(undefined)).toBe(false)
  })
})

describe('diasRestantesPrueba', () => {
  it('cuenta los dias que faltan', () => {
    expect(
      diasRestantesPrueba({ estado: 'prueba', fechaFin: '2026-08-30' }, new Date(2026, 7, 12, 10))
    ).toBe(18)
  })

  it('el ultimo dia cuenta como cero', () => {
    expect(
      diasRestantesPrueba({ estado: 'prueba', fechaFin: '2026-08-12' }, new Date(2026, 7, 12, 23))
    ).toBe(0)
  })

  it('devuelve null si no esta en prueba', () => {
    expect(diasRestantesPrueba({ estado: 'activa', fechaFin: '2026-08-30' })).toBeNull()
  })
})

describe('estaEnPrueba', () => {
  it('distingue la prueba de los demas estados', () => {
    expect(estaEnPrueba({ estado: 'prueba' })).toBe(true)
    expect(estaEnPrueba({ estado: 'activa' })).toBe(false)
    expect(estaEnPrueba(null)).toBe(false)
  })
})

describe('tieneFuncionalidad', () => {
  it('lee el arreglo de funcionalidades', () => {
    expect(tieneFuncionalidad({ funcionalidades: ['inventario'] }, 'inventario')).toBe(true)
    expect(tieneFuncionalidad({ funcionalidades: ['inventario'] }, FUNCIONALIDAD_DIAN)).toBe(false)
  })

  it('tolera datos ausentes o malformados', () => {
    expect(tieneFuncionalidad(null, 'inventario')).toBe(false)
    expect(tieneFuncionalidad({ funcionalidades: null }, 'inventario')).toBe(false)
  })
})
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

Run: `cd frontend && npx vitest run src/lib/suscripcion.test.js`
Expected: FAIL con `Failed to resolve import "./suscripcion"`

- [ ] **Step 3: Implementar los helpers**

Crear `frontend/src/lib/suscripcion.js`:

```js
// Estado de la suscripcion tal como lo entrega el backend. El plan dice que se
// compro; el estado dice si la clinica puede escribir.

export const FUNCIONALIDAD_DIAN = 'facturacion_electronica'

export const esSoloLectura = (suscripcion) => suscripcion?.estado === 'solo_lectura'

export const estaEnPrueba = (suscripcion) => suscripcion?.estado === 'prueba'

// Devuelve los dias completos que faltan para el corte, o null si la clinica no
// esta en prueba. `fechaFin` llega como DATEONLY ('YYYY-MM-DD'), asi que se
// parsea a mano para no caer en la interpretacion UTC de `new Date(string)`.
export const diasRestantesPrueba = (suscripcion, hoy = new Date()) => {
  if (!estaEnPrueba(suscripcion) || !suscripcion?.fechaFin) {
    return null
  }

  const [year, month, day] = suscripcion.fechaFin.split('-').map(Number)
  const fin = new Date(year, month - 1, day)
  const inicioDeHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  const MS_POR_DIA = 24 * 60 * 60 * 1000

  return Math.max(0, Math.round((fin - inicioDeHoy) / MS_POR_DIA))
}

export const tieneFuncionalidad = (suscripcion, clave) =>
  Array.isArray(suscripcion?.funcionalidades) && suscripcion.funcionalidades.includes(clave)
```

- [ ] **Step 4: Ejecutar el test y verificar que pasa**

Run: `cd frontend && npx vitest run src/lib/suscripcion.test.js`
Expected: PASS, 4 suites, 10 tests.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/suscripcion.js frontend/src/lib/suscripcion.test.js
git commit -m "feat(frontend): agrega helpers de estado de suscripcion"
```

---

### Task 11: Banner de prueba y de solo lectura, y manejo del 403

**Files:**
- Create: `frontend/src/components/shared/SuscripcionBanner.jsx`
- Modify: `frontend/src/lib/api.js`
- Modify: `frontend/src/components/layout/AdminShell.jsx`

**Interfaces:**
- Consumes: `esSoloLectura`, `estaEnPrueba`, `diasRestantesPrueba` de Task 10; `useAuthStore` (`state.suscripcion`, `state.setSuscripcion`).
- Produces: componente `<SuscripcionBanner />` sin props.

- [ ] **Step 1: Crear el banner**

Crear `frontend/src/components/shared/SuscripcionBanner.jsx`:

```jsx
import { Link } from 'react-router-dom'
import { AlertTriangle, Clock } from 'lucide-react'
import useAuthStore from '@/store/authStore'
import { esSoloLectura, estaEnPrueba, diasRestantesPrueba } from '@/lib/suscripcion'

// Aviso persistente del estado de la suscripcion. En solo lectura el mensaje
// deja claro que los datos siguen ahi y se pueden exportar: la clinica maneja
// historias clinicas y no puede sentir que se las secuestraron.
const SuscripcionBanner = () => {
  const suscripcion = useAuthStore((state) => state.suscripcion)

  if (esSoloLectura(suscripcion)) {
    return (
      <div
        role="status"
        className="flex flex-wrap items-center gap-3 border-b border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
      >
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
        <p className="flex-1">
          Tu suscripción venció. Puedes consultar y exportar toda tu información, pero no crear ni
          editar registros.
        </p>
        <Link
          to="/configuracion"
          className="rounded-md bg-destructive px-3 py-1.5 font-medium text-destructive-foreground"
        >
          Activar plan
        </Link>
      </div>
    )
  }

  if (!estaEnPrueba(suscripcion)) {
    return null
  }

  const dias = diasRestantesPrueba(suscripcion)

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-3 border-b border-primary/30 bg-primary/10 px-4 py-3 text-sm text-foreground"
    >
      <Clock className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      <p className="flex-1">
        {dias === 0
          ? 'Hoy es el último día de tu prueba.'
          : `Te ${dias === 1 ? 'queda' : 'quedan'} ${dias} ${dias === 1 ? 'día' : 'días'} de prueba.`}
      </p>
      <Link
        to="/configuracion"
        className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground"
      >
        Activar plan
      </Link>
    </div>
  )
}

export default SuscripcionBanner
```

Nota: verificar que el import por defecto de `useAuthStore` coincide con cómo lo exporta `frontend/src/store/authStore.js`; si es export nombrado, ajustar.

- [ ] **Step 2: Montar el banner en el shell**

Abrir `frontend/src/components/layout/AdminShell.jsx`, agregar el import:

```jsx
import SuscripcionBanner from '@/components/shared/SuscripcionBanner'
```

E insertar `<SuscripcionBanner />` como primer elemento dentro del contenedor del área de contenido, justo encima del `<Outlet />` o del `{children}` del layout.

- [ ] **Step 3: Centralizar el manejo del 403 de solo lectura**

En `frontend/src/lib/api.js`, dentro del interceptor de respuesta que ya maneja los 401, agregar antes de rechazar el error:

```js
    // La suscripcion vencio mientras la sesion estaba abierta: se sincroniza el
    // store para que el banner aparezca sin esperar a recargar. El componente
    // sigue recibiendo su propio error.
    if (error.response?.status === 403 && error.response?.data?.code === 'SUBSCRIPTION_READ_ONLY') {
      const { setSuscripcion, suscripcion } = useAuthStore.getState()

      if (suscripcion && suscripcion.estado !== 'solo_lectura') {
        setSuscripcion({ ...suscripcion, estado: 'solo_lectura' })
      }
    }
```

Verificar que `useAuthStore` ya esté importado en el archivo; si no, agregarlo.

- [ ] **Step 4: Hook para deshabilitar acciones en solo lectura**

Agregar al final de `frontend/src/lib/suscripcion.js`:

```js
// Nota: este archivo tambien exporta un hook porque el estado de solo lectura
// se consulta desde componentes en todo el arbol. Se mantiene junto a los
// helpers para que exista una sola fuente de verdad del concepto.
```

Y crear `frontend/src/lib/useSoloLectura.js`:

```js
import useAuthStore from '@/store/authStore'
import { esSoloLectura } from '@/lib/suscripcion'

// Devuelve las props que deshabilitan un boton o formulario cuando la
// suscripcion vencio, con la explicacion en el title para que el usuario
// entienda por que no puede actuar.
export const useSoloLectura = () => {
  const suscripcion = useAuthStore((state) => state.suscripcion)
  const soloLectura = esSoloLectura(suscripcion)

  return {
    soloLectura,
    propsAccion: soloLectura
      ? {
          disabled: true,
          title: 'Tu suscripción venció. Puedes consultar y exportar, pero no editar.',
        }
      : {},
  }
}
```

- [ ] **Step 5: Verificar que compila y que los tests siguen pasando**

Run: `cd frontend && npm run build && npx vitest run`
Expected: build OK y tests en verde.

- [ ] **Step 6: Verificar el banner de prueba en el navegador**

Con backend y frontend levantados, entrar con una clínica cuya suscripción esté en `prueba`.
Expected: aparece la franja "Te quedan N días de prueba" encima del contenido, en todas las páginas del área administrativa.

- [ ] **Step 7: Verificar el banner de solo lectura**

Forzar el estado en la base:

Run: `cd backend && node -e "require('./src/config/database').query(\"UPDATE suscripciones SET estado='solo_lectura' WHERE \\\"clinicaId\\\" = (SELECT id FROM clinicas LIMIT 1)\").then(()=>process.exit(0))"`

Recargar el frontend e intentar crear un paciente.
Expected: aparece la franja roja de solo lectura; la creación falla con el mensaje del backend; **la navegación y la consulta siguen funcionando**.

Restaurar:

Run: `cd backend && node -e "require('./src/config/database').query(\"UPDATE suscripciones SET estado='prueba' WHERE \\\"clinicaId\\\" = (SELECT id FROM clinicas LIMIT 1)\").then(()=>process.exit(0))"`

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/shared/SuscripcionBanner.jsx frontend/src/components/layout/AdminShell.jsx frontend/src/lib/api.js frontend/src/lib/useSoloLectura.js frontend/src/lib/suscripcion.js
git commit -m "feat(frontend): muestra el estado de prueba y de solo lectura en el shell"
```

---

### Task 12: Podar los gates de funcionalidad en las páginas

**Files:**
- Modify: `frontend/src/pages/InventarioPage.jsx:134-136`
- Modify: `frontend/src/pages/FinanzasPage.jsx:109-117`
- Modify: `frontend/src/pages/ConfiguracionPage.jsx:1289-1290`
- Modify: `frontend/src/pages/HistoriasPage.jsx:72`
- Modify: `frontend/src/pages/AgendaPage.jsx:189`
- Modify: `frontend/src/pages/AntecedentesPage.jsx:202`
- Modify: `frontend/src/pages/PacientesPage.jsx:81`
- Modify: `frontend/src/pages/PacienteHistorialPage.jsx:172`
- Modify: `frontend/src/pages/UsuariosPage.jsx:234`
- Modify: `frontend/src/pages/DashboardPage.jsx:507-510,661`
- Modify: `frontend/src/features/historias/HistoriaClinicaFormDrawer.jsx:199`

**Interfaces:**
- Consumes: `tieneFuncionalidad`, `FUNCIONALIDAD_DIAN` de Task 10.
- Produces: nada nuevo.

**Regla:** todos los planes traen `inventario`, `facturacion_interna`, `reportes_operativos`, `reportes_completos`, `exportables`, `roles_base`, `citas`, `historias`, `antecedentes`, `propietarios` y `mascotas`. Preguntar por ellos siempre da verdadero, así que el chequeo se elimina. **La única pregunta que sobrevive es la de `facturacion_electronica`.**

- [ ] **Step 1: Inventario**

En `frontend/src/pages/InventarioPage.jsx`, reemplazar las líneas 134-136 por:

```jsx
  // Todos los planes incluyen inventario y reportes operativos.
  const puedeConsultarInventario = true
```

Dejar la variable declarada evita tocar todos sus usos en el JSX.

- [ ] **Step 2: Finanzas**

En `frontend/src/pages/FinanzasPage.jsx`, agregar el import:

```jsx
import { tieneFuncionalidad, FUNCIONALIDAD_DIAN } from '@/lib/suscripcion'
```

Reemplazar las líneas 109-117 por:

```jsx
  // Todos los planes traen caja, facturacion interna, inventario y reportes.
  // La unica funcionalidad que se compra aparte es la DIAN.
  const puedeVerFinanzas = true
  const puedeConsultarInventario = true
  const puedeFacturarElectronicamente = tieneFuncionalidad(suscripcion, FUNCIONALIDAD_DIAN)
```

Nota: la línea 117 original combina `funcionalidades.includes('facturacion_electronica')` con otra condición mediante `&&`. Conservar esa segunda condición uniéndola al nuevo `tieneFuncionalidad(...)`.

- [ ] **Step 3: Configuración**

En `frontend/src/pages/ConfiguracionPage.jsx`, agregar el mismo import y reemplazar las líneas 1289-1290 por:

```jsx
  const puedeVerFacturacionElectronica = tieneFuncionalidad(suscripcion, FUNCIONALIDAD_DIAN)
```

- [ ] **Step 4: Las páginas cuyo gate desaparece por completo**

`HistoriasPage.jsx:72`, `AgendaPage.jsx:189`, `AntecedentesPage.jsx:202`, `PacientesPage.jsx:81`, `PacienteHistorialPage.jsx:172`, `UsuariosPage.jsx:234` y `HistoriaClinicaFormDrawer.jsx:199` construyen un `featureSet` o leen `funcionalidades` para comprobar funcionalidades que ahora tienen todos los planes.

Para cada una:
1. Localizar qué claves consulta: `cd frontend && grep -n "featureSet\.has\|funcionalidades.includes" src/pages/<archivo>`
2. Si todas las claves están en la lista de funcionalidades completas, reemplazar cada comprobación por `true` y eliminar la construcción del `featureSet`.
3. Si alguna consulta `facturacion_electronica`, conservarla con `tieneFuncionalidad(suscripcion, FUNCIONALIDAD_DIAN)`.

- [ ] **Step 5: Dashboard**

En `frontend/src/pages/DashboardPage.jsx`, la función `getFeatureStateRows(funcionalidades)` (usada en la línea 661) alimenta una tabla de "estado de funcionalidades del plan". Bajo el modelo nuevo esa tabla solo tiene una fila con información: la de DIAN.

Reemplazar la llamada de la línea 661 por:

```jsx
  const featureRows = [
    {
      label: 'Facturación electrónica DIAN',
      activo: tieneFuncionalidad(suscripcion, FUNCIONALIDAD_DIAN),
      hint: 'Disponible próximamente como complemento.',
    },
  ]
```

Ajustar el componente que la renderiza si espera otra forma de fila, y eliminar `getFeatureStateRows` si queda sin usos.

- [ ] **Step 6: Deshabilitar las acciones principales en solo lectura**

En cada una de las páginas de módulo (`AgendaPage`, `PacientesPage`, `HistoriasPage`, `AntecedentesPage`, `InventarioPage`, `FinanzasPage`, `UsuariosPage`), agregar el import:

```jsx
import { useSoloLectura } from '@/lib/useSoloLectura'
```

Declarar el hook junto a los demás al inicio del componente:

```jsx
  const { propsAccion } = useSoloLectura()
```

Y esparcir `{...propsAccion}` en el botón principal de creación de cada página. Ejemplo del botón "Nuevo paciente" en `PacientesPage`:

```jsx
<Button onClick={abrirFormulario} {...propsAccion}>
  Nuevo paciente
</Button>
```

Alcance de este paso: **solo los botones de creación de nivel de página**. El backend ya rechaza toda mutación con el `403`, así que esto es claridad para el usuario, no la barrera de seguridad. No hace falta recorrer cada botón de edición en cada tabla y diálogo.

- [ ] **Step 7: Verificar que no quedan gates obsoletos**

Run: `cd frontend && grep -rn "includes('inventario')\|includes('facturacion_interna')\|includes('reportes_operativos')\|includes('reportes_completos')\|includes('exportables')\|includes('roles_base')" src/`
Expected: sin resultados.

- [ ] **Step 8: Verificar que compila y que los tests siguen pasando**

Run: `cd frontend && npm run build && npx vitest run`
Expected: build OK y todos los tests en verde.

- [ ] **Step 9: Recorrer la aplicación en el navegador**

Entrar con una clínica en `prueba` y visitar Agenda, Pacientes, Historias, Antecedentes, Inventario, Finanzas, Usuarios, Configuración y Dashboard.
Expected: todos los módulos accesibles y funcionales. En Finanzas y Configuración, la facturación electrónica aparece como no disponible.

Después forzar `estado='solo_lectura'` y recorrerlas de nuevo.
Expected: los botones de creación aparecen deshabilitados con el tooltip explicativo, y la consulta sigue funcionando en todas.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/pages frontend/src/features/historias/HistoriaClinicaFormDrawer.jsx
git commit -m "refactor(frontend): elimina los gates de funcionalidades que ahora traen todos los planes"
```

---

### Task 13: Reescribir `PlanesPage` y actualizar Superadmin

**Files:**
- Modify: `frontend/src/pages/PlanesPage.jsx`
- Modify: `frontend/src/pages/SuperadminPage.jsx`

**Interfaces:**
- Consumes: los precios de las Global Constraints.
- Produces: nada nuevo.

- [ ] **Step 1: Reemplazar los datos de planes**

En `frontend/src/pages/PlanesPage.jsx`, sustituir el arreglo `PLANS` (que termina en la línea 89) y todo el bloque `COMPARISON_GROUPS` (líneas 91-125) por:

```jsx
// Refleja backend/src/config/planes.js. Un solo plan pago; la DIAN es el unico
// complemento que se compra aparte y todavia no esta disponible.
const PLAN = {
  key: 'activo',
  nombre: 'Bourgelat',
  descripcion: 'Toda la operación de tu clínica en un solo sistema.',
  precioMensual: 89000,
  precioAnual: 75000,
  incluye: [
    'Agenda con contexto del paciente',
    'Historia clínica y antecedentes',
    'Pacientes y propietarios ilimitados',
    'Inventario y control de insumos',
    'Caja y facturación interna',
    'Reportes completos y exportables',
    'Roles y auditoría del equipo',
    '3 usuarios incluidos',
    '20 GB de almacenamiento',
  ],
}

const USUARIO_ADICIONAL = {
  precio: 25000,
  descripcion: 'Por cada usuario más allá de los 3 incluidos.',
}

const ADDON_DIAN = {
  nombre: 'Facturación electrónica DIAN',
  precio: 49000,
  documentosIncluidos: 200,
  precioExcedente: 250,
  disponible: false,
  etiqueta: 'Próximamente',
  descripcion:
    'Emisión validada ante la DIAN, notas crédito y débito, XML firmado y envío automático al correo del propietario.',
}

const PRUEBA = {
  dias: 30,
  usuarios: 2,
  almacenamientoGB: 2,
  descripcion:
    'Treinta días con todo abierto, sin tarjeta. Alcanza para vivir un cierre de mes completo.',
}
```

- [ ] **Step 2: Adaptar el JSX**

Recorrer el JSX y reemplazar los usos de `PLANS` y `COMPARISON_GROUPS`:

1. La rejilla de tarjetas de planes pasa a **una sola tarjeta** con `PLAN`, más una tarjeta secundaria para `ADDON_DIAN` marcada con su `etiqueta`, y una mención de `USUARIO_ADICIONAL`.
2. La tabla comparativa de cuatro columnas se elimina por completo, junto con los componentes auxiliares que solo ella usaba. Bajo un plan único no hay nada que comparar.
3. El bloque `PLAN_MATCH` ("Estás empezando" / "Operación diaria" / "Círculo completo") se sustituye por un bloque único que explica la prueba, usando `PRUEBA`.
4. Conservar el lenguaje visual existente: tipografía, colores de marca y espaciados no cambian.

- [ ] **Step 3: Verificar que no quedan referencias a los planes viejos**

Run: `cd frontend && grep -n "'inicio'\|'clinica'\|'profesional'" src/pages/PlanesPage.jsx`
Expected: sin resultados.

- [ ] **Step 4: Actualizar Superadmin**

Run: `cd frontend && grep -n "inicio\|clinica\|profesional\|personalizado" src/pages/SuperadminPage.jsx`

Reemplazar la lista de llaves de plan por `['prueba', 'activo', 'cortesia', 'personalizado']`, con las etiquetas `Prueba`, `Bourgelat`, `Cortesía` y `Personalizado`.

- [ ] **Step 5: Verificar que compila**

Run: `cd frontend && npm run build && npx vitest run`
Expected: build OK y tests en verde.

- [ ] **Step 6: Revisar las dos páginas en el navegador**

Abrir `/planes` sin sesión iniciada.
Expected: se ve un plan con su precio, el selector mensual/anual funcionando con $89.000 y $75.000, el complemento DIAN marcado como "Próximamente", y el bloque de la prueba de 30 días. Sin tabla comparativa.

Abrir `/superadmin` con una cuenta de superadmin.
Expected: el selector de plan ofrece las cuatro llaves nuevas y permite otorgar cortesía.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/PlanesPage.jsx frontend/src/pages/SuperadminPage.jsx
git commit -m "feat(frontend): reescribe la pagina de planes al modelo de plan unico"
```

---

## Verificación final

- [ ] `cd backend && npm test` — siete archivos de test en verde
- [ ] `cd frontend && npx vitest run` — tests en verde
- [ ] `cd frontend && npm run build` — compila
- [ ] Registrar una clínica nueva: queda en `prueba` con vencimiento a 30 días
- [ ] Forzar `estado='solo_lectura'`: se puede consultar y exportar, no crear ni editar, y el banner lo explica
- [ ] Una cuenta migrada desde `inicio` está en `cortesia` con vigencia 2099 y acceso completo
- [ ] Agregar a mano una ruta `router.post` sin `requerirEscritura` y arrancar el backend: el arranque falla señalando el archivo y el método. **Revertir después de comprobarlo.**

## Fuera de alcance

- Construcción del add-on DIAN: perfil fiscal, compra y conteo de documentos.
- Pasarela de pagos. La activación del plan `activo` sigue siendo manual vía superadmin.
- Venta de almacenamiento adicional.
