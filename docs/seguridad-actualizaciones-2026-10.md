# Actualizaciones de seguridad pendientes (octubre 2026)

Revision hecha el 2026-10-23 con `npm audit` en `backend/` y `frontend/` y los
avisos publicados por Node.js, GitHub Advisories y PostgreSQL.

Objetivo: dejar claro que hay que actualizar, por que, y en que orden, para
repartirlo entre los dos sin pisarnos.

Rama sugerida: `fix/dependencias-seguridad` desde `develop`.

---

## Resumen

| Prioridad | Que | Donde | Riesgo en produccion |
|---|---|---|---|
| 1 | Node.js 22.23.4 | `backend/Dockerfile` + equipos locales | Alto (Brotli RCE, TLS) |
| 1 | multer 2.5.0 | backend | Medio (DoS) |
| 1 | body-parser >= 2.4.0 | backend (via Express) | Alto (DoS) |
| 1 | nodemailer 10.1.4 + mailparser | backend | Medio (destinatarios inyectados) |
| 2 | xlsx desde el CDN de SheetJS | frontend | Medio (archivos subidos por usuarios) |
| 2 | follow-redirects 1.16.1 (via axios) | frontend | Bajo |
| 2 | zod 4.6.6 | frontend | Bajo (solo navegador) |
| 2 | vite >= 8.2.4, vitest >= 4.1.12 | frontend (dev) | Ninguno; afecta el equipo local |
| 3 | mailauth 8.x (arrastra undici) | backend | Medio; es cambio mayor |
| 3 | PostgreSQL 18.4+ en Render | infraestructura | Verificar version |
| — | uuid (via Sequelize), tailwindcss 3 | — | Se acepta el riesgo (ver abajo) |

---

## 1. Node.js — Security Releases del 2026-10-21

10 CVEs, 4 altas. Version corregida para la linea 22: **v22.23.4**
(24.x: v24.22.1). No hay workarounds.

| CVE | Severidad | Resumen |
|---|---|---|
| CVE-2026-111497 | Alta | Escritura fuera de limites en el decodificador Brotli: crash, fuga de memoria o RCE |
| CVE-2026-106069 | Alta | IPv4 con ceros a la izquierda (`0127.0.0.1`) se valida contra otra IP en TLS |
| CVE-2026-105483 | Alta | `tls.checkServerIdentity()` con digitos de ancho completo (solo 24/26) |
| CVE-2026-105482 | Alta | `dns.resolve*()` trunca nombres con byte NUL |
| CVE-2026-106072 | Media | SAN DNS autentica IP escrita de forma no canonica |
| CVE-2026-105481 | Media | Socket keep-alive acepta respuesta anterior a la peticion |
| CVE-2026-106074 | Media | `randomUUID()`/`randomInt()` repiten valores en snapshots/SEA |

Tambien actualiza Undici, OpenSSL, c-ares y el almacen de certificados.

**Que hacer**

- `backend/Dockerfile` usa `FROM node:22-alpine`. Fijar la version para no
  depender de la cache de Render:

  ```dockerfile
  FROM node:22.23.4-alpine
  ```

- En Render: deploy manual con **Clear build cache & deploy**.
- Equipos locales: instalar Node 22.23.4 (hoy hay 22.20.0).

Fuente: <https://nodejs.org/en/blog/vulnerability/october-2026-security-releases>

---

## 2. Backend (`backend/`)

### multer → 2.5.0

- **CVE-2026-113872** (GHSA-q7qp-rjg7-q26m, publicado 2026-10-22, CVSS 7.5):
  un `fileFilter` asincrono puede tumbar el proceso tras cortar la peticion.
- Versiones anteriores tambien cubren CVE-2026-82333 (2.3.0), CVE-2026-5038
  (2.2.0) y otras de 2.1.x. Tenemos **2.1.1**.
- Nuestros 4 `fileFilter` (`uploadClinicaLogoMiddleware`,
  `uploadExamenArchivoMiddleware`, `uploadMascotaPhotoMiddleware`,
  `uploadProductoFotoMiddleware`) son sincronos, asi que el CVE nuevo no se
  dispara hoy, pero las anteriores si aplican. Actualizar igual.

```bash
npm install multer@^2.5.0
```

Probar: subir logo, foto de mascota, foto de producto y archivo de examen,
incluido un archivo con tipo no permitido y uno sobre el limite de tamano.

### body-parser >= 2.4.0 (dependencia de Express 5)

- **GHSA-27r3-jxmh-p828** (alta): DoS con bytes extra tras un cuerpo comprimido.
- Instalado: 2.2.2. Lo resuelve `npm update body-parser` sin tocar Express.

### nodemailer → 10.1.4 y mailparser → ultima 3.9.x

- **GHSA-8c8m-p3m8-cjg8**, **GHSA-m943-m63m-w62w**, **GHSA-85x2-q946-cp5h**:
  el `addressparser` puede convertir texto de un encabezado en destinatario.
- Relevante porque enviamos correos (verificacion, recuperacion, recordatorios)
  y `mailparser` procesa correo entrante de soporte.

```bash
npm install nodemailer@^10.1.4 mailparser@latest
```

Probar: codigo de verificacion, recuperacion de clave, recordatorio de cita y
flujo de soporte.

### mailauth → 8.x (prioridad 3)

- Arrastra **undici** < 8.12.2: GHSA-4qv8-2p9j-2685, GHSA-xjj6-f33q-929c
  (DoS) y GHSA-f72v-6w45-q472 (bypass de SRI).
