# Módulo de Estilos (Peluquería) — Diseño

**Fecha:** 2026-08-24
**Estado:** Aprobado para plan de implementación

## Problema

Hoy la peluquería no tiene dónde registrarse. Agenda ya permite crear citas
`tipoCita = 'peluqueria'` y Caja ya puede facturar un servicio de peluquería del
catálogo (`ServicioClinico` con `categoria` libre), pero entre la cita y la
factura no queda registro de qué se hizo: qué corte, quién lo hizo, cuándo
conviene volver.

La consecuencia práctica es que ese detalle termina metido en la Historia
Clínica, que debe ser exclusivamente clínica (diagnóstico, tratamiento,
medicamentos, signos vitales). Mezclar peluquería con historia clínica ensucia
el registro médico y no le sirve a ninguno de los dos flujos.

## Objetivo

Un módulo de Estilos paralelo a Historia Clínica, dentro de la ficha del
paciente, que registre el servicio de peluquería y cuadre con Agenda y Caja
usando los mismos patrones que ya existen en el sistema.

Historia Clínica queda solo para lo clínico.

## Alcance

**Incluye:**
- Modelo `RegistroEstilo` con tipo de corte, estilista y próxima cita sugerida
- CRUD backend con aislamiento multi-tenant y auditoría
- Pestañas "Historia Clínica" / "Estilos" en la ficha del paciente
- Prellenado desde una cita de Agenda tipo `peluqueria`
- Vínculo con factura para evitar doble cobro

**No incluye (YAGNI, se evalúa después):**
- Catálogo de cortes predefinidos — `tipoCorte` es texto libre
- Fotos antes/después
- Productos usados por servicio
- Creación automática de la próxima cita en Agenda
- Rol `estilista` dedicado en el enum de `Usuario`

## Decisiones tomadas

| Decisión | Elección | Razón |
|---|---|---|
| Ubicación en la ficha | Pestañas en `PacienteHistorialPage` | Una sola pantalla, reutiliza el header del paciente |
| Origen del registro | Desde cita agendada **y** libre | Cubre walk-ins de peluquería sin cita previa |
| Vínculo con Caja | `facturaId` como Historia Clínica | Impide facturar dos veces el mismo servicio |
| Permisos | admin, superadmin, veterinario, recepcionista, auxiliar | Mismo criterio que Agenda; clínicas de una persona |
| Próxima cita | Solo fecha sugerida | No crea cita automática; recepción agenda al confirmar |
| Tipo de corte | Texto libre | Sin catálogo que mantener; sirve para cualquier raza |
| Estilista | Usuario del staff (FK) | Permite reportes; reutiliza la query `agenda-equipo` |

## Modelo de datos

Nuevo modelo `RegistroEstilo`, hermano de `HistoriaClinica`, tabla
`registros_estilo`.

```js
{
  id: UUID (PK)
  fechaServicio: DATE, not null, default NOW
  tipoCorte: STRING, not null           // texto libre: "Corte teddy bear"
  observaciones: TEXT, nullable          // pelaje, piel, comportamiento
  proximaCitaSugerida: DATEONLY, nullable

  estilistaId: UUID → Usuario, not null
  mascotaId: UUID → Mascota, not null
  propietarioId: UUID → Propietario, not null
  clinicaId: UUID → Clinica, not null

  citaId: UUID → Cita, nullable          // cuando viene de agenda
  facturaId: UUID, nullable              // sin `references`, igual que
                                         // HistoriaClinica.facturaId; la FK
                                         // real la crea la migración
  bloqueado: BOOLEAN, default false      // se bloquea al facturarse
}
```

**Índices:** `(mascotaId, clinicaId)`, `(clinicaId, fechaServicio)`,
`(estilistaId)`, `(citaId)`, `(facturaId)`.

**Timestamps:** `createdAt` y `updatedAt` activos. A diferencia de
`HistoriaClinica` (que es inmutable por requisito legal), un registro de estilos
sí se puede corregir mientras no esté bloqueado.

**Cifrado:** no aplica. Los campos no contienen PII — el nombre y contacto del
tutor viven en `Propietario`, que ya cifra sus campos sensibles.

### Por qué tabla nueva y no columnas en `historias_clinicas`

Un registro de peluquería no comparte casi ningún campo con una consulta
clínica: no tiene diagnóstico, tratamiento, medicamentos ni signos vitales, y
esos campos son `allowNull: false` en `HistoriaClinica`. Reutilizar la tabla
obligaría a relajar esas restricciones, debilitando la integridad del registro
médico — exactamente lo contrario del objetivo.

## Backend

**Modelo:** `backend/src/models/RegistroEstilo.js`, siguiendo el patrón de
`HistoriaClinica.js` (asociaciones explícitas, hook `afterFind` para descifrar
el `Propietario` anidado).

**Migración:** `backend/src/migrations/20260824_000001_create_registros_estilo.js`,
con guardas `describeTable` como el resto de migraciones del repo, y `down` que
elimina la tabla.

**Controlador:** `backend/src/controllers/registroEstiloController.js`

| Endpoint | Método | Descripción |
|---|---|---|
| `/api/registros-estilo` | POST | Crear registro |
| `/api/registros-estilo/:id` | PUT | Editar (rechaza si `bloqueado`) |
| `/api/registros-estilo/:id` | GET | Detalle |
| `/api/registros-estilo/mascota/:mascotaId` | GET | Timeline del paciente |
| `/api/registros-estilo/:id/preliquidacion` | GET | Datos para prellenar Caja |

**Rutas:** `backend/src/routes/registroEstiloRoutes.js`, con validación
`express-validator` en las rutas (no en el controlador) y `verificarRol` con
admin, superadmin, veterinario, recepcionista y auxiliar.

