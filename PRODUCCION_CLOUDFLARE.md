# Produccion Bourgelat con Cloudflare

## Subdominios recomendados
- `bourgelat.co`: landing principal
- `app.bourgelat.co`: frontend
- `api.bourgelat.co`: backend
- `staging.bourgelat.co`: pruebas internas
- `api-staging.bourgelat.co`: backend de pruebas

## Ajustes recomendados en Cloudflare
- Activar `DNSSEC`
- Usar `SSL/TLS` en modo `Full (strict)`
- Mantener `Universal SSL`
- Activar `WAF`
- Configurar reglas de rate limit para `/api/auth/*`
- Proteger `staging` con `Cloudflare Access`
- Proteger `api-staging` con `Cloudflare Access` o limitarlo al frontend de pruebas
- Si es posible, ocultar el origen con `Cloudflare Tunnel`

## Ajustes recomendados en Bourgelat
- `COOKIE_SECURE=true`
- `TRUST_PROXY=true`
- `FRONTEND_URLS=https://app.bourgelat.co,https://bourgelat.co`
- `PUBLIC_UPLOADS_BASE_URL=https://api.bourgelat.co/uploads`
- `DB_SYNC=false`
- `DB_ALTER=false`
- Rotar todos los secretos antes del primer despliegue real

## Antes del deploy
- Confirmar certificados validos en el origen
- Confirmar backups automaticos de base de datos
- Confirmar variables de entorno de produccion
- Confirmar monitoreo y alertas basicas
