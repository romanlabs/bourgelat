# Arquitectura recomendada para Bourgelat

## Dominio y subdominios
- `bourgelat.co`: marketing y pagina principal
- `app.bourgelat.co`: aplicacion web
- `api.bourgelat.co`: backend/API
- `staging.bourgelat.co`: pruebas internas
- `api-staging.bourgelat.co`: backend/API de staging

## Recomendacion de hosting
### Opcion recomendada
- `Render`

### Por que
- Despliega Docker sin demasiada complejidad.
- Tiene PostgreSQL gestionado.
- Permite red interna entre app y base de datos.
- Facilita un primer despliegue serio sin meterte en AWS crudo.

## Recomendacion de Cloudflare
- Usar Cloudflare para todo lo posible en el borde:
- `DNS / Proxy`
- `Universal SSL`
- `DNSSEC`
- `WAF`
- `Rate limiting`
- `Cloudflare Access` para `staging`
- `Cloudflare Tunnel` si luego quieres ocultar el origen aun mas

## Modelo recomendado
- Frontend publicado en `app.bourgelat.co`
- Backend publicado en `api.bourgelat.co`
- Frontend de pruebas en `staging.bourgelat.co`
- Backend de pruebas en `api-staging.bourgelat.co`
- Base de datos gestionada fuera del contenedor
- Produccion con `Full (strict)` entre Cloudflare y el origen

## Orden recomendado de compra/configuracion
1. Mantener el dominio en Cloudflare
2. Comprar hosting en Render
3. Crear backend y frontend como servicios separados
4. Crear PostgreSQL gestionado
5. Configurar DNS de `app` y `api`
6. Activar SSL `Full (strict)`
7. Activar WAF y rate limiting
8. Proteger `staging` con Cloudflare Access

## Lo que NO recomiendo para empezar
- Kubernetes
- VPS autogestionado para Postgres
- Arquitectura multi-region
- Infraestructura compleja antes del piloto
