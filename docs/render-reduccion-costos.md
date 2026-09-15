# Reduccion de costos en Render

Diagnostico hecho el 2026-09-14 con el dashboard de facturacion de Render
(workspace "Bourgelat", plan Hobby) y el historial de `render.yaml`.

Objetivo: bajar la factura mensual mientras Bourgelat no factura, sin afectar
a la clinica piloto en produccion ni limitar el crecimiento.

---

## 1. Situacion actual

### Costo mensual proyectado (septiembre 2026): ~$27.75 USD

| Recurso | Detalle | Tarifa | $/mes |
|---|---|---|---|
| `bourgelat-api` | Web service Docker, Starter (0.5 CPU, 512 MB) | $0.0097/h | 7.00 |
| `bourgelat-web` | Web service Docker (nginx), Starter | $0.0097/h | 7.00 |
| `bourgelat-postgres` | Basic-256mb (0.1 CPU, 256 MB) | $0.0083/h | 6.00 |
| Disco de `bourgelat-postgres` | 15 GB reservados | $0.30/GB | 4.50 |
| Disco `uploads` de `bourgelat-api` | 10 GB reservados (`/app/uploads`) | $0.25/GB | 2.50 |
| Dominios propios | 5 usados, 2 incluidos en Hobby | $0.25/dominio extra | 0.75 |
| `bourgelat-api-staging` / `bourgelat-web-staging` | Suspendidos | — | 0.00 |
| `bourgelat-postgres-staging` | Plan free | — | 0.00 |
| **Total** | | | **~27.75** |

Uso incluido del mes (lejos del limite, hoy no genera cobro):

- Ancho de banda: 1 GB / 5 GB
- Minutos de pipeline (builds): 5 / 500
- Servicios: 6 / 25

### Historico de facturas

| Mes | Total | Servicios | Datastores | Suscripcion workspace |
|---|---|---|---|---|
| Abril 2026 | $24.27 | — | — | — |
| Mayo 2026 | $8.76 | $5.35 | $3.41 | — |
| Junio 2026 | $20.22 | $10.60 | $6.74 | $2.88 |
| Julio 2026 | $27.87 | $16.50 | $10.50 | $0.87 |
| Agosto 2026 | $27.75 | — | — | — (**sin pagar** al 2026-09-14) |

**Por que antes era menos:** en mayo y junio los servicios no estuvieron
encendidos el mes completo (se cobra por hora encendida). Desde julio todo
corre 24/7, y ~$27.75 es el costo real de la configuracion actual. No hubo
aumento de tarifas.

### El costo NO escala proporcional al uso

Casi todo es costo fijo por hora encendida o por GB **reservado** (no usado).
Lo unico variable es ancho de banda y minutos de build, ambos con amplio margen.
El costo crece por escalones cuando un recurso se queda corto (ver seccion 4).

---

## 2. Opciones de ahorro

Resumen, ordenado de menor a mayor esfuerzo:

| # | Opcion | Ahorro/mes | Esfuerzo | Riesgo | Toca codigo |
|---|---|---|---|---|---|
| A | Quitar dominios de staging | $0.50 | 5 min | Nulo | No |
| B | Frontend como Static Site | $7.00 | 1-2 h | Bajo (minutos de corte en dominios) | Solo `render.yaml` |
| C | Postgres con disco pequeno | ~$4.20 | 2-3 h | Medio (migracion de datos) | Solo `render.yaml` |
| D | Uploads a Cloudflare R2 | $2.50 | 1-2 dias | Medio | Si |

| Escenario | Costo mensual |
|---|---|
| Actual | ~$27.75 |
| A + B | ~$20.25 |
| A + B + C | ~$16.05 |
| A + B + C + D | ~$13.55 |

---

### Opcion A — Quitar dominios de staging (−$0.50)

**Por que:** Render cobra los dominios propios aunque el servicio este
suspendido. Hoy hay 5: `bourgelat.co`, `app.bourgelat.co`, `api.bourgelat.co`,
`staging.bourgelat.co`, `api-staging.bourgelat.co`. Hobby incluye 2.

**Pasos:**

1. En `render.yaml`, **comentar** (no borrar) el bloque `domains` de
   `bourgelat-api-staging` y `bourgelat-web-staging`. Si queda activo, el
   siguiente sync del Blueprint vuelve a agregar los dominios.
