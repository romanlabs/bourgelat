# Docker local para Bourgelat

## Requisitos
- Docker Desktop instalado y encendido.

## Servicios
- `db`: PostgreSQL 16
- `backend`: API Node/Express
- `frontend`: Vite React

## Levantar el proyecto
```powershell
docker compose up --build
```

## URLs locales
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- Health check backend: `http://localhost:3000/health`

## Datos de base local
- Base: `bourgelat_db`
- Usuario: `postgres`
- Password: `postgres`
- Host desde Docker: `db`
- Host desde tu maquina: `localhost`

## Apagar servicios
```powershell
docker compose down
```

## Borrar volumenes y empezar limpio
```powershell
docker compose down -v
```

## Nota importante
`backend/.env` sigue siendo tu referencia principal, pero `docker-compose.yml` sobrescribe las variables de base de datos para que el backend use el contenedor `db`.
