# Bourgelat

Bourgelat es un SaaS de gestion veterinaria para clinicas que necesitan operar agenda, pacientes, historias clinicas, inventario, caja/facturacion, roles y reportes desde un flujo unico.

## Estructura

- `backend/`: API Node.js + Express + Sequelize/PostgreSQL.
- `frontend/`: React + Vite + Tailwind CSS.
- `docs/`: documentacion operativa de arquitectura, Render, Cloudflare, Docker local, roadmap y secretos.
- `render.yaml`: blueprint de Render para produccion y staging.
- `docker-compose.yml`: entorno local con frontend, backend y PostgreSQL.

## Entornos

- Produccion web: `https://bourgelat.co` y `https://app.bourgelat.co`
- Produccion API: `https://api.bourgelat.co`
- Staging web: `https://staging.bourgelat.co`
- Staging API: `https://api-staging.bourgelat.co`

## Comandos utiles

Backend:

```powershell
cd backend
npm test
npm run dev
```

Frontend:

```powershell
cd frontend
npm run lint
npm run build
npm run dev
```

Docker local:

```powershell
docker compose up --build
```

## Documentacion

- [Arquitectura](docs/architecture.md)
- [Piloto Render + Cloudflare](docs/render-cloudflare-pilot.md)
- [Checklist Render + Cloudflare](docs/render-cloudflare-checklist.md)
- [Produccion con Cloudflare](docs/production-cloudflare.md)
- [Docker local](docs/docker-local.md)
- [Roadmap](docs/roadmap.md)
- [Rotacion de secretos](docs/secrets-rotation.md)
