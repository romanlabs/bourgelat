# Plan de Desarrollo — Bourgelat
## Sprints: 17 Abril → 31 Mayo 2026

**Equipo:** Sergio · Roman (rotación libre de tareas — cualquiera toma backend o frontend)
**Stack:** Node.js + Express · React + Vite · PostgreSQL + Sequelize
**Infraestructura:** Render (backend + DB) + Cloudflare (frontend/CDN) — ya en producción
**Objetivo:** Entregar los 4 módulos core funcionales + pasarela de pago Wompi

---

## Cómo trabajamos juntos (Git Workflow)

Este es el punto más crítico del plan. El proyecto ya está en producción, por lo que **ningún commit debe llegar a `main` sin haber pasado por revisión**.

### Estructura de ramas

```
main          ← producción (Render lo despliega automáticamente)
  └── develop ← integración (staging, pruebas antes de subir a prod)
        └── feature/nombre-tarea  ← donde trabaja cada uno
```

### Regla de oro
**Nunca hacer push directo a `main` ni a `develop`.**  
Todo cambio entra por una rama `feature/` → Pull Request → revisión del otro → merge.

---

### Flujo diario paso a paso

#### 1. Antes de empezar una tarea nueva
```bash
# Asegurarse de tener develop actualizado
git checkout develop
git pull origin develop

# Crear rama para la tarea
git checkout -b feature/inventario-fix-stock
```

El nombre de la rama debe describir la tarea:
- `feature/inventario-fix-stock`
- `feature/historial-crear-historia`
- `feature/facturas-calculo-iva`
- `feature/wompi-checkout`

#### 2. Mientras trabajan
```bash
# Commits pequeños y frecuentes (no acumular 3 días de cambios en uno)
git add .
git commit -m "fix: corregir cálculo de stock tras movimiento de salida"

# Si develop avanzó mientras trabajabas, sincronizar
git fetch origin
git rebase origin/develop
```

#### 3. Cuando la tarea está lista
```bash
# Subir la rama al repositorio
git push origin feature/inventario-fix-stock
```
Luego abrir un **Pull Request** de `feature/inventario-fix-stock` → `develop`.

#### 4. Revisión entre los dos
- El otro revisa el PR (no quien lo hizo)
- Si está bien → merge a `develop`
- Si hay algo que corregir → comentar en el PR, corregir en la misma rama, volver a hacer push

#### 5. Subir a producción (fin de sprint o cuando algo urgente está listo)
```bash
# Solo cuando develop está estable y probado
git checkout main
git pull origin main
git merge develop
git push origin main
# Render despliega automáticamente
```

---

### Protección de ramas (configurar en GitHub/GitLab)

En la configuración del repositorio, activar estas reglas para `main`:

| Regla | Valor |
|-------|-------|
| Require pull request before merging | ✅ Activado |
| Require approvals | 1 (el otro dev aprueba) |
| Dismiss stale pull request approvals | ✅ Activado |
| Do not allow bypassing the above settings | ✅ Activado |

Y para `develop`:
- Require pull request before merging: ✅
- Approvals: 1

Esto hace **imposible** hacer push directo a producción accidentalmente.

---

### Cómo evitar conflictos entre los dos

1. **Al inicio del sprint**, repartir las tareas para que cada uno trabaje en archivos distintos en lo posible
2. **Comunicar** cuando van a tocar un archivo compartido (ej: `FinanzasPage.jsx`)
3. **Commits frecuentes** — no dejar trabajo sin commitear al final del día
4. **Rebase sobre develop** antes de abrir el PR (no merge, para mantener historia limpia)
5. Si hay conflicto al hacer rebase:
   ```bash
   git rebase origin/develop
   # Si hay conflictos, resolverlos archivo por archivo
   git add archivo-resuelto.js
   git rebase --continue
   ```

---

### Estructura de mensajes de commit

Usar prefijos consistentes para que el historial sea legible:

