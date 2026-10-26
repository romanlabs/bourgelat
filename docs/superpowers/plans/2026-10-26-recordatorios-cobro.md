# Recordatorios de cobro por correo — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correo a los admins de cada clínica 7 días antes, 1 día antes y al vencer su prueba o plan, con enlace a `/pagar`, y resumen diario a soporte@ con botón de WhatsApp por clínica.

**Architecture:** Reglas puras (`recordatoriosCobroReglas.js`) deciden tipo, precios y enlace `wa.me`; un servicio (`recordatoriosCobroService.js`) consulta candidatas, registra en `recordatorios_suscripcion` antes de enviar (índice único = candado) y manda los correos; un job horario en `index.js` lo ejecuta una vez al día entre 8 y 20 h, y un script CLI lo simula o lo ejecuta a mano.

**Tech Stack:** Node + Express 5, Sequelize 6 (migraciones propias), nodemailer/Brevo vía `emailService`, pruebas con `assert` en archivos `*.test.js` encadenados en `npm test`.

**Spec:** `docs/superpowers/specs/2026-10-15-recordatorios-cobro-design.md` (manda la sección «Ajustes de la revisión» sobre el resto; en particular el punto 4 de «Unidades» sobre precios queda reemplazado por ella).

## Global Constraints

- Momentos: `vence_pronto` (2 ≤ dias ≤ 7), `vence_manana` (0 ≤ dias ≤ 1), `vencida` (fechaFin entre hoy-3 y hoy-1).
- Estados: `vence_*` solo `prueba`/`activa`; `vencida` también `solo_lectura`.
- Excluidas: plan `cortesia`, `fechaFin === CORTESIA_END_DATE` (`'2099-12-31'`), y `personalizado` con `precio` 0.
- Ningún precio escrito a mano: plan pago → `suscripcion.precio`; prueba con `precio > 0` → solo ese; prueba sin precio → planes pagos de `PLANES` con `precioMensual > 0` (hoy Esencial $89.000 y Clínica $120.000). Sin mención a la DIAN.
- Destinatarios: usuarios `rol: 'admin'`, `activo: true` de la clínica.
- Tope: **30** correos de clínica por ejecución.
- Registrar antes de enviar; si no salió ningún correo, borrar el registro.
- Fechas con `hoyISO` / `sumarDiasISO` de `utils/vencimiento.js` (nunca `formatDateOnly`, que usa la hora del servidor).
- Queries del job con `sinTenant: true`. Logs con `contexto: 'recordatorios-cobro'`.
- Resumen a `soporte@bourgelat.co` solo si hubo envíos.
- URL del frontend: misma resolución que `jobs/recordatoriosCita.js` (`OAUTH_FRONTEND_URL` → `FRONTEND_URLS[0]` → `FRONTEND_URL` → `https://app.bourgelat.co`).
- Copy en español con tildes; textos de cara a la clínica sin jerga técnica.
- Sin variables de entorno nuevas.

## Review Focus

1. **Fila de solo lectura creada por `crearSuscripcionSoloLectura`** (`fechaInicio === fechaFin`, `precio 0`, estado `solo_lectura`): no es un vencimiento real; si cae en la ventana de `vencida`, la clínica recibiría un segundo «quedó en solo lectura». Se excluye en `clasificarRecordatorio` (test en Task 1).
2. **Clínica que ya renovó o tiene otra suscripción vigente** con `fechaFin >= hoy`: no debe recibir ningún tipo, ni solo `vencida`. `clasificarRecordatorio` recibe `tieneOtraVigente` y devuelve `null` para los tres tipos (test en Task 1).
3. **Teléfono raro** (con espacios, `+57`, fijo de 7 dígitos, vacío): el enlace `wa.me` sale solo con un celular de 10 dígitos que empieza por 3 (o 57 + eso); si no, `null` y el resumen muestra solo el correo (tests en Task 1).
4. **Clínica sin admins activos**: no se registra nada y no cuenta para el tope; se reintenta mañana sin ruido de error (test manual en Task 4).
5. **Tope a mitad de una clínica con varios admins**: no se parte una clínica; si sus admins no caben en lo que queda del tope, se para ahí y la clínica sale al día siguiente (test en Task 3, `cabeEnTope`).

