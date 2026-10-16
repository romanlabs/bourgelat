# Verificación por código + Cloudflare Turnstile — diseño

Fecha: 2026-10-15 · Rama: `feat/verificacion-registro`

## Objetivo

Que solo entren clínicas con un correo real y que los bots no puedan crear cuentas, probar
contraseñas ni disparar correos. Sin costo (Turnstile es gratis).

## Decisiones (Roman, 2026-10-15)

- Código de 6 dígitos al correo para **registros nuevos con correo + contraseña**. Con Google
  no se pide. Cuentas existentes y usuarios creados por el admin en `/usuarios`: sin cambio.
- Turnstile («no soy un robot») en registro, login, recuperar contraseña y reenviar código.

## Flujo

1. **Registro** (`POST /api/auth/registro` + `turnstileToken`): crea clínica, usuario admin
   (`emailVerificado: false`, `requiereVerificacionCodigo: true`), suscripción de prueba y
   aceptaciones legales, igual que hoy, pero **no abre sesión** (sin cookies ni refresh
   token). Envía el código y responde `201 { requiereVerificacion: true, email, message }`.
2. **Verificar** (`POST /api/auth/verificar-codigo` `{ email, codigo }`): si coincide, marca
   el código usado, `emailVerificado: true`, `requiereVerificacionCodigo: false`, abre sesión
   (cookies + refresh) y responde como respondía el registro (`usuario`, `clinica`,
   `suscripcion`). Audita `VERIFICACION_EMAIL`. Envía el correo de bienvenida si hoy se envía.
3. **Login** de una cuenta pendiente: con la contraseña correcta (nunca antes, para no revelar
   cuentas), responde `403 { requiereVerificacion: true, email, message }` y envía un código
   nuevo (respetando la espera de 60 s). El frontend muestra el paso del código.
4. **Reenviar** (`POST /api/auth/reenviar-codigo` `{ email, turnstileToken }`): respuesta
   genérica 200 siempre. Si la cuenta está pendiente y el último código tiene más de 60 s,
   invalida los anteriores, crea uno y lo envía.

## Código

- `crypto.randomInt(0, 1_000_000)` con ceros a la izquierda. Vence en 10 min. Máximo 5
  intentos: al quinto fallo se invalida y hay que pedir otro.
- Se guarda solo un HMAC-SHA256 (clave derivada de `JWT_SECRET` con un prefijo propio),
  comparación con `crypto.timingSafeEqual`.
- Tabla nueva `codigos_verificacion_email`: `id` UUID, `usuarioId` FK, `codigoHash`,
  `expiracion`, `intentos` INTEGER 0, `usado` BOOLEAN false, timestamps. Global (`sinTenant`).
  La limpieza diaria existente borra los vencidos/usados.
- Columna nueva `usuarios.requiereVerificacionCodigo` BOOLEAN NOT NULL DEFAULT false: así las
  cuentas existentes no se ven afectadas aunque tengan `emailVerificado: false`.
- Mensaje de error único: «Código incorrecto o vencido». Rate limit con `limitadorAuth`.

## Turnstile

- Backend `services/turnstileService.js`: `verificarTurnstile({ token, ip })` → POST a
  `https://challenges.cloudflare.com/turnstile/v0/siteverify` (fetch nativo, timeout 5 s).
  Middleware `exigirTurnstile` lee `req.body.turnstileToken`; si falla, `400 { message:
  'Confirma que no eres un robot e inténtalo de nuevo.' }`.
- Sin `TURNSTILE_SECRET_KEY` configurada se omite la validación (log de advertencia): así se
  puede desplegar antes de que Roman cree el widget. `validateRuntimeConfig` avisa en prod.
- Si Cloudflare no responde (timeout/red): se deja pasar y se registra en el log, para que una
  caída de Cloudflare no impida registrarse ni entrar.
- Frontend `components/auth/TurnstileWidget.jsx`: carga `api.js?render=explicit` una vez,
  renderiza con `VITE_TURNSTILE_SITE_KEY`, entrega el token por callback, se reinicia tras
  cada envío (los tokens son de un solo uso). Sin site key no se muestra y el formulario
  funciona igual.
- Local: claves de prueba públicas de Cloudflare (`1x00000000000000000000AA` /
  `1x0000000000000000000000000000000AA`, siempre pasan) en `.env.example` de cada lado.
- `render.yaml`: `TURNSTILE_SECRET_KEY` (api) y `VITE_TURNSTILE_SITE_KEY` (frontend), ambas
  `sync: false`.

## Frontend

- `RegistroDialog`: widget antes del botón; al recibir `requiereVerificacion` pasa al paso
  «Revisa tu correo»: input de 6 dígitos (`inputMode="numeric"`, `autocomplete="one-time-code"`),
  botón «Verificar», «Reenviar código» con cuenta regresiva de 60 s (con su propio widget) y
  «¿Correo equivocado?» que vuelve al formulario. Al verificar: `setAuth` y misma navegación
  que hoy tras registrarse.
- `LoginPage`: widget; ante `403 requiereVerificacion` muestra el mismo paso (componente
  compartido `features/auth/CodigoVerificacionPaso.jsx`).
- `RecuperarPasswordPage`: widget.
- Textos sin jerga técnica.

## Fuera de alcance

Rechazo de dominios sin MX y de correos desechables (siguiente iteración); exigir código a
cuentas existentes; borrar registros nunca verificados (anotar en pendientes).

## Pruebas

- Backend unitarias: generar/hashear/comparar código, vencimiento, intentos, servicio
  Turnstile con fetch simulado (éxito, fallo, sin clave, timeout).
- Manual en Chrome (local, claves de prueba): registro → código (se lee del log, sin SMTP)
  → dashboard; código errado 5 veces; reenviar; login de cuenta pendiente; Google sin cambio;
  cuenta existente sin cambio.
