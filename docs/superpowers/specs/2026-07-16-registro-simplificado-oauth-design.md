# Registro simplificado + login social (Google/Microsoft) — Diseño

**Fecha:** 2026-07-16
**Estado:** Aprobado por Roman (Opción A)

## Problema

El registro actual (`/registro`) pide ~11 campos, incluyendo datos fiscales
(tipoPersona, NIT, departamento/ciudad) que solo importan para facturación
electrónica DIAN. Para una clínica que solo quiere usar inventario/agenda, esa
fricción es innecesaria y contradice la reorientación a v1 (sin DIAN).

## Solución

Registro mínimo con *progressive profiling*: entrar con lo mínimo, capturar lo
fiscal después en Configuración (Fase 2 del onboarding fiscal, ya planeada).

### UX

1. **Se elimina la página `/registro`.** El botón "Registrarme" (landing, nav,
   login) abre un **modal centrado** (Dialog de shadcn) con:
   - Botón "Continuar con Google"
   - Botón "Continuar con Microsoft"
   - Separador "o"
   - Formulario manual de **4 campos**: nombre de la clínica, nombre del
     administrador, email, contraseña.
2. **LoginPage** gana los mismos 2 botones sociales encima del formulario
   email/contraseña actual.
3. **Flujo social unificado (login y registro con el mismo botón):**
   - Click → redirect al proveedor → callback en backend.
   - Si el email ya existe → inicia sesión (cookies JWT actuales).
   - Si no existe → redirige a pantalla mínima "¿Cómo se llama tu clínica?"
     (1 campo) → crea `Usuario` + `Clinica` + `Suscripcion` gratuita →
     dashboard.
4. Banner suave post-registro: "completa el perfil de tu clínica" en
   Configuración (no bloqueante).

### Backend (Opción A — OIDC directo, sin servicios externos)

- Librería: `openid-client`. Google y Microsoft son ambos OIDC estándar;
  agregar proveedores futuros es configuración.
- Nuevos endpoints en `authRoutes`:
  - `GET /api/auth/oauth/:proveedor` → genera `state` + PKCE, redirige al
    proveedor.
  - `GET /api/auth/oauth/:proveedor/callback` → valida `state`/PKCE, obtiene
    id_token, verifica `email_verified === true`, busca/crea usuario, emite
    las **mismas cookies JWT actuales** (access 15min + refresh 7d httpOnly).
    Redirige al frontend (`/dashboard` o `/completar-registro` si falta
    clínica).
- `POST /api/auth/registro` se relaja: obligatorios solo nombre clínica,
  nombre admin, email, password. Se quitan como requeridos: departamento,
  ciudad, teléfono, emailClinica, dirección, tipoPersona, NIT.
- Reutiliza intacta la infraestructura existente: refresh tokens, auditoría,
  tenantGuard, rate limiting.

### Modelo de datos (migración)

- `Usuario.proveedorAuth`: ENUM(`local`,`google`,`microsoft`) default `local`.
- `Usuario.proveedorId`: STRING nullable (el `sub` del id_token), índice único
  compuesto (`proveedorAuth`,`proveedorId`).
- `Usuario.password`: pasa a nullable (usuarios sociales no tienen).
- `Clinica`: campos de contacto que hoy son `allowNull: false` y ya no se
  piden al registrar pasan a nullable (teléfono, dirección, etc. según modelo).
- La creación del `Usuario` social se **difiere** hasta el paso "¿Cómo se
  llama tu clínica?" para no tener usuarios sin tenant: el callback deja los
  datos del proveedor en un token firmado de corta vida (15 min) que el paso
  final consume para crear Usuario+Clinica+Suscripcion en una transacción.

### Seguridad

- Solo emails con `email_verified: true` del proveedor.
- `state` + PKCE contra CSRF/interceptación de código.
- Usuarios con `proveedorAuth != local` no pueden usar login por contraseña
  (el endpoint de login lo rechaza con mensaje claro "usa Continuar con
  Google"). Vinculación de cuentas queda fuera de alcance (futuro).
- Redirect URIs permitidas en allowlist estricta (env var), nunca derivadas
  del request.
- Config nueva en env: `GOOGLE_CLIENT_ID/SECRET`, `MS_CLIENT_ID/SECRET`,
  `OAUTH_REDIRECT_BASE_URL` — validadas en `validateRuntimeConfig` solo si el
  feature está activo (flag `OAUTH_ENABLED` para no romper entornos sin
  credenciales).

### Fuera de alcance

- Apple Sign-In (evaluar después si hay demanda; requiere US$99/año).
- Vinculación de cuenta social ↔ contraseña existente.
- Passkeys / magic links.
- Captura de datos fiscales (es la Fase 2 del onboarding fiscal, otro
  proyecto).

### Testing

- Unit: creación/búsqueda de usuario social, rechazo de email no verificado,
  rechazo de login-contraseña para usuarios sociales, validación relajada de
  registro manual.
- Manual E2E: flujo completo con cuentas reales de Google/Microsoft en dev
  (credenciales OAuth de prueba), registro manual de 4 campos, y modal desde
  landing y login.
