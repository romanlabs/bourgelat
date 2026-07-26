# Login rediseñado, OAuth en popup y wizard de onboarding — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el login actual (video de fondo, paleta café/caramelo) por un diseño minimalista tipo Alegra; hacer que el login social con Google abra en ventana popup en vez de redirigir toda la pestaña; y mostrar un wizard de onboarding de 5 pasos justo después de crear una cuenta, guardando las respuestas en el usuario.

**Architecture:** Frontend React 19 + Vite + Tailwind + React Hook Form/Zod + React Query + Zustand (sin cambios de stack). Backend Express 5 + Sequelize sin cambios de stack; se agrega una columna JSONB a `usuarios` vía migración propia y un endpoint de auto-servicio (`PATCH /api/usuarios/onboarding`) siguiendo el mismo patrón que `PATCH /api/usuarios/me`.

**Tech Stack:** React 19, React Router 7, Tailwind CSS 3, React Hook Form + Zod, TanStack React Query, Zustand, Vitest; Node/Express 5, Sequelize 6 (migraciones propias en `backend/src/migrations/`), express-validator.

## Global Constraints

- Toda mutación de `usuarios` pasa por `auditoriaMiddleware` (ya lo hace `actualizarMiPerfil`; el nuevo endpoint debe seguir el mismo patrón).
- Multi-tenancy: cualquier query sobre `Usuario` debe usar `sinTenant: true` cuando sea auto-servicio del propio usuario autenticado (mismo patrón que `actualizarMiPerfil`/`obtenerUsuario`).
- Validación de requests con `express-validator` en las rutas, no en los controladores.
- No usar `fetch` directo en el frontend — todo pasa por `frontend/src/lib/api.js` (axios).
- Formularios nuevos: React Hook Form + Zod, siguiendo el patrón de `LoginPage.jsx`/`RegistroDialog.jsx`.
- Colores: usar los tokens CSS de `frontend/src/index.css` (`--primary`, `--foreground`, `--border`, `--muted-foreground`, etc.), no colores hardcoded nuevos.
- Prefijos de commit: `feat:`, `fix:`, `style:`, `refactor:`.
- No incluir atribución de Claude en commits (ver memoria de proyecto).

---

## Fase A — Rediseño visual del login

### Task 1: Componente `Logo` compartido

**Files:**
- Create: `frontend/src/components/shared/Logo.jsx`
- Test: `frontend/src/components/shared/Logo.test.jsx`

**Interfaces:**
- Consumes: nada (componente puro).
- Produces: `export default function Logo({ className })` — renderiza el ícono cuadrado (`Stethoscope` de `lucide-react` sobre fondo `bg-primary`) + el wordmark "Bourgelat", reutilizable en `LoginPage`, `RegistroDialog` y el futuro wizard.

- [ ] **Step 1: Escribir el test**

```jsx
// frontend/src/components/shared/Logo.test.jsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Logo from './Logo'

describe('Logo', () => {
  it('renderiza el wordmark Bourgelat', () => {
    render(<Logo />)
    expect(screen.getByText('Bourgelat')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd frontend && npx vitest run src/components/shared/Logo.test.jsx`
Expected: FAIL — `Cannot find module './Logo'`

- [ ] **Step 3: Implementar el componente**