2. En el dashboard de Render, en cada servicio de staging > Settings > Custom
   Domains, eliminar el dominio (el sync del Blueprint puede no borrarlo solo).
3. Opcional: borrar los registros DNS de staging en Cloudflare para no dejar
   CNAMEs apuntando a servicios sin dominio.

Los servicios de staging quedan **suspendidos, no borrados** ($0/mes). Hoy las
pruebas se hacen en local con `develop`; staging se conserva para cuando el
equipo crezca. Los registros DNS de Cloudflare se pueden dejar: no cuestan.

**Como reactivar staging:**

1. Descomentar los bloques `domains` en `render.yaml` y sincronizar el Blueprint.
2. Revisar `bourgelat-postgres-staging`: las bases free de Render expiran a los
   30 dias y luego se eliminan. Si ya no existe, el Blueprint la vuelve a crear
   vacia y las migraciones corren al arrancar el API (`DB_RUN_MIGRATIONS=true`).
3. Cargar en `bourgelat-api-staging` las variables `sync: false`
   (`ENCRYPTION_KEYS`, `BLIND_INDEX_KEY`, Google OAuth, SMTP) si se perdieron.
4. Reanudar `bourgelat-api-staging` y `bourgelat-web-staging` (Resume service).
5. Confirmar que los registros DNS de Cloudflare apuntan a los servicios y que
   Render emitio el certificado.

---

### Opcion B — Frontend como Static Site (−$7.00)

**Por que:** `bourgelat-web` es un build de Vite servido por nginx
(`frontend/Dockerfile.prod` + `frontend/nginx.conf`) sin logica de servidor.
Render sirve Static Sites gratis y desde CDN, asi que no hace falta una
instancia Starter encendida 24/7.

**Antecedente (importante):** esto ya se intento en el PR #46 (2026-07-01)
cambiando `type: web` por `type: static` en el mismo servicio. Fallo con
`changing service type not supported`: **Render no permite cambiar el tipo de
un servicio existente**. Se revirtio el 2026-08-26 (commit `95a3b36`). La forma
correcta es crear un servicio nuevo, mover los dominios y borrar el viejo.

**Que hace hoy nginx y como se reemplaza:**

| nginx.conf | Equivalente en Static Site |
|---|---|
| `try_files $uri $uri/ /index.html` (SPA) | `routes` con rewrite `/*` → `/index.html` |
| `gzip on` | Render comprime automaticamente (gzip/brotli) |
| `location = /healthz` | No aplica (Static Site no tiene health check) |
| Sin headers de seguridad | Sin cambios (opcional agregarlos con `headers`) |

**Pasos:**

1. En una rama `chore/frontend-static-site`, agregar un servicio nuevo en
   `render.yaml` **con otro nombre** y **sin dominios** (el viejo sigue igual):

   ```yaml
   - type: static
     name: bourgelat-frontend
     buildCommand: cd frontend && npm ci && npm run build
     staticPublishPath: frontend/dist
     autoDeployTrigger: commit
     buildFilter:
       paths:
         - frontend/**
         - render.yaml
     headers:
       - path: /assets/*
         name: Cache-Control
         value: public, max-age=31536000, immutable
     routes:
       - type: rewrite
         source: /*
         destination: /index.html
     envVars:
       - key: VITE_API_URL
         value: https://api.bourgelat.co/api
       - key: VITE_OAUTH_ENABLED
         value: "true"
   ```

   Nota: los Static Sites no aceptan `region` (commit `a124777`).

2. Mergear y dejar que el Blueprint cree el servicio. Verificar en la URL
   `bourgelat-frontend.onrender.com`:
   - Carga la landing y navegar directo a una ruta interna (ej. `/agenda`) no da 404.
   - Las variables `VITE_*` quedaron en el build (el login llama a `api.bourgelat.co`).
   - El login con cookies probablemente **no** funcione desde `*.onrender.com`
     (CORS/origen solo permite `bourgelat.co` y `app.bourgelat.co`). Es esperado;
     se valida despues de mover el dominio.

