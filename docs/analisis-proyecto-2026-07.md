# Análisis técnico del proyecto — Julio 2026

Diagnóstico integral de Bourgelat en cuatro dimensiones: **infraestructura y despliegue**,
**entorno de desarrollo**, **escalabilidad** y **buenas prácticas/arquitectura**, seguido de
un **plan de mejoras priorizado** (sección 6) que puede usarse como backlog.

Fecha del análisis: 2026-07-06 · Rama analizada: `main` (`426d7c8`)

---

## 1. Resumen ejecutivo

Bourgelat está en un estado **notablemente sólido en seguridad de backend** para un proyecto
de su etapa: rotación de refresh tokens con detección de reuso, cifrado AES-256-GCM de PII
con blind index, validación estricta de configuración al arranque, transacciones con
row-locks en facturación e idempotencia respaldada en base de datos. La infraestructura
declarativa (Render Blueprint con producción + staging) y la documentación operativa en
`docs/` también están por encima del promedio.

Las deudas principales se concentran en cuatro frentes:

| Frente | Deuda | Riesgo |
|---|---|---|
| Cifrado | Clave derivada de `JWT_SECRET`/`INTEGRACIONES_SECRET` sin versionado: rotar el secreto **dejaría indescifrable toda la PII cifrada** | 🔴 Alto |
| Multi-tenancy | Aislamiento por `clinicaId` repetido a mano en ~280 queries, sin red de seguridad en el ORM | 🔴 Alto |
| Calidad | Sin CI/CD, sin tests reales de backend, sin linter de backend | 🟡 Medio |
| Frontend | Bundles y multimedia pesados (chunk de 393 KB, video de 5.7 MB), páginas de 1000+ líneas | 🟡 Medio |

Ninguna de estas deudas es bloqueante hoy (una sola instancia, tráfico de piloto), pero las
dos primeras deben resolverse **antes** de rotar secretos o de que crezca el equipo, y la
tercera antes de escalar el ritmo de despliegues.

---

## 2. Infraestructura y despliegue

### Lo que está bien

- **Render Blueprint completo** (`render.yaml`): 4 servicios + 2 bases de datos cubriendo
  producción y staging, con dominios propios, `healthCheckPath: /health`, `buildFilter` por
  rutas (evita redeploys innecesarios), disco persistente de 10 GB para `/app/uploads` y
  secretos generados por Render (`generateValue: true`).
- **Dockerfiles separados dev/prod**. El de producción del frontend
  (`frontend/Dockerfile.prod`) es multi-stage con `nginx-unprivileged`; el del backend
  (`backend/Dockerfile.prod`) corre como `USER node` con `npm ci --omit=dev`.
- **docker-compose local** con healthcheck de Postgres y `depends_on: service_healthy` —
  `docker compose up` levanta el stack completo.
- **Migraciones con runner propio transaccional** (`backend/src/config/migrations.js`):
  tabla de control `schema_migrations`, cada migración en su propia transacción con
  rollback, ejecutables por CLI (`npm run migrate`) o al arranque (`DB_RUN_MIGRATIONS`).
- **Health check real** (`GET /health` hace `sequelize.authenticate()`, responde 503 si la
  DB no responde) y **validación de config al arranque** (`validateRuntimeConfig.js`) que
  aborta el boot si la configuración es insegura o incompleta.
- **Documentación operativa completa** en `docs/`: arquitectura, checklists de
  Render/Cloudflare, rotación de secretos, guía de piloto.

### Brechas

- **Sin CI/CD.** No existe `.github/workflows/` ni ningún pipeline. El único mecanismo es
  el auto-deploy de Render por commit: **nada ejecuta lint, tests ni build de verificación
  antes de llegar a producción**. Un commit roto en `main` se despliega directo.
- **Sin monitoreo ni alertas.** No hay Sentry, APM ni métricas; el único observable es
  `/health`. La documentación menciona "confirmar monitoreo" pero no está implementado.
