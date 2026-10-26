# Recordatorios de cobro por correo — diseño

Fecha: 2026-10-15 · Estado: revisada por Roman el 2026-10-26 (ver «Ajustes de la revisión»)

## Objetivo

Que cada clínica reciba un correo antes y al momento de vencer su prueba o su plan, con el
enlace a `/pagar`, y que Roman reciba un resumen diario con un botón de WhatsApp por clínica
para recordarles con un clic. Sin costo adicional: sin Render Cron, sin API de WhatsApp,
dentro del plan gratis de Brevo (300 correos/día).

Fuera de alcance (proyectos aparte):
- WhatsApp 100 % automático (API de WhatsApp Business de Meta, pago por mensaje).
- Recordatorios a tutores (vacunas, baños, controles).
- Panel web de administración: no se crea. Nada con poder sobre todas las clínicas se
  expone por HTTP (misma regla que retiró el panel superadmin).

## Decisiones (Roman, 2026-10-15)

- Momentos: **7 días antes, 1 día antes y al vencer**. Igual para prueba y plan pago.
- Destinatarios: usuarios `admin` activos de la clínica.
- Resumen diario a `soporte@bourgelat.co` con botón «Enviar WhatsApp» (enlace `wa.me`
  con mensaje y link a `/pagar` ya escritos) por clínica. Solo si hubo envíos ese día.
- Excluidas: suscripciones de cortesía (plan `cortesia` o `fechaFin` = `CORTESIA_END_DATE`)
  y `personalizado` sin precio.

## Ajustes de la revisión (Roman, 2026-10-26)