---

### Task 1: Reglas puras

**Files:**
- Create: `backend/src/services/recordatoriosCobroReglas.js`
- Create: `backend/src/services/recordatoriosCobroReglas.test.js`
- Modify: `backend/package.json` (agregar `&& node src/services/recordatoriosCobroReglas.test.js` al final de `test`)

**Interfaces:**
- Consumes: `PLANES`, `CORTESIA_END_DATE` de `config/planes.js`; `sumarDiasISO` de `utils/vencimiento.js`.
- Produces:
  - `TOPE_POR_EJECUCION = 30`, `TIPOS = ['vence_pronto', 'vence_manana', 'vencida']`
  - `diasHasta(fechaFin: 'YYYY-MM-DD', hoy: 'YYYY-MM-DD') → number` (entero, negativo si ya pasó)
  - `clasificarRecordatorio({ suscripcion, hoy, tieneOtraVigente = false }) → null | { tipo, dias }`; `suscripcion` es objeto plano o instancia con `plan, estado, fechaInicio, fechaFin, precio`
  - `preciosRecordatorio(suscripcion) → Array<{ nombre: string, precioMensual: number }>`
  - `normalizarCelular(telefono) → string | null` (`'57' + 10 dígitos` o null)
  - `enlaceWhatsapp({ telefono, nombreClinica, urlPagar }) → string | null`
  - `cabeEnTope({ enviados, destinatarios, tope = TOPE_POR_EJECUCION }) → boolean`

- [ ] **Step 1: Escribir el test que falla** (estilo `recordatorioCitaReglas.test.js`: `assert` + `console.log` final)

