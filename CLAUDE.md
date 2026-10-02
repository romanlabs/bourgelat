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
- **PostgreSQL 18** en producción (Render) / 16 en Docker local + **Sequelize 6** (ORM, migraciones propias)
- **JWT** con access token (15min) + refresh token (7d) en httpOnly cookies
- **Winston** para logging
- Integración con **Factus.com.co** para facturación electrónica

### Infraestructura
- **Docker** + **Docker Compose** para desarrollo local (opcional, ver sección Desarrollo local)
- **Render.com** para despliegue (blueprint en `render.yaml`, debe permanecer en la raíz):
  `bourgelat-api` (Docker) + `bourgelat-frontend` (Static Site, sirve `bourgelat.co`
  y `app.bourgelat.co`) + `bourgelat-postgres`. Staging existe pero está suspendido.
  Ver `docs/render-reduccion-costos.md`
- **Blueprint primero, dashboard después**: para retirar un servicio, quitarlo de
  `render.yaml` y mergear a `main` ANTES de borrarlo en el dashboard; si no, el
  siguiente sync lo recrea y vuelve a cobrar
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
│       ├── services/        # factus, suscripcion, email, oauth, almacenamiento...
│       ├── scripts/         # Operación por CLI: superadmin, suscripciones, secretos
│       ├── utils/           # tenant.js, paginacion, busqueda, turnoCaja...
│       └── jobs/            # Limpieza de tokens y logs
│
├── frontend/
│   └── src/
│       ├── assets/          # Imágenes (auth/, landing/)
│       ├── components/
│       │   ├── layout/      # AdminShell, QuickCreateMenu
│       │   ├── shared/      # DataTable, EmptyState, ConfirmDialog, ECGHeartbeatCanvas...
│       │   └── ui/          # Shadcn components
│       ├── content/         # publicSiteContent.js (copy del sitio público)
│       ├── data/            # colombia.js (departamentos y municipios)
│       ├── features/        # Módulos por dominio (agenda, recepcion, pacientes, historias,
│       │                    #   inventario, inventarioClinico, servicios, caja, finanzas,
│       │                    #   configuracion, onboarding, perfil, estilos...) — cada uno
│       │                    #   con *Api.js + hooks + componentes
│       ├── lib/             # api.js, queryKeys.js, pdfComun.js, permissions.js, theme.js...
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

Identidad **«Papel y pulso»**: la calidez de la ficha de papel con la precisión
de la historia clínica. Los valores reales están en `frontend/src/index.css`
(`:root` y `.dark`) como variables HSL; Tailwind las expone en
`tailwind.config.cjs` y las escalas fijas viven en `theme.tokens.cjs`.

### Roles (no mezclarlos)
- **Tinta** (`foreground`, `sidebar`): estructura, es decir, texto, sidebar y botón secundario
- **Caramelo** (`brand`): la firma de marca. Pulso ECG, eyebrows, ítem activo del sidebar y foco. **Nunca un botón de acción**
- **Pino** (`primary`): acción y estado «saludable / confirmada»
- **Estados**: `success` · `warning` · `danger` · `info`, cada uno con su fondo `-soft`
  (`bg-danger-soft text-danger`, `border-warning/30`…). Usarlos en vez de las paletas
  crudas de Tailwind (`red-*`, `amber-*`, `emerald-*`, `cyan-*`…)

### Modo claro
| Token | Valor HSL | Uso |
|-------|-----------|-----|
| `--background` | `36 42% 95%` | Papel (`#f8f4ee`) |
| `--card` / `--popover` | `40 100% 99%` | Hoja (`#fffdf9`) |
| `--foreground` | `209 57% 15%` | Tinta (`#10263a`) |
| `--muted` / `--secondary` | `36 30% 91%` | Fondos apagados |
| `--muted-foreground` | `206 14% 41%` | Texto secundario (`#5a6b78`, 5:1) |
| `--border` / `--input` | `37 28% 85%` / `36 23% 79%` | Líneas |
| `--primary` | `160 60% 30%` | Pino (`#1f7a5c`, 5,3:1 con blanco) |
| `--brand` / `--brand-foreground` | `27 44% 48%` / `28 48% 36%` | Caramelo / caramelo para texto pequeño |
| `--ring` | `27 44% 48%` | Foco en caramelo |
| `--success` · `-soft` | `160 60% 30%` · `149 32% 93%` | Pino |
| `--warning` · `-soft` | `37 87% 30%` · `38 80% 92%` | Miel |
| `--danger` · `-soft` (= `--destructive`) | `8 59% 45%` · `13 63% 93%` | Ladrillo |
| `--info` · `-soft` | `200 51% 37%` · `199 42% 93%` | Petróleo |
| `--sidebar` | `207 55% 10%` | Noche (`#0b1a26`), activo en caramelo claro |