- **Logs de Winston sin rotación ni persistencia** (`backend/src/utils/logger.js` escribe a
  `logs/errores.log` y `logs/actividad.log` sin límite de tamaño). En Render el disco
  persistente solo cubre `/app/uploads`, así que los archivos de log se pierden en cada
  deploy y mientras tanto crecen sin tope.
- **Jobs de limpieza vía `setInterval`** (`backend/src/index.js`): dependen del proceso
  vivo, no reintentan, y con N instancias se ejecutarían N veces. No hay cron real.
- **Discrepancia de configuración SSL**: `render.yaml` fija
  `DB_SSL_REJECT_UNAUTHORIZED: "true"` mientras `docs/` y los `.env.*.example` recomiendan
  `false` para el certificado self-signed de Render Postgres. Una de las dos fuentes está
  mal y puede causar un fallo de conexión en un redeploy desde blueprint.

---

## 3. Entorno de desarrollo

### Lo que está bien

- `docker compose up --build` levanta todo el stack con hot-reload (nodemon + Vite).
- `README.md` raíz y `CONTRIBUTING.md` claros; `.env.*.example` completos (~54 variables)
  y script `npm run secrets:generate` para generar secretos fuertes.
- **Frontend bien equipado**: ESLint 9 (flat config), Vitest 4 + Testing Library,
  Playwright para e2e, `rollup-plugin-visualizer` para análisis de bundle.
- `.gitignore` correcto: ningún `.env` real ni `dist/` versionados, sin secretos en el repo.

### Brechas

- **Backend sin linter ni framework de tests.** La única devDependency es `nodemon`. El
  script `npm test` ejecuta `src/config/smokeTest.js` (~10 asserts sobre parseo de config).
  Existen `src/config/app.test.js` y `cookies.test.js` pero **ningún runner los ejecuta**:
  son código muerto que da falsa sensación de cobertura.
- **Sin versión de Node declarada para dev local**: los Dockerfiles fijan `node:22-alpine`,
  pero no hay `.nvmrc` ni campo `engines` en ningún `package.json` — cada desarrollador
  puede estar en una versión distinta.
- **Sin normalización de formato**: no hay Prettier, `.editorconfig` ni configuración
  compartida de VS Code. El checklist de calidad de `CONTRIBUTING.md` es 100 % manual (no
  hay Husky/lint-staged que lo automatice en commits).
- **Sin package.json raíz**: el "monorepo" es solo convención de carpetas; fuera de Docker
  hay que orquestar `cd backend` / `cd frontend` a mano.
- Detalles menores: el script `analyze` del frontend es idéntico a `build` (no abre el
  visualizer), y el CLI `shadcn` está en `dependencies` de runtime cuando debería ser
  devDependency.

---

## 4. Escalabilidad

### Lo que está bien

- **Idempotencia respaldada en BD** (`idempotenciaMiddleware.js`, tabla
  `idempotencia_keys` con clave scoped por usuario+clínica) — funciona con N instancias.
- **Transacciones con row-locks en operaciones críticas**: `crearFactura`
  (`facturaController.js:407-611`) bloquea propietario/producto/turno con `LOCK.UPDATE`,
  verifica stock y actualiza caja de forma atómica.
- **Timeouts de BD defensivos** (`config/database.js`): `statement_timeout` e
  `idle_in_transaction_session_timeout` de 10 s.
- **Paginación con tope de 100** (`utils/paginacion.js`) y agregados en paralelo con
  `Promise.all` en los listados pesados.
- **Índices compuestos por tenant** en los modelos (ej. `Factura`: `[clinicaId, estado]`,
  `[clinicaId, fecha]`, único `[numero, clinicaId]`).

### Riesgos (backend)

- **Rate limiting en memoria** (`middlewares/rateLimitMiddleware.js` usa el `MemoryStore`
  por defecto de `express-rate-limit`). Con más de una instancia, el límite efectivo se
  multiplica por N y la protección anti fuerza bruta de `/api/auth` se diluye. Es la
  principal pieza de estado en memoria que rompe el escalado horizontal.