```js
const hoy = '2026-10-26'
const base = { plan: 'activo', estado: 'activa', fechaInicio: '2026-09-26', precio: '120000.00' }
const fin = (d) => sumarDiasISO(hoy, d)
const c = (extra) => clasificarRecordatorio({ suscripcion: { ...base, ...extra }, hoy })

assert.strictEqual(c({ fechaFin: fin(8) }), null)
assert.deepStrictEqual(c({ fechaFin: fin(7) }), { tipo: 'vence_pronto', dias: 7 })
assert.deepStrictEqual(c({ fechaFin: fin(2) }), { tipo: 'vence_pronto', dias: 2 })
assert.deepStrictEqual(c({ fechaFin: fin(1) }), { tipo: 'vence_manana', dias: 1 })
assert.deepStrictEqual(c({ fechaFin: fin(0) }), { tipo: 'vence_manana', dias: 0 })
assert.deepStrictEqual(c({ fechaFin: fin(-1) }), { tipo: 'vencida', dias: -1 })
assert.deepStrictEqual(c({ fechaFin: fin(-3) }), { tipo: 'vencida', dias: -3 })
assert.strictEqual(c({ fechaFin: fin(-4) }), null)
assert.deepStrictEqual(c({ fechaFin: fin(-2), estado: 'solo_lectura' }), { tipo: 'vencida', dias: -2 })
assert.strictEqual(c({ fechaFin: fin(3), estado: 'solo_lectura' }), null)
assert.strictEqual(c({ fechaFin: fin(3), estado: 'cancelada' }), null)
assert.strictEqual(c({ fechaFin: fin(-1), estado: 'vencida' }), null)
assert.deepStrictEqual(c({ fechaFin: fin(5), estado: 'prueba', plan: 'prueba', precio: 0 }), { tipo: 'vence_pronto', dias: 5 })
// excluidas
assert.strictEqual(c({ fechaFin: fin(3), plan: 'cortesia' }), null)
assert.strictEqual(c({ fechaFin: '2099-12-31' }), null)
assert.strictEqual(c({ fechaFin: fin(3), plan: 'personalizado', precio: '0.00' }), null)
assert.deepStrictEqual(c({ fechaFin: fin(3), plan: 'personalizado', precio: '150000' }), { tipo: 'vence_pronto', dias: 3 })
// Review Focus 1: fila de solo lectura creada al vuelo (inicio = fin)
assert.strictEqual(c({ fechaFin: fin(-1), fechaInicio: fin(-1), estado: 'solo_lectura', precio: 0 }), null)
// Review Focus 2: otra vigente
assert.strictEqual(clasificarRecordatorio({ suscripcion: { ...base, fechaFin: fin(3) }, hoy, tieneOtraVigente: true }), null)
assert.strictEqual(clasificarRecordatorio({ suscripcion: { ...base, fechaFin: fin(-1) }, hoy, tieneOtraVigente: true }), null)

// precios
assert.deepStrictEqual(preciosRecordatorio({ plan: 'activo', precio: '120000.00' }), [{ nombre: 'Clínica', precioMensual: 120000 }])
assert.deepStrictEqual(preciosRecordatorio({ plan: 'prueba', precio: 0 }).map((p) => p.precioMensual), [89000, 120000])
assert.deepStrictEqual(preciosRecordatorio({ plan: 'prueba', precio: '49000' }), [{ nombre: 'Tu plan', precioMensual: 49000 }])
assert.deepStrictEqual(preciosRecordatorio({ plan: 'esencial', precio: 0 }), [{ nombre: 'Esencial', precioMensual: 89000 }])

// celular y wa.me (Review Focus 3)
assert.strictEqual(normalizarCelular('300 123 4567'), '573001234567')
assert.strictEqual(normalizarCelular('+57 300-123-4567'), '573001234567')
assert.strictEqual(normalizarCelular('573001234567'), '573001234567')
assert.strictEqual(normalizarCelular('6012345678'), null)
assert.strictEqual(normalizarCelular('1234567'), null)
assert.strictEqual(normalizarCelular(''), null)
assert.strictEqual(normalizarCelular(null), null)
const wa = enlaceWhatsapp({ telefono: '3001234567', nombreClinica: 'Pegatos & Co', urlPagar: 'https://app.bourgelat.co/pagar' })
assert.ok(wa.startsWith('https://wa.me/573001234567?text='))
assert.ok(decodeURIComponent(wa.split('text=')[1]).includes('Pegatos & Co'))
assert.ok(decodeURIComponent(wa.split('text=')[1]).includes('https://app.bourgelat.co/pagar'))
assert.strictEqual(enlaceWhatsapp({ telefono: null, nombreClinica: 'X', urlPagar: 'u' }), null)

// tope (Review Focus 5)
assert.strictEqual(cabeEnTope({ enviados: 28, destinatarios: 2 }), true)
assert.strictEqual(cabeEnTope({ enviados: 29, destinatarios: 2 }), false)
assert.strictEqual(cabeEnTope({ enviados: 0, destinatarios: 31 }), false)
```

Importa: `assert`, `sumarDiasISO` y las funciones nuevas.

- [ ] **Step 2: Correr y ver que falla**

Run: `cd backend && node src/services/recordatoriosCobroReglas.test.js`
Expected: FAIL con `Cannot find module './recordatoriosCobroReglas'`.

- [ ] **Step 3: Implementar `recordatoriosCobroReglas.js`**

- `diasHasta`: diferencia de `Date.UTC` de ambas fechas / 86 400 000 (sin horas locales).
- `clasificarRecordatorio`: `fechaFin = String(...).slice(0, 10)`. Orden: excluidas (cortesía, `CORTESIA_END_DATE`, personalizado sin precio, `tieneOtraVigente`) → si `estado === 'solo_lectura'` y `fechaInicio === fechaFin` → null → rangos de la tabla del spec.
- `preciosRecordatorio`: `Number(precio) > 0` → `[{ nombre: plan === 'prueba' ? 'Tu plan' : (PLANES[plan]?.nombre || plan), precioMensual: Number(precio) }]`; si no y `plan === 'prueba'` → entradas de `PLANES` excepto `prueba`/`cortesia`/`personalizado` con `precioMensual > 0`, en el orden de `PLANES`; si no → `[{ nombre, precioMensual: PLANES[plan].precioMensual }]` cuando sea > 0, si no `[]`.
- `normalizarCelular`: quitar todo lo que no sea dígito; si 12 dígitos con `57` + `3…` → igual; si 10 dígitos con `3…` → `'57' + d`; si no, null.
- `enlaceWhatsapp`: mensaje `Hola, te escribimos de Bourgelat. La suscripción de ${nombreClinica} está por vencer o ya venció. Puedes renovarla aquí: ${urlPagar}`; `https://wa.me/${celular}?text=${encodeURIComponent(mensaje)}`.
- `cabeEnTope`: `enviados + destinatarios <= tope`.