```
feat:  nueva funcionalidad
fix:   corrección de bug
style: cambios visuales / CSS (no lógica)
refactor: refactorización sin cambio de comportamiento
test:  agregar o corregir tests
chore: tareas de mantenimiento (mover archivos, actualizar deps)
```

Ejemplos:
```
feat: agregar alerta visual de stock bajo en inventario
fix: corregir cálculo de IVA en factura con múltiples ítems
fix: historial clínico no filtraba por clinicaId
feat: integrar Wompi checkout para pago de suscripciones
chore: mover factusService.js a carpeta services/
```

---

### Entornos

| Entorno | Rama | URL | Cuándo usar |
|---------|------|-----|-------------|
| Local | cualquier rama | localhost:5173 | desarrollo diario |
| Producción | `main` | app.bourgelat.co | solo merges revisados desde develop |

> Render despliega automáticamente cuando hay push a `main`. Por eso la protección de esa rama es crítica.

---

## Pre-Sprint — Limpieza inicial
**Duración estimada:** ½ día
**Rama:** `feature/pre-sprint-cleanup`

### Tareas
- [ ] Mover `backend/src/factusService.js` → `backend/src/services/factusService.js`
- [ ] Actualizar el import en `backend/src/controllers/integracionFacturacionController.js`
- [ ] Verificar que `.env` local tenga todas las variables de `.env.production.example`
- [ ] Confirmar que Docker local levanta sin errores: `docker compose up`
- [ ] Crear rama `develop` en el repositorio si no existe
- [ ] Configurar protección de ramas `main` y `develop` en GitHub/GitLab

### Resultado esperado
Docker levanta los 3 servicios (db, backend, frontend) sin errores, `http://localhost:5173` accesible, y el repositorio tiene las ramas protegidas.

---

## Sprint 1 — Inventario + Historial por mascota
**Fechas:** 17 Abril → 30 Abril
**Objetivo:** Ambos módulos funcionando de punta a punta sin errores conocidos

### Reparto de tareas (rotar libremente, esto es una sugerencia)

| Tarea | Rama sugerida | Quién |
|-------|--------------|-------|
| Fix backend inventario | `feature/inventario-backend` | Sergio o Roman |
| Fix frontend inventario | `feature/inventario-frontend` | Sergio o Roman |
| Fix backend historial | `feature/historial-backend` | Sergio o Roman |
| Fix frontend historial | `feature/historial-frontend` | Sergio o Roman |

---

### Módulo: Inventario

#### Archivos a intervenir

| Archivo | Capa |
|---------|------|
| `backend/src/controllers/inventarioController.js` | Backend |
| `backend/src/models/Producto.js` | Backend |
| `backend/src/models/MovimientoInventario.js` | Backend |
| `backend/src/routes/inventarioRoutes.js` | Backend |
| `frontend/src/pages/InventarioPage.jsx` | Frontend |
| `frontend/src/features/inventario/inventarioApi.js` | Frontend |

#### Tareas — Backend inventario

- [ ] Auditar `inventarioController.js`: revisar cada función (listar, crear, editar, eliminar producto)
- [ ] Corregir el cálculo de stock actual tras registrar movimientos
- [ ] Validar que los movimientos de tipo `entrada`, `salida` y `ajuste` actualizan el stock correctamente
- [ ] Verificar que el filtro de stock bajo (stock ≤ stockMinimo) funciona en la consulta SQL
- [ ] Revisar validaciones en `inventarioRoutes.js` (campos requeridos, tipos de dato)
- [ ] Asegurar que los errores devuelven mensajes claros (sin stack traces)

#### Tareas — Frontend inventario

- [ ] Revisar `InventarioPage.jsx`: flujo completo de agregar un producto nuevo
- [ ] Corregir el formulario de registro de movimiento (entrada/salida/ajuste)
- [ ] Mostrar correctamente el stock actual de cada producto en la tabla
- [ ] Implementar alerta visual para productos con stock bajo
- [ ] Corregir `inventarioApi.js`: endpoints, estructura de payload, manejo de errores
- [ ] Verificar que React Query invalida el caché al crear/editar productos y movimientos

