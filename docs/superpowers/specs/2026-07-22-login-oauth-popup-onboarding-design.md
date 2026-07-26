# Rediseño de login, OAuth en popup y wizard de onboarding

**Fecha:** 2026-07-22
**Estado:** Aprobado, pendiente de plan de implementación

## Contexto

Roman pidió rediseñar el login de Bourgelat inspirado en el flujo de Alegra (competidor):
fondo blanco minimalista, tarjeta centrada, inputs redondeados, verde como acento. Durante
el brainstorming se amplió el alcance a dos piezas más que Roman identificó como parte del
mismo "salto de calidad" de UX:

1. Que el login social con Google abra en una **ventana popup** en vez de redirigir toda la
   pestaña (como hace Alegra), para no perder el contexto de navegación.
2. Un **wizard de onboarding** de 5 pasos que se muestra justo después de crear la cuenta
   (por correo o por OAuth), antes de entrar al dashboard, para recolectar datos de producto
   sobre el uso previsto de la plataforma.

Una tercera pieza que Roman mostró (mensaje de bienvenida automatizado por WhatsApp Business,
como el que envía Alegra) queda **fuera de este alcance**: requiere WhatsApp Business API de
Meta y número verificado, y se pospuso explícitamente para una fase futura (ver memoria de
proyecto `project_whatsapp_bienvenida_futuro.md`).

## 1. Rediseño visual del login

Reemplaza el layout actual de `frontend/src/pages/LoginPage.jsx` (video de fondo, paleta
café/caramelo `#2b2018`/`#b07645`, tipografía Spectral, inputs con solo borde inferior).

- Fondo blanco (`bg-background`), página centrada vertical y horizontalmente, sin video ni
  barra de navegación superior.
- Logo Bourgelat (ícono cuadrado + wordmark "Bourgelat") centrado arriba de la tarjeta, sin
  nav ni link "volver al inicio".
- Título simple debajo del logo: "Inicia sesión en tu clínica" (sin eyebrow ni serif grande).
- Tarjeta `max-w-[420px]`, `rounded-2xl`, fondo blanco, `border` sutil (`border-border`) +
  sombra suave (`shadow-lg` o equivalente), sin el efecto "glass"/backdrop-blur actual.
- Inputs con borde completo redondeado (`rounded-lg border border-input`), reemplazando el
  estilo de solo-borde-inferior. Foco usa `--primary` (verde esmeralda) en vez de `--accent`
  caramelo.
- Botón "Entrar" ancho completo, `rounded-lg`, fondo `--primary`, texto `--primary-foreground`.
- Debajo del submit: divisor "o" + botón(es) OAuth (`BotonesSociales`), reordenados después
  del formulario (hoy están antes) para igualar el orden de Alegra.
- Pie: "¿Primera vez en Bourgelat? Crear cuenta" sigue abriendo `RegistroDialog`.
- `RegistroDialog.jsx` se restiliza con el mismo lenguaje visual (inputs redondeados, verde
  esmeralda) para mantener consistencia entre login y registro.
- Se elimina el `<video>`/poster (`LOGIN_VIDEO`/`LOGIN_POSTER`) y las constantes `INK`/`ACCENT`
  hardcoded; todo el color sale de los tokens CSS ya definidos en `frontend/src/index.css`.
- El componente sigue funcionando igual en modo oscuro (tokens ya cubren ambos modos).

## 2. OAuth en ventana popup

Estado actual (`backend/src/controllers/oauthController.js`): flujo 100% de redirect completo.
`GET /oauth/:proveedor/iniciar` redirige el navegador entero a Google; el callback redirige de
vuelta a `${frontendUrl}/dashboard` (usuario existente) o
`${frontendUrl}/completar-registro#token=...` (usuario nuevo).

Cambios:

- **Frontend (`BotonesSociales.jsx`)**: el botón de Google deja de hacer
  `window.location.href = url` y en su lugar hace `window.open(url, 'oauth-bourgelat', 'width=500,height=650')`.
  Si `window.open` devuelve `null` (popup bloqueado), cae al comportamiento actual de redirect
  completo como fallback.
- **Backend (`oauthController.callback`)**: en vez de redirigir a `/dashboard` o
  `/completar-registro#token=...`, redirige a una página puente nueva del frontend:
  `${frontendUrl}/oauth/popup-callback?estado=exito` (login existente, cookies ya seteadas por
  el propio callback) o `${frontendUrl}/oauth/popup-callback#token=...&estado=nuevo` (usuario
  nuevo, token de onboarding en el fragment como ya se hace hoy).