- [ ] **Step 4: Correr y ver que pasa**

Run: `cd backend && node src/services/recordatoriosCobroReglas.test.js`
Expected: `recordatoriosCobroReglas.test.js: todos los tests pasaron ✔`

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/recordatoriosCobroReglas.js backend/src/services/recordatoriosCobroReglas.test.js backend/package.json
git commit -m "feat(suscripciones): reglas de los recordatorios de cobro"
```

### Task 2: Modelo y migración `recordatorios_suscripcion`

**Files:**
- Create: `backend/src/migrations/20261026_000001_recordatorios_suscripcion.js`
- Create: `backend/src/models/RecordatorioSuscripcion.js`

**Interfaces:**
- Produces: modelo `RecordatorioSuscripcion` (`tableName: 'recordatorios_suscripcion'`, `timestamps: false`) con `id` UUID PK, `suscripcionId` UUID FK `suscripciones` (CASCADE), `clinicaId` UUID FK `clinicas` (CASCADE), `tipo` ENUM(`TIPOS` de Task 1), `enviadoEn` DATE `defaultValue: NOW`, `destinatarios` INTEGER `allowNull: false, defaultValue: 0`. Índice único `recordatorios_suscripcion_suscripcion_tipo_uq` en `(suscripcionId, tipo)`.

- [ ] **Step 1: Migración** con la forma de `20261023_000001_invitaciones_usuario.js` (`name`, `up` idempotente con `showAllTables`, `down` con `dropTable`). El ENUM de Postgres que crea `createTable` se llama `enum_recordatorios_suscripcion_tipo`; el `down` lo borra con `DROP TYPE IF EXISTS`.

- [ ] **Step 2: Modelo** al estilo de `InvitacionUsuario.js`, mismo índice único declarado en `indexes`.

- [ ] **Step 3: Verificar** con Postgres local

Run: `cd backend && npm run dev` (arranca y corre migraciones), luego `psql -d <bd local> -c "\d recordatorios_suscripcion"`
Expected: la tabla con el índice único `(suscripcionId, tipo)`; el log del arranque muestra la migración aplicada. `npm test` sigue en verde (el `tenantGuard.test.js` y `smokeTest.js` cargan modelos).

- [ ] **Step 4: Commit**

```bash
git add backend/src/migrations/20261026_000001_recordatorios_suscripcion.js backend/src/models/RecordatorioSuscripcion.js
git commit -m "feat(suscripciones): tabla de recordatorios de cobro enviados"
```

### Task 3: Plantillas de correo

**Files:**
- Modify: `backend/src/services/emailService.js` (después de `enviarEmailRecordatorioCita`, y en `module.exports`)
- Create: `backend/src/services/emailRecordatorioCobro.test.js`
- Modify: `backend/package.json` (encadenar el test nuevo)

**Interfaces:**
- Consumes: `preciosRecordatorio` (Task 1) — el llamador ya pasa `precios` resuelto.
- Produces:
  - `armarEmailRecordatorioCobro({ nombre, clinica, tipo, dias, fechaFin, esPrueba, precios, urlPagar, urlFrontend }) → { asunto, html, texto }`
  - `enviarEmailRecordatorioCobro({ para, ...datos })` → resultado de `enviarEmail`
  - `armarEmailResumenCobro({ filas, fecha }) → { asunto, html, texto }`, con `filas: Array<{ clinica, tipo, fechaFin, correos: string[], telefono, enlaceWhatsapp }>`
  - `enviarEmailResumenCobro({ filas, fecha })` → envía a `soporte@bourgelat.co`

Copy fijo (asunto según `tipo` y `esPrueba`; `X` = «prueba» o «plan»):
- `vence_pronto`: `Tu ${X} de Bourgelat vence en ${dias} días`
- `vence_manana`: `dias === 1` → `Tu ${X} de Bourgelat vence mañana`; `dias === 0` → `Tu ${X} de Bourgelat vence hoy`
- `vencida`: `Tu cuenta de Bourgelat quedó en solo lectura`
- Cuerpo: «Hola {nombre},», nombre de la clínica, fecha de vencimiento (`fechaFin` en formato `26 de octubre de 2026`, `Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeZone: 'UTC' })`), una línea por precio (`{nombre}: $89.000 al mes`, `toLocaleString('es-CO')`), botón «Pagar ahora» → `urlPagar`, «Activamos tu plan el mismo día hábil en que recibimos el pago.», y en `vencida`: «Tus datos siguen ahí: puedes consultarlos y exportarlos cuando quieras.» Pie con `pieLegal(urlFrontend)`.
- Resumen: asunto `Recordatorios de cobro enviados (${filas.length})`; tabla con clínica, tipo, vencimiento, correos, teléfono y botón «Enviar WhatsApp» solo si hay `enlaceWhatsapp`.

- [ ] **Step 1: Test que falla**

```js
const base = { nombre: 'Ana', clinica: 'Pegatos <b>', fechaFin: '2026-11-02', urlPagar: 'https://app.bourgelat.co/pagar', urlFrontend: 'https://app.bourgelat.co' }
const pronto = armarEmailRecordatorioCobro({ ...base, tipo: 'vence_pronto', dias: 7, esPrueba: true, precios: [{ nombre: 'Esencial', precioMensual: 89000 }, { nombre: 'Clínica', precioMensual: 120000 }] })
assert.strictEqual(pronto.asunto, 'Tu prueba de Bourgelat vence en 7 días')
assert.ok(pronto.html.includes('Pegatos &lt;b&gt;'))
assert.ok(pronto.html.includes('$89.000') && pronto.html.includes('$120.000'))
assert.ok(pronto.texto.includes('https://app.bourgelat.co/pagar'))
assert.ok(!/DIAN/i.test(pronto.html))
assert.strictEqual(armarEmailRecordatorioCobro({ ...base, tipo: 'vence_manana', dias: 1, esPrueba: false, precios: [] }).asunto, 'Tu plan de Bourgelat vence mañana')
assert.strictEqual(armarEmailRecordatorioCobro({ ...base, tipo: 'vence_manana', dias: 0, esPrueba: false, precios: [] }).asunto, 'Tu plan de Bourgelat vence hoy')
const vencida = armarEmailRecordatorioCobro({ ...base, tipo: 'vencida', dias: -1, esPrueba: false, precios: [] })
assert.strictEqual(vencida.asunto, 'Tu cuenta de Bourgelat quedó en solo lectura')
assert.ok(vencida.texto.includes('exportarlos'))

