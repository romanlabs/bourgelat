# Bourgelat — Guía para Claude

## ¿Qué es este proyecto?

**Bourgelat** es una plataforma SaaS de gestión para clínicas veterinarias colombianas.
Integra agenda, historias clínicas, inventario, facturación electrónica DIAN y reportes
en un solo sistema multi-tenant.

URLs de producción: `bourgelat.co` / `app.bourgelat.co` / `api.bourgelat.co`

Roadmap y planes de suscripción: ver `docs/roadmap.md` y `backend/src/config/planes.js`
(fuente de verdad del enforcement, no duplicar valores aquí).

---

## Stack tecnológico

### Frontend (`frontend/`)
- **React 19** + **Vite 8** + **React Router 7**
- **Tailwind CSS 3** con tokens de diseño en `theme.tokens.cjs`
- **Shadcn/ui** + **Radix UI** como librería de componentes
- **Zustand** para estado global (auth, tema)
- **TanStack React Query** para server state
- **React Hook Form** + **Zod** para formularios y validación
- **Motion** (`motion/react`) para animaciones
- **Recharts** para gráficas
- **Axios** con refresh automático de JWT (`frontend/src/lib/api.js`)
- Fuentes: **Geist Variable** (sans) + **Spectral** (display/serif)

### Backend (`backend/`)
- **Node.js** + **Express 5**
- **PostgreSQL 16** + **Sequelize 6** (ORM, migraciones propias)
- **JWT** con access token (15min) + refresh token (7d) en httpOnly cookies
- **Winston** para logging
- Integración con **Factus.com.co** para facturación electrónica

### Infraestructura
- **Docker** + **Docker Compose** para desarrollo local (opcional, ver sección Desarrollo local)
- **Render.com** para despliegue (blueprint en `render.yaml`, debe permanecer en la raíz)
- **Cloudflare** para DNS, SSL y WAF

---

## Estructura del proyecto

```
bourgelat/
├── backend/
│   └── src/
│       ├── config/          # DB, JWT, planes, factus, uploads
│       ├── controllers/     # Lógica de negocio (15+ módulos)
│       ├── middlewares/     # Auth, auditoría, rate limit, sanitización
│       ├── migrations/      # Migraciones Sequelize (runner propio)
│       ├── models/          # Modelos Sequelize
│       ├── routes/          # Enrutadores Express
│       ├── services/        # factusService, suscripcionService
│       └── jobs/            # Limpieza de tokens y logs
│
├── frontend/
│   └── src/
│       ├── assets/          # Imágenes (auth/, landing/)
│       ├── components/
│       │   ├── layout/      # AdminShell, SuperadminShell
│       │   ├── shared/      # DataTable, EmptyState, ConfirmDialog, ECGHeartbeatCanvas...
│       │   └── ui/          # Shadcn components
│       ├── content/         # publicSiteContent.js (copy del sitio público)
│       ├── data/            # colombia.js (departamentos y municipios)
│       ├── features/        # Módulos por dominio — cada uno con *Api.js + hooks + componentes
│       ├── lib/             # api.js, permissions.js, utils.js, theme.js
│       ├── pages/           # Páginas completas
│       ├── router/          # index.jsx con React Router v7
│       └── store/           # authStore.js, themeStore.js (Zustand)
│
├── docs/                    # Arquitectura, roadmap, despliegue, rotación de secretos
├── docker-compose.yml
└── render.yaml
```

---

## Paleta de colores y tokens de diseño

Los valores reales están en `frontend/src/index.css` como variables CSS HSL,
y se referencian en Tailwind vía `hsl(var(--nombre))`.

### Modo claro (light)
| Token | Valor HSL | Uso |
|-------|-----------|-----|
| `--background` | `214 49% 97%` | Fondo global (`#f4f7fb`) |
| `--foreground` | `210 55% 15%` | Texto principal (`#112739`) |
| `--primary` | `160 84% 39%` | Verde esmeralda — CTA, acciones primarias |
| `--primary-foreground` | `0 0% 100%` | Texto sobre primary |
| `--secondary` | `152 60% 94%` | Verde pálido — fondos suaves |
| `--accent` | `214 80% 95%` | Azul pálido — highlights |
| `--muted` | `214 30% 94%` | Fondos apagados |
| `--muted-foreground` | `210 20% 45%` | Texto secundario |
| `--border` | `208 35% 88%` | Bordes |
| `--sidebar` | `206 61% 18%` | Sidebar oscuro azul marino (`#082033`) |

### Modo oscuro (dark)
| Token | Valor HSL | Uso |
|-------|-----------|-----|
| `--background` | `222 84% 5%` | Fondo oscuro |
| `--primary` | `174 72% 56%` | Verde agua — en modo oscuro |
| `--sidebar` | `222 47% 11%` | Sidebar oscuro profundo |