3. **Ventana de cambio** (hora de poco uso de la clinica piloto, avisar antes):
   1. En `bourgelat-web` > Settings > Custom Domains, eliminar `app.bourgelat.co`
      y `bourgelat.co`.
   2. En `bourgelat-frontend`, agregarlos.
   3. En Cloudflare, actualizar los CNAME para que apunten a
      `bourgelat-frontend.onrender.com`.
   4. Esperar a que Render verifique los dominios y emita el certificado.
   5. Probar: landing, login con email, login con Google, navegacion y recarga
      en rutas internas, descarga de factura PDF.

4. **Rollback:** si algo falla, devolver los dominios a `bourgelat-web` y
   restaurar los CNAME. El servicio viejo sigue intacto hasta el paso 5.

5. Tras 2-3 dias estable: borrar `bourgelat-web` en el dashboard y quitar su
   bloque de `render.yaml` (el Blueprint no borra servicios solo por quitarlos
   del archivo). Mover el bloque `domains` al nuevo servicio en `render.yaml`.

6. Repetir con `bourgelat-web-staging` cuando se reactive staging (hoy no cobra).

**Efecto secundario positivo:** el frontend deja de depender de una instancia de
512 MB y lo sirve la CDN de Render, asi que carga mas rapido y aguanta mas trafico.

---

### Opcion C — Postgres con disco de menor tamano (~−$4.20)

**Por que:** la base tiene 15 GB reservados ($4.50/mes) y los datos reales de
una clinica piloto ocupan muy poco. **Render no permite reducir el disco de
Postgres, solo aumentarlo**, asi que hay que crear una base nueva y migrar.

**Antes de empezar:**

- Medir el tamano real, desde el Shell de `bourgelat-api` o con `psql`:
  `SELECT pg_size_pretty(pg_database_size('bourgelat_prod'));`
- Elegir el tamano con margen (ej. 1-2 GB = $0.30-0.60/mes). Se puede ampliar
  despues sin migrar, pero nunca reducir.
- La base es PostgreSQL 18: `pg_dump`/`pg_restore` deben ser version 18 o mayor.
- `ipAllowList: []` bloquea conexiones externas. Opciones: hacer el dump desde el
  Shell de un servicio en Render (misma red privada) o permitir temporalmente la
  IP propia y quitarla al terminar.
- Las claves `ENCRYPTION_KEYS` y `BLIND_INDEX_KEY` viven en el API, no en la base:
  la PII cifrada se migra tal cual y sigue siendo legible.

**Pasos:**

1. Crear `bourgelat-postgres-v2` en `render.yaml` (plan `basic-256mb`, misma
   region `oregon`, `postgresMajorVersion: "18"`) y ajustar el disco en el
   dashboard al tamano elegido al crearla.
2. **Ventana de mantenimiento** (avisar a la clinica piloto; 15-30 min):
   1. Suspender `bourgelat-api` para que nadie escriba durante la copia.
   2. `pg_dump -Fc --no-owner --no-acl "<URL externa vieja>" -f bourgelat.dump`
   3. `pg_restore --no-owner --no-acl -d "<URL externa nueva>" bourgelat.dump`
   4. Verificar conteos en tablas clave (clinicas, usuarios, mascotas,
      historias clinicas, facturas, productos) en ambas bases.
   5. En `render.yaml`, cambiar `fromDatabase.name` de las 5 variables `DB_*`
      de `bourgelat-api` a `bourgelat-postgres-v2`. Sincronizar el Blueprint.
   6. Reanudar `bourgelat-api`. Revisar logs: las migraciones deben reportar
      que no hay pendientes.
   7. Probar login, agenda, historia clinica y una venta en el POS.
3. **Rollback:** volver `fromDatabase.name` a `bourgelat-postgres`. La base vieja
   no se toca durante la migracion.
4. Mantener la base vieja 1 semana como respaldo (cuesta ~$2.60 esa semana) y
   luego borrarla en el dashboard y en `render.yaml`.

---

### Opcion D — Uploads a Cloudflare R2 (−$2.50)

**Por que:** el disco `uploads` de 10 GB cuesta $2.50/mes reservado. R2 da
10 GB/mes gratis sin costo de salida. Ademas, un servicio de Render **con disco
no puede tener deploys sin caida ni escalar a mas de una instancia**; quitar el
disco desbloquea ambas cosas para el futuro.

**Estado actual del codigo:**

- `backend/src/config/uploads.js` guarda en disco local (`uploads/`) en
  subcarpetas `mascotas`, `examenes`, `usuarios`, `productos`, `clinicas`.
