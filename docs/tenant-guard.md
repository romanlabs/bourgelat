# Tenant Guard — Red de seguridad multi-tenant a nivel de ORM

Implementación del ítem ② del plan de mejoras (`docs/analisis-proyecto-2026-07.md`):
cerrar el riesgo de fuga de datos entre clínicas por un `where` sin `clinicaId` olvidado.

Rama: `feat/tenant-guard` (creada sobre `feat/cifrado-versionado`) ·
Commits: `e09e2df` (implementación) + `cd824a3` (fix detectado en smoke) ·
Fecha: 2026-07-07

---

## 1. El problema

El aislamiento multi-tenant de Bourgelat dependía de repetir el filtro `clinicaId`
a mano en ~280 queries de 17 controladores. Las queries existentes funcionan, pero
no había ninguna red de seguridad: **un solo `where` olvidado en un endpoint nuevo
significaba fuga de datos entre clínicas**, sin error, sin log, sin forma de notarlo.

## 2. La solución

En lugar de reescribir las 280 queries, se instaló una red de seguridad en el ORM:
hooks globales de Sequelize que inspeccionan **toda** query antes de ejecutarse y
rechazan las que tocan un modelo tenant sin filtrar por `clinicaId`.

### Archivos nuevos

| Archivo | Qué hace |
|---|---|
| `backend/src/config/tenantGuard.js` | El guard: hooks `beforeFind`, `beforeCount`, `beforeBulkUpdate`, `beforeBulkDestroy` sobre la instancia de Sequelize |
| `backend/src/utils/tenant.js` | Helper `tenantWhere(req, extra)` para escribir endpoints nuevos; lanza si el usuario autenticado no tiene `clinicaId` |
| `backend/src/config/tenantGuard.test.js` | Suite de tests sin base de datos, integrada a `npm test` |

### Cómo funciona

1. **Detección automática de modelos tenant**: cualquier modelo cuyo `rawAttributes`
   incluya `clinicaId` queda protegido (16 de 19 modelos). `Clinica`, `FacturaItem`
   y `FacturaCompraItem` quedan exentos automáticamente por no tener la columna.
2. **Búsqueda recursiva del filtro**: el guard acepta `clinicaId` en cualquier nivel
   del `where` (operadores `Op.and`/`Op.or`, arrays, referencias `$tabla.clinicaId$`)
   y también en `include` con INNER JOIN (`required !== false`).
3. **Escape explícito y auditable**: las queries legítimamente globales se marcan con
   `sinTenant: true` en las opciones. La marca es greppable:

   ```bash
   grep -rn "sinTenant: true" backend/src   # audita todo acceso cross-tenant
   ```

4. **Modos de operación** (variable `TENANT_GUARD_MODE`):

   | Modo | Comportamiento | Default en |
   |---|---|---|
   | `strict` | Lanza error, la query nunca llega a la DB | dev / test |
   | `log` | Deja pasar la query pero registra `logger.error` | producción |
   | `off` | Desactivado | — |

   El default `log` en producción garantiza que un falso positivo nunca tumbe un
   endpoint; tras un período sin warnings en los logs se sube a `strict` con la
   variable de entorno.

### Queries globales marcadas (~26 sitios)

- **`authController`** (10): login/registro por email, rotación y revocación de
  refresh tokens por token o `usuarioId`, `me` por id — el usuario aún no tiene
  contexto de tenant o el token es la credencial.
- **`authMiddleware`** (1): `Usuario.findByPk` al verificar el JWT.
- **`superadminController`** (8): dashboard y listados globales por diseño.
- **`suscripcionController`** (1): cancelación por id (ruta global de superadmin).
- **`usuarioController`** (2): unicidad de email al crear/editar (el email de
  `Usuario` es único a nivel plataforma porque es la credencial de login).
- **`auditoriaController`** (1): resolución de nombres de usuarios de los logs
  (pueden incluir superadmins con `clinicaId` null).
- **`jobs/limpiezaTokens`** (2): limpieza global de tokens vencidos y logs antiguos.
- **`scripts/createSuperadmin`** (1): búsqueda global por email.

### Endurecimiento adicional (defensa en profundidad)

Cuatro re-fetch post-creación que buscaban solo por `id` ahora también filtran por
tenant:

- `citaController` y `historiaClinicaController`: el `findOne` que recarga la
  entidad recién creada ahora incluye `clinicaId` en el `where`.
- `facturaCompraController` (×2): `findByPk(id)` → `findOne({ where: { id, clinicaId } })`.

### Convención para endpoints nuevos

```js
const { tenantWhere } = require('../utils/tenant')

// En un controlador autenticado:
const mascotas = await Mascota.findAll({ where: tenantWhere(req, { activo: true }) })
```

Si se olvida el filtro, el guard corta la query en dev con un mensaje que dice
exactamente cómo corregirla. La convención quedó documentada en `CLAUDE.md`.

---

## 3. Errores encontrados y sus soluciones

### 3.1 Query real sin filtro de tenant (detectada por el propio guard)

**Síntoma:** durante el smoke, `POST /api/usuarios` devolvía
`500 Error en el servidor`.

**Causa:** `usuarioController.js:82` — el chequeo de unicidad de email al crear
usuario (`Usuario.findOne({ where: { email } })`) no filtraba por tenant ni estaba
marcado. El escaneo estático previo no la detectó porque había un `clinicaId` de
otra expresión 5 líneas más abajo (falso negativo de la heurística de ventana).

