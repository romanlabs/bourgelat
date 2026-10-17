# Recordatorio de cita al profesional por correo — diseño

Fecha: 2026-10-17 · Estado: aprobado en chat, pendiente de revisión escrita ·
Prioridad: antes que los recordatorios de cobro (`2026-10-15-recordatorios-cobro-design.md`)

## Objetivo

Que a quien atiende una cita (veterinaria, veterinario, groomer: el usuario asignado en
`citas.veterinarioId`) le llegue un correo recordándole la cita con la anticipación que
elija su clínica. Automático, sin clics, dentro del plan gratis de Brevo (300 correos/día
compartidos con códigos de verificación, recuperación de contraseña y cobros).

Fuera de alcance:
- Recordatorios a tutores (vacunas, baños, controles, la cita misma): proyecto aparte. Por
  eso el campo viejo `citas.recordatorioEnviado` (sin uso desde marzo) NO se reutiliza:
  queda para ese proyecto.
- Preferencia por profesional (que cada usuario lo apague para sí): no se hace; la decide
  la clínica.
- Resumen diario de agenda, WhatsApp, SMS.

## Decisiones (Roman, 2026-10-17)

- **Un correo por cita**, antes de la cita (no resumen diario).
- **Anticipación libre por clínica**, 1 hora por defecto. En pantalla se escribe número +
  unidad (minutos u horas). Rango **15 minutos a 48 horas**.
- **La clínica lo puede apagar** (interruptor, encendido por defecto). Solo el administrador.
- Cita agendada con menos anticipación que la configurada: el aviso sale **enseguida**,
  mientras la cita no haya empezado.
- Cita reprogramada: el aviso se **vuelve a programar** para la nueva hora, aunque ya
  hubiera salido.

## Qué citas avisan

Todas estas condiciones:

| Condición | Motivo |
|-----------|--------|
| `estado = 'programada'` | En espera / en atención / completada / cancelada / no asistió: ya no sirve |
| `origen = 'programada'` | Un walk-in ya está en la clínica |
| `recordatorioProfesionalEnviadoEn IS NULL` | No se avisa dos veces |
| `inicio - anticipación ≤ ahora < inicio` | Está en su ventana y aún no empieza |
| Clínica con `recordatorioCitaActivo = true` | La clínica no lo apagó |
| Suscripción de la clínica en `prueba` o `activa` (no `solo_lectura`) | Una cuenta vencida no gasta cupo de correo |
| Profesional asignado con `activo = true` | No se escribe a usuarios desactivados |

`inicio` = `fecha` + `horaInicio` en hora de Colombia (`America/Bogota`, ya fijada en
`config/timezone.js`). La cita no tiene datos de zona horaria propia.

## Datos (una migración)

`clinicas`:
- `recordatorioCitaActivo` BOOLEAN NOT NULL DEFAULT true
- `recordatorioCitaMinutos` INTEGER NOT NULL DEFAULT 60, CHECK entre 15 y 2880

`citas`:
- `recordatorioProfesionalEnviadoEn` TIMESTAMPTZ NULL
- Índice parcial para el barrido:
  `("fecha") WHERE "recordatorioProfesionalEnviadoEn" IS NULL AND estado = 'programada'`

Las clínicas existentes quedan encendidas con 60 minutos. Las citas existentes quedan sin
marca: las que caigan en ventana al desplegar reciben su aviso (solo las de las próximas
48 h como mucho; las pasadas no, porque `ahora < inicio` lo impide).

## Componentes

### `services/recordatorioCitaReglas.js` (lógica pura, con test)

- `minutosValidos(n)` → entero entre 15 y 2880.
- `debeAvisar({ inicio, ahora, minutos })` → `inicio - minutos ≤ ahora < inicio`.
- `inicioCita({ fecha, horaInicio })` → `Date` en hora de Colombia.
- `armarContenido({ cita, mascota, propietario, consultorio, clinica })` → `{ asunto, html, texto }`.
  Asunto: «Cita a las 10:00 a. m.: Luna (consulta general)». Cuerpo: hora, paciente y
  especie, tutor y su celular, motivo, consultorio si lo hay, botón «Ver en la agenda»
  (`${FRONTEND_URL}/agenda?fecha=AAAA-MM-DD`). **Sin datos de historia clínica.** Todo
  texto del usuario escapado para HTML.

### `services/emailService.js`

`enviarEmailRecordatorioCita({ para, asunto, html, texto })`: envoltorio de `enviarEmail`
con el mismo diseño que el correo del código de verificación.

### `jobs/recordatoriosCita.js`

`enviarRecordatoriosCita()`, registrado en `index.js` junto a la limpieza de tokens:
corre al arrancar y luego `setInterval` cada 5 minutos. Un flag en memoria evita que dos
corridas se solapen si una tarda más de 5 minutos. (La API corre en una sola instancia
en Render; la marca atómica del paso 3 protege igual si algún día son varias.)

