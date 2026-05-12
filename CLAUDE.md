# Bourgelat — Guía para Claude

## ¿Qué es este proyecto?

**Bourgelat** es una plataforma SaaS de gestión para clínicas veterinarias colombianas.
Integra agenda, historias clínicas, inventario, facturación electrónica DIAN y reportes
en un solo sistema multi-tenant.

URLs de producción: `bourgelat.co` / `app.bourgelat.co` / `api.bourgelat.co`

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
- **Docker** + **Docker Compose** para desarrollo local
- **Render.com** para despliegue (blueprint en `render.yaml`)
- **Cloudflare** para DNS, SSL y WAF

---

## Estructura del proyecto

```
bourgelat/
├── backend/
│   └── src/
│       ├── config/          # DB, JWT, planes, factus, uploads
│       ├── controllers/     # Lógica de negocio (15 módulos)
│       ├── middlewares/     # Auth, auditoría, rate limit, sanitización
│       ├── migrations/      # Migraciones Sequelize (runner propio)
│       ├── models/          # Modelos Sequelize (15 tablas)
│       ├── routes/          # Enrutadores Express (15 módulos)
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
│       ├── features/        # Módulos por dominio (12 features)
│       │   └── [dominio]/   # *Api.js + hooks + componentes por dominio
│       ├── lib/             # api.js, permissions.js, utils.js, theme.js
│       ├── pages/           # Páginas completas (19 rutas)
│       ├── router/          # index.jsx con React Router v7
│       └── store/           # authStore.js, themeStore.js (Zustand)
│
├── docs/                    # Arquitectura, despliegue, rotación de secretos
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
- Validación de requests: `express-validator` en las rutas, no en los controladores
- Errores en producción: sanitizados por `sanitizeErrorResponseMiddleware`
- Variables de entorno: validadas al inicio en `validateRuntimeConfig.js`

### Git
- Ramas: `main` (producción) ← `develop` (integración) ← `feature/*`
- No push directo a `main` ni `develop`
- Prefijos de commit: `feat:`, `fix:`, `style:`, `refactor:`, `test:`, `chore:`

---

## Desarrollo local

```bash
# Levantar todo (postgres + backend + frontend)
docker compose up

# Solo frontend
cd frontend && npm run dev   # → http://localhost:5173

# Solo backend
cd backend && npm run dev    # → http://localhost:3000
```

Variables de entorno:
- `frontend/.env` → `VITE_API_URL=http://localhost:3000`
- `backend/.env` → copiar de `.env.production.example`

---

## Planes de suscripción

| Plan | Precio | Usuarios | Mascotas |
|------|--------|----------|----------|
| Esencial | $0/mes | 2 | 250 |
| Clínica | $99k COP/mes | 5 | 2.500 |
| Profesional | $189k COP/mes | 12 | 10.000 |
| Personalizado | Cotización | ∞ | ∞ |

Lógica de enforcement en `backend/src/config/planes.js` y `services/suscripcionService.js`.

---

## Objetivo actual: Rediseño de Landing Page

### Visión
Transformar `frontend/src/pages/LandingPage.jsx` en una experiencia visual **inmersiva**
orientada a clínicas veterinarias colombianas. El objetivo es que el primer contacto
emocional sea tan fuerte como el argumento funcional del producto.

### Técnicas a implementar
- **Parallax** en secciones hero y de imágenes (profundidad entre capas a distintas velocidades)
- **Animaciones scroll-driven** — elementos que entran, se revelan o transforman al hacer scroll
  (usar CSS `@scroll-timeline` / `animation-timeline: scroll()` o hooks de Intersection Observer)
- **Assets Lottie** para personajes animados — escena principal: **perro corriendo hacia su dueña**
  (usar `lottie-react` o `@lottiefiles/react-lottie-player`)
- Mantener todas las **animaciones de Motion** existentes (`motion/react`)

### Restricciones de diseño
- **Paleta de colores**: respetar estrictamente los tokens y colores hardcoded actuales
  (ver sección "Paleta de colores" arriba — no introducir colores nuevos sin aprobación)
- **Tipografía**: Geist (sans) + Spectral (display) — sin cambios
- **Stack**: React + Vite + Tailwind — no agregar bundlers ni frameworks de animación ajenos
- **Performance**: las animaciones no deben degradar LCP ni CLS; usar `will-change` con cuidado
- **Responsive**: mobile-first, breakpoints `sm` / `lg` como en el diseño actual
- La landing es pública — no depende de auth ni React Query

### Secciones actuales a conservar (con rediseño visual)
1. `LandingNav` — navbar flotante con detección automática de tema (dark/light)
2. Hero — fondo oscuro `#06111c`, título en Spectral, ECG canvas animado
3. `HeroModuleMarquee` — marquee de módulos del producto
4. `#experiencia` — cards de propuesta de valor + imagen grande
5. `#flujo` — stepper animado del flujo diario
6. Sección de plataforma — 4 panels de producto
7. `#planes` — preview de precios
8. `#contacto` — CTA final
9. Footer

### Archivos clave para la landing
- `frontend/src/pages/LandingPage.jsx` — componente principal
- `frontend/src/components/shared/ECGHeartbeatCanvas.jsx` — animación canvas del hero
- `frontend/src/assets/landing/` — imágenes WebP actuales
- `frontend/src/content/publicSiteContent.js` — copy del sitio
- `frontend/src/index.css` — variables CSS y tokens globales
