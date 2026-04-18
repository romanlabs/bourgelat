# Checklist Render + Cloudflare para Bourgelat

## 1. En Render
- Importar el repositorio con `render.yaml` para levantar produccion y staging desde el Blueprint.
- Crear un servicio `backend` desde Docker.
- Crear un servicio `frontend` desde Docker.
- Crear una base de datos PostgreSQL gestionada.
- Configurar variables desde `backend/.env.production.example`.
- Preparar `staging` con `backend/.env.staging.example` y `frontend/.env.staging.example`.
- Configurar `VITE_API_URL=https://api.bourgelat.co/api` en frontend.
- Desactivar `DB_SYNC` y `DB_ALTER`.
- Mantener `DB_RUN_MIGRATIONS=true`.
- Generar secretos nuevos con `npm run secrets:generate` en `backend`.
- Revisar los secretos generados automaticamente por Render para `JWT_SECRET`, `JWT_REFRESH_SECRET` e `INTEGRACIONES_SECRET`.

## 2. Variables clave del backend
- `NODE_ENV=production`
- `TRUST_PROXY=1`
- `DB_SSL_REJECT_UNAUTHORIZED=false` si Render Postgres reporta `self-signed certificate`
- `COOKIE_SECURE=true`
- `COOKIE_SAME_SITE=lax`
- `REQUIRE_ORIGIN_FOR_COOKIE_AUTH=true`
- `FRONTEND_URL=https://app.bourgelat.co`
- `FRONTEND_URLS=https://app.bourgelat.co,https://bourgelat.co`
- `PUBLIC_UPLOADS_BASE_URL=https://api.bourgelat.co/uploads`

## 3. DNS en Cloudflare
- `@` apuntando al frontend o landing
- `app` apuntando al frontend
- `api` apuntando al backend
- `staging` apuntando al staging cuando exista
- `api-staging` apuntando al backend de staging cuando exista

## 4. SSL y borde
- Activar `Universal SSL`
- Activar `DNSSEC`
- Usar `Full (strict)`

## 5. Seguridad Cloudflare
- Activar `WAF`
- Activar `Bot protection` si el plan lo permite
- Crear rate limiting para:
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/registro`

## 6. Acceso privado
- Proteger `staging.bourgelat.co` con `Cloudflare Access`
- Proteger `api-staging.bourgelat.co` con `Cloudflare Access` o limitarlo solo al frontend de staging
- No usar staging publico sin control

## 7. Antes de abrir al publico
- Rotar `JWT_SECRET`
- Rotar `JWT_REFRESH_SECRET`
- Rotar `INTEGRACIONES_SECRET`
- Revisar credenciales de Factus
- Confirmar backups del proveedor
- Confirmar que `/health` responde bien
- Probar login, refresh, logout y carga de modulos

## 8. Primer piloto
- Crear 1 clinica de prueba
- Probar usuarios y roles
- Probar flujo de pacientes
- Probar agenda
- Probar historias
- Probar finanzas