```jsx
// frontend/src/components/shared/Logo.jsx
import { Stethoscope } from 'lucide-react'

export default function Logo({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Stethoscope className="h-4 w-4" />
      </span>
      <span className="text-lg font-semibold tracking-[-0.01em] text-foreground">
        Bourgelat
      </span>
    </span>
  )
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `cd frontend && npx vitest run src/components/shared/Logo.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/shared/Logo.jsx frontend/src/components/shared/Logo.test.jsx
git commit -m "feat(ui): componente Logo compartido para login y onboarding"
```

---

### Task 2: Rediseño de `LoginPage.jsx`

**Files:**
- Modify: `frontend/src/pages/LoginPage.jsx` (reemplazo completo)

**Interfaces:**
- Consumes: `Logo` de `@/components/shared/Logo` (Task 1); `useLogin` de `@/features/auth/useAuth`; `RegistroDialog` de `@/features/auth/RegistroDialog`; `BotonesSociales, { oauthHabilitado }` de `@/features/auth/BotonesSociales`.
- Produces: mismo default export `LoginPage`, misma lógica de formulario (schema Zod, `useForm`, `useLogin`), solo cambia el JSX/estilos. No cambia ninguna prop ni ruta.

- [ ] **Step 1: Reemplazar el archivo completo**

```jsx
// frontend/src/pages/LoginPage.jsx
import { useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Logo from '@/components/shared/Logo'
import { useLogin } from '@/features/auth/useAuth'
import RegistroDialog from '@/features/auth/RegistroDialog'
import BotonesSociales, { oauthHabilitado } from '@/features/auth/BotonesSociales'

const loginSchema = z.object({
  email: z.string().trim().email('Ingresa un correo válido'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
})

const normalizarEmail = (valor = '') => valor.trim().toLowerCase()

const inputClass =
  'h-11 w-full rounded-lg border border-input bg-background px-3 text-[15px] text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary'

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const { mutate: login, isPending } = useLogin()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [registroAbierto, setRegistroAbierto] = useState(
    () => searchParams.get('registro') === '1'
  )

  const handleRegistroOpenChange = (abierto) => {
    setRegistroAbierto(abierto)
    if (!abierto && searchParams.get('registro') === '1') {
      const next = new URLSearchParams(searchParams)
      next.delete('registro')
      setSearchParams(next, { replace: true })
    }
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onBlur',
  })

  useEffect(() => {
    reset({ email: '', password: '' })
  }, [location.key, location.state, reset])

  const emailField = register('email')
  const passwordField = register('password')

  const onSubmit = (data) => {
    login({ email: normalizarEmail(data.email), password: data.password })
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4 py-10">
      <Logo className="mb-8" />

      <div className="w-full max-w-[420px] rounded-2xl border border-border bg-card p-8 shadow-lg">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Inicia sesión en tu clínica
        </h1>

        {searchParams.get('error') === 'oauth' ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            No pudimos iniciar sesión con tu cuenta. Intenta de nuevo o usa tu correo y contraseña.
          </p>
        ) : null}

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" autoComplete="off">
          <input type="text" name="login-shadow-email" autoComplete="username" className="hidden" tabIndex={-1} />
          <input type="password" name="login-shadow-password" autoComplete="new-password" className="hidden" tabIndex={-1} />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Correo electrónico
            </label>
            <input
              {...emailField}
              type="email"
              autoComplete="off"
              autoCapitalize="none"
              inputMode="email"
              spellCheck={false}
              placeholder="tu@correo.com"
              className={`${inputClass} ${errors.email ? 'border-red-500' : ''}`}
            />
            {errors.email ? <p className="mt-1 text-sm text-red-600">{errors.email.message}</p> : null}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Contraseña
            </label>
            <div className="relative">
              <input
                {...passwordField}
                type={showPassword ? 'text' : 'password'}
                autoComplete="off"
                placeholder="Ingresa tu contraseña"
                className={`${inputClass} pr-10 ${errors.password ? 'border-red-500' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password ? <p className="mt-1 text-sm text-red-600">{errors.password.message}</p> : null}
            <div className="mt-2 text-right">
              <Link to="/recuperar-password" className="text-sm font-medium text-primary hover:underline">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isPending}
            className="h-11 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {isPending ? 'Ingresando...' : 'Entrar'}
          </Button>
        </form>

        {oauthHabilitado ? (
          <div className="mt-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">o</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <BotonesSociales contexto="login" />
          </div>
        ) : null}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          ¿Primera vez en Bourgelat?{' '}
          <button
            type="button"
            onClick={() => setRegistroAbierto(true)}
            className="font-semibold text-primary hover:underline"
          >
            Crear cuenta
          </button>
        </p>
      </div>

      <RegistroDialog open={registroAbierto} onOpenChange={handleRegistroOpenChange} />
    </div>
  )
}
```

- [ ] **Step 2: Verificar en navegador**

Con `frontend` y `backend` corriendo (`npm run dev` en ambos), abrir `http://localhost:5173/login`. Confirmar: fondo blanco, tarjeta centrada, sin video, inputs redondeados, botón verde. Probar login con un usuario existente y confirmar que sigue funcionando.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/LoginPage.jsx
git commit -m "style(auth): rediseño de login a layout minimalista tipo Alegra"
```

---

### Task 3: Restilizar `RegistroDialog.jsx`

**Files:**
- Modify: `frontend/src/features/auth/RegistroDialog.jsx`

**Interfaces:**
- Consumes: mismos hooks (`useRegistro`, `BotonesSociales`); no cambia contrato con `LoginPage` (`open`, `onOpenChange`).
- Produces: mismo default export, solo estilos.

- [ ] **Step 1: Reemplazar las clases de estilo (mantener toda la lógica de `useForm`/`onSubmit` intacta)**

Reemplazar en `RegistroDialog.jsx`:
- `const ACCENT = '#b07645'` → eliminar (ya no se usa).
- `inputClass` (línea 35-36) →
```jsx
const inputClass =
  'h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary'
```
- `labelClass` (línea 38) →
```jsx
const labelClass = 'mb-1.5 block text-sm font-medium text-foreground'
```
- `DialogContent` className (línea 79): reemplazar `rounded-none border-[#2b2018]/10 ... shadow-[...]` por `rounded-2xl border-border shadow-lg`.
- El bloque `DialogHeader` (líneas 80-96): quitar el `<p>` eyebrow con `ACCENT` y el `fontFamily: '"Spectral"...'` del `DialogTitle`; dejar `DialogTitle` como texto simple `text-xl font-semibold text-foreground`.
- El botón submit (línea 167-176): reemplazar clases por `rounded-lg bg-primary text-primary-foreground hover:bg-primary/90` y quitar el ícono `ArrowRight` si se quiere consistencia con el botón "Entrar" del login (opcional, no rompe nada si se deja).
- El divisor "o regístrate con tu correo" (líneas 101-106): cambiar `bg-[#2b2018]/12` → `bg-border`, `text-[#2b2018]/45` → `text-muted-foreground`.

- [ ] **Step 2: Verificar en navegador**

Abrir `http://localhost:5173/login?registro=1`, confirmar que el modal se ve con los mismos tokens verdes/redondeados que el login, y que crear una clínica nueva sigue funcionando.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/auth/RegistroDialog.jsx
git commit -m "style(auth): restilizar RegistroDialog para consistencia con el nuevo login"
```

---

## Fase B — OAuth en ventana popup

### Task 4: Botón de Google abre en popup con fallback a redirect

**Files:**
- Modify: `frontend/src/features/auth/BotonesSociales.jsx`

**Interfaces:**
- Consumes: nada nuevo.
- Produces: función `abrirPopupOauth(url)` interna; el click del botón usa `window.open` en vez de `window.location.assign`.

- [ ] **Step 1: Reemplazar el handler de click (línea 61)**

```jsx
// frontend/src/features/auth/BotonesSociales.jsx
// Reemplaza la línea: onClick={() => window.location.assign(`${API_URL}/auth/oauth/${id}`)}

const abrirPopupOauth = (url) => {
  const ancho = 500
  const alto = 650
  const left = window.screenX + (window.outerWidth - ancho) / 2
  const top = window.screenY + (window.outerHeight - alto) / 2
  const popup = window.open(
    url,
    'bourgelat-oauth',
    `width=${ancho},height=${alto},left=${left},top=${top}`
  )
  if (!popup) {
    // Popup bloqueado por el navegador: fallback al redirect completo de siempre
    window.location.assign(url)
  }
}
```

Y en el `onClick` del botón:

```jsx
onClick={() => abrirPopupOauth(`${API_URL}/auth/oauth/${id}`)}
```

- [ ] **Step 2: Verificar manualmente**

Con `VITE_OAUTH_ENABLED=true` en `frontend/.env` y OAuth configurado en backend, hacer click en "Continuar con Google" desde `/login` y confirmar que se abre una ventana nueva de ~500x650px en vez de navegar la pestaña actual. (El flujo completo de vuelta al login se verifica en el Task 6-7; por ahora solo se confirma que abre la ventana.)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/auth/BotonesSociales.jsx
git commit -m "feat(auth): abrir OAuth de Google en ventana popup con fallback a redirect"
```

---

### Task 5: Backend — callback OAuth redirige a página puente

**Files:**
- Modify: `backend/src/controllers/oauthController.js:85,95`

**Interfaces:**
- Consumes: `oauthConfig.frontendUrl` (ya existente).
- Produces: las dos redirecciones de éxito del callback ahora apuntan a `/oauth/popup-callback` en vez de `/dashboard` o `/completar-registro`.

- [ ] **Step 1: Cambiar la redirección de usuario existente (línea 85)**

Reemplazar:
```js
      return res.redirect(`${oauthConfig.frontendUrl}/dashboard`)
```
por:
```js
      return res.redirect(`${oauthConfig.frontendUrl}/oauth/popup-callback?estado=exito`)
```

- [ ] **Step 2: Cambiar la redirección de usuario nuevo (línea 95)**

Reemplazar:
```js
    return res.redirect(`${oauthConfig.frontendUrl}/completar-registro#token=${token}`)
```
por:
```js
    return res.redirect(`${oauthConfig.frontendUrl}/oauth/popup-callback?estado=nuevo#token=${token}`)
```

- [ ] **Step 3: Verificar que el archivo sigue exportando lo mismo**

Run: `cd backend && node -e "require('./src/controllers/oauthController.js'); console.log('OK')"`
Expected: `OK` (sin errores de sintaxis)

- [ ] **Step 4: Commit**

```bash
git add backend/src/controllers/oauthController.js
git commit -m "feat(auth): callback OAuth redirige a pagina puente para flujo popup"
```

---

### Task 6: Página puente `OAuthPopupCallbackPage`

**Files:**
- Create: `frontend/src/pages/OAuthPopupCallbackPage.jsx`
- Modify: `frontend/src/router/index.jsx`

**Interfaces:**
- Consumes: `useSearchParams` de react-router-dom; lee `window.location.hash` para el token.
- Produces: componente que al montar hace `window.opener.postMessage(...)` con `origin = window.location.origin` y luego `window.close()`. Mensajes: `{ tipo: 'oauth-exito' }` o `{ tipo: 'oauth-nuevo', token }`.

- [ ] **Step 1: Crear la página**

```jsx
// frontend/src/pages/OAuthPopupCallbackPage.jsx
import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

export default function OAuthPopupCallbackPage() {
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const estado = searchParams.get('estado')
    const origen = window.location.origin

    if (!window.opener) {
      // No se abrió como popup (ej. el navegador bloqueó window.open y se usó
      // el fallback de redirect completo): navegar directo en esta misma pestaña.
      if (estado === 'nuevo') {
        window.location.replace(`/completar-registro${window.location.hash}`)
      } else {
        window.location.replace('/dashboard')
      }
      return
    }

    if (estado === 'nuevo') {
      const token = new URLSearchParams(window.location.hash.replace('#', '?')).get('token')
      window.opener.postMessage({ tipo: 'oauth-nuevo', token }, origen)
    } else {
      window.opener.postMessage({ tipo: 'oauth-exito' }, origen)
    }
    window.close()
  }, [searchParams])

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  )
}
```

- [ ] **Step 2: Registrar la ruta**

En `frontend/src/router/index.jsx`, agregar el lazy import junto a los demás (después de la línea 9):

```jsx
const OAuthPopupCallbackPage = lazy(() => import('@/pages/OAuthPopupCallbackPage'))
```

Y dentro del grupo `PublicOnlyRoute` (después de la línea 80, junto a `/completar-registro`):

```jsx
{ path: '/oauth/popup-callback', element: <Suspense fallback={<Loader />}><OAuthPopupCallbackPage /></Suspense> },
```

- [ ] **Step 3: Verificar que el router sigue compilando**

Run: `cd frontend && npm run build`
Expected: build exitoso sin errores.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/OAuthPopupCallbackPage.jsx frontend/src/router/index.jsx
git commit -m "feat(auth): pagina puente para cerrar el popup de OAuth y notificar a la ventana principal"
```