- **Pool de 20 conexiones por instancia** sin pgBouncer: 4-5 instancias podrían acercarse
  al límite de conexiones del plan de Postgres.
- **Jobs duplicados por instancia** (mismo hallazgo de la sección 2; los borrados son
  idempotentes, así que el impacto es menor, pero deberían ser un cron único).
- Menores: inserts uno a uno dentro del loop de `crearFactura` (mejorable con
  `bulkCreate`), y paginación aplicada en 10 de 17 controladores — auditar los restantes.

### Riesgos (frontend / peso)

- **Sin `manualChunks` en `vite.config.js`** (16 líneas, solo alias y visualizer). El chunk
  `dashboardComponents-*.js` pesa **393 KB** (Recharts entero) y el vendor 212 KB.
- **Multimedia sin optimizar en `public/`** (no pasa por Vite): `perroHero.mp4` **5.7 MB**,
  más 4 videos de 1.7–2.5 MB; `mano-tablet.png` 892 KB (existe `.webp` de 357 KB);
  `logos/escudo-colombia.svg` 439 KB sin minificar. Esto castiga directamente el LCP de la
  landing, que es el objetivo actual de rediseño.
- Punto a favor: **lazy loading completo de rutas** (`React.lazy` en las 20 páginas) y
  React Query con `staleTime` y `retry` bien configurados.

---

## 5. Buenas prácticas y arquitectura

### Lo que está bien (seguridad backend: punto más fuerte del proyecto)

- **Rotación de refresh tokens con detección de reuso** (`authController.js`): UPDATE
  atómico condicionado que cierra la race de doble canje; ante reuso revoca toda la familia
  de sesiones y audita `REFRESH_TOKEN_REUSE`. Implementación de nivel profesional.
- **Cifrado a nivel de campo** (`config/crypto.js` + `config/modelEncryption.js`):
  AES-256-GCM con hooks de Sequelize y **blind index HMAC** para campos buscables
  (`numeroDocumento`), aplicado a PII financiera.
- JWT con secretos separados (access 15 min / refresh 7 d), cookies httpOnly, bcrypt
  cost 12, bloqueo de cuenta por intentos fallidos con incremento atómico.
- Cadena de middlewares completa: helmet, hpp, CORS con allowlist, protección de Origin
  (CSRF), sanitización de errores 5xx en producción, y **express-validator con 268 usos**
  en las rutas.
- Frontend: cliente axios con **cola de refresh concurrente** (`lib/api.js` +
  `lib/authFlow.js`, este último con test unitario), error boundaries de app y de router.

### Problemas

- **Multi-tenancy aislado a mano.** No hay `defaultScope`, scope ni middleware de tenant:
  el filtro `clinicaId` se repite manualmente en **~280 queries de 17 controladores**. Un
  solo `where` olvidado en un endpoint nuevo = fuga de datos entre clínicas. Es el riesgo
  arquitectónico más serio del backend.
- **Cifrado sin estrategia de rotación.** La clave se deriva de
  `INTEGRACIONES_SECRET || JWT_SECRET` (`crypto.js:4`) y el ciphertext no lleva versión de
  clave: **rotar esos secretos (como indica `docs/secrets-rotation.md`) volvería
  indescifrable la PII ya cifrada**. Además `descifrarCampo`
  (`modelEncryption.js:19-26`) traga excepciones y devuelve el valor crudo, enmascarando
  corrupción o manipulación.
- **Controladores gordos, services casi vacío.** `facturaController.js` tiene ~1180 líneas
  con validación, locks, stock, caja y facturación electrónica dentro del handler HTTP;
  `services/` solo tiene 2 archivos. Contradice la propia convención del proyecto
  ("controladores delgados") y hace intesteable la lógica de negocio.
- **Patrón feature-based aplicado de forma dispareja en el frontend.** Features como
  `caja/`, `finanzas/` e `inventario/` están bien modularizadas (API + hooks +
  componentes), pero `usuarios/`, `configuracion/`, `superadmin/` y `antecedentes/` son
  solo un archivo API y toda su UI vive inflada en la página:
  `DashboardPage.jsx` 1539 líneas, `ConfiguracionPage.jsx` 1397, `AgendaPage.jsx` 1209,
  `UsuariosPage.jsx` 1068.