#### Definition of Done — Inventario
- [ ] Crear un producto nuevo con precio, stock inicial y stock mínimo
- [ ] Editar un producto existente
- [ ] Registrar entrada de stock (ej: compra de 10 unidades)
- [ ] Registrar salida de stock (ej: consumo en consulta)
- [ ] Ver historial de movimientos de un producto
- [ ] Ver alerta visual cuando el stock está por debajo del mínimo

---

### Módulo: Historial por mascota

#### Archivos a intervenir

| Archivo | Capa |
|---------|------|
| `backend/src/controllers/historiaClinicaController.js` | Backend |
| `backend/src/controllers/antecedenteController.js` | Backend |
| `backend/src/models/HistoriaClinica.js` | Backend |
| `backend/src/models/AntecedentesMascota.js` | Backend |
| `backend/src/routes/historiaClinicaRoutes.js` | Backend |
| `backend/src/routes/antecedenteRoutes.js` | Backend |
| `frontend/src/pages/HistoriasPage.jsx` | Frontend |
| `frontend/src/pages/AntecedentesPage.jsx` | Frontend |
| `frontend/src/pages/PacientesPage.jsx` | Frontend |
| `frontend/src/features/historias/historiasApi.js` | Frontend |
| `frontend/src/features/antecedentes/antecedentesApi.js` | Frontend |

#### Tareas — Backend historial

- [ ] Auditar `historiaClinicaController.js`: crear historia, listar por mascota, ver detalle
- [ ] Verificar relaciones: `HistoriaClinica` → `Mascota` → `Usuario` (veterinario)
- [ ] Auditar `antecedenteController.js`: agregar vacuna, diagnóstico previo, tratamiento
- [ ] Asegurar que al listar historias de una mascota se ordenan por fecha descendente
- [ ] Revisar que los endpoints filtran por `clinicaId` (aislamiento entre clínicas)
- [ ] Corregir respuestas de error con mensajes descriptivos

#### Tareas — Frontend historial

- [ ] Revisar `HistoriasPage.jsx`: formulario de nueva historia clínica
- [ ] Corregir la lista de historias: debe mostrar fecha, veterinario, diagnóstico resumido
- [ ] En `PacientesPage.jsx`: al abrir la ficha de una mascota, mostrar tab con su historial completo
- [ ] Revisar `AntecedentesPage.jsx`: agregar y listar vacunas y antecedentes
- [ ] Mostrar fecha de próxima vacuna si está registrada
- [ ] Corregir `historiasApi.js` y `antecedentesApi.js`: endpoints y payloads

#### Definition of Done — Historial
- [ ] Desde la ficha de una mascota, ver todas sus historias clínicas
- [ ] Crear una historia clínica nueva vinculada a una mascota y a un veterinario
- [ ] Ver el detalle completo de una historia (diagnóstico, tratamiento, notas)
- [ ] Agregar una vacuna a los antecedentes de una mascota
- [ ] Agregar un diagnóstico previo a los antecedentes
- [ ] El historial se ordena del más reciente al más antiguo

---

### Verificación end-to-end Sprint 1
```
Registrar propietario → crear mascota → agregar antecedentes (vacuna) →
agendar cita → crear historia clínica → registrar salida de inventario (producto usado)
```

### Cierre Sprint 1
```bash
# Cuando develop está estable y el DoD está completo
git checkout main
git merge develop
git push origin main   # Render despliega a producción
```

---

## Sprint 2 — Facturación interna + Facturación electrónica Factus
**Fechas:** 1 Mayo → 14 Mayo
**Objetivo:** Emitir facturas internas sin errores; integración Factus funcionando en sandbox

### Reparto de tareas (sugerencia)