const resumen = armarEmailResumenCobro({ fecha: '2026-10-26', filas: [
  { clinica: 'A & B', tipo: 'vence_pronto', fechaFin: '2026-11-02', correos: ['a@x.co'], telefono: '3001234567', enlaceWhatsapp: 'https://wa.me/573001234567?text=hola' },
  { clinica: 'C', tipo: 'vencida', fechaFin: '2026-10-25', correos: ['c@x.co'], telefono: null, enlaceWhatsapp: null },
] })
assert.strictEqual(resumen.asunto, 'Recordatorios de cobro enviados (2)')
assert.ok(resumen.html.includes('A &amp; B'))
assert.strictEqual(resumen.html.split('Enviar WhatsApp').length - 1, 1)
```

- [ ] **Step 2: Correr y ver que falla**

Run: `cd backend && node src/services/emailRecordatorioCobro.test.js`
Expected: FAIL, `armarEmailRecordatorioCobro is not a function`.

- [ ] **Step 3: Implementar** las cuatro funciones con el mismo HTML inline que `armarEmailRecordatorioCita` (todo valor pasa por `escaparHtml`, incluidos los `href`).

- [ ] **Step 4: Correr y ver que pasa**; `npm test` completo en verde.

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/emailService.js backend/src/services/emailRecordatorioCobro.test.js backend/package.json
git commit -m "feat(suscripciones): correos de recordatorio de cobro y resumen a soporte"
```

