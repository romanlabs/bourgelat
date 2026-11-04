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
│       └── jobs/            # Limpieza de tokens y logs; recordatorio de citas (cada minuto, tope 150/día); recordatorios de cobro (una vez al día, tope 30)
│
├── frontend/
│   └── src/
│       ├── assets/          # Imágenes (auth/, landing/)
│       ├── components/
│       │   ├── layout/      # AdminShell, QuickCreateMenu
│       │   ├── shared/      # DataTable, EmptyState, ConfirmDialog...
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

Paleta **«Petróleo y blanco»**. Los valores reales están en `frontend/src/index.css`
(`:root` y `.dark`) como variables HSL, y ese archivo manda; Tailwind las expone en
`tailwind.config.cjs`. La marca es petróleo y crema (favicon); la identidad definitiva
y el logo siguen pendientes.

### Roles (no mezclarlos)
- **Petróleo** (`primary`, `sidebar`): estructura y acción, es decir, menú, botones y encabezados
- **Blanco** (`card`): superficies de contenido, sobre el lienzo (`background`)
- **Ámbar** (`brand`): lo que pasa ahora, foco y detalles. **Nunca texto sobre blanco**; para texto, `brand-foreground`
- **Estados**: `success` · `warning` · `danger` · `info`, cada uno con su fondo `-soft`
  (`bg-danger-soft text-danger`). Usarlos en vez de las paletas crudas de Tailwind
  (`red-*`, `amber-*`, `emerald-*`, `cyan-*`…)
- Las superficies se separan por tono, no por bordes ni sombras

### Modo claro
| Token | Valor HSL | Uso |
|-------|-----------|-----|
| `--background` | `195 18% 96%` | Lienzo (`#f2f5f6`) |
| `--card` / `--popover` | `0 0% 100%` | Blanco |
| `--foreground` | `196 48% 12%` | Tinta (`#10262e`) |
| `--muted-foreground` | `196 15% 34%` | Texto secundario (`#4a5d64`) |
| `--secondary` | `194 28% 91%` | Botón secundario (`#e1ebee`) |
| `--accent` | `190 31% 93%` | Fila seleccionada (`#e6f0f2`) |
| `--border` / `--input` | `193 15% 89%` / `195 16% 85%` | Líneas |
| `--primary` / `--sidebar` | `192 72% 21%` | Petróleo (`#0f4c5c`, 9,5:1 con blanco) |
| `--brand` / `--ring` | `36 88% 59%` | Ámbar (`#f2a93b`) y foco |
| `--brand-foreground` | `37 88% 25%` | Ámbar para texto (`#7a4f08`) |
| `--success` · `-soft` | `154 46% 33%` · `149 37% 92%` | |
| `--warning` · `-soft` | `37 88% 27%` · `38 89% 92%` | |
| `--danger` · `-soft` (= `--destructive`) | `8 59% 44%` · `10 72% 94%` | |
| `--info` · `-soft` | `256 27% 33%` · `263 26% 92%` | |

### Modo oscuro
Los mismos roles con valores más claros.
| Token | Valor HSL |
|-------|-----------|
| `--background` / `--card` | `195 55% 9%` / `196 47% 13%` |
| `--foreground` | `195 22% 92%` |
| `--primary` | `190 44% 56%` |
| `--brand` | `37 86% 64%` |
| `--sidebar` | `192 56% 6%` |
| `--success` · `--warning` · `--danger` · `--info` | `150 52% 70%` · `38 86% 74%` · `9 80% 71%` · `252 50% 78%` |

### Dónde se usa cada cosa
- **App y páginas de cuenta**: tokens del tema (siguen el modo oscuro).
- **Páginas públicas** (`/nosotros`, vía `PublicPageShell`): todavía con escalas fijas
  `papel-*`, `tinta-*`, `caramel-*`, `clinical-*` de la identidad anterior.