| Tarea | Rama sugerida | Quién |
|-------|--------------|-------|
| Fix backend facturas | `feature/facturas-backend` | Sergio o Roman |
| Fix frontend facturas | `feature/facturas-frontend` | Sergio o Roman |
| Integración Factus backend | `feature/factus-integracion` | Sergio o Roman |
| UI configuración Factus | `feature/factus-ui` | Sergio o Roman |

---

### Módulo: Facturación interna

#### Archivos a intervenir

| Archivo | Capa |
|---------|------|
| `backend/src/controllers/facturaController.js` | Backend |
| `backend/src/models/Factura.js` | Backend |
| `backend/src/models/FacturaItem.js` | Backend |
| `backend/src/routes/facturaRoutes.js` | Backend |
| `frontend/src/pages/FinanzasPage.jsx` | Frontend |
| `frontend/src/features/finanzas/finanzasApi.js` | Frontend |

#### Tareas — Backend facturas

- [ ] Auditar `facturaController.js` (31KB — el archivo más grande del proyecto): función por función
- [ ] Corregir creación de factura: cabecera + ítems en una sola transacción de BD
- [ ] Verificar cálculo de subtotal, IVA (19%) y total
- [ ] Corregir flujo de estados: `borrador` → `emitida` → `pagada` / `anulada`
- [ ] Asegurar que una factura anulada no puede modificarse
- [ ] Revisar endpoint de listado: filtros por estado, fecha y propietario

#### Tareas — Frontend facturas

- [ ] Corregir `FinanzasPage.jsx`: formulario para crear factura con múltiples ítems
- [ ] Implementar selector de productos del inventario al agregar un ítem
- [ ] Mostrar subtotal, IVA (19%) y total calculado en tiempo real
- [ ] Botones de acción por factura: marcar como pagada, anular, ver detalle
- [ ] Filtros de lista: por estado y por rango de fecha
- [ ] Corregir `finanzasApi.js`: endpoints y estructura de payload

#### Definition of Done — Facturación interna
- [ ] Crear factura con 2+ ítems (productos y/o servicios)
- [ ] El total se calcula correctamente con IVA
- [ ] Marcar factura como pagada
- [ ] Anular una factura (no se puede editar después)
- [ ] Listar facturas filtradas por estado y fecha

---

### Módulo: Facturación electrónica (Factus / DIAN)

#### Archivos a intervenir

| Archivo | Capa |
|---------|------|
| `backend/src/services/factusService.js` | Backend (ya movido en pre-sprint) |
| `backend/src/controllers/integracionFacturacionController.js` | Backend |
| `backend/src/models/IntegracionFacturacion.js` | Backend |
| `backend/src/config/factusConfig.js` | Backend |
| `backend/src/routes/integracionFacturacionRoutes.js` | Backend |
| `frontend/src/pages/ConfiguracionPage.jsx` | Frontend |

#### Variables de entorno — sandbox Factus
Agregar al `.env` local (no commitear estas credenciales):
```
FACTUS_ACTIVA=true
FACTUS_AMBIENTE=sandbox
FACTUS_BASE_URL=https://api-sandbox.factus.com.co
FACTUS_CLIENT_ID=...
FACTUS_CLIENT_SECRET=...
FACTUS_USERNAME=...
FACTUS_PASSWORD=...
FACTUS_RANGO_NUMERACION_ID=...
```
En Render (producción), configurar las mismas variables en el panel de Environment Variables.

#### Tareas — Backend Factus

- [ ] Configurar variables de entorno Factus para sandbox y probar autenticación OAuth2
- [ ] Revisar y completar `factusService.js`: función `enviarFactura(factura)` → respuesta Factus
- [ ] Completar `integracionFacturacionController.js`:
  - Guardar configuración Factus de la clínica (credenciales cifradas con `config/crypto.js`)
  - Endpoint para enviar factura a Factus
  - Actualizar estado en DB: `pendiente` → `enviada` → `validada` / `rechazada`
- [ ] Manejar errores de Factus con mensajes comprensibles (no devolver JSON crudo de Factus)

#### Tareas — Frontend Factus