### Task 4: Servicio `procesarRecordatorios`

**Files:**
- Create: `backend/src/services/recordatoriosCobroService.js`

**Interfaces:**
- Consumes: Task 1 (todas), Task 2 (`RecordatorioSuscripcion`), Task 3 (`enviarEmailRecordatorioCobro`, `enviarEmailResumenCobro`), `smtpConfigurado`, `hoyISO`, `sumarDiasISO`, modelos `Suscripcion`, `Clinica`, `Usuario`.
- Produces: `procesarRecordatorios({ simular = false, tope = TOPE_POR_EJECUCION, ahora = new Date() }) → Promise<{ enviados: number, fallidos: number, filas: Array<{ suscripcionId, clinicaId, clinica, plan, tipo, dias, fechaFin, correos, telefono, enlaceWhatsapp }> }>`. Con `simular`, `filas` es lo que saldría y `enviados` 0.

Flujo (no hay test automático de BD en el repo; se valida a mano en el Step 2):
1. `hoy = hoyISO(ahora)`. Candidatas: `Suscripcion.findAll` con `estado IN ('prueba','activa','solo_lectura')`, `fechaFin BETWEEN sumarDiasISO(hoy,-3) AND sumarDiasISO(hoy,7)`, include `Clinica as 'clinica'` (`id, nombre, telefono`), `order fechaFin ASC`, `sinTenant: true`.
2. Ya enviadas: `RecordatorioSuscripcion.findAll({ where: { suscripcionId: ids }, attributes: ['suscripcionId','tipo'], sinTenant: true })` → `Set` de `${suscripcionId}:${tipo}`.
3. `tieneOtraVigente`: una query de suscripciones de esas clínicas con estado `prueba`/`activa` y `fechaFin >= hoy`; para cada candidata, true si hay una con otro `id`.
4. Por candidata: `clasificarRecordatorio`; si null o ya enviada → seguir. Admins: `Usuario.findAll({ where: { clinicaId, rol: 'admin', activo: true }, attributes: ['nombre','email'] })` (lleva clinicaId, no necesita `sinTenant`). Sin admins → seguir (Review Focus 4). Si `!cabeEnTope({ enviados, destinatarios: admins.length, tope })` → log `warn` del tope y `break`.
5. Con `simular`: agregar fila y seguir. Sin `simular`: si `tipo === 'vencida'` y estado `prueba`/`activa` → `suscripcion.update({ estado: 'solo_lectura' })`. `RecordatorioSuscripcion.create({ suscripcionId, clinicaId, tipo, destinatarios: admins.length })`; un `SequelizeUniqueConstraintError` = otra instancia la tomó → seguir. Enviar a cada admin con `esPrueba: suscripcion.estado === 'prueba'`, `precios: preciosRecordatorio(suscripcion)`, `urlPagar: ${urlFrontend}/pagar`; contar los `resultado?.enviado !== false` (en producción) como enviados. Si ninguno salió → `destroy` del registro y `fallidos += 1`; si salieron algunos → `update({ destinatarios: salidos })`. Agregar fila.
6. Al final, si `!simular && filas.length > 0` → `enviarEmailResumenCobro({ filas, fecha: hoy })` en su propio try/catch.
7. Todo en try/catch con `logger.error({ contexto: 'recordatorios-cobro', ... })` (sin datos personales en el mensaje, solo ids); en producción sin SMTP → `warn` y retorno vacío, como el job de citas.

- [ ] **Step 1: Implementar** según el flujo.