- Menores: sin `models/index.js` central (asociaciones dispersas por archivo de modelo),
  auditoría invocada manualmente por acción (fácil de olvidar en endpoints nuevos),
  try/catch repetido en cada handler en lugar de aprovechar el manejo async de Express 5.

---

## 6. Plan de mejoras priorizado

Prioridad: **P0** = riesgo de negocio/seguridad, atender primero · **P1** = calidad y
operación · **P2** = escalabilidad (precondiciones de crecimiento) · **P3** = DX y deuda.
Esfuerzo: **S** < 1 día · **M** 1–3 días · **L** > 3 días.

| # | P | Mejora | Esfuerzo | Impacto |
|---|---|--------|----------|---------|
| 1 | P0 | Versionado de clave de cifrado + rotación segura | M | Evita pérdida irreversible de PII |
| 2 | P0 | Scope/helper obligatorio de `clinicaId` | M | Cierra riesgo de fuga cross-tenant |
| 3 | P0 | CI mínimo en GitHub Actions | S | Gate de calidad antes de cada deploy |
| 4 | P1 | Tests reales de backend (auth y facturación) | L | Protege los flujos más críticos |
| 5 | P1 | Sentry en backend + frontend | S | Visibilidad de errores en producción |
| 6 | P1 | Logs a stdout / rotación de Winston | S | Logs útiles y sin crecimiento sin tope |
| 7 | P1 | Resolver discrepancia `DB_SSL_REJECT_UNAUTHORIZED` | S | Elimina fallo latente de deploy |
| 8 | P2 | Rate-limit store compartido (Redis) | M | Precondición para >1 instancia |
| 9 | P2 | Jobs de limpieza como Render Cron Job | S | Ejecución única y confiable |
| 10 | P2 | `manualChunks` + comprimir multimedia de `public/` | M | Mejora LCP de landing y dashboard |
| 11 | P3 | `.nvmrc` + `engines` + Prettier + `.editorconfig` + hooks | S | Consistencia de entorno y formato |
| 12 | P3 | Extraer lógica de `facturaController` a `services/` | L | Habilita tests y cumple la convención |
| 13 | P3 | Descomponer páginas 1000+ líneas hacia features | L | Homogeneiza el patrón feature-based |
| 14 | P3 | `package.json` raíz con workspaces (opcional) | M | Orquestación unificada de scripts |

### Detalle por ítem

**① Versionado de clave de cifrado** — Prefijar el ciphertext con un identificador de
versión de clave (`v1:iv:tag:contenido`) y mantener un mapa de claves históricas en
`config/crypto.js`, de modo que descifrar use la clave de la versión y cifrar siempre la
actual. Idealmente separar la clave de cifrado de los secretos JWT (variable
`ENCRYPTION_KEY` propia). Sin esto, la guía de `docs/secrets-rotation.md` es peligrosa de
seguir. Aprovechar para que `descifrarCampo` (`modelEncryption.js`) registre en el log los
fallos de descifrado en lugar de tragarlos.

**② Aislamiento multi-tenant a nivel de ORM** — Añadir una red de seguridad para
`clinicaId`: helper `scopedWhere(req)` obligatorio, o scopes de Sequelize por modelo
(`Modelo.scope({ method: ['tenant', clinicaId] })`) aplicados desde un middleware. Las 280
ocurrencias actuales funcionan; el objetivo es que el **próximo** endpoint no pueda
olvidarlo. Complementar con un test que verifique que cada ruta autenticada filtra por
tenant.

**③ CI mínimo** — Un workflow de GitHub Actions con dos jobs: frontend (`npm ci && npm run
lint && npm run test -- --run && npm run build`) y backend (`npm ci && npm test`, que
crecerá con el ítem ④). Al estar `main` protegida por PRs, el workflow como status check
obligatorio convierte el auto-deploy de Render en un deploy con gate.