**Solución:** marcada con `sinTenant: true` — es global por diseño, el email es la
credencial de login y debe ser único a nivel plataforma (commit `cd824a3`).

**Lectura:** este es exactamente el tipo de query que el guard existe para atrapar.
Lo hizo en el primer smoke, en dev, con un error explícito — en lugar de convertirse
en una fuga silenciosa.

### 3.2 `beforeCount` no recibe el modelo en las opciones

**Síntoma (diseño):** los hooks globales reciben `options`, y `Model.count` en
Sequelize 6 no setea `options.model`, así que el guard no sabría qué modelo validar.

**Solución:** verificado en el código fuente de Sequelize 6 que `runHooks` invoca
cada hook con `hook.apply(this, args)` donde `this` es la clase del modelo. El guard
registra los hooks como `function` (no arrow) y usa `options.model || this`.

### 3.3 Los catch de los controladores tragan los errores

**Síntoma:** el 500 del punto 3.1 no dejaba rastro — los handlers hacen
`catch (error) { responderErrorInterno(res) }` sin loguear, y en modo `strict` el
error del guard muere ahí.

**Solución puntual:** logs temporales de diagnóstico durante el smoke (removidos al
terminar). **Pendiente estructural:** este patrón oculta cualquier error de backend,
no solo los del guard; es parte del ítem ⑥ (logging) y se resolvería de raíz con el
manejo async nativo de Express 5 + un error handler central (nota menor de la
sección 5 del análisis).

### 3.4 Nodemon no recarga dentro del contenedor (Windows)

**Síntoma:** los fixes editados en Windows no se aplicaban — el contenedor seguía
sirviendo el código viejo a pesar del bind mount `./backend:/app`.

**Causa:** Docker Desktop en Windows no propaga los eventos de archivos del bind
mount al filesystem del contenedor, y nodemon nunca ve el cambio.

**Solución:** `docker compose restart backend` después de editar código backend.
(Alternativa permanente si molesta: `nodemon --legacy-watch` en el script `dev`,
a costa de CPU por polling.)

### 3.5 Fallo transitorio en el primer login (falsa alarma)

**Síntoma:** el primer `POST /api/auth/login` del smoke devolvió 500; todos los
intentos posteriores funcionaron.

**Diagnóstico:** se reprodujeron los dos caminos posibles (login normal y primer
login sin suscripción, borrando la suscripción en la DB) y ambos pasan. No hubo
reinicios de nodemon ni rastro del guard en los logs. Se concluye que fue un error
puntual del arranque del stack, no relacionado con el guard — el login de la segunda
clínica funcionó al primer intento.

---

## 4. Verificación

### Tests automatizados (`npm test` en `backend/`)

Sin base de datos — los hooks de Sequelize corren antes de abrir conexión, y el
camino "query permitida" se verifica con un hook centinela registrado después del
guard:

- Detección del filtro: where plano, `Op.and`/`Op.or`, referencias anidadas,
  includes con y sin `required: false`.
- Rechazo de `findAll`/`findOne`/`findByPk`/`count`/`update`/`destroy` sin tenant.
- Paso con filtro presente, con `sinTenant: true`, y para modelos sin `clinicaId`.
- Modo `log`: no lanza y registra la violación.

### Smoke end-to-end (Docker, guard en `strict`)

| Flujo | Resultado |
|---|---|
| Registro de clínica + login + `me` + refresh (rotación) + logout-all | ✅ |
| Primer login sin suscripción (crea plan esencial) | ✅ |
| CRUD: propietario → mascota → cita → historia clínica | ✅ |
| Inventario: crear producto, listados | ✅ |
| Factura de compra (re-fetch scoped) y factura de venta (locks + stock + caja) | ✅ |
| Turno de caja: abrir, consultar activo | ✅ |
| Auditoría y reportes de dashboard | ✅ |
| Dashboard y listados de superadmin (queries `sinTenant`) | ✅ |
| **Aislamiento cross-tenant**: segunda clínica no ve datos de la primera | ✅ |
| Violaciones del guard en logs al finalizar | **0** |

---

## 5. Límites conocidos

- **`Model.sum` / `min` / `max`** no tienen hooks en Sequelize 6 — quedan fuera del
  guard (los agregados existentes ya filtran por tenant; los de superadmin están
  marcados por consistencia).
- **SQL crudo** (`sequelize.query`, como usa `scripts/rotarCifrado.js`) no pasa por
  hooks de modelo — exento por naturaleza.
- **Updates/destroy de instancia** (`instancia.update(...)`) no disparan los hooks
  bulk, pero están cubiertos indirectamente: la instancia se obtuvo con un `find`
  que sí pasó por el guard.
- El guard valida **presencia** del filtro, no su valor: `clinicaId` con el tenant
  equivocado pasaría. Eso lo cubre la disciplina de usar `tenantWhere(req)`.

## 6. Operación

- **Dev/test:** nada que hacer — `strict` es el default y los errores son explícitos.
- **Producción (Render):** arranca en modo `log`. Tras 1–2 semanas sin mensajes
  `TenantGuard:` en los logs, fijar `TENANT_GUARD_MODE=strict` en el servicio.
- **Auditoría periódica:** `grep -rn "sinTenant: true" backend/src` debe devolver
  solo sitios justificables (auth, superadmin, jobs, scripts).
