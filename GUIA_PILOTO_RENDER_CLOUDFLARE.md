# Guia piloto Render + Cloudflare para Bourgelat

## Objetivo
- Publicar Bourgelat primero en `staging` para validar el flujo real.
- Despues promover a `bourgelat.co`, `app.bourgelat.co` y `api.bourgelat.co`.

## Orden recomendado
1. Subir `staging` en Render con el `render.yaml`.
2. Conectar `staging.bourgelat.co` y `api-staging.bourgelat.co` en Cloudflare.
3. Probar registro, login, refresh, pacientes, agenda, historias y finanzas.
4. Subir produccion en Render.
5. Conectar `bourgelat.co`, `app.bourgelat.co` y `api.bourgelat.co`.
6. Activar protecciones de Cloudflare.
7. Abrir a 1-3 clinicas piloto, no a trafico abierto.

## Render
- Importa el repositorio con el Blueprint de `render.yaml`.
- Verifica que queden creados estos servicios:
- `bourgelat-web`
- `bourgelat-api`
- `bourgelat-web-staging`
- `bourgelat-api-staging`
- `bourgelat-postgres`
- `bourgelat-postgres-staging`

## Variables importantes ya alineadas en el repo
- Frontend prod: `VITE_API_URL=https://api.bourgelat.co/api`
- Frontend staging: `VITE_API_URL=https://api-staging.bourgelat.co/api`
- Backend prod:
- `FRONTEND_URL=https://app.bourgelat.co`
- `FRONTEND_URLS=https://app.bourgelat.co,https://bourgelat.co`
- `PUBLIC_UPLOADS_BASE_URL=https://api.bourgelat.co/uploads`
- `TRUST_PROXY=true`
- `COOKIE_SECURE=true`
- `DB_SYNC=false`
- `DB_ALTER=false`
- Backend staging:
- `FRONTEND_URL=https://staging.bourgelat.co`
- `FRONTEND_URLS=https://staging.bourgelat.co`
- `PUBLIC_UPLOADS_BASE_URL=https://api-staging.bourgelat.co/uploads`

## Cloudflare DNS
- No inventes el target final del DNS.
- En cada servicio de Render agrega el dominio custom y copia el target que Render te entregue.
- Crea estos registros en Cloudflare usando el target de Render correspondiente:
- `@` -> servicio `bourgelat-web`
- `app` -> servicio `bourgelat-web`
- `api` -> servicio `bourgelat-api`
- `staging` -> servicio `bourgelat-web-staging`
- `api-staging` -> servicio `bourgelat-api-staging`
- Mantener proxy de Cloudflare activado cuando el certificado del origen ya este bien.

## SSL y seguridad en Cloudflare
- `SSL/TLS`: `Full (strict)`
- `Universal SSL`: activo
- `DNSSEC`: activo
- `WAF`: activo
- Rate limiting recomendado:
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/registro`
- Proteger staging con Cloudflare Access cuando termines la primera validacion interna.

## Checklist funcional antes de abrir piloto
- `https://api-staging.bourgelat.co/health` responde `ok`
- `https://staging.bourgelat.co` carga la landing
- Registro crea clinica, admin y suscripcion
- Login funciona con cookies
- Refresh funciona al expirar access token
- Se puede crear paciente
- Se puede crear cita
- Se puede abrir historia clinica
- Se puede emitir factura interna
- Si Factus sigue apagado, la UI no debe prometer DIAN operativa para esa clinica

## Checklist funcional antes de abrir produccion
- `https://api.bourgelat.co/health` responde `ok`
- `https://bourgelat.co` y `https://app.bourgelat.co` cargan bien
- Dominio canonico, sitemap y robots quedan accesibles
- Secretos rotados
- Un superadmin creado
- Una clinica de prueba validada de punta a punta
- Backups del proveedor confirmados

## Criterio de salida
- Si staging pasa el flujo completo con una clinica demo, ahi si promueves a produccion.
- Si algo falla en auth, cookies, CORS o subdominios, se corrige primero en staging.
