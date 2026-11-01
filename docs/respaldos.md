# Respaldos — cómo probar una restauración

Un respaldo de la base sin las claves de cifrado no sirve: la PII (nombres,
documentos, teléfonos, métodos de pago…) está cifrada con `ENCRYPTION_KEYS` y
los índices ciegos con `BLIND_INDEX_KEY` (ver `cifrado-recomendaciones.md`).
Esta prueba confirma que **el respaldo de Render + la copia externa de las
claves** alcanzan para recuperar los datos.

Hacerla al menos una vez, y repetirla cada vez que se rote una clave.

## Qué hay

- **Base:** `bourgelat-postgres` en Render (plan `basic-256mb`). Los planes
  pagos tienen recuperación a un punto en el tiempo y respaldos lógicos
  descargables en la pestaña **Recovery** de la base en el dashboard.
- **Claves:** variables de entorno de `bourgelat-api` en Render, con copia en
  Bitwarden (nota «Bourgelat — claves de cifrado»). A 2026-10-31 producción
  cifra en modo legacy: `ENCRYPTION_KEYS` y `BLIND_INDEX_KEY` nunca se
  cargaron, así que toda la PII depende de `INTEGRACIONES_SECRET` (o
  `JWT_SECRET` si faltara). **No regenerar ninguna de las dos en Render.**

`ipAllowList: []` en `render.yaml` bloquea conexiones externas a la base, así
que el respaldo se baja desde el dashboard, no con `pg_dump` desde el equipo.

## Pasos

### 1. Bajar el respaldo

Dashboard de Render → `bourgelat-postgres` → **Recovery** → sección
**Export** → **Create export**. Tarda unos minutos; cuando termina aparece en
la lista con su enlace de descarga (Render lo guarda al menos 7 días).
Guardarlo **fuera del repo** (por ejemplo `C:\respaldos\`); tiene datos reales
de clínicas.

No usar **Restore database** (Point-in-Time Recovery) para esta prueba: crea
una base nueva en Render, que se cobra aparte.

### 2. Restaurarlo en una base local nueva

Con las herramientas de PostgreSQL 18 (deben ser 18 o mayor, como producción):

```bash
PG="/c/Program Files/PostgreSQL/18/bin"
"$PG/createdb" -U postgres bourgelat_restauracion

# Render entrega un .dir.tar.gz (pg_dump en formato directorio). Extraerlo y
# renombrar la carpeta: su nombre trae ":" y Windows no lo acepta.
cd /c/respaldos && mkdir extraido && tar -xzf <fecha>.dir.tar.gz -C extraido
mv extraido/2026-* extraido/dump

# pg_restore es un .exe de Windows: la ruta va en formato Windows.
"$PG/pg_restore" -U postgres -d bourgelat_restauracion --no-owner --no-acl 'C:\respaldos\extraido\dump\bourgelat_prod'
```

Los avisos de roles inexistentes (`bourgelat_app`) son esperables con
`--no-owner --no-acl`.

### 3. Poner las claves desde la copia externa

Crear `backend/.env.restauracion` (lo ignora git por `.env.*`) con las claves
sacadas **del gestor de contraseñas, no del dashboard de Render**: si se copian
de Render, la prueba no demuestra que la copia externa sirva.

```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bourgelat_restauracion
DB_USER=postgres
DB_PASSWORD=<clave local>
DB_SSL=false
# Modo legacy (hoy): basta con estas dos
INTEGRACIONES_SECRET=<copia externa>
JWT_SECRET=<copia externa>
# Cuando se pase a claves dedicadas, agregar también:
# ENCRYPTION_KEYS=<copia externa>
# BLIND_INDEX_KEY=<copia externa>
```

### 4. Verificar

```bash
cd backend
node --env-file=.env.restauracion src/scripts/verificarCifrado.js
```

El script solo lee. Muestra cuántas filas hay por tabla (compararlas con lo
que se ve en producción) y, por cada columna cifrada, cuántos valores hay por
versión de clave. Termina en `OK` o en `FALLA` con las columnas que no
descifran. Si falla, la copia externa de las claves está desactualizada:
arreglarla **antes** de que se necesite.

**No levantar el backend contra la base restaurada:** los jobs de
recordatorios mandarían correos reales a los tutores y a las clínicas.

### 5. Limpiar

```bash
"$PG/dropdb" -U postgres bourgelat_restauracion
```

Borrar el archivo del respaldo y `backend/.env.restauracion`.

## Registro de pruebas

| Fecha | Respaldo de | Resultado | Notas |
|-------|-------------|-----------|-------|
| 2026-10-31 | Export de prod 2026-10-31 23:56 UTC | OK | 5 clínicas, 32 tutores, 165 ventas; toda la PII (legacy) descifró con `INTEGRACIONES_SECRET`/`JWT_SECRET` de Bitwarden. Base y archivos borrados al terminar |