---

### Task 7: `LoginPage` escucha el `postMessage` del popup

**Files:**
- Modify: `frontend/src/pages/LoginPage.jsx`
- Modify: `frontend/src/features/auth/authApi.js`
- Modify: `frontend/src/features/auth/useAuth.js`

**Interfaces:**
- Consumes: evento `message` del `window`; `authApi.me()` (ya existe) para obtener el usuario tras `oauth-exito`.
- Produces: en `LoginPage`, al recibir `oauth-nuevo`, se abre `RegistroDialog` en un modo especial que solo pide `nombreClinica` y llama a `useCompletarRegistroOauth` con el token recibido (reutiliza la mutación ya existente en `useAuth.js`).

- [ ] **Step 1: Agregar el listener en `LoginPage.jsx`**

Dentro del componente `LoginPage`, después de los demás `useState`, agregar:

```jsx
import { useNavigate } from 'react-router-dom'
import { useCompletarRegistroOauth } from '@/features/auth/useAuth'
```

(agregar `useNavigate` al import ya existente de `react-router-dom`, y el nuevo hook al import ya existente de `useAuth`).

```jsx
const navigate = useNavigate()
const [tokenOnboardingOauth, setTokenOnboardingOauth] = useState(null)
const { mutate: completarRegistroOauth, isPending: completandoOauth } = useCompletarRegistroOauth()

useEffect(() => {
  const handler = (event) => {
    if (event.origin !== window.location.origin) return
    if (event.data?.tipo === 'oauth-exito') {
      navigate('/dashboard', { replace: true })
    } else if (event.data?.tipo === 'oauth-nuevo' && event.data.token) {
      setTokenOnboardingOauth(event.data.token)
    }
  }
  window.addEventListener('message', handler)
  return () => window.removeEventListener('message', handler)
}, [navigate])
```