- Ningún precio escrito en el correo: se leen del código para que sigan a `planes.js`
  cuando cambien (Roman fijó Esencial $89k y Clínica $120k, aplicado en el PR #309).
  - Plan pago o `personalizado` con precio: `suscripcion.precio` (lo que la clínica paga
    de verdad, incluye el add-on DIAN si lo compró).
  - Prueba: los planes pagos de `planes.js` con su precio mensual (hoy Esencial y Clínica);
    la clínica elige en `/pagar`. Sin mención a la DIAN (en v1 es «Próximamente»).
  - Precio respetado: si la suscripción de prueba tiene `precio > 0`, el correo muestra
    solo ese precio y no los de `planes.js`. Es el caso de Agropatitas, que conserva el
    precio anterior (Esencial $49k / Clínica $89k): antes de activar los correos se le
    pone ese precio a su suscripción por CLI.
- Tope de cobro **30** correos por ejecución (no 100): los recordatorios de citas ya usan
  hasta 150/día del mismo plan de Brevo (300/día).
- Registrar antes de enviar, como `jobs/recordatoriosCita.js`: insertar la fila (el índice
  único hace de candado), enviar, y si falla borrarla para reintentar mañana. Así dos
  instancias no duplican el correo.
- Fechas con `hoyISO` / `sumarDiasISO` de `utils/vencimiento.js`, igual que el job de citas.

## Tipos de recordatorio

`hoy` = fecha local Colombia (`formatDateOnly()`). `dias` = `fechaFin - hoy`.

| Tipo | Condición | Correo |
|------|-----------|--------|
| `vence_pronto` | estado `prueba`/`activa`, `2 ≤ dias ≤ 7` | «Tu prueba/plan vence en N días» |
| `vence_manana` | estado `prueba`/`activa`, `0 ≤ dias ≤ 1` | «…vence mañana» / «…vence hoy» |
| `vencida` | `fechaFin` entre `hoy-3` y `hoy-1`, estado `prueba`/`activa`/`solo_lectura`, y la clínica no tiene otra suscripción vigente | «Tu cuenta quedó en solo lectura; tus datos están seguros» |

Los rangos (en vez de días exactos) hacen que un día perdido (servidor caído, tope
alcanzado) se recupere al siguiente sin mandar textos falsos: el correo dice los días
reales. La ventana de 3 días en `vencida` evita escribirles a clínicas vencidas hace
meses el día que se despliega esto.

Al procesar una `vencida` en estado `prueba`/`activa`, el job la pasa a `solo_lectura`
(hoy eso pasa de forma perezosa en la siguiente petición), para que el correo sea cierto.

## Unidades

1. **`services/recordatoriosCobroReglas.js`** (puro, sin BD): `clasificarRecordatorio({ suscripcion, hoy })`
   → `null | { tipo, dias }`. Con pruebas unitarias (`*.test.js`) como `suscripcionService.test.js`.
2. **Modelo + migración `RecordatorioSuscripcion`** (tabla `recordatorios_suscripcion`):
   `id` UUID, `suscripcionId` (FK), `clinicaId`, `tipo` ENUM(los 3), `enviadoEn` DATE,
   `destinatarios` INTEGER. Índice único `(suscripcionId, tipo)`: cada recordatorio sale una
   sola vez por suscripción; renovar crea otra suscripción (ver `gestionarSuscripcion.js`),
   así que el ciclo siguiente vuelve a recibirlos. Queries con `sinTenant: true` (job global).
3. **`services/recordatoriosCobroService.js`**: `procesarRecordatorios({ simular = false, tope = 30 })`
   - busca suscripciones candidatas (una query con `fechaFin` entre `hoy-3` y `hoy+7`),
   - descarta las ya registradas en `recordatorios_suscripcion`,
   - por cada una: admins activos → `emailService.enviarEmailRecordatorioCobro` → si se
     envió a al menos uno, inserta el registro; si falla, log y sigue (reintenta mañana),
   - corta al llegar al `tope` de correos del día,
   - al final, si hubo envíos, manda el resumen a soporte@,
   - con `simular` no envía ni escribe: devuelve la lista.
4. **`emailService`**: `enviarEmailRecordatorioCobro({ para, nombre, clinica, tipo, dias, fechaFin, precio, urlPagar })`
   y `enviarEmailResumenCobro({ filas })`, con el mismo estilo HTML + texto y `pieLegal`
   de los correos existentes. Precio desde `config/planes.js` (mensual del plan; en prueba,
   el del plan `activo`).
5. **`jobs/recordatoriosCobro.js`** + registro en `index.js`: `setInterval` cada hora;
   ejecuta solo si la hora local es ≥ 8 y < 20 y no se ejecutó ya hoy (variable en memoria;
   el índice único es la garantía real ante reinicios y deploys).
6. **Script `npm run cobro:pendientes`** (`scripts/cobroPendientes.js`): por defecto
   simula e imprime clínica, plan, vencimiento, teléfono, enlace `wa.me`; `--enviar`
   ejecuta lo mismo que el job.

## Correos

- Clínica: asunto según tipo; cuerpo con nombre de la clínica, fecha de vencimiento,
  precio, botón «Pagar ahora» → `${FRONTEND_URL}/pagar`, «activamos el mismo día hábil»,
  y en `vencida` que los datos siguen ahí y se pueden consultar y exportar.
- Resumen a soporte@: tabla con clínica, tipo, vencimiento, correo, teléfono y botón
  `https://wa.me/57<telefono>?text=<mensaje con nombre de la clínica y link a /pagar>`.
  Sin teléfono: solo correo.

## Errores y límites

- Fallo de Brevo en un correo: se registra en el log, no se marca, se reintenta mañana.
- Fallo de BD en el job: catch con log (`contexto: 'recordatorios-cobro'`), el servidor sigue.
- Tope 30 correos de recordatorio por ejecución: con los 150 de citas deja margen de los 300/día de Brevo para
  recuperar contraseña, verificación y soporte.
- Dos instancias del servidor a la vez (deploy): se registra antes de enviar y el índice único
  hace de candado, así que el correo no se duplica.

## Pruebas

- Unitarias de `clasificarRecordatorio`: cada tipo en sus bordes (7, 2, 1, 0, -1, -3, -4
  días), cortesía excluida, estados no aplicables.
- Unitarias del armado del enlace `wa.me` (teléfono con/sin 57, sin teléfono).
- Manual en local: clínica de prueba con `fechaFin` ajustada + `cobro:pendientes` (simular)
  y luego `--enviar` con SMTP de prueba.

## Despliegue

Sin variables nuevas. Primero desplegar y correr `npm run cobro:pendientes` en el shell de
Render para ver qué saldría; el job ya queda activo con el deploy.
