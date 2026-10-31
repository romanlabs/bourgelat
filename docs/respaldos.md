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
- **Claves:** variables de entorno de `bourgelat-api` en Render, con copia en el
  gestor de contraseñas de Roman.

`ipAllowList: []` en `render.yaml` bloquea conexiones externas a la base, así
que el respaldo se baja desde el dashboard, no con `pg_dump` desde el equipo.

## Pasos

### 1. Bajar el respaldo

Dashboard de Render → `bourgelat-postgres` → **Recovery** → exportar o
descargar el respaldo lógico más reciente. Guardarlo **fuera del repo** (por
ejemplo `C:\respaldos\`); tiene datos reales de clínicas.

### 2. Restaurarlo en una base local nueva

Con las herramientas de PostgreSQL 18 (deben ser 18 o mayor, como producción):

```bash
PG="/c/Program Files/PostgreSQL/18/bin"
"$PG/createdb" -U postgres bourgelat_restauracion

# Si el archivo es un dump de pg_dump (custom o directorio):
"$PG/pg_restore" -U postgres -d bourgelat_restauracion --no-owner --no-acl <archivo>
# Si es SQL plano (.sql o .sql.gz descomprimido):
"$PG/psql" -U postgres -d bourgelat_restauracion -f <archivo.sql>
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
ENCRYPTION_KEYS=<copia externa>
BLIND_INDEX_KEY=<copia externa>
# Solo si quedan datos legacy (el script los muestra como legacy=N):
INTEGRACIONES_SECRET=<copia externa>
JWT_SECRET=<copia externa>
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
| | | | |