1. **Buscar** (query con `sinTenant: true`, es un job global): citas que cumplen los
   filtros de estado, origen, marca nula, clínica activa en recordatorios, profesional
   activo, y `fecha` entre hoy y hoy + 2 días. Incluye mascota, propietario, consultorio,
   profesional y clínica. Luego se filtra en JS con `debeAvisar` usando los minutos de
   cada clínica, y por suscripción (`obtenerSuscripcionActivaClinica`, una vez por clínica
   por corrida, cacheada en la corrida).
2. **Tope diario**: máximo **150 avisos por día** (fecha local) en toda la plataforma,
   contados con `recordatorioProfesionalEnviadoEn` de hoy. Al llegar al tope se deja de
   enviar y se registra un `logger.warn` (una vez por día). Los no enviados se pierden
   cuando su cita empieza; es aceptable frente a quedarse sin cupo para los códigos de
   registro.
3. **Marcar antes de enviar**: `UPDATE citas SET "recordatorioProfesionalEnviadoEn" = now()
   WHERE id = :id AND "recordatorioProfesionalEnviadoEn" IS NULL AND estado = 'programada'`.
   Si no actualizó ninguna fila, otra corrida ya la tomó (o cambió de estado): se salta.
4. **Enviar** con `enviarEmailRecordatorioCita`. Si falla: se pone la marca otra vez en
   `NULL` para reintentar en la siguiente corrida (5 min después) y se registra
   `logger.error` sin datos del paciente (solo `citaId` y `clinicaId`). Cuando la cita
   empieza, deja de estar en ventana y no se reintenta más.

Sin auditoría por envío (no es una mutación de usuario); queda en los logs con
`contexto: 'recordatorio-cita'`.

### `controllers/citaController.js`

`reprogramarCita`: al guardar la nueva fecha/hora, `recordatorioProfesionalEnviadoEn = null`.
Es el único punto que lo necesita: hoy no hay forma de cambiar el profesional de una cita
ni de devolver una cita cancelada a `programada` (`TRANSICIONES_ESTADO`). Si eso se agrega
más adelante, debe limpiar la marca también.

### Configuración (API)

`PUT /api/clinica/recordatorios-cita` (admin/superadmin, `requerirEscritura`,
`auditoriaMiddleware` como el resto), body `{ activo: boolean, minutos: int 15..2880 }`
validado con `express-validator`. Los dos campos se devuelven en `GET /api/clinica`.

### Configuración (pantalla)

Tarjeta «Recordatorios de citas» en `ConfiguracionPage`, visible solo para admin:
- Interruptor «Enviar recordatorio por correo a quien atiende la cita».
- Anticipación: campo numérico + selector *minutos / horas*. Al cargar, se muestra en horas
  si los minutos son múltiplo de 60, si no en minutos. Validación Zod: total entre 15 min y
  48 h, mensaje «Elige entre 15 minutos y 48 horas».
- Con el interruptor apagado, la anticipación queda deshabilitada (se conserva el valor).
- Botón Guardar con React Hook Form; mutación en `configuracionApi.js`; invalida la clave de
  la clínica en `lib/queryKeys.js`. Solo tokens de color.

## Errores

- Brevo caído o sin clave: el envío falla, la marca se revierte, se reintenta cada 5 min
  hasta que la cita empieza. `emailService` ya registra el error.
- Una excepción en la corrida no tumba la API: el job envuelve todo en `try/catch` y
  registra `logger.error`.
- Profesional sin correo válido: no puede pasar (correo obligatorio y único en `usuarios`).

## Pruebas

- `recordatorioCitaReglas.test.js` (en `npm test`): ventana de tiempo (antes, justo en el
  borde, dentro, después del inicio), cita agendada dentro de la ventana (sale enseguida),
  rango 15–2880, cálculo de inicio en hora de Colombia, contenido escapado y sin campos
  clínicos.
- Prueba local de punta a punta: clínica de prueba local con anticipación de 30 min, cita
  para dentro de 20 min asignada a un usuario de prueba con correo real de Roman → el
  correo llega; reprogramar a otra hora → la marca se limpia y vuelve a llegar a su hora;
  apagar el interruptor → no llega.
- Pantalla en Claude in Chrome: guardar 90 minutos, 2 horas, rechazar 10 minutos y 3 días,
  apagar y volver a encender.

## Producción

Sin variables nuevas (Brevo ya configurado). Tras el release: revisar en los logs de
Render que el job corre (`contexto: 'recordatorio-cita'`) y avisar a Pegatos y a
Agropatitas que los avisos están encendidos a 1 hora y cómo cambiarlo.
