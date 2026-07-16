# Registro simplificado + login social (Google/Microsoft) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar la página `/registro` por un modal con login social (Google/Microsoft vía OIDC) y registro manual de 4 campos; datos fiscales se difieren a Configuración.

**Architecture:** OIDC authorization-code + PKCE directo en el backend Express (`openid-client` v6). El callback emite las cookies JWT existentes. Usuarios sociales nuevos completan un paso "¿Cómo se llama tu clínica?" que crea Usuario+Clinica+Suscripcion en una transacción (no existen usuarios sin tenant). Feature flag `OAUTH_ENABLED` para entornos sin credenciales.

**Tech Stack:** Express 5, Sequelize 6, openid-client v6, React 19, React Hook Form + Zod, shadcn Dialog.

**Spec:** `docs/superpowers/specs/2026-07-16-registro-simplificado-oauth-design.md`

## Global Constraints

- Rama de trabajo: `feature/registro-simplificado-oauth` (ya creada). Nunca push directo a develop/main.
- Todo texto de UI en español, sin tildes en mensajes de backend (convención existente).
- No usar `fetch` directo en frontend: siempre `@/lib/api`.
- Multi-tenancy: queries globales de auth llevan `sinTenant: true`.
- No incluir atribución de Claude en commits.
- Backend corre con Postgres nativo local; probar con `cd backend && npm run dev` y `npm test`.

---

### Task 1: Migración y modelo — Usuario con proveedor social y password nullable

**Files:**
- Create: `backend/src/migrations/20260716_000001_add_oauth_usuarios.js`
- Modify: `backend/src/models/Usuario.js` (campos `password`, agregar `proveedorAuth`/`proveedorId`)

**Interfaces:**
- Produces: columnas `usuarios.proveedorAuth` (`'local'|'google'|'microsoft'`, default `'local'`), `usuarios.proveedorId` (string nullable), `usuarios.password` nullable; índice único `(proveedorAuth, proveedorId)` parcial (solo cuando `proveedorId IS NOT NULL`).

- [ ] **Step 1: Escribir la migración**

```js
'use strict'

module.exports = {
  name: '20260716_000001_add_oauth_usuarios',

  up: async ({ sequelize }) => {
    await sequelize.query(`
      ALTER TABLE usuarios ALTER COLUMN password DROP NOT NULL;
    `)
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_usuarios_proveedor_auth AS ENUM ('local', 'google', 'microsoft');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `)
    await sequelize.query(`
      ALTER TABLE usuarios
        ADD COLUMN IF NOT EXISTS "proveedorAuth" enum_usuarios_proveedor_auth NOT NULL DEFAULT 'local',
        ADD COLUMN IF NOT EXISTS "proveedorId" VARCHAR(255);
    `)
    await sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS usuarios_proveedor_auth_proveedor_id
        ON usuarios ("proveedorAuth", "proveedorId")
        WHERE "proveedorId" IS NOT NULL;
    `)
  },

  down: async ({ sequelize }) => {
    await sequelize.query('DROP INDEX IF EXISTS usuarios_proveedor_auth_proveedor_id')
    await sequelize.query('ALTER TABLE usuarios DROP COLUMN IF EXISTS "proveedorId"')
    await sequelize.query('ALTER TABLE usuarios DROP COLUMN IF EXISTS "proveedorAuth"')
    await sequelize.query('DROP TYPE IF EXISTS enum_usuarios_proveedor_auth')
    // No se restaura NOT NULL en password: podria haber usuarios sociales sin password.
  },
}
```

- [ ] **Step 2: Actualizar el modelo `Usuario.js`**

En `backend/src/models/Usuario.js`, cambiar el campo `password` y añadir los dos campos nuevos después de `password`:

```js
  password: {
    type: DataTypes.STRING,
    allowNull: true, // null para usuarios creados via login social
  },
  proveedorAuth: {
    type: DataTypes.ENUM('local', 'google', 'microsoft'),
    allowNull: false,
    defaultValue: 'local',
  },
  proveedorId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Claim sub del id_token del proveedor OIDC',
  },
```

- [ ] **Step 3: Correr la migración y verificar**

Run: `cd backend && npm run dev` (el runner ejecuta migraciones al arrancar; ver log `Migracion aplicada`). Luego Ctrl+C.
Verificar: `node -e "require('dotenv').config();const{Sequelize}=require('sequelize');const s=new Sequelize(process.env.DB_NAME,process.env.DB_USER,process.env.DB_PASSWORD,{host:process.env.DB_HOST,dialect:'postgres',logging:false});s.query(\"SELECT column_name,is_nullable FROM information_schema.columns WHERE table_name='usuarios' AND column_name IN ('password','proveedorAuth','proveedorId')\").then(([r])=>{console.log(r);process.exit(0)})"`
Expected: `password` → `is_nullable: YES`, y las dos columnas nuevas presentes.

- [ ] **Step 4: Commit**

```bash
git add backend/src/migrations/20260716_000001_add_oauth_usuarios.js backend/src/models/Usuario.js
git commit -m "feat(auth): columnas de proveedor social y password nullable en usuarios"
```

---

### Task 2: Relajar validación del registro manual (backend)

**Files:**
- Modify: `backend/src/routes/authRoutes.js:21-81` (validadores de `/registro`)
- Modify: `backend/src/controllers/authController.js:143-346` (función `registro`)