- [ ] **Step 2: Renderizar un formulario mínimo cuando hay `tokenOnboardingOauth`**

Agregar justo antes del `<RegistroDialog ... />` final:

```jsx
{tokenOnboardingOauth ? (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
    <div className="w-full max-w-[380px] rounded-2xl border border-border bg-card p-6 shadow-lg">
      <h2 className="text-lg font-semibold text-foreground">Un último paso</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        ¿Cómo se llama tu clínica?
      </p>
      <form
        className="mt-4 space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          const nombreClinica = new FormData(e.currentTarget).get('nombreClinica')
          completarRegistroOauth({ token: tokenOnboardingOauth, nombreClinica })
        }}
      >
        <input
          name="nombreClinica"
          type="text"
          required
          placeholder="Clínica Veterinaria Bourgelat"
          className={inputClass}
        />
        <Button type="submit" disabled={completandoOauth} className="h-11 w-full rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">
          {completandoOauth ? 'Creando cuenta...' : 'Continuar'}
        </Button>
      </form>
    </div>
  </div>
) : null}
```

- [ ] **Step 3: Verificar el flujo completo en navegador**

Con OAuth configurado, hacer login con Google en una cuenta nueva desde `/login`. Confirmar: se abre popup → completas el consentimiento de Google → el popup se cierra solo → aparece el modal "Un último paso" en la ventana principal → al enviar el nombre de la clínica, entra a `/dashboard`. Repetir con una cuenta que ya existe: confirmar que entra directo a `/dashboard` sin modal.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/LoginPage.jsx
git commit -m "feat(auth): LoginPage escucha postMessage del popup OAuth y completa el registro"
```

---

## Fase C — Wizard de onboarding

### Task 8: Migración — columna `onboarding` en `usuarios`

**Files:**
- Create: `backend/src/migrations/20260722_000001_add_onboarding_usuarios.js`
- Modify: `backend/src/models/Usuario.js`

**Interfaces:**
- Produces: columna `onboarding` (JSONB, nullable) en la tabla `usuarios`; campo `onboarding` en el modelo Sequelize `Usuario`.

- [ ] **Step 1: Crear la migración**

```js
// backend/src/migrations/20260722_000001_add_onboarding_usuarios.js
'use strict'

