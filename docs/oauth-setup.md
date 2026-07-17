# Configuración OAuth: Google y Microsoft

Esta guía describe cómo obtener y configurar las credenciales OAuth para autenticación social en Bourgelat.

---

## 1. Configuración de Google Cloud Console

### 1.1 Crear un proyecto

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita las siguientes APIs:
   - **Google+ API** (deprecated pero aún necesaria para OAuth 2.0)
   - **People API** (para obtener perfil del usuario)

### 1.2 Crear el OAuth 2.0 Client ID

1. En el menú lateral, ve a **APIs & Services** → **Credentials**
2. Haz clic en **+ Create Credentials** → **OAuth client ID**
   - Si no tienes configurada una pantalla de consentimiento, primero haz clic en **Consent Screen**
3. En **Consent Screen**:
   - **User Type**: selecciona **External** (la opción más permisiva)
   - Completa los campos obligatorios (nombre de la aplicación, email de soporte, etc.)
   - **Scopes**: agrega `openid`, `email`, `profile`
4. Vuelve a **Credentials** → **+ Create Credentials** → **OAuth client ID**
5. **Application type**: selecciona **Web application**
6. **Name**: `Bourgelat (Dev)` o `Bourgelat (Prod)`
7. **Authorized redirect URIs**: agrega ambas:
   - **Dev**: `http://localhost:3000/api/auth/oauth/google/callback`
   - **Prod**: `https://api.bourgelat.co/api/auth/oauth/google/callback`
8. Crea el cliente
9. **Copia el `Client ID` y `Client Secret`** — los necesitarás en el paso 3

---

## 2. Configuración de Microsoft Entra Admin Center

### 2.1 Registrar una aplicación