**Interfaces:**
- Produces: `POST /api/auth/registro` acepta body mínimo `{ nombre, nombreAdministrador, email, password }`. Los demás campos (`emailClinica`, `telefono`, `direccion`, `ciudad`, `departamento`, `nit`, fiscales) pasan a opcionales. Si falta `emailClinica`, la clínica usa el email del administrador.

- [ ] **Step 1: Reescribir los validadores de `/registro` en `authRoutes.js`**

Reemplazar el array de validadores actual por:

```js
router.post(
  '/registro',
  limitadorAuth,
  [
    body('nombre').trim().notEmpty().withMessage('El nombre de la clinica es obligatorio'),
    body('nombreAdministrador')
      .trim()
      .notEmpty()
      .withMessage('El nombre del administrador es obligatorio'),
    body('email').trim().isEmail().withMessage('Email invalido').normalizeEmail(),
    body('password')
      .matches(passwordFuerteRegex)
      .withMessage(
        'La contrasena debe tener entre 8 y 72 caracteres e incluir mayuscula, minuscula, numero y caracter especial'
      ),
    body('emailClinica')
      .optional({ values: 'falsy' })
      .trim()
      .isEmail()
      .withMessage('Email de la clinica invalido')
      .normalizeEmail(),
    body('telefono')
      .optional({ values: 'falsy' })
      .trim()
      .customSanitizer(normalizarTelefonoColombiano)
      .custom((valor) => /^3\d{9}$/.test(valor))
      .withMessage('El telefono debe ser un celular colombiano valido de 10 digitos'),
    body('departamento').optional({ values: 'falsy' }).trim(),
    body('ciudad').optional({ values: 'falsy' }).trim(),
    body('nit').optional({ values: 'falsy' }).trim(),
    body('direccion').optional({ values: 'falsy' }).trim(),
    body('razonSocial').optional({ values: 'falsy' }).trim(),
    body('nombreComercial').optional({ values: 'falsy' }).trim(),
    body('tipoPersona')
      .optional({ values: 'falsy' })
      .isIn(['persona_natural', 'persona_juridica'])
      .withMessage('Tipo de persona no valido'),
    body('digitoVerificacion').optional({ values: 'falsy' }).trim(),
    body('codigoPostal').optional({ values: 'falsy' }).trim(),
    body('municipioId')
      .optional({ values: 'falsy' })
      .isInt({ min: 1 })
      .withMessage('Municipio no valido'),
    body('tipoDocumentoFacturacionId')
      .optional({ values: 'falsy' })
      .isInt({ min: 1 })
      .withMessage('Tipo de documento fiscal no valido'),
    body('organizacionJuridicaId').optional({ values: 'falsy' }).trim(),
    body('tributoId').optional({ values: 'falsy' }).trim(),
    validar,
  ],
  registro
)
```

- [ ] **Step 2: Ajustar el controlador `registro` en `authController.js`**

Cambios puntuales dentro de la función existente:

1. El chequeo de obligatorios (líneas ~167-181) queda:

```js
    if (!nombre || !nombreAdministrador || !email || !password) {
      return res.status(400).json({
        message: 'Nombre de la clinica, responsable, email y password son obligatorios',
      })
    }
```

2. Tras normalizar (líneas ~190-198), definir el email de la clínica con fallback y quitar los obligatorios extra:

```js
    const emailContactoClinica = normalizarEmail(emailClinica) || emailAdministrador

    if (!nombreClinica || !nombreUsuarioAdmin || !emailAdministrador) {
      return res.status(400).json({
        message: 'Nombre de la clinica, responsable y email son obligatorios',
      })
    }

    if (telefonoNormalizado && !esTelefonoColombianoValido(telefonoNormalizado)) {
      return res.status(400).json({
        message: 'El telefono debe ser un celular colombiano valido de 10 digitos',
      })
    }
```

(Nota: `telefonoNormalizado` puede ser `''`/`null`; `Clinica.telefono` ya es nullable. Pasar `telefono: telefonoNormalizado || null` en los `create`.)

3. El chequeo de email de clínica duplicado (`clinicaPorEmail`) se mantiene igual — con el fallback, dos registros del mismo email chocarían primero en `usuarioPorEmail`, que es el mensaje correcto.

- [ ] **Step 3: Probar registro mínimo por API**

Con backend corriendo (`cd backend && npm run dev`):

```bash
node -e "
const http = require('http');
const d = JSON.stringify({ nombre: 'Clinica Minima Test', nombreAdministrador: 'Test Admin', email: 'minimo-test@example.com', password: 'Passw0rd!x' });
const r = http.request({ hostname: 'localhost', port: 3000, path: '/api/auth/registro', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': d.length } }, res => { let b=''; res.on('data',c=>b+=c); res.on('end',()=>console.log(res.statusCode, b.slice(0,200))); });
r.write(d); r.end();"
```

Expected: `201` y `Clinica registrada exitosamente`. Limpiar después:

```bash
node -e "
require('dotenv').config({ path: 'backend/.env' });
const { Sequelize } = require('sequelize');
const s = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, { host: process.env.DB_HOST, dialect: 'postgres', logging: false });
(async()=>{ const [[c]] = await s.query(\"SELECT id FROM clinicas WHERE nombre='Clinica Minima Test'\"); if(c){ await s.query('DELETE FROM refresh_tokens WHERE \"clinicaId\"=:id',{replacements:c}); await s.query('DELETE FROM suscripciones WHERE \"clinicaId\"=:id',{replacements:c}); await s.query('DELETE FROM usuarios WHERE \"clinicaId\"=:id',{replacements:c}); await s.query('DELETE FROM clinicas WHERE id=:id',{replacements:c}); } console.log('limpio'); process.exit(0); })()"
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/authRoutes.js backend/src/controllers/authController.js
git commit -m "feat(auth): registro minimo de 4 campos, datos de contacto y fiscales opcionales"
```