- **Frontend, página puente nueva** (`frontend/src/pages/OAuthPopupCallbackPage.jsx`, ruta
  `/oauth/popup-callback`): al montar, lee `estado` de query/fragment y hace
  `window.opener.postMessage({ tipo: 'oauth-exito' } | { tipo: 'oauth-nuevo', token }, window.location.origin)`
  y luego `window.close()`. No renderiza nada visible más que un loader breve (por si el popup
  no cierra automáticamente en algún navegador).
- **Ventana principal (login)**: agrega un listener
  `window.addEventListener('message', handler)` que valida `event.origin === window.location.origin`
  antes de procesar. Al recibir `oauth-exito`, navega a `/dashboard` (que a su vez dispara el
  wizard si el usuario no lo ha completado, ver sección 3). Al recibir `oauth-nuevo`, abre el
  flujo de completar registro (formulario de nombre de clínica) con el token recibido, igual
  que hoy hace la página `/completar-registro` pero sin depender de la URL visible.
- La ruta `/completar-registro` y su fragment-token siguen existiendo como fallback para cuando
  el popup fue bloqueado y se usó el redirect completo.

## 3. Wizard de onboarding

Se muestra una sola vez, inmediatamente después de crear la cuenta (registro por correo vía
`RegistroDialog`, o al completar el registro OAuth), antes de aterrizar en el dashboard.

**Layout**: dos columnas en desktop (colapsa a una en mobile). Columna izquierda: paso actual
del formulario + barra de progreso `n/5` + link "Volver" (excepto en el paso 1). Columna
derecha: ilustración fija decorativa (mockup simplificado del dashboard), no cambia entre pasos.

**Pasos:**

1. **¿Cómo planeas usar Bourgelat?** — tarjetas seleccionables (ícono + título + subtítulo):
   "Soy dueño/administrador de la clínica", "Soy veterinario tratante", "Trabajo en
   recepción/administrativo".
2. **Vamos a conocerte mejor** — cargo (select; opciones acordes al rol elegido en el paso 1),
   WhatsApp opcional con selector de país (reutiliza el patrón de teléfono ya usado en otros
   formularios del proyecto si existe, si no, input simple con prefijo +57 por defecto).
3. **Cuéntanos sobre tu clínica** — tipo de clínica (select: general/especializada/rural/urgencias),
   tamaño del equipo (pills: Solo yo/2-5/6-15/16-30/+30), mascotas atendidas al mes (select de
   rangos).
4. **Elige tu objetivo inicial** — tarjetas radio: Agenda y citas / Historias clínicas /
   Inventario y farmacia / Facturación y finanzas.
5. **Un dato más (opcional)** — "¿Cómo gestionas tu clínica hoy?" (select: Cuadernos/Excel,
   otro software, nada aún). Botón final dice "Finalizar" en vez de "Continuar".

Al finalizar: modal breve de bienvenida (nombre de la clínica, barra de progreso decorativa,
"¡Hecho!") y redirección al dashboard real.

**Persistencia**: columna `onboarding` (tipo `JSONB`, nullable) en el modelo `Usuario`, con las
respuestas de los 5 pasos. Un booleano derivado (`onboarding IS NOT NULL`) determina si el
usuario ya completó el wizard — no se vuelve a mostrar en logins posteriores. Migración nueva
en `backend/src/migrations/` siguiendo el patrón existente (ver `20260718_000001_add_perfil_usuarios.js`
como referencia de estilo).

**Endpoint backend nuevo**: `PATCH /api/usuarios/onboarding` (o similar, a definir nombre exacto
en el plan) que recibe el JSON de respuestas y lo guarda en el usuario autenticado.

## Fuera de alcance

- Mensaje de bienvenida automatizado por WhatsApp Business (pospuesto, ver memoria de proyecto).
- Dashboard con checklist de "primeros pasos" y banner de trial estilo Alegra — no se pidió
  explícitamente en esta ronda, se puede evaluar después de tener el wizard funcionando.
- Página de planes con slider de ingresos — fuera de esta ronda; Bourgelat ya tiene su propia
  lógica de planes en `backend/src/config/planes.js`, no se toca aquí.