- Es cambio de version mayor: revisar el changelog antes y hacerlo en su
  propia rama.

### uuid (via Sequelize 6) — se acepta

- GHSA-w5hq-g745-h8pq: falta chequeo de limites cuando se pasa `buf`.
  Nosotros no pasamos buffer y Sequelize 6 no tiene version corregida.
  `npm audit fix --force` propone bajar a Sequelize 3: **no hacerlo**.

### Ojo: `node_modules` desincronizado

En el equipo de Sergio, `node_modules` no coincide con `package.json`
(nodemailer 9.0.3 instalado vs `^10.0.12`, mailparser ausente). Correr
`npm ci` antes de probar.

---

## 3. Frontend (`frontend/`)

### xlsx — sin parche en npm (prioridad 2)

- **GHSA-4r6h-8v6p-xvw6** (prototype pollution, < 0.19.3) y
  **GHSA-5pgg-2g8v-p4x9** (ReDoS, < 0.20.2). Tenemos 0.18.5.
- SheetJS dejo de publicar en npm; la version corregida sale de su CDN.
- Lo usamos en `features/inventario/inventarioImportSchema.js` para leer
  archivos que sube el usuario, asi que si conviene arreglarlo.

```bash
npm install https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
```

Probar: importar inventario (archivo valido, con filas invalidas y uno roto) y
descargar la plantilla.

### follow-redirects → 1.16.1 (via axios)

- GHSA-q3jh-wrc6-jgq8, GHSA-8r9p-f939-6h3c: puede filtrar encabezados de
  credenciales en redirecciones entre dominios. `npm update follow-redirects`.

### zod → 4.6.6

- GHSA-mrhx-c7xc-m3w5: agota memoria con colecciones enormes. Solo corre en
  el navegador, impacto bajo. `npm install zod@^4.6.6` y correr `npm test`.

### vite >= 8.2.4 y vitest/@vitest/ui >= 4.1.12 (solo desarrollo)

- Vite 8.2.1: archivos servidos fuera de `server.fs.allow`, ejecucion de
  comandos via `launch-editor` en Windows, ejecucion de scripts cross-origin.
- Vitest: lectura arbitraria de archivos y code injection via mocker.
- No afectan `bourgelat.co` (es un build estatico), pero si al equipo mientras
  corre `npm run dev`.

```bash
npm install -D vite@^8.2.4 vitest@^4.1.12 @vitest/ui@^4.1.12
```

Probar: `npm run dev`, `npm run build`, `npm test`, `npm run lint:colores`.

### tailwindcss 3 / postcss-selector-parser — se acepta

- GHSA-rj75-hqrm-r3gf (CPU cuadratica al parsear selectores). Solo corre en
  build con nuestro propio CSS. El fix exige Tailwind 4: fuera de alcance.

---

## 4. Lo que ya esta bien

- **react-router 7.18.2**: ya incluye CVE-2026-22029 (XSS), CVE-2026-53663
  (CSRF) y la redireccion abierta corregida en 7.18.0.
- **React Server Components** (CVE-2025-55182, CVE-2026-23864/23869/23870):
  no aplican; la app es un SPA de Vite sin RSC.

---

## 5. PostgreSQL

Release de mayo 2026 con 11 CVEs (CVE-2026-6479, 6476, 6575, 6637, 6638…).
Corregido en **18.4** / **16.14**.

- Render: confirmar en el dashboard de `bourgelat-postgres` que este en 18.4
  o superior.
- Local: `docker compose pull postgres` (imagen `postgres:16-alpine`).

---

## 6. Reparto sugerido y checklist

**Backend (rama `fix/dependencias-seguridad`)**

- [ ] `FROM node:22.23.4-alpine` en `backend/Dockerfile`
- [ ] multer 2.5.0, body-parser >= 2.4.0, nodemailer 10.1.4, mailparser
- [ ] `npm ci` + tests del backend + pruebas manuales de subidas y correos
- [ ] Verificar version de PostgreSQL en Render

**Frontend (misma rama u otra)**

- [ ] xlsx 0.20.3 desde el CDN de SheetJS + prueba de importacion
- [ ] follow-redirects, zod, vite, vitest
- [ ] `npm run build`, `npm test`, `npm run lint:colores`

**Despues del merge a `main`**

- [ ] Deploy de `bourgelat-api` con **Clear build cache**
- [ ] `npm audit` en ambos lados: solo deben quedar uuid, tailwindcss y
      mailauth/undici
- [ ] Rama aparte para mailauth 8.x

---

## Fuentes

- Node.js: <https://nodejs.org/en/blog/vulnerability/october-2026-security-releases>
- multer: <https://github.com/advisories/GHSA-q7qp-rjg7-q26m>
- body-parser: <https://github.com/advisories/GHSA-27r3-jxmh-p828>
- nodemailer: <https://github.com/advisories/GHSA-8c8m-p3m8-cjg8>
- undici: <https://github.com/advisories/GHSA-4qv8-2p9j-2685>
- vite: <https://github.com/advisories/GHSA-9jrq-w75r-8gcw>
- vitest: <https://github.com/advisories/GHSA-82fw-gwwq-j7x9>
- follow-redirects: <https://github.com/advisories/GHSA-q3jh-wrc6-jgq8>
- zod: <https://github.com/advisories/GHSA-mrhx-c7xc-m3w5>
- xlsx: <https://github.com/advisories/GHSA-4r6h-8v6p-xvw6>
- react-router: <https://app.opencve.io/cve/?product=react-router&vendor=remix-run>
- PostgreSQL: <https://asec.ahnlab.com/en/95301/>