1. Ve a [Microsoft Entra admin center](https://entra.microsoft.com/)
2. En el menú lateral, ve a **Applications** → **App registrations**
3. Haz clic en **+ New registration**
4. Completa el formulario:
   - **Name**: `Bourgelat` (o `Bourgelat Dev` / `Bourgelat Prod`)
   - **Supported account types**: selecciona la última opción:
     - **"Accounts in any organizational directory and personal Microsoft accounts"**
     - (Esto corresponde a tenant ID `common`, multi-tenant)
5. Crea la aplicación

### 2.2 Configurar Redirect URI

1. En la página de la aplicación, ve a **Manage** → **Authentication**
2. En **Platform configurations**, haz clic en **+ Add a platform** → **Web**
3. Agrega ambas **Redirect URIs**:
   - **Dev**: `http://localhost:3000/api/auth/oauth/microsoft/callback`
   - **Prod**: `https://api.bourgelat.co/api/auth/oauth/microsoft/callback`
4. Habilita **ID tokens** (marcar el checkbox bajo "Implicit grant and hybrid flows")
5. Guarda

### 2.3 Crear un Client Secret

1. En la misma página, ve a **Manage** → **Certificates & secrets**
2. En la pestaña **Client secrets**, haz clic en **+ New client secret**
3. **Description**: `Bourgelat API` o similar
4. **Expires**: selecciona la duración deseada (ej. 24 meses)
5. Crea el secret
6. **Copia el `Value` (no el ID)** — este es tu `Client Secret`
   - ⚠️ **Nota**: Solo lo ves una vez. Si lo pierdes, crea uno nuevo.

### 2.4 Obtener el Client ID

1. En la página principal de la aplicación, copia el **Application (client) ID**

### 2.5 Configurar el optional claim `xms_edov`

Bourgelat exige que el email venga verificado por el proveedor. Microsoft no
expone `email_verified` de forma consistente, así que se requiere el optional
claim `xms_edov` ("email domain owner verified"):

1. En la página de la aplicación, ve a **Manage** → **Token configuration**
2. Haz clic en **+ Add optional claim**
3. Selecciona el tipo de token **ID**
4. Marca el claim **`xms_edov`** y agrégalo
5. Guarda

⚠️ **Importante**: sin este optional claim configurado, el backend rechazará
el login social con Microsoft (el email se considerará no verificado y el
flujo terminará en `login?error=oauth`).

---

## 3. Variables de Entorno

Una vez tengas las credenciales de ambos proveedores, configura las siguientes variables.

### 3.1 En desarrollo (backend/.env)

```bash
OAUTH_ENABLED=true
OAUTH_BACKEND_BASE_URL=http://localhost:3000
OAUTH_FRONTEND_URL=http://localhost:5173

GOOGLE_CLIENT_ID=<tu_google_client_id>
GOOGLE_CLIENT_SECRET=<tu_google_client_secret>

MS_TENANT=common
MS_CLIENT_ID=<tu_microsoft_client_id>
MS_CLIENT_SECRET=<tu_microsoft_client_secret>
```

Luego levanta el backend:
```bash
cd backend
npm run dev
```

Levanta el frontend:
```bash
cd frontend
npm run dev
```

### 3.2 En producción (Render Dashboard)

1. Ve a [Render Dashboard](https://dashboard.render.com/)
2. Selecciona el servicio **bourgelat-api** (backend)
3. Ve a **Settings** → **Environment** → **Environment Variables**
4. Agrega o actualiza las siguientes variables:

| Variable | Valor |
|----------|-------|
| `OAUTH_ENABLED` | `true` |
| `OAUTH_BACKEND_BASE_URL` | `https://api.bourgelat.co` |
| `OAUTH_FRONTEND_URL` | `https://app.bourgelat.co` |
| `GOOGLE_CLIENT_ID` | (credencial de Google para prod) |
| `GOOGLE_CLIENT_SECRET` | (credencial de Google para prod) |
| `MS_TENANT` | `common` |
| `MS_CLIENT_ID` | (credencial de Microsoft para prod) |
| `MS_CLIENT_SECRET` | (credencial de Microsoft para prod) |

5. Guarda y redeploy el servicio

---

## 4. Scopes OAuth

Bourgelat solicita los siguientes scopes a ambos proveedores:
- **`openid`** — Información de identidad
- **`email`** — Email del usuario
- **`profile`** — Perfil básico (nombre, foto de perfil, etc.)

Estos son los scopes mínimos para funcionar. Los usuarios verán la pantalla de consentimiento en su primer login social.

---

## 5. Flujo de Autenticación

### Primera vez (cuenta no existe)
1. Usuario hace clic en **"Continuar con Google"** o **"Continuar con Microsoft"**
2. Se redirige a la pantalla de consentimiento del proveedor
3. Usuario autoriza
4. Se redirige a `/api/auth/oauth/{google|microsoft}/callback`
5. Backend crea un nuevo usuario con `proveedorAuth='google'|'microsoft'` y `password IS NULL`
6. Usuario ve modal: **"¿Cómo se llama tu clínica?"**
7. Completa el nombre → se crea la clínica y se asigna suscripción
8. Ingresa al dashboard

### Segunda vez (cuenta existe)
1. Usuario hace clic en **"Continuar con Google"** o **"Continuar con Microsoft"**
2. Se redirige directamente al dashboard (sin modal)

### Intento de login por email/contraseña
Si el email ya está registrado con un proveedor social y el usuario intenta login por contraseña:
- Mensaje: **"Este email ya está registrado con [Google/Microsoft]. Usa 'Continuar con [Google/Microsoft]'"**

---

## 6. Testing E2E Manual

Con backend y frontend corriendo localmente, valida estos escenarios:

### Test 1: Login con Google (primera vez)
- [ ] Haz clic en "Continuar con Google"
- [ ] Autentica con una cuenta Google NO registrada en Bourgelat
- [ ] Se abre el modal "¿Cómo se llama tu clínica?"
- [ ] Completa el nombre y entra al dashboard
- [ ] En la BD: verifica que `usuarios.proveedorAuth = 'google'`, `password IS NULL`
- [ ] Verifica que se creó una clínica y una suscripción asociada

### Test 2: Login con Google (segunda vez)
- [ ] Logout
- [ ] Haz clic en "Continuar con Google"
- [ ] Autentica con la MISMA cuenta
- [ ] Entra directamente al dashboard (sin modal)

### Test 3: Intento de login por email/contraseña
- [ ] En la pantalla de login, completa el email del usuario social
- [ ] Intenta ingresar contraseña aleatoria
- [ ] Se muestra mensaje: "Este email ya está registrado con Google. Usa 'Continuar con Google'"

### Test 4: Login con Microsoft (primera vez y segunda vez)
- [ ] Repite Tests 1-2 con "Continuar con Microsoft"
- [ ] En la BD: verifica que `usuarios.proveedorAuth = 'microsoft'`

### Test 5: Registro manual (sin OAuth)
- [ ] En la pantalla de login, usa el modal de registro tradicional (4 campos)
- [ ] Registra un usuario con email y contraseña
- [ ] Entra al dashboard
- [ ] En la BD: verifica que `usuarios.proveedorAuth IS NULL`, `password IS NOT NULL`

### Limpieza
- [ ] Elimina las clínicas de prueba de la BD para no interferir con datos reales

---

## 7. Checklist de Configuración

### Google
- [ ] Proyecto creado en Google Cloud Console
- [ ] APIs habilitadas: Google+ API, People API
- [ ] Pantalla de consentimiento: External
- [ ] Scopes agregados: `openid`, `email`, `profile`
- [ ] OAuth Client ID creado
- [ ] Redirect URIs configuradas (dev + prod)
- [ ] `GOOGLE_CLIENT_ID` copiado
- [ ] `GOOGLE_CLIENT_SECRET` copiado

### Microsoft
- [ ] Aplicación registrada en Entra Admin Center
- [ ] Supported account types: Multi-tenant (common)
- [ ] Plataforma Web agregada
- [ ] Redirect URIs configuradas (dev + prod)
- [ ] ID tokens habilitados
- [ ] Client secret creado
- [ ] `MS_CLIENT_ID` copiado
- [ ] `MS_CLIENT_SECRET` copiado
- [ ] ⚠️ Recordar: los secrets expiran; revisar regularmente en Entra

### Bourgelat Backend
- [ ] `backend/.env` contiene todas las 8 variables (dev)
- [ ] `OAUTH_ENABLED=true`
- [ ] Render Dashboard contiene todas las 8 variables (prod)
- [ ] Backend levanta sin errores: `npm run dev`
- [ ] Frontend levanta sin errores: `npm run dev`

### Testing
- [ ] Test 1 (Google primera vez): completo
- [ ] Test 2 (Google segunda vez): completo
- [ ] Test 3 (email/contraseña con social): completo
- [ ] Test 4 (Microsoft primera y segunda): completo
- [ ] Test 5 (registro manual): completo
- [ ] Datos de prueba eliminados de la BD

---

## 8. Troubleshooting

### "Redirect URI no coincide"
- Verifica que los valores en Google Cloud Console y Entra Admin Center **exactamente** coincidan con:
  - Dev: `http://localhost:3000/api/auth/oauth/google/callback` (o `/microsoft/`)
  - Prod: `https://api.bourgelat.co/api/auth/oauth/google/callback` (o `/microsoft/`)
- No agregar rutas diferentes; deben ser idénticas

### "Client Secret incorrecto"
- En Microsoft: el secret solo se ve una vez. Si lo pierdes, crea uno nuevo en Entra
- Asegúrate de copiar el **Value**, no el **Secret ID**

### "OAUTH_ENABLED está false"
- El login social se deshabilita completamente
- Verifica `backend/.env` o Render Dashboard: debe ser `true`

### Usuario recibe "Este email no está permitido"
- En la pantalla de consentimiento de Google: revisa que esté en **External** (no Restricted)
- Si está Restricted, solo cuentas de tu dominio pueden acceder

### Timeout en login social
- Verifica que `OAUTH_BACKEND_BASE_URL` sea accesible desde el navegador
- Dev: debe ser reachable como `http://localhost:3000`
- Prod: debe ser reachable como `https://api.bourgelat.co`

---

## 9. Referencias

- [Google OAuth 2.0 Docs](https://developers.google.com/identity/protocols/oauth2)
- [Microsoft Identity Platform](https://learn.microsoft.com/en-us/azure/active-directory/develop/)
- [OpenID Connect Spec](https://openid.net/connect/)

---

**Última actualización**: 2026-07-16