**Multi-tenancy:** toda query usa `tenantWhere(req)`. Sin excepciones — no hay
consultas globales legítimas en este módulo.

**Auditoría:** todas las mutaciones pasan por `auditoriaMiddleware`.

## Integración con Caja

Sigue exactamente el patrón de `historiaClinicaId` que ya existe en
`facturaController.js`:

1. El formulario de factura acepta `registroEstiloId` opcional, igual que hoy
   acepta `historiaClinicaId`.
2. Al crear la factura, si viene `registroEstiloId`: se valida que exista en la
   clínica y que no tenga `facturaId` ya asignado. Si lo tiene, se rechaza con
   el mismo error de doble facturación que usa Historia Clínica.
3. Dentro de la misma transacción se hace
   `registroEstilo.update({ facturaId: factura.id, bloqueado: true })`.

   **Divergencia deliberada con Historia Clínica.** Hoy `facturaController.js`
   exige que la historia esté bloqueada *antes* de facturarla ("Cierra la
   historia clinica antes de facturarla"): son dos pasos, cerrar y luego cobrar.
   Para Estilos el orden se invierte — facturar es lo que bloquea, en un solo
   paso. Una peluqueada no tiene el requisito legal de inmutabilidad que
   justifica el doble paso en el registro médico, y obligar al estilista a
   "cerrar" antes de que recepción cobre agrega fricción sin beneficio. El
   registro queda igual de protegido: una vez facturado, no se edita.
4. Al anular una factura, se limpia el vínculo:
   `RegistroEstilo.update({ facturaId: null, bloqueado: false }, { where: { facturaId } })`,
   junto al `HistoriaClinica.update` que ya hace eso hoy.

El servicio que se cobra sigue siendo un `ServicioClinico` del catálogo — el
registro de estilos no define precios. Esto mantiene una sola fuente de verdad
para los precios y deja que la clínica configure sus servicios de peluquería
como ya configura los clínicos.

## Integración con Agenda

Agenda no cambia: `Cita.tipoCita` ya incluye `'peluqueria'`.

Lo que cambia es a dónde lleva una cita de peluquería. Hoy, al atender una cita,
se navega a `/pacientes/:mascotaId/historial?citaId=...` y se abre el drawer de
Historia Clínica. Con este módulo, si `cita.tipoCita === 'peluqueria'`, la misma
navegación abre la pestaña Estilos y su formulario, con `citaId` prellenado.

El registro resultante guarda ese `citaId`, dejando la trazabilidad
cita → servicio → factura completa.

## Frontend

**Feature nueva:** `frontend/src/features/estilos/`
- `estilosApi.js` — cliente HTTP vía `@/lib/api`
- `useEstilos.js` — hooks de React Query (queries + mutaciones que invalidan)
- `RegistroEstiloFormDrawer.jsx` — formulario, React Hook Form + Zod
- `EstilosTimeline.jsx` — timeline del paciente

**Página modificada:** `PacienteHistorialPage.jsx` gana pestañas
"Historia Clínica" / "Estilos", siguiendo el patrón de tabs que ya usa
`AgendaPage.jsx` (`TABS` + `activeTab`). El header del paciente y la barra de
navegación se comparten entre ambas pestañas.

`PacienteHistorialPage.jsx` ya tiene ~500 líneas y ganaría más con las pestañas.
Como parte de este trabajo se extraen los componentes de timeline de Historia
Clínica (`TimelineCard`, `EmptyTimeline`, los skeletons) a
`frontend/src/features/historias/`, dejando la página como orquestador de
pestañas. Esto no es refactor gratuito: sin extraerlo, la página pasaría de 500
a ~800 líneas mezclando dos dominios.

**Formulario:** tipo de corte (texto, requerido), estilista (select del equipo,
requerido), fecha del servicio (requerida, default hoy), próxima cita sugerida
(fecha, opcional), observaciones (textarea, opcional). Los registros bloqueados
se muestran en solo lectura, igual que las historias bloqueadas.

## Manejo de errores

- **Registro ya facturado:** al editar, el backend responde 409 con mensaje de
  negocio ("Este registro ya fue facturado y no se puede modificar"), no jerga
  técnica.
- **Cita inexistente o de otra clínica:** 404 vía `tenantWhere`.
- **Estilista inválido:** validación en la ruta; debe ser un usuario activo de
  la clínica.
- **Doble facturación:** 409 desde `facturaController`, reutilizando el mensaje
  que ya existe para historias clínicas.

Los errores en producción los sanitiza `sanitizeErrorResponseMiddleware`, ya
activo globalmente.

## Testing

- **Modelo/migración:** la migración corre y revierte limpiamente contra una BD
  de desarrollo.
- **Controlador:** crear, editar, bloquear al facturar, rechazar edición de
  bloqueado, aislamiento por `clinicaId` (una clínica no ve registros de otra).
- **Facturación:** factura con `registroEstiloId` marca el registro; segundo
  intento sobre el mismo registro falla; anular la factura libera el vínculo.
- **Frontend:** el timeline renderiza registros, el formulario valida campos
  requeridos, la pestaña correcta se abre según `tipoCita` de la cita.

Se sigue TDD: test que falla primero, luego implementación.

## Fuera de alcance — seguimiento aparte

Durante el brainstorming surgió la petición de **eliminar el módulo Superadmin**
(panel `/superadmin`, rutas y endpoints `/api/superadmin`). Es un cambio
arquitectónico independiente, con sus propias preguntas abiertas (cómo se hace
el onboarding de clínicas nuevas sin ese panel, qué pasa con las ya
provisionadas). No se aborda en este spec. Tiene su propia sesión de diseño.