module.exports = {
  name: '20260722_000001_add_onboarding_usuarios',

  up: async ({ sequelize }) => {
    await sequelize.query(`
      ALTER TABLE usuarios
        ADD COLUMN IF NOT EXISTS onboarding JSONB;
    `)
  },

  down: async ({ sequelize }) => {
    await sequelize.query('ALTER TABLE usuarios DROP COLUMN IF EXISTS onboarding')
  },
}
```

- [ ] **Step 2: Agregar el campo al modelo `Usuario`**

En `backend/src/models/Usuario.js`, agregar después del campo `clinicaId` (antes del cierre `}, {`):

```js
  onboarding: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Respuestas del wizard de onboarding post-registro; null si no lo ha completado',
  },
```

- [ ] **Step 3: Correr la migración**

Run: `cd backend && npm run migrate`
Expected: log indicando que `20260722_000001_add_onboarding_usuarios` se aplicó correctamente.

- [ ] **Step 4: Verificar el estado de migraciones**

Run: `cd backend && npm run migrate:status`
Expected: la migración aparece como aplicada, sin pendientes nuevos.

- [ ] **Step 5: Commit**

```bash
git add backend/src/migrations/20260722_000001_add_onboarding_usuarios.js backend/src/models/Usuario.js
git commit -m "feat(auth): columna onboarding JSONB en usuarios para el wizard post-registro"
```

---

### Task 9: Backend — endpoint `PATCH /api/usuarios/onboarding`

**Files:**
- Modify: `backend/src/controllers/usuarioController.js`
- Modify: `backend/src/routes/usuarioRoutes.js`

**Interfaces:**
- Consumes: `Usuario` model (Task 8), `registrarAuditoria` de `../middlewares/auditoriaMiddleware`, `verificarToken` de `../middlewares/authMiddleware`, `validar` de `../middlewares/validacionMiddleware`.
- Produces: `guardarOnboarding(req, res)` exportado; responde `{ message, usuario }` donde `usuario` es `serializarPerfil(usuario)` (Task 9 agrega `onboarding` a ese serializador).

- [ ] **Step 1: Agregar `onboarding` a `serializarPerfil`**

En `backend/src/controllers/usuarioController.js`, dentro de `serializarPerfil` (línea 427-440), agregar después de `activo: usuario.activo,`:

```js
  onboarding: usuario.onboarding || null,
```

- [ ] **Step 2: Agregar el controlador `guardarOnboarding`**

Después de la función `actualizarMiPerfil` (después de la línea 513, antes de `subirFotoMiPerfil`):

```js
// Guarda las respuestas del wizard de onboarding post-registro (una sola vez,
// pero se permite sobreescribir si el usuario decide volver a completarlo).
const guardarOnboarding = async (req, res) => {
  try {
    const usuario = await Usuario.findOne({
      where: { id: req.usuario.id },
      sinTenant: true,
    })

    if (!usuario || !usuario.activo) {
      return res.status(404).json({ message: 'Usuario no encontrado' })
    }

    const respuestas = {
      usoPlanificado: normalizarTexto(req.body.usoPlanificado || ''),
      cargo: normalizarTexto(req.body.cargo || ''),
      whatsapp: req.body.whatsapp ? normalizarTelefono(req.body.whatsapp) : null,
      tipoClinica: normalizarTexto(req.body.tipoClinica || ''),
      tamanoEquipo: normalizarTexto(req.body.tamanoEquipo || ''),
      mascotasPorMes: normalizarTexto(req.body.mascotasPorMes || ''),
      objetivoInicial: normalizarTexto(req.body.objetivoInicial || ''),
      gestionActual: req.body.gestionActual ? normalizarTexto(req.body.gestionActual) : null,
      completadoEn: new Date().toISOString(),
    }

    await usuario.update({ onboarding: respuestas })

    await registrarAuditoria({
      accion: 'COMPLETAR_ONBOARDING',
      entidad: 'Usuario',
      entidadId: usuario.id,
      descripcion: `Onboarding completado por ${usuario.email}`,
      datosNuevos: respuestas,
      req,
      resultado: 'exitoso',
    })

    res.json({ message: 'Onboarding guardado', usuario: serializarPerfil(usuario) })
  } catch (error) {
    responderErrorInterno(res)
  }
}
```

- [ ] **Step 3: Exportar el controlador**

En el `module.exports` al final del archivo, agregar `guardarOnboarding`:

```js
module.exports = {
  crearUsuario,
  obtenerUsuarios,
  obtenerEquipoAgenda,
  obtenerUsuario,
  editarUsuario,
  toggleUsuario,
  actualizarMiPerfil,
  subirFotoMiPerfil,
  guardarOnboarding,
}
```

- [ ] **Step 4: Agregar la ruta**

En `backend/src/routes/usuarioRoutes.js`, agregar `guardarOnboarding` al import (línea 4-13) y registrar la ruta después de `POST /me/foto` (después de la línea 81):

```js
router.patch(
  '/onboarding',
  verificarToken,
  [
    body('usoPlanificado').trim().notEmpty().withMessage('Selecciona una opción').isLength({ max: 60 }),
    body('cargo').optional({ checkFalsy: true }).trim().isLength({ max: 120 }),
    body('whatsapp')
      .optional({ checkFalsy: true })
      .custom((value) => telefonoColombiaRegex.test(String(value).replace(/\D/g, '')))
      .withMessage('El WhatsApp debe tener 10 dígitos colombianos y comenzar por 3'),
    body('tipoClinica').trim().notEmpty().withMessage('Selecciona el tipo de clínica').isLength({ max: 60 }),
    body('tamanoEquipo').trim().notEmpty().withMessage('Selecciona el tamaño del equipo').isLength({ max: 30 }),
    body('mascotasPorMes').trim().notEmpty().withMessage('Selecciona un rango').isLength({ max: 30 }),
    body('objetivoInicial').trim().notEmpty().withMessage('Selecciona tu objetivo inicial').isLength({ max: 60 }),
    body('gestionActual').optional({ checkFalsy: true }).trim().isLength({ max: 60 }),
    validar,
  ],
  guardarOnboarding
)
```

Nota: no duplicar `passwordFuerteRegex`/`telefonoColombiaRegex`/`rolesValidos`, ya están definidos arriba en el archivo (líneas 19-22); reusarlos tal cual.

- [ ] **Step 5: Verificar manualmente con curl**

Con el backend corriendo y un token de sesión válido (login previo), correr:

```bash
curl -X PATCH http://localhost:3000/api/usuarios/onboarding \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"usoPlanificado":"dueno","tipoClinica":"general","tamanoEquipo":"2-5","mascotasPorMes":"50-150","objetivoInicial":"agenda"}'
```
Expected: `200` con `{ message: 'Onboarding guardado', usuario: { ..., onboarding: {...} } }`

- [ ] **Step 6: Commit**

```bash
git add backend/src/controllers/usuarioController.js backend/src/routes/usuarioRoutes.js
git commit -m "feat(auth): endpoint PATCH /api/usuarios/onboarding para guardar el wizard"
```

---

### Task 10: Frontend — API y hook del onboarding

**Files:**
- Create: `frontend/src/features/onboarding/onboardingApi.js`
- Create: `frontend/src/features/onboarding/useOnboarding.js`

**Interfaces:**
- Consumes: `api` de `@/lib/api`; `useAuthStore` de `@/store/authStore`.
- Produces: `onboardingApi.guardar(respuestas)` → `PATCH /usuarios/onboarding`; hook `useGuardarOnboarding()` que actualiza `usuario` en el store tras éxito.

- [ ] **Step 1: Crear `onboardingApi.js`**

```js
// frontend/src/features/onboarding/onboardingApi.js
import api from '@/lib/api'