### Modo oscuro
Es la misma marca de noche: los mismos roles con valores más claros.
| Token | Valor HSL |
|-------|-----------|
| `--background` / `--card` | `207 48% 9%` / `206 42% 13%` |
| `--foreground` | `38 29% 89%` |
| `--primary` | `156 47% 57%` |
| `--brand` | `29 59% 64%` |
| `--success` · `--warning` · `--danger` · `--info` | `156 47% 57%` · `38 80% 62%` · `8 75% 68%` · `200 55% 65%` |

### Dónde se usa cada cosa
- **App y páginas de cuenta**: tokens del tema (siguen el modo oscuro).
- **Páginas públicas y de error** (legales, `/nosotros`): escalas fijas `papel-*`,
  `tinta-*`, `caramel-*`, `clinical-*`. Siempre en claro, como la landing.
- **Gráficas**: `chartColors` de `@/lib/theme` (hex fijos de `theme.tokens.cjs`,
  porque Recharts los pone como atributos SVG).
- **Landing y `/planes`**: todavía con hex propios (en la paleta, pero sin tokens).

`npm run lint:colores` (frontend) falla con colores sueltos fuera de los archivos
exentos; el workflow `Frontend` lo corre en cada PR. Código nuevo: solo tokens.

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
| Inventario (productos, servicios, movimientos, compras) | `/inventario` (pestañas) | `/api/inventario`, `/api/inventario-clinico`, `/api/servicios-clinicos`, `/api/facturas-compra` |
| Finanzas (venta, gastos/rentabilidad, turnos de caja) | `/finanzas` (pestañas) | `/api/facturas`, `/api/gastos`, `/api/caja`, `/api/reportes` |
| Exámenes de laboratorio | — (integrado en historias/pacientes) | `/api/examenes-laboratorio` |
| Estilos de historia clínica | — (integrado en configuración) | `/api/registros-estilo` |
| Usuarios | `/usuarios` | `/api/usuarios` |
| Perfil de usuario | `/perfil` | `/api/usuarios` |
| Configuración (incl. horario y bloqueos de agenda, logo) | `/configuracion` | `/api/clinica`, `/api/suscripciones`, `/api/consultorios`, `/api/bloqueos-agenda`, `/api/integraciones/facturacion` |
| Onboarding (wizard de registro) | `/onboarding` | `/api/clinica` |
| Auditoría | `/auditoria` | `/api/auditoria` |
| Soporte (tickets de clínicas) | `/soporte` | `/api/soporte` (el equipo responde con `npm run soporte:*`, ver `docs/soporte.md`) |
| Auth (incl. OAuth Google) | `/login`, `/registro` | `/api/auth` |
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
- Toda raíz de clave de React Query se registra en `lib/queryKeys.js`, agrupada por
  dominio de datos: así una mutación invalida también las pantallas de otros módulos
- PDFs (factura, fórmula) comparten encabezado y utilidades en `lib/pdfComun.js`
- Path aliases configurados: `@/` = `frontend/src/`
- Animaciones: usar `motion/react` (no `framer-motion` directamente)

### Backend
- Controladores delgados: lógica de negocio pesada va a `services/`
- Toda mutación pasa por `auditoriaMiddleware` — no saltárselo
- **Multi-tenancy**: toda query sobre modelos con `clinicaId` debe filtrar por tenant
  (helper `tenantWhere(req)` en `utils/tenant.js`). El `tenantGuard`
  (`config/tenantGuard.js`) rechaza en dev cualquier query sin ese filtro; las
  queries globales legítimas (auth, scripts, jobs) se marcan con `sinTenant: true`
- Validación de requests: `express-validator` en las rutas, no en los controladores
- Errores en producción: sanitizados por `sanitizeErrorResponseMiddleware`
- Variables de entorno: validadas al inicio en `validateRuntimeConfig.js`

### Git
- Ramas: `main` (producción) ← `develop` (integración) ← `<tipo>/descripcion`
  (`feat/`, `fix/`, `chore/`, `docs/`, `refactor/`)
- No push directo a `main` ni `develop`: rama → PR a `develop` → PR `develop` → `main`
- Prefijos de commit: `feat:`, `fix:`, `style:`, `refactor:`, `test:`, `chore:`, `docs:`,
  con scope opcional (`feat(historias):`)
- Detalle completo en `CONTRIBUTING.md`

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

## Operación de plataforma (sin panel web)

El panel superadmin web se retiró: nada con poder sobre todas las clínicas es
alcanzable por HTTP. El rol `superadmin` sigue en el ENUM de `Usuario`, pero la
operación se hace por CLI en el servidor (`backend/`):

```bash
npm run suscripcion:asignar  -- --email admin@clinica.com --plan activo
npm run suscripcion:cancelar -- --email admin@clinica.com --confirmar  # deja la clínica en solo lectura
npm run suscripcion:cortesia -- --email admin@clinica.com   # cortesía sin vencimiento
npm run create:superadmin
npm run cifrado:rotar
```