---

### Task 3: Config OAuth + flag + validación de entorno

**Files:**
- Create: `backend/src/config/oauth.js`
- Modify: `backend/src/config/validateRuntimeConfig.js` (agregar bloque de validación)
- Modify: `backend/.env` y `backend/.env.production.example` (nuevas variables)

**Interfaces:**
- Produces: `const { oauthConfig } = require('../config/oauth')` con `{ enabled, frontendUrl, backendBaseUrl, proveedores: { google: { issuer, clientId, clientSecret }, microsoft: {...} } }` y helper `proveedorSoportado(nombre)`.

- [ ] **Step 1: Crear `backend/src/config/oauth.js`**

```js
const parseBool = (valor, porDefecto = false) => {
  if (valor === undefined || valor === '') return porDefecto
  return String(valor).toLowerCase() === 'true'
}

const oauthConfig = {
  enabled: parseBool(process.env.OAUTH_ENABLED, false),
  // URL del frontend a la que se redirige tras el callback (sin slash final)
  frontendUrl: (process.env.OAUTH_FRONTEND_URL || process.env.FRONTEND_URLS?.split(',')[0] || '').replace(/\/$/, ''),
  // Base publica del backend para construir redirect_uri (ej: http://localhost:3000)
  backendBaseUrl: (process.env.OAUTH_BACKEND_BASE_URL || '').replace(/\/$/, ''),
  proveedores: {
    google: {
      issuer: 'https://accounts.google.com',
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    },
    microsoft: {
      // MS_TENANT: 'common' (cualquier cuenta), 'consumers' o un tenant especifico
      issuer: `https://login.microsoftonline.com/${process.env.MS_TENANT || 'common'}/v2.0`,
      clientId: process.env.MS_CLIENT_ID || '',
      clientSecret: process.env.MS_CLIENT_SECRET || '',
    },
  },
}

const proveedorSoportado = (nombre) =>
  Object.prototype.hasOwnProperty.call(oauthConfig.proveedores, nombre)

module.exports = { oauthConfig, proveedorSoportado }
```

- [ ] **Step 2: Validar en `validateRuntimeConfig.js`**

Agregar junto a las validaciones existentes (usa los arrays `errors`/`warnings` ya presentes):

```js
  const oauthEnabled = String(process.env.OAUTH_ENABLED || '').toLowerCase() === 'true'
  if (oauthEnabled) {
    ;['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'MS_CLIENT_ID', 'MS_CLIENT_SECRET', 'OAUTH_BACKEND_BASE_URL'].forEach((key) => {
      if (!process.env[key]) {
        errors.push(`${key} es obligatorio cuando OAUTH_ENABLED=true.`)
      }
    })
  }
```

- [ ] **Step 3: Variables en `.env` local y example**

En `backend/.env` (local, valores reales cuando Roman cree las credenciales; mientras tanto `OAUTH_ENABLED=false`):

```
OAUTH_ENABLED=false
OAUTH_BACKEND_BASE_URL=http://localhost:3000
OAUTH_FRONTEND_URL=http://localhost:5173
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
MS_TENANT=common
MS_CLIENT_ID=
MS_CLIENT_SECRET=
```

Añadir las mismas claves (vacías, con comentario) a `backend/.env.production.example`.

- [ ] **Step 4: Verificar arranque con flag apagado y encendido**

Run: `cd backend && npm run dev` → arranca sin errores con `OAUTH_ENABLED=false`.
Cambiar a `OAUTH_ENABLED=true` sin credenciales → debe abortar con `GOOGLE_CLIENT_ID es obligatorio...`. Volver a `false`.

- [ ] **Step 5: Commit**

```bash
git add backend/src/config/oauth.js backend/src/config/validateRuntimeConfig.js backend/.env.production.example
git commit -m "feat(auth): configuracion y validacion de entorno para OAuth Google/Microsoft"
```

---

### Task 4: Servicio OIDC (openid-client) + endpoints de inicio y callback

**Files:**
- Create: `backend/src/services/oauthService.js`
- Create: `backend/src/services/sesionService.js`
- Create: `backend/src/controllers/oauthController.js`
- Modify: `backend/src/routes/authRoutes.js` (montar rutas)
- Modify: `backend/src/controllers/authController.js` (importar helpers desde sesionService)
- Modify: `backend/package.json` (dependencia `openid-client@^6`)

**Interfaces:**
- Consumes: `oauthConfig`, `proveedorSoportado` (Task 3); `Usuario` con `proveedorAuth/proveedorId` (Task 1).
- Produces:
  - `GET /api/auth/oauth/:proveedor` → 302 al proveedor (o 404 si flag off / proveedor inválido).
  - `GET /api/auth/oauth/:proveedor/callback` → si usuario existe: cookies + redirect `${frontendUrl}/dashboard`; si no: redirect `${frontendUrl}/completar-registro#token=<jwt>`.
  - `oauthService.generarTokenOnboarding({ email, nombre, proveedor, proveedorId })` → JWT firmado con `JWT_SECRET`, claim `proposito: 'oauth_onboarding'`, expira 15 min.
  - `oauthService.verificarTokenOnboarding(token)` → payload o lanza.
  - `sesionService` exporta `generarAccessToken(payload)`, `generarRefreshToken(payload)`, `guardarRefreshToken({token, clinicaId, usuarioId, ip, userAgent, transaction?})` (implementaciones movidas desde `authController.js`).