- **Gráficas**: `chartColors` de `@/lib/theme` (hex fijos de `theme.tokens.cjs`,
  porque Recharts los pone como atributos SVG).
- **Landing**: todavía con hex propios.

`npm run lint:colores` (frontend) falla con colores sueltos fuera de los archivos
exentos; el workflow `Frontend` lo corre en cada PR. Código nuevo: solo tokens.

### Estados de pantalla
Sobrios, sin personajes ni decoración: la marca, una frase y una salida.
- **Pantalla completa**: `PantallaEstado`; errores que rompen la vista, `PantallaError`
  (nunca muestra el texto técnico; lo reporta aparte).
- **Consulta que falla**: `AvisoError` con Reintentar. **Lista vacía**: `EmptyState`,
  separando «todavía no hay» de «sin resultados». **Carga**: `Skeleton`; pantalla
  completa, `PantallaCarga`. **Confirmar**: `ConfirmDialog`, `destructive` solo si se
  pierde algo.
- Los textos cuentan lo que hacemos, pero solo lo que es cierto.

### Tipografía
- **Sans**: `Geist Variable`: toda la app
- **Display**: `Spectral` (serif, Google Fonts): solo landing y páginas públicas

---

## Módulos funcionales

| Módulo | Ruta frontend | Endpoint API |
|--------|--------------|-------------|
| Agenda | `/agenda` | `/api/citas` |
| Pacientes | `/pacientes` | `/api/mascotas`, `/api/propietarios` |
| Historias clínicas | `/historias` | `/api/historias` |
| Antecedentes | `/antecedentes` | `/api/antecedentes` |
| Inventario (productos, servicios, movimientos, compras) | `/inventario` (pestañas) | `/api/inventario`, `/api/inventario-clinico`, `/api/servicios-clinicos`, `/api/facturas-compra` |
| Finanzas (venta, gastos/rentabilidad, análisis del periodo, medios de pago, turnos de caja) | `/finanzas` (pestañas) | `/api/facturas`, `/api/gastos`, `/api/caja`, `/api/reportes` |
| Exámenes de laboratorio | — (integrado en historias/pacientes) | `/api/examenes-laboratorio` |
| Estilos de historia clínica | — (integrado en configuración) | `/api/registros-estilo` |
| Usuarios | `/usuarios` | `/api/usuarios` |
| Perfil de usuario | `/perfil` | `/api/usuarios` |
| Configuración (incl. horario y bloqueos de agenda, logo) | `/configuracion` | `/api/clinica`, `/api/suscripciones`, `/api/consultorios`, `/api/bloqueos-agenda`, `/api/integraciones/facturacion` |
| Onboarding (wizard de registro) | `/onboarding` | `/api/clinica` |
| Auditoría | `/auditoria` | `/api/auditoria` |
| Soporte (tickets de clínicas) | `/soporte` | `/api/soporte` (el equipo responde con `npm run soporte:*`, ver `docs/soporte.md`) |
| Auth (incl. OAuth Google) | `/login`, `/registro` | `/api/auth` |
| Público | `/`, `/nosotros` (`/planes` y `/pagar` redirigen: precios y pago solo en Mi plan, `/plan`) | — |

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
- `frontend/.env` → `VITE_API_URL=http://localhost:3000/api`
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
npm run cuenta:borrar -- --email prueba@clinica.com   # solo cuentas sin datos; sin --confirmar solo muestra
npm run cuenta:limpiar-no-verificadas -- --dias 7   # registros sin verificar y sin datos; sin --confirmar solo lista
npm run cobro:pendientes   # simula; --enviar los manda
npm run create:superadmin
npm run cifrado:rotar
```

El plan gratuito de Brevo (300 correos/día) lo comparten los códigos de verificación,
la recuperación de clave, los recordatorios de citas (tope de 150/día), los
recordatorios de cobro de suscripción (tope de 30 por ejecución, más el resumen a soporte@)
y las alertas de errores (tope de 10/día). Alertas y vigilancia: ver `docs/alertas.md`.