export const onboardingApi = {
  guardar: async (respuestas) => {
    const { data } = await api.patch('/usuarios/onboarding', respuestas)
    return data
  },
}
```

- [ ] **Step 2: Crear `useOnboarding.js`**

```js
// frontend/src/features/onboarding/useOnboarding.js
import { useMutation } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { onboardingApi } from './onboardingApi'

export const useGuardarOnboarding = () => {
  const setUsuario = useAuthStore((s) => s.setUsuario)

  return useMutation({
    mutationFn: onboardingApi.guardar,
    onSuccess: (data) => {
      setUsuario(data.usuario)
    },
  })
}
```

- [ ] **Step 3: Verificar que compila**

Run: `cd frontend && npm run build`
Expected: build exitoso.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/onboarding/onboardingApi.js frontend/src/features/onboarding/useOnboarding.js
git commit -m "feat(onboarding): API y hook para guardar respuestas del wizard"
```

---

### Task 11: Frontend — página `OnboardingWizardPage` (5 pasos)

**Files:**
- Create: `frontend/src/pages/OnboardingWizardPage.jsx`
- Modify: `frontend/src/router/index.jsx`

**Interfaces:**
- Consumes: `useGuardarOnboarding` (Task 10); `useAuthStore` para leer `usuario`; `useNavigate` de react-router-dom.
- Produces: componente de página en la ruta `/onboarding`, con estado local de paso (`1..5`) y de respuestas; al finalizar llama `useGuardarOnboarding().mutate(respuestas)` y navega a `/dashboard`.

- [ ] **Step 1: Crear la página**