- [ ] **Step 1: Instalar dependencia**

Run: `cd backend && npm install openid-client@^6`
Expected: agregado a `package.json` sin vulnerabilidades nuevas críticas.

- [ ] **Step 2: Extraer helpers de sesión compartidos**

En `authController.js`, `generarAccessToken`, `generarRefreshToken` y `guardarRefreshToken` son privados del módulo. Crear `backend/src/services/sesionService.js` moviendo esas tres funciones (copiar implementación textual desde `authController.js` líneas ~20-100 junto con sus imports: `jsonwebtoken`, config JWT, modelo `RefreshToken`) y exportándolas; en `authController.js` importarlas desde el servicio y borrar las copias locales.

Run: `cd backend && npm test`
Expected: la suite existente sigue verde.

- [ ] **Step 3: Crear `backend/src/services/oauthService.js`**

```js
const client = require('openid-client')
const jwt = require('jsonwebtoken')
const { oauthConfig } = require('../config/oauth')

// Cache de configuraciones OIDC descubiertas (una por proveedor)
const configuraciones = new Map()

const obtenerConfiguracion = async (proveedor) => {
  if (configuraciones.has(proveedor)) return configuraciones.get(proveedor)
  const { issuer, clientId, clientSecret } = oauthConfig.proveedores[proveedor]
  const opciones =
    proveedor === 'microsoft'
      ? // El tenant 'common' de Microsoft devuelve un issuer con {tenantid},
        // que rompe la validacion estricta de OIDC discovery.
        { algorithm: 'oidc' }
      : undefined
  const config = await client.discovery(new URL(issuer), clientId, clientSecret, undefined, opciones)
  configuraciones.set(proveedor, config)
  return config
}

const redirectUri = (proveedor) =>
  `${oauthConfig.backendBaseUrl}/api/auth/oauth/${proveedor}/callback`

// Devuelve { url, state, codeVerifier } para iniciar el flujo
const iniciarFlujo = async (proveedor) => {
  const config = await obtenerConfiguracion(proveedor)
  const codeVerifier = client.randomPKCECodeVerifier()
  const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier)
  const state = client.randomState()
  const url = client.buildAuthorizationUrl(config, {
    redirect_uri: redirectUri(proveedor),
    scope: 'openid email profile',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })
  return { url: url.href, state, codeVerifier }
}

// Canjea el code y devuelve claims { sub, email, nombre, emailVerificado }
const completarFlujo = async (proveedor, urlCallback, { state, codeVerifier }) => {
  const config = await obtenerConfiguracion(proveedor)
  const tokens = await client.authorizationCodeGrant(config, new URL(urlCallback), {
    pkceCodeVerifier: codeVerifier,
    expectedState: state,
  })
  const claims = tokens.claims()
  const email = (claims.email || claims.preferred_username || '').toLowerCase()
  const emailVerificado =
    proveedor === 'google' ? claims.email_verified === true : Boolean(claims.email)
  return {
    sub: claims.sub,
    email,
    nombre: claims.name || email.split('@')[0],
    emailVerificado,
  }
}

const generarTokenOnboarding = (datos) =>
  jwt.sign({ ...datos, proposito: 'oauth_onboarding' }, process.env.JWT_SECRET, {
    expiresIn: '15m',
  })

const verificarTokenOnboarding = (token) => {
  const payload = jwt.verify(token, process.env.JWT_SECRET)
  if (payload.proposito !== 'oauth_onboarding') {
    throw new Error('Token de onboarding no valido')
  }
  return payload
}

module.exports = { iniciarFlujo, completarFlujo, generarTokenOnboarding, verificarTokenOnboarding }
```

Nota para el implementador: verificar contra la doc de `openid-client` v6 instalada (`node_modules/openid-client/README.md`) los nombres exactos (`randomState`, `buildAuthorizationUrl`, `authorizationCodeGrant`) y la forma correcta de relajar la validación de issuer para el tenant `common` de Microsoft — si la versión difiere, adaptar manteniendo state+PKCE.

- [ ] **Step 4: Crear `backend/src/controllers/oauthController.js`**

