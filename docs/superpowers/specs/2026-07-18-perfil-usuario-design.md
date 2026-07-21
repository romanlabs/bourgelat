# Spec: Sección "Mi Perfil" por usuario

**Fecha:** 2026-07-18
**Estado:** aprobado por Roman (diseño conversado en sesión)

## Contexto

Hoy ningún usuario tiene un espacio propio: la foto no existe, los datos personales
solo los edita un admin desde Usuarios, y no hay forma de cambiar la propia
contraseña estando logueado. Se quiere una sección de perfil accesible a todos los
roles, que escale igual para clínicas de 1-3 personas (donde una misma persona es
admin + veterinario vía `rolesAdicionales`) que para clínicas grandes con roles
separados.

## Principio rector

**Visibilidad por capacidad, nunca secciones vacías.** Cada bloque del perfil se
renderiza solo si aplica al usuario (usando `hasRole`/`hasAnyRole` de
`frontend/src/lib/permissions.js`, que ya unen rol principal + rolesAdicionales).
No se muestran secciones deshabilitadas ni vacías. Superadmin queda fuera del
alcance (opera en SuperadminShell, no es usuario de clínica).

## Punto de entrada

El bloque de usuario inferior del sidebar (`AdminShell`) se vuelve clickeable y
navega a `/perfil`:
- Avatar: foto del usuario si existe; iniciales como fallback (patrón actual).
- Subtítulo: cambia de nombre del plan → cargo del usuario (o etiqueta del rol si
  no tiene cargo). El plan es dato de la clínica y ya vive en el módulo Planes.
- El icono de logout existente se conserva tal cual.

## Secciones v1

### 1. Identidad (todos los roles)
- Foto de perfil: subida vía multer a disco local reutilizando el patrón de la
  foto de mascota (`uploadMascotaPhotoMiddleware` + subdir en `config/uploads.js`);
  preview + eliminar.
- Editables: nombre, teléfono, cargo (texto libre corto, ej. "Médica veterinaria — cirugía").
- Solo lectura: email (identificador de login), roles como badges, método de
  acceso ("Correo y contraseña" / "Google").
- Tarjeta profesional (texto): visible y editable solo si
  `hasRole(usuario, 'veterinario')` — incluye admins con rol adicional veterinario.

### 2. Seguridad (todos los roles)
- Cambiar contraseña: requiere contraseña actual + nueva (regex de fortaleza
  existente). Al cambiarla se revocan las demás sesiones (mismo criterio que
  reset-password). Para cuentas OAuth (password null) la card se reemplaza por
  "Tu acceso es gestionado por Google".
- Botón "Cerrar sesión en mis otros dispositivos" → endpoint `logout-all`
  existente (no se lista el detalle de sesiones: los refresh tokens rotan y la
  tabla cruda confundiría; lista agrupada queda para v2 si se necesita).

### 3. Suscripción compacta (solo si `hasRole(usuario, 'admin')`)
- Una línea: "Plan {nombre} · vence el {fecha}" con alerta visual si faltan
  <5 días (pensado para pago mensual: avisar antes sin ser ruidoso), y link al
  módulo Planes existente. Sin duplicar gestión: los datos ya vienen en `/auth/me`.

### Regla de roles (explícita)
El rol y los rolesAdicionales NUNCA se editan desde el perfil — solo se muestran
como badges de lectura. La asignación de roles vive exclusivamente en el módulo
Usuarios (restringido a admins). Así nadie puede auto-ascenderse: en clínicas
pequeñas el dueño-admin se gestiona a sí mismo desde Usuarios; en clínicas
grandes los empleados ven su rol pero no lo tocan.

## Fuera de alcance v1 (v2 futuro)
- Actividad personal (mis citas de hoy, historias de la semana) — solo para
  quien atiende; depende de queries nuevas.
- Preferencias de notificaciones — depende del motor de recordatorios (aún no existe).
- Lista detallada de sesiones activas agrupada por dispositivo.
- Cambio de email.

## Backend

- Migración + modelo: `usuarios` gana columnas `foto` (STRING, URL pública de
  uploads), `cargo` (STRING corto), `tarjetaProfesional` (STRING). Todas nullable.
- `PATCH /api/usuarios/me` — actualiza nombre, telefono, cargo, foto,
  tarjetaProfesional del usuario autenticado (nunca rol/email/activo). Pasa por
  `auditoriaMiddleware`. tarjetaProfesional solo se persiste si el usuario tiene
  rol veterinario.
- `POST /api/auth/cambiar-password` — body: passwordActual + passwordNueva
  (regex fuerte). Verifica bcrypt actual, rechaza cuentas OAuth (400), actualiza
  hash (bcrypt 12), revoca refresh tokens de otras sesiones, audita
  `PASSWORD_CAMBIADO`. Rate limit `limitadorAuth`.
- Subida de foto: `POST /api/usuarios/me/foto` con multer (mismo middleware
  patrón que mascotas), subdir `usuarios/` en `config/uploads.js`, límite 4MB.
- `/auth/me` y serialización de usuario incluyen los campos nuevos.

## Frontend

- Ruta `/perfil` (lazy) dentro de AdminShell, accesible a todo rol autenticado.
- `features/perfil/`: `perfilApi.js` (patch me, cambiar password) + `usePerfil.js`
  (mutations React Query) + componentes de las 3 cards.
- Página con el estilo de Configuración (cards apiladas, React Hook Form + Zod).
- AdminShell: bloque de usuario clickeable + avatar con foto + subtítulo cargo/rol.
- authStore: refrescar usuario tras editar perfil (ya se rehidrata vía `/auth/me`).

## Verificación

1. Local: usuario admin+veterinario (clínica pequeña) ve las 3 secciones completas
   con tarjeta profesional; usuario recepcionista ve solo Identidad (sin tarjeta)
   y Seguridad.
2. Cuenta Google: card de contraseña muestra "gestionado por Google"; PATCH de
   datos funciona igual.
3. Cambiar contraseña con la actual incorrecta → 400; correcta → login con la
   nueva funciona y las otras sesiones quedan revocadas.
4. Subir foto → aparece en el sidebar y en el perfil tras recargar.
5. Flujo completo en navegador (localhost) antes del PR.