- [ ] En `ConfiguracionPage.jsx`: sección para que el admin ingrese credenciales Factus
- [ ] En `FinanzasPage.jsx`: botón "Enviar a DIAN" en facturas emitidas (visible solo si Factus está configurado)
- [ ] Mostrar estado electrónico por factura: `pendiente / enviada / validada / rechazada / error`
- [ ] Al hacer clic en "Enviar a DIAN": spinner → resultado (éxito o mensaje de error legible)
- [ ] Indicador visible: si Factus está o no configurado para la clínica

#### Definition of Done — Factus
- [ ] Admin de clínica puede ingresar sus credenciales Factus desde Configuración
- [ ] Enviar una factura a Factus sandbox y obtener respuesta
- [ ] Ver el estado electrónico actualizado (validada o error específico)
- [ ] Los errores de Factus se muestran como mensajes legibles

---

### Verificación end-to-end Sprint 2
```
Crear factura con ítems → calcular total con IVA → emitir →
configurar Factus en Configuración → enviar a DIAN sandbox → ver estado "validada"
```

### Cierre Sprint 2
```bash
git checkout main
git merge develop
git push origin main
```

---

## Sprint 3 — Pasarela de pago Wompi + ajustes finales
**Fechas:** 15 Mayo → 31 Mayo
**Objetivo:** Clínicas pagan su suscripción online via Wompi; el plan se activa automáticamente

### Reparto de tareas (sugerencia)

| Tarea | Rama sugerida | Quién |
|-------|--------------|-------|
| wompiService + webhook backend | `feature/wompi-backend` | Sergio o Roman |
| Checkout y confirmación frontend | `feature/wompi-frontend` | Sergio o Roman |
| Migración BD + modelo Suscripcion | `feature/wompi-migracion` | Sergio o Roman |
| Dashboard suscripción activa | `feature/wompi-dashboard` | Sergio o Roman |

---

### Módulo: Pasarela de pago Wompi

#### Archivos a crear

| Archivo | Descripción |
|---------|-------------|
| `backend/src/services/wompiService.js` | Generar link de pago, verificar firma HMAC |
| `backend/src/middlewares/wompiWebhookMiddleware.js` | Verificar firma del webhook antes de procesar |

#### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `backend/src/controllers/suscripcionController.js` | Agregar `checkout` y handler del webhook |
| `backend/src/routes/suscripcionRoutes.js` | Nuevas rutas: `POST /checkout`, `POST /webhook/wompi` |
| `backend/src/models/Suscripcion.js` | Campos: `wompiTransaccionId`, `estadoPago`, `metodoPagoWompi`, `fechaVencimiento` |
| `backend/src/migrations/` | Nueva migración para los campos de pago |
| `frontend/src/pages/PlanesPage.jsx` | Botón "Contratar" → redirige a Wompi |
| `frontend/src/features/suscripcion/suscripcionApi.js` | Nuevo: API calls de suscripción |

#### Variables de entorno — sandbox Wompi
```
WOMPI_PUBLIC_KEY=pub_test_...
WOMPI_PRIVATE_KEY=prv_test_...
WOMPI_EVENTS_SECRET=...
WOMPI_BASE_URL=https://sandbox.wompi.co/v1
```
En Render, configurar también `WOMPI_BASE_URL=https://production.wompi.co/v1` cuando se pase a producción.

#### Flujo completo

```
1. Clínica entra a PlanesPage y hace clic en "Contratar [Plan]"
2. Frontend llama POST /api/suscripciones/checkout { planId }
3. Backend genera referencia única, crea registro pendiente en DB, devuelve URL Wompi
4. Frontend redirige a la URL del Wompi Widget
5. Usuario paga con tarjeta / PSE / Nequi
6. Wompi envía POST /api/webhooks/wompi al backend
7. Backend verifica firma HMAC-SHA256 con WOMPI_EVENTS_SECRET
8. Si aprobado → activa plan en suscripciones, guarda fecha de vencimiento
9. Wompi redirige de vuelta al frontend con la referencia en la URL
10. Frontend consulta el estado de la referencia y muestra confirmación
```