```js
const Usuario = require('../models/Usuario')
const { oauthConfig, proveedorSoportado } = require('../config/oauth')
const oauthService = require('../services/oauthService')
const { generarAccessToken, generarRefreshToken, guardarRefreshToken } = require('../services/sesionService')
const { setAuthCookies } = require('../config/cookies')
const { registrarAuditoria } = require('../middlewares/auditoriaMiddleware')
const logger = require('../utils/logger')

const COOKIE_FLUJO = 'bourgelat_oauth_flujo'

const iniciar = async (req, res) => {
  try {
    const { proveedor } = req.params
    if (!oauthConfig.enabled || !proveedorSoportado(proveedor)) {
      return res.status(404).json({ message: 'Proveedor no disponible' })
    }
    const { url, state, codeVerifier } = await oauthService.iniciarFlujo(proveedor)
    // state y verifier viajan en cookie httpOnly firmada de corta vida
    res.cookie(COOKIE_FLUJO, JSON.stringify({ state, codeVerifier, proveedor }), {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000,
      signed: true,
    })
    return res.redirect(url)
  } catch (error) {
    logger.error({ contexto: 'oauth', mensaje: error.message })
    return res.redirect(`${oauthConfig.frontendUrl}/login?error=oauth`)
  }
}

const callback = async (req, res) => {
  const irALoginConError = () => res.redirect(`${oauthConfig.frontendUrl}/login?error=oauth`)
  try {
    const { proveedor } = req.params
    if (!oauthConfig.enabled || !proveedorSoportado(proveedor)) return irALoginConError()

    const crudo = req.signedCookies[COOKIE_FLUJO]
    res.clearCookie(COOKIE_FLUJO)
    if (!crudo) return irALoginConError()
    const flujo = JSON.parse(crudo)
    if (flujo.proveedor !== proveedor) return irALoginConError()

    const urlCompleta = `${oauthConfig.backendBaseUrl}${req.originalUrl}`
    const perfil = await oauthService.completarFlujo(proveedor, urlCompleta, flujo)

    if (!perfil.email || !perfil.emailVerificado) return irALoginConError()

    const usuario = await Usuario.findOne({ where: { email: perfil.email }, sinTenant: true })

    if (usuario) {
      if (!usuario.activo || !usuario.clinicaId) return irALoginConError()
      const payload = {
        id: usuario.id,
        clinicaId: usuario.clinicaId,
        rol: usuario.rol,
        rolesAdicionales: usuario.rolesAdicionales || [],
      }
      const accessToken = generarAccessToken(payload)
      const refreshToken = generarRefreshToken(payload)
      await guardarRefreshToken({
        token: refreshToken,
        clinicaId: usuario.clinicaId,
        usuarioId: usuario.id,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      })
      // Primer login social de un usuario local: vincular proveedor
      if (usuario.proveedorAuth === 'local' && !usuario.proveedorId) {
        await usuario.update({ proveedorAuth: proveedor, proveedorId: perfil.sub })
      }
      setAuthCookies(res, { accessToken, refreshToken })
      await registrarAuditoria({
        accion: 'LOGIN',
        entidad: 'Usuario',
        entidadId: usuario.id,
        descripcion: `Login social ${proveedor} ${perfil.email}`,
        req,
        resultado: 'exitoso',
      })
      return res.redirect(`${oauthConfig.frontendUrl}/dashboard`)
    }

    // Usuario nuevo: token de onboarding en el fragment (no llega a logs de servidor)
    const token = oauthService.generarTokenOnboarding({
      email: perfil.email,
      nombre: perfil.nombre,
      proveedor,
      proveedorId: perfil.sub,
    })
    return res.redirect(`${oauthConfig.frontendUrl}/completar-registro#token=${token}`)
  } catch (error) {
    logger.error({ contexto: 'oauth-callback', mensaje: error.message })
    return irALoginConError()
  }
}

module.exports = { iniciar, callback }
```

Nota: la cookie firmada requiere `cookie-parser` con secret. Verificar en `backend/src/index.js` cómo se inicializa `cookie-parser` (el login actual lee `req.cookies`); si no tiene secret, cambiar a `cookieParser(process.env.JWT_SECRET)` — las cookies no firmadas existentes siguen funcionando vía `req.cookies`.

- [ ] **Step 5: Montar rutas en `authRoutes.js`**

```js
const { iniciar: oauthIniciar, callback: oauthCallback } = require('../controllers/oauthController')

router.get('/oauth/:proveedor', limitadorAuth, oauthIniciar)
router.get('/oauth/:proveedor/callback', limitadorAuth, oauthCallback)
```

- [ ] **Step 6: Probar con flag apagado**

Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/auth/oauth/google`
Expected: `404` (flag off). El flujo completo con credenciales reales se prueba en Task 8.

- [ ] **Step 7: Commit**

```bash
git add backend/src/services/oauthService.js backend/src/services/sesionService.js backend/src/controllers/oauthController.js backend/src/controllers/authController.js backend/src/routes/authRoutes.js backend/package.json backend/package-lock.json backend/src/index.js
git commit -m "feat(auth): flujo OIDC con state+PKCE para Google y Microsoft"
```

---

### Task 5: Endpoint completar-registro + bloqueo de login por contraseña para usuarios sociales

**Files:**
- Modify: `backend/src/controllers/oauthController.js` (agregar `completarRegistro`)
- Modify: `backend/src/routes/authRoutes.js` (ruta POST)
- Modify: `backend/src/controllers/authController.js` (función `login`, rechazo de usuarios sin password)
- Create: `backend/src/services/oauthService.test.js`

**Interfaces:**
- Consumes: `verificarTokenOnboarding` (Task 4), `crearSuscripcionEsencial` de `config/planes`, `sesionService` (Task 4).
- Produces: `POST /api/auth/oauth/completar-registro` body `{ token, nombreClinica }` → 201 con `{ usuario, clinica, suscripcion }` + cookies de sesión.

- [ ] **Step 1: Agregar `completarRegistro` a `oauthController.js`**

