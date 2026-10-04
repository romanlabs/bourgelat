# Soporte: tickets de las clínicas

Las clínicas reportan problemas de uso desde **Soporte** (`/soporte`, o "Ayuda y
soporte" en el menú del avatar). El equipo de Bourgelat recibe un correo y
responde **contestando ese mismo correo** (ver
[Responder desde el correo](#responder-desde-el-correo)) o desde el servidor con
`npm run soporte:*`. No hay panel web del equipo todavía; ver
[Proyección](#proyección-panel-web-del-equipo).

## Arquitectura: una lógica, varias puertas

```
 Clínica (app web)     Equipo: correo                 Equipo: script       FUTURO
 /api/soporte/*        Gmail → Cloudflare Worker →    scripts/soporte.js   panel web
       │               POST /api/soporte-equipo/correo       │                 │
       │               (soporteCorreoService.js)             │                 │
       └──────────────────────── services/soporteService.js ─┴─────────────────┘
                 actor = { tipo: 'usuario' | 'soporte', id, nombre, ... }
                                  │
                 tickets_soporte · mensajes_ticket_soporte
```

- `services/soporteReglas.js`: reglas puras (visibilidad, transiciones, actor).
  Sus tests (`soporteReglas.test.js`) son el contrato de las tres puertas.
- `services/soporteService.js`: única puerta a los modelos. Crea, responde,
  cambia estado, escribe los eventos del hilo, audita y envía los correos.
- Controlador y script son adaptadores: arman el actor y llaman al servicio.

## Quién ve qué

| Actor | Ve |
|-------|----|
| Usuario de clínica (cualquier rol) | Los tickets que abrió |
| Admin de la clínica (incluye `rolesAdicionales`) | Todos los tickets de su clínica |
| Equipo de soporte (script) | Todos los tickets (`sinTenant: true`) |

Un ticket ajeno responde **404**, no 403, para no revelar que existe.

## Estados

| Estado | Significa | Quién lo pone |
|--------|-----------|---------------|
| `abierto` | En la fila del equipo | Al crearlo, o cuando la clínica responde a `esperando_usuario` / `resuelto` |
| `en_progreso` | Alguien del equipo lo está revisando | Equipo |
| `esperando_usuario` | El equipo respondió y espera a la clínica | Automático al responder el equipo |
| `resuelto` | El equipo lo da por solucionado | Equipo |
| `cerrado` | Terminado, ya no admite mensajes | Clínica o equipo (el equipo puede reabrirlo) |

Cada cambio de estado explícito queda en el hilo como evento del sistema, visible
para la clínica.

## Cómo responder desde Render

1. Llega el correo a `SOPORTE_EMAIL` con el código (`SOP-00042`), la clínica, el
   módulo, el mensaje y el enlace a la captura.
2. Dashboard de Render → servicio backend → **Shell**.
3. Ver el ticket completo (hilo, contexto técnico y captura):
   ```bash
   npm run soporte:ver -- --ticket 42
   ```
4. (Opcional) avisar que ya lo estás revisando:
   ```bash
   npm run soporte:estado -- --ticket 42 --firma "Sergio" --estado en_progreso
   ```
5. Responder. **El texto lo escribes tú**; el script solo lo entrega. Sin
   `--confirmar` muestra una vista previa y no envía nada:
   ```bash
   npm run soporte:responder -- --ticket 42 --firma "Sergio" \
     --mensaje "Hola, ya lo revisamos.\nEl cierre de caja pide..." --confirmar
   ```
   Para respuestas largas, escribe un archivo y usa `--mensaje-archivo respuesta.txt`.
   Añade `--estado resuelto` para responder y darlo por resuelto de una vez.
6. La clínica ve la respuesta en Soporte (se refresca cada minuto) y recibe un
   correo con el enlace al ticket.

Bandeja: `npm run soporte:listar` (activos por defecto; `--estado todos`,
`--estado abierto`, `--clinica-id <uuid>`).

`--firma` es obligatoria en todo lo que escribe: la clínica ve
"Equipo Bourgelat (Sergio)" y queda en `asignadoA`.

## Responder desde el correo

El aviso de cada ticket nuevo o respuesta de la clínica llega con un `Reply-To`
propio del ticket: `respuestas+t42.<token>@bourgelat.co`. Basta con **contestar
el correo desde Gmail**: la respuesta entra al hilo firmada como
"Equipo Bourgelat (Roman)" y la clínica recibe su correo de siempre.

**Primera línea opcional** para cambiar el estado (se quita del mensaje):

| Primera línea | Resultado |
|---------------|-----------|
| *(nada)* | Responde; el ticket queda en "Esperando usuario" |
| `#resuelto` + texto | Responde y lo da por resuelto |
| `#en-progreso` sola | Solo avisa que se está revisando |
| `#cerrado` sola | Lo cierra sin escribir nada |

Se toma solo lo escrito arriba del texto citado ("El jue, … escribió:") y antes
de una firma `--`. Si algo no cuadra (palabra clave mal escrita, ticket cerrado,
respuesta vacía) **el correo rebota** con el motivo y nada llega a la clínica.

### Cómo viaja

```
Gmail ──► Cloudflare Email Routing (respuestas@, subaddressing)
      ──► Email Worker `bourgelat-soporte-correo` (cloudflare/soporte-correo-worker)
            firma HMAC(hora + destinatario + correo crudo)
      ──► POST api.bourgelat.co/api/soporte-equipo/correo
            (montado antes de express.json: la firma cubre los bytes exactos)
      ──► soporteCorreoService → soporteService.agregarMensaje / cambiarEstado
```

### Por qué no se puede falsificar

El `From` de un correo se falsifica fácil, así que se exigen **cuatro** cosas:

1. **Firma del Worker** (`SOPORTE_CORREO_SECRETO`, ventana de 5 min): nadie más
   puede llamar el endpoint.
2. **Token del ticket** en la dirección (HMAC del número): solo viaja en los
   avisos que recibe el equipo; el de un ticket no sirve para otro.
3. **Remitente** en `SOPORTE_RESPONDEDORES`, que además define la firma.
4. **DKIM válido del dominio del remitente** (`mailauth`), así un `From:
   roman…@gmail.com` falsificado no pasa.

Un mismo correo (mismo `Message-ID`) no se aplica dos veces. Toda la lógica
pura está en `services/soporteCorreoReglas.js` con sus tests.

### Puesta en marcha (una sola vez)

1. Render → `bourgelat-api` → Environment: `SOPORTE_CORREO_RESPUESTAS=respuestas@bourgelat.co`,
   `SOPORTE_CORREO_SECRETO=<32+ caracteres>`, `SOPORTE_RESPONDEDORES=roman.bolanos.va@gmail.com=Roman`.
2. Worker: `cd cloudflare/soporte-correo-worker && npx wrangler deploy` y
   `npx wrangler secret put SOPORTE_CORREO_SECRETO` (el mismo valor).
3. Cloudflare → Email Routing: activar **subaddressing** y crear la ruta
   `respuestas@bourgelat.co` → *Send to a Worker* → `bourgelat-soporte-correo`.

Sin las tres variables la función queda apagada: los avisos salen sin
`Reply-To` y el script sigue funcionando igual.

## Configuración

- `SOPORTE_EMAIL`: buzón del equipo. Vacío = el ticket se guarda igual y el
  aviso queda solo en el log (warning al arrancar en producción).
- Los correos salen por el SMTP de `emailService` (`SMTP_HOST`, `EMAIL_FROM`).
- `SOPORTE_CORREO_RESPUESTAS`, `SOPORTE_CORREO_SECRETO`, `SOPORTE_RESPONDEDORES`:
  responder desde el correo (ver arriba).
- Las capturas se normalizan a webp (máx. 1600 px, sin EXIF) en
  `uploads/soporte/` y **no** descuentan del cupo de almacenamiento del plan.

## Decisiones de seguridad

- **Exento de `requerirEscritura`**: una clínica con la suscripción vencida puede
  abrir tickets (ver `escrituraGuard.js`). Sus rutas solo tocan tickets.
- **Límite por usuario**: 10 tickets/hora y 60 mensajes/hora
  (`rateLimitMiddleware.js`), por usuario y no por IP porque toda una clínica
  suele compartir la IP.
- Todo lo que escribe el usuario se escapa (`escaparHtml`) antes de ir a un correo.
- Las acciones del equipo se auditan en la clínica del ticket (`usuarioId` nulo),
  así el admin las ve en su Auditoría.
- Pendiente conocido: las capturas se sirven desde `/uploads` público con nombre
  no adivinable (igual que exámenes y fotos). Migrar a URLs firmadas junto con el
  resto de uploads.

## Proyección: panel web del equipo

Fuera de alcance por ahora (ver `docs/roadmap.md`). Al construirlo:

1. Rol nuevo `soporte` en el ENUM de `Usuario` (migración) para cuentas sin
   `clinicaId`, con alcance **solo** sobre tickets. No es superadmin.
2. Login separado del público y 2FA o lista de IPs permitidas.
3. `routes/soporteEquipoRoutes.js` en `/api/soporte-equipo/*` (ya existe para
   el correo; ojo, se monta antes de `express.json`, así que las rutas JSON del
   panel necesitan su propio `express.json()`) → `soporteEquipoController.js`, que arma
   `construirActorSoporte({ id: req.usuario.id, nombre })` y llama a **las mismas**
   funciones de `soporteService.js`.
4. Bandeja en el frontend reutilizando `TicketHilo` (`perspectiva="soporte"`),
   `TicketResumen`, `EstadoTicketBadge` y `ResponderTicketForm`.
5. El script sigue como respaldo operativo.

No hay que tocar tablas, estados, transiciones, notificaciones, auditoría ni
eventos del hilo: el panel es solo una puerta nueva.