#### Tareas — Backend Wompi

- [ ] Crear `wompiService.js`:
  - `generarLinkPago(plan, clinicaId)` → URL Wompi con referencia única (UUID)
  - `verificarFirmaWebhook(payload, firma)` → valida HMAC-SHA256
- [ ] `suscripcionController.js`:
  - `POST /checkout`: recibe `planId`, crea registro pendiente, devuelve URL Wompi
  - `POST /webhook/wompi`: middleware de firma → activa plan si `APPROVED`
- [ ] Migración: campos `wompiTransaccionId`, `estadoPago`, `metodoPagoWompi`, `fechaVencimiento` en `suscripciones`
- [ ] `wompiWebhookMiddleware.js`: rechazar peticiones con firma inválida (HTTP 401)

#### Tareas — Frontend Wompi

- [ ] `PlanesPage.jsx`: botón "Contratar" en cada plan de pago → llama checkout → redirige
- [ ] Crear página `/pago-resultado`:
  - Lee referencia de la URL (parámetro que devuelve Wompi)
  - Consulta estado al backend
  - Muestra: pago exitoso / fallido / pendiente
- [ ] Dashboard: sección "Mi suscripción" — plan activo, fecha de vencimiento, botón "Renovar"
- [ ] `ConfiguracionPage.jsx`: pestaña "Suscripción" con estado y opción de cambio de plan
- [ ] Crear `frontend/src/features/suscripcion/suscripcionApi.js`

#### Definition of Done — Wompi
- [ ] Una clínica puede seleccionar un plan y hacer clic en "Contratar"
- [ ] Es redirigida a Wompi sandbox y puede completar un pago de prueba
- [ ] El webhook activa el plan automáticamente en la base de datos
- [ ] La clínica ve su plan activo y la fecha de vencimiento en el Dashboard
- [ ] Un pago fallido muestra un mensaje claro y no activa ningún plan
- [ ] La firma del webhook se verifica (sin firma válida se rechaza con 401)

---

### Verificación end-to-end Sprint 3
```
PlanesPage → "Contratar Clinica" → pagar en Wompi sandbox con tarjeta de prueba →
redirigido a /pago-resultado → ver confirmación →
Dashboard → ver plan activo + fecha de vencimiento
```

### Cierre Sprint 3 (release final)
```bash
git checkout main
git merge develop
git push origin main   # Deploy final a producción
```

---

## Resumen ejecutivo

| Sprint | Fechas | Módulos | Entregable |
|--------|--------|---------|------------|
| **Pre-sprint** | 17 Abr (½ día) | Limpieza + Git setup | Docker funcional, ramas protegidas |
| **Sprint 1** | 17–30 Abr | Inventario + Historial | Ambos módulos sin errores, flujo completo |
| **Sprint 2** | 1–14 May | Facturas + Factus DIAN | Facturación interna correcta + envío a DIAN sandbox |
| **Sprint 3** | 15–31 May | Wompi | Pago de suscripciones online con activación automática |

---

## Checklist antes de cada merge a main (producción)

- [ ] Las tareas del DoD del sprint están todas completadas
- [ ] El flujo end-to-end funciona en local
- [ ] No hay `console.log` de depuración en el código
- [ ] Las variables de entorno nuevas están configuradas en Render
- [ ] El otro dev revisó y aprobó el PR de develop → main
- [ ] Se hizo al menos una prueba en local con Docker antes de subir

---

## Referencias técnicas

- **Wompi docs:** https://docs.wompi.co
- **Factus API:** https://factus.com.co/api
- **Render deploy docs:** https://render.com/docs/deploys
- **Sequelize migrations:** https://sequelize.org/docs/v6/other-topics/migrations/
- **Conventional Commits:** https://www.conventionalcommits.org

---

*Documento generado el 17 de Abril de 2026*
*Equipo: Sergio · Roman*