```js
const sequelize = require('../config/database')
const Clinica = require('../models/Clinica')
const Suscripcion = require('../models/Suscripcion')
const { crearSuscripcionEsencial } = require('../config/planes')

const completarRegistro = async (req, res) => {
  try {
    const { token, nombreClinica } = req.body
    if (!token || !nombreClinica || !String(nombreClinica).trim()) {
      return res.status(400).json({ message: 'Token y nombre de la clinica son obligatorios' })
    }

    let datos
    try {
      datos = oauthService.verificarTokenOnboarding(token)
    } catch {
      return res.status(401).json({ message: 'El enlace de registro expiro, intenta de nuevo' })
    }

    const existente = await Usuario.findOne({ where: { email: datos.email }, sinTenant: true })
    if (existente) {
      return res.status(409).json({ message: 'Este correo ya esta registrado, inicia sesion' })
    }

    const resultado = await sequelize.transaction(async (transaction) => {
      const clinica = await Clinica.create(
        {
          nombre: String(nombreClinica).trim(),
          email: datos.email,
          password: 'oauth', // Clinica.password sigue NOT NULL; el acceso real es via Usuario
          nombreComercial: String(nombreClinica).trim(),
        },
        { transaction }
      )
      const usuario = await Usuario.create(
        {
          nombre: datos.nombre,
          email: datos.email,
          password: null,
          proveedorAuth: datos.proveedor,
          proveedorId: datos.proveedorId,
          rol: 'admin',
          clinicaId: clinica.id,
          activo: true,
        },
        { transaction }
      )
      const suscripcion = await Suscripcion.create(crearSuscripcionEsencial(clinica.id), { transaction })

      const payload = {
        id: usuario.id,
        clinicaId: clinica.id,
        rol: usuario.rol,
        rolesAdicionales: usuario.rolesAdicionales || [],
      }
      const accessToken = generarAccessToken(payload)
      const refreshToken = generarRefreshToken(payload)
      await guardarRefreshToken({
        token: refreshToken,
        clinicaId: clinica.id,
        usuarioId: usuario.id,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        transaction,
      })
      return { clinica, usuario, suscripcion, accessToken, refreshToken }
    })

    await registrarAuditoria({
      accion: 'REGISTRO_CLINICA',
      entidad: 'Clinica',
      entidadId: resultado.clinica.id,
      descripcion: `Nueva clinica registrada via ${datos.proveedor} ${datos.email}`,
      req,
      resultado: 'exitoso',
    })

    setAuthCookies(res, {
      accessToken: resultado.accessToken,
      refreshToken: resultado.refreshToken,
    })
    delete resultado.clinica.dataValues.password
    delete resultado.usuario.dataValues.password
    return res.status(201).json({
      message: 'Clinica registrada exitosamente',
      usuario: resultado.usuario,
      clinica: resultado.clinica,
      suscripcion: resultado.suscripcion,
    })
  } catch (error) {
    logger.error({ contexto: 'oauth-completar', mensaje: error.message })
    return res.status(500).json({ message: 'Error en servidor' })
  }
}
```

Exportarla en el `module.exports` del archivo (`module.exports = { iniciar, callback, completarRegistro }`).

- [ ] **Step 2: Ruta en `authRoutes.js`**

```js
router.post(
  '/oauth/completar-registro',
  limitadorAuth,
  [
    body('token').notEmpty().withMessage('Token requerido'),
    body('nombreClinica').trim().notEmpty().isLength({ max: 160 }).withMessage('El nombre de la clinica es obligatorio'),
    validar,
  ],
  oauthCompletarRegistro
)
```

(con `const { iniciar: oauthIniciar, callback: oauthCallback, completarRegistro: oauthCompletarRegistro } = require('../controllers/oauthController')`)

- [ ] **Step 3: Bloquear login por contraseña para usuarios sociales**

En `authController.js`, dentro de `login`, después de encontrar al usuario y **antes** de `bcrypt.compare` (línea ~416), agregar:

```js
    if (!usuario.password) {
      const proveedorNombre = usuario.proveedorAuth === 'microsoft' ? 'Microsoft' : 'Google'
      return res.status(400).json({
        message: `Esta cuenta usa inicio de sesion con ${proveedorNombre}. Usa el boton "Continuar con ${proveedorNombre}"`,
      })
    }
```

- [ ] **Step 4: Test unitario del token de onboarding**

Crear `backend/src/services/oauthService.test.js` (revisar el runner en `backend/package.json` scripts y seguir el patrón de tests existentes del backend):

```js
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto-test-32-caracteres-minimo!!'

const { generarTokenOnboarding, verificarTokenOnboarding } = require('./oauthService')

describe('token de onboarding OAuth', () => {
  it('genera y verifica un token valido', () => {
    const token = generarTokenOnboarding({ email: 'a@b.com', nombre: 'Ana', proveedor: 'google', proveedorId: 'sub123' })
    const payload = verificarTokenOnboarding(token)
    expect(payload.email).toBe('a@b.com')
    expect(payload.proposito).toBe('oauth_onboarding')
  })

  it('rechaza un JWT con otro proposito', () => {
    const jwt = require('jsonwebtoken')
    const ajeno = jwt.sign({ email: 'a@b.com' }, process.env.JWT_SECRET)
    expect(() => verificarTokenOnboarding(ajeno)).toThrow()
  })
})
```

Run: `cd backend && npm test`
Expected: PASS (y la suite existente sigue verde).

- [ ] **Step 5: Commit**

```bash
git add backend/src/controllers/oauthController.js backend/src/routes/authRoutes.js backend/src/controllers/authController.js backend/src/services/oauthService.test.js
git commit -m "feat(auth): completar registro social con nombre de clinica y bloqueo de login por password"
```

---

### Task 6: Frontend — RegistroDialog (modal) y eliminación de la página /registro

**Files:**
- Create: `frontend/src/features/auth/RegistroDialog.jsx`
- Create: `frontend/src/features/auth/BotonesSociales.jsx`
- Modify: `frontend/src/features/auth/authApi.js` (simplificar `registro`)
- Modify: `frontend/src/router/index.jsx` (quitar ruta `/registro`, redirect legado)
- Modify: `frontend/src/components/landing/LandingNav.jsx`, `frontend/src/components/shared/AuthShell.jsx`, `frontend/src/components/shared/PublicPageShell.jsx`, `frontend/src/pages/LandingPage.jsx`, `frontend/src/pages/PlanesPage.jsx`, `frontend/src/pages/LoginPage.jsx` (los links `to="/registro"` abren el modal)
- Delete: `frontend/src/pages/RegistroPage.jsx` (al final, cuando nada lo referencie)