```jsx
// frontend/src/pages/OnboardingWizardPage.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from '@/components/shared/Logo'
import { useGuardarOnboarding } from '@/features/onboarding/useOnboarding'

const TOTAL_PASOS = 5

const OPCIONES_USO = [
  { valor: 'dueno', titulo: 'Soy dueño/administrador', subtitulo: 'Gestiono la clínica en general' },
  { valor: 'veterinario', titulo: 'Soy veterinario tratante', subtitulo: 'Atiendo pacientes directamente' },
  { valor: 'recepcion', titulo: 'Trabajo en recepción/administrativo', subtitulo: 'Agenda, caja y atención al público' },
]

const OPCIONES_TIPO_CLINICA = [
  { valor: 'general', label: 'Clínica general' },
  { valor: 'especializada', label: 'Especializada' },
  { valor: 'rural', label: 'Rural / equinos y ganado' },
  { valor: 'urgencias', label: 'Urgencias 24h' },
]

const OPCIONES_TAMANO_EQUIPO = ['Solo yo', '2-5', '6-15', '16-30', '+30']

const OPCIONES_MASCOTAS_MES = [
  { valor: '0-50', label: '0-50' },
  { valor: '50-150', label: '50-150' },
  { valor: '150-400', label: '150-400' },
  { valor: '+400', label: '+400' },
]

const OPCIONES_OBJETIVO = [
  { valor: 'agenda', label: 'Agenda y citas' },
  { valor: 'historias', label: 'Historias clínicas' },
  { valor: 'inventario', label: 'Inventario y farmacia' },
  { valor: 'finanzas', label: 'Facturación y finanzas' },
]

const OPCIONES_GESTION_ACTUAL = [
  { valor: 'cuadernos', label: 'Cuadernos o Excel' },
  { valor: 'otro-software', label: 'Otro software' },
  { valor: 'nada', label: 'Nada aún' },
]

export default function OnboardingWizardPage() {
  const navigate = useNavigate()
  const { mutate: guardar, isPending } = useGuardarOnboarding()
  const [paso, setPaso] = useState(1)
  const [respuestas, setRespuestas] = useState({
    usoPlanificado: '',
    cargo: '',
    whatsapp: '',
    tipoClinica: '',
    tamanoEquipo: '',
    mascotasPorMes: '',
    objetivoInicial: '',
    gestionActual: '',
  })

  const actualizar = (campo, valor) => setRespuestas((prev) => ({ ...prev, [campo]: valor }))

  const puedeAvanzar = {
    1: Boolean(respuestas.usoPlanificado),
    2: Boolean(respuestas.cargo),
    3: Boolean(respuestas.tipoClinica && respuestas.tamanoEquipo && respuestas.mascotasPorMes),
    4: Boolean(respuestas.objetivoInicial),
    5: true,
  }[paso]

  const siguiente = () => {
    if (paso < TOTAL_PASOS) {
      setPaso(paso + 1)
      return
    }
    guardar(respuestas, { onSuccess: () => navigate('/dashboard', { replace: true }) })
  }

  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-20">
        <Logo className="mb-8" />
        <div className="mb-2 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${(paso / TOTAL_PASOS) * 100}%` }}
            />
          </div>
          <span className="text-sm text-muted-foreground">{paso}/{TOTAL_PASOS}</span>
        </div>
        {paso > 1 ? (
          <button
            type="button"
            onClick={() => setPaso(paso - 1)}
            className="mb-4 text-left text-sm font-medium text-primary hover:underline"
          >
            ← Volver
          </button>
        ) : null}

        {paso === 1 ? (
          <div>
            <h1 className="text-2xl font-semibold text-foreground">¿Cómo planeas usar Bourgelat?</h1>
            <p className="mt-1 text-sm text-muted-foreground">Selecciona la opción que más se alinea a tu rol.</p>
            <div className="mt-6 space-y-3">
              {OPCIONES_USO.map((opcion) => (
                <button
                  key={opcion.valor}
                  type="button"
                  onClick={() => actualizar('usoPlanificado', opcion.valor)}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    respuestas.usoPlanificado === opcion.valor
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <p className="font-medium text-foreground">{opcion.titulo}</p>
                  <p className="text-sm text-muted-foreground">{opcion.subtitulo}</p>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {paso === 2 ? (
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Vamos a conocerte mejor</h1>
            <p className="mt-1 text-sm text-muted-foreground">Estos datos nos ayudan a personalizar tu experiencia.</p>
            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">¿Cuál es tu cargo?</label>
                <input
                  type="text"
                  value={respuestas.cargo}
                  onChange={(e) => actualizar('cargo', e.target.value)}
                  placeholder="Ej.: Directora médica"
                  className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">WhatsApp (opcional)</label>
                <input
                  type="tel"
                  value={respuestas.whatsapp}
                  onChange={(e) => actualizar('whatsapp', e.target.value)}
                  placeholder="Número de contacto"
                  className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        ) : null}

        {paso === 3 ? (
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Cuéntanos sobre tu clínica</h1>
            <p className="mt-1 text-sm text-muted-foreground">Estos detalles nos ayudan a adaptar Bourgelat a tu negocio.</p>
            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Tipo de clínica</label>
                <select
                  value={respuestas.tipoClinica}
                  onChange={(e) => actualizar('tipoClinica', e.target.value)}
                  className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="">Selecciona una opción</option>
                  {OPCIONES_TIPO_CLINICA.map((o) => (
                    <option key={o.valor} value={o.valor}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">¿Cuántas personas trabajan en tu clínica?</label>
                <div className="flex flex-wrap gap-2">
                  {OPCIONES_TAMANO_EQUIPO.map((opcion) => (
                    <button
                      key={opcion}
                      type="button"
                      onClick={() => actualizar('tamanoEquipo', opcion)}
                      className={`rounded-lg border px-4 py-2 text-sm transition ${
                        respuestas.tamanoEquipo === opcion
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border text-foreground hover:border-primary/40'
                      }`}
                    >
                      {opcion}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Mascotas atendidas al mes</label>
                <select
                  value={respuestas.mascotasPorMes}
                  onChange={(e) => actualizar('mascotasPorMes', e.target.value)}
                  className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="">Selecciona un rango</option>
                  {OPCIONES_MASCOTAS_MES.map((o) => (
                    <option key={o.valor} value={o.valor}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ) : null}

        {paso === 4 ? (
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Elige tu objetivo inicial</h1>
            <p className="mt-1 text-sm text-muted-foreground">Selecciona lo que quieres priorizar para empezar a usar Bourgelat.</p>
            <div className="mt-6 space-y-3">
              {OPCIONES_OBJETIVO.map((opcion) => (
                <button
                  key={opcion.valor}
                  type="button"
                  onClick={() => actualizar('objetivoInicial', opcion.valor)}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    respuestas.objetivoInicial === opcion.valor
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <p className="font-medium text-foreground">{opcion.label}</p>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {paso === 5 ? (
          <div>
            <h1 className="text-2xl font-semibold text-foreground">¡Solo un dato más!</h1>
            <p className="mt-1 text-sm text-muted-foreground">Con esta información definimos tus primeros pasos.</p>
            <div className="mt-6">
              <label className="mb-1.5 block text-sm font-medium text-foreground">¿Cómo gestionas tu clínica hoy? (opcional)</label>
              <select
                value={respuestas.gestionActual}
                onChange={(e) => actualizar('gestionActual', e.target.value)}
                className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="">Selecciona una opción</option>
                {OPCIONES_GESTION_ACTUAL.map((o) => (
                  <option key={o.valor} value={o.valor}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        ) : null}

        <button
          type="button"
          disabled={!puedeAvanzar || isPending}
          onClick={siguiente}
          className="mt-8 h-11 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {paso < TOTAL_PASOS ? 'Continuar' : isPending ? 'Guardando...' : 'Finalizar'}
        </button>
      </div>

      <div className="hidden bg-muted lg:block" aria-hidden="true" />
    </div>
  )
}
```

- [ ] **Step 2: Registrar la ruta como protegida**

En `frontend/src/router/index.jsx`, agregar el lazy import:

```jsx
const OnboardingWizardPage = lazy(() => import('@/pages/OnboardingWizardPage'))
```

Y agregarla dentro del grupo `ProtectedRoute` (junto a `/perfil`, línea 100):

```jsx
{ path: '/onboarding', element: <Suspense fallback={<Loader />}><OnboardingWizardPage /></Suspense> },
```

- [ ] **Step 3: Verificar en navegador**

Navegar manualmente a `http://localhost:5173/onboarding` estando autenticado. Completar los 5 pasos y confirmar que al finalizar hace `PATCH /api/usuarios/onboarding` (ver Network tab) y redirige a `/dashboard`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/OnboardingWizardPage.jsx frontend/src/router/index.jsx
git commit -m "feat(onboarding): wizard de 5 pasos post-registro"
```

---

### Task 12: Disparar el wizard automáticamente tras registrarse

**Files:**
- Modify: `frontend/src/features/auth/useAuth.js`

**Interfaces:**
- Consumes: `usuario.onboarding` (viene en la respuesta de `registro`/`completarRegistroOauth`, ya serializado por el backend gracias a Task 9-Step 1).
- Produces: `useRegistro` y `useCompletarRegistroOauth` navegan a `/onboarding` en vez de `/dashboard` cuando `data.usuario.onboarding` es `null`.

- [ ] **Step 1: Modificar `useRegistro` (líneas 36-55)**

Reemplazar:
```js
      toast.success('Clinica registrada exitosamente')
      navigate('/dashboard', { replace: true })
```
por:
```js
      toast.success('Clinica registrada exitosamente')
      navigate(data.usuario?.onboarding ? '/dashboard' : '/onboarding', { replace: true })
```

- [ ] **Step 2: Modificar `useCompletarRegistroOauth` (líneas 57-73)**

Reemplazar:
```js
      toast.success('Clinica registrada exitosamente')
      navigate('/dashboard', { replace: true })
```
por:
```js
      toast.success('Clinica registrada exitosamente')
      navigate(data.usuario?.onboarding ? '/dashboard' : '/onboarding', { replace: true })
```

- [ ] **Step 3: Verificar el flujo completo end-to-end**

Registrar una clínica nueva desde `/login?registro=1`: confirmar que redirige a `/onboarding` (no a `/dashboard`), completar el wizard, confirmar que llega a `/dashboard`. Repetir el flujo de registro por Google (Task 7) y confirmar el mismo comportamiento.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/auth/useAuth.js
git commit -m "feat(onboarding): redirigir a /onboarding tras un registro nuevo si no se ha completado"
```

---

## Self-Review

**Cobertura de la spec:**
- Sección 1 (rediseño visual del login) → Tasks 1-3. ✓
- Sección 2 (OAuth en popup) → Tasks 4-7. ✓
- Sección 3 (wizard de onboarding, 5 pasos, persistencia JSONB, endpoint) → Tasks 8-12. ✓
- "Fuera de alcance" (WhatsApp, dashboard checklist, página de planes) → no se tocan en este plan, consistente con la spec.

**Consistencia de tipos/nombres:** `onboarding` se usa igual en el modelo (Task 8), el serializador (Task 9), el hook (Task 10) y la lógica de redirección (Task 12). El endpoint `PATCH /usuarios/onboarding` se define en Task 9 y se consume igual en Task 10. Los mensajes `postMessage` (`oauth-exito`, `oauth-nuevo`) se definen en Task 6 y se consumen igual en Task 7.