- [ ] **Step 2: Verificar en local**: en la BD local, ajustar con SQL tres suscripciones de clínicas de prueba propias (crearlas si no hay; ver memoria de scripts de prueba: restaurar al final) a `fechaFin` = hoy+5, hoy+1 y hoy-2; y una de cortesía.
Run: `cd backend && node -e "require('dotenv').config(); require('./src/services/recordatoriosCobroService').procesarRecordatorios({ simular: true }).then((r) => { console.log(JSON.stringify(r, null, 2)); process.exit(0) })"`
Expected: tres filas (`vence_pronto` dias 5, `vence_manana` dias 1, `vencida` dias -2); la de cortesía no aparece; ninguna fila nueva en `recordatorios_suscripcion`.

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/recordatoriosCobroService.js
git commit -m "feat(suscripciones): servicio que envía los recordatorios de cobro"
```

### Task 5: Job horario y script `cobro:pendientes`

**Files:**
- Create: `backend/src/jobs/recordatoriosCobro.js`
- Modify: `backend/src/index.js:21` (require) y `:272-274` (registro, bajo el bloque de citas con su comentario `// ── Recordatorios de cobro ──`)
- Create: `backend/src/scripts/cobroPendientes.js`
- Modify: `backend/package.json` (`"cobro:pendientes": "node src/scripts/cobroPendientes.js"`)
- Modify: `CLAUDE.md` (sección «Operación de plataforma»: línea `npm run cobro:pendientes   # simula; --enviar los manda`; y en `jobs/` del árbol: «recordatorios de cobro (una vez al día, tope 30)»)

**Interfaces:**
- Consumes: `procesarRecordatorios` (Task 4), `hoyISO`.
- Produces: `ejecutarRecordatoriosCobro({ ahora = new Date() }) → Promise<void>` e `INTERVALO_MS = 60 * 60 * 1000`.

- [ ] **Step 1: Job**: variables en memoria `corriendo` y `ultimoDia`. Hora de Colombia con `Intl.DateTimeFormat('en-US', { timeZone: 'America/Bogota', hour: 'numeric', hourCycle: 'h23' })`; corre solo si `8 <= hora < 20`, `ultimoDia !== hoyISO(ahora)` y no `corriendo`. Marca `ultimoDia` antes de llamar a `procesarRecordatorios()` y loguea `info` con `enviados`/`fallidos` si > 0.

- [ ] **Step 2: Registro en `index.js`**: `ejecutarRecordatoriosCobro()` y `setInterval(ejecutarRecordatoriosCobro, INTERVALO_RECORDATORIOS_COBRO)`.

- [ ] **Step 3: Script** (forma de `limpiarNoVerificadas.js`: `dotenv`, `leerArgs`, `sequelize.close()` en `finally`): sin `--enviar` llama `procesarRecordatorios({ simular: true })` y con `--enviar` sin simular; imprime por fila `clinica | plan | tipo (dias) | fechaFin | telefono | enlaceWhatsapp || 'sin celular'` y el total.

- [ ] **Step 4: Verificar en local** con los datos de Task 4:
  - `npm run cobro:pendientes` → las tres filas, nada escrito.
  - Con `SMTP_HOST` de prueba (o sin SMTP fuera de producción, que solo loguea): `npm run cobro:pendientes -- --enviar` → 3 filas en `recordatorios_suscripcion`, la vencida pasó a `solo_lectura`, resumen logueado/enviado.
  - Correr `--enviar` otra vez → 0 envíos (índice único).
  - `npm run dev` en horario 8–20: el log muestra una sola ejecución; no se repite al minuto ni a la hora.
  - Restaurar las suscripciones y borrar los registros de prueba.
  - `npm test` en verde.

- [ ] **Step 5: Commit**

```bash
git add backend/src/jobs/recordatoriosCobro.js backend/src/index.js backend/src/scripts/cobroPendientes.js backend/package.json CLAUDE.md
git commit -m "feat(suscripciones): job diario y script cobro:pendientes"
```

### Task 6: Antes de desplegar (manual, Roman)

- [ ] Ponerle a la suscripción de prueba de Agropatitas el precio anterior por CLI (`suscripcion:asignar ... --precio`, ver `project_clinica_piloto_produccion`), para que su correo muestre 49k/89k y no los de `planes.js`.
- [ ] PR `feat/recordatorios-cobro` → `develop`; tras el release, en el shell de Render: `npm run cobro:pendientes` para ver qué saldría.