- `backend/src/index.js` sirve `/uploads` con `express.static` **sin
  autenticacion**. Las URLs son dificiles de adivinar (timestamp + UUID), pero
  cualquiera con el enlace puede abrir el archivo.
- Middlewares de subida: `uploadMascotaPhotoMiddleware`,
  `uploadExamenArchivoMiddleware`, `uploadUsuarioFotoMiddleware`,
  `uploadProductoFotoMiddleware`, `uploadClinicaLogoMiddleware`.
- Hay URLs absolutas guardadas en la base (`PUBLIC_UPLOADS_BASE_URL`), validadas
  por `esUrlDeUploadPropio` segun el prefijo `/uploads/<subdir>/`.

**Diseno recomendado:**

1. Bucket R2 **privado**. Los examenes de laboratorio son datos clinicos: no
   conviene un bucket publico. Servir con URLs firmadas de corta duracion
   generadas por el API despues de validar tenant y permisos. Esto ademas cierra
   el acceso sin autenticacion que existe hoy.
2. Fotos y logos pueden ir por el mismo mecanismo (mas simple, un solo camino)
   o por un bucket publico separado si se quiere cache de CDN.
3. Abstraer el almacenamiento en un `services/storageService.js` con dos drivers
   (`local` para desarrollo, `r2` para produccion) usando el SDK S3
   (`@aws-sdk/client-s3`, R2 es compatible con S3).
4. Guardar en la base la **clave del objeto** (ej. `examenes/<archivo>.pdf`) en
   vez de la URL absoluta, para no depender del dominio.
5. Script de migracion: subir los archivos existentes del disco a R2 y
   reescribir las columnas con URLs antiguas.
6. Nuevas variables en `validateRuntimeConfig.js` y `render.yaml` (con
   `sync: false`): `STORAGE_DRIVER`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
   `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`.
7. Cuando todo lea desde R2: quitar el bloque `disk` de `bourgelat-api` y
   borrar el disco en el dashboard (se borran los archivos: verificar antes que
   la migracion este completa y con respaldo).

**Recomendacion:** hacerlo cuando haya otra razon para tocar uploads (ej.
endurecer el acceso a examenes) y no solo por los $2.50.

---

## 3. Opciones descartadas

| Opcion | Por que no |
|---|---|
| API en plan Free | Se apaga sin trafico y tarda ~50 s en despertar; no admite discos. Inaceptable con una clinica en produccion. |
| Postgres Free de Render | Expira a los 30 dias. |
| Base de datos en otro proveedor gratuito | Suma un proveedor, latencia entre nubes y riesgo de migracion. Considerar solo si hay que bajar de ~$13/mes. |
| Cambiar de proveedor (VPS, Railway, Fly) | Ahorro marginal frente al costo de rehacer despliegue, TLS, backups y la integracion con Cloudflare. |

---

## 4. Como crecera el costo

El costo se mantiene plano hasta que un recurso se queda corto. Escalones
esperados, en orden probable (precios aproximados; confirmar en
render.com/pricing antes de decidir):

1. **Base de datos (RAM):** con varias clinicas activas a diario, 256 MB se
   quedan cortos. Siguiente plan: Basic-1gb (~$19/mes).
2. **API (RAM/CPU):** generacion de PDFs y concurrencia. Siguiente paso:
   Standard (~$25/mes) o 2 instancias Starter (requiere haber hecho la opcion D).
3. **Ancho de banda:** con la opcion B, el trafico del frontend lo absorbe la CDN;
   el API consume poco.
4. **Almacenamiento:** no se espera cobro relevante en el corto plazo.

**Senal para subir de plan:** memoria del API o de la base por encima del 80%
de forma sostenida (Render > servicio > Metrics). Revisar una vez al mes.

---

## 5. Checklist mensual de facturacion

- [ ] Factura del mes anterior pagada (una factura impaga puede suspender servicios).
- [ ] Proyeccion del mes en Billing > Unbilled Charges sin cargos inesperados.
- [ ] Servicios de staging suspendidos si no se estan usando.
- [ ] Uso incluido (ancho de banda, minutos de pipeline) por debajo del limite.
- [ ] Metricas de memoria del API y la base por debajo del 80%.