**④ Tests de backend** — Adoptar `node:test` (cero dependencias) o Vitest, ejecutar los
tests huérfanos existentes (`app.test.js`, `cookies.test.js`) y priorizar: flujo de
refresh/reuso de tokens (`authController`), creación de factura con stock y caja
(`facturaController`), y enforcement de límites de plan (`suscripcionService`).

**⑤ Sentry** — SDK de Node en el error handler central de `index.js` y SDK de React en
`AppErrorBoundary.jsx` (que hoy solo hace `console.error`). Plan gratuito suficiente para
el volumen actual.

**⑥ Logs** — En Render lo idiomático es loguear solo a stdout (Render captura y retiene).
Alternativa: `winston-daily-rotate-file` con retención. Lo actual (archivos sin rotación en
disco efímero) es lo peor de ambos mundos.

**⑦ Discrepancia SSL** — Decidir el valor correcto de `DB_SSL_REJECT_UNAUTHORIZED` para
Render Postgres (con la CA interna de Render se puede usar `true` + `DB_SSL_CA`; sin CA
debe ser `false`) y alinear `render.yaml`, `.env.*.example` y `docs/`.

**⑧ Rate limit compartido** — `rate-limit-redis` + un Redis gestionado (Render Key Value).
No es urgente con una instancia; documentarlo como **precondición bloqueante** antes de
subir `numInstances` en `render.yaml`.

**⑨ Cron real** — Mover `limpiarTokensVencidos`, `limpiarLogsAntiguos` y
`limpiarIdempotencia` de `setInterval` a un Render Cron Job (`npm run limpieza` como
script) para ejecución única, con reintentos y visible en el dashboard.

**⑩ Peso del frontend** — En `vite.config.js`, `manualChunks` para aislar `recharts`,
`motion` y `zod` en chunks vendor cacheables. Comprimir los `.mp4` de `public/videos/`
(target < 1.5 MB, priorizar los `.webm` existentes con `<source>` y `poster`), eliminar el
PNG de 892 KB a favor del `.webp` existente, y minificar `escudo-colombia.svg` (439 KB →
svgo). Impacto directo en el LCP de la landing, objetivo actual del proyecto.

**⑪ Consistencia de entorno** — `.nvmrc` con `22` + campo `engines` en ambos
`package.json`, Prettier con config compartida, `.editorconfig`, y Husky + lint-staged para
automatizar el checklist de `CONTRIBUTING.md`. También: mover `shadcn` a devDependencies y
arreglar el script `analyze`.

**⑫ Services de facturación** — Extraer de `facturaController.js` (~1180 líneas) la
creación de factura, el decremento de stock y la integración con caja hacia
`services/facturaService.js`, dejando el controlador como capa HTTP. Es prerequisito
práctico para testear facturación (ítem ④).

**⑬ Descomposición de páginas** — Replicar el patrón de `features/caja/` (API + hooks +
componentes) en `usuarios/`, `configuracion/`, `superadmin/` y `antecedentes/`, moviendo la
UI desde las páginas monolíticas. Hacerlo de forma oportunista: al tocar una página por
otra razón, extraer primero.

**⑭ Workspaces (opcional)** — `package.json` raíz con npm workspaces para `npm run dev`
/ `npm test` unificados. Valor real solo si el equipo crece o se añade código compartido.

---

## Sugerencia de secuencia

1. **Semana 1 (quick wins):** ③ CI + ⑤ Sentry + ⑥ logs + ⑦ SSL + ⑪ entorno — todo esfuerzo S,
   sube el piso de calidad de inmediato.
2. **Semanas 2–3:** ① rotación de cifrado y ② scope de tenant — los dos riesgos P0 de fondo.
3. **Después, en paralelo con el roadmap de producto:** ④/⑫ (tests + services de
   facturación van juntos), ⑩ peso del frontend (encaja con el rediseño de landing en
   curso), y ⑧/⑨ cuando se planee escalar instancias.