### Colores de marca en la landing (hardcoded)
Usados directamente en `LandingPage.jsx` y componentes de marketing:
- `#06111c` — Hero fondo (azul noche muy oscuro)
- `#07131f` — Secciones oscuras
- `#10263a` — Texto principal oscuro
- `#f4f7fb` — Fondo claro general
- `#91e7e0` — Cyan menta — eyebrows y acentos en fondo oscuro
- `#effaf8` — Verde muy pálido — botón CTA claro
- `#3a6d87` — Azul petróleo — iconos y elementos secundarios
- `#51697d` — Gris azulado — texto de cuerpo

### Tipografía
- **Sans**: `Geist Variable` — UI y cuerpo
- **Display**: `Spectral` (serif, Google Fonts) — headings de impacto
- Los headings grandes usan `fontFamily: '"Spectral", Georgia, serif'` inline

---

## Módulos funcionales

| Módulo | Ruta frontend | Endpoint API |
|--------|--------------|-------------|
| Agenda | `/agenda` | `/api/citas` |
| Pacientes | `/pacientes` | `/api/mascotas`, `/api/propietarios` |
| Historias clínicas | `/historias` | `/api/historias` |
| Antecedentes | `/antecedentes` | `/api/antecedentes` |
| Inventario | `/inventario` | `/api/inventario` |
| Finanzas | `/finanzas` | `/api/facturas`, `/api/reportes` |
| Usuarios | `/usuarios` | `/api/usuarios` |
| Configuración | `/configuracion` | `/api/clinica`, `/api/suscripciones` |
| Auditoría | `/auditoria` | `/api/auditoria` |
| Superadmin | `/superadmin` | `/api/superadmin` |
| Auth | `/login`, `/registro` | `/api/auth` |
| Público | `/`, `/planes`, `/nosotros` | — |

---

## Modelos de datos principales

`Clinica → Usuario, Propietario, Suscripcion`
`Propietario → Mascota → Cita → HistoriaClinica`
`Producto → MovimientoInventario`
`Factura → FacturaItem`

Todos los modelos tienen `clinicaId` para aislamiento multi-tenant.
UUIDs como primary keys en la mayoría de tablas.

---

## Patrones y convenciones

### Frontend
- Estructura **feature-based**: cada dominio tiene su propio `*Api.js` + hooks + componentes
- El cliente HTTP vive en `frontend/src/lib/api.js` — no usar `fetch` directamente
- Estado de servidor: **React Query** (`useQuery`, `useMutation`)
- Estado global: **Zustand** solo para auth y tema
- Formularios: siempre **React Hook Form** + **Zod**
- Path aliases configurados: `@/` = `frontend/src/`
- Animaciones: usar `motion/react` (no `framer-motion` directamente)

### Backend
- Controladores delgados: lógica de negocio pesada va a `services/`
- Toda mutación pasa por `auditoriaMiddleware` — no saltárselo
- **Multi-tenancy**: toda query sobre modelos con `clinicaId` debe filtrar por tenant
  (helper `tenantWhere(req)` en `utils/tenant.js`). El `tenantGuard`
  (`config/tenantGuard.js`) rechaza en dev cualquier query sin ese filtro; las
  queries globales legítimas (auth, superadmin, jobs) se marcan con `sinTenant: true`
- Validación de requests: `express-validator` en las rutas, no en los controladores
- Errores en producción: sanitizados por `sanitizeErrorResponseMiddleware`
- Variables de entorno: validadas al inicio en `validateRuntimeConfig.js`

### Git
- Ramas: `main` (producción) ← `develop` (integración) ← `feature/*`
- No push directo a `main` ni `develop`
- Prefijos de commit: `feat:`, `fix:`, `style:`, `refactor:`, `test:`, `chore:`

---

## Desarrollo local

**PostgreSQL corre nativo en el equipo de Roman (puerto 5432), no vía Docker.**
Docker Compose es útil para replicar el stack completo o para otros colaboradores,
pero no es necesario levantarlo si Postgres ya está corriendo localmente.

```bash
# Opción A — solo lo necesario si Postgres ya corre nativo
cd backend && npm run dev    # → http://localhost:3000
cd frontend && npm run dev   # → http://localhost:5173

# Opción B — stack completo con Docker (postgres + backend + frontend)
docker compose up
```

Variables de entorno:
- `frontend/.env` → `VITE_API_URL=http://localhost:3000`
- `backend/.env` → copiar de `.env.production.example`

---

## Enforcement de planes de suscripción

Lógica en `backend/src/config/planes.js` y `services/suscripcionService.js`.
Los límites y precios vigentes se consultan ahí directamente (no se duplican en
este archivo para evitar que queden desactualizados).