**Interfaces:**
- Produces: `<RegistroDialog open onOpenChange>` — modal shadcn con `<BotonesSociales />` (2 botones que navegan a `${VITE_API_URL}/api/auth/oauth/google|microsoft` vía `window.location.assign`) + form RHF+Zod de 4 campos que llama `authApi.registro`.
- `BotonesSociales` acepta prop `contexto` (`'registro' | 'login'`) solo para el texto.

- [ ] **Step 1: Crear `BotonesSociales.jsx`**

```jsx
const API_URL = import.meta.env.VITE_API_URL

const PROVEEDORES = [
  { id: 'google', label: 'Google' },
  { id: 'microsoft', label: 'Microsoft' },
]

export default function BotonesSociales({ contexto = 'registro' }) {
  const accion = contexto === 'login' ? 'Continuar' : 'Registrarme'
  return (
    <div className="flex flex-col gap-2">
      {PROVEEDORES.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => window.location.assign(`${API_URL}/api/auth/oauth/${id}`)}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
        >
          <ProviderIcon id={id} />
          {accion} con {label}
        </button>
      ))}
    </div>
  )
}
```

Incluir en el mismo archivo un componente `ProviderIcon` con los SVG oficiales inline de Google (la "G" multicolor: paths azul #4285F4, verde #34A853, amarillo #FBBC05, rojo #EA4335) y Microsoft (4 cuadros: #F25022, #7FBA00, #00A4EF, #FFB900) a 18×18px — son los únicos colores externos permitidos por ser marcas de terceros.

- [ ] **Step 2: Crear `RegistroDialog.jsx`**

Modal con `Dialog/DialogContent/DialogHeader` de `@/components/ui/dialog`. Estructura: título "Crea tu cuenta", `<BotonesSociales />`, separador "o regístrate con tu correo", formulario RHF+Zod:

```jsx
const esquema = z.object({
  nombre: z.string().trim().min(1, 'El nombre de la clinica es requerido').max(160),
  nombreAdministrador: z.string().trim().min(1, 'Tu nombre es requerido').max(120),
  email: z.string().trim().email('Email invalido'),
  password: z
    .string()
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/,
      'Minimo 8 caracteres con mayuscula, minuscula, numero y caracter especial'
    ),
})
```

`onSubmit` llama `authApi.registro(data)`; en éxito, replicar el post-login exacto de `LoginPage` (revisar cómo LoginPage guarda usuario/clinica/suscripcion en `authStore` y navega a `/dashboard`). Errores del backend se muestran bajo el form. Reusar las clases de input de LoginPage para consistencia visual.

- [ ] **Step 3: Simplificar `authApi.registro`**

```js
  registro: async ({ nombre, nombreAdministrador, email, password }) => {
    const { data } = await api.post('/auth/registro', {
      nombre,
      nombreAdministrador,
      email,
      password,
    })
    return data
  },
```

- [ ] **Step 4: Reemplazar los links a `/registro`**

En cada archivo con `to="/registro"`: cambiar el `<Link>` por un botón que abra el modal. Patrón: el componente que contiene el CTA maneja `const [registroAbierto, setRegistroAbierto] = useState(false)` y renderiza `<RegistroDialog open={registroAbierto} onOpenChange={setRegistroAbierto} />`. En el router, cambiar la ruta `/registro` por `{ path: '/registro', element: <Navigate to="/login?registro=1" replace /> }` (links viejos/bookmarks no rompen) y en `LoginPage` abrir el modal automáticamente si `searchParams.get('registro') === '1'`.

- [ ] **Step 5: Borrar `RegistroPage.jsx` y su import lazy del router**

Run: `cd frontend && npm run build`
Expected: build verde sin referencias colgantes.

- [ ] **Step 6: Prueba manual del modal**

Run: `cd frontend && npm run dev` (+ backend corriendo). Verificar: landing → "Registrarme" abre modal; registro manual con 4 campos crea clínica y entra al dashboard; botones sociales redirigen (con flag off darán 404 del backend — esperado hasta Task 8).

- [ ] **Step 7: Commit**

```bash
git add -A frontend/src
git commit -m "feat(auth): modal de registro con botones sociales, elimina pagina /registro"
```

---

### Task 7: Frontend — CompletarRegistroPage y botones sociales en LoginPage

**Files:**
- Create: `frontend/src/pages/CompletarRegistroPage.jsx`
- Modify: `frontend/src/router/index.jsx` (ruta pública `/completar-registro`)
- Modify: `frontend/src/pages/LoginPage.jsx` (agregar `<BotonesSociales contexto="login" />` + manejo de `?error=oauth`)
- Modify: `frontend/src/features/auth/authApi.js` (método `completarRegistroOauth`)

**Interfaces:**
- Consumes: token en `window.location.hash` (`#token=...`) puesto por el callback (Task 4); `POST /api/auth/oauth/completar-registro` (Task 5).
- Produces: pantalla de un solo campo que crea la clínica y navega a `/dashboard`.

- [ ] **Step 1: `authApi.completarRegistroOauth`**

```js
  completarRegistroOauth: async ({ token, nombreClinica }) => {
    const { data } = await api.post('/auth/oauth/completar-registro', { token, nombreClinica })
    return data
  },
```

- [ ] **Step 2: Crear `CompletarRegistroPage.jsx`**

Página pública minimal (usar `AuthShell` como Login para consistencia). Al montar: lee `token` del hash (`new URLSearchParams(window.location.hash.slice(1)).get('token')`) y lo guarda en estado; **limpia el hash** (`history.replaceState(null, '', window.location.pathname)`). Si no hay token → redirect a `/login`. Form de 1 campo "¿Cómo se llama tu clínica?" (Zod: `z.string().trim().min(1).max(160)`); submit llama `authApi.completarRegistroOauth({ token, nombreClinica })`, en éxito guarda usuario en authStore (mismo patrón post-login de LoginPage) y navega a `/dashboard`. Si el backend devuelve 401 (token expirado) mostrar mensaje "El enlace expiro, vuelve a intentarlo" con link a `/login`.

- [ ] **Step 3: Ruta en el router**

```jsx
const CompletarRegistroPage = lazy(() => import('@/pages/CompletarRegistroPage'))
// junto a /login:
{ path: '/completar-registro', element: <Suspense fallback={<Loader />}><CompletarRegistroPage /></Suspense> },
```

- [ ] **Step 4: LoginPage — botones y error**

Encima del formulario: `<BotonesSociales contexto="login" />` + separador "o". Si `searchParams.get('error') === 'oauth'`, mostrar alerta "No pudimos iniciar sesion con tu cuenta. Intenta de nuevo o usa tu correo y contrasena."

- [ ] **Step 5: Build y prueba manual**

Run: `cd frontend && npm run build` → verde. Manual: `/completar-registro` sin token redirige a login; `/login?error=oauth` muestra la alerta.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/CompletarRegistroPage.jsx frontend/src/pages/LoginPage.jsx frontend/src/router/index.jsx frontend/src/features/auth/authApi.js
git commit -m "feat(auth): pagina completar registro social y botones sociales en login"
```

---

### Task 8: Credenciales OAuth reales y prueba end-to-end

**Files:**
- Create: `docs/oauth-setup.md` (guía de configuración)
- Modify: `backend/.env` (credenciales reales, `OAUTH_ENABLED=true` — no se commitea)

**Interfaces:**
- Consumes: todo lo anterior.

- [ ] **Step 1: Guía `docs/oauth-setup.md`**

Documentar (para Roman y para producción en Render):
- **Google Cloud Console** → APIs & Services → Credentials → OAuth client ID (Web): authorized redirect URI `http://localhost:3000/api/auth/oauth/google/callback` (dev) y `https://api.bourgelat.co/api/auth/oauth/google/callback` (prod). Pantalla de consentimiento: External, scopes openid/email/profile.
- **Microsoft Entra admin center** → App registrations → New: supported account types "Accounts in any organizational directory and personal Microsoft accounts" (= tenant `common`); redirect URI Web `http://localhost:3000/api/auth/oauth/microsoft/callback`; crear client secret.
- Variables de entorno resultantes y dónde ponerlas en Render.

- [ ] **Step 2: Roman crea las credenciales** (bloqueante humano — pedirle los 4 valores y ponerlos en `backend/.env`, `OAUTH_ENABLED=true`).

- [ ] **Step 3: E2E manual con cuenta real**

Con backend+frontend corriendo:
1. Login social con cuenta Google NO registrada → pasa por "¿Cómo se llama tu clínica?" → dashboard. Verificar en BD: `usuarios."proveedorAuth"='google'`, `password IS NULL`, clínica y suscripción creadas.
2. Logout → "Continuar con Google" de nuevo → entra directo al dashboard (rama usuario existente).
3. Intentar login por contraseña con ese email → mensaje "usa Continuar con Google".
4. Repetir 1-2 con cuenta Microsoft.
5. Registro manual de 4 campos desde el modal → entra al dashboard.
6. Limpiar clínicas de prueba de la BD.

- [ ] **Step 4: Commit**

```bash
git add docs/oauth-setup.md
git commit -m "docs: guia de configuracion OAuth Google/Microsoft"
```

---

### Task 9: PR

- [ ] **Step 1:** `cd backend && npm test` y `cd frontend && npm run build && npm run lint` — todo verde.
- [ ] **Step 2:** `git push -u origin feature/registro-simplificado-oauth` y crear PR a `develop` con `gh pr create` resumiendo: modal de registro, 4 campos, OIDC Google/Microsoft, migración de usuarios, flag `OAUTH_ENABLED`.
- [ ] **Step 3:** Roman revisa y mergea (no auto-merge).

---

## Self-review

- **Cobertura del spec:** modal (T6), botones en login (T7), flujo social unificado (T4-T5), registro relajado (T2), migración+modelo (T1), flag+env+validación (T3), seguridad state/PKCE/email verificado/redirect fijo desde config (T4), creación diferida de usuario social (T5). El banner "completa el perfil de tu clínica" queda fuera de este plan: pertenece a la Fase 2 fiscal (Configuración) y el spec lo marca como no bloqueante.
- **Placeholders:** los pasos de UI (T6/T7) referencian patrones existentes de LoginPage en vez de duplicar código — intencional: el implementador debe copiar el estilo local real; cada paso indica archivo y comportamiento exacto.
- **Consistencia de tipos:** `generarTokenOnboarding({email,nombre,proveedor,proveedorId})` coincide entre T4 (produce) y T5 (consume); `sesionService` exporta las tres funciones usadas en T4-T5; `authApi.completarRegistroOauth({token,nombreClinica})` coincide con el body del endpoint de T5.
